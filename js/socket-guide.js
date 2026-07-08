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

  return { slotUnlockGrade, heroArchetypes, allMaterials, ownedMaterials };
}
