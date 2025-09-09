// scripts/generate_galleries.js (CommonJS version - works with `node scripts/generate_galleries.js`)
// - Scans public/galleries/*
// - Produces public/galleries/galleries.json
// - Generates thumbs into public/galleries/<col>/thumbs/*.jpg (if sharp available)
// - Extracts EXIF (if exifr available)
// - Uses source image as main src (no large folder)

const fs = require('fs').promises;
const path = require('path');
const ncmp = require('natural-compare-lite');

const ROOT = process.cwd();
const GALLERIES_DIR = process.env.GALLERIES_DIR ? path.resolve(process.env.GALLERIES_DIR) : path.join(ROOT, 'galleries');
const OUT_FILE = path.join(GALLERIES_DIR, 'galleries.json');
const IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif'];

// Optional libraries
let sharp = null;
let exifr = null;

try {
    sharp = require('sharp');
} catch (e) {
    console.warn('[generator] sharp not available — thumbnails will be skipped (thumb == src).');
}

try {
    exifr = require('exifr');
} catch (e) {
    console.warn('[generator] exifr not available — EXIF metadata will be omitted.');
}

function isImage(filename) {
    return IMAGE_EXT.includes(path.extname(filename).toLowerCase());
}

async function ensureDir(dir) {
    try { await fs.mkdir(dir, { recursive: true }); } catch (e) { /* ignore */ }
}

async function readOptionalJson(file) {
    try {
        const txt = await fs.readFile(file, 'utf8');
        return JSON.parse(txt);
    } catch (e) {
        return null;
    }
}

function fmtDate(d) {
    if (!d) return null;
    try {
        const iso = new Date(d).toISOString();
        return iso.slice(0, 10);
    } catch (e) { return null; }
}

(async function main() {
    try {
        const stat = await fs.stat(GALLERIES_DIR).catch(() => null);
        if (!stat || !stat.isDirectory()) {
            console.error(`[generator] No folder found at ${GALLERIES_DIR}. Create 'public/galleries/<collection>/' first.`);
            process.exit(1);
        }

        const entries = await fs.readdir(GALLERIES_DIR, { withFileTypes: true });
        const collections = [];

        for (const e of entries) {
            if (!e.isDirectory()) continue;
            const colId = e.name;
            const colDir = path.join(GALLERIES_DIR, colId);
            const files = await fs.readdir(colDir);
            const images = files.filter(isImage).sort((a, b) => ncmp(a, b));
            if (images.length === 0) continue;

            // thumbs dir
            const thumbsDir = path.join(colDir, 'thumbs');
            await ensureDir(thumbsDir);

            // find cover: cover.jpg preferred
            const coverCandidate = files.find(f => /^cover\.(jpg|jpeg|png|webp)$/i.test(f)) || images[0];
            const coverSrc = `/galleries/${colId}/${coverCandidate}`;
            const coverBase = path.parse(coverCandidate).name;
            const coverThumbPath = path.join(thumbsDir, `${coverBase}.jpg`);
            const coverThumbWeb = `/galleries/${colId}/thumbs/${coverBase}.jpg`;

            const imgs = [];

            for (const fname of images) {
                const srcWeb = `/galleries/${colId}/${fname}`;
                const srcFs = path.join(colDir, fname);
                const base = path.parse(fname).name;
                const thumbFs = path.join(thumbsDir, `${base}.jpg`);
                const thumbWeb = `/galleries/${colId}/thumbs/${base}.jpg`;

                // generate thumb if sharp available
                if (sharp) {
                    try {
                        const [sStat, tStat] = await Promise.all([
                            fs.stat(srcFs).catch(() => null),
                            fs.stat(thumbFs).catch(() => null)
                        ]);
                        const srcM = sStat?.mtimeMs || 0;
                        const thumbM = tStat?.mtimeMs || 0;
                        if (!tStat || thumbM < srcM) {
                            // generate jpg thumb (width 600px max)
                            await sharp(srcFs)
                                .rotate()
                                .resize({ width: 600, withoutEnlargement: true })
                                .jpeg({ quality: 82 })
                                .toFile(thumbFs);
                            if (sStat) {
                                // match mtime for caching consistency
                                try { await fs.utimes(thumbFs, sStat.atime, sStat.mtime); } catch (e) { }
                            }
                            console.log(`[generator] thumb created: ${thumbFs}`);
                        }
                    } catch (err) {
                        console.warn(`[generator] failed to generate thumb for ${srcFs}:`, err?.message || err);
                    }
                }

                // read EXIF if exifr present
                let caption = "";
                let dateStr = null;
                if (exifr) {
                    try {
                        const meta = await exifr.parse(srcFs, { tiff: true, ifd0: true, exif: true, gps: false, iptc: true }).catch(() => null);
                        if (meta) {
                            if (meta.ImageDescription) caption = String(meta.ImageDescription).trim();
                            else if (meta.iptc && meta.iptc.ObjectName) caption = String(meta.iptc.ObjectName).trim();
                            else if (meta.iptc && meta.iptc.Caption) caption = String(meta.iptc.Caption).trim();
                            else if (meta.keywords && meta.keywords.length) caption = String(meta.keywords.join(", "));
                            const d = meta.DateTimeOriginal || meta.CreateDate || meta.ModifyDate || null;
                            dateStr = fmtDate(d);
                        }
                    } catch (err) {
                        // non-fatal
                    }
                }

                imgs.push({
                    name: fname,
                    src: srcWeb,
                    thumb: sharp ? thumbWeb : srcWeb,
                    caption: caption || "",
                    date: dateStr
                });
            } // images loop

            const metaFile = path.join(colDir, 'metadata.json');
            const metaObj = await readOptionalJson(metaFile);

            const coverThumb = sharp ? coverThumbWeb : coverSrc;

            collections.push({
                id: colId,
                label: metaObj?.label || colId.replace(/[-_]/g, ' '),
                cover: coverSrc,
                coverThumb,
                images: imgs,
                metadata: metaObj || null
            });
        } // collections loop

        // sort collections naturally by label
        collections.sort((a, b) => ncmp(a.label, b.label));

        await ensureDir(GALLERIES_DIR);
        await fs.writeFile(OUT_FILE, JSON.stringify(collections, null, 2), 'utf8');
        console.log(`[generator] Generated ${OUT_FILE} with ${collections.length} collections.`);
        if (!sharp) console.log('[generator] Note: sharp not installed — thumbs are same as source. Run `npm i sharp` to enable thumb generation.');
        if (!exifr) console.log('[generator] Note: exifr not installed — EXIF metadata omitted. Run `npm i exifr` to enable EXIF extraction.');
    } catch (err) {
        console.error('[generator] fatal error:', err);
        process.exit(1);
    }
})();
