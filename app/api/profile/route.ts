import { NextResponse } from "next/server";

const URL = process.env.SUPABASE_URL || "https://lptzejmdtsmnlxfodihr.supabase.co";
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const out = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
async function identity(request: Request) {
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!bearer || !KEY) return null;
  const response = await fetch(`${URL}/auth/v1/user`, { headers: { apikey: KEY, Authorization: `Bearer ${bearer}` }, cache: "no-store" });
  return response.ok ? await response.json() as { id: string } : null;
}
async function db(path: string, init: RequestInit = {}) {
  if (!KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  return fetch(`${URL}/rest/v1/${path}`, { ...init, headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", ...(init.headers || {}) }, cache: "no-store" });
}
const validBirthDate = (value: unknown) => { if (value === null || value === "") return null; const s = String(value); if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return undefined; const d = new Date(`${s}T00:00:00Z`), now = new Date(), age = now.getUTCFullYear() - d.getUTCFullYear() - ((now.getUTCMonth() + 1 < d.getUTCMonth() + 1 || (now.getUTCMonth() + 1 === d.getUTCMonth() + 1 && now.getUTCDate() < d.getUTCDate())) ? 1 : 0); return Number.isNaN(d.getTime()) || age < 13 || age > 120 ? undefined : s; };

export async function GET(request: Request) {
  try { const user = await identity(request); if (!user) return out({ error: "Требуется вход" }, 401); const response = await db(`profiles?id=eq.${user.id}&select=id,phone,display_name,avatar_url,birth_date,age_confirmed,is_active,created_at,last_login_at&limit=1`); return out(await response.json(), response.ok ? 200 : 502); } catch { return out({ error: "Профиль временно недоступен" }, 503); }
}

export async function PATCH(request: Request) {
  try {
    const user = await identity(request); if (!user) return out({ error: "Требуется вход" }, 401);
    const body = await request.json().catch(() => ({})) as { displayName?: string; birthDate?: string | null; birthdayMarketingConsent?: boolean };
    const birthDate = validBirthDate(body.birthDate); if (birthDate === undefined) return out({ error: "Некорректная дата рождения" }, 400);
    const profile: Record<string, unknown> = {}; if (body.displayName !== undefined) profile.display_name = String(body.displayName).trim().slice(0, 120); if (body.birthDate !== undefined) { profile.birth_date = birthDate; profile.age_confirmed = Boolean(birthDate); }
    if (Object.keys(profile).length) { const updated = await db(`profiles?id=eq.${user.id}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(profile) }); if (!updated.ok) return out({ error: "Не удалось обновить профиль" }, 502); }
    if (body.birthdayMarketingConsent !== undefined) { const settings = await db("user_settings", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ user_id: user.id, birthday_marketing_consent: Boolean(body.birthdayMarketingConsent) }) }); if (!settings.ok) return out({ error: "Не удалось сохранить настройки рассылки" }, 502); }
    return out({ ok: true });
  } catch { return out({ error: "Профиль временно недоступен" }, 503); }
}
