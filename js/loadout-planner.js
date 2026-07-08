import { EQUIP_SLOT_PARTS } from "./save-parser.js";
import { buildStatWeights, scoreItemForHero, getEquippedMap } from "./recommender.js";

// Level-aware, per-hero, per-slot "what should I equip right now" planner.
//
// Unlike recommender.js (which asks "which hero wants THIS item"), this asks
// the opposite question per hero: across everything the player owns
// (inventory + stash), what's the best item for EACH of my 10 slots that my
// hero's current level actually allows me to use? An item whose level
// requirement exceeds the hero's level is not usable yet, so it's excluded
// from the primary pick even if it would score higher.

/**
 * @param {object} db - result of loadGameData()
 * @param {object} save - result of parseSaveData()
 */
export function buildLoadoutPlanner(db, save) {
  const statWeights = buildStatWeights(db.heroes);
  const equippedByHero = getEquippedMap(db, save);

  const ownedDefs = [...new Set([...save.inventoryItemIds, ...save.stashItemIds])]
    .map((uniqueId) => save.itemsByUniqueId.get(uniqueId))
    .filter(Boolean)
    .map((instance) => db.itemsByKey.get(instance.itemKey))
    .filter((def) => def?.itemType === "GEAR");

  const ownedByParts = new Map();
  for (const def of ownedDefs) {
    const list = ownedByParts.get(def.parts) ?? [];
    list.push(def);
    ownedByParts.set(def.parts, list);
  }

  return {
    /**
     * @param {object} hero - entry from save.heroes
     * @returns {{parts:string, best:object|null, equippedDef:object|null, ownedCount:number, isFallback:boolean, isUpgrade:boolean}[]}
     */
    planForHero(hero) {
      return EQUIP_SLOT_PARTS.map((parts) => {
        let candidates = ownedByParts.get(parts) ?? [];
        if (parts === "MAIN_WEAPON") {
          candidates = candidates.filter((d) => d.gearType === hero.mainWeaponGearType);
        } else if (parts === "SUB_WEAPON") {
          candidates = candidates.filter((d) => d.gearType === hero.subWeaponGearType);
        }

        let pool = candidates.filter((d) => d.level <= hero.level);
        let isFallback = false;
        if (pool.length === 0 && candidates.length > 0) {
          // Hero isn't high enough level for anything owned in this slot yet:
          // surface the closest-above-level item instead of hiding the slot.
          pool = [candidates.slice().sort((a, b) => a.level - b.level)[0]];
          isFallback = true;
        }

        const scored = pool
          .map((itemDef) => ({ itemDef, score: scoreItemForHero(itemDef, hero.heroKey, statWeights) }))
          .sort((a, b) => b.score - a.score || b.itemDef.gradeOrder - a.itemDef.gradeOrder);

        const best = scored[0]?.itemDef ?? null;
        const equippedDef = equippedByHero.get(hero.heroKey)?.get(parts) ?? null;
        const bestScore = best ? scoreItemForHero(best, hero.heroKey, statWeights) : -Infinity;
        const equippedScore = scoreItemForHero(equippedDef, hero.heroKey, statWeights);

        return {
          parts,
          best,
          equippedDef,
          ownedCount: candidates.length,
          isFallback,
          isUpgrade: !isFallback && !!best && bestScore > equippedScore,
        };
      });
    },
  };
}
