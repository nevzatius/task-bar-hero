import { decryptSaveFile } from "./es3-crypto.js";
import { parseSaveData, EQUIP_SLOT_PARTS } from "./save-parser.js";
import { loadGameData } from "./item-db.js";
import { buildRecommender } from "./recommender.js";
import { SKILL_PLANS, buildSkillPlan, groupSkillPlan, buildActiveLoadoutPlan, ACTIVE_SLOTS } from "./skill-guide.js";
import { buildLoadoutPlanner } from "./loadout-planner.js";
import { buildSocketGuide } from "./socket-guide.js";
import { itemIconImg, heroIconImg, colorForGrade } from "./icons.js";

const dropZone = document.getElementById("drop-zone");
const fileInput = document.getElementById("file-input");
const statusEl = document.getElementById("status-message");
const resultsSection = document.getElementById("results-section");
const heroesGrid = document.getElementById("heroes-grid");
const inventoryGrid = document.getElementById("inventory-grid");
const loadoutGrid = document.getElementById("loadout-grid");
const socketGuideContent = document.getElementById("socket-guide-content");
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

async function handleFile(file) {
  if (!file) return;
  resultsSection.classList.add("hidden");
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
    resultsSection.classList.remove("hidden");
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

function render(save, db, recommender, loadoutPlanner, socketGuide) {
  renderHeroes(save, db);
  renderInventory(save, db, recommender);
  renderHeroLoadoutPlan(save, db, loadoutPlanner);
  renderSocketGuide(db, socketGuide);
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

    const slotsHtml = hero.equippedItemIds
      .map((uniqueId, i) => {
        const parts = EQUIP_SLOT_PARTS[i] ?? `Slot ${i + 1}`;
        const itemDef = resolveItem(uniqueId, save, db);
        const slotLabel = db.labelForParts(parts);
        if (!itemDef) {
          return `<div class="equip-slot empty"><span class="slot-name">${slotLabel}</span><span class="item-name">Boş</span></div>`;
        }
        return `<div class="equip-slot"><span class="slot-icon">${itemIconImg(itemDef, { size: 26 })}</span><span class="slot-name">${slotLabel}</span><span class="item-name">${db.displayName(itemDef)}</span></div>`;
      })
      .join("");

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
      ${slotsHtml}
      ${skillLinkHtml}
    `;
    heroesGrid.appendChild(card);
  }
}

function renderInventory(save, db, recommender) {
  inventoryGrid.innerHTML = "";

  const uniqueIds = [...new Set([...save.inventoryItemIds, ...save.stashItemIds])];
  const fragment = document.createDocumentFragment();

  for (const uniqueId of uniqueIds) {
    const itemDef = resolveItem(uniqueId, save, db);
    if (!itemDef) continue;

    const card = document.createElement("div");
    card.className = `item-card rarity-${(itemDef.grade ?? "").toLowerCase()}`;
    card.style.setProperty("--grade-color", colorForGrade(itemDef.grade));

    const iconHtml = itemIconImg(itemDef);

    const metaParts = [db.labelForGrade(itemDef.grade)];
    if (itemDef.parts) metaParts.push(db.labelForParts(itemDef.parts));
    if (itemDef.level) metaParts.push(`Lv.${itemDef.level}`);

    let recommendationHtml = "";
    const ranked = recommender.recommend(itemDef);
    if (ranked.length > 0) {
      const best = ranked[0];

      let verdict;
      if (best.isLocked) {
        verdict = `${best.className} için ama bu kahraman henüz açılmadı.`;
      } else if (best.isEmpty) {
        verdict = `${best.className} için boş slota uygun.`;
      } else if (best.isUpgrade) {
        verdict = `${best.className} için mevcut ekipmandan daha iyi (yükseltme).`;
      } else {
        verdict = `${best.className} zaten daha iyisini kuşanmış, yükseltme yok.`;
      }

      const highlight = !best.isLocked && (best.isUpgrade || best.isEmpty);
      recommendationHtml = `<div class="recommendation ${highlight ? "upgrade" : ""}">
        → ${best.className}: ${verdict}
      </div>`;
    }

    card.innerHTML = `
      <div class="item-card-head">
        <span class="item-icon">${iconHtml}</span>
        <div>
          <div class="item-name">${db.displayName(itemDef)}</div>
          <div class="item-meta">${metaParts.join(" · ")}</div>
        </div>
      </div>
      ${recommendationHtml}
    `;
    fragment.appendChild(card);
  }

  inventoryGrid.appendChild(fragment);
}

function renderHeroLoadoutPlan(save, db, planner) {
  loadoutGrid.innerHTML = "";

  for (const hero of save.heroes) {
    const card = document.createElement("div");
    card.className = "loadout-card";

    if (!hero.isUnlocked) {
      card.innerHTML = `
        <div class="hero-card-head">
          <span class="hero-icon">${heroIconImg(hero)}</span>
          <h3>${hero.className}</h3>
        </div>
        <p class="locked">Henüz açılmadı</p>
      `;
      loadoutGrid.appendChild(card);
      continue;
    }

    const rowsHtml = planner
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

    card.innerHTML = `
      <div class="hero-card-head">
        <span class="hero-icon">${heroIconImg(hero)}</span>
        <div>
          <h3>${hero.className}</h3>
          <div class="hero-level">Seviye ${hero.level}</div>
        </div>
      </div>
      ${rowsHtml}
    `;
    loadoutGrid.appendChild(card);
  }
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

heroesGrid.addEventListener("click", (e) => {
  const btn = e.target.closest(".skill-link");
  if (!btn) return;
  skillClassSelect.value = btn.dataset.class;
  skillLevelInput.value = btn.dataset.level;
  renderSkillGuide();
  document.getElementById("skill-guide-section").scrollIntoView({ behavior: "smooth", block: "start" });
});

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
