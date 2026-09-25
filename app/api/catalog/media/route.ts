import { NextResponse } from "next/server";
export const runtime = "nodejs";
const allowed = new Set(["campaigns", "menus", "products"]);
export async function POST(request: Request) {
  // The constructor is currently public during development. Keep the service
  // role key server-side; authentication can be added later without changing
  // the client upload flow.
  const url=process.env.SUPABASE_URL || "https://lptzejmdtsmnlxfodihr.supabase.co", key=process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwdHplam1kdHNtbmx4Zm9kaWhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwNjc2MjQsImV4cCI6MjA5OTY0MzYyNH0.VMG5eWULDR34Q5vHoMXCJgiJuhozKxIO0SVT3C3ncvc";
  if(!url||!key) return NextResponse.json({error:"Supabase server storage is not configured"},{status:503});
  const body=await request.json() as {table?:string; id?:string; field?:string; value?:string};
  if(!body.table||!allowed.has(body.table)||!body.id||!body.field||!['image_url','video_url'].includes(body.field)) return NextResponse.json({error:"Invalid media update"},{status:400});
  const base=url.replace(/\/$/,"");
  try {
    const oldRes=await fetch(`${base}/rest/v1/${body.table}?id=eq.${encodeURIComponent(body.id)}&select=${body.field}`,{headers:{apikey:key,Authorization:`Bearer ${key}`} });
    const oldRows=await oldRes.json(); const old=Array.isArray(oldRows)?oldRows[0]?.[body.field]:undefined;
    if(old && body.value && old!==body.value){
      const marker="/storage/v1/object/public/"; const at=String(old).indexOf(marker);
      if(at>=0){const rest=String(old).slice(at+marker.length), slash=rest.indexOf("/");if(slash>0){const bucket=rest.slice(0,slash),path=rest.slice(slash+1);await fetch(`${base}/storage/v1/object/${bucket}/${path.split("/").map(encodeURIComponent).join("/")}`,{method:"DELETE",headers:{apikey:key,Authorization:`Bearer ${key}`}})}}
    }
  } catch (_) {}
  const response=await fetch(`${base}/rest/v1/${body.table}?id=eq.${encodeURIComponent(body.id)}`,{method:'PATCH',headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify({[body.field]:body.value})});
  return NextResponse.json(await response.json(),{status:response.status});
}


