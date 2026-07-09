import { buildStatWeights } from "./recommender.js";
import { SKILL_PLANS } from "./skill-guide.js";

// "Which stone goes in which item?" guide. Socket materials (Decoration /
// Engraving / Inscription) each resolve to a different stat effect depending
// on which gear-group slot they're placed in (Weapon / Armor / Accessory) —
// this comes straight from the game's own StatModGroupInfoData/StatModInfoData
// tables (see tools/extract-game-data.mjs), so the numbers here are exact,
// not estimated.

const SOCKETABLE_TYPES = ["DECORATION", "ENGRAVING", "INSCRIPTION"];
const SLOT_FIELD_BY_TYPE = {
  DECORATION: "decorationSlots",
  ENGRAVING: "engravingSlots",
  INSCRIPTION: "inscriptionSlots",
};

// Per-class stat priority used to rank socket stones for a specific item.
// The ORDER of each list is an editorial judgment call derived from the
// class roles in SKILL_PLANS (community consensus), NOT datamined game data —
// the stone stats/values themselves are exact. Stats missing from a list
// rank last; candidates are already filtered to the item's gear group, so a
// single flat list per class covers weapon, armor and accessory sockets.
const SOCKET_STAT_PRIORITY = {
  // Tank / Hibrit DPS: survivability first, physical melee damage second.
  Knight: [
    "DamageReduction", "Armor", "MaxHp", "BlockChance", "DamageAbsorption",
    "AllElementalResistance", "HpRegenPerSec", "PhysicalDamagePercent",
    "IncreaseMeleeDamage", "Multistrike", "AttackDamage", "CriticalChance",
    "CriticalDamage", "AttackSpeed", "AddHpPerHit", "HpLeech",
    "CooldownReduction", "FireResistance", "ColdResistance",
    "LightningResistance", "ChaosResistance", "MovementSpeed",
  ],
  // Menzilli Fiziksel DPS: projectile scaling, then crit throughput.
  Ranger: [
    "IncreaseProjectileDamage", "ProjectileCount", "Multistrike",
    "PhysicalDamagePercent", "BaseAttackCountReduction", "AttackDamage",
    "CriticalChance", "CriticalDamage", "AttackSpeed", "AreaOfEffect",
    "IncreaseAreaOfEffectDamage", "CooldownReduction", "MovementSpeed",
    "DodgeChance", "HpLeech", "AddHpPerHit", "MaxHp", "Armor",
  ],
  // AoE Elemental Büyücü: elemental %, cast speed, AoE scaling.
  Sorcerer: [
    "FireDamagePercent", "ColdDamagePercent", "LightningDamagePercent",
    "IncreaseAreaOfEffectDamage", "CastSpeed", "AreaOfEffect",
    "CriticalChance", "CriticalDamage", "CooldownReduction", "AttackDamage",
    "SkillDurationIncrease", "MovementSpeed", "MaxHp", "Armor",
    "AllElementalResistance", "DodgeChance",
  ],
  // Heal / Destek: healing output and uptime over personal damage.
  Priest: [
    "SkillHealIncrease", "CooldownReduction", "CastSpeed",
    "SkillDurationIncrease", "MaxHp", "HpRegenPerSec", "Armor",
    "DamageReduction", "AreaOfEffect", "IncreaseAreaOfEffectDamage",
    "BlockChance", "DamageAbsorption", "AllElementalResistance",
    "MovementSpeed", "DodgeChance", "FireResistance", "ColdResistance",
    "LightningResistance", "ChaosResistance", "AttackDamage",
  ],
  // Elemental Menzilli DPS / Tuzakçı: elemental + projectile scaling.
  Hunter: [
    "IncreaseProjectileDamage", "FireDamagePercent", "ColdDamagePercent",
    "LightningDamagePercent", "ProjectileCount", "Multistrike",
    "BaseAttackCountReduction", "CriticalChance", "CriticalDamage",
    "AttackSpeed", "AttackDamage", "AreaOfEffect",
    "IncreaseAreaOfEffectDamage", "SkillDurationIncrease",
    "CooldownReduction", "MovementSpeed", "DodgeChance", "MaxHp", "Armor",
  ],
  // Melee Bruiser / Lifesteal: melee damage plus sustain.
  Slayer: [
    "IncreaseMeleeDamage", "PhysicalDamagePercent", "HpLeech", "AddHpPerHit",
    "Multistrike", "AttackDamage", "CriticalChance", "CriticalDamage",
    "AttackSpeed", "BaseAttackCountReduction", "MaxHp", "HpRegenPerSec",
    "AddHpPerKill", "Armor", "DamageReduction", "CooldownReduction",
    "MovementSpeed",
  ],
};

// Generic DPS-leaning order for an unknown class.
const FALLBACK_STAT_PRIORITY = [
  "AttackDamage", "CriticalChance", "CriticalDamage", "AttackSpeed",
  "MaxHp", "Armor", "CooldownReduction", "MovementSpeed",
];

// Reuse the skill guide's already-curated class roles (e.g. "Tank / Hibrit
// DPS", "Heal / Destek", "Menzilli DPS") instead of inventing a second,
// numeric-only classification — a made-up formula over baseStats alone
// mislabels squishy ranged classes like Ranger/Hunter as "tank" just because
// their MaxHp+Armor edges out their (comparatively tiny) AttackDamage stat.
function heroArchetype(hero) {
  const role = SKILL_PLANS[hero.class]?.role ?? "";
  return /tank|heal|destek/i.test(role) ? "TANK" : "DPS";
}

/**
 * @param {object} db - result of loadGameData()
 * @param {object|null} save - result of parseSaveData(), or null if unavailable
 */
export function buildSocketGuide(db, save) {
  const statWeights = buildStatWeights(db.heroes);

  const slotUnlockGrade = {};
  for (const type of SOCKETABLE_TYPES) {
    const field = SLOT_FIELD_BY_TYPE[type];
    const firstGrade = db.grades.find((g) => g[field] > 0);
    slotUnlockGrade[type] = firstGrade?.grade ?? null;
  }

  const heroArchetypes = db.heroes.map((h) => ({
    heroKey: h.heroKey,
    class: h.class,
    archetype: heroArchetype(h),
  }));

  // Materials can grant stats (elemental damage %, resistances, dodge,
  // leech, etc.) that aren't part of any hero's tracked baseStats — for
  // those, buildStatWeights.weightFor falls back to a neutral 1/N weight for
  // every hero, which would make bestHeroForEffect "pick" whichever hero
  // happens to iterate first rather than a real winner. Only name a best
  // hero when the stat is one the heroes actually differ on.
  const trackedStatTypes = new Set(db.heroes.flatMap((h) => Object.keys(h.baseStats)));

  function bestHeroForEffect(effect) {
    if (!trackedStatTypes.has(effect.statType)) return null;
    let best = null;
    for (const h of db.heroes) {
      const weight = statWeights.weightFor(h.heroKey, effect.statType);
      const score = weight * effect.maxValue;
      if (!best || score > best.score) best = { heroKey: h.heroKey, class: h.class, score };
    }
    return best;
  }

  const allMaterials = db.materials
    .filter((m) => SOCKETABLE_TYPES.includes(m.materialType))
    .map((material) => ({
      material,
      effectsWithAdvice: material.effects.map((effect) => ({ ...effect, bestHero: bestHeroForEffect(effect) })),
    }));

  const ownedItemKeys = save
    ? new Set(
        [...new Set([...save.inventoryItemIds, ...save.stashItemIds])]
          .map((uniqueId) => save.itemsByUniqueId.get(uniqueId)?.itemKey)
          .filter((k) => k !== undefined)
      )
    : new Set();

  const ownedMaterials = allMaterials.filter((entry) => ownedItemKeys.has(entry.material.itemKey));

  /**
   * Best socket stones for one concrete item, ranked for one hero.
   *
   * How many sockets the item has comes from its grade (grades.json slot
   * counts); which effect a stone gives comes from the item's gear group.
   * Inscription stone effects use the slot-independent "COMMON" gear group,
   * so the match is `effect.gearGroup ∈ {itemGroup, "COMMON"}`.
   *
   * @param {object} itemDef - static GEAR definition (from db.itemsByKey)
   * @param {number} heroKey - hero the stone bonuses should be ranked for
   * @returns {{type:string, slots:number, unlockGrade:string|null, ranked:object[]}[]|null}
   *   one entry per socket type; `ranked` holds the top 3 distinct stats as
   *   {statType, material, effect, owned, ownedAlt} — `ownedAlt` is the best
   *   owned lower-grade stone of the same stat when the top one isn't owned.
   */
  function adviseForItem(itemDef, heroKey) {
    if (!itemDef || itemDef.itemType !== "GEAR" || !itemDef.parts) return null;

    const gradeInfo = db.gradesByName.get(itemDef.grade);
    const itemGroup = db.gearGroupForParts(itemDef.parts);
    const heroClass = db.heroesByKey.get(heroKey)?.class;
    const priority = SOCKET_STAT_PRIORITY[heroClass] ?? FALLBACK_STAT_PRIORITY;
    const rankOf = (statType) => {
      const i = priority.indexOf(statType);
      return i === -1 ? priority.length : i;
    };
    const gradeOrder = (grade) => db.gradesByName.get(grade)?.order ?? -1;
    const better = (a, b) =>
      gradeOrder(a.material.grade) !== gradeOrder(b.material.grade)
        ? gradeOrder(a.material.grade) > gradeOrder(b.material.grade)
        : a.effect.maxValue > b.effect.maxValue;

    return SOCKETABLE_TYPES.map((type) => {
      const slots = gradeInfo?.[SLOT_FIELD_BY_TYPE[type]] ?? 0;
      const result = { type, slots, unlockGrade: slotUnlockGrade[type], ranked: [] };
      if (slots === 0) return result;

      // Collapse candidates to one per statType (best grade wins) so the
      // top 3 aren't three grades of the same stat. Every matching effect of
      // a stone counts: Decoration/Engraving stones carry one effect per gear
      // group, but a single Inscription stone carries the whole pool of
      // "COMMON" stats it can roll.
      const byStat = new Map();
      for (const m of db.materials) {
        if (m.materialType !== type) continue;
        for (const effect of m.effects) {
          if (effect.gearGroup !== itemGroup && effect.gearGroup !== "COMMON") continue;
          const entry = { material: m, effect, owned: ownedItemKeys.has(m.itemKey) };
          const cur = byStat.get(effect.statType);
          if (!cur) {
            byStat.set(effect.statType, { top: entry, ownedBest: entry.owned ? entry : null });
          } else {
            if (better(entry, cur.top)) cur.top = entry;
            if (entry.owned && (!cur.ownedBest || better(entry, cur.ownedBest))) cur.ownedBest = entry;
          }
        }
      }

      result.ranked = [...byStat.entries()]
        .sort((a, b) => {
          const byPriority = rankOf(a[0]) - rankOf(b[0]);
          if (byPriority !== 0) return byPriority;
          return (
            gradeOrder(b[1].top.material.grade) - gradeOrder(a[1].top.material.grade) ||
            b[1].top.effect.maxValue - a[1].top.effect.maxValue
          );
        })
        .slice(0, 3)
        .map(([statType, { top, ownedBest }]) => ({
          statType,
          material: top.material,
          effect: top.effect,
          owned: top.owned,
          ownedAlt: ownedBest && ownedBest.material.itemKey !== top.material.itemKey ? ownedBest : null,
        }));
      return result;
    });
  }

  return { slotUnlockGrade, heroArchetypes, allMaterials, ownedMaterials, adviseForItem };
}
