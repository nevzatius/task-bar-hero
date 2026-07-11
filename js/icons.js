// Icon rendering: real per-item/hero artwork downloaded from taskbarhero.org
// into assets/icons/ (see tools/download-icons.mjs), framed in a
// grade-colored (rarity) ring. Falls back to a hand-authored inline SVG glyph
// when an item has no icon path or its image fails to load (a handful of
// materials 404 on the source site).

// Values are CSS var() references so the light theme can override them from
// style.css; the hex fallbacks are the original datamined-palette colors.
// Only used in CSS contexts (inline style attributes) where var() resolves.
export const GRADE_COLORS = {
  COMMON: "var(--grade-common, #9ca3af)",
  UNCOMMON: "var(--grade-uncommon, #22c55e)",
  RARE: "var(--grade-rare, #3b82f6)",
  LEGENDARY: "var(--grade-legendary, #a855f7)",
  IMMORTAL: "var(--grade-immortal, #ec4899)",
  ARCANA: "var(--grade-arcana, #f97316)",
  BEYOND: "var(--grade-beyond, #eab308)",
  CELESTIAL: "var(--grade-celestial, #14b8a6)",
  DIVINE: "var(--grade-divine, #e5e7eb)",
  COSMIC: "var(--grade-cosmic, #f472b6)", // base color; COSMIC also gets a prismatic gradient ring (hardcoded stops — var() doesn't work in SVG presentation attributes)
};

export function colorForGrade(grade) {
  return GRADE_COLORS[grade] ?? GRADE_COLORS.COMMON;
}

// Each shape is inner SVG markup (no outer <svg>) drawn in a 0 0 48 48
// viewBox, using currentColor so the wrapper controls the color.
const GEAR_SHAPES = {
  // --- main weapons ---
  SWORD: '<path d="M24 4v28M17 12h14M20 32l4 8 4-8" stroke-linecap="round"/>',
  BOW: '<path d="M16 6c-8 6-8 30 0 36M16 6l20 18-20 18" stroke-linecap="round" stroke-linejoin="round"/>',
  STAFF: '<circle cx="24" cy="10" r="6"/><path d="M24 16v28" stroke-linecap="round"/>',
  SCEPTER: '<path d="M24 44V20" stroke-linecap="round"/><path d="M24 4l7 8-7 8-7-8z"/>',
  CROSSBOW: '<path d="M8 18h32M24 18v10" stroke-linecap="round"/><path d="M14 18c2-8 18-8 20 0" stroke-linecap="round"/><path d="M18 28h12l-2 8h-8z"/>',
  AXE: '<path d="M20 4v40" stroke-linecap="round"/><path d="M20 8c10-6 18 0 18 8s-8 14-18 8" stroke-linejoin="round"/>',
  // --- off-hands ---
  SHIELD: '<path d="M24 4l16 6v14c0 12-8 18-16 20-8-2-16-8-16-20V10z" stroke-linejoin="round"/>',
  ARROW: '<path d="M8 40L36 12" stroke-linecap="round"/><path d="M26 8h10v10" stroke-linejoin="round"/><path d="M8 40l6-2 2-6" stroke-linejoin="round"/>',
  ORB: '<circle cx="24" cy="24" r="16"/><circle cx="24" cy="24" r="7"/>',
  TOME: '<path d="M10 8h14a4 4 0 014 4v28a4 4 0 00-4-4H10z" stroke-linejoin="round"/><path d="M38 8H24a4 4 0 00-4 4v28a4 4 0 014-4h14z" stroke-linejoin="round"/>',
  BOLT: '<path d="M10 38L38 10" stroke-linecap="round"/><path d="M30 6l8 8-6 2-4-4z" stroke-linejoin="round"/>',
  HATCHET: '<path d="M18 8v36" stroke-linecap="round"/><path d="M18 10c8-6 16 0 16 7s-8 10-16 6" stroke-linejoin="round"/>',
  // --- universal armor ---
  HELMET: '<path d="M8 26a16 16 0 0132 0v6H8z" stroke-linejoin="round"/><path d="M16 32v6M32 32v6" stroke-linecap="round"/>',
  ARMOR: '<path d="M16 6l8 4 8-4 8 8-4 6v22H12V20l-4-6z" stroke-linejoin="round"/>',
  GLOVES: '<path d="M14 22V10a3 3 0 016 0v8M20 20V8a3 3 0 016 0v10M26 20V10a3 3 0 016 0v9" stroke-linecap="round"/><path d="M14 22c-4 2-4 8-2 12 3 6 10 8 16 8s10-6 10-14V22" stroke-linejoin="round"/>',
  BOOTS: '<path d="M18 4v20l-9 8c-2 2-2 6 3 6h22c3 0-1-6-4-8l-6-4V4z" stroke-linejoin="round"/>',
  // --- jewelry (no GearType, keyed by parts) ---
  AMULET: '<path d="M16 6l8 8 8-8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="24" cy="30" r="10"/>',
  EARING: '<circle cx="24" cy="14" r="6"/><path d="M24 20v18a6 6 0 0012 0" stroke-linecap="round"/>',
  RING: '<circle cx="24" cy="26" r="14"/><circle cx="24" cy="26" r="8"/><path d="M18 14l6-8 6 8" stroke-linejoin="round"/>',
  BRACER: '<path d="M10 20a14 14 0 0128 0M10 28a14 14 0 0028 0" stroke-linecap="round"/>',
};

const HERO_SHAPES = {
  Knight: GEAR_SHAPES.SHIELD,
  Ranger: GEAR_SHAPES.BOW,
  Sorcerer: '<path d="M10 38h28L24 6z" stroke-linejoin="round"/><circle cx="24" cy="6" r="3"/>',
  Priest: '<path d="M24 6v28M12 16h24" stroke-linecap="round"/><path d="M14 40a10 10 0 0120 0" stroke-linecap="round"/>',
  Hunter: GEAR_SHAPES.CROSSBOW,
  Slayer: '<path d="M12 6v36M36 6v36" stroke-linecap="round"/><path d="M12 10c8-5 14 0 14 6s-6 11-14 7M36 10c-8-5-14 0-14 6s6 11 14 7" stroke-linejoin="round"/>',
};

const DEFAULT_SHAPE = '<circle cx="24" cy="24" r="14"/>';

// Where tools/download-icons.mjs wrote the real artwork, relative to the
// site root (index.html sits next to assets/, so this resolves the same
// whether the page is opened directly or served by tools/serve.mjs).
const ICON_BASE = "assets/icons/";

let gradientIdCounter = 0;

function wrapSvg(innerShape, { size = 40, color = "currentColor", cosmic = false } = {}) {
  const strokeProps = 'fill="none" stroke-width="3"';
  if (!cosmic) {
    return `<svg viewBox="0 0 48 48" width="${size}" height="${size}" style="color:${color}" stroke="currentColor" ${strokeProps}>${innerShape}</svg>`;
  }
  const gid = `cosmic-grad-${gradientIdCounter++}`;
  return `<svg viewBox="0 0 48 48" width="${size}" height="${size}" ${strokeProps}>
    <defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f472b6"/><stop offset="35%" stop-color="#facc15"/>
      <stop offset="65%" stop-color="#38bdf8"/><stop offset="100%" stop-color="#a855f7"/>
    </linearGradient></defs>
    <g stroke="url(#${gid})">${innerShape}</g>
  </svg>`;
}

function iconKeyFor(itemDef) {
  return itemDef?.gearType || itemDef?.parts || "DEFAULT";
}

function gearIconSvg(itemDef, { size = 40 } = {}) {
  const key = iconKeyFor(itemDef);
  const shape = GEAR_SHAPES[key] ?? DEFAULT_SHAPE;
  const grade = itemDef?.grade;
  return wrapSvg(shape, { size, color: colorForGrade(grade), cosmic: grade === "COSMIC" });
}

function heroIconSvg(heroClass, { size = 56 } = {}) {
  const shape = HERO_SHAPES[heroClass] ?? DEFAULT_SHAPE;
  return wrapSvg(shape, { size, color: "var(--accent, #38bdf8)" });
}

/**
 * Renders any item (gear or material) as its real downloaded icon, framed in
 * a grade-colored ring. Falls back to the hand-drawn SVG glyph when the item
 * has no icon path, or if the image 404s (a few materials aren't hosted on
 * the source site).
 * @param {object} itemDef - static item definition (from items.json/materials.json: grade, icon, gearType/parts)
 */
export function itemIconImg(itemDef, { size = 40 } = {}) {
  const color = colorForGrade(itemDef?.grade);
  const inner = itemDef?.icon
    ? `<img src="${ICON_BASE}${itemDef.icon}" width="${size - 6}" height="${size - 6}" alt="" loading="lazy" onerror="this.style.opacity='0'" />`
    : gearIconSvg(itemDef, { size: size - 6 });
  return `<span class="icon-frame" style="width:${size}px;height:${size}px;--grade-color:${color}">${inner}</span>`;
}

/** @param {{heroKey: number, className: string}} hero */
export function heroIconImg(hero, { size = 56 } = {}) {
  if (!hero?.heroKey) return heroIconSvg(hero?.className, { size });
  const img = `<img src="${ICON_BASE}heroes/Hero_${hero.heroKey}.png" width="${size}" height="${size}" alt="" loading="lazy" onerror="this.style.opacity='0'" />`;
  return `<span class="icon-frame hero-icon-frame" style="width:${size}px;height:${size}px">${img}</span>`;
}
