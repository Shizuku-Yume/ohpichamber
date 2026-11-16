// Measures how far the generated mark is from the approved master, as a mean
// absolute per-channel difference at 512 px, and writes the renders and a
// difference image next to it.
//
// Usage:
//   bun scripts/brand/compare-master.mjs [--master <svg>] [--generated <png|->]
//                                       [--out <dir>] [--background <css colour>]
//                                       [--size <px>]
//
// `--generated` defaults to the committed 1024 px no-tile icon the generator
// writes (`packages/electron/resources/icons/icon.png`), so a stale output
// fails the measurement instead of hiding behind a fresh in-memory render.
// `--generated -` renders `noTileIconSvg()` from geometry.mjs instead, for
// tuning before the outputs are written.
//
// Defaults: the approved master from the rebrand decision and the task's
// evidence directory, a white background and 512 px. `BRAND_MASTER_SVG` and
// `BRAND_EVIDENCE_DIR` override the two paths. Both drawings are
// alpha-composited over the same background before comparing, because the
// master is transparent outside the cube.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import sharp from 'sharp';

import { noTileIconSvg } from './geometry.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DEFAULT_MASTER = process.env.BRAND_MASTER_SVG
  ?? '/home/shizuku/Project/ohpichamber-omp-artifacts/icon-concepts-2026-11-16/ohpichamber-icon-i2.svg';
const DEFAULT_OUT = process.env.BRAND_EVIDENCE_DIR
  ?? '/home/shizuku/Project/ohpichamber-omp-artifacts/rebrand-01-2026-11-16';
const DEFAULT_GENERATED = join(repoRoot, 'packages/electron/resources/icons/icon.png');

/**
 * Every input is normalised the same way: rasterise it at its own native size
 * (1024 for both the master and the generated icon), then resize both to `size`
 * with the same kernel, so the number measures the drawing and not the
 * rasteriser's choice of sampling grid.
 */
const prepare = async (input, size, background) => {
  const png = await sharp(input)
    .resize(size, size)
    .png()
    .toBuffer();
  const { data } = await sharp(png).flatten({ background }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { png, rgb: data };
};

/** An SVG rasterised at its native width (its `width` attribute). */
const rasteriseSvg = async (svg) => {
  const width = Number(/<svg[^>]*\swidth="([\d.]+)"/.exec(svg)?.[1]);
  if (!width) throw new Error('SVG needs a numeric width to render');
  return sharp(Buffer.from(svg), { density: 72 }).png().toBuffer();
};

const meanDifference = (a, b) => {
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) sum += Math.abs(a[i] - b[i]);
  return { mean: sum / a.length, percent: (sum / a.length / 255) * 100 };
};

const main = async () => {
  const { values } = parseArgs({
    options: {
      master: { type: 'string', default: DEFAULT_MASTER },
      generated: { type: 'string', default: DEFAULT_GENERATED },
      out: { type: 'string', default: DEFAULT_OUT },
      background: { type: 'string', default: '#ffffff' },
      size: { type: 'string', default: '512' },
    },
  });
  if (values.generated !== '-' && !existsSync(values.generated)) {
    throw new Error(`No generated icon at ${values.generated}; run \`bun run brand:generate\` or pass --generated -`);
  }
  const size = Number(values.size);
  const master = await prepare(await rasteriseSvg(readFileSync(values.master, 'utf8')), size, values.background);
  const picture = values.generated === '-'
    ? await sharp(Buffer.from(noTileIconSvg({ size: 1024 })), { density: 72 }).png().toBuffer()
    : readFileSync(values.generated);
  const generated = await prepare(picture, size, values.background);
  const diff = meanDifference(master.rgb, generated.rgb);

  mkdirSync(values.out, { recursive: true });
  const write = (name, buffer) => writeFileSync(join(values.out, name), buffer);
  write('compare-master.png', master.png);
  write('compare-generated.png', generated.png);
  write(`compare-side-by-side-${size}.png`, await sharp({
    create: { width: size * 2 + 16, height: size + 16, channels: 4, background: '#e6e6e6' },
  })
    .composite([{ input: master.png, left: 0, top: 8 }, { input: generated.png, left: size + 16, top: 8 }])
    .png()
    .toBuffer());
  write(`compare-diff-${size}.png`, await sharp(master.png)
    .composite([{ input: generated.png, blend: 'difference' }])
    .linear(6)
    .png()
    .toBuffer());

  const result = [
    `master:      ${values.master}`,
    `generated:   ${values.generated === '-' ? 'noTileIconSvg({ size: 1024 }) from scripts/brand/geometry.mjs' : values.generated}`,
    `size:        ${size} px`,
    `background:  ${values.background} (both drawings alpha-composited over it)`,
    `difference:  ${diff.percent.toFixed(3)}% mean absolute per-channel difference (${diff.mean.toFixed(3)} of 255)`,
  ].join('\n');
  write('compare-result.txt', `${result}\n`);
  console.log(result);
};

if (import.meta.main) await main();
