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

// Some table chunks bleed into a neighbouring non-InfoData blob (e.g.
// StageLevelInfoData is followed by a PcSkin sprite table with a different
// column layout), so tables can opt into a row filter that keeps only rows
// matching the header's shape.
const numericRowFilter = (cols, header) =>
  cols.length === header.length && /^\d+$/.test(cols[0]);
const ROW_FILTERS = {
  StageLevelInfoData: numericRowFilter,
  ItemGroupInfoData: numericRowFilter,
};

// Default line filter keeps printable-ASCII lines only, which strips the
// binary junk between tables. ItemGroupInfoData's GroupName column holds
// Korean text (high bytes in the latin1 view), so it gets a relaxed charset
// and relies on its row filter instead — without this, every group with a
// Korean name silently disappears.
const DEFAULT_LINE_RE = /^[\x20-\x7e]*$/;
const LINE_RES = {
  ItemGroupInfoData: /^[\x20-\x7e\x80-\xff]*$/,
};

function extractTable(tableName) {
  const idx = markers.findIndex((mk) => mk.name === tableName);
  if (idx === -1) throw new Error(`table not found: ${tableName}`);
  const start = markers[idx].index + tableName.length;
  const end = idx + 1 < markers.length ? markers[idx + 1].index : text.length;
  let chunk = text.slice(start, end);

  const headerMatch = chunk.match(/[A-Za-z0-9_]+(,[A-Za-z0-9_]*)+/);
  if (!headerMatch) throw new Error(`header not found for ${tableName}`);
  chunk = chunk.slice(headerMatch.index);

  const lineRe = LINE_RES[tableName] ?? DEFAULT_LINE_RE;
  const lines = chunk
    .split(/\r?\n/)
    .filter((line) => lineRe.test(line) && line.length > 0);

  const header = lines[0].split(",");
  let rows = lines.slice(1).map((line) => line.split(","));
  const rowFilter = ROW_FILTERS[tableName];
  if (rowFilter) rows = rows.filter((cols) => rowFilter(cols, header));
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
  "StageInfoData",
  "StageLevelInfoData",
  "DropInfoData",
  "ItemGroupInfoData",
  "MonsterInfoData",
  "OfflineRewardInfoData",
  "LevelInfoData",
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

// --- Farm data: stages.json + drops.json ---
//
// Drop chain (confirmed table structure): StageInfoData.MonsterDropItemKey /
// BossDropItemKey are STAGEBOX ItemKeys dropping at *DropItemRate permill per
// kill; each box's own ItemInfoData.DropKey points into DropInfoData, whose
// weighted rows reference ItemGroupInfoData groups of concrete ItemKeys.
// FirstClearDropKey is a DropKey directly (one-time reward).
// All rates/weights/rewards below are exact datamined values; the derived
// expected-value math carries assumptions flagged inline.

const stageLevelMultByLevel = new Map(
  raw.StageLevelInfoData.map((r) => [r.StageLevel, r])
);
const offlineByLevel = new Map(
  raw.OfflineRewardInfoData.map((r) => [r.StageLevel, r])
);
const monstersByKey = new Map(raw.MonsterInfoData.map((r) => [r.MonsterKey, r]));

// "10011_1000 10021_1000" -> [{ monsterKey, weight }]. The _suffix is
// interpreted as a spawn-mix weight (permill) — an assumption; it is only
// used to average per-kill gold/XP over the stage's monster roster.
function parseMonsterMix(s) {
  return (s || "")
    .split(" ")
    .filter(Boolean)
    .map((pair) => {
      const [monsterKey, weight] = pair.split("_");
      return { monsterKey, weight: num(weight) || 1 };
    });
}

function weightedAvgReward(mix, field) {
  let total = 0;
  let sum = 0;
  for (const { monsterKey, weight } of mix) {
    const mon = monstersByKey.get(monsterKey);
    if (!mon) continue;
    total += weight;
    sum += weight * num(mon[field]);
  }
  return total > 0 ? sum / total : 0;
}

const round1 = (v) => Math.round(v * 10) / 10;

const stages = raw.StageInfoData.map((s) => {
  const mult = stageLevelMultByLevel.get(s.StageLevel);
  // StageLevelInfoData multipliers are percents (100 = 1x) — exact game data.
  const goldMult = (num(mult?.MonsterGoldMultiplier) || 100) / 100;
  const expMult = (num(mult?.MonsterExpMultiplier) || 100) / 100;

  // Boss*Multiplier is permill (2000 = 2x). Confirmed: tbh.city/mechanics
  // publishes the formula (RewardGold x BossGoldMultiplier/1000 x
  // MonsterGoldMultiplier/100), and this pipeline reproduces the community
  // anchor values exactly (1-1: 140 gold / 155 XP; 1-10 boss: 3250 / 1332).
  const bossGoldMult = (num(s.BossGoldMultiplier) || 1000) / 1000;
  const bossExpMult = (num(s.BossExpMultiplier) || 1000) / 1000;

  const boss = monstersByKey.get(s.BossMonsterKey);
  const bossGold = num(boss?.RewardGold) * bossGoldMult * goldMult;
  const bossExp = num(boss?.RewardExp) * bossExpMult * expMult;

  const mix = parseMonsterMix(s.Monsters);
  const waveKills = num(s.WaveAmount) * num(s.WaveMonsterAmount);
  const avgGold = weightedAvgReward(mix, "RewardGold") * goldMult;
  const avgExp = weightedAvgReward(mix, "RewardExp") * expMult;

  const offline = offlineByLevel.get(s.StageLevel);

  return {
    stageKey: num(s.StageKey),
    type: s.STAGETYPE,
    difficulty: s.STAGEDIFFICULITY,
    act: num(s.Act),
    stageNo: num(s.StageNo),
    stageLevel: num(s.StageLevel),
    waveKills, // assumption: WaveAmount x WaveMonsterAmount regular kills...
    killsPerClear: waveKills + 1, // ...plus the stage boss as one extra kill
    goldPerClear: round1(waveKills * avgGold + bossGold),
    expPerClear: round1(waveKills * avgExp + bossExp),
    monsterBox: s.MonsterDropItemKey
      ? { itemKey: num(s.MonsterDropItemKey), ratePermill: num(s.MonsterDropItemRate) }
      : null,
    // ACTBOSS rows leave BossDropItemRate empty — treated as a guaranteed
    // drop (ratePermill null → 1000), an assumption.
    bossBox: s.BossDropItemKey
      ? { itemKey: num(s.BossDropItemKey), ratePermill: s.BossDropItemRate ? num(s.BossDropItemRate) : null }
      : null,
    firstClearDropKey: s.FirstClearDropKey ? num(s.FirstClearDropKey) : null,
    soulstone: s.SoulstoneItemKey
      ? { itemKey: num(s.SoulstoneItemKey), amount: num(s.SoulstoneAmount) }
      : null,
    offline: offline
      ? {
          baseGold: num(offline.BaseGold),
          baseExp: num(offline.BaseExp),
          killCount: num(offline.KillCount),
          clearCount: num(offline.ClearCount),
        }
      : null,
  };
});

// Only ship the drop tables stages can actually reach (36 of 245 DropKeys,
// ~2.4k of 6k DropInfoData rows) instead of the whole raw table.
const boxItemKeys = new Set();
const referencedDropKeys = new Set();
for (const st of stages) {
  if (st.monsterBox) boxItemKeys.add(String(st.monsterBox.itemKey));
  if (st.bossBox) boxItemKeys.add(String(st.bossBox.itemKey));
  if (st.firstClearDropKey) referencedDropKeys.add(String(st.firstClearDropKey));
}

const boxes = [...boxItemKeys].map((key) => {
  const it = itemInfoByKey.get(key);
  if (!it) throw new Error(`stage box item not found in ItemInfoData: ${key}`);
  referencedDropKeys.add(it.DropKey);
  return {
    itemKey: num(it.ItemKey),
    name: it.NameKey || null,
    grade: it.GRADE,
    dropKey: num(it.DropKey),
    dropCooldown: num(it.DropCooldown),
    icon: iconRelPath(it),
  };
});

const groupItemsByKey = new Map();
for (const row of raw.ItemGroupInfoData) {
  const list = groupItemsByKey.get(row.ItemGroupKey) ?? [];
  list.push(num(row.ItemKey));
  groupItemsByKey.set(row.ItemGroupKey, list);
}

const dropTables = {};
const usedGroups = {};
let keptDropRows = 0;
// DropType semantics (observed values, meaning inferred from structure):
//  - EachDropOneWeight / EachDropOneWeight_DLCVariant -> "weight": one roll
//    from the weighted pool; HeroKeyCondition rows (only 501 Hunter / 601
//    Slayer here) join the pool only when the player owns that DLC hero.
//  - SelectOneByClass -> "selectByClass": the reward matching the hero-class
//    condition is granted (all six heroKeys appear; used by first-clear
//    tables that hand out class-appropriate boxes).
const DROP_TYPE_MAP = {
  EachDropOneWeight: "weight",
  EachDropOneWeight_DLCVariant: "weight",
  SelectOneByClass: "selectByClass",
};

for (const row of raw.DropInfoData) {
  if (!referencedDropKeys.has(row.DropKey)) continue;
  keptDropRows++;
  const type = DROP_TYPE_MAP[row.DropType];
  if (!type) throw new Error(`unknown DropType ${row.DropType} in DropKey ${row.DropKey}`);
  const table = (dropTables[row.DropKey] ??= { type, entries: [] });
  if (table.type !== type) throw new Error(`mixed DropTypes in DropKey ${row.DropKey}`);

  // REWARDTYPE is either ITEMGROUP (RewardKey -> ItemGroupInfoData) or ITEM
  // (RewardKey is a concrete ItemKey directly).
  const entry = { weight: num(row.Weight) };
  if (row.REWARDTYPE === "ITEMGROUP") {
    entry.group = num(row.RewardKey);
    usedGroups[row.RewardKey] ??= groupItemsByKey.get(row.RewardKey) ?? [];
  } else {
    entry.item = num(row.RewardKey);
  }
  const heroCond = num(row.HeroKeyCondition);
  if (heroCond) entry.heroCond = heroCond;
  table.entries.push(entry);
}

const dropsOut = { boxes, groups: usedGroups, tables: dropTables };

fs.writeFileSync(path.join(outDir, "items.json"), JSON.stringify(items));
fs.writeFileSync(path.join(outDir, "heroes.json"), JSON.stringify(heroes, null, 2));
fs.writeFileSync(path.join(outDir, "grades.json"), JSON.stringify(grades, null, 2));
fs.writeFileSync(path.join(outDir, "materials.json"), JSON.stringify(materials));
fs.writeFileSync(path.join(outDir, "stages.json"), JSON.stringify(stages));
fs.writeFileSync(path.join(outDir, "drops.json"), JSON.stringify(dropsOut));

console.log(`\nFinal site data:`);
console.log(`  items.json: ${items.length} items`);
console.log(`  heroes.json: ${heroes.length} heroes`);
console.log(`  grades.json: ${grades.length} grades`);
console.log(`  materials.json: ${materials.length} materials`);
console.log(`  stages.json: ${stages.length} stages`);
console.log(
  `  drops.json: ${boxes.length} boxes, ${referencedDropKeys.size} drop keys, ` +
    `${keptDropRows} rows, ${Object.keys(usedGroups).length} item groups`
);
