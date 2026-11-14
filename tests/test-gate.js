import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import contentHandler from '../api/content.js';
import cvHandler from '../api/download-cv.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let passedCount = 0;
let totalCount = 0;

function assert(condition, message) {
  totalCount++;
  if (condition) {
    console.log(`PASS: ${message}`);
    passedCount++;
  } else {
    console.error(`FAIL: ${message}`);
  }
}

// Mock Res / Req
function createMockReqRes({ headers = {}, query = {}, method = 'GET' }) {
  const req = { headers, query, method, socket: { remoteAddress: '127.0.0.1' } };
  let statusCode = 200;
  let sentData = null;
  const resHeaders = {};

  const res = {
    status(code) {
      statusCode = code;
      return res;
    },
    setHeader(k, v) {
      resHeaders[k] = v;
    },
    json(data) {
      sentData = data;
      return res;
    },
    send(data) {
      sentData = data;
      return res;
    },
    end() {
      return res;
    },
    getStatusCode: () => statusCode,
    getData: () => sentData,
    getHeaders: () => resHeaders
  };

  return { req, res };
}

async function runTests() {
  console.log('--- TEST SUITE: ACCESS GATE PROTECTION & AUTH ---');

  // Test 1: Verify index.html does NOT contain protected sections or project text
  const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'portfolio', 'index.html'), 'utf8');
  assert(!indexHtml.includes('id="projects"'), 'Public index.html does NOT contain id="projects"');
  assert(!indexHtml.includes('id="process"'), 'Public index.html does NOT contain id="process"');
  assert(!indexHtml.includes('id="experience"'), 'Public index.html does NOT contain id="experience"');
  assert(!indexHtml.includes('id="contact"'), 'Public index.html does NOT contain id="contact"');
  assert(!indexHtml.includes('NAYAY AI'), 'Public index.html does NOT contain protected project text (NAYAY AI)');
  assert(!indexHtml.includes('Indian Penal Code'), 'Public index.html does NOT contain protected text (Indian Penal Code)');
  assert(indexHtml.includes('id="protected-content-root"'), 'Public index.html has protected-content-root injection target');

  // Test 2: Verify CV is not publicly accessible in portfolio/assets
  const publicCvExists = fs.existsSync(path.join(__dirname, '..', 'portfolio', 'assets', 'resume.pdf'));
  assert(!publicCvExists, 'CV (resume.pdf) is NOT located in public assets');
  const privateCvExists = fs.existsSync(path.join(__dirname, '..', 'api', 'private', 'resume.pdf'));
  assert(privateCvExists, 'CV (resume.pdf) is safely stored in private/ server directory');

  // Test 3: /api/content without auth header returns 401
  {
    const { req, res } = createMockReqRes({ headers: {} });
    await contentHandler(req, res);
    assert(res.getStatusCode() === 401, '/api/content without auth returns 401 Unauthorized');
  }

  // Test 4: /api/content with fake/invalid bearer token returns 401
  {
    const { req, res } = createMockReqRes({ headers: { 'authorization': 'Bearer fake_invalid_jwt_token' } });
    await contentHandler(req, res);
    assert(res.getStatusCode() === 401, '/api/content with invalid token returns 401');
  }

  // Test 5: /api/download-cv without auth returns 401
  {
    const { req, res } = createMockReqRes({ headers: {} });
    await cvHandler(req, res);
    assert(res.getStatusCode() === 401, '/api/download-cv without token returns 401 Unauthorized');
  }

  // Test 6: /api/content with guest mode enabled (ALLOW_GUEST=true) returns 200 and sections HTML
  {
    process.env.ALLOW_GUEST = 'true';
    const { req, res } = createMockReqRes({ headers: { 'x-guest-access': 'true' } });
    await contentHandler(req, res);
    const data = res.getData();
    assert(res.getStatusCode() === 200, '/api/content with ALLOW_GUEST=true returns 200');
    assert(data.ok === true && data.html.includes('id="projects"'), 'Guest mode response contains protected #projects section');
    process.env.ALLOW_GUEST = 'false';
  }

  // Test 7: /api/download-cv with guest mode enabled returns 200 and PDF buffer
  {
    process.env.ALLOW_GUEST = 'true';
    const { req, res } = createMockReqRes({ query: { guest: 'true' } });
    await cvHandler(req, res);
    const headers = res.getHeaders();
    assert(res.getStatusCode() === 200, '/api/download-cv with guest access returns 200');
    assert(headers['Content-Type'] === 'application/pdf', 'CV download has application/pdf content type');
    process.env.ALLOW_GUEST = 'false';
  }

  // Test 8: Rate-limit testing on /api/content
  {
    let rateLimited = false;
    for (let i = 0; i < 75; i++) {
      const { req, res } = createMockReqRes({ headers: {} });
      await contentHandler(req, res);
      if (res.getStatusCode() === 429) {
        rateLimited = true;
        break;
      }
    }
    assert(rateLimited, 'Rate limiter activates 429 Too Many Requests under burst traffic');
  }

  console.log(`\nResults: ${passedCount}/${totalCount} tests passed.`);
  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

runTests();

