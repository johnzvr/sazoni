// Sazoni — app sin dependencias. Las fichas vienen de data/*.json; el estado del usuario vive en localStorage.

const $app = document.getElementById("app");
const $tabbar = document.getElementById("tabbar");
const $badge = document.getElementById("shopBadge");

const CAT_LABEL = { fondos: "Fondos", entradas: "Entradas", postres: "Postres", bebidas: "Bebidas", otros: "Otros" };
const AISLE_LABEL = { mercado: "Mercado", bodega: "Bodega", despensa: "Despensa", otros: "Otros" };
const AISLE_ORDER = ["mercado", "bodega", "despensa", "otros"];

const ICON = {
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M15 6l-6 6 6 6"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linejoin="round"><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/></svg>',
  heartOn: '<svg viewBox="0 0 24 24" fill="#E85A1F" stroke="#14213D" stroke-width="2.1" stroke-linejoin="round"><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
  bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8h14l-1.5 11h-11z"/><path d="M9 8a3 3 0 0 1 6 0"/></svg>',
  chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" width="20" height="20"><path d="M9 6l6 6-6 6"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M10 2h4"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M8 5l12 7-12 7z"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>',
  reset: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2.2" stroke-linecap="round"><path d="M4 12a8 8 0 1 0 2.5-5.8M4 4v4h4"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V4M8 8l4-4 4 4"/><path d="M5 13v6h14v-6"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
};

// ---------- Utilidades ----------
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const norm = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

function fmtQty(n) {
  if (n == null || n === "") return "";
  if (typeof n !== "number" || !isFinite(n)) return esc(n);
  if (n >= 20) return String(Math.round(n));
  const whole = Math.floor(n), frac = n - whole;
  const table = [[0, ""], [0.25, "¼"], [1 / 3, "⅓"], [0.5, "½"], [2 / 3, "⅔"], [0.75, "¾"], [1, ""]];
  let best = table[0], dist = 1;
  for (const f of table) { const d = Math.abs(frac - f[0]); if (d < dist) { dist = d; best = f; } }
  if (dist < 0.05) {
    const w = best[0] === 1 ? whole + 1 : whole;
    if (!best[1]) return String(w);
    return w ? `${w} ${best[1]}` : best[1];
  }
  return String(Math.round(n * 10) / 10).replace(".", ",");
}
function fmtTime(min) {
  if (!min) return "";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}
function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(String(iso).slice(0, 10) + "T12:00:00");
  const today = new Date(); today.setHours(12, 0, 0, 0);
  const diff = Math.round((today - d) / 86400000);
  if (diff === 0) return "hoy";
  if (diff === 1) return "ayer";
  return d.toLocaleDateString("es-PE", { day: "numeric", month: "short" }).replace(".", "");
}
function clock(sec) {
  const s = Math.max(0, Math.round(sec));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
function toast(msg) {
  document.querySelector(".toast")?.remove();
  const el = document.createElement("div");
  el.className = "toast"; el.setAttribute("role", "status"); el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

// ---------- Estado local ----------
const KEY = "sazoni:v1";
const blank = () => ({ fav: {}, ing: {}, steps: {}, servings: {}, shop: [], shopMode: "puesto" });
let state = blank();
try { state = Object.assign(blank(), JSON.parse(localStorage.getItem(KEY) || "{}")); } catch { /* sin almacenamiento */ }
function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* lleno o bloqueado */ } updateBadge(); }

// ---------- Datos ----------
let index = null;
const cache = new Map();
async function loadIndex() {
  const res = await fetch("data/index.json", { cache: "no-cache" });
  if (!res.ok) throw new Error("index");
  index = await res.json();
}
async function loadDoc(entry) {
  if (cache.has(entry.id)) return cache.get(entry.id);
  const res = await fetch(entry.file, { cache: "no-cache" });
  if (!res.ok) throw new Error(entry.file);
  const doc = await res.json();
  cache.set(entry.id, doc);
  return doc;
}
const findRecipe = (id) => index.recetas.find((r) => r.id === id);
const findNote = (id) => index.notas.find((n) => n.id === id);

// ---------- Recetas: helpers ----------
function factor(doc) {
  const base = Number(doc.servings) || 1;
  return (state.servings[doc.id] || base) / base;
}
function flatIngredients(doc) {
  const out = [];
  (doc.ingredients || []).forEach((g, gi) => (g.items || []).forEach((it, ii) => out.push({ ...it, key: `${gi}-${ii}`, group: g.group })));
  return out;
}
// Redondea a medidas que se pueden usar en cocina al escalar porciones.
function kitchenRound(q, unit) {
  if (q == null) return q;
  const u = norm(unit);
  if (u === "g" || u === "ml") return q >= 100 ? Math.round(q / 10) * 10 : Math.max(5, Math.round(q / 5) * 5);
  if (u === "kg" || u === "l") return Math.max(0.25, Math.round(q * 4) / 4);
  if (["taza", "tazas", "cda", "cdas", "cdta", "cdtas"].includes(u)) return Math.max(0.25, Math.round(q * 4) / 4);
  // Unidades contables (huevos, dientes, rebanadas, latas…)
  return q < 3 ? Math.max(0.5, Math.round(q * 2) / 2) : Math.round(q);
}
function qtyLabel(it, k) {
  if (it.qty == null) return it.note && /gusto/i.test(it.note) ? "al gusto" : "";
  return [fmtQty(kitchenRound(it.qty * k, it.unit)), it.unit].filter(Boolean).join(" ");
}
const cap = (s) => String(s || "").charAt(0).toUpperCase() + String(s || "").slice(1);
function doneSteps(id) { return state.steps[id] || {}; }
function currentStep(doc) {
  const d = doneSteps(doc.id);
  const i = (doc.steps || []).findIndex((_, n) => !d[n]);
  return i === -1 ? null : i;
}
function missing(doc) {
  const checked = state.ing[doc.id] || {};
  return flatIngredients(doc).filter((it) => !checked[it.key] && it.qty != null);
}

// ---------- Compras ----------
function addToShop(doc, items) {
  const k = factor(doc);
  let added = 0;
  for (const it of items) {
    const key = `${norm(it.name)}|${norm(it.unit)}`;
    const qty = it.qty == null ? null : kitchenRound(it.qty * k, it.unit);
    const ex = state.shop.find((s) => s.key === key && !s.done);
    if (ex) {
      if (ex.recipes.includes(doc.id)) continue;
      if (qty != null && ex.qty != null) ex.qty += qty;
      ex.recipes.push(doc.id);
    } else {
      state.shop.push({ key, name: it.name, unit: it.unit || "", qty, aisle: it.aisle || "otros", recipes: [doc.id], done: false, id: Math.random().toString(36).slice(2, 9) });
    }
    added++;
  }
  save();
  return added;
}
const pendingShop = () => state.shop.filter((s) => !s.done);
function updateBadge() {
  const n = pendingShop().length;
  $badge.hidden = n === 0;
  $badge.textContent = n;
}

// ---------- Vistas ----------
function setChrome({ tab = null, cooking = false } = {}) {
  $tabbar.hidden = !tab;
  $tabbar.querySelectorAll("a").forEach((a) => a.setAttribute("aria-current", a.dataset.tab === tab ? "page" : "false"));
  document.body.classList.toggle("cooking", cooking);
  document.querySelector('meta[name="theme-color"]').setAttribute("content", cooking ? "#14213D" : "#FAF3E4");
}

let homeFilter = "todo";
let homeQuery = "";

function recipeCard(r) {
  return `<a class="card c-${esc(r.category)}" href="#/receta/${esc(r.id)}">
    <span class="cat">${esc(CAT_LABEL[r.category] || "Otros")}${state.fav[r.id] ? " · ♥" : ""}</span>
    <span><span class="t">${esc(r.title)}</span><span class="m">${esc([fmtTime(r.time_min), r.kcal ? `${r.kcal} kcal` : ""].filter(Boolean).join(" · "))}</span></span>
  </a>`;
}

function viewHome() {
  setChrome({ tab: "recetas" });
  const all = index.recetas;
  const q = norm(homeQuery);
  const filtering = homeFilter !== "todo" || q;
  let list = all.filter((r) => {
    if (homeFilter === "favs" && !state.fav[r.id]) return false;
    if (CAT_LABEL[homeFilter] && r.category !== homeFilter) return false;
    if (q && !norm(r.search).includes(q)) return false;
    return true;
  });
  const featured = !filtering && list[0];
  if (featured) list = list.slice(1);
  const usedCats = Object.keys(CAT_LABEL).filter((c) => all.some((r) => r.category === c));
  const pend = pendingShop();
  const shopRecipes = new Set(pend.flatMap((s) => s.recipes)).size;

  const chips = [["todo", "Todo", ""], ["favs", "Favoritas", "outline"], ...usedCats.map((c) => [c, CAT_LABEL[c], `c-${c}`])]
    .map(([v, l, cls]) => `<button class="chip ${cls}" data-act="filter" data-v="${v}" aria-pressed="${homeFilter === v}">${l}</button>`).join("");

  $app.innerHTML = `<div class="screen">
    <div class="row">
      <span class="hello">Hola, John · <span class="accent">${all.length} ${all.length === 1 ? "receta" : "recetas"}</span></span>
    </div>
    <h1 class="display" style="font-size:60px">Sazoni<span class="accent">.</span></h1>
    <label class="search">${ICON.search}<input id="q" type="search" placeholder="¿Qué cocinamos hoy?" value="${esc(homeQuery)}" autocomplete="off" aria-label="Buscar receta o ingrediente"></label>
    <div class="chips" role="group" aria-label="Filtrar">${chips}</div>
    ${featured ? `<a class="feature" href="#/receta/${esc(featured.id)}">
      <span class="pill light">Recién guardada · ${esc(fmtDate(featured.created))}</span>
      <h2 class="display">${esc(featured.title)}</h2>
      <div class="pills">
        ${featured.time_min ? `<span class="pill dark">${esc(fmtTime(featured.time_min))}</span>` : ""}
        ${featured.servings ? `<span class="pill dark">${featured.servings} porciones</span>` : ""}
        ${featured.kcal ? `<span class="pill dark">${featured.kcal} kcal</span>` : featured.difficulty ? `<span class="pill dark">${esc(featured.difficulty)}</span>` : ""}
      </div></a>` : ""}
    ${!filtering ? `<a class="strip" href="#/compras">
      <span class="dot" style="color:var(--yellow)">${ICON.bag}</span>
      <span class="grow"><b>Lista de compras</b><span class="sub">${pend.length ? `${pend.length} por comprar · ${shopRecipes} ${shopRecipes === 1 ? "receta" : "recetas"}` : "Vacía por ahora"}</span></span>
      ${ICON.chev}</a>` : ""}
    <div class="sec-head"><h3>${filtering ? `${list.length} ${list.length === 1 ? "resultado" : "resultados"}` : "Todas"}</h3>${!filtering ? '<span class="hello">Recientes</span>' : ""}</div>
    ${list.length ? `<div class="grid2">${list.map(recipeCard).join("")}</div>`
      : all.length ? `<div class="empty"><b>Nada por aquí</b><span>Prueba con otro ingrediente o filtro.</span></div>`
      : `<div class="empty"><b>Aún no hay recetas</b><span>Pídele una a Claude y dile “guárdala en Sazoni”.</span></div>`}
  </div>`;

  const input = document.getElementById("q");
  input.addEventListener("input", () => {
    homeQuery = input.value;
    const pos = input.selectionStart;
    viewHome();
    const again = document.getElementById("q");
    again.focus(); again.setSelectionRange(pos, pos);
  });
}

async function viewRecipe(id) {
  const entry = findRecipe(id);
  if (!entry) return viewMissing();
  const doc = await loadDoc(entry);
  setChrome({});
  const k = factor(doc);
  const cur = state.servings[doc.id] || doc.servings;
  const checked = state.ing[doc.id] || {};
  const done = doneSteps(doc.id);
  const nDone = (doc.steps || []).filter((_, i) => done[i]).length;
  const now = currentStep(doc);
  const miss = missing(doc);

  const groups = (doc.ingredients || []).map((g, gi) => `
    ${g.group ? `<span class="group-pill ${gi % 2 ? "alt" : ""}">${esc(g.group)}</span>` : ""}
    ${(g.items || []).map((it, ii) => {
      const key = `${gi}-${ii}`, on = !!checked[key];
      return `<label class="ing ${on ? "done" : ""}">
        <input class="check" type="checkbox" data-act="ing" data-k="${key}" ${on ? "checked" : ""} aria-label="${esc(it.name)}">
        <span class="q">${esc(qtyLabel(it, k))}</span>
        <span class="n">${esc(it.name)}${it.note && !/gusto/i.test(it.note) ? ` <small>· ${esc(it.note)}</small>` : ""}</span>
      </label>`;
    }).join("")}`).join("");

  const steps = (doc.steps || []).map((s, i) => {
    const cls = done[i] ? "done" : i === now ? "current" : "";
    return `<div class="step ${cls}" data-act="step" data-i="${i}" role="button" tabindex="0" aria-pressed="${!!done[i]}">
      <span class="num">${done[i] ? "✓" : i + 1}</span>
      <div><p>${esc(s.text)}</p>
      ${i === now && s.timer_min ? `<button class="timer-btn" data-act="cook-at" data-i="${i}">${ICON.clock} Temporizador ${clock(s.timer_min * 60)}</button>` : ""}</div>
    </div>`;
  }).join("");

  $app.innerHTML = `<header class="hero"><div class="hero-inner">
      <div class="row">
        <a class="icon-btn solid" href="#/" aria-label="Volver a recetas">${ICON.back}</a>
        <span class="pill dark">${esc(CAT_LABEL[doc.category] || "Otros")}${doc.cuisine ? ` · ${esc(doc.cuisine)}` : ""}</span>
        <button class="icon-btn solid" data-act="fav" aria-label="${state.fav[doc.id] ? "Quitar de favoritas" : "Guardar como favorita"}" aria-pressed="${!!state.fav[doc.id]}">${state.fav[doc.id] ? ICON.heartOn : ICON.heart}</button>
      </div>
      <h1 class="display">${esc(doc.title)}</h1>
      ${doc.summary ? `<p>${esc(doc.summary)}</p>` : ""}
      <div class="stats">
        <div class="stat"><b>${doc.time_min ? esc(doc.time_min < 60 ? `${doc.time_min}′` : fmtTime(doc.time_min)) : "—"}</b><span>tiempo</span></div>
        <div class="stat"><b>${esc(doc.difficulty || "—")}</b><span>dificultad</span></div>
        <div class="stat"><b>${nDone}/${(doc.steps || []).length}</b><span>pasos</span></div>
      </div>
    </div></header>
    <div class="detail">
      ${doc.macros ? `<section style="display:flex;flex-direction:column;gap:10px">
        <div class="row"><h2 class="sec-title lg">Macros</h2><span class="hello muted">por ${esc(doc.macros.per || "porción")} · aprox.</span></div>
        <div class="macros">
          <div class="kcal"><b>${Math.round(doc.macros.kcal)}</b><span>kcal</span></div>
          <div><b>${Math.round(doc.macros.protein)} g</b><span>proteína</span></div>
          <div><b>${Math.round(doc.macros.carbs)} g</b><span>carbos</span></div>
          <div><b>${Math.round(doc.macros.fat)} g</b><span>grasa</span></div>
        </div>
      </section>` : ""}
      <section style="display:flex;flex-direction:column;gap:2px">
        <div class="row" style="padding-bottom:6px">
          <h2 class="sec-title lg">Ingredientes</h2>
          ${doc.servings ? `<div class="stepper">
            <button data-act="serv" data-d="-1" aria-label="Menos porciones">−</button>
            <output aria-live="polite">${cur} porc.</output>
            <button data-act="serv" data-d="1" aria-label="Más porciones">+</button></div>` : ""}
        </div>
        ${groups}
        <button class="btn yellow wide" style="margin-top:18px" data-act="to-shop" ${miss.length ? "" : "disabled"}>${ICON.bag}
          ${miss.length ? `Mandar ${miss.length} ${miss.length === 1 ? "faltante" : "faltantes"} a compras` : "Tienes todo"}</button>
      </section>
      <section class="steps">
        <h2 class="sec-title lg" style="margin-bottom:6px">Preparación</h2>
        ${steps}
        ${nDone ? `<button class="link-btn" data-act="reset-steps">Reiniciar pasos</button>` : ""}
      </section>
      ${(doc.tips || []).length ? `<aside class="tip"><span class="sec-title" style="font-size:18px">Truco</span>${doc.tips.map((t) => `<p>${esc(t)}</p>`).join("")}</aside>` : ""}
      <div class="pills" style="align-items:center">
        ${(doc.tags || []).map((t) => `<span class="pill line">${esc(t)}</span>`).join("")}
        <span class="muted" style="font-size:13px">Guardada desde Claude · ${esc(fmtDate(doc.created))}</span>
      </div>
    </div>
    <div class="cook-bar"><button class="btn-cook" data-act="cook-at" data-i="${now ?? 0}">
      <b>Modo cocina</b><span>${now == null ? "Ver desde el inicio" : `Paso ${now + 1} de ${doc.steps.length}`}</span></button></div>`;

  $app.onclick = async (e) => {
    const t = e.target.closest("[data-act]");
    if (!t) return;
    const act = t.dataset.act;
    if (act === "ing") return; // lo maneja onchange
    if (act === "fav") { state.fav[doc.id] = !state.fav[doc.id]; if (!state.fav[doc.id]) delete state.fav[doc.id]; save(); return viewRecipe(id); }
    if (act === "serv") { state.servings[doc.id] = Math.max(1, Math.min(40, cur + Number(t.dataset.d))); save(); return viewRecipe(id); }
    if (act === "step") {
      const i = t.dataset.i, d = state.steps[doc.id] || (state.steps[doc.id] = {});
      d[i] ? delete d[i] : (d[i] = true); save(); return viewRecipe(id);
    }
    if (act === "reset-steps") { delete state.steps[doc.id]; save(); return viewRecipe(id); }
    if (act === "cook-at") { e.stopPropagation(); location.hash = `#/cocina/${doc.id}/${Number(t.dataset.i) + 1}`; return; }
    if (act === "to-shop") {
      const n = addToShop(doc, miss);
      toast(n ? `${n} ${n === 1 ? "ingrediente agregado" : "ingredientes agregados"} a compras` : "Ya estaban en tu lista");
    }
  };
  $app.onchange = (e) => {
    const t = e.target.closest('[data-act="ing"]');
    if (!t) return;
    const c = state.ing[doc.id] || (state.ing[doc.id] = {});
    t.checked ? (c[t.dataset.k] = true) : delete c[t.dataset.k];
    save(); viewRecipe(id);
  };
  $app.onkeydown = (e) => {
    if ((e.key === "Enter" || e.key === " ") && e.target.matches(".step")) { e.preventDefault(); e.target.click(); }
  };
}

// Modo cocina
const timer = { id: null, step: null, total: 0, left: 0, running: false, tick: null, ringing: false };
let wakeLock = null;
let audioCtx = null;
async function keepAwake() {
  try { if ("wakeLock" in navigator && !wakeLock) { wakeLock = await navigator.wakeLock.request("screen"); wakeLock.addEventListener("release", () => (wakeLock = null)); } } catch { /* no disponible */ }
}
function releaseAwake() { try { wakeLock?.release(); } catch { /* ya liberado */ } wakeLock = null; }
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && location.hash.startsWith("#/cocina")) keepAwake(); });

function beep() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const t0 = audioCtx.currentTime;
    for (let i = 0; i < 3; i++) {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.frequency.value = 880; o.connect(g); g.connect(audioCtx.destination);
      g.gain.setValueAtTime(0.0001, t0 + i * 0.45);
      g.gain.exponentialRampToValueAtTime(0.35, t0 + i * 0.45 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.45 + 0.3);
      o.start(t0 + i * 0.45); o.stop(t0 + i * 0.45 + 0.32);
    }
  } catch { /* sin audio */ }
  try { navigator.vibrate?.([300, 150, 300, 150, 300]); } catch { /* sin vibración */ }
}
function stopTick() { clearInterval(timer.tick); timer.tick = null; timer.running = false; }
function paintTimer() {
  const c = document.getElementById("clock");
  if (!c) return;
  c.textContent = clock(timer.left);
  c.classList.toggle("ring", timer.ringing);
  const p = document.getElementById("playBtn");
  if (p) { p.innerHTML = timer.running ? ICON.pause : ICON.play; p.setAttribute("aria-label", timer.running ? "Pausar temporizador" : "Iniciar temporizador"); }
  const s = document.getElementById("timerSub");
  if (s) s.textContent = timer.ringing ? "¡Listo! Pasa al siguiente paso" : timer.running ? "Corriendo…" : "Temporizador del paso";
}
function startTick() {
  timer.running = true;
  const endAt = Date.now() + timer.left * 1000;
  timer.tick = setInterval(() => {
    timer.left = Math.max(0, (endAt - Date.now()) / 1000);
    if (timer.left <= 0) { stopTick(); timer.ringing = true; beep(); }
    paintTimer();
  }, 250);
}

async function viewCook(id, n) {
  const entry = findRecipe(id);
  if (!entry) return viewMissing();
  const doc = await loadDoc(entry);
  const steps = doc.steps || [];
  const i = Math.min(Math.max(0, (Number(n) || 1) - 1), steps.length - 1);
  const s = steps[i];
  setChrome({ cooking: true });
  keepAwake();
  if (timer.id !== id || timer.step !== i) {
    stopTick();
    Object.assign(timer, { id, step: i, total: (s.timer_min || 0) * 60, left: (s.timer_min || 0) * 60, ringing: false });
  }
  const k = factor(doc);
  const ings = flatIngredients(doc);
  const uses = (s.uses || []).map((u) => ings.find((it) => norm(it.name) === norm(u)) || { name: u, qty: null });
  const done = doneSteps(doc.id);
  const last = i === steps.length - 1;

  $app.innerHTML = `<div class="cook">
    <div class="row">
      <a class="icon-btn" href="#/receta/${esc(doc.id)}" aria-label="Salir del modo cocina">${ICON.close}</a>
      <span style="font-family:var(--f-display);font-weight:800;font-size:15px">${esc(doc.title)}</span>
      <span style="font-weight:700;font-size:14px;color:var(--yellow)">${i + 1} / ${steps.length}</span>
    </div>
    <div class="progress" style="grid-template-columns:repeat(${steps.length},minmax(0,1fr))">
      ${steps.map((_, j) => `<span class="${j === i ? "now" : done[j] || j < i ? "done" : ""}"></span>`).join("")}
    </div>
    <div style="display:flex;flex-direction:column;gap:14px">
      <span class="big-num">${String(i + 1).padStart(2, "0")}</span>
      <p class="text">${esc(s.text)}</p>
    </div>
    ${uses.length ? `<div style="display:flex;flex-direction:column;gap:8px">
      <span class="label">Usas en este paso</span>
      <div class="pills">${uses.map((u) => `<span class="pill y">${esc([qtyLabel(u, k), u.name].filter(Boolean).join(" "))}</span>`).join("")}</div>
    </div>` : ""}
    ${s.timer_min ? `<div class="timer">
      <span style="flex:1;min-width:0"><span class="clock" id="clock">${clock(timer.left)}</span><small id="timerSub">Temporizador del paso</small></span>
      <button class="reset" data-act="t-reset" aria-label="Reiniciar temporizador">${ICON.reset}</button>
      <button class="play" id="playBtn" data-act="t-toggle" aria-label="Iniciar temporizador">${ICON.play}</button>
    </div>` : `<div style="margin-top:auto"></div>`}
    <div class="cook-nav">
      <button class="prev" data-act="prev" ${i === 0 ? "disabled" : ""}>← Anterior</button>
      <button class="next" data-act="next">${last ? "Terminar ✓" : "Siguiente →"}</button>
    </div>
    <span class="foot">${"wakeLock" in navigator ? "La pantalla se mantiene encendida" : "Ajusta el bloqueo automático para que la pantalla no se apague"}</span>
  </div>`;
  paintTimer();

  $app.onchange = null; $app.onkeydown = null;
  $app.onclick = (e) => {
    const t = e.target.closest("[data-act]");
    if (!t) return;
    const act = t.dataset.act;
    if (act === "t-toggle") {
      try { audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); audioCtx.resume?.(); } catch { /* sin audio */ }
      if (timer.ringing || timer.left <= 0) { timer.left = timer.total; timer.ringing = false; }
      timer.running ? stopTick() : startTick();
      paintTimer();
    }
    if (act === "t-reset") { stopTick(); timer.left = timer.total; timer.ringing = false; paintTimer(); }
    if (act === "prev" && i > 0) location.hash = `#/cocina/${doc.id}/${i}`;
    if (act === "next") {
      const d = state.steps[doc.id] || (state.steps[doc.id] = {});
      d[i] = true; save();
      if (last) { stopTick(); releaseAwake(); toast("¡Buen provecho!"); location.hash = `#/receta/${doc.id}`; }
      else location.hash = `#/cocina/${doc.id}/${i + 2}`;
    }
  };
}

// Compras
let confirmClear = false;
function viewShop() {
  setChrome({ tab: "compras" });
  const pend = pendingShop();
  const bought = state.shop.filter((s) => s.done);
  const titleOf = (rid) => findRecipe(rid)?.title || "Receta";
  const recipeIds = [...new Set(pend.flatMap((s) => s.recipes))];

  const row = (s) => `<label class="item ${s.done ? "done" : ""}">
      <input class="check" type="checkbox" data-act="toggle" data-id="${s.id}" ${s.done ? "checked" : ""} aria-label="${esc(s.name)}">
      <span style="min-width:0"><span class="nm">${esc(cap(s.name))}</span>${s.recipes.length ? `<span class="src">${esc(s.recipes.map(titleOf).join(" · "))}</span>` : `<span class="src">Agregado a mano</span>`}</span>
      <span class="q">${esc([fmtQty(s.qty), s.unit].filter(Boolean).join(" "))}</span>
      <button class="x" data-act="remove" data-id="${s.id}" aria-label="Quitar ${esc(s.name)}">${ICON.x}</button>
    </label>`;

  let groups = [];
  if (state.shopMode === "receta") {
    groups = recipeIds.map((rid) => ({ title: titleOf(rid), items: pend.filter((s) => s.recipes[0] === rid) }));
    const manual = pend.filter((s) => !s.recipes.length);
    if (manual.length) groups.push({ title: "A mano", items: manual });
  } else {
    groups = AISLE_ORDER.map((a) => ({ title: AISLE_LABEL[a], items: pend.filter((s) => (s.aisle || "otros") === a) }));
  }
  groups = groups.filter((g) => g.items.length);

  $app.innerHTML = `<div class="screen">
    <div class="row" style="align-items:flex-end">
      <div style="display:flex;flex-direction:column;gap:6px">
        <span class="hello">${pend.length ? `${pend.length} por comprar` : "Nada pendiente"}${recipeIds.length ? ` · <span class="accent">${recipeIds.length} ${recipeIds.length === 1 ? "receta" : "recetas"}</span>` : ""}</span>
        <h1 class="display" style="font-size:52px">Compras</h1>
      </div>
      <button class="icon-btn" data-act="share" aria-label="Compartir lista" ${pend.length ? "" : "disabled"}>${ICON.share}</button>
    </div>
    ${recipeIds.length ? `<div class="pills">${recipeIds.map((rid) => `<a class="pill c-${esc(findRecipe(rid)?.category || "otros")}" href="#/receta/${esc(rid)}">${esc(titleOf(rid))}</a>`).join("")}</div>` : ""}
    <form class="add-row" id="addForm" autocomplete="off">
      <input id="addInput" type="text" placeholder="Agregar algo más (ej. 2 limones)" aria-label="Agregar ítem">
      <button type="submit" aria-label="Agregar">+</button>
    </form>
    ${pend.length ? `<div class="seg" role="group" aria-label="Agrupar">
      <button data-act="mode" data-v="puesto" aria-pressed="${state.shopMode !== "receta"}">Por puesto</button>
      <button data-act="mode" data-v="receta" aria-pressed="${state.shopMode === "receta"}">Por receta</button>
    </div>` : ""}
    ${groups.map((g) => `<section>
      <div class="aisle-head"><h2>${esc(g.title)}</h2><span class="count">${g.items.length}</span></div>
      ${g.items.map(row).join("")}
    </section>`).join("")}
    ${!state.shop.length ? `<div class="empty"><b>Tu lista está vacía</b><span>Abre una receta y toca “Mandar faltantes a compras”, o agrega algo arriba.</span></div>` : ""}
    ${bought.length ? `<section>
      <div class="aisle-head"><h2>Comprado</h2><span class="count" style="background:var(--cream-2)">${bought.length}</span></div>
      ${bought.map(row).join("")}
    </section>` : ""}
    ${state.shop.length ? `<div id="clearZone">${confirmClear
      ? `<div class="confirm">¿Vaciar toda la lista? <button class="yes" data-act="clear-all">Sí, vaciar</button><button class="no" data-act="clear-no">No</button></div>`
      : `<div class="row" style="justify-content:flex-start;gap:18px">${bought.length ? `<button class="link-btn" data-act="clear-done">Quitar comprados</button>` : ""}<button class="link-btn" data-act="clear-ask">Vaciar lista</button></div>`}</div>` : ""}
  </div>`;

  document.getElementById("addForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const v = document.getElementById("addInput").value.trim();
    if (!v) return;
    const m = v.match(/^(\d+(?:[.,]\d+)?)\s+(.+)$/);
    const qty = m ? Number(m[1].replace(",", ".")) : null;
    const name = m ? m[2] : v;
    state.shop.push({ key: `${norm(name)}|`, name, unit: "", qty, aisle: "otros", recipes: [], done: false, id: Math.random().toString(36).slice(2, 9) });
    save(); viewShop();
    document.getElementById("addInput").focus();
  });
  $app.onkeydown = null;
  $app.onchange = (e) => {
    const t = e.target.closest('[data-act="toggle"]');
    if (!t) return;
    const s = state.shop.find((x) => x.id === t.dataset.id);
    if (s) { s.done = t.checked; save(); viewShop(); }
  };
  $app.onclick = async (e) => {
    const t = e.target.closest("[data-act]");
    if (!t || t.dataset.act === "toggle") return;
    const act = t.dataset.act;
    if (act === "remove") { e.preventDefault(); state.shop = state.shop.filter((x) => x.id !== t.dataset.id); save(); return viewShop(); }
    if (act === "mode") { state.shopMode = t.dataset.v; save(); return viewShop(); }
    if (act === "clear-done") { state.shop = state.shop.filter((x) => !x.done); save(); return viewShop(); }
    if (act === "clear-ask") { confirmClear = true; return viewShop(); }
    if (act === "clear-no") { confirmClear = false; return viewShop(); }
    if (act === "clear-all") { confirmClear = false; state.shop = []; save(); toast("Lista vaciada"); return viewShop(); }
    if (act === "share") {
      const lines = AISLE_ORDER.map((a) => {
        const it = pendingShop().filter((s) => (s.aisle || "otros") === a);
        return it.length ? `*${AISLE_LABEL[a]}*\n` + it.map((s) => `• ${[fmtQty(s.qty), s.unit, s.name].filter(Boolean).join(" ")}`).join("\n") : "";
      }).filter(Boolean);
      const text = `Lista de compras · Sazoni\n\n${lines.join("\n\n")}`;
      try {
        if (navigator.share) { await navigator.share({ text }); return; }
      } catch (err) { if (err?.name === "AbortError") return; }
      try { await navigator.clipboard.writeText(text); toast("Lista copiada, pégala en WhatsApp"); }
      catch { toast("No se pudo copiar la lista"); }
    }
  };
}

// Notas
let noteFilter = "todo";
function viewNotes() {
  setChrome({ tab: "notas" });
  const all = index.notas;
  const nGuias = all.filter((n) => n.type === "guia").length;
  const list = all.filter((n) => noteFilter === "todo" || n.type === noteFilter);
  $app.innerHTML = `<div class="screen">
    <div style="display:flex;flex-direction:column;gap:6px">
      <span class="hello">${all.length - nGuias} ${all.length - nGuias === 1 ? "nota" : "notas"} · <span class="accent">${nGuias} ${nGuias === 1 ? "guía" : "guías"}</span></span>
      <h1 class="display" style="font-size:52px">Notas</h1>
    </div>
    <div class="chips" role="group" aria-label="Filtrar">
      ${[["todo", "Todo", ""], ["guia", "Guías", "c-entradas"], ["nota", "Notas", "outline"]].map(([v, l, c]) => `<button class="chip ${c}" data-act="nfilter" data-v="${v}" aria-pressed="${noteFilter === v}">${l}</button>`).join("")}
    </div>
    ${list.length ? list.map((n) => `<a class="note ${n.type}" href="#/nota/${esc(n.id)}">
      <span class="meta"><span>${n.type === "guia" ? `Guía${n.step_count ? ` · ${n.step_count} pasos` : ""}` : "Nota"}</span><span>${esc(fmtDate(n.created))}</span></span>
      <span class="t">${esc(n.title)}</span>
      ${n.summary ? `<span class="s">${esc(n.summary)}</span>` : ""}
    </a>`).join("") : `<div class="empty"><b>Sin notas todavía</b><span>Dile a Claude “guarda esto como nota” o “como guía”.</span></div>`}
  </div>`;
  $app.onchange = null; $app.onkeydown = null;
  $app.onclick = (e) => {
    const t = e.target.closest('[data-act="nfilter"]');
    if (t) { noteFilter = t.dataset.v; viewNotes(); }
  };
}

async function viewNote(id) {
  const entry = findNote(id);
  if (!entry) return viewMissing();
  const doc = await loadDoc(entry);
  setChrome({});
  const paras = String(doc.body || "").split(/\n{2,}/).filter(Boolean);
  $app.innerHTML = `<header class="note-hero ${doc.type}"><div class="hero-inner">
      <a class="icon-btn" href="#/notas" aria-label="Volver a notas">${ICON.back}</a>
      <span class="pill dark" style="align-self:flex-start">${doc.type === "guia" ? "Guía" : "Nota"} · ${esc(fmtDate(doc.created))}</span>
      <h1 class="display">${esc(doc.title)}</h1>
      ${doc.summary ? `<p style="margin:0;font-weight:500">${esc(doc.summary)}</p>` : ""}
    </div></header>
    <div class="detail">
      ${(doc.steps || []).length ? `<section class="steps">${doc.steps.map((s, i) => `<div class="step" style="cursor:default"><span class="num">${i + 1}</span><p>${esc(s)}</p></div>`).join("")}</section>` : ""}
      ${paras.length ? `<div class="prose">${paras.map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("")}</div>` : ""}
      ${(doc.tags || []).length ? `<div class="pills">${doc.tags.map((t) => `<span class="pill line">${esc(t)}</span>`).join("")}</div>` : ""}
    </div>`;
  $app.onclick = null; $app.onchange = null; $app.onkeydown = null;
}

function viewMissing() {
  setChrome({ tab: "recetas" });
  $app.innerHTML = `<div class="screen"><div class="empty" style="margin-top:40px"><b>No encontramos esa ficha</b><span>Quizás se renombró o se borró.</span><a class="btn navy" href="#/" style="align-self:center;margin-top:8px">Ir a recetas</a></div></div>`;
}

// ---------- Router ----------
async function route() {
  const parts = (location.hash.replace(/^#\/?/, "") || "").split("/").filter(Boolean).map(decodeURIComponent);
  if (parts[0] !== "cocina") releaseAwake();
  $app.onclick = null; $app.onchange = null; $app.onkeydown = null;
  try {
    if (!index) await loadIndex();
    const [p, a, b] = parts;
    if (!p) viewHome();
    else if (p === "receta") await viewRecipe(a);
    else if (p === "cocina") await viewCook(a, b);
    else if (p === "compras") viewShop();
    else if (p === "notas") viewNotes();
    else if (p === "nota") await viewNote(a);
    else viewMissing();
  } catch (err) {
    console.error(err);
    setChrome({});
    $app.innerHTML = `<div class="screen"><div class="empty" style="margin-top:40px"><b>No se pudieron cargar las fichas</b><span>Revisa tu conexión y vuelve a intentar.</span><button class="btn navy" style="align-self:center;margin-top:8px" onclick="location.reload()">Reintentar</button></div></div>`;
  }
}
let lastPath = "";
window.addEventListener("hashchange", () => {
  const path = location.hash.split("/").slice(0, 3).join("/");
  const sameScreen = path === lastPath;
  lastPath = path;
  route().then(() => { if (!sameScreen) window.scrollTo(0, 0); });
});
// Se re-renderiza en sitio (sin mover el scroll) cuando el estado cambia dentro de la misma pantalla.
lastPath = location.hash.split("/").slice(0, 3).join("/");
updateBadge();
route();

// Recarga el índice al volver al app, por si Claude guardó algo nuevo.
document.addEventListener("visibilitychange", async () => {
  if (document.visibilityState !== "visible" || location.hash.startsWith("#/cocina")) return;
  try {
    const before = index?.updated;
    await loadIndex();
    if (index.updated !== before) { cache.clear(); route(); }
  } catch { /* sin conexión */ }
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
