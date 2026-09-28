import { createHash, randomInt } from "node:crypto";
import { NextResponse } from "next/server";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://lptzejmdtsmnlxfodihr.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PEPPER = process.env.AUTH_CODE_PEPPER || SERVICE_KEY;

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}
function normalizePhone(value: unknown) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("8")) return `+7${digits.slice(1)}`;
  if (digits.length === 11 && digits.startsWith("7")) return `+${digits}`;
  return null;
}
function hashCode(code: string) {
  return createHash("sha256").update(`${PEPPER}:${code}`).digest("hex");
}
async function supabase(path: string, init: RequestInit = {}) {
  if (!SERVICE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json", ...(init.headers || {}) },
    cache: "no-store",
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { phone?: string; channel?: string };
    const phone = normalizePhone(body.phone);
    const channel = body.channel === "sms" || body.channel === "email" ? body.channel : "telegram";
    if (!phone) return json({ error: "Р’РІРµРґРёС‚Рµ РЅРѕРјРµСЂ С‚РµР»РµС„РѕРЅР° РІ С„РѕСЂРјР°С‚Рµ 11 С†РёС„СЂ" }, 400);
    if (!SERVICE_KEY || !PEPPER) return json({ error: "РЎРµСЂРІРёСЃ Р°РІС‚РѕСЂРёР·Р°С†РёРё РµС‰С‘ РЅРµ РЅР°СЃС‚СЂРѕРµРЅ" }, 503);

    const profileResponse = await supabase(`profiles?phone=eq.${encodeURIComponent(phone)}&select=id,phone,display_name,is_active&limit=1`);
    if (!profileResponse.ok) return json({ error: "РќРµ СѓРґР°Р»РѕСЃСЊ РїСЂРѕРІРµСЂРёС‚СЊ РїСЂРѕС„РёР»СЊ" }, 502);
    const profiles = (await profileResponse.json()) as Array<{ id: string; phone: string; display_name: string; is_active?: boolean; identity_links?: Array<{ provider: string; provider_subject: string }> }>;
    const profile = profiles[0];
    if (profile) {
      const linksResponse = await supabase(`identity_links?user_id=eq.${profile.id}&provider=eq.telegram&select=provider,provider_subject&limit=1`);
      profile.identity_links = linksResponse.ok ? await linksResponse.json() : [];
    }
    if (!profile) return json({ error: "РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ РЅРµ Р·Р°СЂРµРіРёСЃС‚СЂРёСЂРѕРІР°РЅ. Р—Р°РІРµСЂС€РёС‚Рµ СЂРµРіРёСЃС‚СЂР°С†РёСЋ С‡РµСЂРµР· Telegram" }, 404);
    if (!profile.is_active) return json({ error: "РџСЂРѕС„РёР»СЊ Р·Р°Р±Р»РѕРєРёСЂРѕРІР°РЅ" }, 403);

    if (channel !== "telegram") return json({ error: `Канал ${channel} пока требует подключения провайдера` }, 501);
    const recentSince = new Date(Date.now() - 60_000).toISOString();
    const recentResponse = await supabase(`login_codes?phone=eq.${encodeURIComponent(phone)}&created_at=gte.${encodeURIComponent(recentSince)}&select=id&limit=1`);
    if (recentResponse.ok && ((await recentResponse.json()) as unknown[]).length) return json({ error: "Новый код можно запросить через минуту" }, 429);
    const telegram = profile.identity_links?.find((x: { provider: string }) => x.provider === "telegram");
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken || !telegram?.provider_subject) return json({ error: "Telegram ещё не привязан к профилю" }, 409);
    const code = String(randomInt(100000, 1000000));
    const expires = new Date(Date.now() + 5 * 60_000).toISOString();
    const insert = await supabase("login_codes", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ user_id: profile.id, phone, channel, code_hash: hashCode(code), expires_at: expires, max_attempts: 5 }),
    });
    if (!insert.ok) return json({ error: "РќРµ СѓРґР°Р»РѕСЃСЊ СЃРѕР·РґР°С‚СЊ РєРѕРґ РІС…РѕРґР°" }, 502);

    if (channel === "telegram") {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const telegram = profile.identity_links?.find((x: { provider: string }) => x.provider === "telegram");
      if (!botToken || !telegram?.provider_subject) return json({ error: "Telegram РµС‰С‘ РЅРµ РїСЂРёРІСЏР·Р°РЅ Рє РїСЂРѕС„РёР»СЋ" }, 409);
      const sent = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: telegram.provider_subject, text: `РљРѕРґ РІС…РѕРґР° KRMBl Cookies: ${code}\nР”РµР№СЃС‚РІСѓРµС‚ 5 РјРёРЅСѓС‚. РќРёРєРѕРјСѓ РµРіРѕ РЅРµ СЃРѕРѕР±С‰Р°Р№С‚Рµ.` }) });
      if (!sent.ok) return json({ error: "РќРµ СѓРґР°Р»РѕСЃСЊ РѕС‚РїСЂР°РІРёС‚СЊ РєРѕРґ РІ Telegram" }, 502);
      return json({ ok: true, channel, expiresAt: expires });
    }

    return json({ error: `РљР°РЅР°Р» ${channel} РїРѕРєР° С‚СЂРµР±СѓРµС‚ РїРѕРґРєР»СЋС‡РµРЅРёСЏ РїСЂРѕРІР°Р№РґРµСЂР°` }, 501);
  } catch (error) {
    console.error("request-code", error);
    return json({ error: "РЎРµСЂРІРёСЃ Р°РІС‚РѕСЂРёР·Р°С†РёРё РІСЂРµРјРµРЅРЅРѕ РЅРµРґРѕСЃС‚СѓРїРµРЅ" }, 503);
  }
}
