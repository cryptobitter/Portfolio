const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const sharp = require('sharp');

const PORTFOLIO_DIR = path.join(__dirname, '..', 'portfolio');
const OUTPUT_JPG = path.join(PORTFOLIO_DIR, 'assets', 'og-hero.jpg');
const ARTIFACT_DIR = 'C:\\Users\\2k24c\\.gemini\\antigravity\\brain\\39e7e7fe-c3a1-40ce-a82b-0973a357f7d1';
const ARTIFACT_JPG = path.join(ARTIFACT_DIR, 'og-hero.jpg');

// Simple static file server
function createServer() {
  const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml'
  };

  return http.createServer((req, res) => {
    let reqPath = decodeURI(req.url.split('?')[0]);
    if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
    const filePath = path.join(PORTFOLIO_DIR, reqPath);

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });
}

async function main() {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  console.log(`Static server running on http://localhost:${port}`);

  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1
  });
  const page = await context.newPage();

  console.log('Navigating to page...');
  await page.goto(`http://localhost:${port}/index.html`, { waitUntil: 'networkidle' });

  // Wait for fonts & hero canvas to render
  await page.evaluate(async () => {
    await document.fonts.ready;
    // ensure hero is at top
    window.scrollTo(0, 0);
  });

  // Give 1.5 seconds for statue and canvas to finish painting
  await page.waitForTimeout(1800);

  // Take screenshot of viewport
  const rawBuffer = await page.screenshot({ type: 'png' });
  await browser.close();
  server.close();

  // Compress with sharp to JPG <= 300 KB
  let quality = 88;
  let compressedBuffer = await sharp(rawBuffer)
    .resize(1200, 630, { fit: 'cover' })
    .jpeg({ quality, mozjpeg: true })
    .toBuffer();

  while (compressedBuffer.length > 300 * 1024 && quality > 50) {
    quality -= 5;
    compressedBuffer = await sharp(rawBuffer)
      .resize(1200, 630, { fit: 'cover' })
      .jpeg({ quality, mozjpeg: true })
      .toBuffer();
  }

  // Ensure assets dir exists
  if (!fs.existsSync(path.dirname(OUTPUT_JPG))) {
    fs.mkdirSync(path.dirname(OUTPUT_JPG), { recursive: true });
  }

  fs.writeFileSync(OUTPUT_JPG, compressedBuffer);
  console.log(`Generated ${OUTPUT_JPG} (${(compressedBuffer.length / 1024).toFixed(1)} KB, quality=${quality})`);

  // Copy to artifacts dir for embedding / review
  try {
    fs.copyFileSync(OUTPUT_JPG, ARTIFACT_JPG);
    console.log(`Copied to artifact dir: ${ARTIFACT_JPG}`);
  } catch (e) {
    console.warn('Could not copy to artifact dir:', e.message);
  }
}

main().catch(err => {
  console.error('Error generating og:image:', err);
  process.exit(1);
});
