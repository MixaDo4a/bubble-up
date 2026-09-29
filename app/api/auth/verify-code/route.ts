import { createHash } from "node:crypto";

import { NextResponse } from "next/server";



const URL = process.env.SUPABASE_URL || "https://lptzejmdtsmnlxfodihr.supabase.co";

const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PUBLIC_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || KEY;

const PEPPER = process.env.AUTH_CODE_PEPPER || KEY;

const out = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store", "Content-Type": "application/json; charset=utf-8" } });

const normalize = (v: unknown) => { const d = String(v ?? "").replace(/\D/g, ""); return d.length === 11 && d.startsWith("8") ? `+7${d.slice(1)}` : d.length === 11 && d.startsWith("7") ? `+${d}` : null; };

const hash = (v: string) => createHash("sha256").update(`${PEPPER}:${v}`).digest("hex");

async function db(path: string, init: RequestInit = {}) {

  if (!KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");

  return fetch(`${URL}/rest/v1/${path}`, { ...init, headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", ...(init.headers || {}) }, cache: "no-store" });

}




export async function POST(request: Request) {

  try {

    const body = (await request.json().catch(() => ({}))) as { phone?: string; code?: string };

    const phone = normalize(body.phone);

    const code = String(body.code ?? "").replace(/\D/g, "");

    if (!phone || !/^\d{6}$/.test(code)) return out({ error: "Введите номер телефона и шестизначный код" }, 400);

    if (!KEY || !PEPPER) return out({ error: "Сервис авторизации ещё не настроен" }, 503);

    const latest = await db(`login_codes?phone=eq.${encodeURIComponent(phone)}&used_at=is.null&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&select=id,user_id,code_hash,attempts,max_attempts,expires_at&order=created_at.desc&limit=1`);

    if (!latest.ok) return out({ error: "Не удалось проверить код" }, 502);

    const rows = (await latest.json()) as Array<{ id: string; user_id: string; code_hash: string; attempts: number; max_attempts: number; expires_at: string }>;

    const row = rows[0];

    if (!row) return out({ error: "Код истёк или уже использован" }, 400);

    const attempts = row.attempts + 1;

    if (attempts > row.max_attempts) return out({ error: "Превышено число попыток. Запросите новый код" }, 429);

    if (hash(code) !== row.code_hash) {

      await db(`login_codes?id=eq.${row.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ attempts }) });

      return out({ error: "Неверный код", attemptsLeft: Math.max(0, row.max_attempts - attempts) }, 400);

    }

    const used = await db(`login_codes?id=eq.${row.id}&used_at=is.null`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ used_at: new Date().toISOString(), attempts }) });

    if (!used.ok) return out({ error: "Код уже используется или не может быть подтверждён" }, 409);

    await db(`profiles?id=eq.${row.user_id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ last_login_at: new Date().toISOString() }) });

    const internalPassword = `${crypto.randomUUID()}-${crypto.randomUUID()}`;

    const adminHeaders = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

    const userResponse = await fetch(`${URL}/auth/v1/admin/users/${row.user_id}/`, { headers: adminHeaders, cache: "no-store" });

    if (!userResponse.ok) return out({ error: "Не найден пользователь Auth" }, 409);

    const authUser = (await userResponse.json()) as { email?: string | null };

    const email = `${phone.replace(/\D/g, "")}-${row.user_id.slice(0, 8)}@krmbl.app`;

    const updatePayload = JSON.stringify({ phone, password: internalPassword, phone_confirm: true });
    let update = await fetch(`${URL}/auth/v1/admin/users/${row.user_id}/`, { method: "PUT", headers: adminHeaders, body: updatePayload });
    if (!update.ok) update = await fetch(`${URL}/auth/v1/admin/users/${row.user_id}/`, { method: "PATCH", headers: adminHeaders, body: updatePayload });
    if (!update.ok) update = await fetch(`${URL}/auth/v1/admin/users`, { method: "POST", headers: adminHeaders, body: JSON.stringify({id: row.user_id, phone, password: internalPassword, phone_confirm: true}) });
    if (!update.ok) { console.error("auth-user-update", update.status, await update.text().catch(() => "")); return out({ error: "Не удалось обновить данные входа" }, 502); }
    const sessionHeaders = { apikey: PUBLIC_KEY || "", Authorization: `Bearer ${PUBLIC_KEY || ""}`, "Content-Type": "application/json" };
    const sessionResponse = await fetch(`${URL}/auth/v1/token?grant_type=password`, { method: "POST", headers: sessionHeaders, body: JSON.stringify({ phone, password: internalPassword }) });

    if (!sessionResponse.ok) return out({ error: "Не удалось создать сессию" }, 502);

    return out({ ok: true, userId: row.user_id, session: await sessionResponse.json() });

  } catch (error) {

    console.error("verify-code", error);

    return out({ error: "Сервис авторизации временно недоступен" }, 503);

  }

}









