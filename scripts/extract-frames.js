/**
 * Frame Extraction Script for Marble Warrior-King Statue Orbit
 * 
 * Extracts video frames as optimized WebP images (~75 quality) and writes manifest.json.
 * Usage: node scripts/extract-frames.js [path-to-video.mp4]
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 1. Check if ffmpeg is available
try {
  execSync('ffmpeg -version', { stdio: 'ignore' });
} catch (err) {
  console.error('\n[Error] ffmpeg was not found on your system PATH.');
  console.error('To install ffmpeg on Windows:');
  console.error('  - Using winget: winget install Gyan.FFmpeg');
  console.error('  - Using Chocolatey: choco install ffmpeg');
  console.error('  - Or download from https://ffmpeg.org/download.html and add to PATH.\n');
  process.exit(1);
}

// 2. Resolve input video path
const defaultVideoPaths = [
  process.argv[2],
  'C:/Users/2k24c/.gemini/antigravity/brain/39e7e7fe-c3a1-40ce-a82b-0973a357f7d1/.user_uploaded/media_1794213358116_322c89b7.mp4',
  path.resolve(__dirname, '../portfolio/assets/statue-orbit.mp4'),
  path.resolve(__dirname, '../statue-orbit.mp4')
].filter(Boolean);

let videoPath = null;
for (const p of defaultVideoPaths) {
  if (fs.existsSync(p)) {
    videoPath = p;
    break;
  }
}

if (!videoPath) {
  console.error('[Error] Video file not found. Please provide path: node scripts/extract-frames.js <video.mp4>');
  process.exit(1);
}

console.log(`[1/4] Found video: ${videoPath}`);

// Also copy or save reference video in portfolio/assets/ for reproducibility
const assetsVideoPath = path.resolve(__dirname, '../portfolio/assets/statue-orbit.mp4');
try {
  if (videoPath !== assetsVideoPath && !fs.existsSync(assetsVideoPath)) {
    fs.copyFileSync(videoPath, assetsVideoPath);
    console.log(`[Info] Copied video to ${assetsVideoPath}`);
  }
} catch (e) {
  // ignore if copy fails
}

// 3. Define output directories: both public/frames and portfolio/frames for dev & build
const rootDir = path.resolve(__dirname, '..');
const outDirs = [
  path.resolve(rootDir, 'portfolio/public/frames'),
  path.resolve(rootDir, 'portfolio/frames')
];

outDirs.forEach(dir => {
  fs.mkdirSync(dir, { recursive: true });
});

const primaryDir = outDirs[0];

// 4. Run ffmpeg to extract WebP frames (quality ~75)
console.log('[2/4] Extracting frames with ffmpeg (quality 75, WebP format)...');
const outputPattern = path.join(primaryDir, 'frame_%04d.webp');
const ffmpegCmd = `ffmpeg -y -i "${videoPath}" -c:v libwebp -quality 75 -compression_level 4 -pix_fmt yuv420p "${outputPattern}"`;

try {
  execSync(ffmpegCmd, { stdio: 'inherit' });
} catch (err) {
  console.error('[Error] Failed running ffmpeg command:', err);
  process.exit(1);
}

// 5. Read generated frames and calculate metadata
console.log('[3/4] Indexing frames and computing size...');
const frameFiles = fs.readdirSync(primaryDir).filter(f => /^frame_\d+\.webp$/.test(f)).sort();

if (frameFiles.length === 0) {
  console.error('[Error] No WebP frames generated!');
  process.exit(1);
}

let totalSizeBytes = 0;
frameFiles.forEach(file => {
  const stat = fs.statSync(path.join(primaryDir, file));
  totalSizeBytes += stat.size;
});

const totalSizeMB = (totalSizeBytes / (1024 * 1024)).toFixed(2);
console.log(`[Info] Extracted ${frameFiles.length} frames. Total size: ${totalSizeMB} MB`);

// Get dimensions using ffprobe
let width = 1280;
let height = 720;
try {
  const probeOutput = execSync(`ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "${videoPath}"`, { encoding: 'utf-8' }).trim();
  const [w, h] = probeOutput.split('x').map(Number);
  if (w && h) {
    width = w;
    height = h;
  }
} catch (e) {
  console.warn('[Warning] ffprobe failed to get dimensions, using defaults 1280x720');
}

const manifest = {
  frameCount: frameFiles.length,
  width: width,
  height: height,
  fps: 24,
  format: 'webp',
  prefix: 'frame_',
  digits: 4,
  quality: 75,
  totalSizeBytes: totalSizeBytes,
  totalSizeMB: parseFloat(totalSizeMB),
  frontFrameIndex: frameFiles.length - 1, // last frame in video is front of statue
  backFrameIndex: 0 // first frame in video is back of statue
};

// 6. Write manifest and copy frames to second output dir for full compatibility
console.log('[4/4] Writing manifest.json...');
outDirs.forEach(dir => {
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');
  if (dir !== primaryDir) {
    // Sync frames to secondary dir
    frameFiles.forEach(f => {
      fs.copyFileSync(path.join(primaryDir, f), path.join(dir, f));
    });
  }
});

console.log(`\n[Success] Manifest and ${frameFiles.length} frames written to:`);
outDirs.forEach(dir => console.log(`  - ${dir}`));
console.log(`Dimensions: ${width}x${height} | Total Size: ${totalSizeMB} MB (Target: under 6 MB)\n`);
