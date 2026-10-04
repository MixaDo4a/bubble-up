import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bucket = process.env.SUPABASE_STORAGE_BUCKET || "drinkit-media";
const deleteMode = process.argv.includes("--delete");
const minimumAgeMs = 24 * 60 * 60 * 1000;

function loadLocalEnv(source) {
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    process.env[match[1]] = value;
  }
}

try { loadLocalEnv(await readFile(path.join(projectRoot, ".env.local"), "utf8")); } catch {}
const supabaseUrl = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local first.");
if (bucket !== "drinkit-media") throw new Error("This cleanup is restricted to the drinkit-media bucket.");
if (new URL(supabaseUrl).hostname !== "lptzejmdtsmnlxfodihr.supabase.co") throw new Error("Refusing to scan a Supabase project other than the configured Dojo project.");

const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
const referenceColumns = [
  ["campaigns", "image_url"], ["campaigns", "video_url"],
  ["menus", "image_url"], ["menus", "video_url"],
  ["products", "image_url"], ["products", "video_url"],
  ["addons", "image_url"], ["profiles", "avatar_url"],
  ["academy_courses", "cover_url"], ["academy_knowledge_documents", "source_url"],
  ["academy_lessons", "source_url"], ["academy_knowledge_items", "file_path"],
];

async function checkedJson(url, init) {
  const response = await fetch(url, init);
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`Supabase request failed (${response.status}): ${JSON.stringify(body)}`);
  return body;
}

async function getAllRows(resource, select) {
  const rows = [];
  for (let offset = 0; ; offset += 1000) {
    const url = new URL(`${supabaseUrl}/rest/v1/${resource}`);
    url.searchParams.set("select", select);
    const page = await checkedJson(url, { headers: { ...headers, Range: `${offset}-${offset + 999}`, "Range-Unit": "items" } });
    if (!Array.isArray(page)) throw new Error(`Unexpected response for ${resource}`);
    rows.push(...page);
    if (page.length < 1000) return rows;
  }
}

function storagePath(value) {
  if (typeof value !== "string" || !value) return null;
  try {
    const url = new URL(value);
    if (url.origin !== supabaseUrl) return null;
    const parts = url.pathname.split("/").filter(Boolean);
    const index = parts.indexOf("storage");
    if (parts[index + 1] !== "v1" || parts[index + 2] !== "object" || !["public", "sign", "authenticated"].includes(parts[index + 3])) return null;
    if (decodeURIComponent(parts[index + 4] || "") !== bucket) return null;
    const result = parts.slice(index + 5).map(decodeURIComponent).join("/");
    return result || null;
  } catch { return null; }
}

const referencedPaths = new Set();
for (const [table, column] of referenceColumns) {
  for (const row of await getAllRows(table, `id,${column}`)) {
    const value = row[column];
    const pathValue = storagePath(value);
    if (pathValue) referencedPaths.add(pathValue);
    else if (table === "academy_knowledge_items" && typeof value === "string" && value) referencedPaths.add(value);
  }
}
for (const row of await getAllRows("files", "id,bucket,path")) {
  if (row.bucket === bucket && typeof row.path === "string") referencedPaths.add(row.path);
}

const objects = [];
for (let offset = 0; ; offset += 1000) {
  const page = await checkedJson(`${supabaseUrl}/storage/v1/object/list/${encodeURIComponent(bucket)}`, {
    method: "POST", headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ prefix: "", limit: 1000, offset, sortBy: { column: "name", order: "asc" } }),
  });
  if (!Array.isArray(page)) throw new Error("Unexpected Storage listing response");
  objects.push(...page);
  if (page.length < 1000) break;
}

const now = Date.now();
const orphans = objects.filter((object) => !referencedPaths.has(object.name));
const ready = orphans.filter((object) => now - Date.parse(object.created_at || object.updated_at || 0) >= minimumAgeMs);
const bytes = (rows) => rows.reduce((sum, row) => sum + Number(row.metadata?.size || 0), 0);
const byType = (rows, predicate) => rows.filter((row) => predicate.test(row.name));
const videos = byType(ready, /\.(mp4|mov|webm|m4v)$/i);
const images = byType(ready, /\.(png|jpe?g|gif|webp|avif)$/i);

console.log(JSON.stringify({
  project: new URL(supabaseUrl).hostname,
  bucket,
  totalObjects: objects.length,
  referencedObjects: objects.length - orphans.length,
  orphanObjects: orphans.length,
  orphanBytes: bytes(orphans),
  eligibleAfter24Hours: ready.length,
  eligibleVideos: videos.length,
  eligibleVideoBytes: bytes(videos),
  eligibleImages: images.length,
  eligibleImageBytes: bytes(images),
  mode: deleteMode ? "delete" : "report-only",
}, null, 2));

if (!deleteMode) {
  console.log("Report only. Pass --delete to remove these confirmed orphan objects using the Supabase Storage API.");
  process.exit(0);
}

for (let offset = 0; offset < ready.length; offset += 1000) {
  const batch = ready.slice(offset, offset + 1000);
  await checkedJson(`${supabaseUrl}/storage/v1/object/${encodeURIComponent(bucket)}`, {
    method: "DELETE", headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ prefixes: batch.map((object) => object.name) }),
  });
}
console.log(`Deleted ${ready.length} unreferenced objects (${bytes(ready)} bytes).`);
