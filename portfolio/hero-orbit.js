/**
 * ============================================================================
 * HERO ORBIT: STEP-BY-STEP SCROLLING, SUPER-RESOLUTION & LIVING CASTLE TORCHES
 * ============================================================================
 * 
 * 1. STEP SCROLLING (3 Stations):
 *    - Station 1 FRONT (frame 120): Wordmark, Name, Role, Bio, Actions.
 *    - Station 2 PROFILE (frame 49): Three System Architecture Pillars card.
 *    - Station 3 BACK (frame 0): "Scroll to see my work" cue.
 *    - One scroll gesture (wheel, swipe, keys) initiates time-based move (1.5s).
 *    - Frame blending (frac interpolation) for silky smooth transitions.
 *    - Boundary handoff: Station 3 down releases pin to #projects.
 *      Scrolling up into hero lands on Station 3 and steps back through 2 and 1.
 * 
 * 2. SHARPER 2560x1440 SUPER-RESOLUTION:
 *    - Rendered on high-DPI canvas backing store (CSS size x min(DPR, 2)).
 *    - ctx.imageSmoothingEnabled = true, imageSmoothingQuality = 'high'.
 *    - Async decode with createImageBitmap when supported.
 *    - Solid 2560x1440 statue cutout on foreground canvas.
 * 
 * 3. LIVING PROCEDURAL TORCHES:
 *    - Reads interpolated flame coordinates from torchTracks.json.
 *    - Sconce backing to cover baked KlingAI white blobs.
 *    - Independent phase/frequency procedural flames (8-15 Hz).
 *    - Ambient radial wall glow pulsing subtly with torch flicker.
 *    - Rising ember sparks + floating ambient room dust motes.
 *    - Auto-pauses offscreen via IntersectionObserver.
 *    - Static fallback under prefers-reduced-motion.
 */
(function () {
  'use strict';

  // ============================================================================
  // CONFIGURATION & TUNING
  // ============================================================================
  const CONFIG = {
    stations: [
      { id: 'front', frame: 120, label: '01. FRONT', title: 'Aditya Rajput - Full Stack & AI Engineer' },
      { id: 'side',  frame: 49,  label: '02. PROFILE', title: 'System Architecture & Capabilities' },
      { id: 'back',  frame: 0,   label: '03. BACK', title: 'Featured Projects & Work' }
    ],
    moveDuration: 1500,        // Step move transition duration in ms (1.4s - 1.8s)
    cooldown: 300,             // Cooldown after move to swallow trackpad inertia (ms)
    flameIntensity: 1.0,       // Torch flame intensity multiplier (0.0 = off, 1.0 = standard, 1.5 = roaring)
    emberCount: 8,             // Rising ember sparks per torch
    moteCount: 20,             // Subtle floating ambient room dust motes
    wheelThreshold: 20,        // Minimum wheel deltaY to trigger station step
    touchThreshold: 35         // Minimum touch swipe deltaY to trigger station step
  };

  const ROLE_LABEL = 'FULL STACK & AI ENGINEER';

  // DOM Elements Cache
  let heroSection = null;
  let heroOrbitStage = null;
  let canvas = null;
  let ctx = null;
  let fgCanvas = null;
  let fgCtx = null;
  let fgImg = null;
  let torchCanvas = null;
  let torchCtx = null;

  // Chapter Elements
  let elWordmark = null;
  let elChapterIntro = null;
  let elChapterFeatures = null;
  let elPillar1 = null;
  let elPillar2 = null;
  let elPillar3 = null;
  let elChapterChips = null;
  let elChips = [];
  let elChapterCue = null;
  let stationDots = [];

  // State
  let manifest = {
    frameCount: 121,
    width: 2560,
    height: 1440,
    fps: 24,
    format: 'webp',
    prefix: 'frame_',
    digits: 4,
    frontFrameIndex: 120,
    sideFrameIndex: 49,
    backFrameIndex: 0
  };
  let torchTracks = [];
  let currentStationIndex = 0;
  let currentFrameFloat = CONFIG.stations[0].frame;
  let isMoving = false;
  let moveStartTime = 0;
  let moveStartFrame = CONFIG.stations[0].frame;
  let moveEndFrame = CONFIG.stations[0].frame;
  let moveFromStation = 0;
  let moveToStationTarget = 0;
  let lastMoveEndTime = 0;
  let isHeroActive = true;
  let isMobile = false;
  let prefersReducedMotion = false;
  let framesBaseDir = 'frames/';

  // Frame Cache
  const loadedFrames = new Map();
  const bitmapCache = new Map();
  const pendingRequests = new Set();

  // Easing function: cubic ease-in-out
  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

  // Determine frame URL
  function getFrameUrl(index) {
    const frameNum = index + 1; // 1-based (frame_0001.webp .. frame_0121.webp)
    const padded = String(frameNum).padStart(manifest.digits || 4, '0');
    return `${framesBaseDir}${manifest.prefix || 'frame_'}${padded}.${manifest.format || 'webp'}`;
  }

  // Retrieve cached image or bitmap
  function getFrameDrawable(index) {
    if (bitmapCache.has(index)) return bitmapCache.get(index);
    if (loadedFrames.has(index)) return loadedFrames.get(index);
    return null;
  }

  function findClosestLoadedDrawable(targetIndex) {
    const direct = getFrameDrawable(targetIndex);
    if (direct) return direct;
    let bestDist = Infinity;
    let bestDrawable = null;
    for (const [idx, item] of loadedFrames.entries()) {
      if (item && item.complete && item.naturalWidth) {
        const d = Math.abs(idx - targetIndex);
        if (d < bestDist) {
          bestDist = d;
          bestDrawable = bitmapCache.get(idx) || item;
        }
      }
    }
    return bestDrawable;
  }

  // Load a single frame with async createImageBitmap decode where possible
  function loadSingleFrame(index, priority = false) {
    if (index < 0 || index >= manifest.frameCount) return;
    if (loadedFrames.has(index) || pendingRequests.has(index)) return;

    pendingRequests.add(index);
    const img = new Image();
    img.decoding = priority ? 'sync' : 'async';
    img.src = getFrameUrl(index);

    img.onload = () => {
      loadedFrames.set(index, img);
      pendingRequests.delete(index);
      if (window.createImageBitmap) {
        createImageBitmap(img)
          .then((bmp) => {
            bitmapCache.set(index, bmp);
            if (Math.abs(currentFrameFloat - index) <= 1.0 && !isMoving) {
              renderBlendedFrame(currentFrameFloat);
            }
          })
          .catch(() => {
            if (Math.abs(currentFrameFloat - index) <= 1.0 && !isMoving) {
              renderBlendedFrame(currentFrameFloat);
            }
          });
      } else {
        if (Math.abs(currentFrameFloat - index) <= 1.0 && !isMoving) {
          renderBlendedFrame(currentFrameFloat);
        }
      }
    };
    img.onerror = () => {
      pendingRequests.delete(index);
    };
  }

  // Draw single image cover-fit with crown preserved
  function drawImageCover(targetCtx, targetCanvas, img) {
    const cw = targetCanvas.width;
    const ch = targetCanvas.height;
    const iw = img.width || img.naturalWidth || manifest.width;
    const ih = img.height || img.naturalHeight || manifest.height;
    const scale = Math.max(cw / iw, ch / ih);
    const drawW = iw * scale;
    const drawH = ih * scale;
    const drawX = (cw - drawW) / 2;
    const drawY = drawH > ch ? 0 : (ch - drawH) / 2;
    targetCtx.drawImage(img, drawX, drawY, drawW, drawH);
    return { drawX, drawY, drawW, drawH, scale };
  }

  // Render blended frames for fractional intermediate progress
  function renderBlendedFrame(frameFloat) {
    if (!ctx || !canvas) return;
    const clamped = clamp(frameFloat, 0, manifest.frameCount - 1);
    const baseIndex = Math.floor(clamped);
    const nextIndex = Math.min(manifest.frameCount - 1, baseIndex + 1);
    const frac = clamped - baseIndex;

    const imgA = findClosestLoadedDrawable(baseIndex);
    if (!imgA) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawImageCover(ctx, canvas, imgA);

    if (frac > 0.02 && nextIndex !== baseIndex) {
      const imgB = findClosestLoadedDrawable(nextIndex);
      if (imgB && imgB !== imgA) {
        ctx.save();
        ctx.globalAlpha = frac;
        drawImageCover(ctx, canvas, imgB);
        ctx.restore();
      }
    }
  }

  // Foreground statue cutout (above wordmark)
  function drawFgStatue() {
    if (!fgCtx || !fgCanvas || !fgImg || !fgImg.complete || !fgImg.naturalWidth) return;
    fgCtx.clearRect(0, 0, fgCanvas.width, fgCanvas.height);
    drawImageCover(fgCtx, fgCanvas, fgImg);
  }

  // Resize canvases taking DPR into account
  function resizeAllCanvases() {
    if (!heroOrbitStage || !canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = heroOrbitStage.getBoundingClientRect();
    const w = rect.width || window.innerWidth;
    const h = rect.height || window.innerHeight;
    const pw = Math.round(w * dpr);
    const ph = Math.round(h * dpr);

    [canvas, fgCanvas, torchCanvas].forEach((c) => {
      if (c) {
        c.width = pw;
        c.height = ph;
      }
    });

    [ctx, fgCtx, torchCtx].forEach((cx) => {
      if (cx) {
        cx.imageSmoothingEnabled = true;
        cx.imageSmoothingQuality = 'high';
      }
    });

    renderBlendedFrame(currentFrameFloat);
    drawFgStatue();
  }

  // Update chapter text, pillars, and cue opacities
  function updateStationChapters(stationIdx, transitionProgress = 1.0, isExiting = false) {
    // Station 1: Intro & Wordmark
    if (elWordmark && elChapterIntro) {
      let opacity = 0;
      if (stationIdx === 0 && !isExiting) {
        opacity = transitionProgress;
      } else if (stationIdx === 0 && isExiting) {
        opacity = 1 - transitionProgress;
      }
      elWordmark.style.opacity = String(opacity.toFixed(3));
      elChapterIntro.style.opacity = String(opacity.toFixed(3));
      elWordmark.style.pointerEvents = opacity > 0.6 ? 'auto' : 'none';
      elChapterIntro.classList.toggle('interactive', opacity > 0.6);
      if (fgCanvas) {
        fgCanvas.style.opacity = String(opacity.toFixed(3));
      }
    }

    // Station 2: Three Pillars Card
    if (elChapterFeatures) {
      let opacity = 0;
      if (stationIdx === 1 && !isExiting) {
        opacity = transitionProgress;
      } else if (stationIdx === 1 && isExiting) {
        opacity = 1 - transitionProgress;
      }
      elChapterFeatures.style.opacity = String(opacity.toFixed(3));
      elChapterFeatures.classList.toggle('interactive', opacity > 0.6);
      
      // Staggered pillars reveal
      if (elPillar1) elPillar1.style.opacity = String(Math.min(1, opacity * 1.3).toFixed(3));
      if (elPillar2) elPillar2.style.opacity = String(Math.min(1, Math.max(0, (opacity - 0.2) * 1.3)).toFixed(3));
      if (elPillar3) elPillar3.style.opacity = String(Math.min(1, Math.max(0, (opacity - 0.4) * 1.3)).toFixed(3));
    }

    // Station 3: Cue Link
    if (elChapterCue) {
      let opacity = 0;
      if (stationIdx === 2 && !isExiting) {
        opacity = transitionProgress;
      } else if (stationIdx === 2 && isExiting) {
        opacity = 1 - transitionProgress;
      }
      elChapterCue.style.opacity = String(opacity.toFixed(3));
      elChapterCue.classList.toggle('interactive', opacity > 0.6);
    }
  }

  // Update station dots navigation state
  function updateStationDots(targetIndex) {
    stationDots.forEach((dot, idx) => {
      const isActive = idx === targetIndex;
      dot.classList.toggle('active', isActive);
      if (isActive) {
        dot.setAttribute('aria-current', 'step');
      } else {
        dot.removeAttribute('aria-current');
      }
    });
  }

  // ============================================================================
  // TIME-BASED STEP TRANSITION
  // ============================================================================
  function goToStation(targetIndex) {
    if (targetIndex < 0 || targetIndex >= CONFIG.stations.length) return;
    if (isMoving) return;
    const now = Date.now();
    if (now - lastMoveEndTime < CONFIG.cooldown) return;
    if (targetIndex === currentStationIndex && currentFrameFloat === CONFIG.stations[targetIndex].frame) return;

    // Respect prefers-reduced-motion: instant jump with short crossfade
    if (prefersReducedMotion) {
      moveFromStation = currentStationIndex;
      currentStationIndex = targetIndex;
      currentFrameFloat = CONFIG.stations[targetIndex].frame;
      updateStationDots(targetIndex);
      updateStationChapters(moveFromStation, 1, true);
      setTimeout(() => {
        renderBlendedFrame(currentFrameFloat);
        updateStationChapters(targetIndex, 1, false);
      }, 150);
      return;
    }

    isMoving = true;
    moveFromStation = currentStationIndex;
    moveToStationTarget = targetIndex;
    moveStartFrame = currentFrameFloat;
    moveEndFrame = CONFIG.stations[targetIndex].frame;
    moveStartTime = performance.now();

    updateStationDots(targetIndex);

    function animateStep(timestamp) {
      const elapsed = timestamp - moveStartTime;
      const t = clamp(elapsed / CONFIG.moveDuration, 0, 1);
      const easeT = easeInOutCubic(t);

      // Frame interpolation
      currentFrameFloat = moveStartFrame + (moveEndFrame - moveStartFrame) * easeT;
      renderBlendedFrame(currentFrameFloat);

      // Chapter text transitions:
      // First 30% -> fade out old station
      // Middle 40% -> statue moves clean
      // Last 30%  -> fade in new station
      if (t <= 0.30) {
        const exitProgress = t / 0.30;
        updateStationChapters(moveFromStation, exitProgress, true);
        updateStationChapters(moveToStationTarget, 0, false);
      } else if (t < 0.70) {
        updateStationChapters(moveFromStation, 1, true);
        updateStationChapters(moveToStationTarget, 0, false);
      } else {
        const enterProgress = (t - 0.70) / 0.30;
        updateStationChapters(moveFromStation, 1, true);
        updateStationChapters(moveToStationTarget, enterProgress, false);
      }

      if (t < 1) {
        requestAnimationFrame(animateStep);
      } else {
        isMoving = false;
        currentStationIndex = moveToStationTarget;
        currentFrameFloat = moveEndFrame;
        lastMoveEndTime = Date.now();
        renderBlendedFrame(currentFrameFloat);
        updateStationChapters(currentStationIndex, 1, false);
      }
    }

    requestAnimationFrame(animateStep);
  }

  // ============================================================================
  // LIVING PROCEDURAL TORCHES & AMBIENT FLICKER
  // ============================================================================
  const torchEmbers = [];
  const roomMotes = [];
  let torchAnimFrameId = null;
  let isTorchVisible = true;

  function initTorchesAndMotes() {
    // Initialize rising embers (8 per torch)
    for (let t = 0; t < 2; t++) {
      for (let i = 0; i < CONFIG.emberCount; i++) {
        torchEmbers.push({
          torchId: t, // 0 = left, 1 = right
          dx: (Math.random() - 0.5) * 16,
          dy: -Math.random() * 40 - 10,
          speed: 0.6 + Math.random() * 0.9,
          size: 1.2 + Math.random() * 1.8,
          alpha: Math.random(),
          decay: 0.012 + Math.random() * 0.018,
          wobbleFreq: 6 + Math.random() * 8,
          wobbleAmp: 1.5 + Math.random() * 2.0
        });
      }
    }

    // Initialize 20 subtle ambient dust motes
    for (let i = 0; i < CONFIG.moteCount; i++) {
      roomMotes.push({
        x: Math.random(),
        y: Math.random(),
        vx: (Math.random() - 0.5) * 0.0003,
        vy: -Math.random() * 0.0004 - 0.0001,
        size: 1.0 + Math.random() * 2.0,
        alpha: 0.08 + Math.random() * 0.16,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  function getInterpolatedTorchTrack(frameFloat) {
    if (!torchTracks || torchTracks.length === 0) return null;
    const clamped = clamp(frameFloat, 0, torchTracks.length - 1);
    const i0 = Math.floor(clamped);
    const i1 = Math.min(torchTracks.length - 1, i0 + 1);
    const frac = clamped - i0;

    const t0 = torchTracks[i0];
    const t1 = torchTracks[i1];
    if (!t0) return null;

    function lerpTorch(k) {
      const p0 = t0[k];
      const p1 = t1 ? t1[k] : null;
      if (!p0 && !p1) return null;
      if (p0 && !p1) return { ...p0, opacity: Math.max(0, 1 - frac * 2) };
      if (!p0 && p1) return { ...p1, opacity: Math.max(0, (frac - 0.5) * 2) };
      return {
        x: p0.x + (p1.x - p0.x) * frac,
        y: p0.y + (p1.y - p0.y) * frac,
        r: p0.r + (p1.r - p0.r) * frac,
        opacity: 1.0
      };
    }

    return {
      leftTorch: lerpTorch('leftTorch'),
      rightTorch: lerpTorch('rightTorch')
    };
  }

  function renderTorches(time) {
    if (!torchCtx || !torchCanvas || !isTorchVisible) return;
    const cw = torchCanvas.width;
    const ch = torchCanvas.height;
    torchCtx.clearRect(0, 0, cw, ch);

    if (CONFIG.flameIntensity <= 0.01) return;

    // Determine frame cover metrics to map torch coordinates accurately
    const iw = manifest.width || 2560;
    const ih = manifest.height || 1440;
    const scale = Math.max(cw / iw, ch / ih);
    const drawW = iw * scale;
    const drawH = ih * scale;
    const drawX = (cw - drawW) / 2;
    const drawY = drawH > ch ? 0 : (ch - drawH) / 2;

    const tracks = getInterpolatedTorchTrack(currentFrameFloat);

    // Render 20 subtle floating dust motes
    if (!prefersReducedMotion) {
      torchCtx.save();
      roomMotes.forEach((mote) => {
        mote.x += mote.vx;
        mote.y += mote.vy;
        if (mote.y < 0) { mote.y = 1; mote.x = Math.random(); }
        if (mote.x < 0) mote.x = 1;
        if (mote.x > 1) mote.x = 0;
        const pulse = Math.sin(time * 0.002 + mote.phase) * 0.05;
        torchCtx.fillStyle = `rgba(235, 215, 175, ${clamp(mote.alpha + pulse, 0.04, 0.28)})`;
        torchCtx.beginPath();
        torchCtx.arc(mote.x * cw, mote.y * ch, mote.size, 0, Math.PI * 2);
        torchCtx.fill();
      });
      torchCtx.restore();
    }

    if (!tracks) return;

    const torches = [
      { id: 0, data: tracks.leftTorch, phaseOffset: 0.0, speed: 1.0 },
      { id: 1, data: tracks.rightTorch, phaseOffset: 2.37, speed: 1.14 }
    ];

    torches.forEach((torch) => {
      const tData = torch.data;
      if (!tData || !tData.opacity || tData.opacity <= 0.01) return;

      const px = drawX + tData.x * drawW;
      const py = drawY + tData.y * drawH;
      const baseR = (tData.r || 0.015) * drawW;
      const opacity = tData.opacity;

      // Independent frequencies per torch (8 - 15 Hz)
      const tSec = (time * 0.001 * torch.speed) + torch.phaseOffset;
      const f1 = Math.sin(tSec * 11.3);
      const f2 = Math.cos(tSec * 14.7 + 1.2);
      const f3 = Math.sin(tSec * 8.2 + 2.5);
      const flameFlicker = prefersReducedMotion ? 0 : (f1 * 0.05 + f2 * 0.03 + f3 * 0.02);
      const flameHeightMult = 1.0 + (prefersReducedMotion ? 0 : f1 * 0.12 + f3 * 0.08);

      const intensity = CONFIG.flameIntensity;

      // 1. SCONCE BACKING: Dark warm backing to cover baked-in KlingAI white flame
      torchCtx.save();
      torchCtx.globalAlpha = opacity;
      const backingGrad = torchCtx.createRadialGradient(px, py + baseR * 0.2, 2, px, py + baseR * 0.2, baseR * 1.5);
      backingGrad.addColorStop(0, 'rgba(38, 22, 10, 0.95)');
      backingGrad.addColorStop(0.5, 'rgba(28, 16, 8, 0.75)');
      backingGrad.addColorStop(1, 'rgba(15, 12, 10, 0)');
      torchCtx.fillStyle = backingGrad;
      torchCtx.beginPath();
      torchCtx.arc(px, py + baseR * 0.2, baseR * 1.5, 0, Math.PI * 2);
      torchCtx.fill();

      // 2. AMBIENT WALL GLOW (Pulses 3-5% with torch flame)
      const glowR = baseR * 6.5;
      const glowGrad = torchCtx.createRadialGradient(px, py, 4, px, py, glowR);
      const glowAlpha = clamp((0.14 + flameFlicker * 0.04) * intensity * opacity, 0, 0.35);
      glowGrad.addColorStop(0, `rgba(232, 139, 58, ${glowAlpha})`);
      glowGrad.addColorStop(0.4, `rgba(201, 162, 75, ${glowAlpha * 0.5})`);
      glowGrad.addColorStop(1, 'rgba(232, 139, 58, 0)');
      torchCtx.fillStyle = glowGrad;
      torchCtx.beginPath();
      torchCtx.arc(px, py, glowR, 0, Math.PI * 2);
      torchCtx.fill();

      // 3. PROCEDURAL FLAME: Soft overlapping teardrop / elliptical shapes
      const flameH = baseR * 2.2 * flameHeightMult * intensity;
      const flameW = baseR * 0.95 * (1 + flameFlicker * 0.5) * intensity;
      const flameTipX = px + (prefersReducedMotion ? 0 : f2 * 3.5);

      // Outer Flame (Warm Gold / Ember)
      const outerGrad = torchCtx.createRadialGradient(px, py - flameH * 0.3, 2, px, py - flameH * 0.3, flameH);
      outerGrad.addColorStop(0, `rgba(240, 160, 50, ${0.85 * opacity})`);
      outerGrad.addColorStop(0.4, `rgba(226, 120, 30, ${0.70 * opacity})`);
      outerGrad.addColorStop(0.85, `rgba(180, 70, 15, ${0.40 * opacity})`);
      outerGrad.addColorStop(1, 'rgba(140, 45, 10, 0)');
      torchCtx.fillStyle = outerGrad;
      torchCtx.beginPath();
      torchCtx.ellipse(px, py - flameH * 0.35, flameW, flameH * 0.65, 0, 0, Math.PI * 2);
      torchCtx.fill();

      // Inner Core Flame (Brilliant Torch Yellow)
      const innerGrad = torchCtx.createRadialGradient(flameTipX, py - flameH * 0.25, 1, px, py - flameH * 0.25, flameW * 0.7);
      innerGrad.addColorStop(0, `rgba(255, 235, 175, ${0.95 * opacity})`);
      innerGrad.addColorStop(0.5, `rgba(245, 185, 75, ${0.80 * opacity})`);
      innerGrad.addColorStop(1, 'rgba(230, 140, 35, 0)');
      torchCtx.fillStyle = innerGrad;
      torchCtx.beginPath();
      torchCtx.ellipse(flameTipX, py - flameH * 0.3, flameW * 0.5, flameH * 0.45, 0, 0, Math.PI * 2);
      torchCtx.fill();

      // 4. RISING EMBERS & SPARKS (Static fallback under prefers-reduced-motion)
      if (!prefersReducedMotion) {
        torchEmbers.filter(e => e.torchId === torch.id).forEach((ember) => {
          ember.dy -= ember.speed;
          ember.alpha -= ember.decay;
          const wobble = Math.sin(tSec * ember.wobbleFreq) * ember.wobbleAmp;

          const ex = px + ember.dx + wobble;
          const ey = py + ember.dy;

          if (ember.alpha > 0) {
            torchCtx.fillStyle = `rgba(255, 205, 110, ${clamp(ember.alpha * opacity, 0, 1)})`;
            torchCtx.beginPath();
            torchCtx.arc(ex, ey, ember.size, 0, Math.PI * 2);
            torchCtx.fill();
          } else {
            // Respawn ember near flame base
            ember.dx = (Math.random() - 0.5) * (flameW * 1.2);
            ember.dy = -Math.random() * 8;
            ember.alpha = 0.8 + Math.random() * 0.2;
            ember.speed = 0.7 + Math.random() * 1.1;
          }
        });
      }

      torchCtx.restore();
    });
  }

  function torchLoop(now) {
    if (isTorchVisible && !document.hidden) {
      renderTorches(now);
    }
    torchAnimFrameId = requestAnimationFrame(torchLoop);
  }

  // ============================================================================
  // PROGRESSIVE ASSET LOADING
  // ============================================================================
  function preloadAssetsProgressively() {
    isMobile = window.innerWidth < 768;
    const total = manifest.frameCount;

    // Load Cutout image
    fgImg = new Image();
    fgImg.src = framesBaseDir + (manifest.statueCutout || 'statue_cutout.webp');
    fgImg.onload = () => {
      drawFgStatue();
    };

    // Load remaining Station Frames first: Station 2 (Profile: 49) and Station 3 (Back: 0)
    CONFIG.stations.forEach((st) => {
      if (!loadedFrames.has(st.frame)) {
        loadSingleFrame(st.frame, true);
      }
    });

    // Queue in-between frames for background idle load
    const queue = [];
    for (let i = 0; i < total; i++) {
      if (!CONFIG.stations.some(s => s.frame === i)) {
        queue.push(i);
      }
    }

    let qIdx = 0;
    const BATCH = 8;
    function loadBatch() {
      if (qIdx >= queue.length) return;
      const slice = queue.slice(qIdx, qIdx + BATCH);
      qIdx += BATCH;
      slice.forEach((idx) => loadSingleFrame(idx, false));
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(loadBatch, { timeout: 350 });
      } else {
        setTimeout(loadBatch, 35);
      }
    }

    setTimeout(loadBatch, 150);
  }

  // ============================================================================
  // GESTURE & SCROLL INTERACTION CONTROLLER
  // ============================================================================
  function setupGestures() {
    let touchStartY = 0;

    // 1. Wheel Interaction
    window.addEventListener('wheel', (e) => {
      const scrollY = window.scrollY || window.pageYOffset || 0;

      // When at top of page and hero is active
      if (scrollY <= 5 && isHeroActive) {
        if (Math.abs(e.deltaY) < CONFIG.wheelThreshold) return;

        if (e.deltaY > 0) {
          // Downward gesture
          if (currentStationIndex < CONFIG.stations.length - 1) {
            e.preventDefault();
            goToStation(currentStationIndex + 1);
          } else {
            // At Station 3 (Back): Release hero pin & scroll to #projects!
            isHeroActive = false;
            const projSec = document.getElementById('projects');
            if (projSec) {
              e.preventDefault();
              projSec.scrollIntoView({ behavior: 'smooth' });
            }
          }
        } else if (e.deltaY < 0) {
          // Upward gesture
          if (currentStationIndex > 0) {
            e.preventDefault();
            goToStation(currentStationIndex - 1);
          } else {
            // At Station 1: Allow normal scroll (already top of page)
          }
        }
      }
    }, { passive: false });

    // 2. Touch Swipes
    window.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches.length) {
        touchStartY = e.touches[0].clientY;
      }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      const scrollY = window.scrollY || window.pageYOffset || 0;
      if (scrollY <= 5 && isHeroActive && e.touches && e.touches.length) {
        const deltaY = touchStartY - e.touches[0].clientY;
        if (Math.abs(deltaY) > CONFIG.touchThreshold) {
          if (deltaY > 0) {
            // Swipe Up -> Step Down
            if (currentStationIndex < CONFIG.stations.length - 1) {
              e.preventDefault();
              goToStation(currentStationIndex + 1);
              touchStartY = e.touches[0].clientY;
            } else {
              // At Station 3: Release pin
              isHeroActive = false;
              const projSec = document.getElementById('projects');
              if (projSec) projSec.scrollIntoView({ behavior: 'smooth' });
            }
          } else {
            // Swipe Down -> Step Up
            if (currentStationIndex > 0) {
              e.preventDefault();
              goToStation(currentStationIndex - 1);
              touchStartY = e.touches[0].clientY;
            }
          }
        }
      }
    }, { passive: false });

    // 3. Keyboard Navigation
    window.addEventListener('keydown', (e) => {
      const scrollY = window.scrollY || window.pageYOffset || 0;
      if (scrollY <= 5 && isHeroActive) {
        if (['ArrowDown', 'PageDown', ' '].includes(e.key)) {
          if (currentStationIndex < CONFIG.stations.length - 1) {
            e.preventDefault();
            goToStation(currentStationIndex + 1);
          } else {
            isHeroActive = false;
            const projSec = document.getElementById('projects');
            if (projSec) {
              e.preventDefault();
              projSec.scrollIntoView({ behavior: 'smooth' });
            }
          }
        } else if (['ArrowUp', 'PageUp'].includes(e.key)) {
          if (currentStationIndex > 0) {
            e.preventDefault();
            goToStation(currentStationIndex - 1);
          }
        }
      }
    });

    // 4. Boundary Handoff: Re-entering Hero from #projects lands on Station 3
    window.addEventListener('scroll', () => {
      const scrollY = window.scrollY || window.pageYOffset || 0;
      if (scrollY <= 15 && !isHeroActive) {
        isHeroActive = true;
        currentStationIndex = 2; // Station 3 (Back)
        currentFrameFloat = CONFIG.stations[2].frame;
        updateStationDots(2);
        renderBlendedFrame(currentFrameFloat);
        updateStationChapters(2, 1, false);
      }
    }, { passive: true });

    // 5. Station Navigation Dots
    stationDots.forEach((dot, idx) => {
      dot.addEventListener('click', () => {
        isHeroActive = true;
        const scrollY = window.scrollY || window.pageYOffset || 0;
        if (scrollY > 15) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        goToStation(idx);
      });
    });

    // 6. Action Links: Skip link, See featured work, Scroll to work cue
    const jumpLinks = document.querySelectorAll('.skip-to-projects-link, a[href="#projects"]');
    jumpLinks.forEach((link) => {
      link.addEventListener('click', (e) => {
        isHeroActive = false;
        const projSec = document.getElementById('projects');
        if (projSec) {
          e.preventDefault();
          projSec.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  async function initHeroOrbit() {
    heroSection = document.getElementById('hero');
    heroOrbitStage = document.getElementById('heroOrbitStage');
    canvas = document.getElementById('heroOrbitCanvas');
    fgCanvas = document.getElementById('heroOrbitFgCanvas');
    torchCanvas = document.getElementById('heroTorchCanvas');

    if (!heroSection || !heroOrbitStage || !canvas) return;

    ctx = canvas.getContext('2d');
    if (fgCanvas) fgCtx = fgCanvas.getContext('2d');
    if (torchCanvas) torchCtx = torchCanvas.getContext('2d');

    prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    isMobile = window.innerWidth < 768;

    // Cache Chapter DOM Elements
    elWordmark = document.getElementById('heroWordmarkWrap');
    elChapterIntro = document.getElementById('heroChapterIntro');
    elChapterFeatures = document.getElementById('heroChapterFeatures');
    elPillar1 = document.getElementById('pillarItem1');
    elPillar2 = document.getElementById('pillarItem2');
    elPillar3 = document.getElementById('pillarItem3');
    elChapterChips = document.getElementById('heroChapterChips');
    elChips = elChapterChips ? Array.from(elChapterChips.querySelectorAll('.orbit-chip')) : [];
    elChapterCue = document.getElementById('heroChapterCue');
    stationDots = Array.from(document.querySelectorAll('.station-dot'));

    // Synchronize role text
    document.querySelectorAll('.nav-role, .hero-tagline, .hero-tagline-badge').forEach((el) => {
      el.textContent = ROLE_LABEL;
    });

    // Select frames directory tier
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const useMobileTier = (window.innerWidth * dpr < 1000);
    framesBaseDir = useMobileTier ? 'frames/mobile/' : 'frames/';

    // Load Manifest
    const manifestCandidates = ['frames/manifest.json', 'public/frames/manifest.json'];
    for (const mUrl of manifestCandidates) {
      try {
        const res = await fetch(mUrl);
        if (res.ok) {
          manifest = await res.json();
          break;
        }
      } catch (e) {}
    }

    // Load Torch Tracks
    const tracksCandidates = ['frames/torchTracks.json', 'public/frames/torchTracks.json'];
    for (const tUrl of tracksCandidates) {
      try {
        const res = await fetch(tUrl);
        if (res.ok) {
          torchTracks = await res.json();
          break;
        }
      } catch (e) {}
    }

    // Setup living torches & motes
    initTorchesAndMotes();
    torchAnimFrameId = requestAnimationFrame(torchLoop);

    // Pause torch loop when hero is offscreen
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          isTorchVisible = entry.isIntersecting;
        });
      }, { threshold: 0.05 });
      observer.observe(heroSection);
    }

    // Load Station 1 (Front: frame 120) IMMEDIATELY as Poster!
    const frontIndex = CONFIG.stations[0].frame;
    const frontImg = new Image();
    frontImg.decoding = 'sync';
    frontImg.src = getFrameUrl(frontIndex);
    frontImg.onload = () => {
      loadedFrames.set(frontIndex, frontImg);
      resizeAllCanvases();
      renderBlendedFrame(frontIndex);
      updateStationChapters(0, 1, false);
      updateStationDots(0);

      // Preload the rest progressively
      preloadAssetsProgressively();
    };

    // Sizing & Gestures
    resizeAllCanvases();
    setupGestures();

    // Resize listener (debounced)
    let resizeTimer = 0;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        isMobile = window.innerWidth < 768;
        resizeAllCanvases();
        if (window.ScrollTrigger) window.ScrollTrigger.refresh();
      }, 150);
    }, { passive: true });

    // Refresh all ScrollTriggers on page
    setTimeout(() => {
      if (window.ScrollTrigger) window.ScrollTrigger.refresh();
    }, 300);
  }

  // Expose configuration and controls for live tuning
  window.HERO_ORBIT_CONFIG = CONFIG;
  window.goToStation = goToStation;
  window.initHeroOrbit = initHeroOrbit;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeroOrbit);
  } else {
    initHeroOrbit();
  }
})();
