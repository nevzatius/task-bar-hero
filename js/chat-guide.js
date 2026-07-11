// Rule-based "chat" front end over the existing analysis engines: no LLM, no
// network call — just keyword matching on the question (class name + intent)
// routed to socket-guide / skill-guide / loadout-planner and formatted as a
// short chat reply. Kept deliberately simple; it answers the handful of
// question shapes players actually ask ("X için hangi taş", "X build",
// "X'e ne giydirmeliyim"), not open-ended natural language.

import { SKILL_PLANS, buildSkillPlan, groupSkillPlan, buildActiveLoadoutPlan } from "./skill-guide.js";
import { statPriorityForClass } from "./socket-guide.js";
import { EQUIP_SLOT_PARTS } from "./save-parser.js";

// Turkish aliases players are likely to type instead of the English class
// name — an editorial guess for convenience, not game data.
const CLASS_ALIASES = {
  "şövalye": "Knight", "sovalye": "Knight", "knight": "Knight",
  "okçu": "Ranger", "okcu": "Ranger", "ranger": "Ranger",
  "büyücü": "Sorcerer", "buyucu": "Sorcerer", "mage": "Sorcerer", "sorcerer": "Sorcerer",
  "rahip": "Priest", "şifacı": "Priest", "sifaci": "Priest", "healer": "Priest", "priest": "Priest",
  "avcı": "Hunter", "avci": "Hunter", "hunter": "Hunter",
  "katil": "Slayer", "suikastçı": "Slayer", "suikastci": "Slayer", "slayer": "Slayer",
};

const INTENT_KEYWORDS = {
  socket: ["taş", "tas", "soket", "socket", "süsleme", "susleme", "kazıma", "kazima", "nakış", "nakis", "stone", "gem", " bas"],
  skill: ["skill", "yetenek", "build", "puan"],
  gear: ["ekipman", "eşya", "esya", "item", "loadout", "ne giy", "ne tak", "gear"],
};

const EXAMPLE_QUESTION = "Priest için hangi itemlere neler basmalıyım?";

function detectClass(question) {
  const lower = question.toLocaleLowerCase("tr");
  for (const [alias, className] of Object.entries(CLASS_ALIASES)) {
    if (lower.includes(alias)) return className;
  }
  return null;
}

function detectIntent(question) {
  const lower = question.toLocaleLowerCase("tr");
  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    if (keywords.some((k) => lower.includes(k))) return intent;
  }
  return null;
}

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

  return `${priorityHtml}
    <p class="chat-line">Üzerindeki eşyalar için taş önerisi:</p>
    <div class="chat-gear-list">${rowsHtml}</div>
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
      const text = slot.best ? db.displayName(slot.best) : "sahip olduğun bir item yok";
      return `<div class="chat-gear-row"><span class="chat-gear-slot">${slotLabel}</span><span>${text}</span></div>`;
    })
    .join("");

  return `<p class="chat-line"><strong>${hero.className}</strong> (Sv.${hero.level}) için önerilen ekipman:</p>
    <div class="chat-gear-list">${rowsHtml}</div>`;
}

function helpHtml(className) {
  if (className) {
    return `<p class="chat-line"><strong>${className}</strong> hakkında ne öğrenmek istersin — soket taşı, skill puanı, yoksa ekipman planı mı?</p>`;
  }
  return `<p class="chat-line">Bir sınıf adı (Knight, Ranger, Sorcerer, Priest, Hunter, Slayer) ve ne öğrenmek istediğini (taş, skill, ekipman) yazarsan yardımcı olabilirim.</p>
    <p class="hint">Örnek: "${EXAMPLE_QUESTION}"</p>`;
}

/**
 * @param {{db:object, save:object|null, socketGuide:object|null, loadoutPlanner:object|null}} ctx
 * @param {string} question - raw chat input
 * @returns {string} HTML fragment for the chat reply
 */
export function answerChatQuestion(ctx, question) {
  const className = detectClass(question);
  const intent = detectIntent(question);

  if (!className) return helpHtml(null);
  if (intent === "socket") return socketAnswerHtml(ctx, className);
  if (intent === "skill") return skillAnswerHtml(ctx, className);
  if (intent === "gear") return gearAnswerHtml(ctx, className);
  return helpHtml(className);
}
