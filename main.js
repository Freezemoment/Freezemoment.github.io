/* main.js - rewritten
   - preloader: traces your inlined logo path (exact match)
   - better menu open/close + focus trap
   - fixed about layout (no DOM-breaks)
   - collections rendering + Back button
   - lightbox
   - robust hot-air distortion: continuous subtle turbulence + mouse push
*/

/* small helpers */
const $ = (q, r = document) => r.querySelector(q);
const $$ = (q, r = document) => Array.from((r || document).querySelectorAll(q));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const escapeHtml = (s) =>
    String(s || "").replace(
        /[&<>"]/g,
        (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
    );

/* DOM refs */
const preloader = $("#preloader");
const preStroke = $("#fm-stroke");
const preFilled = $("#fm-filled");
const preLines = $$(".preline");
const mainContent = $("#main-content");

const menuToggle = $("#menu-toggle");
const siteMenu = $("#site-menu");
const menuClose = $("#menu-close");

const heroTitle = $("#hero-title");
const heroBg = $("#hero-bg");
const fmTurb = document.getElementById("fmTurb");
const fmDisp = document.getElementById("fmDisp");

const collectionsGrid = $("#collections-grid");
const portfolioSection = $("#portfolio");
const collectionView = $("#collection-view");
const collectionContent = $("#collection-content");

const lb = $("#lightbox");
const lbImage = $("#lb-image");
const lbCaption = $("#lb-caption");
const lbPrev = $("#lb-prev");
const lbNext = $("#lb-next");
const lbClose = $("#lb-close");
const lbShare = $("#lb-share");

let collections = [];
let activeCollection = null;
let lightboxState = { open: false, images: [], idx: 0, label: "" };

/* ---------------- preloader trace ---------------- */
function runPreloader() {
    // stroke draw
    if (preStroke) {
        // compute path length (works for large dasharray)
        try {
            const len = preStroke.getTotalLength
                ? preStroke.getTotalLength()
                : 10000;
            preStroke.style.strokeDasharray = len;
            preStroke.style.strokeDashoffset = len;
            // small delay then draw
            requestAnimationFrame(() => {
                preStroke.style.strokeDashoffset = 0;
            });
        } catch (e) {
            // fallback: just fade
            preStroke.style.opacity = 1;
        }
    }
    // reveal tagline lines staggered
    preLines.forEach((el, i) =>
        setTimeout(() => el.classList.add("show"), 420 + i * 260)
    );

    // after trace, show filled logo then hide preloader
    setTimeout(() => {
        if (preFilled) preFilled.style.opacity = 1;
        // hide stroke elegantly
        if (preStroke)
            (preStroke.style.transition = "opacity .55s ease"),
                (preStroke.style.opacity = 0.22);
    }, 1250);

    // remove preloader after full beat
    setTimeout(() => {
        preloader.style.opacity = 0;
        preloader.style.visibility = "hidden";
        mainContent.setAttribute("aria-hidden", "false");
    }, 2000);
}

/* ---------------- galleries fetch + render ---------------- */
async function fetchGalleries() {
    try {
        const res = await fetch("/galleries/galleries.json", {
            cache: "no-store",
        });
        if (!res.ok) throw new Error("no galleries");
        const data = await res.json();
        collections = Array.isArray(data) ? data : [];
    } catch (e) {
        console.warn("galleries load failed", e);
        collections = [];
    }
    renderCollections();
}

function renderCollections() {
    if (!collectionsGrid) return;
    collectionsGrid.innerHTML = "";
    if (!collections.length) {
        collectionsGrid.innerHTML = `<div class="muted">No collections found.</div>`;
        return;
    }
    collections.forEach((c, idx) => {
        const thumb =
            c.coverThumb ||
            c.cover ||
            (c.images && c.images[0]
                ? typeof c.images[0] === "string"
                    ? c.images[0]
                    : c.images[0].thumb || c.images[0].src
                : "/assets/hero.jpg");
        const item = document.createElement("article");
        item.className = "masonry-item reveal";
        item.innerHTML = `
      <div class="ribbon">View</div>
      <img src="${escapeHtml(thumb)}" alt="${escapeHtml(
            c.label || "collection"
        )}" loading="lazy" decoding="async" />
      <div style="padding:12px;display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-weight:700">${escapeHtml(
              c.label || "Untitled"
          )}</div>
          <div class="muted">${
              (c.images && c.images.length) || "—"
          } photos</div>
        </div>
        <div style="color:var(--gold)">&bull;</div>
      </div>
    `;
        item.addEventListener("click", () => openCollection(c));
        collectionsGrid.appendChild(item);
        setTimeout(() => item.classList.add("is-visible"), 40 * idx);
    });
}

/* ---------------- collection + back button ---------------- */
function openCollection(col) {
    activeCollection = col;
    portfolioSection.style.display = "none";
    collectionView.style.display = "";
    renderCollection(col);
    window.scrollTo({ top: 0, behavior: "smooth" });
}
function closeCollection() {
    activeCollection = null;
    collectionView.style.display = "none";
    portfolioSection.style.display = "";
    window.scrollTo({
        top: portfolioSection.offsetTop - 80,
        behavior: "smooth",
    });
}
function renderCollection(col) {
    if (!collectionContent) return;
    collectionContent.innerHTML = "";
    const header = document.createElement("div");
    header.className = "collection-header";
    header.innerHTML = `
    <div>
      <button class="back-btn-js" aria-label="Back to collections">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M15 18l-6-6 6-6" fill="none" stroke="currentColor"/></svg>
        Back to collections
      </button>
    </div>
    <div><h3 style="margin:0">${escapeHtml(
        col.label || "Collection"
    )}</h3></div>
  `;
    header
        .querySelector(".back-btn-js")
        .addEventListener("click", closeCollection);
    collectionContent.appendChild(header);

    const grid = document.createElement("div");
    grid.className = "collection-grid";
    const imgs = Array.isArray(col.images) ? col.images : [];
    imgs.forEach((img, i) => {
        const src =
            typeof img === "string"
                ? img
                : img.src || img.large || img.path || "";
        const thumb =
            typeof img === "string"
                ? img
                : img.thumb || img.small || img.src || src;
        const caption = typeof img === "string" ? "" : img.caption || "";
        const card = document.createElement("div");
        card.innerHTML = `
      <img class="grid-image" src="${escapeHtml(thumb)}" alt="${escapeHtml(
            caption || ""
        )}" loading="lazy"/>
      <div style="padding:8px;display:flex;justify-content:space-between;align-items:center">
        <div style="color:#fff">${escapeHtml(
            caption || src.split("/").pop() || ""
        )}</div>
        <div style="display:flex;gap:8px">
          <button class="lb-btn view-btn">View</button>
        </div>
      </div>
    `;
        card.querySelector(".grid-image").addEventListener("click", () =>
            openLightbox(imgs, i, col.label || "")
        );
        card.querySelector(".view-btn").addEventListener("click", () =>
            openLightbox(imgs, i, col.label || "")
        );
        grid.appendChild(card);
    });
    collectionContent.appendChild(grid);
}

/* ---------------- lightbox ---------------- */
function imagesToSrcArray(images) {
    if (!images) return [];
    return images.map((i) =>
        typeof i === "string" ? i : i.src || i.large || i.path || ""
    );
}
function openLightbox(images, idx = 0, label = "") {
    const arr = imagesToSrcArray(images);
    if (!arr.length || !lb) return;
    lightboxState = {
        open: true,
        images: arr,
        idx: clamp(idx, 0, arr.length - 1),
        label,
    };
    lbImage.src = lightboxState.images[lightboxState.idx];
    lbCaption.textContent = `${label} — ${lightboxState.idx + 1} / ${
        lightboxState.images.length
    }`;
    lb.style.display = "flex";
}
function closeLightbox() {
    lightboxState = { open: false, images: [], idx: 0, label: "" };
    if (lb) lb.style.display = "none";
    lbImage.src = "";
}
function nextLightbox() {
    lightboxState.idx = Math.min(
        lightboxState.idx + 1,
        lightboxState.images.length - 1
    );
    lbImage.src = lightboxState.images[lightboxState.idx];
    lbCaption.textContent = `${lightboxState.label} — ${
        lightboxState.idx + 1
    } / ${lightboxState.images.length}`;
}
function prevLightbox() {
    lightboxState.idx = Math.max(lightboxState.idx - 1, 0);
    lbImage.src = lightboxState.images[lightboxState.idx];
    lbCaption.textContent = `${lightboxState.label} — ${
        lightboxState.idx + 1
    } / ${lightboxState.images.length}`;
}

lbClose?.addEventListener("click", closeLightbox);
lbPrev?.addEventListener("click", prevLightbox);
lbNext?.addEventListener("click", nextLightbox);
lbShare?.addEventListener("click", () => {
    const url =
        location.origin + (lightboxState.images[lightboxState.idx] || "");
    if (navigator.share)
        navigator
            .share({ title: "Photo — Freezemoment", url })
            .catch(() => navigator.clipboard?.writeText(url));
    else navigator.clipboard?.writeText(url).then(() => alert("Link copied"));
});
if (lb)
    lb.addEventListener("click", (e) => {
        if (e.target === lb) closeLightbox();
    });

/* ---------------- menu (accessible) ---------------- */
let lastFocused = null;
function openMenu() {
    lastFocused = document.activeElement;
    menuToggle.setAttribute("aria-expanded", "true");
    siteMenu.setAttribute("aria-hidden", "false");
    siteMenu.style.display = "flex";
    document.body.style.overflow = "hidden";
    const first = siteMenu.querySelector("a,button");
    if (first) first.focus();
    document.addEventListener("keydown", trapMenuTab);
}
function closeMenu() {
    menuToggle.setAttribute("aria-expanded", "false");
    siteMenu.setAttribute("aria-hidden", "true");
    siteMenu.style.display = "none";
    document.body.style.overflow = "";
    document.removeEventListener("keydown", trapMenuTab);
    try {
        lastFocused?.focus();
    } catch (e) {}
}
function trapMenuTab(e) {
    if (e.key === "Escape") {
        closeMenu();
        return;
    }
    if (e.key !== "Tab") return;
    const focusables = Array.from(siteMenu.querySelectorAll("a,button")).filter(
        (n) => n.offsetParent !== null
    );
    if (!focusables.length) return;
    const idx = focusables.indexOf(document.activeElement);
    if (e.shiftKey && idx === 0) {
        e.preventDefault();
        focusables[focusables.length - 1].focus();
    } else if (!e.shiftKey && idx === focusables.length - 1) {
        e.preventDefault();
        focusables[0].focus();
    }
}
menuToggle?.addEventListener("click", () =>
    menuToggle.getAttribute("aria-expanded") === "true"
        ? closeMenu()
        : openMenu()
);
menuClose?.addEventListener("click", closeMenu);
siteMenu?.addEventListener("click", (e) => {
    if (e.target === siteMenu) closeMenu();
});
siteMenu?.querySelectorAll(".menu-link").forEach((a) =>
    a.addEventListener("click", (ev) => {
        ev.preventDefault();
        const href = a.getAttribute("href");
        if (href && href.startsWith("#")) {
            const target = document.querySelector(href);
            if (target)
                target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        closeMenu();
    })
);

/* ---------------- hero reveal and parallax ---------------- */
setTimeout(() => {
    heroTitle?.classList.add("is-visible");
    $$(".hero-sub").forEach((n) => n?.classList?.add("is-visible"));
}, 600);

let latest = 0,
    tick = false;
window.addEventListener(
    "scroll",
    () => {
        latest = window.scrollY || 0;
        if (!tick) {
            requestAnimationFrame(() => {
                if (heroBg)
                    heroBg.style.transform = `translateY(${latest * 0.12}px)`;
                const header = document.getElementById("site-header");
                if (header)
                    latest > 28
                        ? header.classList.add("scrolled")
                        : header.classList.remove("scrolled");
                tick = false;
            });
            tick = true;
        }
    },
    { passive: true }
);

/* ---------------- improved hot-air distortion ---------------- */
/* Continuous subtle turbulence animation with mouse influence.
   fmTurb.baseFrequency is animated slowly, and mouse movement temporarily increases amplitude.
*/
const BASE_FREQ = 0.85;
const BASE_SCALE = 10;
let mouseBoost = 0;
let lastMoveAt = 0;

function setFilter(freq, scale) {
    if (fmTurb) fmTurb.setAttribute("baseFrequency", freq.toFixed(3));
    if (fmDisp) fmDisp.setAttribute("scale", Math.round(scale));
}

// animate turbulence continuously using rAF
let tStart = performance.now();
function animateTurb(now) {
    const t = (now - tStart) / 1000;
    // slow natural variation (sin + noise)
    const wiggle = Math.sin(t * 0.9) * 0.035 + Math.cos(t * 0.37) * 0.02;
    const freq = BASE_FREQ + wiggle + mouseBoost * 0.08;
    const scale = BASE_SCALE + Math.abs(wiggle) * 10 + mouseBoost * 18;
    setFilter(freq, scale);
    // decay mouse boost over time
    mouseBoost = Math.max(0, mouseBoost - 0.015);
    requestAnimationFrame(animateTurb);
}
requestAnimationFrame(animateTurb);

// mouse moves on hero push the effect
function onHeroMove(e) {
    const rect = heroTitle.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const mx = Math.abs((e.clientX - cx) / (rect.width / 2));
    const my = Math.abs((e.clientY - cy) / (rect.height / 2));
    const push = clamp((mx + my) / 2, 0, 1);
    mouseBoost = Math.max(mouseBoost, push * 1.6);
    lastMoveAt = Date.now();
}
heroTitle?.addEventListener("mouseenter", () =>
    heroTitle.classList.add("use-distort")
);
heroTitle?.addEventListener("mousemove", onHeroMove);
heroTitle?.addEventListener("mouseleave", () => {
    heroTitle.classList.remove("use-distort");
});

/* ---------------- collections + lightbox init ---------------- */
document.addEventListener("click", (e) => {
    if (e.target && e.target.matches && e.target.matches(".back-btn-js"))
        closeCollection();
});

// lightbox keyboard
document.addEventListener("keydown", (e) => {
    if (lb && lb.style.display === "flex") {
        if (e.key === "ArrowRight") nextLightbox();
        if (e.key === "ArrowLeft") prevLightbox();
        if (e.key === "Escape") closeLightbox();
    }
});

/* ---------------- scroll chevron ---------------- */
$("#scroll-indicator")?.addEventListener("click", () => {
    portfolioSection?.scrollIntoView({ behavior: "smooth", block: "start" });
});

/* ---------------- bootstrap ---------------- */
(async function init() {
    try {
        runPreloader();
    } catch (e) {
        preloader.style.display = "none";
        mainContent.setAttribute("aria-hidden", "false");
    }
    await fetchGalleries();
    // expose simple debug
    window._fm = {
        fetchGalleries,
        openCollection,
        closeCollection,
        openLightbox,
    };
})();
