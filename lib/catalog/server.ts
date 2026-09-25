import type { CatalogCampaign, CoffeeShop } from "./types";

function config() {
  const url = process.env.SUPABASE_URL || "https://lptzejmdtsmnlxfodihr.supabase.co";
  // Catalog reads are protected by RLS and can use the publishable/anon key.
  // Keep the service role key for server-only admin and media mutations.
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwdHplam1kdHNtbmx4Zm9kaWhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwNjc2MjQsImV4cCI6MjA5OTY0MzYyNH0.VMG5eWULDR34Q5vHoMXCJgiJuhozKxIO0SVT3C3ncvc";
  if (!url || !key) return null;
  return { url: url.replace(/\/$/, ""), key };
}

export async function getPublishedCatalog(): Promise<CatalogCampaign[]> {
  const c = config();
  if (!c) return [];
  const headers = { apikey: c.key, Authorization: `Bearer ${c.key}` };
  const campaigns = await fetch(`${c.url}/rest/v1/campaigns?active=eq.true&order=created_at.asc`, { headers, cache: "no-store" });
  if (!campaigns.ok) throw new Error(`Catalog campaigns request failed: ${campaigns.status}`);
  const rows = await campaigns.json() as Array<Record<string, unknown>>;
  const result: CatalogCampaign[] = [];
  for (const row of rows) {
    const menusResponse = await fetch(`${c.url}/rest/v1/menus?campaign_id=eq.${row.id}&order=sort_order.asc`, { headers, cache: "no-store" });
    if (!menusResponse.ok) throw new Error(`Catalog menus request failed: ${menusResponse.status}`);
    const menus = await menusResponse.json() as Array<Record<string, unknown>>;
    const mapped = [];
    for (const menu of menus) {
      const productsResponse = await fetch(`${c.url}/rest/v1/products?menu_id=eq.${menu.id}&order=sort_order.asc`, { headers, cache: "no-store" });
      if (!productsResponse.ok) throw new Error(`Catalog products request failed: ${productsResponse.status}`);
      const products = await productsResponse.json() as Array<Record<string, unknown>>;
      const productIds = products.map(p => String(p.id)).filter(Boolean);
      let links: Array<Record<string, unknown>> = [];
      let groups: Array<Record<string, unknown>> = [];
      let addons: Array<Record<string, unknown>> = [];
      if (productIds.length) {
        const linkResponse = await fetch(`${c.url}/rest/v1/product_addon_groups?product_id=in.(${productIds.join(",")})`, { headers, cache: "no-store" });
        if (linkResponse.ok) links = await linkResponse.json();
        const groupResponse = await fetch(`${c.url}/rest/v1/addon_groups?order=sort_order.asc`, { headers, cache: "no-store" });
        if (groupResponse.ok) groups = await groupResponse.json();
        const addonResponse = await fetch(`${c.url}/rest/v1/addons?order=sort_order.asc`, { headers, cache: "no-store" });
        if (addonResponse.ok) addons = await addonResponse.json();
      }
      const enriched = products.map(product => {
        const ids = links.filter(link => link.product_id === product.id).map(link => link.group_id);
        return { ...product, addon_groups: groups.filter(group => ids.includes(group.id)).map(group => ({ ...group, addons: addons.filter(addon => addon.group_id === group.id) })) };
      });
      mapped.push({ ...menu, products: enriched });
    }
      result.push({ ...row, menus: mapped } as unknown as CatalogCampaign);
  }
  return result;
}

export async function getCoffeeShops(): Promise<CoffeeShop[]> {
  const c = config();
  if (!c) return [];
  const headers = { apikey: c.key, Authorization: `Bearer ${c.key}` };
  const response = await fetch(`${c.url}/rest/v1/coffee_shops?active=eq.true&order=sort_order.asc`, { headers, cache: "no-store" });
  if (!response.ok) throw new Error(`Coffee shops request failed: ${response.status}`);
  return await response.json() as CoffeeShop[];
}

