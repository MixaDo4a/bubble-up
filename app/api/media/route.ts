import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const url = process.env.SUPABASE_URL || "https://lptzejmdtsmnlxfodihr.supabase.co";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwdHplam1kdHNtbmx4Zm9kaWhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwNjc2MjQsImV4cCI6MjA5OTY0MzYyNH0.VMG5eWULDR34Q5vHoMXCJgiJuhozKxIO0SVT3C3ncvc";
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "drinkit-media";
  if (!url || !key) return NextResponse.json({ error: "Storage is not configured" }, { status: 503 });
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "file is required" }, { status: 400 });
  if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) return NextResponse.json({ error: "Only images and videos are supported" }, { status: 415 });
  const max = Number(process.env.MEDIA_MAX_BYTES || 50 * 1024 * 1024);
  if (file.size > max) return NextResponse.json({ error: "File is too large" }, { status: 413 });
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${crypto.randomUUID()}-${safe}`;
  const endpoint = `${url.replace(/\/$/, "")}/storage/v1/object/${encodeURIComponent(bucket)}/${encodeURIComponent(path)}`;
  const uploaded = await fetch(endpoint, { method: "POST", headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": file.type, "x-upsert": "false" }, body: await file.arrayBuffer() });
  if (!uploaded.ok) return NextResponse.json({ error: `Storage upload failed: ${uploaded.status}` }, { status: 502 });
  return NextResponse.json({ path, url: `${url.replace(/\/$/, "")}/storage/v1/object/public/${encodeURIComponent(bucket)}/${encodeURIComponent(path)}`, type: file.type, size: file.size });
}


