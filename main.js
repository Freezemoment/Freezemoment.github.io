/* main.js - simplified, commented, fixes:
   - menu toggle (won't open on load)
   - preloader SVG tracing using Vivus
   - hero hot-air distortion applied only to hero text SVG filter
   - clean collection render (no 'View' ribbon) and visible back button
*/

/* --- helpers --- */
const el = (q, root = document) => root.querySelector(q);
const elAll = (q, root = document) =>
    Array.from((root || document).querySelectorAll(q));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const escapeHtml = (s = "") =>
    String(s).replace(
        /[&<>"]/g,
        (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
    );

/* --- DOM refs --- */
const menuToggle = el("#menu-toggle");
const siteMenu = el("#site-menu");
const menuClose = el("#menu-close");
const preloader = el(".preloader");
const fmLogo = el("#fm-logo");
const preName = el("#preloader-name");
const preTag = el("#preloader-tag");
const heroSvg = el("#hero-svg");
const heroText = el("#hero-text");
const collectionsGrid = el("#collections-grid");
const portfolioSection = el("#portfolio");
const collectionViewSection = el("#collection-view");
const collectionContent = el("#collection-content");
const scrollIndicator = el("#scroll-indicator");
const heroBg = el("#hero-bg");
const header = el("#site-header");
const yearEl = el("#year");

/* --- menu (accessible) --- */
(function initMenu() {
    if (!menuToggle || !siteMenu) return;

    function openMenu() {
        menuToggle.setAttribute("aria-expanded", "true");
        siteMenu.classList.add("open");
        siteMenu.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
        // focus trap: focus first focusable
        const first = siteMenu.querySelector(
            'a, button, [tabindex]:not([tabindex="-1"])'
        );
        if (first) first.focus();
    }
    function closeMenu() {
        menuToggle.setAttribute("aria-expanded", "false");
        siteMenu.classList.remove("open");
        siteMenu.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
        menuToggle.focus();
    }

    menuToggle.addEventListener("click", (e) => {
        const open = menuToggle.getAttribute("aria-expanded") === "true";
        if (open) closeMenu();
        else openMenu();
    });

    menuClose?.addEventListener("click", closeMenu);

    // close on outside click
    siteMenu.addEventListener("click", (ev) => {
        if (ev.target === siteMenu) closeMenu();
    });

    // close on ESC
    document.addEventListener("keydown", (ev) => {
        if (ev.key === "Escape" && siteMenu.classList.contains("open"))
            closeMenu();
    });

    // Ensure menu is closed on load — guard against being open
    siteMenu.classList.remove("open");
    siteMenu.setAttribute("aria-hidden", "true");
    menuToggle.setAttribute("aria-expanded", "false");
})();

/* --- Preloader & SVG tracing (Vivus) --- */
(function initPreloader() {
    if (!preloader || !fmLogo) {
        // if not present, just ensure main content visible
        document.querySelector(".main-content").style.display = "block";
        return;
    }

    // create Vivus to trace the logo (safe if Vivus not loaded, we fallback)
    const doReveal = () => {
        // mark svg as revealed (CSS shows fills) and show preloader texts
        fmLogo.classList.add("revealed");
        preloader.classList.add("revealed");

        // show preloader name & tag with a small stagger then hide preloader
        setTimeout(() => {
            preName?.classList.add("is-visible");
            preTag?.classList.add("is-visible");
        }, 120);

        // fade out preloader after a short pause (so user sees the reveal)
        setTimeout(() => {
            preloader.classList.add("fade-out");
            // make main visible
            document.querySelector(".main-content").style.display = "block";
            // remove preloader from flow after transitionend
            preloader.addEventListener(
                "transitionend",
                () => {
                    try {
                        preloader.style.display = "none";
                    } catch (e) {}
                },
                { once: true }
            );
        }, 900);
    };

    // If Vivus is available, use it. Otherwise fallback to a timed reveal.
    if (typeof Vivus !== "undefined") {
        // duration tuned to complexity — Vivus will iterate through path strokes
        try {
            new Vivus(
                "fm-logo",
                {
                    type: "delayed",
                    duration: 150,
                    start: "autostart",
                    animTimingFunction: Vivus.EASE,
                },
                function () {
                    // vivus complete
                    doReveal();
                }
            );
        } catch (e) {
            console.warn("Vivus failed, falling back", e);
            setTimeout(doReveal, 650);
        }
    } else {
        // fallback if vivus didn't load for some reason
        setTimeout(doReveal, 850);
    }

    // allow skipping preloader with ESC
    document.addEventListener("keydown", (ev) => {
        if (ev.key === "Escape" && !preloader.classList.contains("fade-out")) {
            preloader.classList.add("fade-out");
            document.querySelector(".main-content").style.display = "block";
        }
    });
})();

/* --- simple hero parallax + header scrolled state --- */
(function heroParallax() {
    let latestY = 0,
        ticking = false;
    window.addEventListener(
        "scroll",
        () => {
            latestY = window.scrollY || 0;
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    if (heroBg)
                        heroBg.style.transform = `translateY(${
                            latestY * 0.12
                        }px)`;
                    if (header) {
                        latestY > 28
                            ? header.classList.add("scrolled")
                            : header.classList.remove("scrolled");
                    }
                    ticking = false;
                });
                ticking = true;
            }
        },
        { passive: true }
    );

    scrollIndicator?.addEventListener("click", () => {
        portfolioSection?.scrollIntoView({
            behavior: "smooth",
            block: "start",
        });
    });
})();

/* --- Hot-air distortion applied only to hero text SVG filter --- */
(function hotAirInit() {
    // find the feTurbulence & feDisplacementMap inside the inline filter with id 'hotair'
    const feTurb = document.querySelector("#hotair feTurbulence");
    const feDisp = document.querySelector("#hotair feDisplacementMap");
    if (!heroText || !feTurb || !feDisp) return;

    const BASE_FREQ = 0.02; // subtle base turbulence
    const MAX_FREQ = 0.12;
    const BASE_SCALE = 0; // no displacement at rest
    const MAX_SCALE = 32; // max displacement

    feTurb.setAttribute("baseFrequency", String(BASE_FREQ));
    feDisp.setAttribute("scale", String(BASE_SCALE));

    let raf = 0;
    function setDist(mx, my) {
        const m = Math.sqrt(mx * mx + my * my);
        // map pointer distance to frequency & scale
        const freq =
            BASE_FREQ +
            Math.min(
                MAX_FREQ - BASE_FREQ,
                Math.abs(mx) * 0.08 + Math.abs(my) * 0.08
            );
        const scale = Math.round(
            BASE_SCALE +
                Math.min(
                    MAX_SCALE,
                    (Math.abs(mx) + Math.abs(my)) * (MAX_SCALE / 2)
                )
        );
        feTurb.setAttribute("baseFrequency", freq.toFixed(4));
        feDisp.setAttribute("scale", String(scale));
    }

    function resetDist() {
        feTurb.setAttribute("baseFrequency", String(BASE_FREQ));
        feDisp.setAttribute("scale", String(BASE_SCALE));
    }

    function onMove(e) {
        const rect = heroText.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const mx = (e.clientX - cx) / (rect.width / 2);
        const my = (e.clientY - cy) / (rect.height / 2);
        const cmx = clamp(mx, -1, 1);
        const cmy = clamp(my, -1, 1);
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => setDist(cmx, cmy));
    }

    heroText.addEventListener("mousemove", onMove);
    heroText.addEventListener("mouseenter", () => setDist(0.2, 0.2));
    heroText.addEventListener("mouseleave", resetDist);
})();

/* --- Collections fetching & rendering (cleaned) --- */
let collections = [];
async function fetchGalleries() {
    try {
        const res = await fetch("/galleries/galleries.json", {
            cache: "no-store",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        collections = Array.isArray(data) ? data : [];
        renderCollections();
        console.info("[gallery] loaded", collections.length, "collections");
    } catch (err) {
        console.error("[gallery] failed to load galleries.json", err);
        if (collectionsGrid)
            collectionsGrid.innerHTML = `<div class="muted">No collections available.</div>`;
    }
}

function renderCollections() {
    if (!collectionsGrid) return;
    collectionsGrid.innerHTML = "";
    if (!collections || collections.length === 0) {
        collectionsGrid.innerHTML = `<div class="muted">No collections found.</div>`;
        return;
    }

    collections.forEach((c, i) => {
        const coverThumb =
            c.coverThumb ||
            c.cover ||
            (c.images
                ? c.images[0].thumb || c.images[0].src
                : "/assets/hero.jpg");
        const count = c.images?.length ? c.images.length : "—";
        const item = document.createElement("article");
        item.className = "masonry-item reveal";
        item.setAttribute("role", "listitem");
        item.innerHTML = `
      <img src="${escapeHtml(coverThumb)}" alt="${escapeHtml(
            c.label
        )}" loading="eager" decoding="async" />
      <div class="masonry-meta">
        <div>
          <div class="collection-title">${escapeHtml(c.label)}</div>
          <div class="collection-sub">${count} photos</div>
        </div>
        <div style="color:var(--gold)">•</div>
      </div>
    `;
        item.addEventListener("click", () => openCollection(c));
        collectionsGrid.appendChild(item);
        setTimeout(() => item.classList.add("is-visible"), 60 * i);
    });
}

/* --- collection view: open/close and back button (visible) --- */
function openCollection(col) {
    if (!collectionViewSection || !portfolioSection) return;
    const headerHtml = `
    <div class="collection-header">
      <button class="back-btn-js" type="button">← Back to collections</button>
      <div style="flex:1"></div>
    </div>
  `;
    activeCollection = col;
    portfolioSection.style.display = "none";
    collectionViewSection.style.display = "";
    renderCollectionIndex(col, headerHtml);
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function closeCollectionView() {
    activeCollection = null;
    collectionViewSection.style.display = "none";
    portfolioSection.style.display = "";
    window.scrollTo({
        top: portfolioSection.offsetTop - 60,
        behavior: "smooth",
    });
}

function renderCollectionIndex(col, headerHtml = "") {
    if (!collectionContent) return;
    collectionContent.innerHTML = headerHtml || "";
    const header = collectionContent.querySelector(".collection-header");
    if (header) {
        const back = header.querySelector(".back-btn-js");
        if (back) back.addEventListener("click", closeCollectionView);
    }
    // show gallery grid (simple)
    const grid = document.createElement("div");
    grid.className = "masonry";
    const imgs = Array.isArray(col.images) ? col.images : [];
    imgs.forEach((img) => {
        const url =
            typeof img === "string"
                ? img
                : img.src || img.large || img.path || "";
        const elImg = document.createElement("article");
        elImg.className = "masonry-item";
        elImg.innerHTML = `<img src="${escapeHtml(url)}" alt="${escapeHtml(
            col.label
        )}" />`;
        grid.appendChild(elImg);
    });
    collectionContent.appendChild(grid);
}

/* click handler for dynamically created back button(s) */
document.addEventListener("click", (e) => {
    const t = e.target;
    if (t && t.matches && t.matches(".back-btn-js")) closeCollectionView();
});

/* set year if present */
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* init */
fetchGalleries();

/* small accessibility: close lightbox (if you keep the lightbox logic) */
const lbClose = el("#lb-close");
if (lbClose)
    lbClose.addEventListener("click", () => {
        const lb = el("#lightbox");
        if (lb) lb.style.display = "none";
    });
