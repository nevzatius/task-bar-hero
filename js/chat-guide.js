// Button-driven "chat" front end over the existing analysis engines: no LLM,
// no network call — the user picks a class then a topic from fixed option
// buttons (see CLASS_NAMES / CHAT_INTENTS), and answerFor() routes that pair
// to socket-guide / skill-guide / loadout-planner and formats the result as
// a chat reply.

import { SKILL_PLANS, buildSkillPlan, groupSkillPlan, buildActiveLoadoutPlan } from "./skill-guide.js";
import { statPriorityForClass } from "./socket-guide.js";
import { EQUIP_SLOT_PARTS } from "./save-parser.js";

// Same order as the Skill Rehberi class dropdown.
export const CLASS_NAMES = ["Knight", "Ranger", "Sorcerer", "Priest", "Hunter", "Slayer"];

export const CHAT_INTENTS = [
  { key: "upgrade", label: "Ne Değiştireyim?" },
  { key: "gear", label: "Ekipman Planı" },
  { key: "socket", label: "Taş Önerisi" },
  { key: "skill", label: "Skill Puanları" },
];

function resolveItem(uniqueId, save, db) {
  if (!uniqueId) return null;
  const instance = save.itemsByUniqueId.get(uniqueId);
  if (!instance) return null;
  return db.itemsByKey.get(instance.itemKey) ?? null;
}

function heroFor(save, className) {
  return save?.heroes.find((h) => h.className === className && h.isUnlocked) ?? null;
}

function socketAnswerHtml(ctx, className) {
  const { db, save, socketGuide } = ctx;
  const priorityStats = statPriorityForClass(className).slice(0, 6).map((s) => db.labelForStat(s));
  const priorityHtml = `<p class="chat-line"><strong>${className}</strong> için soket taşı önceliği (sınıfın rolüne göre genel sıralama): ${priorityStats.join(", ")}.</p>`;

  if (!save || !socketGuide) {
    return `${priorityHtml}<p class="hint">Üzerindeki itemlere göre item bazlı tam öneri için kayıt dosyanı yükle (ya da <strong>Taş Rehberi</strong> sekmesinden bir item seç).</p>`;
  }

  const hero = heroFor(save, className);
  if (!hero) {
    return `${priorityHtml}<p class="hint">${className} kahramanı henüz açılmamış görünüyor.</p>`;
  }
  const priorityHint = `<p class="hint">Genel öncelik: ${priorityStats.join(", ")}.</p>`;

  const rowsHtml = hero.equippedItemIds
    .map((uniqueId, i) => {
      const parts = EQUIP_SLOT_PARTS[i] ?? `Slot ${i + 1}`;
      const slotLabel = db.labelForParts(parts);
      const itemDef = resolveItem(uniqueId, save, db);
      if (!itemDef) {
        return `<div class="chat-gear-row"><span class="chat-gear-slot">${slotLabel}</span><span class="hint">boş</span></div>`;
      }

      const advice = socketGuide.adviseForItem(itemDef, hero.heroKey);
      let summary;
      if (!advice) {
        summary = "taş önerisi yok";
      } else {
        const perType = advice
          .filter((a) => a.slots > 0 && a.ranked.length > 0)
          .map((a) => `${db.labelForMaterialType(a.type)}: ${db.labelForStat(a.ranked[0].statType)}`);
        summary = perType.length ? perType.join(" · ") : "açık taş yuvası yok";
      }

      return `<div class="chat-gear-row"><span class="chat-gear-slot">${slotLabel}</span><span>${db.displayName(itemDef)} → <strong>${summary}</strong></span></div>`;
    })
    .join("");

  return `<p class="chat-line"><strong>${hero.className}</strong> (Sv.${hero.level}) — üzerindeki eşyalara basılacak taşlar:</p>
    <div class="chat-gear-list">${rowsHtml}</div>
    ${priorityHint}
    <p class="hint">Detaylı sıralama ve "sende var" işaretleri için <strong>Taş Rehberi</strong> sekmesinde itemi seçip aç.</p>`;
}

function skillAnswerHtml(ctx, className) {
  const { save } = ctx;
  const plan = SKILL_PLANS[className];
  if (!plan) return `<p class="hint">${className} için skill verisi yok.</p>`;

  const hero = heroFor(save, className);
  const level = hero?.level ?? 45;
  const levelNote = hero
    ? `kayıtlı seviyen: ${level}`
    : `save yüklenmediği için örnek seviye ${level} kullanıldı`;

  const loadoutSegments = buildActiveLoadoutPlan(className, level);
  const lastLoadout = loadoutSegments[loadoutSegments.length - 1];
  const loadoutText = lastLoadout ? lastLoadout.skills.join(" + ") : "henüz aktif yetenek açılmadı";

  const groups = groupSkillPlan(buildSkillPlan(className, level));
  const rowsHtml = groups
    .map((g) => {
      const label = g.from === g.to ? `Puan ${g.from}` : `Puan ${g.from}–${g.to}`;
      return `<div class="chat-gear-row"><span class="chat-gear-slot">${label}</span><span>${g.skill}</span></div>`;
    })
    .join("");

  return `<p class="chat-line"><strong>${className}</strong> (${plan.role}, ${levelNote}): önerilen aktif yetenek loadout'u <strong>${loadoutText}</strong>.</p>
    <div class="chat-gear-list">${rowsHtml}</div>
    <p class="hint">${plan.note} Tam hesaplayıcı için <strong>Skill Rehberi</strong> sekmesine bak.</p>`;
}

function gearAnswerHtml(ctx, className) {
  const { db, save, loadoutPlanner } = ctx;
  if (!save || !loadoutPlanner) {
    return `<p class="hint">Ekipman planı için önce kayıt dosyanı yükle.</p>`;
  }
  const hero = heroFor(save, className);
  if (!hero) return `<p class="hint">${className} kahramanı henüz açılmamış görünüyor.</p>`;

  const rowsHtml = loadoutPlanner
    .planForHero(hero)
    .map((slot) => {
      const slotLabel = db.labelForParts(slot.parts);
      let text;
      if (!slot.best) {
        text = `<span class="hint">sahip olduğun bir item yok</span>`;
      } else if (slot.isFallback) {
        text = `${db.displayName(slot.best)} <span class="hint">(seviyen yetmiyor, Sv.${slot.best.level} gerekli)</span>`;
      } else if (slot.isUpgrade) {
        const oldName = slot.equippedDef ? db.displayName(slot.equippedDef) : "boş";
        text = `${oldName} → <strong>${db.displayName(slot.best)}</strong> <span class="chat-badge">değiştir</span>`;
      } else {
        // Owned pool has nothing better than what's equipped (equipped items
        // aren't in inventory/stash, so "best" here is the best *owned* spare).
        text = slot.equippedDef
          ? `${db.displayName(slot.equippedDef)} <span class="hint">(takılı olan daha iyi, değişiklik gerekmez)</span>`
          : `${db.displayName(slot.best)} <span class="hint">(slot boş, bunu tak)</span>`;
      }
      return `<div class="chat-gear-row"><span class="chat-gear-slot">${slotLabel}</span><span>${text}</span></div>`;
    })
    .join("");

  return `<p class="chat-line"><strong>${hero.className}</strong> (Sv.${hero.level}) için slot slot ekipman planı:</p>
    <div class="chat-gear-list">${rowsHtml}</div>`;
}

function upgradeAnswerHtml(ctx, className) {
  const { db, save, loadoutPlanner } = ctx;
  if (!save || !loadoutPlanner) {
    return `<p class="hint">Neyi değiştirmen gerektiğini söyleyebilmem için önce kayıt dosyanı yükle.</p>`;
  }
  const hero = heroFor(save, className);
  if (!hero) return `<p class="hint">${className} kahramanı henüz açılmamış görünüyor.</p>`;

  const upgrades = loadoutPlanner.planForHero(hero).filter((slot) => slot.isUpgrade);
  if (upgrades.length === 0) {
    return `<p class="chat-line"><strong>${hero.className}</strong> (Sv.${hero.level}): envanterinde takılılardan daha iyi bir item yok — şu an değişiklik gerekmiyor. 👍</p>`;
  }

  const rowsHtml = upgrades
    .map((slot) => {
      const slotLabel = db.labelForParts(slot.parts);
      const oldName = slot.equippedDef ? db.displayName(slot.equippedDef) : "boş";
      return `<div class="chat-gear-row"><span class="chat-gear-slot">${slotLabel}</span><span>${oldName} → <strong>${db.displayName(slot.best)}</strong></span></div>`;
    })
    .join("");

  return `<p class="chat-line"><strong>${hero.className}</strong> (Sv.${hero.level}) için envanterinde takılıdan daha iyi ${upgrades.length} item var — bunları kullan:</p>
    <div class="chat-gear-list">${rowsHtml}</div>`;
}

/**
 * @param {{db:object, save:object|null, socketGuide:object|null, loadoutPlanner:object|null}} ctx
 * @param {string} className - one of CLASS_NAMES
 * @param {string} intentKey - one of CHAT_INTENTS[].key
 * @returns {string} HTML fragment for the chat reply
 */
export function answerFor(ctx, className, intentKey) {
  if (intentKey === "upgrade") return upgradeAnswerHtml(ctx, className);
  if (intentKey === "socket") return socketAnswerHtml(ctx, className);
  if (intentKey === "skill") return skillAnswerHtml(ctx, className);
  if (intentKey === "gear") return gearAnswerHtml(ctx, className);
  return `<p class="hint">Bilinmeyen soru tipi.</p>`;
}
