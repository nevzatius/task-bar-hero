// Skill point priority guide.
//
// Node names, unlock levels, and max ranks are real datamined values from
// taskbarhero.org's per-hero "Full skill tree" tables (source: game's own
// skill definitions, not a fan guess). Every hero follows the same shape:
// a tier unlocks every 10 levels (0/10/20/30/40/50/60/70), each tier has 2
// passive nodes, and tiers 0-40 additionally unlock one active skill each
// (tier 0 unlocks two, giving 6 active skills total by level 40).
//
// Community wikis describe the tier gates as "unlocked after N points
// spent" (10/20/…/70), which matches the `point >= unlockAt` model in
// buildSkillPlan below. Still NOT confirmed by any source: the exact
// skill-point income rate per hero level (so "point N" below assumes
// 1 point per level — plausible but unverified). Respec is free (Steam
// "Task Bar Hero 101" guide), so mid-plan inefficiencies only cost a
// visit to the skill screen.
//
// Ordering within a tier: where community guides agree (Destructoid's six
// per-class build guides, GamesRadar, Pro Game Guides, games.gg, goboost's
// Ranger 1-70 leveling guide, Steam discussions — July 2026) the order
// follows that consensus, tuned for farm/grind efficiency (fast wave
// clears) rather than boss pushing. Where no source speaks it remains an
// editorial judgment call — a reasonable default, not a proven optimum.
// Actives that never enter the equipped loadout (see `rank` below) are
// parked near the bottom of each list so points flow into useful passives
// first.

export const SKILL_PLANS = {
  Knight: {
    tier: "S",
    role: "Tank / Hibrit DPS · Ücretsiz",
    note: "Resmi tier list'te S sınıfı: üç rolü (tank, hasar, kalkan) birden karşılıyor. Topluluk konsensüsü (Destructoid, games.gg, Pro Game Guides) kalıcı çiftte net: Aegis Field tüm partiyi kalkanlarken Sacred Blade'in kill başına HP'si kendi kendini döndüren tank döngüsü kuruyor. Sv.30'a kadar ikinci slot Piercing Thrust / Retribution Strike ile doldurulur.",
    nodes: [
      // Kalıcı çift en üstte: unlockAt kapıları sayesinde puan alamazlar
      // ama kilit açılır açılmaz 5/5'e çıkarlar.
      { name: "Aegis Field (aktif, kalkan)", unlockAt: 20, cap: 5, active: true, shortName: "Aegis Field", rank: 1 },
      { name: "Sacred Blade (aktif, kill başına HP)", unlockAt: 30, cap: 5, active: true, shortName: "Sacred Blade", rank: 2 },

      { name: "Health Enhancement (MaxHp +15/kademe)", cap: 8 },
      { name: "Piercing Thrust (aktif)", cap: 5, active: true, shortName: "Piercing Thrust", rank: 3 },
      { name: "Shield Charge (aktif)", cap: 5, active: true, shortName: "Shield Charge", rank: 6 },
      { name: "Attack Damage Enhancement (+1/kademe)", cap: 3 },

      { name: "Armor Enhancement (+10/kademe)", unlockAt: 10, cap: 8 },
      { name: "Retribution Strike (aktif)", unlockAt: 10, cap: 5, active: true, shortName: "Retribution Strike", rank: 4 },
      { name: "HP Regen Enhancement (+100/kademe)", unlockAt: 10, cap: 5 },

      { name: "Block Chance Enhancement (+30/kademe)", unlockAt: 20, cap: 10 },
      { name: "HP Per Kill Enhancement (+3/kademe)", unlockAt: 20, cap: 10 },

      { name: "Physical Damage Enhancement (+150%/kademe)", unlockAt: 30, cap: 10 },
      { name: "Health Enhancement (MaxHp +50/kademe)", unlockAt: 30, cap: 10 },

      { name: "Cooldown Reduction (+20/kademe)", unlockAt: 40, cap: 10 },
      { name: "HP Regen Enhancement (+100/kademe)", unlockAt: 40, cap: 10 },
      // Loadout'a girmiyor (Aegis+Sacred Blade sabit) — puanı en sona.
      { name: "Unyielding Will (aktif, ölmek üzereyken dirilme)", unlockAt: 40, cap: 5, active: true, shortName: "Unyielding Will", rank: 5 },

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
    note: "Resmi tier list'te S sınıfı — 'Japon topluluğunda neredeyse OP' deniyor. Meta healer kurulumu (Pro Game Guides): Blessing of Might + Sanctuary, ağır Cooldown Reduction yatırımıyla — CDR hem healleri hem buff uptime'ını beslediği için pasiflerde önce gelir (Destructoid'de 1 numaralı pasif). Alternatif: sürekli tek hedef iyileşme isteyenler Sanctuary yerine Heal koyabilir (commonsensegamer bunu 'en güvenilir' kurulum sayıyor).",
    nodes: [
      // Sanctuary en üstte: Sv.20'de kilit açılır açılmaz 5/5'e çıkar.
      { name: "Sanctuary (aktif, alan içi sürekli heal)", unlockAt: 20, cap: 5, active: true, shortName: "Sanctuary", rank: 2 },

      { name: "Heal (aktif)", cap: 5, active: true, shortName: "Heal", rank: 3 },
      { name: "Blessing Of Might (aktif, parti hasar buff'ı)", cap: 5, active: true, shortName: "Blessing Of Might", rank: 1 },
      { name: "Health Enhancement (MaxHp +15/kademe)", cap: 8 },
      { name: "Attack Damage Enhancement (+1/kademe)", cap: 3 },

      { name: "Armor Enhancement (+10/kademe)", unlockAt: 10, cap: 8 },
      { name: "Damage Absorption Enhancement (+5/kademe)", unlockAt: 10, cap: 3 },
      { name: "Wrath of Heaven (aktif)", unlockAt: 10, cap: 5, active: true, shortName: "Wrath of Heaven", rank: 6 },

      { name: "Cooldown Reduction (+20/kademe)", unlockAt: 20, cap: 10 },
      { name: "Skill Heal Enhancement (+70/kademe)", unlockAt: 20, cap: 10 },

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
    note: "Resmi tier list'te B — topluluk oylamasında en popüler kahraman olsa da (1219 oyda %29,9) ham güç sıralaması bunu yansıtmıyor. Farm konsensüsü (goboost 1-70 rehberi, GamesRadar, allthings.how): Rapid Fire saldırı hızıyla ölçeklenip neredeyse kesintisiz ok akışı verdiği için ana kaynak, Arrow Rain sürü temizliği için yanına. Boss/Nightmare push'unda alternatif: Sv.31+ zırh delen Piercing Arrow ya da Swift Surge + Skewer Shot kanama kombosu.",
    nodes: [
      { name: "Attack Damage Enhancement (+1/kademe)", cap: 3 },
      { name: "Rapid Fire (aktif, tek hedef)", cap: 5, active: true, shortName: "Rapid Fire", rank: 1 },
      // Attack Speed'den önce: Sv.10'da kilit açılır açılmaz 5/5'e çıksın.
      { name: "Arrow Rain (aktif)", unlockAt: 10, cap: 5, active: true, shortName: "Arrow Rain", rank: 2 },
      { name: "Attack Speed Enhancement (+40/kademe)", cap: 8 },

      { name: "Critical Chance Enhancement (+200/kademe)", unlockAt: 10, cap: 8 },
      { name: "Critical Damage Enhancement (+130/kademe)", unlockAt: 10, cap: 3 },

      { name: "Projectile Damage Enhancement (+150%/kademe)", unlockAt: 20, cap: 10 },
      { name: "Dodge Chance Enhancement (+30/kademe)", unlockAt: 20, cap: 10 },

      { name: "Attack Speed Enhancement (+50/kademe)", unlockAt: 30, cap: 10 },
      { name: "Dodge Chance Enhancement (+30/kademe)", unlockAt: 30, cap: 10 },

      { name: "Elemental Dodge Chance Enhancement (+30/kademe)", unlockAt: 40, cap: 10 },
      { name: "Movement Speed Enhancement (+20/kademe)", unlockAt: 40, cap: 10 },

      { name: "Life Leech Enhancement (+5/kademe)", unlockAt: 50, cap: 10 },
      { name: "Dodge Chance Enhancement (+30/kademe)", unlockAt: 50, cap: 10 },

      { name: "Projectile Damage Enhancement (+150%/kademe)", unlockAt: 60, cap: 10 },
      { name: "Area of Effect Damage Enhancement (+150%/kademe)", unlockAt: 60, cap: 10 },

      { name: "Attack Speed Enhancement (+60/kademe)", unlockAt: 70, cap: 10 },
      { name: "Dodge Chance Enhancement (+30/kademe)", unlockAt: 70, cap: 10 },

      // Farm loadout'una girmeyen aktifler (Scatter Sv.10'da Arrow Rain
      // gelince bench'e iniyor) — puanları önce pasiflere aksın.
      { name: "Scatter Shot (aktif, çoklu hedef)", cap: 5, active: true, shortName: "Scatter Shot", rank: 5 },
      { name: "Piercing Arrow (aktif, zırh delen — boss alternatifi)", unlockAt: 30, cap: 5, active: true, shortName: "Piercing Arrow", rank: 4 },
      { name: "Skewer Shot (aktif, biriken ok = kanama)", unlockAt: 40, cap: 5, active: true, shortName: "Skewer Shot", rank: 3 },
      { name: "Swift Surge (aktif, hız artışı)", unlockAt: 20, cap: 5, active: true, shortName: "Swift Surge", rank: 6 },

      { name: "Genel pasif (dağıtılmamış puan)", cap: Infinity },
    ],
  },

  Sorcerer: {
    tier: "A",
    role: "AoE Elemental Büyücü · Ücretsiz",
    note: "Resmi tier list'te A. Ateş yolu konsensüsü (GamesRadar, Destructoid, Steam topluluğu): Fireball erken oyunu taşıyor, Flame Hydra Sv.20'de sürekli-alan hasarıyla yanına geliyor, Meteor Strike (Sv.40, %550 AoE) açılınca birinci slot. Flame Hydra kilit açılır açılmaz 5/5'e çıkarılır (Steam topluluğu ancak 5/5 kullanmayı öneriyor), hemen ardından Fire Damage her iki ateş büyüsünü birden büyütür. Cooldown Reduction %75'te cap'leniyor (Steam topluluğu).",
    nodes: [
      // Kalıcı çift en üstte: kilit açılır açılmaz 5/5'e çıkarlar (Steam
      // topluluğu Hydra'yı ancak 5/5 kullanmayı öneriyor).
      { name: "Meteor Strike (aktif, ana AoE — açılınca öncelik)", unlockAt: 40, cap: 5, active: true, shortName: "Meteor Strike", rank: 1 },
      { name: "Flame Hydra (aktif)", unlockAt: 20, cap: 5, active: true, shortName: "Flame Hydra", rank: 2 },

      { name: "Fireball (aktif)", cap: 5, active: true, shortName: "Fireball", rank: 3 },
      { name: "Attack Damage Enhancement (+2/kademe)", cap: 3 },
      { name: "Ice Orb (aktif)", cap: 5, active: true, shortName: "Ice Orb", rank: 4 },
      { name: "Cooldown Reduction (+10/kademe)", cap: 8 },

      { name: "Area of Effect Enhancement (+30/kademe)", unlockAt: 10, cap: 8 },
      { name: "Critical Chance Enhancement (+200/kademe)", unlockAt: 10, cap: 3 },

      { name: "Fire Damage Enhancement (+100%/kademe)", unlockAt: 20, cap: 10 },

      { name: "Health Enhancement (MaxHp +10/kademe)", unlockAt: 30, cap: 10 },

      { name: "Cooldown Reduction (+20/kademe)", unlockAt: 40, cap: 10 },
      { name: "Attack Damage Enhancement (+2/kademe)", unlockAt: 40, cap: 10 },

      { name: "Critical Damage Enhancement (+200/kademe)", unlockAt: 50, cap: 10 },
      { name: "Cast Speed Enhancement (+70/kademe)", unlockAt: 50, cap: 10 },

      { name: "Area of Effect Enhancement (+30/kademe)", unlockAt: 60, cap: 10 },
      { name: "All Elemental Resistance Enhancement (+20/kademe)", unlockAt: 60, cap: 10 },

      { name: "Critical Chance Enhancement (+3/kademe)", unlockAt: 70, cap: 10 },
      { name: "Cooldown Reduction (+20/kademe)", unlockAt: 70, cap: 10 },

      // Ateş yolunun dışında kalanlar: Ice Orb tam Sv.20'de bench'e indiği
      // için Cold Damage'a erken puan saf israftı; Lightning ve Snowstorm
      // loadout'a hiç girmiyor — hepsi en sona.
      { name: "Cold Damage Enhancement (+100%/kademe)", unlockAt: 20, cap: 10 },
      { name: "Lightning Damage Enhancement (+100%/kademe)", unlockAt: 30, cap: 10 },
      { name: "Lightning (aktif)", unlockAt: 10, cap: 5, active: true, shortName: "Lightning", rank: 6 },
      { name: "Snowstorm (aktif)", unlockAt: 30, cap: 5, active: true, shortName: "Snowstorm", rank: 5 },

      { name: "Genel pasif (dağıtılmamış puan)", cap: Infinity },
    ],
  },

  Hunter: {
    tier: "S",
    role: "Elemental Menzilli DPS / Tuzakçı · Ücretli DLC",
    note: "Resmi tier list'te S. Tüm kaynaklar aynı çifti öneriyor (Destructoid, allthings.how): Frost Bolt (%255 alan hasarı + dondurma) ve Explosive Bolt zincirlemesi. Diğer dört aktif loadout'a hiç girmediği için puanları pasiflere kaydırıldı — erken ATK/Crit yatırımı sonraki tüm hasarı çarpıyor, Cold+Fire Damage iki bolt'u birden besliyor.",
    nodes: [
      { name: "Attack Damage Enhancement (+2/kademe)", cap: 3 },
      { name: "Critical Chance Enhancement (+200/kademe)", cap: 8 },
      { name: "Frost Bolt (aktif, donma)", cap: 5, active: true, shortName: "Frost Bolt", rank: 1 },
      { name: "Explosive Bolt (aktif, alan hasarı)", cap: 5, active: true, shortName: "Explosive Bolt", rank: 2 },

      { name: "Critical Damage Enhancement (+100/kademe)", unlockAt: 10, cap: 8 },
      { name: "Dodge Chance Enhancement (+30/kademe)", unlockAt: 10, cap: 3 },

      { name: "Cold Damage Enhancement (+150%/kademe)", unlockAt: 20, cap: 10 },
      { name: "Fire Damage Enhancement (+150%/kademe)", unlockAt: 20, cap: 10 },

      { name: "Cooldown Reduction (+10/kademe)", unlockAt: 30, cap: 10 },
      { name: "Health Enhancement (MaxHp +15/kademe)", unlockAt: 30, cap: 10 },

      { name: "Critical Chance Enhancement (+3/kademe)", unlockAt: 40, cap: 10 },
      { name: "Physical Damage Enhancement (+150%/kademe)", unlockAt: 40, cap: 10 },

      { name: "Attack Damage Enhancement (+3/kademe)", unlockAt: 50, cap: 10 },
      { name: "Area of Effect Enhancement (+30/kademe)", unlockAt: 50, cap: 10 },

      { name: "Critical Damage Enhancement (+150/kademe)", unlockAt: 60, cap: 10 },
      { name: "Lightning Damage Enhancement (+150%/kademe)", unlockAt: 60, cap: 10 },

      { name: "Attack Speed Enhancement (+40/kademe)", unlockAt: 70, cap: 10 },
      { name: "HP Per Hit Enhancement (+3/kademe)", unlockAt: 70, cap: 10 },

      // Frost+Explosive çifti hiç değişmediği için bu dört aktife giden
      // 20 puan israftı — en sona alındı.
      { name: "Quick Loader (aktif, atış hızı)", unlockAt: 10, cap: 5, active: true, shortName: "Quick Loader", rank: 6 },
      { name: "Charge Trap (aktif)", unlockAt: 20, cap: 5, active: true, shortName: "Charge Trap", rank: 5 },
      { name: "Crossbow Turret (aktif, ek DPS)", unlockAt: 30, cap: 5, active: true, shortName: "Crossbow Turret", rank: 3 },
      { name: "Shock Bolt (aktif)", unlockAt: 40, cap: 5, active: true, shortName: "Shock Bolt", rank: 4 },

      { name: "Genel pasif (dağıtılmamış puan)", cap: Infinity },
    ],
  },

  Slayer: {
    tier: "A",
    role: "Melee Bruiser / Lifesteal · Ücretli DLC",
    note: "Resmi tier list'te A. Topluluk konsensüsü (Destructoid, games.gg): kalıcı çift Axe Spin + Crushing Blow — Axe Spin'in kanama etkisi hedefin aldığı TÜM hasarı artırıyor (partideki herkes kazanıyor), Crushing Blow ise hedef ölünce şok dalgasıyla sürü temizliğine dönüşüyor. Commander's Cry yalnızca Sv.10-29 arası ara dönem dolgusu; Bloodlust burst alternatifi olarak kalıyor.",
    nodes: [
      // Axe Spin en üstte: Sv.30'da kilit açılır açılmaz 5/5'e çıkar.
      { name: "Axe Spin (aktif, kanama)", unlockAt: 30, cap: 5, active: true, shortName: "Axe Spin", rank: 1 },

      { name: "Attack Damage Enhancement (+2/kademe)", cap: 3 },
      { name: "Crushing Blow (aktif)", cap: 5, active: true, shortName: "Crushing Blow", rank: 2 },
      { name: "Health Enhancement (MaxHp +15/kademe)", cap: 8 },
      { name: "Slam Jump (aktif)", cap: 5, active: true, shortName: "Slam Jump", rank: 6 },

      { name: "Commander's Cry (aktif, parti crit buff'ı)", unlockAt: 10, cap: 5, active: true, shortName: "Commander's Cry", rank: 4 },
      { name: "HP Per Kill Enhancement (+5/kademe)", unlockAt: 10, cap: 3 },
      { name: "Area of Effect Enhancement (+30/kademe)", unlockAt: 10, cap: 8 },

      { name: "Physical Damage Enhancement (+150%/kademe)", unlockAt: 20, cap: 10 },
      { name: "Life Leech Enhancement (+5/kademe)", unlockAt: 20, cap: 10 },

      { name: "Attack Damage Enhancement (+2/kademe)", unlockAt: 30, cap: 10 },
      { name: "Health Enhancement (MaxHp +15/kademe)", unlockAt: 30, cap: 10 },

      { name: "Physical Damage Enhancement (+150%/kademe)", unlockAt: 40, cap: 10 },
      { name: "Critical Damage Enhancement (+100/kademe)", unlockAt: 40, cap: 10 },
      { name: "Bloodlust (aktif, canı yakıp hasarı artırma)", unlockAt: 40, cap: 5, active: true, shortName: "Bloodlust", rank: 3 },

      { name: "Area of Effect Damage Enhancement (+150%/kademe)", unlockAt: 50, cap: 10 },
      { name: "Area of Effect Enhancement (+30/kademe)", unlockAt: 50, cap: 10 },

      { name: "Health Enhancement (MaxHp +20/kademe)", unlockAt: 60, cap: 10 },
      { name: "Movement Speed Enhancement (+20/kademe)", unlockAt: 60, cap: 10 },

      { name: "Area of Effect Damage Enhancement (+150%/kademe)", unlockAt: 70, cap: 10 },
      { name: "Duration Enhancement (+80/kademe)", unlockAt: 70, cap: 10 },

      // Ground Slam kalıcı loadout'a hiç girmiyor — puanı en sona.
      { name: "Ground Slam (aktif)", unlockAt: 20, cap: 5, active: true, shortName: "Ground Slam", rank: 5 },

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
// (confirmed in-game; the Steam "Task Bar Hero 101" guide adds that the
// second slot is bought from the Rune Tree for 50,000 gold — 2 total, and
// respeccing skill points is free). Since a class unlocks up to 6 actives
// but only ACTIVE_SLOTS fit, which 2 to run changes as new actives unlock.
// The `rank` on each active node (1 = best) follows community build guides
// where they exist (Destructoid's per-class guides, GamesRadar, Pro Game
// Guides, games.gg, allthings.how — July 2026: e.g. Knight's Aegis Field +
// Sacred Blade, Slayer's Axe Spin + Crushing Blow, Sorcerer's Meteor
// Strike + Flame Hydra, Hunter's Frost + Explosive Bolt) and stays our own
// judgment call where they don't (the pre-unlock stopgap pairs below level
// 20/30 have no sourced guidance).
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
