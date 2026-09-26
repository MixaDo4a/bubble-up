import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const url = process.env.SUPABASE_URL || "https://lptzejmdtsmnlxfodihr.supabase.co";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "drinkit-media";
  if (!key) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is not configured" }, { status: 503 });
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const size = Number(body.size || 0);
  const max = 50 * 1024 * 1024;
  if (size > max) return NextResponse.json({ error: "Media file exceeds the 50 MB limit" }, { status: 413 });
  const name = String(body.name || "").replace(/[^a-zA-Z0-9._-]/g, "_");
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
  const path = `${crypto.randomUUID()}-${name}`;
  const endpoint = `${url.replace(/\/$/, "")}/storage/v1/object/upload/sign/${encodeURIComponent(bucket)}/${encodeURIComponent(path)}`;
  const signed = await fetch(endpoint, { method: "POST", headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ upsert: false }) });
  const payload = (await signed.json().catch(() => ({}))) as Record<string, unknown>;
  if (!signed.ok) return NextResponse.json({ error: payload.message || payload.error || `Storage signing failed: ${signed.status}` }, { status: 502 });
  const signedUrl = typeof payload.signedURL === 'string' ? payload.signedURL : '';
  const token = typeof payload.token === 'string' ? payload.token : (signedUrl ? signedUrl.split('token=')[1] : undefined);
  if (!token) return NextResponse.json({ error: "Storage did not return an upload token" }, { status: 502 });
  return NextResponse.json({ path, token, url: `${url.replace(/\/$/, "")}/storage/v1/object/public/${encodeURIComponent(bucket)}/${encodeURIComponent(path)}` });
}


