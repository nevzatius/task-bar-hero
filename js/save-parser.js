// Normalizes the raw decrypted ES3 JSON into a flat shape the UI and the
// recommender can work with directly.

// Best-effort hero id -> class mapping inferred from the wiki's stated hero
// order (Şovalye/Knight, Ranger, Sorcerer, Priest, Hunter, Slayer) and the
// heroKey numbering scheme (101, 201, 301, 401, 501, 601) seen in real save
// data. Update this once the static hero data table (Phase 3) confirms it.
export const HERO_CLASSES = {
  101: "Knight",
  201: "Ranger",
  301: "Sorcerer",
  401: "Priest",
  501: "Hunter",
  601: "Slayer",
};

// equippedItemIds[10] is positional; this is the confirmed order (verified
// against a real save file cross-referenced with ItemInfoData's PARTS column).
export const EQUIP_SLOT_PARTS = [
  "MAIN_WEAPON",
  "SUB_WEAPON",
  "HELMET",
  "ARMOR",
  "GLOVES",
  "BOOTS",
  "AMULET",
  "EARING",
  "RING",
  "BRACER",
];

/**
 * @param {object} decrypted - output of decryptSaveFile()
 * @returns {{heroes: object[], itemsByUniqueId: Map<number, object>, inventoryItemIds: number[], stashItemIds: number[]}}
 */
export function parseSaveData(decrypted) {
  const psd = decrypted.PlayerSaveData ?? {};

  const heroes = (psd.heroSaveDatas ?? []).map((h) => ({
    heroKey: h.heroKey,
    className: HERO_CLASSES[h.heroKey] ?? `Kahraman ${h.heroKey}`,
    level: h.HeroLevel,
    isUnlocked: !!h.IsUnLock,
    equippedItemIds: h.equippedItemIds ?? [],
    skillKeys: h.equippedSKillKey ?? [],
  }));

  const itemsByUniqueId = new Map();
  for (const item of psd.itemSaveDatas ?? []) {
    itemsByUniqueId.set(item.UniqueId, {
      uniqueId: item.UniqueId,
      itemKey: item.ItemKey,
      isChaotic: !!item.IsChaotic,
      enchantData: item.EnchantData ?? [],
    });
  }

  // Note: the game's own save schema is inconsistent about capitalization
  // here (`IsUnlock` on inventory slots, `IsUnLock` on stash slots) —
  // checking both keeps this resilient to either.
  const inventoryItemIds = (psd.inventorySaveDatas ?? [])
    .filter((slot) => (slot.IsUnlock ?? slot.IsUnLock) && slot.ItemUniqueId)
    .map((slot) => slot.ItemUniqueId);

  const stashItemIds = (psd.stashSaveDatas ?? [])
    .filter((slot) => (slot.IsUnLock ?? slot.IsUnlock) && slot.ItemUniqueId)
    .map((slot) => slot.ItemUniqueId);

  return { heroes, itemsByUniqueId, inventoryItemIds, stashItemIds };
}
