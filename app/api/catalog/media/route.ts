import { NextResponse } from "next/server";
import { cleanupStaleOrphanMedia, deleteStorageObjectIfUnreferenced } from "@/lib/catalog/media-cleanup";

export const runtime = "nodejs";
const allowed = new Set(["campaigns", "menus", "products", "addons"]);
const allowedFields: Record<string, string[]> = {
  campaigns: ["image_url", "video_url"], menus: ["image_url", "video_url"],
  products: ["image_url", "video_url"], addons: ["image_url"],
};

export async function POST(request: Request) {
  const url = (process.env.SUPABASE_URL || "https://lptzejmdtsmnlxfodihr.supabase.co").replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwdHplam1kdHNtbmx4Zm9kaWhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwNjc2MjQsImV4cCI6MjA5OTY0MzYyNH0.VMG5eWULDR34Q5vHoMXCJgiJuhozKxIO0SVT3C3ncvc";
  if (!url || !key) return NextResponse.json({ error: "Supabase server storage is not configured" }, { status: 503 });

  const body = await request.json() as { table?: string; id?: string; field?: string; value?: string | null };
  if (!body.table || !allowed.has(body.table) || !body.id || !body.field || !allowedFields[body.table].includes(body.field)) {
    return NextResponse.json({ error: "Invalid media update" }, { status: 400 });
  }

  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  const oldResponse = await fetch(`${url}/rest/v1/${body.table}?id=eq.${encodeURIComponent(body.id)}&select=${body.field}`, {
    headers, cache: "no-store",
  });
  if (!oldResponse.ok) return NextResponse.json({ error: "Не удалось прочитать текущую ссылку на медиа" }, { status: oldResponse.status });
  const oldRows = await oldResponse.json();
  const oldValue = Array.isArray(oldRows) ? oldRows[0]?.[body.field] : undefined;

  const response = await fetch(`${url}/rest/v1/${body.table}?id=eq.${encodeURIComponent(body.id)}`, {
    method: "PATCH",
    headers: { ...headers, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({ [body.field]: body.value ?? null }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) return NextResponse.json(payload, { status: response.status });

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceRoleKey) {
    const storageConfig = {
      url, key: serviceRoleKey, bucket: process.env.SUPABASE_STORAGE_BUCKET || "drinkit-media",
    };
    if (oldValue && oldValue !== body.value) await deleteStorageObjectIfUnreferenced(storageConfig, oldValue);
    await cleanupStaleOrphanMedia(storageConfig);
  }
  return NextResponse.json(payload, { status: response.status });
}
