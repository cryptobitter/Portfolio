import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Guest-Access');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Token can be passed in Authorization header or as ?token= query parameter
  let token = '';
  const authHeader = req.headers['authorization'] || '';
  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.replace('Bearer ', '').trim();
  } else if (req.query?.token) {
    token = req.query.token.toString().trim();
  }

  const allowGuest = process.env.ALLOW_GUEST === 'true';
  const guestParam = req.query?.guest === 'true' || req.headers['x-guest-access'] === 'true';

  if (!allowGuest || !guestParam) {
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: Sign in required to download CV.' });
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
        return res.status(401).json({ error: 'Unauthorized: Invalid token or expired session.' });
      }
    } catch (err) {
      console.error('[API/DOWNLOAD-CV] Token verification error:', err);
      return res.status(500).json({ error: 'Verification service error.' });
    }
  }

  // Serve the private PDF
  const cvPath = path.join(__dirname, 'private', 'resume.pdf');
  if (!fs.existsSync(cvPath)) {
    return res.status(404).json({ error: 'Curriculum Vitae document not found.' });
  }

  const fileBuffer = fs.readFileSync(cvPath);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'inline; filename="Aditya_Rajput_CV.pdf"');
  res.setHeader('Cache-Control', 'private, max-age=3600');
  return res.status(200).send(fileBuffer);
}
