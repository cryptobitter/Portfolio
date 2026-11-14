import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const cvPath = path.join(__dirname, 'private', 'resume.pdf');
  if (!fs.existsSync(cvPath)) {
    return res.status(404).json({ error: 'CV file not found.' });
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="Aditya_Rajput_Resume.pdf"');
  res.setHeader('Cache-Control', 'public, max-age=86400');

  const stream = fs.createReadStream(cvPath);
  stream.pipe(res);
}
