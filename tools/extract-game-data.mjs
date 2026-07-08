// One-time data-mining tool: pulls the game's own CSV-style data tables out of
// TaskBarHero_Data/sharedassets0.assets (they're embedded as plain-text
// TextAssets inside the binary Unity asset file — no AssetStudio/AssetRipper
// needed) and writes them out as JSON files under data/.
//
// Usage: node tools/extract-game-data.mjs "<path to TaskBarHero_Data>"

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDataDir =
  process.argv[2] ??
  "D:/SteamLibrary/steamapps/common/TaskbarHero/TaskBarHero_Data";

const sharedAssetsPath = path.join(dataDataDir, "sharedassets0.assets");
const buf = fs.readFileSync(sharedAssetsPath);
const text = buf.toString("latin1");

// Every embedded data table looks like: <TableName><binary length-prefix junk>
// <Header,Col,Names>\n<row>\n<row>... — find every "XxxInfoData" occurrence to
// use as slice boundaries between consecutive tables.
const nameRe = /[A-Za-z]{3,30}InfoData/g;
const markers = [];
let m;
while ((m = nameRe.exec(text))) {
  markers.push({ name: m[0], index: m.index });
}

// Diagnostic: list every distinct table name found in the assets file so any
// table we haven't wired up yet (e.g. a stat-mod resolution table for gem
// materials) is visible before we go looking for it.
const distinctMarkers = [...new Set(markers.map((mk) => mk.name))];
console.log(`Discovered ${distinctMarkers.length} *InfoData tables:`, distinctMarkers);

function extractTable(tableName) {
  const idx = markers.findIndex((mk) => mk.name === tableName);
  if (idx === -1) throw new Error(`table not found: ${tableName}`);
  const start = markers[idx].index + tableName.length;
  const end = idx + 1 < markers.length ? markers[idx + 1].index : text.length;
  let chunk = text.slice(start, end);

  const headerMatch = chunk.match(/[A-Za-z0-9_]+(,[A-Za-z0-9_]*)+/);
  if (!headerMatch) throw new Error(`header not found for ${tableName}`);
  chunk = chunk.slice(headerMatch.index);

  const lines = chunk
    .split(/\r?\n/)
    .filter((line) => /^[\x20-\x7e]*$/.test(line) && line.length > 0);

  const header = lines[0].split(",");
  const rows = lines.slice(1).map((line) => line.split(","));
  return { header, rows };
}

function tableToObjects(tableName) {
  const { header, rows } = extractTable(tableName);
  return rows.map((cols) => {
    const obj = {};
    header.forEach((col, i) => {
      obj[col] = cols[i] ?? "";
    });
    return obj;
  });
}

const outDir = path.join(__dirname, "..", "data");
fs.mkdirSync(outDir, { recursive: true });

const tables = [
  "ItemInfoData",
  "GearInfoData",
  "GearTypeInfoData",
  "HeroInfoData",
  "GradeInfoData",
  "MaterialInfoData",
  "StatModGroupInfoData",
  "StatModInfoData",
];

const raw = {};
for (const tableName of tables) {
  const objects = tableToObjects(tableName);
  raw[tableName] = objects;
  const outPath = path.join(outDir, `${tableName}.json`);
  fs.writeFileSync(outPath, JSON.stringify(objects, null, 2));
  console.log(`${tableName}: ${objects.length} rows -> ${outPath}`);
}

// --- Merge into the lean, resolved shape the site actually consumes ---

const gearTypeByKey = new Map(raw.GearTypeInfoData.map((g) => [g.GearType, g]));
const gearStatsByKey = new Map(raw.GearInfoData.map((g) => [g.GearKey, g]));
const gradeOrder = new Map(raw.GradeInfoData.map((g, i) => [g.GRADE, i]));

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) && v !== "" ? n : 0;
}

// Maps an ItemInfoData row to the relative path (under assets/icons/, as
// populated by tools/download-icons.mjs) of its icon image, mirroring
// taskbarhero.org's own asset layout: gear/{gearType-or-parts}/{IconPath}.png,
// materials/{IconPath}.png, boxes/{IconPath}.png.
function iconRelPath(it) {
  if (!it.IconPath) return null;
  if (it.ITEMTYPE === "GEAR") {
    const folder = (it.GEARTYPE || it.PARTS || "").toLowerCase();
    return folder ? `gear/${folder}/${it.IconPath}.png` : null;
  }
  if (it.ITEMTYPE === "MATERIAL") return `materials/${it.IconPath}.png`;
  if (it.ITEMTYPE === "STAGEBOX") return `boxes/${it.IconPath}.png`;
  return null;
}

function resolveGearStats(itemKey, gearType) {
  const gear = gearStatsByKey.get(itemKey);
  const typeInfo = gearTypeByKey.get(gearType);
  if (!gear) return [];

  const stats = [];
  if (typeInfo?.BaseStat1_STATTYPE && typeInfo.BaseStat1_STATTYPE !== "NONE") {
    stats.push({
      statType: typeInfo.BaseStat1_STATTYPE,
      modType: typeInfo.BaseStat1_MODTYPE,
      value: num(gear.BaseStat1_Value),
    });
  }
  if (typeInfo?.BaseStat2_STATTYPE && typeInfo.BaseStat2_STATTYPE !== "NONE") {
    stats.push({
      statType: typeInfo.BaseStat2_STATTYPE,
      modType: typeInfo.BaseStat2_MODTYPE,
      value: num(gear.BaseStat2_Value),
    });
  }
  for (const n3 of [1, 2, 3]) {
    const statType = gear[`InherentStat${n3}_STATTYPE`];
    if (statType && statType !== "NONE") {
      stats.push({
        statType,
        modType: gear[`InherentStat${n3}_MODTYPE`],
        value: num(gear[`InherentStat${n3}_Value`]),
      });
    }
  }
  return stats;
}

const items = raw.ItemInfoData.map((it) => {
  const base = {
    itemKey: num(it.ItemKey),
    itemType: it.ITEMTYPE,
    grade: it.GRADE,
    gradeOrder: gradeOrder.get(it.GRADE) ?? -1,
    parts: it.PARTS || null,
    gearType: it.GEARTYPE || null,
    level: num(it.Level),
    nameKey: it.NameKey || null,
    icon: iconRelPath(it),
  };
  if (it.ITEMTYPE === "GEAR") {
    base.stats = resolveGearStats(it.ItemKey, it.GEARTYPE);
  }
  return base;
});

const heroes = raw.HeroInfoData.map((h) => ({
  heroKey: num(h.HeroKey),
  class: h.ClassType,
  icon: `heroes/Hero_${num(h.HeroKey)}.png`,
  mainWeaponGearType: h.MainWeaponGearType || null,
  subWeaponGearType: h.SubWeaponGearType || null,
  baseStats: {
    AttackDamage: num(h.AttackDamage),
    AttackSpeed: num(h.AttackSpeed),
    CastSpeed: num(h.CastSpeed),
    CriticalChance: num(h.CriticalChance),
    CriticalDamage: num(h.CriticalDamage),
    MaxHp: num(h.MaxHp),
    Armor: num(h.Armor),
    CooldownReduction: num(h.CooldownReduction),
    MovementSpeed: num(h.MovementSpeed),
  },
}));

const grades = raw.GradeInfoData.map((g, i) => ({
  grade: g.GRADE,
  order: i,
  inherentSlots: num(g.InherentSlotAmount),
  decorationSlots: num(g.ExtraSlotAmount_Decoration),
  engravingSlots: num(g.ExtraSlotAmount_Engraving),
  inscriptionSlots: num(g.ExtraSlotAmount_Inscription),
}));

// --- Socket/gem materials: resolve each stone's actual stat effect(s) ---
//
// MaterialInfoData.StatModGroupKey -> StatModGroupInfoData (one row per
// GearGroup: WEAPON/ARMOR/ACCESSORY, or a shared "COMMON" pool) -> StatModKey
// + MinTier/MaxTier -> StatModInfoData (StatModKey+Tier -> STATTYPE/MODTYPE/
// MinValue/MaxValue). This chain is real game data (confirmed present in
// sharedassets0.assets), so socket effects below are exact, not guessed.

const statModRowsByKeyTier = new Map(
  raw.StatModInfoData.map((row) => [`${row.StatModKey}_${row.Tier}`, row])
);

const statModGroupRowsByGroupKey = new Map();
for (const row of raw.StatModGroupInfoData) {
  const list = statModGroupRowsByGroupKey.get(row.StatModGroupKey) ?? [];
  list.push(row);
  statModGroupRowsByGroupKey.set(row.StatModGroupKey, list);
}

function resolveStatModRange(statModKey, minTier, maxTier) {
  const minRow = statModRowsByKeyTier.get(`${statModKey}_${minTier}`);
  const maxRow = statModRowsByKeyTier.get(`${statModKey}_${maxTier}`) ?? minRow;
  if (!minRow) return null;
  return {
    statType: minRow.STATTYPE,
    modType: minRow.MODTYPE,
    minValue: num(minRow.MinValue),
    maxValue: num(maxRow.MaxValue),
  };
}

const itemInfoByKey = new Map(raw.ItemInfoData.map((it) => [it.ItemKey, it]));

const materials = raw.MaterialInfoData.map((m) => {
  const itemRow = itemInfoByKey.get(m.ItemKey);
  const groupRows = statModGroupRowsByGroupKey.get(m.StatModGroupKey) ?? [];
  const effects = groupRows
    .map((row) => {
      const resolved = resolveStatModRange(row.StatModKey, row.MinTier, row.MaxTier);
      return resolved && { gearGroup: row.GearGroup, ...resolved };
    })
    .filter(Boolean);

  return {
    itemKey: num(m.ItemKey),
    nameKey: itemRow?.NameKey || null,
    grade: itemRow?.GRADE || null,
    materialType: m.MATERIALTYPE,
    icon: itemRow ? iconRelPath(itemRow) : null,
    effects,
  };
});

fs.writeFileSync(path.join(outDir, "items.json"), JSON.stringify(items));
fs.writeFileSync(path.join(outDir, "heroes.json"), JSON.stringify(heroes, null, 2));
fs.writeFileSync(path.join(outDir, "grades.json"), JSON.stringify(grades, null, 2));
fs.writeFileSync(path.join(outDir, "materials.json"), JSON.stringify(materials));

console.log(`\nFinal site data:`);
console.log(`  items.json: ${items.length} items`);
console.log(`  heroes.json: ${heroes.length} heroes`);
console.log(`  grades.json: ${grades.length} grades`);
console.log(`  materials.json: ${materials.length} materials`);
