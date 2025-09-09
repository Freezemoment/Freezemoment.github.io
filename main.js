/* main.js - vanilla JS for the portfolio site */

/* ---------- helpers ---------- */
function imagesToSrcArray(images) {
    if (!images) return [];
    return images.map(img => (typeof img === 'string' ? img : (img.src || img.large || img.path || img.file)));
}
function imagesToThumbArray(images) {
    if (!images) return [];
    return images.map(img => (typeof img === 'string' ? img : (img.thumb || img.small || img.src)));
}
function el(q, root = document) { return root.querySelector(q); }
function elAll(q, root = document) { return Array.from(root.querySelectorAll(q)); }

/* ---------- DOM refs ---------- */
const collectionsGrid = document.getElementById('collections-grid');
const collectionViewSection = document.getElementById('collection-view');
const collectionContent = document.getElementById('collection-content');
const portfolioSection = document.getElementById('portfolio');
const heroBg = document.getElementById('hero-bg');
const heroTitle = document.getElementById('hero-title');
const ctaView = document.getElementById('cta-view');
const scrollIndicator = document.getElementById('scroll-indicator');
const yearEl = document.getElementById('year');

/* lightbox refs */
const lb = document.getElementById('lightbox');
const lbImage = document.getElementById('lb-image');
const lbCaption = document.getElementById('lb-caption');
const lbPrev = document.getElementById('lb-prev');
const lbNext = document.getElementById('lb-next');
const lbShare = document.getElementById('lb-share');
const lbClose = document.getElementById('lb-close');

let collections = []; // loaded collections
let activeCollection = null;
let lightboxState = { open: false, images: [], idx: 0 };

/* ---------- fetch & render ---------- */
async function fetchGalleries() {
    try {
        const res = await fetch('/galleries/galleries.json', { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        collections = Array.isArray(data) ? data : [];
        renderCollections();
        console.info('[gallery] JSON loaded', collections.length, 'collections');
    } catch (err) {
        console.error('Failed to load galleries.json', err);
    }
}

/* render collection tiles */
function renderCollections() {
    collectionsGrid.innerHTML = '';
    if (!collections || collections.length === 0) {
        collectionsGrid.innerHTML = `<div class="muted">No collections found.</div>`;
        return;
    }

    collections.forEach((c, i) => {
        const cover = c.coverThumb || c.cover || (c.images ? imagesToThumbArray(c.images)[0] : '/assets/hero.jpg');
        const count = (c.images && c.images.length) ? c.images.length : '—';
        const node = document.createElement('article');
        node.className = 'masonry-item reveal';
        node.setAttribute('role', 'listitem');
        node.innerHTML = `
      <div class="ribbon">View</div>
      <img src="${cover}" alt="${escapeHtml(c.label)}" loading="eager" decoding="async" fetchpriority="high" />
      <div class="masonry-meta">
        <div>
          <div class="collection-title">${escapeHtml(c.label)}</div>
          <div class="collection-sub">${count} photos</div>
        </div>
        <div style="color:var(--gold)">•</div>
      </div>
    `;
        node.addEventListener('click', () => openCollection(c));
        collectionsGrid.appendChild(node);
    });

    // reveal animation: add is-visible slightly staggered
    elAll('.masonry-item').forEach((n, idx) => setTimeout(() => n.classList.add('is-visible'), idx * 60));
}

/* open a collection (show index page) */
function openCollection(col) {
    activeCollection = col;
    portfolioSection.style.display = 'none';
    collectionViewSection.style.display = '';
    renderCollectionIndex(col);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function closeCollectionView() {
    activeCollection = null;
    collectionViewSection.style.display = 'none';
    portfolioSection.style.display = '';
    window.scrollTo({ top: document.getElementById('portfolio').offsetTop - 60, behavior: 'smooth' });
}

/* render collection index grid */
function renderCollectionIndex(col) {
    collectionContent.innerHTML = '';
    const header = document.createElement('div');
    header.innerHTML = `<div style="margin-bottom:18px;"><button class="nav-pill" id="back-to-collections">← Back to Collections</button></div>
    <h3>${escapeHtml(col.label)}</h3>
    <p class="muted">${col.metadata?.description || `${(col.images || []).length} photos`}</p>
  `;
    collectionContent.appendChild(header);
    el('#back-to-collections', header).addEventListener('click', closeCollectionView);

    const grid = document.createElement('div');
    grid.className = 'grid-collection';
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(2,1fr)';
    grid.style.gap = '12px';
    if (window.innerWidth > 1100) grid.style.gridTemplateColumns = 'repeat(3,1fr)';

    (col.images || []).forEach((imgEntry, idx) => {
        const src = (typeof imgEntry === 'string') ? imgEntry : (imgEntry.src || imgEntry.large || imgEntry.path);
        const thumb = (typeof imgEntry === 'string') ? imgEntry : (imgEntry.thumb || imgEntry.small || imgEntry.src);
        const name = (typeof imgEntry === 'string') ? imgEntry.split('/').pop() : (imgEntry.name || (imgEntry.src && imgEntry.src.split('/').pop()));
        const caption = (col.metadata?.captions?.[name]) || imgEntry.caption || '';
        const card = document.createElement('div');
        card.style.cursor = 'pointer';
        card.innerHTML = `
      <img class="grid-image" src="${thumb || src}" alt="${escapeHtml(caption || name)}" loading="lazy" />
      <div style="padding:10px; display:flex; justify-content:space-between; align-items:center;">
        <div style="color:#fff">${escapeHtml(caption || name)}</div>
        <div style="display:flex; gap:8px">
          <button class="lb-btn share-btn">Share</button>
          <button class="lb-btn link-btn">Link</button>
        </div>
      </div>
    `;
        // click to open lightbox
        card.querySelector('img').addEventListener('click', () => openLightbox(col.images, idx, col.label));
        // share / link
        card.querySelector('.share-btn').addEventListener('click', (e) => { e.stopPropagation(); shareImage(src); });
        card.querySelector('.link-btn').addEventListener('click', (e) => { e.stopPropagation(); copyToClipboard(window.location.origin + src); alert('Link copied'); });
        grid.appendChild(card);
    });

    collectionContent.appendChild(grid);
}

/* ---------- lightbox ---------- */
function openLightbox(images, idx = 0, label = '') {
    const srcs = imagesToSrcArray(images);
    if (!srcs.length) return;
    lightboxState = { open: true, images: srcs, idx: Math.max(0, Math.min(idx, srcs.length - 1)), label };
    lbImage.src = lightboxState.images[lightboxState.idx];
    lbCaption.textContent = `${label} — ${lightboxState.idx + 1} / ${lightboxState.images.length}`;
    lb.style.display = 'flex';
}
function closeLightbox() {
    lightboxState = { open: false, images: [], idx: 0 };
    lb.style.display = 'none';
    lbImage.src = '';
}
function nextLightbox() {
    if (!lightboxState.open) return;
    lightboxState.idx = Math.min(lightboxState.idx + 1, lightboxState.images.length - 1);
    lbImage.src = lightboxState.images[lightboxState.idx];
    lbCaption.textContent = `${lightboxState.label} — ${lightboxState.idx + 1} / ${lightboxState.images.length}`;
}
function prevLightbox() {
    if (!lightboxState.open) return;
    lightboxState.idx = Math.max(lightboxState.idx - 1, 0);
    lbImage.src = lightboxState.images[lightboxState.idx];
    lbCaption.textContent = `${lightboxState.label} — ${lightboxState.idx + 1} / ${lightboxState.images.length}`;
}

/* share helper */
async function shareImage(path) {
    const url = window.location.origin + path;
    if (navigator.share) {
        try { await navigator.share({ title: 'Photo — Freezemoment', url }); return; } catch (e) { /* fallthrough */ }
    }
    try { await copyToClipboard(url); alert('Link copied'); } catch (e) { prompt('Copy link', url); }
}

/* copy helper */
async function copyToClipboard(text) {
    if (navigator.clipboard) return navigator.clipboard.writeText(text);
    return new Promise((res, rej) => {
        const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta);
        ta.select(); try { document.execCommand('copy'); res(); } catch (e) { rej(e); } finally { ta.remove(); }
    });
}

/* lightbox controls */
lbClose.addEventListener('click', closeLightbox);
lbPrev.addEventListener('click', prevLightbox);
lbNext.addEventListener('click', nextLightbox);
lbShare.addEventListener('click', () => shareImage(lightboxState.images[lightboxState.idx]));
lb.addEventListener('click', (e) => { if (e.target === lb) closeLightbox(); });

/* header nav */
elAll('.nav-pill').forEach(btn => btn.addEventListener('click', e => {
    const target = btn.dataset?.target || btn.textContent.toLowerCase();
    const el = document.getElementById(target);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}));

document.getElementById('mobile-nav').addEventListener('change', (e) => {
    const id = e.target.value;
    const node = document.getElementById(id);
    if (node) node.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

/* CTA / scroll indicator */
ctaView.addEventListener('click', () => portfolioSection.scrollIntoView({ behavior: 'smooth', block: 'start' }));
scrollIndicator.addEventListener('click', () => portfolioSection.scrollIntoView({ behavior: 'smooth', block: 'start' }));

/* parallax & mouse micro interaction */
window.addEventListener('scroll', () => {
    const y = window.scrollY || 0;
    if (heroBg) heroBg.style.transform = `translateY(${y * 0.14}px)`;
    const header = document.getElementById('site-header');
    if (header) { if (y > 28) header.classList.add('solid'); else header.classList.remove('solid'); }
}, { passive: true });

window.addEventListener('mousemove', (ev) => {
    const w = window.innerWidth, h = window.innerHeight;
    const mx = (ev.clientX - w / 2) / (w / 2);
    const my = (ev.clientY - h / 2) / (h / 2);
    const ty = Math.max(Math.min(-my * 8, 12), -12);
    const rx = Math.max(Math.min(mx * 6, 10), -10);
    const ls = `${0.01 + Math.abs(mx) * 0.02}em`;
    document.documentElement.style.setProperty('--ty', `${ty}px`);
    document.documentElement.style.setProperty('--rx', `${rx}deg`);
    document.documentElement.style.setProperty('--ls', ls);
});

/* staged reveal for hero */
setTimeout(() => heroTitle.classList.add('is-visible'), 120);
setTimeout(() => elAll('.hero-sub, .cta-wrap').forEach(n => n.classList.add('is-visible')), 360);

/* show current year */
yearEl.textContent = new Date().getFullYear();

/* small safe HTML escape */
function escapeHtml(s = '') {
    return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

/* initial fetch */
fetchGalleries();

/* Expose a global handy debug function (optional) */
window._fm = { fetchGalleries, openCollection, closeCollectionView };
