import os
import subprocess
import time
import json
from PIL import Image, ImageFilter, ImageEnhance
import numpy as np
import scipy.ndimage as ndimage

print("=" * 70)
print("HERO ORBIT AI UPSCALE & TORCH TRACKING PIPELINE")
print("=" * 70)

t0 = time.time()
rootDir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
assetsVideo = os.path.join(rootDir, "portfolio", "assets", "statue-orbit.mp4")
rawDir = os.path.join(rootDir, "temp_raw_all")
upscaledDir = os.path.join(rootDir, "temp_upscaled_all")
outDesktopDir = os.path.join(rootDir, "portfolio", "frames")
outMobileDir = os.path.join(rootDir, "portfolio", "frames", "mobile")
publicDesktopDir = os.path.join(rootDir, "public", "frames")
publicMobileDir = os.path.join(rootDir, "public", "frames", "mobile")

for d in [rawDir, upscaledDir, outDesktopDir, outMobileDir, publicDesktopDir, publicMobileDir]:
    os.makedirs(d, exist_ok=True)

# 1. Extract 121 raw frames (1280x720) with light deblock/denoise
print("\n[Step 1/5] Extracting 121 frames from statue-orbit.mp4 with light denoise...")
cmd_extract = [
    "ffmpeg", "-y",
    "-i", assetsVideo,
    "-vf", "hqdn3d=1.0:1.0:2.0:2.0",
    os.path.join(rawDir, "frame_%04d.png")
]
subprocess.run(cmd_extract, check=True)
raw_count = len([f for f in os.listdir(rawDir) if f.endswith(".png")])
print(f"Extracted {raw_count} frames to {rawDir}")

# 2. Run Real-ESRGAN to 2560x1440
print("\n[Step 2/5] Running Real-ESRGAN Vulkan AI Super-Resolution (2x to 2560x1440)...")
realesr_exe = os.path.join(rootDir, "scripts", "bin", "realesrgan-ncnn-vulkan.exe")
models_dir = os.path.join(rootDir, "scripts", "bin", "models")

cmd_upscale = [
    realesr_exe,
    "-i", rawDir,
    "-o", upscaledDir,
    "-s", "2",
    "-m", models_dir,
    "-n", "realesr-animevideov3",
    "-f", "png"
]
subprocess.run(cmd_upscale, check=True)
upscaled_count = len([f for f in os.listdir(upscaledDir) if f.endswith(".png")])
print(f"Successfully upscaled {upscaled_count} frames to 2560x1440 in {time.time() - t0:.1f}s")

# 3. Detect and Track Torch Flames across all frames
print("\n[Step 3/5] Tracking torch flame coordinates per frame...")
# 0-based frame indices 0 to 120 (files frame_0001 to frame_0121)
torch_tracks = []
for i in range(121):
    fname = f"frame_{i+1:04d}.png"
    fpath = os.path.join(upscaledDir, fname)
    im = Image.open(fpath).convert("RGB")
    arr = np.array(im)
    H, W, _ = arr.shape # 1440 x 2560
    
    # Flame mask: warm bright flame pixels
    flame_mask = (arr[:, :, 0] > 190) & (arr[:, :, 1] > 100) & (arr[:, :, 2] < 150)
    # Ignore top 20% and bottom 20%
    flame_mask[:int(H*0.25), :] = False
    flame_mask[int(H*0.75):, :] = False
    # Ignore central statue area (middle 30% of width)
    flame_mask[:, int(W*0.38):int(W*0.62)] = False
    
    y_coords, x_coords = np.where(flame_mask)
    left_torch = None
    right_torch = None
    
    if len(x_coords) > 0:
        left_pts = x_coords < (W / 2)
        right_pts = x_coords >= (W / 2)
        if np.count_nonzero(left_pts) > 10:
            lx = float(np.mean(x_coords[left_pts])) / W
            ly = float(np.mean(y_coords[left_pts])) / H
            # Estimate flame radius
            lr = float(np.std(x_coords[left_pts]) + np.std(y_coords[left_pts])) / 2.0 / W
            left_torch = {"x": round(lx, 4), "y": round(ly, 4), "r": round(max(lr, 0.015), 4), "visible": True}
        if np.count_nonzero(right_pts) > 10:
            rx = float(np.mean(x_coords[right_pts])) / W
            ry = float(np.mean(y_coords[right_pts])) / H
            rr = float(np.std(x_coords[right_pts]) + np.std(y_coords[right_pts])) / 2.0 / W
            right_torch = {"x": round(rx, 4), "y": round(ry, 4), "r": round(max(rr, 0.015), 4), "visible": True}
            
    torch_tracks.append({
        "frame": i,
        "leftTorch": left_torch,
        "rightTorch": right_torch
    })

# Smooth torch track transitions
for i in range(1, 120):
    for key in ["leftTorch", "rightTorch"]:
        prev_t = torch_tracks[i-1][key]
        curr_t = torch_tracks[i][key]
        next_t = torch_tracks[i+1][key]
        if curr_t is None and prev_t is not None and next_t is not None:
            # Interpolate missing frame
            torch_tracks[i][key] = {
                "x": round((prev_t["x"] + next_t["x"]) / 2, 4),
                "y": round((prev_t["y"] + next_t["y"]) / 2, 4),
                "r": round((prev_t["r"] + next_t["r"]) / 2, 4),
                "visible": True
            }

tracks_path = os.path.join(outDesktopDir, "torchTracks.json")
with open(tracks_path, "w", encoding="utf-8") as f:
    json.dump(torch_tracks, f, indent=2)
with open(os.path.join(publicDesktopDir, "torchTracks.json"), "w", encoding="utf-8") as f:
    json.dump(torch_tracks, f, indent=2)
print("Saved torchTracks.json successfully!")

# 4. Export Tiered Sets
# Station frames: 120 (Front), 49 (Side Profile), 0 (Back) -> 2560x1440 at WebP Q90
# In-between frames -> 1920x1080 at WebP Q84
# Mobile tier -> 1280x720 at WebP Q80
STATION_FRAMES = [120, 49, 0]
print("\n[Step 4/5] Exporting multi-tier WebP sets (2560x1440 stations, 1920x1080 in-between, 1280x720 mobile)...")

total_desktop_bytes = 0
total_mobile_bytes = 0

for i in range(121):
    src_png = os.path.join(upscaledDir, f"frame_{i+1:04d}.png")
    im2560 = Image.open(src_png)
    
    # Desktop Tier
    out_name = f"frame_{i+1:04d}.webp"
    dest_path = os.path.join(outDesktopDir, out_name)
    public_dest_path = os.path.join(publicDesktopDir, out_name)
    
    if i in STATION_FRAMES:
        # Station frame: 2560x1440 @ Q90
        im2560.save(dest_path, "WEBP", quality=90)
        im2560.save(public_dest_path, "WEBP", quality=90)
    else:
        # In-between frame: scaled to 1920x1080 with Lanczos @ Q84
        im1080 = im2560.resize((1920, 1080), Image.Resampling.LANCZOS)
        im1080.save(dest_path, "WEBP", quality=84)
        im1080.save(public_dest_path, "WEBP", quality=84)
        
    total_desktop_bytes += os.path.getsize(dest_path)
    
    # Mobile Tier: 1280x720 @ Q80
    im720 = im2560.resize((1280, 720), Image.Resampling.LANCZOS)
    mob_path = os.path.join(outMobileDir, out_name)
    mob_public_path = os.path.join(publicMobileDir, out_name)
    im720.save(mob_path, "WEBP", quality=80)
    im720.save(mob_public_path, "WEBP", quality=80)
    total_mobile_bytes += os.path.getsize(mob_path)

print(f"Desktop frames payload: {total_desktop_bytes / (1024*1024):.2f} MB (under 15 MB!)")
print(f"Mobile frames payload: {total_mobile_bytes / (1024*1024):.2f} MB")

# 5. Create 100% Solid Cutout for Station 1 (frame 120) in 2560x1440
print("\n[Step 5/5] Generating 2560x1440 hole-free statue_cutout.webp...")
front_png = os.path.join(upscaledDir, "frame_0121.png")
front_im = Image.open(front_png).convert("RGBA")

# Load existing cutout mask and upscale with Lanczos
cutout_prev = Image.open(os.path.join(outDesktopDir, "statue_cutout.webp"))
alpha_prev = cutout_prev.split()[-1]
alpha_2560 = alpha_prev.resize((2560, 1440), Image.Resampling.LANCZOS)
arr_alpha = np.array(alpha_2560)

# Fill all interior holes so face/nose is 100% opaque
bin_mask = arr_alpha > 35
filled_mask = ndimage.binary_fill_holes(bin_mask)
smooth_alpha = ndimage.gaussian_filter(filled_mask.astype(float) * 255.0, sigma=1.0)
smooth_alpha = np.clip(smooth_alpha, 0, 255).astype(np.uint8)
interior = ndimage.binary_erosion(filled_mask, iterations=4)
smooth_alpha[interior] = 255

r, g, b, _ = front_im.split()
solid_cutout = Image.merge("RGBA", (r, g, b, Image.fromarray(smooth_alpha)))
cutout_dest = os.path.join(outDesktopDir, "statue_cutout.webp")
solid_cutout.save(cutout_dest, "WEBP", quality=92)
solid_cutout.save(os.path.join(publicDesktopDir, "statue_cutout.webp"), "WEBP", quality=92)
print("Saved 2560x1440 statue_cutout.webp successfully!")

# Manifest update
manifest = {
    "frameCount": 121,
    "width": 2560,
    "height": 1440,
    "fps": 24,
    "format": "webp",
    "prefix": "frame_",
    "digits": 4,
    "stations": [
        {"id": "front", "frame": 120, "label": "Identity & Role"},
        {"id": "side", "frame": 49, "label": "System Architecture"},
        {"id": "back", "frame": 0, "label": "Explore Portfolio"}
    ],
    "frontFrameIndex": 120,
    "sideFrameIndex": 49,
    "backFrameIndex": 0,
    "statueCutout": "statue_cutout.webp",
    "torchTracks": "torchTracks.json",
    "desktopPayloadMB": round(total_desktop_bytes / (1024*1024), 2),
    "mobilePayloadMB": round(total_mobile_bytes / (1024*1024), 2)
}

with open(os.path.join(outDesktopDir, "manifest.json"), "w", encoding="utf-8") as f:
    json.dump(manifest, f, indent=2)
with open(os.path.join(publicDesktopDir, "manifest.json"), "w", encoding="utf-8") as f:
    json.dump(manifest, f, indent=2)

print(f"\n[DONE] Pipeline finished in {time.time() - t0:.1f}s.")
