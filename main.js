/* main.js - full replacement
   - inlines /assets/FM_logo.svg into #preloader-svg-wrap then runs Vivus
   - preloader fallback if Vivus missing
   - menu: closed on load; toggle + ESC + outside-click + focus handling
   - collections rendering (no 'View' ribbon)
   - collection view back button
   - lightbox basic wiring
   - hero distortion: only applies to SVG text via #hotair-turb and #hotair-disp
*/

/* ---------------- helpers ---------------- */
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) =>
    Array.from((root || document).querySelectorAll(s));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const escapeHtml = (s) =>
    String(s || "").replace(
        /[&<>"]/g,
        (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
    );

/* ---------------- DOM refs ---------------- */
const preloader = $("#preloader");
const preWrap = $("#preloader-svg-wrap");
const preName = $("#preloader-name");
const preTag = $("#preloader-tag");
const mainContent = $(".main-content") || document.getElementById("main");

const menuToggle = $("#menu-toggle");
const siteMenu = $("#site-menu");
const menuClose = $("#menu-close");

const heroText = $("#hero-text");
const heroBg = $("#hero-bg");
const header = $("#site-header");

const collectionsGrid = $("#collections-grid");
const portfolioSection = $("#portfolio");
const collectionViewSection = $("#collection-view");
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

/* ---------------- ensure menu closed on load ---------------- */
(function initMenuState() {
    if (siteMenu) {
        siteMenu.classList.remove("open");
        siteMenu.style.display = "none";
        siteMenu.setAttribute("aria-hidden", "true");
    }
    if (menuToggle) menuToggle.setAttribute("aria-expanded", "false");
})();

/* ----------------- Inline SVG logo into preloader and trace with Vivus ----------------- */
async function injectLogoAndTrace() {
    if (!preWrap) return simplePreloaderFallback();
    try {
        // fetch the SVG file and insert inline so Vivus can animate paths
        const resp = await fetch("/assets/FM_logo.svg", { cache: "no-store" });
        if (!resp.ok) throw new Error("SVG fetch failed");
        const text = await resp.text();

        // Parse returned SVG and give it a stable id for Vivus
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, "image/svg+xml");
        const svg = doc.documentElement;
        svg.setAttribute("id", "fm-logo-inline");
        // remove width/height to allow CSS sizing
        svg.removeAttribute("width");
        svg.removeAttribute("height");

        // clear placeholder and insert inline svg
        preWrap.innerHTML = "";
        preWrap.appendChild(document.importNode(svg, true));

        // run Vivus if available
        if (typeof Vivus !== "undefined") {
            try {
                new Vivus(
                    "fm-logo-inline",
                    {
                        type: "delayed",
                        duration: 160,
                        start: "autostart",
                        animTimingFunction: Vivus.EASE,
                    },
                    function () {
                        // reveal fills via class
                        const inline =
                            document.getElementById("fm-logo-inline");
                        if (inline) inline.classList.add("revealed");
                        if (preloader) preloader.classList.add("revealed");
                        // show texts briefly then hide preloader
                        setTimeout(() => {
                            if (preloader) preloader.classList.add("fade-out");
                            if (mainContent)
                                mainContent.style.display = "block";
                            if (preloader)
                                preloader.addEventListener(
                                    "transitionend",
                                    () => {
                                        preloader.style.display = "none";
                                    },
                                    { once: true }
                                );
                        }, 800);
                    }
                );
                // show texts a bit later
                setTimeout(() => {
                    preloader?.classList?.add("revealed");
                }, 420);
                return;
            } catch (e) {
                console.warn("Vivus failed, fallback", e);
            }
        }
        // fallback if Vivus missing
        simplePreloaderFallback();
    } catch (err) {
        console.warn("Inject logo failed, fallback preloader", err);
        simplePreloaderFallback();
    }
}
function simplePreloaderFallback() {
    // show name/tag for a brief moment and fade out
    preloader?.classList?.add("revealed");
    setTimeout(() => {
        preloader?.classList?.add("fade-out");
        if (mainContent) mainContent.style.display = "block";
        preloader?.addEventListener(
            "transitionend",
            () => (preloader.style.display = "none"),
            { once: true }
        );
    }, 900);
}

/* Start preloader injection on DOM ready */
document.addEventListener("DOMContentLoaded", () => {
    injectLogoAndTrace();
});

/* ---------------- Menu toggle & accessibility ---------------- */
(function setupMenu() {
    if (!menuToggle || !siteMenu) return;
    let lastFocus = null;
    const focusable =
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

    function openMenu() {
        lastFocus = document.activeElement;
        menuToggle.setAttribute("aria-expanded", "true");
        siteMenu.classList.add("open");
        siteMenu.style.display = "flex";
        siteMenu.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
        const first = siteMenu.querySelector(focusable);
        if (first) first.focus();
        document.addEventListener("keydown", trapKeys);
    }
    function closeMenu() {
        menuToggle.setAttribute("aria-expanded", "false");
        siteMenu.classList.remove("open");
        siteMenu.style.display = "none";
        siteMenu.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
        document.removeEventListener("keydown", trapKeys);
        try {
            lastFocus?.focus();
        } catch (e) {}
    }
    function trapKeys(e) {
        if (e.key === "Escape") {
            closeMenu();
            return;
        }
        if (e.key !== "Tab") return;
        const nodes = Array.from(siteMenu.querySelectorAll(focusable)).filter(
            (n) => n.offsetParent !== null
        );
        if (!nodes.length) return;
        const idx = nodes.indexOf(document.activeElement);
        if (e.shiftKey && idx === 0) {
            e.preventDefault();
            nodes[nodes.length - 1].focus();
        } else if (!e.shiftKey && idx === nodes.length - 1) {
            e.preventDefault();
            nodes[0].focus();
        }
    }

    menuToggle.addEventListener("click", () => {
        const open = menuToggle.getAttribute("aria-expanded") === "true";
        if (open) closeMenu();
        else openMenu();
    });
    menuClose?.addEventListener("click", closeMenu);
    siteMenu.addEventListener("click", (e) => {
        if (e.target === siteMenu) closeMenu();
    });
})();

/* ---------------- Hero parallax + header scrolled ---------------- */
(function heroParallax() {
    let lastY = 0,
        ticking = false;
    window.addEventListener(
        "scroll",
        () => {
            lastY = window.scrollY || 0;
            if (!ticking) {
                requestAnimationFrame(() => {
                    if (heroBg)
                        heroBg.style.transform = `translateY(${
                            lastY * 0.12
                        }px)`;
                    if (header) {
                        lastY > 28
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

    $("#scroll-indicator")?.addEventListener("click", () => {
        portfolioSection?.scrollIntoView({
            behavior: "smooth",
            block: "start",
        });
    });
})();

/* ---------------- Collections: fetch & render (no 'View' ribbon) ---------------- */
async function fetchGalleries() {
    try {
        const res = await fetch("/galleries/galleries.json", {
            cache: "no-store",
        });
        if (!res.ok) throw new Error("galleries.json failed");
        const data = await res.json();
        collections = Array.isArray(data) ? data : [];
    } catch (e) {
        console.warn("galleries load failed", e);
        collections = [];
    }
    renderCollections();
}

function imagesToThumbArray(images) {
    if (!images) return [];
    return images.map((i) =>
        typeof i === "string" ? i : i.thumb || i.small || i.src || ""
    );
}

function renderCollections() {
    if (!collectionsGrid) return;
    collectionsGrid.innerHTML = "";
    if (!collections.length) {
        collectionsGrid.innerHTML = `<div class="muted">No collections found.</div>`;
        return;
    }
    collections.forEach((c, i) => {
        const thumb =
            c.coverThumb ||
            c.cover ||
            imagesToThumbArray(c.images)[0] ||
            "/assets/hero.jpg";
        const count = c.images?.length || "—";
        const item = document.createElement("article");
        item.className = "masonry-item reveal";
        item.innerHTML = `
      <img src="${escapeHtml(thumb)}" alt="${escapeHtml(
            c.label || "collection"
        )}" loading="lazy" decoding="async" />
      <div class="masonry-meta">
        <div>
          <div class="collection-title">${escapeHtml(
              c.label || "Untitled"
          )}</div>
          <div class="collection-sub">${count} photos</div>
        </div>
        <div style="color:var(--gold)">•</div>
      </div>
    `;
        item.addEventListener("click", () => openCollection(c));
        collectionsGrid.appendChild(item);
        setTimeout(() => item.classList.add("is-visible"), 50 * i);
    });
}

/* ---------------- Collection view ---------------- */
function openCollection(col) {
    activeCollection = col;
    portfolioSection.style.display = "none";
    collectionViewSection.style.display = "";
    renderCollectionIndex(col);
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
function renderCollectionIndex(col) {
    if (!collectionContent) return;
    collectionContent.innerHTML = "";
    const header = document.createElement("div");
    header.className = "collection-header";
    header.innerHTML = `<button class="back-btn-js">← Back to collections</button><div><h3 style="margin:0">${escapeHtml(
        col.label || "Collection"
    )}</h3></div>`;
    header
        .querySelector(".back-btn-js")
        .addEventListener("click", closeCollectionView);
    collectionContent.appendChild(header);

    const grid = document.createElement("div");
    grid.className = "masonry";
    const imgs = Array.isArray(col.images) ? col.images : [];
    imgs.forEach((img) => {
        const url =
            typeof img === "string"
                ? img
                : img.src || img.large || img.path || "";
        const card = document.createElement("article");
        card.className = "masonry-item";
        card.innerHTML = `<img src="${escapeHtml(url)}" alt="${escapeHtml(
            col.label || ""
        )}" />`;
        card.addEventListener("click", () =>
            openLightbox(imgs, imgs.indexOf(img), col.label || "")
        );
        grid.appendChild(card);
    });
    collectionContent.appendChild(grid);
}

/* ---------------- Lightbox (minimal) ---------------- */
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

/* ---------------- Hot-air distortion (text only) ---------------- */
(function hotAir() {
    const feTurb = document.querySelector("#hotair-turb");
    const feDisp = document.querySelector("#hotair-disp");
    if (!heroText || !feTurb || !feDisp) return;

    const BASE_FREQ = 0.02;
    const BASE_SCALE = 0;
    feTurb.setAttribute("baseFrequency", String(BASE_FREQ));
    feDisp.setAttribute("scale", String(BASE_SCALE));

    function setDist(mx, my) {
        const freq =
            BASE_FREQ +
            Math.min(0.12, Math.abs(mx) * 0.08 + Math.abs(my) * 0.08);
        const scale = Math.round(
            BASE_SCALE + Math.min(36, (Math.abs(mx) + Math.abs(my)) * 20)
        );
        feTurb.setAttribute("baseFrequency", freq.toFixed(4));
        feDisp.setAttribute("scale", String(scale));
    }
    function resetDist() {
        feTurb.setAttribute("baseFrequency", String(BASE_FREQ));
        feDisp.setAttribute("scale", String(BASE_SCALE));
    }

    heroText.addEventListener("mousemove", (e) => {
        const rect = heroText.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const mx = (e.clientX - cx) / (rect.width / 2);
        const my = (e.clientY - cy) / (rect.height / 2);
        setDist(clamp(mx, -1, 1), clamp(my, -1, 1));
    });
    heroText.addEventListener("mouseenter", () => setDist(0.2, 0.2));
    heroText.addEventListener("mouseleave", resetDist);
})();

/* ---------------- Init ---------------- */
fetchGalleries();
