import { NextResponse } from "next/server";

const URL = process.env.SUPABASE_URL || "https://lptzejmdtsmnlxfodihr.supabase.co";
const PUBLIC_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const out = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { refreshToken?: string };
    const refreshToken = String(body.refreshToken || "").trim();
    if (!refreshToken) return out({ error: "Необходим refresh-токен" }, 400);
    if (!PUBLIC_KEY) return out({ error: "Сервис авторизации ещё не настроен" }, 503);

    const response = await fetch(`${URL}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: {
        apikey: PUBLIC_KEY,
        Authorization: `Bearer ${PUBLIC_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: "no-store",
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) return out({ error: "Сессия истекла. Войдите заново" }, 401);
    return out(payload);
  } catch (error) {
    console.error("auth-refresh", error);
    return out({ error: "Сервис авторизации временно недоступен" }, 503);
  }
}
