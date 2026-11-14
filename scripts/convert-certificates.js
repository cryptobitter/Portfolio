/**
 * scripts/convert-certificates.js
 * Converts certificate source files (PNG, JPG, PDF) from assets/certificates-src/
 * into optimized WebP images (max 1600px wide, ~150KB) in assets/certificates/
 * 
 * Slugs supported:
 * - flyrank-backend-ai-engineering
 * - flyrank-ai-fluency
 * - walmart-forage
 * - ibm-data-analysis-python
 * - anthropic-claude-101
 * - anthropic-ai-fluency
 * - gdgoc-psit
 * - buildwithbharat-2
 * - bbd-hackathon
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const SRC_DIRS = [
  path.join(rootDir, 'portfolio', 'assets', 'certificates-src'),
  path.join(rootDir, 'assets', 'certificates-src')
];

const DEST_DIRS = [
  path.join(rootDir, 'portfolio', 'assets', 'certificates'),
  path.join(rootDir, 'assets', 'certificates')
];

const SLUGS = [
  'flyrank-backend-ai-engineering',
  'flyrank-ai-fluency',
  'walmart-forage',
  'ibm-data-analysis-python',
  'anthropic-claude-101',
  'anthropic-ai-fluency',
  'gdgoc-psit',
  'buildwithbharat-2',
  'bbd-hackathon'
];

async function main() {
  console.log('=== Certificate Converter ===');

  let sharp;
  try {
    const sharpModule = await import('sharp');
    sharp = sharpModule.default || sharpModule;
  } catch (err) {
    console.warn('Note: "sharp" is not yet loaded or installed. Install via: npm i -D sharp');
  }

  // Ensure directories exist
  DEST_DIRS.forEach((dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  // Find source dir that exists
  const srcDir = SRC_DIRS.find(d => fs.existsSync(d));
  if (!srcDir) {
    console.log(`Source directory not found. Please create one at: ${SRC_DIRS[0]}`);
    console.log('Place your certificate images (PNG, JPG, or PDF) named with their slug (e.g. flyrank-backend-ai-engineering.png)');
    process.exit(0);
  }

  const files = fs.readdirSync(srcDir);
  console.log(`Source directory: ${srcDir}`);
  console.log(`Found ${files.length} file(s) in source directory.\n`);

  const missingSlugs = [];
  const processedSlugs = [];

  for (const slug of SLUGS) {
    const match = files.find(f => {
      const base = path.parse(f).name.toLowerCase();
      return base === slug.toLowerCase() || base.startsWith(slug.toLowerCase());
    });

    if (!match) {
      missingSlugs.push(slug);
      continue;
    }

    const inputPath = path.join(srcDir, match);
    const ext = path.extname(match).toLowerCase();

    if (!sharp) {
      console.log(`Found source for "${slug}" (${match}), but "sharp" is needed for WebP conversion.`);
      continue;
    }

    try {
      for (const destDir of DEST_DIRS) {
        const outputPath = path.join(destDir, `${slug}.webp`);
        await sharp(inputPath)
          .resize({ width: 1600, withoutEnlargement: true })
          .webp({ quality: 82, effort: 5 })
          .toFile(outputPath);

        const stats = fs.statSync(outputPath);
        const sizeKB = (stats.size / 1024).toFixed(1);
        console.log(`✓ Converted: ${slug}.webp (${sizeKB} KB) -> ${outputPath}`);
      }
      processedSlugs.push(slug);
    } catch (e) {
      console.error(`✗ Error converting "${slug}":`, e.message);
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Successfully converted: ${processedSlugs.length}/${SLUGS.length}`);
  if (missingSlugs.length > 0) {
    console.log(`Missing source files for (${missingSlugs.length}):`);
    missingSlugs.forEach(s => console.log(`  - ${s}`));
  }
}

main().catch(console.error);
