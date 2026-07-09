import { decryptSaveFile } from "./es3-crypto.js";
import { parseSaveData, EQUIP_SLOT_PARTS } from "./save-parser.js";
import { loadGameData } from "./item-db.js";
import { buildRecommender } from "./recommender.js";
import { SKILL_PLANS, buildSkillPlan, groupSkillPlan, buildActiveLoadoutPlan, ACTIVE_SLOTS } from "./skill-guide.js";
import { buildLoadoutPlanner } from "./loadout-planner.js";
import { buildSocketGuide } from "./socket-guide.js";
import { itemIconImg, heroIconImg, colorForGrade } from "./icons.js";
import { openModal, closeModal, modalBody } from "./modal.js";

const dropZone = document.getElementById("drop-zone");
const fileInput = document.getElementById("file-input");
const statusEl = document.getElementById("status-message");
const uploadSection = document.getElementById("upload-section");
const tabBar = document.getElementById("tab-bar");
const heroesGrid = document.getElementById("heroes-grid");
const inventoryGrid = document.getElementById("inventory-grid");
const invSearch = document.getElementById("inv-search");
const invGradeFilter = document.getElementById("inv-grade-filter");
const invPartsFilter = document.getElementById("inv-parts-filter");
const invUpgradesOnly = document.getElementById("inv-upgrades-only");
const invFilterCount = document.getElementById("inv-filter-count");
const socketGuideContent = document.getElementById("socket-guide-content");
const socketItemSelect = document.getElementById("socket-item-select");
const socketHeroSelect = document.getElementById("socket-hero-select");
const socketAdviceOutput = document.getElementById("socket-advice-output");
const skillClassSelect = document.getElementById("skill-class-select");
const skillLevelInput = document.getElementById("skill-level-input");
const skillGuideBtn = document.getElementById("skill-guide-btn");
const skillGuideOutput = document.getElementById("skill-guide-output");

let gameDataPromise = null;
function getGameData() {
  if (!gameDataPromise) gameDataPromise = loadGameData();
  return gameDataPromise;
}

function setStatus(message, kind) {
  statusEl.textContent = message;
  statusEl.classList.remove("error", "success");
  if (kind) statusEl.classList.add(kind);
}

// --- Tab navigation. Tab names live in location.hash so tabs are linkable
// and back-button friendly; hash values deliberately match no element id
// (panels are #panel-<name>) so setting the hash never scroll-jumps.
const TAB_NAMES = ["kahramanlar", "envanter", "tas-rehberi", "skill-rehberi"];

function activateTab(name) {
  if (!TAB_NAMES.includes(name)) name = TAB_NAMES[0];
  for (const btn of tabBar.querySelectorAll(".tab-btn")) {
    const on = btn.dataset.tab === name;
    btn.classList.toggle("active", on);
    btn.setAttribute("aria-selected", String(on));
  }
  for (const panel of document.querySelectorAll(".tab-panel")) {
    panel.classList.toggle("active", panel.id === `panel-${name}`);
  }
}

function switchTab(name) {
  activateTab(name);
  if (location.hash.slice(1) !== name) location.hash = name;
}

tabBar.addEventListener("click", (e) => {
  const btn = e.target.closest(".tab-btn");
  if (btn) switchTab(btn.dataset.tab);
});
window.addEventListener("hashchange", () => activateTab(location.hash.slice(1)));
activateTab(location.hash.slice(1));

async function handleFile(file) {
  if (!file) return;
  document.body.classList.remove("save-loaded");
  setStatus("Dosya okunuyor ve şifresi çözülüyor...");

  try {
    const buffer = await file.arrayBuffer();
    const decrypted = await decryptSaveFile(buffer);
    const save = parseSaveData(decrypted);
    const db = await getGameData();
    const recommender = buildRecommender(db, save);
    const loadoutPlanner = buildLoadoutPlanner(db, save);
    const socketGuide = buildSocketGuide(db, save);

    render(save, db, recommender, loadoutPlanner, socketGuide);
    setStatus(`Yüklendi: ${save.heroes.length} kahraman bulundu.`, "success");
    document.body.classList.add("save-loaded");
    uploadSection.classList.add("compact");
    switchTab("kahramanlar");
  } catch (err) {
    console.error(err);
    setStatus(err.message ?? "Beklenmeyen bir hata oluştu.", "error");
  }
}

function resolveItem(uniqueId, save, db) {
  if (!uniqueId) return null;
  const instance = save.itemsByUniqueId.get(uniqueId);
  if (!instance) return null;
  return db.itemsByKey.get(instance.itemKey) ?? null;
}

// Set on each save load so modal openers, filter handlers and the socket
// advisor's change handlers can re-render without the pipeline re-running.
let appCtx = null;

function render(save, db, recommender, loadoutPlanner, socketGuide) {
  appCtx = { save, db, recommender, loadoutPlanner, socketGuide };
  renderHeroes(save, db);
  inventoryView = buildInventoryView(save, db, recommender);
  fillInventoryFilters();
  renderInventoryGrid();
  renderSocketGuide(db, socketGuide);
  renderSocketAdvisor(save, db, recommender, socketGuide);
}

function equipListHtml(hero) {
  const { save, db } = appCtx;
  return hero.equippedItemIds
    .map((uniqueId, i) => {
      const parts = EQUIP_SLOT_PARTS[i] ?? `Slot ${i + 1}`;
      const itemDef = resolveItem(uniqueId, save, db);
      const slotLabel = db.labelForParts(parts);
      if (!itemDef) {
        return `<div class="equip-slot empty"><span class="slot-name">${slotLabel}</span><span class="item-name">Boş</span></div>`;
      }
      return `<div class="equip-slot clickable" data-unique-id="${uniqueId}" title="Item detayı ve taş önerisi"><span class="slot-icon">${itemIconImg(itemDef, { size: 26 })}</span><span class="slot-name">${slotLabel}</span><span class="item-name">${db.displayName(itemDef)}</span></div>`;
    })
    .join("");
}

function renderHeroes(save, db) {
  heroesGrid.innerHTML = "";
  for (const hero of save.heroes) {
    const card = document.createElement("div");
    card.className = "hero-card";

    if (!hero.isUnlocked) {
      card.innerHTML = `
        <h3>${hero.className}</h3>
        <p class="locked">Henüz açılmadı</p>
      `;
      heroesGrid.appendChild(card);
      continue;
    }

    card.classList.add("clickable");
    card.dataset.heroKey = hero.heroKey;

    const skillLinkHtml = SKILL_PLANS[hero.className]
      ? `<button type="button" class="skill-link" data-class="${hero.className}" data-level="${hero.level}">Skill dağılımını gör (Sv.${hero.level})</button>`
      : "";

    card.innerHTML = `
      <div class="hero-card-head">
        <span class="hero-icon">${heroIconImg(hero)}</span>
        <div>
          <h3>${hero.className}</h3>
          <div class="hero-class">Kahraman #${hero.heroKey}</div>
        </div>
      </div>
      <div class="hero-level">Seviye ${hero.level}</div>
      ${equipListHtml(hero)}
      <div class="card-more-hint">Ekipman planı ve detay →</div>
      ${skillLinkHtml}
    `;
    heroesGrid.appendChild(card);
  }
}

// The recommender's verdict sentence for one hero row; shared between the
// inventory card one-liner (best hero) and the item modal's full ranking.
function verdictFor(entry) {
  if (entry.isLocked) return `${entry.className} için ama bu kahraman henüz açılmadı.`;
  if (entry.isEmpty) return `${entry.className} için boş slota uygun.`;
  if (entry.isUpgrade) return `${entry.className} için mevcut ekipmandan daha iyi (yükseltme).`;
  return `${entry.className} zaten daha iyisini kuşanmış, yükseltme yok.`;
}

function recommendationRowHtml(entry) {
  const highlight = !entry.isLocked && (entry.isUpgrade || entry.isEmpty);
  return `<div class="recommendation ${highlight ? "upgrade" : ""}">→ ${entry.className}: ${verdictFor(entry)}</div>`;
}

function itemMetaLine(db, itemDef) {
  const metaParts = [db.labelForGrade(itemDef.grade)];
  if (itemDef.parts) metaParts.push(db.labelForParts(itemDef.parts));
  if (itemDef.level) metaParts.push(`Lv.${itemDef.level}`);
  return metaParts.join(" · ");
}

// Precomputed inventory rows (card HTML + filter fields), rebuilt per save
// load and filtered on every filter-input event without re-scoring.
let inventoryView = null;

function buildInventoryView(save, db, recommender) {
  const uniqueIds = [...new Set([...save.inventoryItemIds, ...save.stashItemIds])];
  const rows = [];
  const gradeOrder = new Map();
  const partsSet = new Set();

  for (const uniqueId of uniqueIds) {
    const itemDef = resolveItem(uniqueId, save, db);
    if (!itemDef) continue;

    const ranked = recommender.recommend(itemDef);
    const best = ranked[0] ?? null;
    const recommendationHtml = best ? recommendationRowHtml(best) : "";

    const isGear = itemDef.itemType === "GEAR";
    const cardHtml = `
      <div class="item-card rarity-${(itemDef.grade ?? "").toLowerCase()}${isGear ? " clickable" : ""}"
        ${isGear ? `data-unique-id="${uniqueId}"` : ""}
        style="--grade-color: ${colorForGrade(itemDef.grade)}">
        <div class="item-card-head">
          <span class="item-icon">${itemIconImg(itemDef)}</span>
          <div>
            <div class="item-name">${db.displayName(itemDef)}</div>
            <div class="item-meta">${itemMetaLine(db, itemDef)}</div>
          </div>
        </div>
        ${recommendationHtml}
      </div>`;

    if (itemDef.grade) gradeOrder.set(itemDef.grade, itemDef.gradeOrder ?? 0);
    if (itemDef.parts) partsSet.add(itemDef.parts);

    rows.push({
      uniqueId,
      itemDef,
      best,
      searchText: [
        db.displayName(itemDef),
        db.labelForGrade(itemDef.grade),
        itemDef.parts ? db.labelForParts(itemDef.parts) : "",
      ]
        .join(" ")
        .toLocaleLowerCase("tr"),
      cardHtml,
    });
  }

  return {
    rows,
    gradeOptions: [...gradeOrder.entries()].sort((a, b) => a[1] - b[1]).map(([g]) => g),
    partsOptions: EQUIP_SLOT_PARTS.filter((p) => partsSet.has(p)),
  };
}

function fillFilterSelect(select, options, labelFor) {
  const prev = select.value;
  select.innerHTML =
    `<option value="">Tümü</option>` +
    options.map((v) => `<option value="${v}">${labelFor(v)}</option>`).join("");
  if (options.includes(prev)) select.value = prev;
}

function fillInventoryFilters() {
  const { db } = appCtx;
  fillFilterSelect(invGradeFilter, inventoryView.gradeOptions, (g) => db.labelForGrade(g));
  fillFilterSelect(invPartsFilter, inventoryView.partsOptions, (p) => db.labelForParts(p));
}

function renderInventoryGrid() {
  if (!inventoryView) return;
  const query = invSearch.value.trim().toLocaleLowerCase("tr");
  const rows = inventoryView.rows.filter(
    (r) =>
      (!query || r.searchText.includes(query)) &&
      (!invGradeFilter.value || r.itemDef.grade === invGradeFilter.value) &&
      (!invPartsFilter.value || r.itemDef.parts === invPartsFilter.value) &&
      (!invUpgradesOnly.checked ||
        (r.best && !r.best.isLocked && (r.best.isUpgrade || r.best.isEmpty)))
  );
  invFilterCount.textContent = `${rows.length} / ${inventoryView.rows.length} item gösteriliyor.`;
  inventoryGrid.innerHTML = rows.map((r) => r.cardHtml).join("");
}

function loadoutPlanHtml(hero) {
  const { db, loadoutPlanner } = appCtx;
  return loadoutPlanner
    .planForHero(hero)
    .map((slot) => {
      const slotLabel = db.labelForParts(slot.parts);
      const equippedName = slot.equippedDef ? db.displayName(slot.equippedDef) : "Boş";

      let recommendedHtml;
      let rowClass = "";
      if (!slot.best) {
        recommendedHtml = `<span class="loadout-empty">Sahip olduğun bir item yok</span>`;
        rowClass = "empty-pool";
      } else {
        recommendedHtml = `<span class="loadout-icon">${itemIconImg(slot.best, { size: 26 })}</span><span>${db.displayName(slot.best)}</span>`;
        if (slot.isFallback) rowClass = "needs-level";
        else if (slot.isUpgrade) rowClass = "upgrade";
      }

      const noteHtml = slot.isFallback
        ? `<div class="loadout-note">Seviyen (${hero.level}) bu item için henüz yetersiz — en yakın seçenek gösteriliyor.</div>`
        : "";

      return `<div class="loadout-slot ${rowClass}">
        <span class="slot-name">${slotLabel}</span>
        <span class="loadout-equipped">${equippedName}</span>
        <span class="loadout-arrow">→</span>
        <span class="loadout-recommended">${recommendedHtml}</span>
        ${noteHtml}
      </div>`;
    })
    .join("");
}

function openHeroModal(heroKey) {
  if (!appCtx) return;
  const hero = appCtx.save.heroes.find((h) => h.heroKey === heroKey);
  if (!hero || !hero.isUnlocked) return;

  const skillLinkHtml = SKILL_PLANS[hero.className]
    ? `<button type="button" class="skill-link" data-class="${hero.className}" data-level="${hero.level}">Skill dağılımını gör (Sv.${hero.level})</button>`
    : "";

  openModal(`
    <div class="hero-card-head">
      <span class="hero-icon">${heroIconImg(hero)}</span>
      <div>
        <h3>${hero.className}</h3>
        <div class="hero-class">Seviye ${hero.level} · Kahraman #${hero.heroKey}</div>
      </div>
    </div>
    <h4 class="modal-subhead">Üzerindeki Ekipman</h4>
    ${equipListHtml(hero)}
    <h4 class="modal-subhead">Ekipman Planı (Seviyene Uygun)</h4>
    <p class="hint">
      10 ekipman slotu, kahramanın <strong>şu anki seviyesine</strong> uygun (üstünde olmayan)
      sahip olduğun en iyi eşyayla eşleştiriliyor.
    </p>
    ${loadoutPlanHtml(hero)}
    ${skillLinkHtml}
  `);
}

function openItemModal(uniqueId) {
  if (!appCtx) return;
  const { save, db, recommender } = appCtx;
  const itemDef = resolveItem(uniqueId, save, db);
  if (!itemDef || itemDef.itemType !== "GEAR") return;

  const statsHtml = (itemDef.stats ?? [])
    .map(
      (s) =>
        `<div class="skill-plan-row"><span>${db.labelForStat(s.statType)}</span><span class="skill-plan-points">${s.value}</span></div>`
    )
    .join("");

  const rankingHtml = recommender.recommend(itemDef).map(recommendationRowHtml).join("");

  const { heroKey, sourceNote } = pickHeroForItem(uniqueId, itemDef, null);
  const socketHtml = buildSocketAdviceHtml(itemDef, heroKey, sourceNote);

  openModal(`
    <div class="item-card-head">
      <span class="item-icon">${itemIconImg(itemDef, { size: 40 })}</span>
      <div>
        <div class="item-name">${db.displayName(itemDef)}</div>
        <div class="item-meta">${itemMetaLine(db, itemDef)}</div>
      </div>
    </div>
    <h4 class="modal-subhead">Statlar</h4>
    ${statsHtml ? `<div class="skill-plan-rows">${statsHtml}</div>` : `<p class="hint">Stat verisi yok.</p>`}
    <h4 class="modal-subhead">Kime Verilmeli?</h4>
    <div class="modal-ranking">${rankingHtml || `<p class="hint">Bu item için öneri yok.</p>`}</div>
    <h4 class="modal-subhead">Taş Önerisi</h4>
    ${socketHtml}
  `);
}

function renderSocketGuide(db, guide) {
  const slotRowsHtml = Object.entries(guide.slotUnlockGrade)
    .map(
      ([type, grade]) =>
        `<div class="socket-slot-row"><strong>${db.labelForMaterialType(type)}</strong> slotu: <span>${grade ? db.labelForGrade(grade) : "?"}</span> ve üstü ekipmanda açılıyor.</div>`
    )
    .join("");

  const archetypeHtml = guide.heroArchetypes
    .map((h) => `<span class="tier-chip">${h.class}: ${h.archetype === "DPS" ? "Hasar odaklı" : "Tanky/Destek"}</span>`)
    .join("");

  const entries = guide.ownedMaterials.length > 0 ? guide.ownedMaterials : guide.allMaterials;
  const entriesNote =
    guide.ownedMaterials.length > 0
      ? "Envanterinde/deponda bulunan taşlar aşağıda listeleniyor."
      : "Envanterinde bu tip taş bulunamadı — oyunun tüm taş çeşitleri referans olarak listeleniyor.";

  const stonesHtml = entries
    .map(({ material, effectsWithAdvice }) => {
      const effectsHtml = effectsWithAdvice
        .map((e) => {
          const groupLabel = db.labelForGearGroup(e.gearGroup);
          const statLabel = db.labelForStat(e.statType);
          const heroHint = e.bestHero ? ` · en çok fayda: <strong>${e.bestHero.class}</strong>` : "";
          return `<div class="socket-effect-row"><span class="socket-group">${groupLabel}</span> slotuna takılırsa: <strong>${statLabel} ${e.minValue}-${e.maxValue}</strong>${heroHint}</div>`;
        })
        .join("");
      return `<div class="socket-material-card">
        <div class="socket-material-head">
          <span class="material-icon">${itemIconImg(material, { size: 32 })}</span>
          <strong>${db.labelForGrade(material.grade)} ${db.labelForMaterialType(material.materialType)}</strong>
        </div>
        ${effectsHtml}
      </div>`;
    })
    .join("");

  socketGuideContent.innerHTML = `
    <div class="socket-slot-unlocks">${slotRowsHtml}</div>
    <div class="tier-list">${archetypeHtml}</div>
    <p class="hint">${entriesNote}</p>
    <div class="socket-materials-grid">${stonesHtml}</div>
  `;
}

function renderSocketAdvisor(save, db, recommender, socketGuide) {
  const optionFor = (uniqueId) => {
    const def = resolveItem(uniqueId, save, db);
    if (!def || def.itemType !== "GEAR") return "";
    return `<option value="${uniqueId}">${db.displayName(def)} · ${db.labelForParts(def.parts)}</option>`;
  };

  const groups = [];
  for (const hero of save.heroes) {
    if (!hero.isUnlocked) continue;
    const opts = hero.equippedItemIds.map(optionFor).join("");
    if (opts) groups.push(`<optgroup label="${hero.className} — üzerindeki">${opts}</optgroup>`);
  }
  const invOpts = save.inventoryItemIds.map(optionFor).join("");
  if (invOpts) groups.push(`<optgroup label="Envanter">${invOpts}</optgroup>`);
  const stashOpts = save.stashItemIds.map(optionFor).join("");
  if (stashOpts) groups.push(`<optgroup label="Depo">${stashOpts}</optgroup>`);

  socketItemSelect.innerHTML = `<option value="">Bir item seç…</option>${groups.join("")}`;
  socketHeroSelect.innerHTML =
    `<option value="auto">Otomatik (en uygun)</option>` +
    save.heroes
      .filter((h) => h.isUnlocked)
      .map((h) => `<option value="${h.heroKey}">${h.className}</option>`)
      .join("");

  socketAdviceOutput.innerHTML = `<p class="hint">Yukarıdan bir item seç.</p>`;
}

// Which hero should socket advice be ranked for: manual override → the hero
// wearing the item → the recommender's best pick → first unlocked hero.
function pickHeroForItem(uniqueId, itemDef, manualHeroKey) {
  const { save, recommender } = appCtx;
  if (manualHeroKey) return { heroKey: manualHeroKey, sourceNote: "elle seçildi" };
  const wearer = save.heroes.find((h) => h.isUnlocked && h.equippedItemIds.includes(uniqueId));
  if (wearer) return { heroKey: wearer.heroKey, sourceNote: "itemi taşıyan kahraman" };
  const ranked = recommender.recommend(itemDef);
  const best = ranked.find((r) => !r.isLocked) ?? ranked[0];
  return {
    heroKey: best?.heroKey ?? save.heroes.find((h) => h.isUnlocked)?.heroKey,
    sourceNote: "otomatik: en uygun kahraman",
  };
}

// Shared by the select-driven advisor (Taş Rehberi tab) and the item modal.
function buildSocketAdviceHtml(itemDef, heroKey, sourceNote) {
  const { db, socketGuide } = appCtx;

  const heroClass = db.heroesByKey.get(heroKey)?.class ?? "?";
  const advice = socketGuide.adviseForItem(itemDef, heroKey);
  if (!advice) {
    return `<p class="hint">Bu item için taş önerisi yapılamıyor.</p>`;
  }

  const headHtml = `<div class="advice-target">
    <span class="material-icon">${itemIconImg(itemDef, { size: 32 })}</span>
    <span><strong>${db.displayName(itemDef)}</strong> · öneriler <strong>${heroClass}</strong> için (${sourceNote})</span>
  </div>`;

  if (advice.every((a) => a.slots === 0)) {
    return `${headHtml}
      <p class="hint">Bu itemde taş yuvası yok — yuvalar ${db.labelForGrade("RARE")} ve üzeri kalitedeki itemlerde açılıyor.</p>`;
  }

  const blocksHtml = advice
    .map((a) => {
      const typeLabel = db.labelForMaterialType(a.type);
      if (a.slots === 0) {
        const unlockLabel = a.unlockGrade ? db.labelForGrade(a.unlockGrade) : "?";
        return `<div class="advice-type-block locked-slot">
          <h4>${typeLabel}</h4>
          <p class="hint">Bu itemde yuva yok — ${unlockLabel} ve üzeri itemlerde açılıyor.</p>
        </div>`;
      }

      const rows = a.ranked
        .map((r, i) => {
          const ownedBadge = r.owned ? `<span class="owned-badge">✓ sende var</span>` : "";
          const altNote = r.ownedAlt
            ? `<div class="loadout-note">Sende düşük kalitesi var: ${db.labelForGrade(r.ownedAlt.material.grade)} (${db.labelForStat(r.statType)} ${r.ownedAlt.effect.minValue}-${r.ownedAlt.effect.maxValue})</div>`
            : "";
          return `<div class="socket-effect-row advice-row">
            <span class="advice-rank">${i + 1}.</span>
            <span class="material-icon">${itemIconImg(r.material, { size: 26 })}</span>
            <span>${db.labelForGrade(r.material.grade)} ${typeLabel} — <strong>${db.labelForStat(r.statType)} ${r.effect.minValue}-${r.effect.maxValue}</strong>${ownedBadge}</span>
            ${altNote}
          </div>`;
        })
        .join("");

      return `<div class="advice-type-block">
        <h4>${typeLabel} · ${a.slots} yuva</h4>
        ${rows || `<p class="hint">Uygun taş bulunamadı.</p>`}
      </div>`;
    })
    .join("");

  return headHtml + blocksHtml;
}

function renderSocketAdvice() {
  if (!appCtx) return;
  const { save, db } = appCtx;

  const uniqueId = Number(socketItemSelect.value);
  const itemDef = resolveItem(uniqueId, save, db);
  if (!itemDef) {
    socketAdviceOutput.innerHTML = `<p class="hint">Yukarıdan bir item seç.</p>`;
    return;
  }

  const manualKey = socketHeroSelect.value !== "auto" ? Number(socketHeroSelect.value) : null;
  const { heroKey, sourceNote } = pickHeroForItem(uniqueId, itemDef, manualKey);
  socketAdviceOutput.innerHTML = buildSocketAdviceHtml(itemDef, heroKey, sourceNote);
}

socketItemSelect.addEventListener("change", () => {
  socketHeroSelect.value = "auto";
  renderSocketAdvice();
});
socketHeroSelect.addEventListener("change", renderSocketAdvice);

function renderSkillGuide() {
  const className = skillClassSelect.value;
  const level = Number(skillLevelInput.value);
  const plan = SKILL_PLANS[className];

  if (!plan || !Number.isFinite(level) || level < 1) {
    skillGuideOutput.innerHTML = `<p class="skill-guide-empty">Geçerli bir seviye gir.</p>`;
    return;
  }

  const groups = groupSkillPlan(buildSkillPlan(className, level));
  const rowsHtml = groups
    .map((g) => {
      const label = g.from === g.to ? `Puan ${g.from}` : `Puan ${g.from}–${g.to}`;
      return `<div class="skill-plan-row"><span class="skill-plan-points">${label}</span><span class="skill-plan-skill">${g.skill}</span></div>`;
    })
    .join("");

  const loadoutSegments = buildActiveLoadoutPlan(className, level);
  const loadoutRowsHtml = loadoutSegments
    .map((seg) => {
      const label = seg.from === seg.to ? `Sv.${seg.from}` : `Sv.${seg.from}–${seg.to}`;
      return `<div class="skill-plan-row"><span class="skill-plan-points">${label}</span><span class="skill-plan-skill">${seg.skills.join(" + ")}</span></div>`;
    })
    .join("");

  skillGuideOutput.innerHTML = `
    <div class="skill-plan-header">
      <span class="tier-chip tier-${plan.tier.toLowerCase()}">${plan.tier}</span>
      <strong>${className}</strong>
      <span class="skill-plan-role">${plan.role}</span>
    </div>

    <h3 class="skill-plan-subhead">Aktif Yetenek Loadout'u (${ACTIVE_SLOTS} slot)</h3>
    <div class="skill-plan-rows">${loadoutRowsHtml}</div>

    <h3 class="skill-plan-subhead">Puan Dağılımı</h3>
    <div class="skill-plan-rows">${rowsHtml}</div>
    <p class="skill-plan-note">${plan.note}</p>
  `;
}

skillGuideBtn.addEventListener("click", renderSkillGuide);
skillLevelInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") renderSkillGuide();
});

// Prefill the skill calculator and switch to its tab (replaces the old
// scrollIntoView jump — the section now lives in another tab panel).
function showSkillPlanFor(className, level) {
  skillClassSelect.value = className;
  skillLevelInput.value = level;
  renderSkillGuide();
  switchTab("skill-rehberi");
}

heroesGrid.addEventListener("click", (e) => {
  const slot = e.target.closest(".equip-slot[data-unique-id]");
  if (slot) {
    openItemModal(Number(slot.dataset.uniqueId));
    return;
  }
  const btn = e.target.closest(".skill-link");
  if (btn) {
    showSkillPlanFor(btn.dataset.class, btn.dataset.level);
    return;
  }
  const card = e.target.closest(".hero-card[data-hero-key]");
  if (card) openHeroModal(Number(card.dataset.heroKey));
});

inventoryGrid.addEventListener("click", (e) => {
  const card = e.target.closest(".item-card[data-unique-id]");
  if (card) openItemModal(Number(card.dataset.uniqueId));
});

// Single persistent delegated listener — never attach listeners to the
// innerHTML-injected modal content itself.
modalBody.addEventListener("click", (e) => {
  const slot = e.target.closest(".equip-slot[data-unique-id]");
  if (slot) {
    openItemModal(Number(slot.dataset.uniqueId));
    return;
  }
  const btn = e.target.closest(".skill-link");
  if (btn) {
    closeModal();
    showSkillPlanFor(btn.dataset.class, btn.dataset.level);
  }
});

invSearch.addEventListener("input", renderInventoryGrid);
invGradeFilter.addEventListener("change", renderInventoryGrid);
invPartsFilter.addEventListener("change", renderInventoryGrid);
invUpgradesOnly.addEventListener("change", renderInventoryGrid);

renderSkillGuide();

fileInput.addEventListener("change", (e) => handleFile(e.target.files?.[0]));

dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("drag-over");
});
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag-over"));
dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("drag-over");
  handleFile(e.dataTransfer.files?.[0]);
});
