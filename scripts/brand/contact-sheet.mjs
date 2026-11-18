#!/usr/bin/env node
/**
 * One sheet of every brand drawing at the sizes people actually see it, on a
 * dark and a light background, for approval of the small sizes.
 *
 * Usage:
 *   bun scripts/brand/contact-sheet.mjs [--out <dir>]
 *
 * Reads the generated outputs (run `bun run brand:generate` first) and the
 * icon sprite, renders each drawing at 16, 32, 64 and 512 px twice, and writes
 * `contact-sheet.html` and `contact-sheet.png` into the evidence directory.
 * `BRAND_EVIDENCE_DIR` sets that directory. One-colour drawings are tinted for
 * their background (white on dark, near-black on light); the pixel-art sizes
 * are enlarged nearest-neighbour so the pixel grid stays visible.
 *
 * The SwiftUI widget logo lives in `packages/mobile/ios/.../WidgetShared.swift`
 * and cannot be rendered without SwiftUI, so it is not on the sheet.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

import { flatLogoSvg } from './geometry.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const at = (...parts) => join(repoRoot, ...parts);

const OUT_DIR = process.env.BRAND_EVIDENCE_DIR
  ?? '/home/shizuku/Project/ohpichamber-omp-artifacts/rebrand-01-2026-11-16';

const SIZES = [16, 32, 64, 512];
const BACKGROUNDS = [
  { name: 'dark', color: '#111114', ink: '#f7f7f8' },
  { name: 'light', color: '#f7f7f8', ink: '#101014' },
];

const ELECTRON_ICONS = at('packages/electron/resources/icons');
const WEB_PUBLIC = at('packages/web/public');
const ANDROID_RES = at('packages/mobile/android/app/src/main/res');
const MOBILE_ASSETS = at('packages/mobile/assets');
const SPRITE = at('packages/ui/src/components/icon/sprite.ts');
const SYMBOL_SVG = at('packages/mobile/ios/App/OpenChamberWidget/Assets.xcassets/OCLogoSymbol.symbolset/oclogo-symbol.svg');

// ---------------------------------------------------------------------------
// Turning a source into one square PNG.

const svgWidth = (svg) => {
  const width = Number(/<svg[^>]*\swidth="([\d.]+)"/.exec(svg)?.[1]);
  if (!width) throw new Error('SVG needs a numeric width to render');
  return width;
};

/** Renders SVG markup at `size` px. The density makes librsvg draw at the target. */
const renderSvg = async (svg, size, nearest = false) => sharp(Buffer.from(svg), { density: (72 * size) / svgWidth(svg) })
  .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: nearest ? sharp.kernel.nearest : sharp.kernel.lanczos3 })
  .png()
  .toBuffer();

/** Renders a PNG (a path or an in-memory buffer) at `size` px; `nearest` keeps pixel art on whole pixels. */
const renderPng = async (source, size, nearest = false) => sharp(typeof source === 'string' ? readFileSync(source) : source)
  .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: nearest ? sharp.kernel.nearest : sharp.kernel.lanczos3 })
  .png()
  .toBuffer();

/** Renders an Icon Composer layer, cropped around the cube's 6.6× scale on its 1024 px canvas. */
const renderLayer = async (path, size, nearest = false) => {
  const side = 720;
  const offset = (1024 - side) / 2;
  const cropped = await sharp(readFileSync(path)).extract({ left: offset, top: offset, width: side, height: side }).png().toBuffer();
  return renderPng(cropped, size, nearest);
};

/** Repaints a drawing's alpha in `color`: the shape stays, the paint becomes the background's ink. */
const tint = async (png, size, color) => {
  const flat = await sharp({ create: { width: size, height: size, channels: 4, background: color } }).png().toBuffer();
  return sharp(flat).composite([{ input: png, blend: 'dest-in' }]).png().toBuffer();
};

// ---------------------------------------------------------------------------
// Sources the generator writes that are not plain images.

/** An Android vector drawable as SVG: the notification icon and its alpha. */
const androidVectorSvg = (path) => {
  const xml = readFileSync(path, 'utf8');
  const attr = (attrs, name) => new RegExp(`android:${name}="([^"]*)"`).exec(attrs)?.[1];
  const paths = [...xml.matchAll(/<path\b([^>]*?)\/>/g)].map(([, attrs]) => {
    const fill = attr(attrs, 'fillColor') ?? '#000000';
    const fillOpacity = attr(attrs, 'fillAlpha');
    const stroke = attr(attrs, 'strokeColor');
    const strokeWidth = attr(attrs, 'strokeWidth');
    const lineJoin = attr(attrs, 'strokeLineJoin');
    const lineCap = attr(attrs, 'strokeLineCap');
    const d = attr(attrs, 'pathData');
    if (!d) return '';
    return `<path d="${d}" fill="${fill}"${fillOpacity ? ` fill-opacity="${fillOpacity}"` : ''}`
      + `${stroke ? ` stroke="${stroke}" stroke-width="${strokeWidth ?? 1}" stroke-linejoin="${lineJoin ?? 'miter'}" stroke-linecap="${lineCap ?? 'butt'}"` : ''}/>`;
  }).join('');
  const viewport = /android:viewportWidth="([\d.]+)"/.exec(xml)?.[1] ?? '24';
  const height = /android:viewportHeight="([\d.]+)"/.exec(xml)?.[1] ?? viewport;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${viewport}" height="${height}" viewBox="0 0 ${viewport} ${height}">${paths}</svg>`;
};

/** The custom glyph the icon sprite carries, on the sprite's 24 grid. */
const spriteGlyphSvg = () => {
  const source = readFileSync(SPRITE, 'utf8');
  const entry = /"openchamber": `([^`]*)`/.exec(source);
  if (!entry) throw new Error(`No "openchamber" glyph in ${relative(repoRoot, SPRITE)}`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">${entry[1]}</svg>`;
};

/**
 * The Regular weight of the SwiftDraw symbol sheet, cut out of the sheet's
 * template: the artwork sits in the second of three columns on the first row.
 */
const symbolSvg = () => {
  const sheet = readFileSync(SYMBOL_SVG, 'utf8');
  const group = /<g id="Regular-S"[^>]*>([\s\S]*?)<\/g>/.exec(sheet);
  if (!group) throw new Error(`No Regular-S group in ${relative(repoRoot, SYMBOL_SVG)}`);
  const numbers = [...group[1].matchAll(/(-?[\d.]+),(-?[\d.]+)/g)].map(([, x, y]) => [Number(x), Number(y)]);
  const xs = numbers.map(([x]) => x);
  const ys = numbers.map(([, y]) => y);
  const pad = 4;
  const minX = Math.min(...xs) - pad;
  const minY = Math.min(...ys) - pad;
  const width = Math.max(...xs) + pad - minX;
  const height = Math.max(...ys) + pad - minY;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${minX} ${minY} ${width} ${height}">${group[1]}</svg>`;
};

/** PNG-compressed frames of an `.ico`, by their declared size. */
const icoFrames = (path) => {
  const ico = readFileSync(path);
  const count = ico.readUInt16LE(4);
  const frames = new Map();
  for (let i = 0; i < count; i += 1) {
    const entry = 6 + i * 16;
    const size = ico.readUInt8(entry) || 256;
    const length = ico.readUInt32LE(entry + 8);
    const offset = ico.readUInt32LE(entry + 12);
    const png = ico.subarray(offset, offset + length);
    // Only PNG-compressed entries carry a signature; anything else is a DIB.
    if (png.readUInt32BE(0) === 0x89504e47) frames.set(size, png);
  }
  return frames;
};

// ---------------------------------------------------------------------------
// The drawings, in the order the generator writes them.

/**
 * `mono` drawings are tinted per background; `pixel` ones keep their pixel grid.
 * Flags may sit on the source object or in the third argument.
 */
const entries = [];
const add = (title, source, options = {}) => {
  const mono = options.mono ?? source.mono ?? false;
  const pixel = options.pixel ?? source.pixel ?? false;
  entries.push({ title, source, mono, pixel, note: options.note ?? '' });
};

const svgAt = (path, { mono = false } = {}) => ({
  render: (size, nearest) => renderSvg(readFileSync(at(path), 'utf8'), size, nearest),
  mono,
});

if (existsSync(join(ELECTRON_ICONS, 'icon.png'))) {
  add('App icon, no tile', { render: (size, nearest) => renderPng(join(ELECTRON_ICONS, 'icon.png'), size, nearest) });
  add('Icon, development copy (tape)', svgAt('packages/electron/resources/icons/dev-icon-win.svg'));
  add('apple-touch-icon (phone, PWA)', svgAt('packages/web/public/apple-touch-icon.svg'));
  add('favicon (glyph, scheme colour)', svgAt('packages/web/public/favicon.svg', { mono: true }));
  add('favicon-16 (pixel cube)', { render: (size, nearest) => renderPng(join(WEB_PUBLIC, 'favicon-16.png'), size, nearest), pixel: true });
  add('favicon-32 (no tile)', { render: (size, nearest) => renderPng(join(WEB_PUBLIC, 'favicon-32.png'), size, nearest) });
  // One-colour art takes the background's ink, like `currentColor` in the app.
  add('In-app logo (currentColor)', { render: (size, nearest, ink) => renderSvg(flatLogoSvg({ color: ink }), size, nearest) });
  const traySource = '18 pt template, 36 px @2x; above that the sheet shows the upscale';
  add('Glyph, menu bar idle', { render: (size, nearest) => renderPng(join(ELECTRON_ICONS, 'tray/trayTemplate-idle@2x.png'), size, nearest), mono: true }, { note: traySource });
  add('Glyph, menu bar unseen', { render: (size, nearest) => renderPng(join(ELECTRON_ICONS, 'tray/trayTemplate-unseen@2x.png'), size, nearest), mono: true }, { note: traySource });
  for (const frame of [0, 3, 6, 9, 12, 15]) {
    const name = `trayTemplate-breath-${String(frame).padStart(2, '0')}@2x.png`;
    add(`Glyph, busy breath ${String(frame).padStart(2, '0')}/15`, { render: (size, nearest) => renderPng(join(ELECTRON_ICONS, 'tray', name), size, nearest), mono: true }, { note: '18 pt template, 36 px @2x' });
  }
}

add('Android notification icon', { render: (size, nearest) => renderSvg(androidVectorSvg(join(ANDROID_RES, 'drawable/ic_stat_notify.xml')), size, nearest), mono: true });
add('Android themed icon (monochrome)', { render: (size, nearest) => renderPng(join(ANDROID_RES, 'mipmap-xxxhdpi/ic_launcher_monochrome.png'), size, nearest), mono: true });
add('Android launcher foreground', { render: (size, nearest) => renderPng(join(ANDROID_RES, 'mipmap-xxxhdpi/ic_launcher_foreground.png'), size, nearest) });
add('Mobile app icon (icon-only)', { render: (size, nearest) => renderPng(join(MOBILE_ASSETS, 'icon-only.png'), size, nearest) });

const ico = existsSync(join(ELECTRON_ICONS, 'icon.ico')) ? icoFrames(join(ELECTRON_ICONS, 'icon.ico')) : new Map();
for (const frameSize of [16, 20, 24, 32]) {
  const frame = ico.get(frameSize);
  if (!frame) continue;
  add(`.ico ${frameSize} px frame${frameSize <= 24 ? ' (pixel cube)' : ''}`, {
    render: (size, nearest) => renderPng(frame, size, nearest),
    pixel: frameSize <= 24,
  }, { note: `drawn at ${frameSize} px; larger tiles are nearest-neighbour upscales` });
}

add('iOS Control Center symbol (Regular)', { render: (size, nearest) => renderSvg(symbolSvg(), size, nearest), mono: true, note: 'cut from the SwiftDraw sheet' });
add('Icon sprite glyph ("openchamber")', { render: (size, nearest) => renderSvg(spriteGlyphSvg(), size, nearest), mono: true });

const appIconAssets = join(ELECTRON_ICONS, 'AppIcon.icon/Assets');
// The document's own order: the tiers are a separate group above the shell group.
const layers = existsSync(appIconAssets) ? ['shell', 'pi', 'roof', 'tier0', 'tier1', 'tier2', 'ttier0', 'ttier1', 'ttier2'] : [];
for (const layer of layers) {
  const path = join(appIconAssets, `${layer}.png`);
  if (!existsSync(path)) continue;
  // Layers are 1024 px canvases with the cube in the middle 66%; crop to that so the
  // drawing fills the tile while tiers keep their size relative to each other.
  // The roof layer is drawn at opacity 0 in the resting document; it lights only while a tier animates.
  const note = layer === 'roof' ? 'transparent at rest, lit during the tier animation' : '';
  add(`macOS app icon layer: ${layer}`, {
    render: (size, nearest) => renderLayer(path, size, nearest),
    mono: true,
  }, { note });
}

// ---------------------------------------------------------------------------
// Rendering.

const tile = async (art, size, background) => sharp({ create: { width: size, height: size, channels: 4, background } })
  .composite([{ input: art }])
  .png()
  .toBuffer();

// ---------------------------------------------------------------------------
// Layout: one row per drawing, one column per size and background.

const LABEL_WIDTH = 300;
const GAP = 14;
const MARGIN = 24;
const HEADER = 122;
/** Columns narrower than this would clip their heading; wider ones take the tile's size. */
const MIN_COLUMN = 108;
const COLUMNS = SIZES.flatMap((size) => BACKGROUNDS.map((background) => ({
  size,
  background,
  width: Math.max(size, MIN_COLUMN),
})));
const ROW_HEIGHT = Math.max(...SIZES) + 28;
const SHEET_WIDTH = MARGIN * 2 + LABEL_WIDTH + COLUMNS.reduce((sum, column) => sum + column.width, 0) + GAP * (COLUMNS.length - 1);
const SHEET_HEIGHT = HEADER + entries.length * ROW_HEIGHT + MARGIN;

const escape = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Centred text as a PNG, for the sheet's headings and labels. */
const textPng = async (lines, width, { size = 13, weight = 400, color = '#c8c8d0', mono = false, height, align = 'center' } = {}) => {
  const lineHeight = Math.round(size * 1.45);
  const box = height ?? lines.length * lineHeight + 8;
  const anchorX = align === 'left' ? 0 : width / 2;
  const body = lines.map((line, i) => `<text x="${anchorX}" y="${Math.round(size + 4 + i * lineHeight)}" text-anchor="${align === 'left' ? 'start' : 'middle'}"`
    + ` font-family="${mono ? 'DejaVu Sans Mono, monospace' : 'DejaVu Sans, sans-serif'}" font-size="${size}"`
    + ` font-weight="${weight}" fill="${color}">${escape(line)}</text>`).join('');
  return sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${box}">${body}</svg>`)).png().toBuffer();
};

const main = async () => {
  const composites = [];
  const columnX = [];
  let x = MARGIN + LABEL_WIDTH;
  for (const column of COLUMNS) {
    columnX.push(x);
    x += column.width + GAP;
  }

  const full = SHEET_WIDTH - MARGIN * 2;
  composites.push({
    input: await textPng(['OhPiChamber brand contact sheet'], full, { size: 20, weight: 600, color: '#f2f2f4' }),
    left: MARGIN,
    top: 14,
  });
  composites.push({
    input: await textPng(
      [`every generated drawing at ${SIZES.join(', ')} px · dark ${BACKGROUNDS[0].color} · light ${BACKGROUNDS[1].color}`],
      full,
      { size: 12, color: '#a8a8b0' },
    ),
    left: MARGIN,
    top: 46,
  });
  for (const [i, column] of COLUMNS.entries()) {
    composites.push({
      input: await textPng([`${column.size} px`, column.background.name], column.width, { size: 12, color: '#b4b4bc' }),
      left: columnX[i],
      top: 76,
    });
  }

  const rows = [];

  for (const [row, entry] of entries.entries()) {
    const top = HEADER + row * ROW_HEIGHT;
    const detail = entry.note || '';
    composites.push({
      input: await textPng(detail ? [entry.title, detail] : [entry.title], LABEL_WIDTH, {
        size: 15,
        weight: 600,
        color: '#f2f2f4',
      }),
      left: MARGIN,
      top: top + 14,
    });
    const cells = [];
    for (const [i, column] of COLUMNS.entries()) {
      const art = await entry.source.render(column.size, entry.pixel, column.background.ink);
      const ink = entry.mono ? await tint(art, column.size, column.background.ink) : art;
      const data = await tile(ink, column.size, column.background.color);
      const left = columnX[i] + Math.round((column.width - column.size) / 2);
      composites.push({ input: data, left, top: top + Math.round((ROW_HEIGHT - column.size) / 2) });
      cells.push({ size: column.size, background: column.background.name, data });
    }
    rows.push({ title: entry.title, detail, cells });
  }

  mkdirSync(OUT_DIR, { recursive: true });

  const sheet = await sharp({ create: { width: SHEET_WIDTH, height: SHEET_HEIGHT, channels: 4, background: '#1b1b1f' } })
    .composite(composites)
    .png()
    .toBuffer();
  writeFileSync(join(OUT_DIR, 'contact-sheet.png'), sheet);

  const page = `<!doctype html>
<meta charset="utf-8">
<title>OhPiChamber brand contact sheet</title>
<style>
  body { margin: 0; padding: 24px; background: #1b1b1f; color: #ececf0; font: 14px/1.4 system-ui, sans-serif; }
  h1 { margin: 0 0 4px; font-size: 20px; }
  p.note { margin: 0 0 20px; max-width: 90ch; color: #b4b4bc; }
  table { border-collapse: collapse; }
  th, td { padding: 8px; border-bottom: 1px solid #33333a; vertical-align: middle; text-align: center; }
  th { color: #b4b4bc; font-weight: 500; font-size: 12px; }
  td.label { width: 280px; text-align: left; font-weight: 600; }
  td.label span { display: block; font: 12px/1.4 ui-monospace, monospace; color: #a8a8b0; font-weight: 400; }
  td img { display: block; margin: 0 auto; image-rendering: pixelated; }
  td.big img { width: 160px; height: 160px; }
</style>
<h1>OhPiChamber brand contact sheet</h1>
<p class="note">Every drawing the brand pipeline writes, at ${SIZES.join(', ')} px, each on dark ${BACKGROUNDS[0].color} and light ${BACKGROUNDS[1].color}.
One-colour drawings are tinted for their background; pixel art is resampled nearest-neighbour, so its 512 px tile shows the pixel grid.
The 512 px tiles are shown at 160 px here; <code>contact-sheet.png</code> holds them at full size.
The SwiftUI widget logo (<code>WidgetShared.swift</code>) needs SwiftUI and is not on this sheet.</p>
<table>
<thead><tr><th>Drawing</th>${COLUMNS.map((column) => `<th>${column.size} px<br>${column.background.name}</th>`).join('')}</tr></thead>
<tbody>
${rows.map((row) => `<tr><td class="label">${escape(row.title)}${row.detail ? `<span>${escape(row.detail)}</span>` : ''}</td>${row.cells.map((cell) => `<td${cell.size === 512 ? ' class="big"' : ''}><img alt="${escape(row.title)} at ${cell.size} px on ${cell.background}" src="data:image/png;base64,${cell.data.toString('base64')}" width="${cell.size}" height="${cell.size}"></td>`).join('')}</tr>`).join('\n')}
</tbody>
</table>
`;
  writeFileSync(join(OUT_DIR, 'contact-sheet.html'), page);

  console.log(`Wrote ${join(OUT_DIR, 'contact-sheet.html')}`);
  console.log(`Wrote ${join(OUT_DIR, 'contact-sheet.png')} (${SHEET_WIDTH} × ${SHEET_HEIGHT} px, ${entries.length} drawings)`);
};

await main();
