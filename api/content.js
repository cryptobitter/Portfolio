import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory rate limiting map (IP -> timestamps array)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 60;

function isRateLimited(ip) {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) || [];
  const recent = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }
  recent.push(now);
  rateLimitMap.set(ip, recent);
  
  // Cleanup periodically
  if (rateLimitMap.size > 2000) {
    for (const [k, v] of rateLimitMap.entries()) {
      if (v.every(t => now - t >= RATE_LIMIT_WINDOW_MS)) {
        rateLimitMap.delete(k);
      }
    }
  }
  return false;
}

export default async function handler(req, res) {
  // CORS & Security headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Guest-Access');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  if (isRateLimited(clientIp)) {
    return res.status(429).json({ error: 'Too many requests. Please slow down.' });
  }

  // 1. Check Guest Mode flag
  const allowGuest = process.env.ALLOW_GUEST === 'true';
  const guestHeader = req.headers['x-guest-access'];
  const authHeader = req.headers['authorization'] || '';

  if (allowGuest && (guestHeader === 'true' || authHeader === 'Bearer guest_token')) {
    try {
      const contentPath = path.join(__dirname, 'sections-content.html');
      const html = fs.readFileSync(contentPath, 'utf8');
      return res.status(200).json({ ok: true, isGuest: true, html });
    } catch (err) {
      console.error('[API/CONTENT] Error reading content file:', err);
      return res.status(500).json({ error: 'Failed to read server content.' });
    }
  }

  // 2. Validate Supabase Access Token
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid authentication token.' });
  }

  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Empty bearer token.' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || 'https://rhclizphxdneznjzqrir.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_BiqeeMo2hFAihh9zn50woA_jvtCamYV';

  try {
    const authVerifyRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': supabaseKey
      }
    });

    if (!authVerifyRes.ok) {
      return res.status(401).json({ error: 'Unauthorized: Token validation failed or session expired.' });
    }

    const userData = await authVerifyRes.json();
    if (!userData || !userData.id) {
      return res.status(401).json({ error: 'Unauthorized: Invalid user payload.' });
    }

    // 3. Serve Protected Content
    const contentPath = path.join(__dirname, 'sections-content.html');
    const html = fs.readFileSync(contentPath, 'utf8');

    return res.status(200).json({
      ok: true,
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.user_metadata?.full_name || userData.user_metadata?.name || userData.email?.split('@')[0]
      },
      html
    });

  } catch (err) {
    console.error('[API/CONTENT] Verification network error:', err);
    return res.status(500).json({ error: 'Authentication verification service error.' });
  }
}
