import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

const URL = process.env.SUPABASE_URL || "https://lptzejmdtsmnlxfodihr.supabase.co";
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BOT = process.env.TELEGRAM_BOT_TOKEN;
const out = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store", "Content-Type": "application/json; charset=utf-8" } });
const db = (path: string, init: RequestInit = {}) => fetch(`${URL}/rest/v1/${path}`, { ...init, headers: { apikey: KEY || "", Authorization: `Bearer ${KEY || ""}`, "Content-Type": "application/json", ...(init.headers || {}) }, cache: "no-store" });

export async function POST(request: Request) {
  try {
    if (!KEY || !BOT) return out({ error: "Telegram Mini App ещё не настроен" }, 503);
    const body = (await request.json().catch(() => ({}))) as { initData?: string };
    const raw = String(body.initData || "");
    if (!raw || raw.length > 4096) return out({ error: "Некорректные initData" }, 400);
    const params = new URLSearchParams(raw), received = params.get("hash"), authDate = Number(params.get("auth_date") || 0), userJson = params.get("user");
    if (!received || !authDate || !userJson || Date.now() / 1000 - authDate > 86400) return out({ error: "Данные Telegram истекли или неполны" }, 401);
    params.delete("hash");
    const dataCheck = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join("\n");
    const secret = createHmac("sha256", "WebAppData").update(BOT).digest();
    const expected = createHmac("sha256", secret).update(dataCheck).digest("hex");
    if (expected.length !== received.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(received))) return out({ error: "Неверная подпись Telegram" }, 401);
    const tgUser = JSON.parse(userJson) as { id?: number; username?: string; first_name?: string };
    if (!tgUser.id) return out({ error: "Не найден Telegram user id" }, 400);
    const links = await (await db(`identity_links?provider=in.(telegram,telegram_mini_app)&provider_subject=eq.${tgUser.id}&select=user_id,provider&limit=1`)).json() as Array<{ user_id: string; provider: string }>;
    if (!links[0]) return out({ registered: false, telegramUserId: tgUser.id, message: "Завершите регистрацию через Telegram" }, 200);
    if (links[0].provider === "telegram") await db("identity_links", { method: "POST", headers: { Prefer: "resolution=ignore-duplicates" }, body: JSON.stringify({ user_id: links[0].user_id, provider: "telegram_mini_app", provider_subject: String(tgUser.id), provider_username: tgUser.username || null, verified_at: new Date().toISOString() }) });
    await db(`identity_links?user_id=eq.${links[0].user_id}&provider=eq.telegram_mini_app`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ provider_username: tgUser.username || null, verified_at: new Date().toISOString() }) });
    return out({ registered: true, userId: links[0].user_id });
  } catch (error) { console.error("telegram-mini-app", error); return out({ error: "Проверка Telegram временно недоступна" }, 503); }
}

