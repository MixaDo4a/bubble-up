type SupabaseConfig = { url: string; key: string; bucket: string };
type MediaReference = { table: string; field: string };

const urlReferences: MediaReference[] = [
  { table: "campaigns", field: "image_url" }, { table: "campaigns", field: "video_url" },
  { table: "menus", field: "image_url" }, { table: "menus", field: "video_url" },
  { table: "products", field: "image_url" }, { table: "products", field: "video_url" },
  { table: "addons", field: "image_url" }, { table: "profiles", field: "avatar_url" },
  { table: "academy_courses", field: "cover_url" },
  { table: "academy_knowledge_documents", field: "source_url" },
  { table: "academy_lessons", field: "source_url" },
  { table: "academy_knowledge_items", field: "file_path" },
];

export type StorageObject = { bucket: string; path: string };

export function parseStorageObject(value: unknown, config: Pick<SupabaseConfig, "url" | "bucket">): StorageObject | null {
  if (typeof value !== "string" || !value) return null;
  try {
    const url = new URL(value);
    if (url.origin !== new URL(config.url).origin) return null;
    const parts = url.pathname.split("/").filter(Boolean);
    const storageIndex = parts.indexOf("storage");
    if (parts[storageIndex + 1] !== "v1" || parts[storageIndex + 2] !== "object") return null;
    if (!["public", "sign", "authenticated"].includes(parts[storageIndex + 3])) return null;
    const bucket = decodeURIComponent(parts[storageIndex + 4] || "");
    if (bucket !== config.bucket) return null;
    const path = parts.slice(storageIndex + 5).map(decodeURIComponent).join("/");
    if (!path || path.split("/").some((segment) => !segment || segment === "." || segment === "..")) return null;
    return { bucket, path };
  } catch {
    return null;
  }
}

async function requestJson<T>(config: SupabaseConfig, path: string): Promise<T> {
  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    headers: { apikey: config.key, Authorization: `Bearer ${config.key}` }, cache: "no-store",
  });
  if (!response.ok) throw new Error(`Media reference check failed (${response.status})`);
  return (await response.json()) as T;
}

/** Delete only after checking every known app reference; failures always fail closed. */
export async function deleteStorageObjectIfUnreferenced(
  config: SupabaseConfig, value: unknown,
): Promise<"deleted" | "referenced" | "external" | "error"> {
  const object = parseStorageObject(value, config);
  if (!object) return "external";
  try {
    const pattern = `*${object.path}*`;
    const checks = await Promise.all(urlReferences.map(async ({ table, field }) => {
      const params = new URLSearchParams({ select: `id,${field}`, [field]: `like.${pattern}` });
      const rows = await requestJson<Array<Record<string, unknown>>>(config, `${table}?${params}`);
      return rows.length > 0;
    }));
    if (checks.some(Boolean)) return "referenced";

    const fileParams = new URLSearchParams({ select: "id", bucket: `eq.${object.bucket}`, path: `eq.${object.path}` });
    const fileRows = await requestJson<Array<{ id: string }>>(config, `files?${fileParams}`);
    if (fileRows.length) return "referenced";

    const encodedPath = object.path.split("/").map(encodeURIComponent).join("/");
    const response = await fetch(`${config.url}/storage/v1/object/${encodeURIComponent(object.bucket)}/${encodedPath}`, {
      method: "DELETE", headers: { apikey: config.key, Authorization: `Bearer ${config.key}` },
    });
    if (!response.ok && response.status !== 404) throw new Error(`Storage delete failed (${response.status})`);
    return "deleted";
  } catch (error) {
    console.error("Orphaned media cleanup was skipped:", error);
    return "error";
  }
}

/** Opportunistically remove abandoned uploads older than a day after catalog edits. */
export async function cleanupStaleOrphanMedia(config: SupabaseConfig): Promise<number> {
  try {
    const referenced = new Set<string>();
    for (const { table, field } of urlReferences) {
      for (let offset = 0; ; offset += 1000) {
        const params = new URLSearchParams({ select: field });
        const response = await fetch(`${config.url}/rest/v1/${table}?${params}`, {
          headers: { apikey: config.key, Authorization: `Bearer ${config.key}`, Range: `${offset}-${offset + 999}`, "Range-Unit": "items" },
          cache: "no-store",
        });
        if (!response.ok) throw new Error(`Media reference scan failed (${response.status})`);
        const rows = await response.json() as Array<Record<string, unknown>>;
        if (!Array.isArray(rows)) throw new Error("Unexpected media reference response");
        for (const row of rows) {
          const parsed = parseStorageObject(row[field], config);
          if (parsed) referenced.add(parsed.path);
          else if (table === "academy_knowledge_items" && typeof row[field] === "string" && row[field]) referenced.add(row[field] as string);
        }
        if (rows.length < 1000) break;
      }
    }

    for (let offset = 0; ; offset += 1000) {
      const params = new URLSearchParams({ select: "path", bucket: `eq.${config.bucket}` });
      const response = await fetch(`${config.url}/rest/v1/files?${params}`, {
        headers: { apikey: config.key, Authorization: `Bearer ${config.key}`, Range: `${offset}-${offset + 999}`, "Range-Unit": "items" },
        cache: "no-store",
      });
      if (!response.ok) throw new Error(`File reference scan failed (${response.status})`);
      const rows = await response.json() as Array<{ path?: unknown }>;
      if (!Array.isArray(rows)) throw new Error("Unexpected file reference response");
      for (const row of rows) if (typeof row.path === "string") referenced.add(row.path);
      if (rows.length < 1000) break;
    }

    const objects: Array<{ name: string; created_at?: string; updated_at?: string; metadata?: { size?: number } }> = [];
    for (let offset = 0; ; offset += 1000) {
      const response = await fetch(`${config.url}/storage/v1/object/list/${encodeURIComponent(config.bucket)}`, {
        method: "POST", headers: { apikey: config.key, Authorization: `Bearer ${config.key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ prefix: "", limit: 1000, offset, sortBy: { column: "name", order: "asc" } }),
      });
      if (!response.ok) throw new Error(`Storage listing failed (${response.status})`);
      const page = await response.json() as typeof objects;
      if (!Array.isArray(page)) throw new Error("Unexpected Storage listing response");
      objects.push(...page);
      if (page.length < 1000) break;
    }

    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const orphans = objects.filter((object) => {
      const createdAt = Date.parse(object.created_at || object.updated_at || "");
      return !referenced.has(object.name) && Number.isFinite(createdAt) && createdAt < cutoff;
    });
    for (let offset = 0; offset < orphans.length; offset += 1000) {
      const batch = orphans.slice(offset, offset + 1000);
      const response = await fetch(`${config.url}/storage/v1/object/${encodeURIComponent(config.bucket)}`, {
        method: "DELETE", headers: { apikey: config.key, Authorization: `Bearer ${config.key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ prefixes: batch.map((object) => object.name) }),
      });
      if (!response.ok) throw new Error(`Storage cleanup failed (${response.status})`);
    }
    return orphans.length;
  } catch (error) {
    console.error("Stale media sweep was skipped:", error);
    return 0;
  }
}
