// Snapshots current Steam Community Market prices for every marketable TBH
// item, via Steam's own public (unauthenticated) market search endpoint —
// the priceoverview endpoint used by client-side widgets doesn't send CORS
// headers, so this has to run server-side and the site reads the resulting
// static JSON. Occasional tool, not part of the running site.
//
// Usage: node tools/fetch-steam-prices.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outFile = path.join(__dirname, "..", "data", "steam-prices.json");

const APPID = 3678970; // TBH: Task Bar Hero (store.steampowered.com/app/3678970)
const CURRENCY = 1; // USD
const PAGE_SIZE = 10; // Steam caps unauthenticated search/render requests to 10 results regardless of a larger `count` param
const DELAY_MS = 350;
const ICON_BASE = "https://community.akamai.steamstatic.com/economy/image";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchPage(start) {
  // sort_column/sort_dir pin a stable order across requests — without it
  // Steam's default (relevance) ordering drifts between pages and pagination
  // silently skips/repeats items.
  const url = `https://steamcommunity.com/market/search/render/?query=&appid=${APPID}&currency=${CURRENCY}&start=${start}&count=${PAGE_SIZE}&sort_column=name&sort_dir=asc&norender=1`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (tbh-item-advisor price snapshot tool)" },
  });
  if (!res.ok) throw new Error(`Steam market search failed: ${res.status} (start=${start})`);
  return res.json();
}

const byHashName = new Map();
let start = 0;
let total = Infinity;

while (start < total) {
  const page = await fetchPage(start);
  total = page.total_count ?? 0;
  if (!page.results?.length) break; // avoid an infinite loop if Steam stops returning results early
  for (const r of page.results ?? []) {
    const desc = r.asset_description ?? {};
    byHashName.set(r.hash_name, {
      name: r.name,
      hashName: r.hash_name,
      type: desc.type ?? "",
      color: desc.name_color ? `#${desc.name_color}` : null,
      icon: desc.icon_url ? `${ICON_BASE}/${desc.icon_url}/96fx96f` : null,
      priceCents: typeof r.sell_price === "number" ? r.sell_price : null,
      priceText: r.sell_price_text ?? null,
      listings: typeof r.sell_listings === "number" ? r.sell_listings : null,
    });
  }
  console.log(`  fetched ${Math.min(start + PAGE_SIZE, total)}/${total}`);
  start += PAGE_SIZE;
  if (start < total) await sleep(DELAY_MS);
}

const items = [...byHashName.values()].sort((a, b) => a.name.localeCompare(b.name, "en"));

const snapshot = {
  appid: APPID,
  currency: "USD",
  fetchedAt: new Date().toISOString(),
  itemCount: items.length,
  items,
};

fs.writeFileSync(outFile, JSON.stringify(snapshot, null, 2));
console.log(`\nWrote ${items.length} priced items to ${path.relative(process.cwd(), outFile)}`);
