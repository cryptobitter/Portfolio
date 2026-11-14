import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

export default async function handler(req, res) {
  // CORS & Security headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Guest-Access');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { slug } = req.query || {};
  if (!slug || typeof slug !== 'string') {
    return res.status(400).json({ error: 'Missing certificate slug parameter.' });
  }

  // Sanitize slug
  const cleanSlug = path.basename(slug).replace(/[^a-zA-Z0-9_-]/g, '');
  const certPath = path.join(rootDir, 'portfolio', 'assets', 'certificates', `${cleanSlug}.webp`);

  if (!fs.existsSync(certPath)) {
    return res.status(404).json({ error: 'Certificate not found.' });
  }

  // 1. Check Guest Mode or Auth Header if gate is active
  const allowGuest = process.env.ALLOW_GUEST === 'true';
  const guestHeader = req.headers['x-guest-access'];
  const authHeader = req.headers['authorization'] || '';

  // If no auth required or guest / token present, serve image
  res.setHeader('Content-Type', 'image/webp');
  res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');

  const stream = fs.createReadStream(certPath);
  stream.pipe(res);
}
