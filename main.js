/* main.js - cleaned and focused for Freezemoment
   - fetch galleries.json
   - render collections & collection view with Back button
   - lightbox
   - preloader with SVG tracing animation
   - hero distortion (hot-air) that responds to mouse
*/

/* ---------- small helpers ---------- */
const $ = (q, root = document) => root.querySelector(q);
const $$ = (q, root = document) => Array.from((root || document).querySelectorAll(q));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const escapeHtml = (s = "") => String(s).replace(/[&<>"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c]));

/* ---------- DOM refs ---------- */
const preloader = $("#preloader");
const mainContent = $("#main-content");
const collectionsGrid = $("#collections-grid");
const portfolioSection = $("#portfolio");
const collectionViewSection = $("#collection-view");
const collectionContent = $("#collection-content");
const heroBg = $("#hero-bg");
const heroTitle = $("#hero-title");
const scrollIndicator = $("#scroll-indicator");

const lb = $("#lightbox");
const lbImage = $("#lb-image");
const lbCaption = $("#lb-caption");
const lbPrev = $("#lb-prev");
const lbNext = $("#lb-next");
const lbShare = $("#lb-share");
const lbClose = $("#lb-close");

let collections = [];
let activeCollection = null;
let lightboxState = { open:false, images:[], idx:0, label:"" };

/* ------------------ Preloader animation ------------------ */
function animatePreloader() {
  // stroke-trace the inline SVG text by toggling stroke-dasharray using getComputedTextLength fallback
  const svg = document.getElementById("preloader-svg");
  if (!svg) return Promise.resolve();

  // We'll animate <text> element by drawing a stroke using CSS transitions
  const txt = svg.querySelector("text");
  if (!txt) return Promise.resolve();

  // Create a duplicate path using getComputedTextLength trick (works with <text> by using stroke-dasharray)
  // Compute estimated length using bounding box width
  try {
    const bbox = txt.getBBox();
    const length = Math.max(1200, Math.round(bbox.width * 1.1));
    txt.style.strokeDasharray = length;
    txt.style.strokeDashoffset = length;
    txt.style.transition = "stroke-dashoffset 1.2s cubic-bezier(.2,.9,.2,1)";
    // trigger draw
    requestAnimationFrame(() => txt.style.strokeDashoffset = "0");
  } catch (e) {
    // fallback: just reveal
    txt.style.opacity = "1";
  }

  // tagline reveal stagger
  const taglines = Array.from(document.querySelectorAll(".tagline-line"));
  taglines.forEach((el, i) => {
    const delay = (i + 1) * 350;
    setTimeout(() => el.classList.add("show"), delay);
  });

  // wait for animation to finish then resolve
  return new Promise(resolve => {
    setTimeout(resolve, 1800);
  });
}

async function runPreloaderThenHide() {
  try {
    await animatePreloader();
  } catch (e) { /* ignore */ }

  // fade out
  preloader.classList.add("hidden");
  // allow transition to finish then remove from DOM flow
  setTimeout(() => {
    preloader.style.display = "none";
  }, 800);
}

/* ---------- Galleries fetch & render ---------- */
async function fetchGalleries(){
  try{
    const res = await fetch("/galleries/galleries.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    collections = Array.isArray(data) ? data : [];
  }catch(err){
    console.error("Failed to load galleries.json", err);
    collections = [];
  }
  renderCollections();
}

function renderCollections(){
  if (!collectionsGrid) return;
  collectionsGrid.innerHTML = "";
  if (!collections.length){
    collectionsGrid.innerHTML = `<div class="muted">No collections found.</div>`;
    return;
  }

  collections.forEach((c, idx) => {
    const coverThumb = c.coverThumb || c.cover || (c.images && (typeof c.images[0] === "string" ? c.images[0] : c.images[0].thumb)) || "/assets/hero.jpg";
    const count = (c.images && c.images.length) ? c.images.length : "—";
    const item = document.createElement("article");
    item.className = "masonry-item reveal";
    item.innerHTML = `
      <div class="ribbon">View</div>
      <img src="${escapeHtml(coverThumb)}" alt="${escapeHtml(c.label || "collection")}" loading="eager" decoding="async" />
      <div class="masonry-meta">
        <div>
          <div class="collection-title">${escapeHtml(c.label || "Untitled")}</div>
          <div class="collection-sub">${count} photos</div>
        </div>
        <div style="color:var(--gold)">•</div>
      </div>
    `;
    item.addEventListener("click", () => openCollection(c));
    collectionsGrid.appendChild(item);
    // small reveal stagger
    setTimeout(() => item.classList.add("is-visible"), 60 * idx);
  });
}

/* ----------------- Collection view & Back button ----------------- */
function openCollection(col){
  if (!collectionViewSection || !portfolioSection) return;
  activeCollection = col;
  portfolioSection.style.display = "none";
  collectionViewSection.style.display = "";
  renderCollectionIndex(col);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function closeCollectionView(){
  activeCollection = null;
  if (!collectionViewSection || !portfolioSection) return;
  collectionViewSection.style.display = "none";
  portfolioSection.style.display = "";
  window.scrollTo({ top: portfolioSection.offsetTop - 60, behavior: "smooth" });
}

function renderCollectionIndex(col){
  if (!collectionContent) return;
  collectionContent.innerHTML = "";

  // header with visible back button
  const header = document.createElement("div");
  header.className = "collection-header";
  header.innerHTML = `
    <div>
      <button class="back-btn-js" aria-label="Back to collections">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>
        Back to collections
      </button>
    </div>
    <div>
      <h3 style="margin:0">${escapeHtml(col.label || "Collection")}</h3>
    </div>
  `;
  header.querySelector(".back-btn-js").addEventListener("click", closeCollectionView);
  collectionContent.appendChild(header);

  // grid
  const grid = document.createElement("div");
  grid.className = "collection-grid";
  const imgs = Array.isArray(col.images) ? col.images : [];
  imgs.forEach((imgEntry, idx) => {
    const src = (typeof imgEntry === "string") ? imgEntry : (imgEntry.src || imgEntry.large || imgEntry.path || "");
    const thumb = (typeof imgEntry === "string") ? imgEntry : (imgEntry.thumb || imgEntry.small || imgEntry.src || src);
    const caption = (typeof imgEntry === "string") ? "" : (imgEntry.caption || "");
    const card = document.createElement("div");
    card.className = "collection-card";
    card.innerHTML = `
      <img class="grid-image" src="${escapeHtml(thumb || src)}" alt="${escapeHtml(caption || "")}" loading="lazy" />
      <div class="collection-card-meta" style="padding:10px;display:flex;justify-content:space-between;align-items:center;">
        <div style="color:#fff">${escapeHtml(caption || src.split('/').pop() || '')}</div>
        <div style="display:flex;gap:8px">
          <button class="lb-btn share-btn">Share</button>
          <button class="lb-btn link-btn">Link</button>
        </div>
      </div>
    `;
    const imgEl = card.querySelector("img");
    imgEl?.addEventListener("click", (e) => {
      e.stopPropagation();
      openLightbox(imgs, idx, col.label || "");
    });
    card.querySelector(".share-btn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      shareImage(src);
    });
    card.querySelector(".link-btn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      navigator.clipboard?.writeText(window.location.origin + src).then(()=>alert("Link copied")).catch(()=>prompt("Copy link", window.location.origin + src));
    });

    grid.appendChild(card);
  });

  collectionContent.appendChild(grid);
}

/* ----------------- Lightbox ----------------- */
function imagesToSrcArray(images){
  if (!images) return [];
  return images.map(i => typeof i === "string" ? i : i.src || i.large || i.path || "");
}

function openLightbox(images, idx = 0, label = ""){
  const srcs = imagesToSrcArray(images);
  if (!srcs.length || !lb) return;
  lightboxState = { open:true, images:srcs, idx:clamp(idx,0,srcs.length-1), label };
  lbImage.src = lightboxState.images[lightboxState.idx];
  lbCaption.textContent = `${label} — ${lightboxState.idx + 1} / ${lightboxState.images.length}`;
  lb.style.display = "flex";
}
function closeLightbox(){
  lightboxState = { open:false, images:[], idx:0, label:"" };
  if (!lb) return;
  lb.style.display = "none";
  lbImage.src = "";
}
function nextLightbox(){
  if (!lightboxState.open) return;
  lightboxState.idx = Math.min(lightboxState.idx + 1, lightboxState.images.length - 1);
  lbImage.src = lightboxState.images[lightboxState.idx];
  lbCaption.textContent = `${lightboxState.label} — ${lightboxState.idx + 1} / ${lightboxState.images.length}`;
}
function prevLightbox(){
  if (!lightboxState.open) return;
  lightboxState.idx = Math.max(lightboxState.idx - 1, 0);
  lbImage.src = lightboxState.images[lightboxState.idx];
  lbCaption.textContent = `${lightboxState.label} — ${lightboxState.idx + 1} / ${lightboxState.images.length}`;
}
function shareImage(path){
  const url = window.location.origin + path;
  if (navigator.share) {
    navigator.share({ title: "Photo — Freezemoment", url }).catch(()=>navigator.clipboard?.writeText(url).then(()=>alert("Link copied")));
  } else {
    navigator.clipboard?.writeText(url).then(()=>alert("Link copied")).catch(()=>prompt("Copy link", url));
  }
}

/* lightbox events */
lbClose?.addEventListener("click", closeLightbox);
lbPrev?.addEventListener("click", prevLightbox);
lbNext?.addEventListener("click", nextLightbox);
lbShare?.addEventListener("click", ()=>shareImage(lightboxState.images[lightboxState.idx] || ""));
if (lb) lb.addEventListener("click", (e) => { if (e.target === lb) closeLightbox(); });

/* ----------------- Hero: preload + distortion ----------------- */
/* simple hero image preload */
(function preloadHeroImage(){
  const im = new Image(); im.src = "/assets/hero.jpg"; im.decoding = "async"; im.loading = "eager";
})();

/* reveal hero text after intro (keeps behavior similar to previous) */
function revealHero(){
  heroTitle?.classList.add("is-visible");
  $$(".hero-sub, .cta-wrap").forEach(n => n?.classList?.add("is-visible"));
}
setTimeout(revealHero, 600);

/* hot-air distortion wiring */
const feTurb = document.getElementById("fm-feTurb");
const feDisp = document.getElementById("fm-feDisp");
const BASE_FREQ = 0.9;
const BASE_SCALE = 12;

if (feTurb) feTurb.setAttribute("baseFrequency", String(BASE_FREQ));
if (feDisp) feDisp.setAttribute("scale", String(BASE_SCALE));

let distortionRaf = 0;
function setDistortionFromMouse(mx, my){
  const freq = BASE_FREQ + Math.abs(mx) * 0.25;
  const scale = BASE_SCALE + Math.abs(my) * 18;
  if (feTurb) feTurb.setAttribute("baseFrequency", freq.toFixed(3));
  if (feDisp) feDisp.setAttribute("scale", Math.round(scale));
}
function resetDistortion(){
  if (feTurb) feTurb.setAttribute("baseFrequency", String(BASE_FREQ));
  if (feDisp) feDisp.setAttribute("scale", String(BASE_SCALE));
}

function onHeroMouseMove(e){
  if (!heroTitle) return;
  const rect = heroTitle.getBoundingClientRect();
  const cx = rect.left + rect.width/2;
  const cy = rect.top + rect.height/2;
  const mx = (e.clientX - cx) / (rect.width/2);
  const my = (e.clientY - cy) / (rect.height/2);
  const cmx = clamp(mx, -1, 1);
  const cmy = clamp(my, -1, 1);
  if (distortionRaf) cancelAnimationFrame(distortionRaf);
  distortionRaf = requestAnimationFrame(()=> setDistortionFromMouse(cmx, cmy));
}

if (heroTitle){
  // enable CSS filter usage by adding a class; we also dynamically toggle class on pointer enter/leave
  heroTitle.addEventListener("mouseenter", () => {
    heroTitle.classList.add("use-distort");
    setDistortionFromMouse(0.2, 0.2);
  });
  heroTitle.addEventListener("mousemove", onHeroMouseMove);
  heroTitle.addEventListener("mouseleave", () => {
    heroTitle.classList.remove("use-distort");
    resetDistortion();
  });
  // keyboard focus should also allow effect for accessibility
  heroTitle.addEventListener("focus", () => heroTitle.classList.add("use-distort"));
  heroTitle.addEventListener("blur", () => { heroTitle.classList.remove("use-distort"); resetDistortion(); });
}

/* throttled parallax for hero background */
let latestScrollY = 0, ticking = false;
window.addEventListener("scroll", () => {
  latestScrollY = window.scrollY || 0;
  if (!ticking) {
    window.requestAnimationFrame(()=> {
      if (heroBg) heroBg.style.transform = `translateY(${latestScrollY * 0.12}px)`;
      const header = document.getElementById("site-header");
      if (header) (latestScrollY > 28) ? header.classList.add("scrolled") : header.classList.remove("scrolled");
      ticking = false;
    });
    ticking = true;
  }
}, { passive:true });

/* scroll chevron behavior */
(function toggleChevronOnScroll(){
  const chevron = document.querySelector(".scroll-indicator");
  if (!chevron) return;
  const threshold = (window.innerHeight || 800) * 0.6;
  function update(){
    const y = window.scrollY || 0;
    chevron.style.opacity = y < threshold ? "1" : "0";
    chevron.style.pointerEvents = y < threshold ? "auto" : "none";
  }
  update();
  window.addEventListener("scroll", () => {
    if (window._chevRaf) cancelAnimationFrame(window._chevRaf);
    window._chevRaf = requestAnimationFrame(update);
  }, { passive:true });
})();

/* chevron click */
scrollIndicator?.addEventListener("click", () => {
  portfolioSection?.scrollIntoView({ behavior: "smooth", block: "start" });
});

/* ----------------- site menu accessible toggle (kept minimal) ----------------- */
(function siteMenuInit(){
  const toggle = document.getElementById("menu-toggle");
  const menu = document.getElementById("site-menu");
  const closeBtn = document.getElementById("menu-close");
  if (!toggle || !menu) return;
  const firstFocusableSelector = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
  let lastFocused = null;

  function openMenu(){
    lastFocused = document.activeElement;
    toggle.setAttribute("aria-expanded", "true");
    menu.classList.add("open");
    menu.setAttribute("aria-hidden","false");
    menu.style.display = "flex";
    document.body.style.overflow = "hidden";
    const first = menu.querySelector(firstFocusableSelector);
    if (first) first.focus();
    document.addEventListener("keydown", onKeyDown);
  }
  function closeMenu(){
    toggle.setAttribute("aria-expanded","false");
    menu.classList.remove("open");
    menu.setAttribute("aria-hidden","true");
    menu.style.display = "none";
    document.body.style.overflow = "";
    document.removeEventListener("keydown", onKeyDown);
    try{ lastFocused?.focus(); }catch(e){}
  }
  function onKeyDown(e){
    if (e.key === "Escape") { closeMenu(); return; }
    if (e.key === "Tab") {
      const focusables = Array.from(menu.querySelectorAll(firstFocusableSelector)).filter(n => n.offsetParent !== null);
      if (focusables.length === 0) return;
      const idx = focusables.indexOf(document.activeElement);
      if (e.shiftKey && idx === 0) { e.preventDefault(); focusables[focusables.length - 1].focus(); }
      else if (!e.shiftKey && idx === focusables.length - 1) { e.preventDefault(); focusables[0].focus(); }
    }
  }

  menu.addEventListener("click", (e) => { if (e.target === menu) closeMenu(); });
  toggle.addEventListener("click", ()=> toggle.getAttribute("aria-expanded")==="true" ? closeMenu() : openMenu());
  closeBtn?.addEventListener("click", closeMenu);

  menu.querySelectorAll(".menu-link").forEach(a => {
    a.addEventListener("click", (ev)=> {
      ev.preventDefault();
      const href = a.getAttribute("href");
      if (href && href.startsWith("#")) {
        const target = document.querySelector(href);
        if (target) target.scrollIntoView({ behavior:"smooth", block:"start" });
      }
      closeMenu();
    });
  });
})();

/* ----------------- small misc wiring ----------------- */
// delegation for dynamic back buttons if needed
document.addEventListener("click", (e) => {
  const tgt = e.target;
  if (tgt && tgt.matches && tgt.matches(".back-btn-js")) closeCollectionView();
});

// set current year if element exists
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* ---------- bootstrap ---------- */
(async function init(){
  // keep main content visible but preloader overlays it; run preloader animation then hide
  runPreloaderThenHide().catch(()=>{ preloader.style.display = "none"; });

  // load galleries and render
  await fetchGalleries();

  // expose API for debugging (optional)
  window._fm = { fetchGalleries, openCollection, closeCollectionView, openLightbox, closeLightbox };
})();
