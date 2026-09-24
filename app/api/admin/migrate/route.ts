import { NextResponse } from "next/server";
import postgres from "postgres";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (process.env.ADMIN_TOKEN && request.headers.get("x-admin-token") !== process.env.ADMIN_TOKEN) return NextResponse.json({error:"Unauthorized"},{status:401});
  const url=process.env.DATABASE_URL; if(!url) return NextResponse.json({error:"DATABASE_URL is not configured"},{status:503});
  const sql=postgres(url,{max:1});
  try {
    await sql`alter table public.campaigns add column if not exists image_url text, add column if not exists video_url text`;
    await sql`alter table public.menus add column if not exists image_url text, add column if not exists video_url text`;
    await sql`create table if not exists public.coffee_shops (id uuid primary key default gen_random_uuid(), name text not null, city text not null default '', address text not null default '', hours text not null default '', active boolean not null default true, sort_order integer not null default 0, created_at timestamptz not null default now())`;
    await sql`alter table public.coffee_shops enable row level security`;
    await sql.end({timeout:1}); return NextResponse.json({ok:true});
  } catch (e) { await sql.end({timeout:1}); return NextResponse.json({error:String(e)},{status:500}); }
}
