const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const PORTFOLIO_DIR = path.join(__dirname, '..', 'portfolio');

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

async function runTests() {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/index.html`;

  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const results = {};

  console.log('--- RUNNING DESKTOP VERIFICATION (1920x1080) ---');
  {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
    const page = await context.newPage();

    let totalTransfer = 0;
    page.on('response', async (res) => {
      try {
        const buf = await res.body();
        totalTransfer += buf.length;
      } catch (e) {}
    });

    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto(baseUrl, { waitUntil: 'load' });
    await page.waitForTimeout(2000);

    // 0.2 Hero initial state
    const introVis = await page.$eval('#heroChapterIntro', el => {
      const s = window.getComputedStyle(el);
      return s.opacity !== '0' && s.visibility !== 'hidden';
    });
    const featuresVis = await page.$eval('#heroChapterFeatures', el => {
      const s = window.getComputedStyle(el);
      return s.opacity === '0' || s.visibility === 'hidden';
    });
    results['0.2 Hero Initial Overlap Fix'] = (introVis && featuresVis) ? 'PASS' : 'FAIL';

    // 2.1 Desktop Nav links
    const navLinksExist = await page.$eval('.nav-desktop-links', el => !!el && el.querySelectorAll('a').length === 4);
    results['2.1 Desktop Nav Links Present'] = navLinksExist ? 'PASS' : 'FAIL';

    // 2.2 Scroll Margin Top
    const scrollMargin = await page.evaluate(() => {
      const sec = document.querySelector('section');
      return window.getComputedStyle(sec).scrollMarginTop;
    });
    results['2.2 Scroll Margin Top (96px)'] = (scrollMargin === '96px') ? 'PASS' : 'FAIL';

    // 2.3 Hero Skip Button & Softer Move
    const skipBtn = await page.$('.hero-skip-btn');
    const skipBtnVisible = skipBtn ? await skipBtn.isVisible() : false;
    results['2.3 Hero Skip Button Visible'] = skipBtnVisible ? 'PASS' : 'FAIL';

    // Measure memory & performance metrics
    const metrics = await page.evaluate(() => {
      let lcp = 0;
      const perfEntries = performance.getEntriesByType('paint');
      const fcp = perfEntries.find(p => p.name === 'first-contentful-paint')?.startTime || 0;
      const memory = performance.memory ? performance.memory.usedJSHeapSize : null;
      return { fcp, memory };
    });

    results['Desktop Total Network Transfer'] = `${(totalTransfer / (1024 * 1024)).toFixed(2)} MB`;
    results['Desktop JS Heap'] = metrics.memory ? `${(metrics.memory / (1024 * 1024)).toFixed(1)} MB` : 'N/A';
    results['Desktop Page Errors'] = pageErrors.length === 0 ? 'PASS (0 errors)' : `FAIL (${pageErrors.length} errors)`;

    await context.close();
  }

  console.log('--- RUNNING MOBILE VERIFICATION (375x812 - iPhone X) ---');
  {
    const context = await browser.newContext({
      viewport: { width: 375, height: 812 },
      isMobile: true,
      hasTouch: true
    });
    const page = await context.newPage();

    let mobileTransfer = 0;
    page.on('response', async (res) => {
      try {
        const buf = await res.body();
        mobileTransfer += buf.length;
      } catch (e) {}
    });

    const mobileErrors = [];
    page.on('pageerror', (err) => mobileErrors.push(err.message));

    await page.goto(baseUrl, { waitUntil: 'load' });
    await page.waitForTimeout(2000);

    const mobileSkipVisible = await page.$eval('.hero-skip-btn', el => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });

    const mobileMetrics = await page.evaluate(() => {
      const navEntry = performance.getEntriesByType('navigation')[0];
      const domReady = navEntry ? navEntry.domContentLoadedEventEnd : 0;
      const memory = performance.memory ? performance.memory.usedJSHeapSize : null;
      return { domReady, memory };
    });

    results['Mobile Hero Skip Button Visible'] = mobileSkipVisible ? 'PASS' : 'FAIL';
    results['Mobile Total Network Transfer'] = `${(mobileTransfer / (1024 * 1024)).toFixed(2)} MB`;
    results['Mobile DOM Content Loaded'] = `${mobileMetrics.domReady.toFixed(0)} ms`;
    results['Mobile Page Errors'] = mobileErrors.length === 0 ? 'PASS (0 errors)' : `FAIL (${mobileErrors.length} errors)`;

    await context.close();
  }

  await browser.close();
  server.close();

  console.log('\n================ VERIFICATION RESULTS ================');
  console.table(results);
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
