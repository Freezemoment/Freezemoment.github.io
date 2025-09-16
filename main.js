/* main.js - vanilla JS for Freezemoment (complete)
   - Fetches /galleries/galleries.json
   - Renders collections and collection index
   - Lightbox with share/copy
   - Hero preload, intro overlay, throttled parallax
   - Hot-air distortion on hero title (updates inline SVG feTurbulence + feDisplacementMap)
*/

/* ----------------- Helpers ----------------- */
function el(q, root = document) {
    return root.querySelector(q);
}
function elAll(q, root = document) {
    return Array.from((root || document).querySelectorAll(q));
}
function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
}
function escapeHtml(s = "") {
    return String(s).replace(
        /[&<>"]/g,
        (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
    );
}
function imagesToSrcArray(images) {
    if (!images) return [];
    return images.map((i) =>
        typeof i === "string" ? i : i.src || i.large || i.path || i.file || ""
    );
}
function imagesToThumbArray(images) {
    if (!images) return [];
    return images.map((i) =>
        typeof i === "string" ? i : i.thumb || i.small || i.src || ""
    );
}
async function copyToClipboard(text) {
    if (navigator.clipboard) return navigator.clipboard.writeText(text);
    return new Promise((resolve, reject) => {
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        try {
            document.execCommand("copy");
            resolve();
        } catch (e) {
            reject(e);
        } finally {
            ta.remove();
        }
    });
}

/* ----------------- DOM refs ----------------- */
const collectionsGrid = el("#collections-grid");
const portfolioSection = el("#portfolio");
const collectionViewSection = el("#collection-view");
const collectionContent = el("#collection-content");
const heroBg = el("#hero-bg");
const heroTitle = el("#hero-title");
const introOverlay = el("#intro-overlay");
const scrollIndicator = el("#scroll-indicator");
const headerPortfolioBtn = el("#header-portfolio-btn");
const mobileNav = el("#mobile-nav");
const yearEl = el("#year");

const lb = el("#lightbox");
const lbImage = el("#lb-image");
const lbCaption = el("#lb-caption");
const lbPrev = el("#lb-prev");
const lbNext = el("#lb-next");
const lbShare = el("#lb-share");
const lbClose = el("#lb-close");

let collections = [];
let activeCollection = null;
let lightboxState = { open: false, images: [], idx: 0, label: "" };

/* ---------- full screen animation ---------- */
document.addEventListener("DOMContentLoaded", () => {
    const preloader = document.querySelector(".preloader");
    const mainContent = document.querySelector(".main-content");

    // Set a timeout for the animation duration
    // This should match your CSS animation durations
    setTimeout(() => {
        // Add the class to fade out the preloader
        preloader.classList.add("fade-out");

        // Once the fade-out animation is complete, remove the preloader from the DOM
        preloader.addEventListener(
            "transitionend",
            () => {
                preloader.style.display = "none";
                mainContent.style.display = "block"; // Show the main content
            },
            { once: true }
        );
    }, 3000); // Wait for 3 seconds (adjust based on your total animation time)
});

/* ----------------- Fetch & render galleries ----------------- */
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
        // graceful fallback: empty grid
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
            (c.images ? imagesToThumbArray(c.images)[0] : "/assets/hero.jpg");
        const count = c.images?.length ? c.images.length : "—";
        const item = document.createElement("article");
        item.className = "masonry-item reveal";
        item.setAttribute("role", "listitem");
        item.innerHTML = `
            <div class="ribbon">View</div>
            <img src="${escapeHtml(coverThumb)}" alt="${escapeHtml(
                        c.label
                    )}" loading="eager" decoding="async" fetchpriority="high" />
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
        // small reveal delay
        setTimeout(() => item.classList.add("is-visible"), 60 * i);
    });
}

/* ----------------- Collection view ----------------- */
function openCollection(col) {
    if (!collectionViewSection || !portfolioSection) return;
    activeCollection = col;
    portfolioSection.style.display = "none";
    collectionViewSection.style.display = "";
    renderCollectionIndex(col);
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function closeCollectionView() {
    if (!collectionViewSection || !portfolioSection) return;
    activeCollection = null;
    collectionViewSection.style.display = "none";
    portfolioSection.style.display = "";
    window.scrollTo({
        top: portfolioSection.offsetTop - 60,
        behavior: "smooth",
    });
}

function renderCollectionIndex(col) {
    if (!collectionContent) return;
    collectionContent.innerHTML = "";
    const header = document.createElement("div");
    header.className = "collection-header";
    collectionContent.appendChild(header);
    el("#back-to-collections", header)?.addEventListener(
        "click",
        closeCollectionView
    );

    const grid = document.createElement("div");
    grid.className = "collection-grid";
    // responsive columns will be handled by CSS; keep simple structure
    grid.style.display = "grid";
    grid.style.gap = "12px";
    grid.style.gridTemplateColumns = "repeat(2, 1fr)";
    if (window.innerWidth > 1100)
        grid.style.gridTemplateColumns = "repeat(3, 1fr)";

    (col.images || []).forEach((imgEntry, idx) => {
        const src =
            typeof imgEntry === "string"
                ? imgEntry
                : imgEntry.src || imgEntry.large || imgEntry.path || "";
        const thumb =
            typeof imgEntry === "string"
                ? imgEntry
                : imgEntry.thumb || imgEntry.small || imgEntry.src || src;
        const name =
            typeof imgEntry === "string"
                ? imgEntry.split("/").pop()
                : imgEntry.name ||
                  (imgEntry.src && imgEntry.src.split("/").pop());
        const caption =
            col.metadata?.captions?.[name] || imgEntry.caption || "";
        const card = document.createElement("div");
        card.className = "collection-card";
        card.innerHTML = `
      <img class="grid-image" src="${escapeHtml(
          thumb || src
      )}" alt="${escapeHtml(caption || name)}" loading="lazy" />
      <div class="collection-card-meta" style="padding:10px; display:flex; justify-content:space-between; align-items:center;">
        <div style="color:#fff">${escapeHtml(caption || name)}</div>
        <div style="display:flex; gap:8px">
          <button class="lb-btn share-btn">Share</button>
          <button class="lb-btn link-btn">Link</button>
        </div>
      </div>
    `;
        const imgEl = card.querySelector("img");
        imgEl?.addEventListener("click", () =>
            openLightbox(col.images, idx, col.label)
        );
        card.querySelector(".share-btn")?.addEventListener("click", (e) => {
            e.stopPropagation();
            shareImage(src);
        });
        card.querySelector(".link-btn")?.addEventListener("click", (e) => {
            e.stopPropagation();
            copyToClipboard(window.location.origin + src).then(() =>
                alert("Link copied")
            );
        });
        grid.appendChild(card);
    });

    collectionContent.appendChild(grid);
}

/* ----------------- Lightbox ----------------- */
function openLightbox(images, idx = 0, label = "") {
    const srcs = imagesToSrcArray(images);
    if (!srcs.length || !lb) return;
    lightboxState = {
        open: true,
        images: srcs,
        idx: clamp(idx, 0, srcs.length - 1),
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
    if (!lb) return;
    lb.style.display = "none";
    lbImage.src = "";
}
function nextLightbox() {
    if (!lightboxState.open) return;
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
    if (!lightboxState.open) return;
    lightboxState.idx = Math.max(lightboxState.idx - 1, 0);
    lbImage.src = lightboxState.images[lightboxState.idx];
    lbCaption.textContent = `${lightboxState.label} — ${
        lightboxState.idx + 1
    } / ${lightboxState.images.length}`;
}
function shareImage(path) {
    const url = window.location.origin + path;
    if (navigator.share) {
        navigator
            .share({ title: "Photo — Freezemoment", url })
            .catch(() => copyToClipboard(url).then(() => alert("Link copied")));
    } else {
        copyToClipboard(url)
            .then(() => alert("Link copied"))
            .catch(() => prompt("Copy link", url));
    }
}

/* lightbox wiring */
if (lbClose) lbClose.addEventListener("click", closeLightbox);
if (lbPrev) lbPrev.addEventListener("click", prevLightbox);
if (lbNext) lbNext.addEventListener("click", nextLightbox);
if (lbShare)
    lbShare.addEventListener("click", () =>
        shareImage(lightboxState.images[lightboxState.idx] || "")
    );

// click backdrop to close
if (lb)
    lb.addEventListener("click", (e) => {
        if (e.target === lb) closeLightbox();
    });

/* ----------------- Hero: preload, intro & perf ----------------- */
(function preloadHero() {
    try {
        const img = new Image();
        img.src = "/assets/hero.jpg";
        img.decoding = "async";
        img.loading = "eager";
    } catch (e) {
        /* ignore */
    }
})();

function playIntroThenReveal() {
    if (!introOverlay) return;
    // show overlay for a short moment then hide and reveal hero text
    setTimeout(() => {
        introOverlay.classList.add("hidden");
        heroTitle?.classList.add("is-visible");
        elAll(".hero-sub, .cta-wrap").forEach((n) =>
            n.classList.add("is-visible")
        );
    }, 850);
}
playIntroThenReveal();

/* throttled parallax using rAF */
let latestScrollY = 0;
let ticking = false;
window.addEventListener(
    "scroll",
    () => {
        latestScrollY = window.scrollY || 0;
        if (!ticking) {
            window.requestAnimationFrame(() => {
                if (heroBg)
                    heroBg.style.transform = `translateY(${
                        latestScrollY * 0.12
                    }px)`;
                const header = el("#site-header");
                if (header)
                    latestScrollY > 28
                        ? header.classList.add("scrolled")
                        : header.classList.remove("scrolled");
                ticking = false;
            });
            ticking = true;
        }
    },
    { passive: true }
);

/* header portfolio button */
if (headerPortfolioBtn)
    headerPortfolioBtn.addEventListener("click", (e) => {
        e.preventDefault();
        portfolioSection?.scrollIntoView({
            behavior: "smooth",
            block: "start",
        });
    });
if (scrollIndicator)
    scrollIndicator.addEventListener("click", () => {
        portfolioSection?.scrollIntoView({
            behavior: "smooth",
            block: "start",
        });
    });
if (mobileNav)
    mobileNav.addEventListener("change", (e) => {
        const id = e.target.value;
        const node = el(`#${id}`);
        if (node) node.scrollIntoView({ behavior: "smooth", block: "start" });
    });

/* ----------------- Hot-air distortion (hero title) ----------------- */
/* Finds the first feTurbulence and feDisplacementMap in the DOM (inline SVG expected near top of page) */
const feTurb = document.querySelector("feTurbulence");
const feDisp = document.querySelector("feDisplacementMap");
const BASE_FREQ = 0.9;
const BASE_SCALE = 12;

if (feTurb) feTurb.setAttribute("baseFrequency", String(BASE_FREQ));
if (feDisp) feDisp.setAttribute("scale", String(BASE_SCALE));

let distortionRaf = 0;
function setDistortionFromMouse(mx, my) {
    const freq = BASE_FREQ + Math.abs(mx) * 0.25; // tweakable
    const scale = BASE_SCALE + Math.abs(my) * 18;
    if (feTurb) feTurb.setAttribute("baseFrequency", freq.toFixed(3));
    if (feDisp) feDisp.setAttribute("scale", Math.round(scale));
}
function resetDistortion() {
    if (feTurb) feTurb.setAttribute("baseFrequency", String(BASE_FREQ));
    if (feDisp) feDisp.setAttribute("scale", String(BASE_SCALE));
}

function onHeroMouseMove(e) {
    if (!heroTitle) return;
    const rect = heroTitle.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const mx = (e.clientX - cx) / (rect.width / 2);
    const my = (e.clientY - cy) / (rect.height / 2);
    const cmx = clamp(mx, -1, 1);
    const cmy = clamp(my, -1, 1);
    if (distortionRaf) cancelAnimationFrame(distortionRaf);
    distortionRaf = requestAnimationFrame(() =>
        setDistortionFromMouse(cmx, cmy)
    );
}
if (heroTitle) {
    heroTitle.addEventListener("mousemove", onHeroMouseMove);
    heroTitle.addEventListener("mouseenter", () =>
        setDistortionFromMouse(0.2, 0.2)
    );
    heroTitle.addEventListener("mouseleave", resetDistortion);
}

/* ----------------- Misc UI wiring ----------------- */
// back-to-collections is created dynamically in collection view; event bound when element exists
document.addEventListener("click", (e) => {
    const elt = e.target;
    if (elt && elt.matches && elt.matches(".back-btn-js")) {
        closeCollectionView();
    }
});

// set year (if element present)
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* ----------------- Init ----------------- */
fetchGalleries();
// show chevron only when hero is mostly visible
(function toggleChevronOnScroll() {
    const chevron = document.querySelector(".scroll-indicator");
    if (!chevron) return;
    const threshold = (window.innerHeight || 800) * 0.6; // show while within top 60% of viewport
    function update() {
        const y = window.scrollY || 0;
        chevron.style.opacity = y < threshold ? "1" : "0";
        chevron.style.pointerEvents = y < threshold ? "auto" : "none";
    }
    update();
    window.addEventListener(
        "scroll",
        () => {
            // throttle with rAF style
            if (window._chevRaf) cancelAnimationFrame(window._chevRaf);
            window._chevRaf = requestAnimationFrame(update);
        },
        { passive: true }
    );
})();

/* ===== Site menu toggle + accessible focus-trap ===== */
(function siteMenuInit() {
    const toggle = document.getElementById("menu-toggle");
    const menu = document.getElementById("site-menu");
    const closeBtn = document.getElementById("menu-close");
    if (!toggle || !menu) return;

    const firstFocusableSelector =
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

    let lastFocusedBeforeOpen = null;

    function openMenu() {
        lastFocusedBeforeOpen = document.activeElement;
        toggle.setAttribute("aria-expanded", "true");
        menu.classList.add("open");
        menu.setAttribute("aria-hidden", "false");
        menu.style.display = "flex";
        // focus first focusable item inside menu
        const first = menu.querySelector(firstFocusableSelector);
        if (first) first.focus();
        // prevent body scroll
        document.body.style.overflow = "hidden";
        document.addEventListener("keydown", onKeyDown);
    }

    function closeMenu() {
        toggle.setAttribute("aria-expanded", "false");
        menu.classList.remove("open");
        menu.setAttribute("aria-hidden", "true");
        menu.style.display = "none";
        document.body.style.overflow = "";
        document.removeEventListener("keydown", onKeyDown);
        // restore focus
        try {
            if (lastFocusedBeforeOpen) lastFocusedBeforeOpen.focus();
        } catch (e) {}
    }

    function onKeyDown(e) {
        if (e.key === "Escape") {
            closeMenu();
            return;
        }
        if (e.key === "Tab") {
            // simple focus trap: keep focus inside menu
            const focusables = Array.from(
                menu.querySelectorAll(firstFocusableSelector)
            ).filter((n) => n.offsetParent !== null);
            if (focusables.length === 0) return;
            const idx = focusables.indexOf(document.activeElement);
            if (e.shiftKey && idx === 0) {
                e.preventDefault();
                focusables[focusables.length - 1].focus();
            } else if (!e.shiftKey && idx === focusables.length - 1) {
                e.preventDefault();
                focusables[0].focus();
            }
        }
    }

    // click outside to close (menu inner panel will stop propagation)
    menu.addEventListener("click", function (e) {
        if (e.target === menu) closeMenu();
    });

    toggle.addEventListener("click", function (e) {
        const open = toggle.getAttribute("aria-expanded") === "true";
        if (open) closeMenu();
        else openMenu();
    });

    closeBtn?.addEventListener("click", closeMenu);

    // close on internal link click and smooth-scroll to section
    menu.querySelectorAll(".menu-link").forEach((a) => {
        a.addEventListener("click", (ev) => {
            ev.preventDefault();
            const href = a.getAttribute("href");
            if (href && href.startsWith("#")) {
                const target = document.querySelector(href);
                if (target)
                    target.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                    });
            }
            closeMenu();
        });
    });
})();

/* Expose minimal API for dev debugging (optional) */
window._fm = {
    fetchGalleries,
    openCollection,
    closeCollectionView,
    openLightbox,
    closeLightbox,
};
