// Skill point priority guide.
//
// Node names, unlock levels, and max ranks are real datamined values from
// taskbarhero.org's per-hero "Full skill tree" tables (source: game's own
// skill definitions, not a fan guess). Every hero follows the same shape:
// a tier unlocks every 10 levels (0/10/20/30/40/50/60/70), each tier has 2
// passive nodes, and tiers 0-40 additionally unlock one active skill each
// (tier 0 unlocks two, giving 6 active skills total by level 40).
//
// What's NOT confirmed by that source: the exact skill-point income rate
// per hero level (so "point N" below assumes 1 point per level — plausible
// but unverified), and which node to prioritize *within* a tier when more
// than one is available at once. That prioritization is a judgment call
// based on each class's role (tank/DPS/support), not a scraped fact —
// treat the ordering as a reasonable default, not a proven optimal build.

export const SKILL_PLANS = {
  Knight: {
    tier: "S",
    role: "Tank / Hibrit DPS · Ücretsiz",
    note: "Resmi tier list'te S sınıfı: üç rolü (tank, hasar, kalkan) birden karşılıyor. Piercing Thrust ana aktif hasar kaynağı, Unyielding Will (Sv.40) az kere ama kritik anda hayat kurtarıyor.",
    nodes: [
      { name: "Health Enhancement (MaxHp +15/kademe)", cap: 8 },
      { name: "Piercing Thrust (aktif)", cap: 5, active: true, shortName: "Piercing Thrust", rank: 1 },
      { name: "Shield Charge (aktif)", cap: 5, active: true, shortName: "Shield Charge", rank: 6 },
      { name: "Attack Damage Enhancement (+1/kademe)", cap: 3 },

      { name: "Armor Enhancement (+10/kademe)", unlockAt: 10, cap: 8 },
      { name: "Retribution Strike (aktif)", unlockAt: 10, cap: 5, active: true, shortName: "Retribution Strike", rank: 5 },
      { name: "HP Regen Enhancement (+100/kademe)", unlockAt: 10, cap: 5 },

      { name: "Aegis Field (aktif, kalkan)", unlockAt: 20, cap: 5, active: true, shortName: "Aegis Field", rank: 2 },
      { name: "Block Chance Enhancement (+30/kademe)", unlockAt: 20, cap: 10 },
      { name: "HP Per Kill Enhancement (+3/kademe)", unlockAt: 20, cap: 10 },

      { name: "Physical Damage Enhancement (+150%/kademe)", unlockAt: 30, cap: 10 },
      { name: "Sacred Blade (aktif)", unlockAt: 30, cap: 5, active: true, shortName: "Sacred Blade", rank: 4 },
      { name: "Health Enhancement (MaxHp +50/kademe)", unlockAt: 30, cap: 10 },

      { name: "Unyielding Will (aktif, ölmek üzereyken dirilme)", unlockAt: 40, cap: 5, active: true, shortName: "Unyielding Will", rank: 3 },
      { name: "Cooldown Reduction (+20/kademe)", unlockAt: 40, cap: 10 },
      { name: "HP Regen Enhancement (+100/kademe)", unlockAt: 40, cap: 10 },

      { name: "Block Chance Enhancement (+30/kademe)", unlockAt: 50, cap: 10 },
      { name: "HP Per Kill Enhancement (+5/kademe)", unlockAt: 50, cap: 10 },

      { name: "All Elemental Resistance Enhancement (+30/kademe)", unlockAt: 60, cap: 10 },
      { name: "Attack Speed Enhancement (+40/kademe)", unlockAt: 60, cap: 10 },

      { name: "Damage Reduction Enhancement (+20/kademe)", unlockAt: 70, cap: 10 },
      { name: "Attack Damage Enhancement (+1/kademe)", unlockAt: 70, cap: 10 },

      { name: "Genel pasif (dağıtılmamış puan)", cap: Infinity },
    ],
  },

  Priest: {
    tier: "S",
    role: "Heal / Destek · Ücretsiz DLC",
    note: "Resmi tier list'te S sınıfı — 'Japon topluluğunda neredeyse OP' deniyor. Sanctuary (Sv.20) alan içi sürekli iyileşme sağlıyor ve bazı zorlu bölümleri anlamsızlaştırabiliyor.",
    nodes: [
      { name: "Heal (aktif)", cap: 5, active: true, shortName: "Heal", rank: 3 },
      { name: "Blessing Of Might (aktif, parti hasar buff'ı)", cap: 5, active: true, shortName: "Blessing Of Might", rank: 1 },
      { name: "Health Enhancement (MaxHp +15/kademe)", cap: 8 },
      { name: "Attack Damage Enhancement (+1/kademe)", cap: 3 },

      { name: "Armor Enhancement (+10/kademe)", unlockAt: 10, cap: 8 },
      { name: "Damage Absorption Enhancement (+5/kademe)", unlockAt: 10, cap: 3 },
      { name: "Wrath of Heaven (aktif)", unlockAt: 10, cap: 5, active: true, shortName: "Wrath of Heaven", rank: 6 },

      { name: "Sanctuary (aktif, alan içi sürekli heal)", unlockAt: 20, cap: 5, active: true, shortName: "Sanctuary", rank: 2 },
      { name: "Skill Heal Enhancement (+70/kademe)", unlockAt: 20, cap: 10 },
      { name: "Cooldown Reduction (+20/kademe)", unlockAt: 20, cap: 10 },

      { name: "Health Enhancement (MaxHp +15/kademe)", unlockAt: 30, cap: 10 },
      { name: "Damage Absorption Enhancement (+5/kademe)", unlockAt: 30, cap: 10 },
      { name: "Blessing of Warding (aktif, elemental direnç buff'ı)", unlockAt: 30, cap: 5, active: true, shortName: "Blessing of Warding", rank: 5 },

      { name: "Resurrection (aktif, düşen üyeyi diriltme)", unlockAt: 40, cap: 5, active: true, shortName: "Resurrection", rank: 4 },
      { name: "Cast Speed Enhancement (+70/kademe)", unlockAt: 40, cap: 10 },
      { name: "Block Chance Enhancement (+30/kademe)", unlockAt: 40, cap: 10 },

      { name: "All Elemental Resistance Enhancement (+20/kademe)", unlockAt: 50, cap: 10 },
      { name: "Physical Damage Enhancement (+150%/kademe)", unlockAt: 50, cap: 10 },

      { name: "Armor Enhancement (+50/kademe)", unlockAt: 60, cap: 10 },
      { name: "Cooldown Reduction (+20/kademe)", unlockAt: 60, cap: 10 },

      { name: "Cast Speed Enhancement (+70/kademe)", unlockAt: 70, cap: 10 },
      { name: "Area of Effect Enhancement (+30/kademe)", unlockAt: 70, cap: 10 },

      { name: "Genel pasif (dağıtılmamış puan)", cap: Infinity },
    ],
  },

  Ranger: {
    tier: "B",
    role: "Menzilli Fiziksel DPS · Ücretsiz",
    note: "Resmi tier list'te B — topluluk oylamasında en popüler kahraman olsa da (1219 oyda %29,9) ham güç sıralaması bunu yansıtmıyor. Rapid Fire tek hedefe yığılan versiyon olduğu için Scatter Shot'tan (dağıtan versiyon) önce önerilir.",
    nodes: [
      { name: "Attack Damage Enhancement (+1/kademe)", cap: 3 },
      { name: "Rapid Fire (aktif, tek hedef)", cap: 5, active: true, shortName: "Rapid Fire", rank: 2 },
      { name: "Scatter Shot (aktif, çoklu hedef)", cap: 5, active: true, shortName: "Scatter Shot", rank: 5 },
      { name: "Attack Speed Enhancement (+40/kademe)", cap: 8 },

      { name: "Arrow Rain (aktif)", unlockAt: 10, cap: 5, active: true, shortName: "Arrow Rain", rank: 1 },
      { name: "Critical Chance Enhancement (+200/kademe)", unlockAt: 10, cap: 8 },
      { name: "Critical Damage Enhancement (+130/kademe)", unlockAt: 10, cap: 3 },

      { name: "Projectile Damage Enhancement (+150%/kademe)", unlockAt: 20, cap: 10 },
      { name: "Swift Surge (aktif, hız artışı)", unlockAt: 20, cap: 5, active: true, shortName: "Swift Surge", rank: 6 },
      { name: "Dodge Chance Enhancement (+30/kademe)", unlockAt: 20, cap: 10 },

      { name: "Piercing Arrow (aktif, çoklu hedefe alternatif)", unlockAt: 30, cap: 5, active: true, shortName: "Piercing Arrow", rank: 4 },
      { name: "Attack Speed Enhancement (+50/kademe)", unlockAt: 30, cap: 10 },
      { name: "Dodge Chance Enhancement (+30/kademe)", unlockAt: 30, cap: 10 },

      { name: "Skewer Shot (aktif, biriken ok = kanama)", unlockAt: 40, cap: 5, active: true, shortName: "Skewer Shot", rank: 3 },
      { name: "Elemental Dodge Chance Enhancement (+30/kademe)", unlockAt: 40, cap: 10 },
      { name: "Movement Speed Enhancement (+20/kademe)", unlockAt: 40, cap: 10 },

      { name: "Life Leech Enhancement (+5/kademe)", unlockAt: 50, cap: 10 },
      { name: "Dodge Chance Enhancement (+30/kademe)", unlockAt: 50, cap: 10 },

      { name: "Projectile Damage Enhancement (+150%/kademe)", unlockAt: 60, cap: 10 },
      { name: "Area of Effect Damage Enhancement (+150%/kademe)", unlockAt: 60, cap: 10 },

      { name: "Attack Speed Enhancement (+60/kademe)", unlockAt: 70, cap: 10 },
      { name: "Dodge Chance Enhancement (+30/kademe)", unlockAt: 70, cap: 10 },

      { name: "Genel pasif (dağıtılmamış puan)", cap: Infinity },
    ],
  },

  Sorcerer: {
    tier: "A",
    role: "AoE Elemental Büyücü · Ücretsiz",
    note: "Resmi tier list'te A. Fireball erken oyunu taşıyor; Meteor Strike (Sv.40) açılınca öncelikli cast olmalı. Fire Damage Enhancement'ı Flame Hydra'dan önce yükseltmek her iki ateş büyüsünü de güçlendiriyor.",
    nodes: [
      { name: "Fireball (aktif)", cap: 5, active: true, shortName: "Fireball", rank: 3 },
      { name: "Attack Damage Enhancement (+2/kademe)", cap: 3 },
      { name: "Ice Orb (aktif)", cap: 5, active: true, shortName: "Ice Orb", rank: 4 },
      { name: "Cooldown Reduction (+10/kademe)", cap: 8 },

      { name: "Area of Effect Enhancement (+30/kademe)", unlockAt: 10, cap: 8 },
      { name: "Lightning (aktif)", unlockAt: 10, cap: 5, active: true, shortName: "Lightning", rank: 6 },
      { name: "Critical Chance Enhancement (+200/kademe)", unlockAt: 10, cap: 3 },

      { name: "Fire Damage Enhancement (+100%/kademe)", unlockAt: 20, cap: 10 },
      { name: "Flame Hydra (aktif)", unlockAt: 20, cap: 5, active: true, shortName: "Flame Hydra", rank: 2 },
      { name: "Cold Damage Enhancement (+100%/kademe)", unlockAt: 20, cap: 10 },

      { name: "Health Enhancement (MaxHp +10/kademe)", unlockAt: 30, cap: 10 },
      { name: "Snowstorm (aktif)", unlockAt: 30, cap: 5, active: true, shortName: "Snowstorm", rank: 5 },
      { name: "Lightning Damage Enhancement (+100%/kademe)", unlockAt: 30, cap: 10 },

      { name: "Meteor Strike (aktif, ana AoE — açılınca öncelik)", unlockAt: 40, cap: 5, active: true, shortName: "Meteor Strike", rank: 1 },
      { name: "Cooldown Reduction (+20/kademe)", unlockAt: 40, cap: 10 },
      { name: "Attack Damage Enhancement (+2/kademe)", unlockAt: 40, cap: 10 },

      { name: "Critical Damage Enhancement (+200/kademe)", unlockAt: 50, cap: 10 },
      { name: "Cast Speed Enhancement (+70/kademe)", unlockAt: 50, cap: 10 },

      { name: "Area of Effect Enhancement (+30/kademe)", unlockAt: 60, cap: 10 },
      { name: "All Elemental Resistance Enhancement (+20/kademe)", unlockAt: 60, cap: 10 },

      { name: "Critical Chance Enhancement (+3/kademe)", unlockAt: 70, cap: 10 },
      { name: "Cooldown Reduction (+20/kademe)", unlockAt: 70, cap: 10 },

      { name: "Genel pasif (dağıtılmamış puan)", cap: Infinity },
    ],
  },

  Hunter: {
    tier: "S",
    role: "Elemental Menzilli DPS / Tuzakçı · Ücretli DLC",
    note: "Resmi tier list'te S. Frost Bolt boss dondurma için en güvenilir araç olduğundan Explosive Bolt'tan önce önerilir; erken ATK/Crit yatırımı sonraki tüm hasarı çarpıyor.",
    nodes: [
      { name: "Attack Damage Enhancement (+2/kademe)", cap: 3 },
      { name: "Critical Chance Enhancement (+200/kademe)", cap: 8 },
      { name: "Frost Bolt (aktif, donma)", cap: 5, active: true, shortName: "Frost Bolt", rank: 1 },
      { name: "Explosive Bolt (aktif, alan hasarı)", cap: 5, active: true, shortName: "Explosive Bolt", rank: 2 },

      { name: "Critical Damage Enhancement (+100/kademe)", unlockAt: 10, cap: 8 },
      { name: "Quick Loader (aktif, atış hızı)", unlockAt: 10, cap: 5, active: true, shortName: "Quick Loader", rank: 6 },
      { name: "Dodge Chance Enhancement (+30/kademe)", unlockAt: 10, cap: 3 },

      { name: "Cold Damage Enhancement (+150%/kademe)", unlockAt: 20, cap: 10 },
      { name: "Fire Damage Enhancement (+150%/kademe)", unlockAt: 20, cap: 10 },
      { name: "Charge Trap (aktif)", unlockAt: 20, cap: 5, active: true, shortName: "Charge Trap", rank: 5 },

      { name: "Crossbow Turret (aktif, ek DPS)", unlockAt: 30, cap: 5, active: true, shortName: "Crossbow Turret", rank: 3 },
      { name: "Cooldown Reduction (+10/kademe)", unlockAt: 30, cap: 10 },
      { name: "Health Enhancement (MaxHp +15/kademe)", unlockAt: 30, cap: 10 },

      { name: "Critical Chance Enhancement (+3/kademe)", unlockAt: 40, cap: 10 },
      { name: "Physical Damage Enhancement (+150%/kademe)", unlockAt: 40, cap: 10 },
      { name: "Shock Bolt (aktif)", unlockAt: 40, cap: 5, active: true, shortName: "Shock Bolt", rank: 4 },

      { name: "Attack Damage Enhancement (+3/kademe)", unlockAt: 50, cap: 10 },
      { name: "Area of Effect Enhancement (+30/kademe)", unlockAt: 50, cap: 10 },

      { name: "Critical Damage Enhancement (+150/kademe)", unlockAt: 60, cap: 10 },
      { name: "Lightning Damage Enhancement (+150%/kademe)", unlockAt: 60, cap: 10 },

      { name: "Attack Speed Enhancement (+40/kademe)", unlockAt: 70, cap: 10 },
      { name: "HP Per Hit Enhancement (+3/kademe)", unlockAt: 70, cap: 10 },

      { name: "Genel pasif (dağıtılmamış puan)", cap: Infinity },
    ],
  },

  Slayer: {
    tier: "A",
    role: "Melee Bruiser / Lifesteal · Ücretli DLC",
    note: "Resmi tier list'te A. Axe Spin'in kanama etkisi Crushing Blow'dan genelde daha güçlü; Commander's Cry (Sv.10) tüm partinin crit şansını artırdığı için erken alınmaya değer.",
    nodes: [
      { name: "Attack Damage Enhancement (+2/kademe)", cap: 3 },
      { name: "Slam Jump (aktif)", cap: 5, active: true, shortName: "Slam Jump", rank: 4 },
      { name: "Health Enhancement (MaxHp +15/kademe)", cap: 8 },
      { name: "Crushing Blow (aktif)", cap: 5, active: true, shortName: "Crushing Blow", rank: 6 },

      { name: "Commander's Cry (aktif, parti crit buff'ı)", unlockAt: 10, cap: 5, active: true, shortName: "Commander's Cry", rank: 2 },
      { name: "HP Per Kill Enhancement (+5/kademe)", unlockAt: 10, cap: 3 },
      { name: "Area of Effect Enhancement (+30/kademe)", unlockAt: 10, cap: 8 },

      { name: "Physical Damage Enhancement (+150%/kademe)", unlockAt: 20, cap: 10 },
      { name: "Life Leech Enhancement (+5/kademe)", unlockAt: 20, cap: 10 },
      { name: "Ground Slam (aktif)", unlockAt: 20, cap: 5, active: true, shortName: "Ground Slam", rank: 5 },

      { name: "Axe Spin (aktif, kanama)", unlockAt: 30, cap: 5, active: true, shortName: "Axe Spin", rank: 1 },
      { name: "Attack Damage Enhancement (+2/kademe)", unlockAt: 30, cap: 10 },
      { name: "Health Enhancement (MaxHp +15/kademe)", unlockAt: 30, cap: 10 },

      { name: "Physical Damage Enhancement (+150%/kademe)", unlockAt: 40, cap: 10 },
      { name: "Bloodlust (aktif, canı yakıp hasarı artırma)", unlockAt: 40, cap: 5, active: true, shortName: "Bloodlust", rank: 3 },
      { name: "Critical Damage Enhancement (+100/kademe)", unlockAt: 40, cap: 10 },

      { name: "Area of Effect Damage Enhancement (+150%/kademe)", unlockAt: 50, cap: 10 },
      { name: "Area of Effect Enhancement (+30/kademe)", unlockAt: 50, cap: 10 },

      { name: "Health Enhancement (MaxHp +20/kademe)", unlockAt: 60, cap: 10 },
      { name: "Movement Speed Enhancement (+20/kademe)", unlockAt: 60, cap: 10 },

      { name: "Area of Effect Damage Enhancement (+150%/kademe)", unlockAt: 70, cap: 10 },
      { name: "Duration Enhancement (+80/kademe)", unlockAt: 70, cap: 10 },

      { name: "Genel pasif (dağıtılmamış puan)", cap: Infinity },
    ],
  },
};

/**
 * Simulates spending 1 skill point per level (1..level) using the class's
 * node priority list: each point goes to the highest-priority node that
 * still has room and whose unlockAt gate (if any) has been reached.
 *
 * @param {string} className
 * @param {number} level
 * @returns {{point:number, skill:string}[]}
 */
export function buildSkillPlan(className, level) {
  const plan = SKILL_PLANS[className];
  const totalPoints = Math.max(0, Math.floor(level) || 0);
  if (!plan || totalPoints === 0) return [];

  const spent = new Map(plan.nodes.map((n) => [n.name, 0]));
  const result = [];

  for (let point = 1; point <= totalPoints; point++) {
    const node = plan.nodes.find(
      (n) => spent.get(n.name) < n.cap && point >= (n.unlockAt ?? 1)
    );
    if (!node) continue; // shouldn't happen: last node always has cap Infinity and no gate
    spent.set(node.name, spent.get(node.name) + 1);
    result.push({ point, skill: node.name });
  }
  return result;
}

/** Collapses a point-by-point plan into contiguous ranges for display. */
export function groupSkillPlan(plan) {
  const groups = [];
  for (const { point, skill } of plan) {
    const last = groups[groups.length - 1];
    if (last && last.skill === skill && last.to === point - 1) {
      last.to = point;
    } else {
      groups.push({ from: point, to: point, skill });
    }
  }
  return groups;
}

// Only a small, fixed number of active skills can be equipped/used at once
// (confirmed in-game — not from taskbarhero.org, which doesn't publish this).
// Since a class unlocks up to 6 actives total but only ACTIVE_SLOTS fit,
// which 2 to run changes as new actives unlock. The `rank` on each active
// node (1 = best) is our own priority call — same caveat as the tier
// ordering above: informed by community write-ups where they exist (e.g.
// Sorcerer's Meteor Strike + Flame Hydra endgame pair), a judgment call
// where they don't (e.g. Lightning/Snowstorm have no sourced guidance and
// are ranked low by default, not confirmed weak).
export const ACTIVE_SLOTS = 2;

/**
 * Builds the recommended N-active loadout at every unlock breakpoint up to
 * `level`, merging consecutive breakpoints that yield the same loadout.
 *
 * @param {string} className
 * @param {number} level
 * @param {number} slots
 * @returns {{from:number, to:number, skills:string[]}[]}
 */
export function buildActiveLoadoutPlan(className, level, slots = ACTIVE_SLOTS) {
  const plan = SKILL_PLANS[className];
  const totalLevel = Math.max(0, Math.floor(level) || 0);
  if (!plan) return [];

  const actives = plan.nodes.filter((n) => n.active);
  const boundaries = [...new Set(actives.map((a) => a.unlockAt ?? 0))]
    .filter((b) => b <= totalLevel)
    .sort((a, b) => a - b);
  if (boundaries.length === 0) return [];

  const segments = [];
  for (let i = 0; i < boundaries.length; i++) {
    const from = boundaries[i];
    const to = i + 1 < boundaries.length ? boundaries[i + 1] - 1 : totalLevel;
    const unlocked = actives.filter((a) => (a.unlockAt ?? 0) <= from);
    const loadout = [...unlocked].sort((a, b) => a.rank - b.rank).slice(0, slots);
    const key = loadout.map((a) => a.shortName).sort().join("|");

    const last = segments[segments.length - 1];
    if (last && last.key === key) {
      last.to = to;
    } else {
      segments.push({ from, to, key, skills: loadout.map((a) => a.shortName) });
    }
  }
  return segments;
}
