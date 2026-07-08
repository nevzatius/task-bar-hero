import { EQUIP_SLOT_PARTS } from "./save-parser.js";

// Rule-based (no LLM) item -> hero recommendation engine.
//
// Weapon slots (MAIN_WEAPON / SUB_WEAPON) are a hard restriction: the game's
// own HeroInfoData ties each hero to an exact gearType (e.g. Knight only uses
// SWORD/SHIELD), so a weapon only ever "fits" the one hero whose
// mainWeaponGearType/subWeaponGearType matches the item's gearType.
//
// Universal slots (helmet/armor/gloves/boots/amulet/ring/earing/bracer) can
// go to any hero. Rather than always favoring whichever hero's base kit
// leans hardest on a stat (which just dumps every Armor piece on the
// tankiest hero), we rank by IMPROVEMENT: how much better is this item than
// what that hero currently has equipped in the same slot. A mediocre item
// can still be the best pick for a hero who's stuck with something worse.

export function buildStatWeights(heroes) {
  const totals = new Map();
  for (const hero of heroes) {
    for (const [stat, value] of Object.entries(hero.baseStats)) {
      totals.set(stat, (totals.get(stat) ?? 0) + value);
    }
  }

  const weightFor = (heroKey, statType) => {
    const hero = heroes.find((h) => h.heroKey === heroKey);
    const value = hero?.baseStats?.[statType];
    if (value === undefined) return 1 / heroes.length; // unknown stat: neutral
    const total = totals.get(statType) ?? 0;
    return total > 0 ? value / total : 1 / heroes.length;
  };

  return { weightFor };
}

function validHeroesForItem(itemDef, heroes, isWeaponSlot) {
  if (!isWeaponSlot(itemDef.parts)) return heroes;
  const field =
    itemDef.parts === "MAIN_WEAPON" ? "mainWeaponGearType" : "subWeaponGearType";
  return heroes.filter((h) => h[field] === itemDef.gearType);
}

export function scoreItemForHero(itemDef, heroKey, statWeights) {
  if (!itemDef?.stats) return 0;
  return itemDef.stats.reduce(
    (sum, s) => sum + s.value * statWeights.weightFor(heroKey, s.statType),
    0
  );
}

/**
 * @param {object} db - result of loadGameData()
 * @param {object} save - result of parseSaveData()
 * @returns {Map<number, Map<string, object|null>>} heroKey -> Map(parts -> currently equipped itemDef | null)
 */
export function getEquippedMap(db, save) {
  const equippedByHero = new Map();
  for (const hero of save.heroes) {
    const bySlot = new Map();
    hero.equippedItemIds.forEach((uniqueId, i) => {
      const instance = save.itemsByUniqueId.get(uniqueId);
      const itemDef = instance ? db.itemsByKey.get(instance.itemKey) ?? null : null;
      bySlot.set(EQUIP_SLOT_PARTS[i], itemDef);
    });
    equippedByHero.set(hero.heroKey, bySlot);
  }
  return equippedByHero;
}

/**
 * @param {object} db - result of loadGameData()
 * @param {object} save - result of parseSaveData()
 */
export function buildRecommender(db, save) {
  const statWeights = buildStatWeights(db.heroes);
  const unlockedHeroKeys = new Set(
    save.heroes.filter((h) => h.isUnlocked).map((h) => h.heroKey)
  );
  const equippedByHero = getEquippedMap(db, save);

  return {
    /**
     * @param {object} itemDef - static item definition (from db.itemsByKey)
     * @returns {{heroKey:number, className:string, candidateScore:number, equippedScore:number, improvement:number, isUpgrade:boolean, isEmpty:boolean, isLocked:boolean}[]}
     *   sorted by biggest improvement first
     */
    recommend(itemDef) {
      if (itemDef.itemType !== "GEAR") return [];

      const allCandidates = validHeroesForItem(itemDef, db.heroes, db.isWeaponSlot);
      const unlockedCandidates = allCandidates.filter((h) =>
        unlockedHeroKeys.has(h.heroKey)
      );
      // If the only hero(es) who can use this gearType are still locked,
      // fall back to showing them anyway (flagged isLocked) rather than
      // silently dropping the recommendation.
      const pool = unlockedCandidates.length > 0 ? unlockedCandidates : allCandidates;

      return pool
        .map((h) => {
          const equippedDef = equippedByHero.get(h.heroKey)?.get(itemDef.parts) ?? null;
          const candidateScore = scoreItemForHero(itemDef, h.heroKey, statWeights);
          const equippedScore = scoreItemForHero(equippedDef, h.heroKey, statWeights);
          return {
            heroKey: h.heroKey,
            className: h.class,
            candidateScore,
            equippedScore,
            improvement: candidateScore - equippedScore,
            isUpgrade: candidateScore > equippedScore,
            isEmpty: !equippedDef,
            isLocked: !unlockedHeroKeys.has(h.heroKey),
          };
        })
        .sort((a, b) => b.improvement - a.improvement);
    },
  };
}
