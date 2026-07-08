// Downloads item/gear/material/hero icon assets from taskbarhero.org
// (a fan-run TBH database site) into assets/icons/, keyed by the same
// IconPath / heroKey values that appear in our own datamined data/*.json.
// One-time/occasional tool, not part of the running site.
//
// Usage: node tools/download-icons.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");
const outDir = path.join(__dirname, "..", "assets", "icons");

const BASE = "https://taskbarhero.org/assets/tbhdb/game";
const CONCURRENCY = 8;

const items = JSON.parse(fs.readFileSync(path.join(dataDir, "ItemInfoData.json"), "utf8"));
const heroes = JSON.parse(fs.readFileSync(path.join(dataDir, "HeroInfoData.json"), "utf8"));

/** @type {Map<string, {url: string, file: string}>} de-duped by output file path */
const jobs = new Map();

function addJob(url, relFile) {
  const file = path.join(outDir, relFile);
  jobs.set(file, { url, file });
}

for (const it of items) {
  if (!it.IconPath) continue;
  if (it.ITEMTYPE === "GEAR") {
    const folder = (it.GEARTYPE || it.PARTS || "").toLowerCase();
    if (!folder) continue;
    addJob(`${BASE}/gear/${folder}/${it.IconPath}.png`, `gear/${folder}/${it.IconPath}.png`);
  } else if (it.ITEMTYPE === "MATERIAL") {
    addJob(`${BASE}/items/materials/${it.IconPath}.png`, `materials/${it.IconPath}.png`);
  } else if (it.ITEMTYPE === "STAGEBOX") {
    addJob(`${BASE}/items/boxes/${it.IconPath}.png`, `boxes/${it.IconPath}.png`);
  }
}

for (const h of heroes) {
  addJob(`${BASE}/heroes/portraits/Hero_${h.HeroKey}.png`, `heroes/Hero_${h.HeroKey}.png`);
}

const jobList = [...jobs.values()];
console.log(`Planned downloads: ${jobList.length}`);

let ok = 0;
let skipped = 0;
let failed = 0;
const failures = [];

async function downloadOne({ url, file }) {
  if (fs.existsSync(file)) {
    skipped++;
    return;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  try {
    const res = await fetch(url);
    if (!res.ok) {
      failed++;
      failures.push(`${res.status} ${url}`);
      return;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(file, buf);
    ok++;
  } catch (err) {
    failed++;
    failures.push(`${err.message} ${url}`);
  }
}

async function runPool(list, size, worker) {
  let i = 0;
  async function next() {
    while (i < list.length) {
      const idx = i++;
      await worker(list[idx]);
      if ((idx + 1) % 200 === 0) console.log(`  progress: ${idx + 1}/${list.length}`);
    }
  }
  await Promise.all(Array.from({ length: size }, next));
}

await runPool(jobList, CONCURRENCY, downloadOne);

console.log(`\nDone. ok=${ok} skipped(existing)=${skipped} failed=${failed}`);
if (failures.length) {
  console.log("Failures (first 30):");
  for (const f of failures.slice(0, 30)) console.log(`  ${f}`);
}
