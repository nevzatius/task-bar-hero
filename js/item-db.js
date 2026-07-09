// Loads the static game data extracted by tools/extract-game-data.mjs
// (data/items.json, data/heroes.json, data/grades.json) and exposes simple
// lookups. This data was mined directly from the game's own CSV data tables
// (ItemInfoData / GearInfoData / GearTypeInfoData / HeroInfoData /
// GradeInfoData embedded in TaskBarHero_Data/sharedassets0.assets), so item
// slots/rarity/stats and hero base stats/weapon restrictions are exact game
// values, not guesses.

const PARTS_TR = {
  MAIN_WEAPON: "Silah",
  SUB_WEAPON: "Yardımcı Silah",
  HELMET: "Kask",
  ARMOR: "Zırh",
  GLOVES: "Eldiven",
  BOOTS: "Bot",
  AMULET: "Kolye",
  RING: "Yüzük",
  EARING: "Küpe",
  BRACER: "Bilezik",
};

const GRADE_TR = {
  COMMON: "Sıradan",
  UNCOMMON: "Nadide",
  RARE: "Nadir",
  LEGENDARY: "Efsanevi",
  IMMORTAL: "Ölümsüz",
  ARCANA: "Arcana",
  BEYOND: "Beyond",
  CELESTIAL: "Celestial",
  DIVINE: "İlahi",
  COSMIC: "Kozmik",
};

const STAT_TR = {
  AttackDamage: "Saldırı Gücü",
  AttackSpeed: "Saldırı Hızı",
  CastSpeed: "Cast Hızı",
  CriticalChance: "Kritik Şans",
  CriticalDamage: "Kritik Hasar",
  MaxHp: "Maks. Can",
  Armor: "Zırh",
  CooldownReduction: "Bekleme Azaltma",
  MovementSpeed: "Hareket Hızı",
  AddHpPerHit: "Vuruşta Can Kazanımı",
  AddHpPerKill: "Öldürmede Can Kazanımı",
  HpRegenPerSec: "Saniyede Can Yenileme",
  BlockChance: "Blok Şansı",
  PhysicalDamagePercent: "Fiziksel Hasar %",
  AllElementalResistance: "Element Direnci",
  DamageReduction: "Hasar Azaltma",
  SkillRangeExpansion: "Yetenek Menzili",
  AreaOfEffect: "Etki Alanı",
  BaseAttackCountReduction: "Temel Saldırı Sayısı Azaltma",
  ChaosResistance: "Kaos Direnci",
  ColdDamagePercent: "Soğuk Hasarı %",
  ColdResistance: "Soğuk Direnci",
  DamageAbsorption: "Hasar Emilimi",
  DodgeChance: "Kaçınma Şansı",
  FireDamagePercent: "Ateş Hasarı %",
  FireResistance: "Ateş Direnci",
  HpLeech: "Can Emme",
  IncreaseAreaOfEffectDamage: "Alan Hasarı Artışı",
  IncreaseMeleeDamage: "Yakın Dövüş Hasarı Artışı",
  IncreaseProjectileDamage: "Mermi Hasarı Artışı",
  IncreaseSummonDamage: "Çağırma Hasarı Artışı",
  LightningDamagePercent: "Yıldırım Hasarı %",
  LightningResistance: "Yıldırım Direnci",
  Multistrike: "Çoklu Vuruş",
  ProjectileCount: "Mermi Sayısı",
  SkillDurationIncrease: "Yetenek Süresi Artışı",
  SkillHealIncrease: "Yetenek İyileştirme Artışı",
};

const MATERIAL_TYPE_TR = {
  DECORATION: "Süsleme Taşı",
  ENGRAVING: "Kazıma Taşı",
  INSCRIPTION: "Nakış Taşı",
  CRAFTING: "Zanaat Malzemesi",
  OFFERING: "Adak Malzemesi",
  SOULSTONE: "Ruh Taşı",
};

const GEAR_GROUP_TR = {
  WEAPON: "Silah",
  ARMOR: "Zırh",
  ACCESSORY: "Aksesuar",
  COMMON: "Ortak",
};

const DIFFICULTY_TR = {
  NORMAL: "Normal",
  NIGHTMARE: "Kabus",
  HELL: "Cehennem",
  TORMENT: "Azap",
};

// Maps an equip slot (PARTS) to the gear-group category the socket system
// uses (StatModGroupInfoData.GearGroup) so a material's resolved effects can
// be looked up per-slot.
const PARTS_TO_GEAR_GROUP = {
  MAIN_WEAPON: "WEAPON",
  SUB_WEAPON: "WEAPON",
  HELMET: "ARMOR",
  ARMOR: "ARMOR",
  GLOVES: "ARMOR",
  BOOTS: "ARMOR",
  AMULET: "ACCESSORY",
  EARING: "ACCESSORY",
  RING: "ACCESSORY",
  BRACER: "ACCESSORY",
};

// Universal slots any hero can equip; weapon slots are restricted by gearType.
const WEAPON_PARTS = new Set(["MAIN_WEAPON", "SUB_WEAPON"]);

export async function loadGameData(baseUrl = new URL("../data/", import.meta.url)) {
  const [items, heroes, grades, materials, stages, drops] = await Promise.all(
    ["items.json", "heroes.json", "grades.json", "materials.json", "stages.json", "drops.json"].map((f) =>
      fetch(new URL(f, baseUrl)).then((r) => {
        if (!r.ok) throw new Error(`${f} yüklenemedi (${r.status})`);
        return r.json();
      })
    )
  );

  const itemsByKey = new Map(items.map((it) => [it.itemKey, it]));
  const heroesByKey = new Map(heroes.map((h) => [h.heroKey, h]));
  const materialsByKey = new Map(materials.map((m) => [m.itemKey, m]));
  const gradesByName = new Map(grades.map((g) => [g.grade, g]));
  const stagesByKey = new Map(stages.map((s) => [s.stageKey, s]));
  const boxesByKey = new Map(drops.boxes.map((b) => [b.itemKey, b]));

  return {
    items,
    heroes,
    grades,
    materials,
    stages,
    drops,
    itemsByKey,
    heroesByKey,
    materialsByKey,
    gradesByName,
    stagesByKey,
    boxesByKey,
    isWeaponSlot: (parts) => WEAPON_PARTS.has(parts),
    gearGroupForParts: (parts) => PARTS_TO_GEAR_GROUP[parts] ?? null,
    labelForParts: (parts) => PARTS_TR[parts] ?? parts ?? "?",
    labelForGrade: (grade) => GRADE_TR[grade] ?? grade ?? "?",
    labelForStat: (statType) => STAT_TR[statType] ?? statType,
    labelForMaterialType: (materialType) => MATERIAL_TYPE_TR[materialType] ?? materialType ?? "?",
    labelForGearGroup: (gearGroup) => GEAR_GROUP_TR[gearGroup] ?? gearGroup ?? "?",
    labelForDifficulty: (difficulty) => DIFFICULTY_TR[difficulty] ?? difficulty ?? "?",
    // "1-3 · Kabus" for normal stages, "Perde 1 Patronu · Normal" for act
    // bosses (StageNameKey is an unlocalized key, so we format act/stageNo).
    stageDisplayName(stage) {
      const diff = DIFFICULTY_TR[stage.difficulty] ?? stage.difficulty;
      if (stage.type === "ACTBOSS") return `Perde ${stage.act} Patronu · ${diff}`;
      return `${stage.act}-${stage.stageNo} · ${diff}`;
    },
    displayName(itemDef) {
      if (!itemDef) return "Bilinmeyen Item";
      if (itemDef.itemType === "MATERIAL") {
        const material = materialsByKey.get(itemDef.itemKey);
        const grade = GRADE_TR[itemDef.grade] ?? itemDef.grade;
        const typeLabel = material ? MATERIAL_TYPE_TR[material.materialType] ?? material.materialType : "";
        return `${grade} ${typeLabel}`.trim();
      }
      // STAGEBOX NameKeys are already readable English ("Normal Monster Box 1").
      if (itemDef.itemType === "STAGEBOX" && itemDef.nameKey) {
        return itemDef.nameKey;
      }
      if (itemDef.itemType !== "GEAR") {
        return `${itemDef.itemType} #${itemDef.itemKey}`;
      }
      const grade = GRADE_TR[itemDef.grade] ?? itemDef.grade;
      const gearType = itemDef.gearType ?? "";
      return `${grade} ${gearType} (Lv.${itemDef.level})`;
    },
  };
}
