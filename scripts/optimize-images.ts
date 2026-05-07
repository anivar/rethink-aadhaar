#!/usr/bin/env bun
/**
 * Generate WebP siblings for every JPG/PNG under public/media/. Idempotent —
 * skips files where the .webp is already up to date (newer mtime than source).
 *
 * Hero images (passed via the HERO env var as a comma-separated list) also
 * get an AVIF sibling for stronger compression on the LCP candidate.
 *
 * Run as a prebuild step. With ~290 source images this takes ~15s on a cold
 * run, < 1s on incremental runs.
 */

import { Glob } from 'bun';
import { existsSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import sharp from 'sharp';

const ROOT = 'public/media';
const HERO_LIST = (process.env.HERO ?? '1489594687018-VG8KQQP625TQFSNEP1FV-image-asset.jpeg')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const WEBP_OPTS = { quality: 80, effort: 4 };
const AVIF_OPTS = { quality: 55, effort: 4 };

async function isFresher(target: string, source: string) {
  const t = Bun.file(target);
  if (!(await t.exists())) return false;
  return t.lastModified >= Bun.file(source).lastModified;
}

type Format = 'webp' | 'avif';

async function convert(src: string, target: string, format: Format, opts: Record<string, number>) {
  if (await isFresher(target, src)) return 'skip';
  try {
    await sharp(src).rotate().toFormat(format, opts).toFile(target);
    return 'wrote';
  } catch (err) {
    console.warn(`[optimize-images] skip ${src}: ${(err as Error).message}`);
    return 'fail';
  }
}

async function main() {
  // Bun.file().exists() is for files only; directories need existsSync.
  if (!existsSync(ROOT)) {
    console.log(`[optimize-images] no ${ROOT}; skipping`);
    return;
  }

  let total = 0;
  let webpAdded = 0;
  let avifAdded = 0;
  const tasks: Promise<void>[] = [];

  for await (const rel of new Glob('**/*').scan({ cwd: ROOT })) {
    const src = join(ROOT, rel);
    const ext = extname(src).toLowerCase();
    if (!['.jpg', '.jpeg', '.png'].includes(ext)) continue;
    total++;

    const stem = src.slice(0, -ext.length);
    const webp = `${stem}.webp`;
    tasks.push(
      convert(src, webp, 'webp', WEBP_OPTS).then((r) => {
        if (r === 'wrote') webpAdded++;
      }),
    );

    if (HERO_LIST.includes(basename(src))) {
      const avif = `${stem}.avif`;
      tasks.push(
        convert(src, avif, 'avif', AVIF_OPTS).then((r) => {
          if (r === 'wrote') avifAdded++;
        }),
      );
    }
  }

  // Run in moderate parallelism; sharp will use all cores per task.
  const concurrency = 4;
  for (let i = 0; i < tasks.length; i += concurrency) {
    await Promise.all(tasks.slice(i, i + concurrency));
  }

  console.log(`[optimize-images] ${total} sources, +${webpAdded} webp, +${avifAdded} avif`);
}

main().catch((err) => {
  console.error('[optimize-images] failed:', err);
  process.exit(1);
});
