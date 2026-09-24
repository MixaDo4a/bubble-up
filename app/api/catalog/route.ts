import { NextResponse } from "next/server";
import { getPublishedCatalog, getCoffeeShops } from "@/lib/catalog/server";

export async function GET() {
  try {
    const campaigns = await getPublishedCatalog();`n    const coffeeShops = await getCoffeeShops();
    return NextResponse.json({ campaigns, coffeeShops, configured: campaigns.length > 0 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Catalog request failed" }, { status: 502 });
  }
}

