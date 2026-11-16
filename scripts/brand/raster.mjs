// Turning the drawings in geometry.mjs into image files: PNG through sharp
// (librsvg), the pixel-exact tray cube, and Windows .ico containers.

import sharp from 'sharp';

import { PI_GLYPH } from './geometry.mjs';

/**
 * Renders an SVG string to a PNG buffer of `size` x `size`. The density makes
 * librsvg draw at the target size instead of scaling a bitmap of the SVG's own
 * width.
 */
export const svgToPng = (svg, size) => {
  const width = Number(/<svg[^>]*\swidth="([\d.]+)"/.exec(svg)?.[1]);
  if (!width) throw new Error('SVG needs a numeric width to render');
  return sharp(Buffer.from(svg), { density: (72 * size) / width })
    .resize(size, size)
    .png()
    .toBuffer();
};

export const solidSquare = (size, background) => sharp({ create: { width: size, height: size, channels: 4, background } })
  .png()
  .toBuffer();

/**
 * Lays `png` over a square of `background` with `inset` px free on every side.
 * `round` is a corner radius in px, or 'circle'.
 */
export const composeOnSquare = async ({ png, size, background, inset = 0, round = null }) => {
  const inner = await sharp(png).resize(size - inset * 2, size - inset * 2).toBuffer();
  const base = round
    ? sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">${round === 'circle'
      ? `<circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="${background}"/>`
      : `<rect width="${size}" height="${size}" rx="${round}" fill="${background}"/>`}</svg>`))
    : sharp({ create: { width: size, height: size, channels: 4, background } });
  return base.composite([{ input: inner, left: inset, top: inset }]).png().toBuffer();
};

// ---------------------------------------------------------------------------
// Pixel-exact cube for 16-24 px (Windows .ico frames, favicon-16). Scaled-down
// vector art blurs there: the 30 degree edges fall between pixels. These use a
// 2:1 slope, so every edge is a clean two-pixel staircase, with no
// anti-aliasing and a 1 px black outline for light taskbars.

const PIXEL_COLORS = {
  leftWall: [0x45, 0x47, 0x4d],
  rightWall: [0x5a, 0x5c, 0x62],
  roof: [0x1d, 0x1e, 0x21],
  edge: [0xf5, 0xf5, 0xf7],
  outline: [0, 0, 0],
  tiers: [[0x78, 0x7a, 0x80], [0x9f, 0xa1, 0xa6], [0xd4, 0xd5, 0xd8]],
  singleTier: [0xb8, 0xba, 0xc0],
  // The π, reduced to whole pixels. Its top is white in the colour icon, against
  // the dark face, and at these sizes one white glyph is what reads: the bar
  // thickens the shell's top edge and the legs stand clear of it. The fold is
  // one tier darker, as in the colour icon, so the folded strip reads as a side
  // face rather than as more front edge.
  pi: [0xf5, 0xf5, 0xf7],
  piFold: [0x9f, 0xa1, 0xa6],
};

/**
 * Tiers per size: [half-width in px (even), index into the palette's tiers or
 * 'single'], outer to core. `legs: 'bar'` keeps the π to its bar and long leg:
 * at 16 px the face is four pixels wide, and a short leg there turns the glyph
 * into a blob.
 */
export const PIXEL_CUBES = {
  16: { halfWidth: 6, wallHeight: 7, tiers: [[4, 'single']], legs: 'bar' },
  20: { halfWidth: 8, wallHeight: 9, tiers: [[6, 0], [4, 2]] },
  24: { halfWidth: 10, wallHeight: 11, tiers: [[8, 0], [6, 1], [4, 2]] },
};

const createCanvas = (size) => {
  const data = new Uint8Array(size * size * 4);
  const inside = (x, y) => x >= 0 && y >= 0 && x < size && y < size;
  const set = (x, y, [r, g, b]) => {
    if (!inside(x, y)) return;
    const i = (y * size + x) * 4;
    data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255;
  };
  const alpha = (x, y) => (inside(x, y) ? data[(y * size + x) * 4 + 3] : 0);
  return { data, set, alpha };
};

// Convex polygon on integer pixel coordinates: on each pixel row, every pixel
// from the left edge to the right edge, boundary pixels included.
const fillPolygon = (canvas, size, points, color) => {
  for (let y = 0; y < size; y += 1) {
    const xs = [];
    points.forEach(([xa, ya], i) => {
      const [xb, yb] = points[(i + 1) % points.length];
      if (y < Math.min(ya, yb) || y > Math.max(ya, yb)) return;
      if (ya === yb) xs.push(xa, xb);
      else xs.push(xa + ((xb - xa) * (y - ya)) / (yb - ya));
    });
    if (xs.length < 2) continue;
    for (let x = Math.ceil(Math.min(...xs)); x <= Math.floor(Math.max(...xs)); x += 1) canvas.set(x, y, color);
  }
};

// Bresenham from `a` to `b`, both ends included: each step along the longer
// axis moves the other coordinate once the error reaches zero, so a half-way
// pixel lands away from the start.
const drawLine = (canvas, [x0, y0], [x1, y1], color) => {
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const xs = x1 < x0 ? -1 : 1;
  const ys = y1 < y0 ? -1 : 1;
  const [long, short] = dx >= dy ? [dx, dy] : [dy, dx];
  let x = x0;
  let y = y0;
  let e = 2 * short - long;
  for (let i = 0; i <= long; i += 1) {
    canvas.set(x, y, color);
    if (short && e >= 0) {
      if (dx >= dy) y += ys; else x += xs;
      e -= 2 * long;
    }
    e += 2 * short;
    if (dx >= dy) x += xs; else y += ys;
  }
};

/** A `size` x `size` coverage mask of the pixels inside a convex polygon. */
const polygonMask = (size, points) => {
  const mask = new Uint8Array(size * size);
  const canvas = { set: (x, y) => { if (x >= 0 && y >= 0 && x < size && y < size) mask[y * size + x] = 1; } };
  for (let y = 0; y < size; y += 1) fillPolygon(canvas, size, points, null);
  return mask;
};

/** Raw RGBA pixels of the pixel-exact cube at `size` (16, 20 or 24); `tape` for a development copy. */
export const pixelCube = (size, { tape = false, pi = true, colors = PIXEL_COLORS } = {}) => {
  const spec = PIXEL_CUBES[size];
  if (!spec) throw new Error(`No pixel cube for ${size} px`);
  const { halfWidth: hw, wallHeight: h, tiers } = spec;
  const rise = hw / 2;
  const total = 2 * rise + h + 1;
  const y0 = Math.floor((size - total) / 2);
  const c = Math.floor(size / 2);
  const T = [c, y0];
  const L = [c - hw, y0 + rise];
  const F = [c, y0 + 2 * rise];
  const R = [c + hw, y0 + rise];
  const BL = [L[0], L[1] + h];
  const B = [F[0], F[1] + h];
  const BR = [R[0], R[1] + h];

  const art = createCanvas(size);
  fillPolygon(art, size, [L, F, B, BL], colors.leftWall);
  fillPolygon(art, size, [F, R, BR, B], colors.rightWall);
  fillPolygon(art, size, [T, R, F, L], colors.roof);
  const cy = y0 + rise;
  for (const [k, tier] of tiers) {
    const color = tier === 'single' ? colors.singleTier : colors.tiers[tier];
    fillPolygon(art, size, [[c, cy - k / 2], [c + k, cy], [c, cy + k / 2], [c - k, cy]], color);
  }
  for (const [a, b] of [[T, L], [T, R], [L, F], [F, R], [L, BL], [R, BR], [BL, B], [B, BR], [F, B]]) {
    drawLine(art, a, b, colors.edge);
  }
  if (pi) {
    drawPixelPi(art, size, {
      c,
      hw,
      h,
      rise,
      y0,
      legs: spec.legs ?? 'both',
      face: polygonMask(size, [L, F, B, BL]),
      fold: polygonMask(size, [F, R, BR, B]),
      colors,
    });
  }

  const out = createCanvas(size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (art.alpha(x, y)) continue;
      if (art.alpha(x + 1, y) || art.alpha(x - 1, y) || art.alpha(x, y + 1) || art.alpha(x, y - 1)) {
        out.set(x, y, colors.outline);
      }
    }
  }
  for (let i = 0; i < art.data.length; i += 4) {
    if (art.data[i + 3]) out.data.set(art.data.subarray(i, i + 4), i);
  }
  // Over the finished cube: the drawing carries its own outline.
  if (tape) drawPixelTape(out, size);
  return out.data;
};

/**
 * OMP's π on the finished cube, drawn on whole pixels from the same glyph
 * ratios the vector drawings use, so the small sizes are the one mark and not a
 * second design. The bar thickens the face's top edge, the long leg runs down
 * the front edge, and the bar's overhang folds onto the right face one step
 * darker.
 *
 * Every pixel is painted through the face masks, so no stroke can leave the
 * cube silhouette; where three strokes do not fit the short leg is dropped
 * (`PIXEL_CUBES[n].legs`).
 */
const drawPixelPi = (canvas, size, { c, hw, h, rise, y0, legs = 'both', face, fold, colors }) => {
  const faceUnits = PI_GLYPH.leftInset + PI_GLYPH.frontEdge;
  const column = (glyphColumn) => c - hw + ((PI_GLYPH.leftInset + glyphColumn) / faceUnits) * hw;
  // The bar starts at the glyph's margin and runs to the roof's apex, which is
  // the face's own full width, so it reads as a bar and not as a thicker edge.
  const barFrom = Math.round(column(PI_GLYPH.bar.x)) + 1;
  const longLeg = Math.max(1, Math.round((PI_GLYPH.rightLeg.width / faceUnits) * hw));
  const shortW = Math.max(1, Math.round((PI_GLYPH.leftLeg.width / faceUnits) * hw));
  const shortFrom = Math.round(column(PI_GLYPH.leftLeg.x));
  const foldCols = Math.max(1, Math.round(((PI_GLYPH.width - PI_GLYPH.frontEdge) / faceUnits) * hw));
  // The bar is two rows everywhere: one row would sit on the shell's own edge
  // and disappear into it.
  const barRows = 2;
  const shortRows = Math.max(1, Math.round(h / 3));
  const topLeft = (x) => y0 + rise + Math.floor((x - (c - hw)) / 2);
  const topRight = (x) => y0 + 2 * rise - Math.floor((x - c) / 2);
  const floorY = y0 + 2 * rise + h;
  const paint = (mask, x, y, color) => {
    if (x >= 0 && y >= 0 && x < size && y < size && mask[y * size + x]) canvas.set(x, y, color);
  };
  const down = (mask, x, from, to, color) => {
    for (let y = from; y <= to; y += 1) paint(mask, x, y, color);
  };

  // The bar: the face's top edge thickened inwards from the glyph's margin. It
  // starts one row inside the edge itself, which the shell has already drawn,
  // so the edge and the bar read as one stroke.
  for (let x = barFrom; x <= c; x += 1) down(face, x, topLeft(x) + 1, topLeft(x) + barRows, colors.pi);
  // The long leg: the last `longLeg` columns of the face, bar to floor. Its
  // outermost column is the front edge itself, which becomes the leg.
  for (let x = c - longLeg + 1; x <= c; x += 1) down(face, x, topLeft(x) + barRows + 1, floorY, colors.pi);
  // The short leg, where it fits clear of the long one.
  const shortTo = Math.min(shortFrom + shortW - 1, c - longLeg);
  if (legs !== 'bar' && shortTo >= barFrom) {
    for (let x = Math.max(shortFrom, barFrom); x <= shortTo; x += 1) {
      down(face, x, topLeft(x) + barRows + 1, topLeft(x) + barRows + shortRows, colors.pi);
    }
  }
  // The bar's overhang folds onto the right face under its top edge.
  for (let x = c; x <= c + foldCols; x += 1) down(fold, x, topRight(x), topRight(x) + barRows - 1, colors.piFold);
  // The leg's wrap onto the right face, one column at the front edge.
  down(fold, c + 1, topRight(c + 1) + barRows + 1, floorY, colors.piFold);
};

// ---------------------------------------------------------------------------
// Pixel-exact tray glyph (menu bar template images at 18 and 36 px). The vector
// glyph anti-aliases its roof rings and the π into a smudge at these sizes, so
// the menu bar draws it on whole pixels, the way the small Windows cube is
// drawn. The design is one 18 x 18 grid; the @2x template is that grid at
// exactly twice the resolution.

/**
 * The glyph's 18 x 18 grid: the cube's outline (half-width 6, roof half-height
 * 3, wall 6), the roof rings, and the π's two strokes.
 */
export const PIXEL_GLYPH = {
  units: 18,
  /** Roof ring scales, outer to inner; inside the core the face shows through. */
  rings: [0.8, 0.55, 0.28],
};

/** The design's vertices on the 18 grid, roof centred at (9, 6). */
const GLYPH_POINTS = {
  T: [9, 3],
  L: [3, 6],
  R: [15, 6],
  F: [9, 9],
  BL: [3, 12],
  BR: [15, 12],
  B: [9, 15],
};

/** Even-odd point-in-polygon at a pixel centre, in the drawing's units. */
const inPolygon = (points, x, y) => {
  const at = [];
  points.forEach(([xa, ya], i) => {
    const [xb, yb] = points[(i + 1) % points.length];
    if (ya === yb) return;
    if (y < Math.min(ya, yb) || y >= Math.max(ya, yb)) return;
    at.push(xa + ((xb - xa) * (y - ya)) / (yb - ya));
  });
  at.sort((a, b) => a - b);
  let count = 0;
  for (let i = 0; i + 1 < at.length; i += 2) if (x >= at[i] && x < at[i + 1]) count += 1;
  return count % 2 === 1;
};

/**
 * Alpha of the tray glyph on its 18 x 18 grid: the cube's edges, the two roof
 * rings and the π, every element a whole-pixel shape. `walls` fills the side
 * walls (the unread state) and `rings` overrides the two ring opacities (the
 * busy breath). Opacities compose (`over`), because the inner ring sits on the
 * outer band.
 */
const pixelGlyphAlpha = ({ walls = 0, rings = [0.3, 0.75] } = {}) => {
  const { units, rings: ringScales } = PIXEL_GLYPH;
  const { T, L, R, F, BL, BR, B } = GLYPH_POINTS;
  const alpha = new Float64Array(units * units);
  const paint = (x, y, value) => {
    if (x < 0 || y < 0 || x >= units || y >= units || value <= 0) return;
    const i = y * units + x;
    alpha[i] = value + alpha[i] * (1 - value);
  };
  const cover = (points) => {
    const mask = new Uint8Array(units * units);
    for (let y = 0; y < units; y += 1) {
      for (let x = 0; x < units; x += 1) {
        if (inPolygon(points, x + 0.5, y + 0.5)) mask[y * units + x] = 1;
      }
    }
    return mask;
  };
  const fill = (mask, value) => {
    for (let i = 0; i < mask.length; i += 1) if (mask[i]) paint(i % units, Math.floor(i / units), value);
  };
  const clear = (mask) => {
    for (let i = 0; i < mask.length; i += 1) if (mask[i]) alpha[i] = 0;
  };
  const rhombus = (scale) => [
    [9, 6 - 3 * scale],
    [9 + 6 * scale, 6],
    [9, 6 + 3 * scale],
    [9 - 6 * scale, 6],
  ];
  // One-pixel Bresenham on the 18 grid.
  const line = (a, b, value = 1) => {
    const dx = Math.abs(b[0] - a[0]);
    const dy = Math.abs(b[1] - a[1]);
    const sx = b[0] < a[0] ? -1 : 1;
    const sy = b[1] < a[1] ? -1 : 1;
    const [long, short] = dx >= dy ? [dx, dy] : [dy, dx];
    let x = a[0];
    let y = a[1];
    let e = 2 * short - long;
    for (let i = 0; i <= long; i += 1) {
      paint(x, y, value);
      if (short && e >= 0) {
        if (dx >= dy) y += sy; else x += sx;
        e -= 2 * long;
      }
      e += 2 * short;
      if (dx >= dy) x += sx; else y += sy;
    }
  };

  if (walls) {
    fill(cover([L, F, B, BL]), walls);
    fill(cover([F, R, BR, B]), walls);
  }
  const [outer, inner, core] = ringScales;
  fill(cover(rhombus(outer)), rings[0]);
  fill(cover(rhombus(inner)), rings[1]);
  clear(cover(rhombus(core)));

  for (const [a, b] of [[T, L], [T, R], [L, BL], [R, BR], [BL, B], [B, BR], [L, F], [F, R], [F, B]]) line(a, b);

  // The π on the left face. Its bar thickens the face's top edge (L -> F) by one
  // row between its margins, so the edge itself becomes the bar; the short leg
  // hangs beside the back corner, the long leg runs down the front edge, and the
  // bar's overhang folds onto the right face under the front-right edge.
  const faceTop = (x) => 6 + Math.floor((x - 3) / 2);
  const rightTop = (x) => 6 - Math.floor((x - 9) / 2);
  const barFrom = 4;
  const barTo = 9;
  for (let x = barFrom; x <= barTo; x += 1) paint(x, faceTop(x) + 1, 1);
  for (let x = 8; x <= 9; x += 1) {
    for (let y = faceTop(x) + 2; y <= 15; y += 1) paint(x, y, 1);
  }
  for (let y = faceTop(barFrom) + 2; y <= faceTop(barFrom) + 3; y += 1) paint(barFrom, y, 1);
  paint(10, rightTop(10) + 1, 1);
  return alpha;
};

/**
 * Raw RGBA of the tray glyph at `size` px as a template image: black, with the
 * rings and walls at their own alpha. The drawing is made on the 18 x 18 grid
 * and scaled by whole pixels, so the 36 px template is the 18 px one at exactly
 * twice the resolution.
 */
export const pixelGlyph = (size, options) => {
  const alpha = pixelGlyphAlpha(options);
  const units = PIXEL_GLYPH.units;
  const scale = size / units;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const value = alpha[Math.floor(y / scale) * units + Math.floor(x / scale)];
      data[(y * size + x) * 4 + 3] = Math.round(Math.min(1, value) * 255);
    }
  }
  return data;
};

export const pixelGlyphPng = (size, options) => sharp(Buffer.from(pixelGlyph(size, options)), { raw: { width: size, height: size, channels: 4 } })
  .png()
  .toBuffer();

const TAPE_COLORS = { yellow: [0xd6, 0xa2, 0x3c], dark: [0x1b, 0x1b, 0x1b] };

// The development-copy tape across the lower cube, full width: two-pixel
// diagonal stripes, a quarter of the icon high.
const drawPixelTape = (canvas, size) => {
  const height = Math.round(size / 4);
  const top = Math.round(size * 0.6);
  for (let y = top; y < top + height; y += 1) {
    for (let x = 0; x < size; x += 1) {
      canvas.set(x, y, (x + y) % 4 < 2 ? TAPE_COLORS.yellow : TAPE_COLORS.dark);
    }
  }
};

export const pixelCubePng = (size, options) => sharp(Buffer.from(pixelCube(size, options)), { raw: { width: size, height: size, channels: 4 } })
  .png()
  .toBuffer();

// ---------------------------------------------------------------------------
// .ico with PNG-compressed entries (Windows Vista and later read them).

export const encodeIco = (entries) => {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);
  const directory = Buffer.alloc(16 * entries.length);
  let offset = header.length + directory.length;
  entries.forEach(({ size, png }, i) => {
    const at = i * 16;
    directory.writeUInt8(size >= 256 ? 0 : size, at);
    directory.writeUInt8(size >= 256 ? 0 : size, at + 1);
    directory.writeUInt8(0, at + 2);
    directory.writeUInt8(0, at + 3);
    directory.writeUInt16LE(1, at + 4);
    directory.writeUInt16LE(32, at + 6);
    directory.writeUInt32LE(png.length, at + 8);
    directory.writeUInt32LE(offset, at + 12);
    offset += png.length;
  });
  return Buffer.concat([header, directory, ...entries.map(({ png }) => png)]);
};
