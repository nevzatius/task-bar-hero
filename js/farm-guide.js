// Farm guide: answers "which stages drop item X?" and "where should I farm
// for goal Y?". Every input value (stage/box drop rates, drop-table weights,
// group memberships, per-kill gold/XP) is exact datamined game data; the
// probability model on top — weight-proportional roll + uniform pick inside
// an ItemGroup, box DropCooldown ignored — is inferred from the table
// structure, not confirmed against game code.
//
// drops.json table types (see tools/extract-game-data.mjs):
//  - "weight": one roll from the weighted pool; heroCond rows (501 Hunter /
//    601 Slayer) join the pool only when that DLC hero is owned.
//  - "selectByClass": the reward matching the class condition is granted
//    (first-clear tables; no probability model, shown as a list).

export function buildFarmGuide(db) {
  const { stages, drops } = db;

  // (dropKey, dlcOwned) -> Map<itemKey, chance>. The same item can appear in
  // several groups; chances are summed.
  const tableCache = new Map();
  function resolveTable(dropKey, dlcOwned) {
    const cacheKey = `${dropKey}_${dlcOwned}`;
    let resolved = tableCache.get(cacheKey);
    if (resolved) return resolved;

    resolved = new Map();
    const table = drops.tables[dropKey];
    if (table && table.type === "weight") {
      const entries = table.entries.filter((e) => !e.heroCond || dlcOwned);
      const total = entries.reduce((sum, e) => sum + e.weight, 0);
      for (const e of entries) {
        if (total === 0) break;
        const share = e.weight / total;
        const itemKeys = e.item != null ? [e.item] : drops.groups[e.group] ?? [];
        for (const itemKey of itemKeys) {
          resolved.set(itemKey, (resolved.get(itemKey) ?? 0) + share / itemKeys.length);
        }
      }
    }
    tableCache.set(cacheKey, resolved);
    return resolved;
  }

  // dlcOwned -> Map<itemKey, Map<dropKey, chance>> (box tables only).
  const indexCache = new Map();
  function itemIndex(dlcOwned) {
    let index = indexCache.get(dlcOwned);
    if (index) return index;
    index = new Map();
    for (const box of drops.boxes) {
      for (const [itemKey, chance] of resolveTable(box.dropKey, dlcOwned)) {
        let perDrop = index.get(itemKey);
        if (!perDrop) index.set(itemKey, (perDrop = new Map()));
        perDrop.set(box.dropKey, chance);
      }
    }
    indexCache.set(dlcOwned, index);
    return index;
  }

  // A stage's box sources: the monster box drops off wave kills, the boss box
  // off the stage boss (ACTBOSS rows leave the rate empty = treated as
  // guaranteed, an assumption).
  function boxSources(stage) {
    const sources = [];
    if (stage.monsterBox) {
      sources.push({
        via: "monsterBox",
        box: db.boxesByKey.get(stage.monsterBox.itemKey),
        boxesPerClear: (stage.waveKills * stage.monsterBox.ratePermill) / 1000,
      });
    }
    if (stage.bossBox) {
      sources.push({
        via: "bossBox",
        box: db.boxesByKey.get(stage.bossBox.itemKey),
        boxesPerClear: (stage.bossBox.ratePermill ?? 1000) / 1000,
      });
    }
    return sources;
  }

  // First-clear reward: one-time, excluded from expected values; returned as
  // a list. selectByClass entries carry a class condition instead of a chance.
  function firstClearRewards(stage, dlcOwned) {
    if (!stage.firstClearDropKey) return null;
    const table = drops.tables[stage.firstClearDropKey];
    if (!table) return null;
    if (table.type === "selectByClass") {
      return table.entries.map((e) => ({
        itemKey: e.item,
        def: db.itemsByKey.get(e.item) ?? null,
        chance: null,
        heroCond: e.heroCond ?? null,
      }));
    }
    return [...resolveTable(stage.firstClearDropKey, dlcOwned)]
      .map(([itemKey, chance]) => ({
        itemKey,
        def: db.itemsByKey.get(itemKey) ?? null,
        chance,
        heroCond: null,
      }))
      .sort((a, b) => b.chance - a.chance);
  }

  return {
    // For the search box: every item obtainable from boxes (the widest set,
    // i.e. with DLC owned). Materials first, then gear by grade/level.
    farmableItems() {
      const keys = [...itemIndex(true).keys()];
      const defs = keys
        .map((itemKey) => db.itemsByKey.get(itemKey))
        .filter(Boolean);
      defs.sort((a, b) => {
        if (a.itemType !== b.itemType) return a.itemType === "MATERIAL" ? -1 : 1;
        return (a.gradeOrder - b.gradeOrder) || (a.level - b.level) || (a.itemKey - b.itemKey);
      });
      return defs;
    },

    // "Which stages drop item X?" — sorted by expected count per clear.
    dropSources(itemKey, { dlcOwned = true, difficulty = null } = {}) {
      const perDrop = itemIndex(dlcOwned).get(itemKey) ?? new Map();
      const results = [];
      for (const stage of stages) {
        if (difficulty && stage.difficulty !== difficulty) continue;
        for (const src of boxSources(stage)) {
          const chancePerBox = perDrop.get(src.box?.dropKey) ?? 0;
          if (chancePerBox <= 0) continue;
          results.push({
            stage,
            via: src.via,
            box: src.box,
            chancePerBox,
            boxesPerClear: src.boxesPerClear,
            expectedPerClear: src.boxesPerClear * chancePerBox,
          });
        }
        const firstClear = firstClearRewards(stage, dlcOwned);
        if (firstClear?.some((r) => r.itemKey === itemKey)) {
          results.push({
            stage,
            via: "firstClear",
            box: null,
            chancePerBox: null,
            boxesPerClear: null,
            expectedPerClear: 0,
          });
        }
      }
      return results.sort((a, b) => b.expectedPerClear - a.expectedPerClear);
    },

    // Best stage for a gold/exp goal. ACTBOSS stages are excluded: they cost
    // soulstones per entry, so they aren't part of a repeatable farm loop.
    rankStages(goal, { difficulty = null } = {}) {
      return stages
        .filter((s) => s.type !== "ACTBOSS")
        .filter((s) => !difficulty || s.difficulty === difficulty)
        .map((stage) => {
          const perClear = goal === "gold" ? stage.goldPerClear : stage.expPerClear;
          return { stage, perClear, perKill: perClear / stage.killsPerClear };
        })
        .sort((a, b) => b.perClear - a.perClear);
    },

    // Full breakdown of one stage (for the detail modal).
    stageDetail(stageKey, { dlcOwned = true } = {}) {
      const stage = db.stagesByKey.get(stageKey);
      if (!stage) return null;
      const boxes = boxSources(stage).map((src) => ({
        ...src,
        ratePermill:
          src.via === "monsterBox"
            ? stage.monsterBox.ratePermill
            : stage.bossBox.ratePermill ?? 1000,
        drops: [...resolveTable(src.box?.dropKey, dlcOwned)]
          .map(([itemKey, chance]) => ({
            itemKey,
            def: db.itemsByKey.get(itemKey) ?? null,
            chance,
          }))
          .sort((a, b) => b.chance - a.chance),
      }));
      return {
        stage,
        boxes,
        firstClear: firstClearRewards(stage, dlcOwned),
      };
    },
  };
}
