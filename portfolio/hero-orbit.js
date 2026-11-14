/**
 * ============================================================================
 * HERO ORBIT: FIXED-PIN STEP SCROLLING, TRANSLUCENT TORCHES & ALIGNED TYPOGRAPHY
 * ============================================================================
 * 
 * 1. OPTION A: FIXED SCROLL-TRACK PIN WITH STEP TWEENING:
 *    - Pinned for 200vh (PIN_DISTANCE = innerHeight * 2).
 *    - The hero section stays 100% frozen on screen (y = 0) with zero jitter.
 *    - Station 1 FRONT (progress 0.0) -> Station 2 PROFILE (0.5) -> Station 3 BACK (1.0).
 *    - User gestures (wheel, touch swipe, keys) are intercepted with non-passive
 *      listeners (preventDefault: true) and tween the scroll position over ~1.5s.
 *    - At Station 3, the NEXT downward gesture releases the pin into #projects.
 *    - Scrolling back up from #projects re-enters at Station 3 and steps back.
 *    - Scrollbar drag, anchor links, and station step dots remain in perfect sync.
 * 
 * 2. REALISTIC TRANSLUCENT PARTICLE TORCHES:
 *    - Additive blending (globalCompositeOperation = 'lighter').
 *    - 40 soft particles per torch rising and shrinking with noise-driven sway.
 *    - Color by age: white-yellow core -> golden yellow -> warm ember -> deep red -> 0.
 *    - Dimming sconce backing so baked-in KlingAI white blobs never show through.
 *    - Soft warm halo with organic random flicker (subtle to keep left text readable).
 *    - 3-4 tiny bright golden sparks per torch.
 * 
 * 3. TYPOGRAPHY & STATUE POSITIONING:
 *    - Statue rendered with dynamic vertical offset calculated from wordmark bottom
 *      so crown tips only touch the bottom ~18% of the wordmark letters.
 *    - The letter "F" and all 9 letters of PORTFOLIO are 100% unobstructed.
 *    - Wordmark sits >= 20px below top navigation bar.
 *    - Tech chips stay > 30px clear from all text blocks.
 *    - "Get a project in mind?" bubble moved next to the action buttons.
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
    moveDuration: 1.0,         // Step move tween duration in seconds (GSAP)
    cooldownMs: 250,           // Inertia swallow cooldown after tween in ms
    flameIntensity: 1.0,       // Torch flame intensity multiplier
    particleCount: 40,         // Translucent flame particles per torch
    emberCount: 4,             // Tiny rising sparks per torch
    wheelThreshold: 18,        // Minimum wheel deltaY to trigger station step
    touchThreshold: 30         // Minimum touch swipe deltaY to trigger station step
  };

  const ROLE_LABEL = 'FULL STACK & AI ENGINEER';

  // DOM Elements
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
  let elChapterTechStack = null;
  let elStack1 = null;
  let elStack2 = null;
  let elStack3 = null;
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
  let heroScrollTrigger = null;
  let currentStationIndex = 0;
  let currentFrameFloat = CONFIG.stations[0].frame;
  let isTweening = false;
  let queuedStationIndex = null;
  let lastTweenEndTime = 0;
  let isHeroActive = true;
  let isMobile = false;
  let prefersReducedMotion = false;
  let framesBaseDir = 'frames/';
  let pinDistance = 1600; // Calculated dynamically from window.innerHeight * 2

  // ============================================================================
  // MEMORY-CONSTRAINED SLIDING LRU BITMAP CACHE (UNDER 250 MB RAM DECODED)
  // ============================================================================
  const STATION_FRAME_INDICES = new Set([120, 49, 0]);
  const stationBitmaps = new Map();     // Permanent 2560x1440 bitmaps at rest (Front: 120, Side: 49, Back: 0)
  const slidingBitmapLRU = new Map();   // Sliding window of max 14 in-between bitmaps (1600x900)
  const pendingRequests = new Set();
  const MAX_SLIDING_WINDOW = 14;

  // Sampled in-between frame set (~40 frames total across 121 frames for fluid blending)
  const IN_BETWEEN_INDICES = [];
  for (let i = 0; i <= 120; i += 3) {
    IN_BETWEEN_INDICES.push(i);
  }
  if (!IN_BETWEEN_INDICES.includes(49)) {
    IN_BETWEEN_INDICES.push(49);
    IN_BETWEEN_INDICES.sort((a, b) => a - b);
  }
  if (!IN_BETWEEN_INDICES.includes(120)) {
    IN_BETWEEN_INDICES.push(120);
  }
  const SAMPLE_SET = new Set(IN_BETWEEN_INDICES);

  const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

  // Frame URL builder
  function getFrameUrl(index) {
    const frameNum = index + 1; // 1-based (frame_0001.webp .. frame_0121.webp)
    const padded = String(frameNum).padStart(manifest.digits || 4, '0');
    return `${framesBaseDir}${manifest.prefix || 'frame_'}${padded}.${manifest.format || 'webp'}`;
  }

  function getFrameDrawable(index) {
    if (stationBitmaps.has(index)) return stationBitmaps.get(index);
    if (slidingBitmapLRU.has(index)) {
      const bmp = slidingBitmapLRU.get(index);
      // Refresh recency in LRU
      slidingBitmapLRU.delete(index);
      slidingBitmapLRU.set(index, bmp);
      return bmp;
    }
    return null;
  }

  function evictExcessBitmaps() {
    while (slidingBitmapLRU.size > MAX_SLIDING_WINDOW) {
      let furthestKey = null;
      let maxDist = -1;
      for (const idx of slidingBitmapLRU.keys()) {
        const dist = Math.abs(idx - currentFrameFloat);
        if (dist > maxDist) {
          maxDist = dist;
          furthestKey = idx;
        }
      }
      if (furthestKey !== null) {
        const bmp = slidingBitmapLRU.get(furthestKey);
        slidingBitmapLRU.delete(furthestKey);
        if (bmp && typeof bmp.close === 'function') {
          bmp.close(); // Immediate GPU/RAM release
        }
      } else {
        const firstKey = slidingBitmapLRU.keys().next().value;
        const bmp = slidingBitmapLRU.get(firstKey);
        slidingBitmapLRU.delete(firstKey);
        if (bmp && typeof bmp.close === 'function') {
          bmp.close();
        }
      }
    }
  }

  function findClosestLoadedDrawable(targetIndex) {
    const direct = getFrameDrawable(targetIndex);
    if (direct) return direct;

    let bestDist = Infinity;
    let bestDrawable = null;

    for (const [idx, bmp] of stationBitmaps.entries()) {
      const d = Math.abs(idx - targetIndex);
      if (d < bestDist) {
        bestDist = d;
        bestDrawable = bmp;
      }
    }
    for (const [idx, bmp] of slidingBitmapLRU.entries()) {
      const d = Math.abs(idx - targetIndex);
      if (d < bestDist) {
        bestDist = d;
        bestDrawable = bmp;
      }
    }
    return bestDrawable;
  }

  // Load single frame with async bitmap decode, strict LRU window and instant memory cleanup
  function loadSingleFrame(index, priority = false) {
    if (index < 0 || index >= manifest.frameCount) return;
    if (stationBitmaps.has(index) || slidingBitmapLRU.has(index) || pendingRequests.has(index)) return;

    pendingRequests.add(index);
    const img = new Image();
    img.decoding = priority ? 'sync' : 'async';
    img.src = getFrameUrl(index);

    img.onload = () => {
      pendingRequests.delete(index);
      const isStation = STATION_FRAME_INDICES.has(index);

      if (window.createImageBitmap) {
        // Desktop in-betweens decoded at 1600x900 for huge RAM savings. Station frames keep 2560x1440.
        const bitmapOpts = (!isStation && !isMobile)
          ? { resizeWidth: 1600, resizeHeight: 900, resizeQuality: 'high' }
          : undefined;

        createImageBitmap(img, bitmapOpts)
          .then((bmp) => {
            // Free the HTMLImageElement immediately from DOM memory
            img.onload = null;
            img.onerror = null;
            img.src = '';

            if (isStation) {
              stationBitmaps.set(index, bmp);
            } else {
              slidingBitmapLRU.set(index, bmp);
              evictExcessBitmaps();
            }

            if (Math.abs(currentFrameFloat - index) <= 2.0 && !isTweening) {
              renderBlendedFrame(currentFrameFloat);
            }
          })
          .catch(() => {
            img.onload = null;
            img.onerror = null;
            img.src = '';
          });
      }
    };
    img.onerror = () => {
      pendingRequests.delete(index);
      img.onload = null;
      img.onerror = null;
      img.src = '';
    };
  }

  function ensureSurroundingFrames(frameFloat) {
    const base = Math.round(frameFloat);
    for (let offset = 0; offset <= 8; offset++) {
      const idxs = offset === 0 ? [base] : [base - offset, base + offset];
      idxs.forEach((idx) => {
        if (SAMPLE_SET.has(idx)) {
          loadSingleFrame(idx, false);
        }
      });
    }
  }

  // ============================================================================
  // STATUE RENDERING: PRECISE DOWNWARD OFFSET FOR CLEAR LETTER "F"
  // ============================================================================
  let cachedStatueDownOffset = null;
  function updateStatueDownOffset(ch, drawH) {
    if (elWordmark && heroOrbitStage) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const stageRect = heroOrbitStage.getBoundingClientRect();
      const wordmarkRect = elWordmark.getBoundingClientRect();
      if (wordmarkRect && wordmarkRect.height > 10) {
        const wordmarkBottomCanvas = (wordmarkRect.bottom - stageRect.top) * dpr;
        const wordmarkHeightCanvas = wordmarkRect.height * dpr;
        // Crown tip touches only the bottom ~17-18% of the wordmark letters
        const targetCrownY = wordmarkBottomCanvas - (wordmarkHeightCanvas * 0.18);
        const unshiftedCrownY = (drawH > ch ? 0 : (ch - drawH) / 2) + (0.043 * drawH);
        cachedStatueDownOffset = Math.max(0, targetCrownY - unshiftedCrownY);
        return cachedStatueDownOffset;
      }
    }
    cachedStatueDownOffset = ch * 0.138;
    return cachedStatueDownOffset;
  }

  function getStatueDownOffset(ch, drawH) {
    if (cachedStatueDownOffset !== null) return cachedStatueDownOffset;
    return updateStatueDownOffset(ch, drawH);
  }

  function drawImageCover(targetCtx, targetCanvas, img) {
    const cw = targetCanvas.width;
    const ch = targetCanvas.height;
    const iw = img.width || img.naturalWidth || manifest.width;
    const ih = img.height || img.naturalHeight || manifest.height;
    const scale = Math.max(cw / iw, ch / ih);
    const drawW = iw * scale;
    const drawH = ih * scale;
    const drawX = (cw - drawW) / 2;

    const statueDownOffset = getStatueDownOffset(ch, drawH);
    const drawY = (drawH > ch ? 0 : (ch - drawH) / 2) + statueDownOffset;

    targetCtx.drawImage(img, drawX, drawY, drawW, drawH);
    return { drawX, drawY, drawW, drawH, scale };
  }

  // Blended frame rendering for intermediate fractional positions
  function renderBlendedFrame(frameFloat) {
    if (!ctx || !canvas) return;
    const clamped = clamp(frameFloat, 0, manifest.frameCount - 1);

    // Find nearest loaded frames at or below and at or above clamped
    let lowerIndex = null;
    let upperIndex = null;
    let lowerDist = Infinity;
    let upperDist = Infinity;

    const allLoaded = [];
    stationBitmaps.forEach((_, idx) => allLoaded.push(idx));
    slidingBitmapLRU.forEach((_, idx) => allLoaded.push(idx));

    for (let i = 0; i < allLoaded.length; i++) {
      const idx = allLoaded[i];
      if (idx <= clamped) {
        const d = clamped - idx;
        if (d < lowerDist) {
          lowerDist = d;
          lowerIndex = idx;
        }
      }
      if (idx >= clamped) {
        const d = idx - clamped;
        if (d < upperDist) {
          upperDist = d;
          upperIndex = idx;
        }
      }
    }

    if (lowerIndex === null && upperIndex === null) {
      const fallback = findClosestLoadedDrawable(Math.round(clamped));
      if (fallback) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawImageCover(ctx, canvas, fallback);
      }
      return;
    }

    if (lowerIndex === null) lowerIndex = upperIndex;
    if (upperIndex === null) upperIndex = lowerIndex;

    const imgA = getFrameDrawable(lowerIndex) || findClosestLoadedDrawable(lowerIndex);
    if (!imgA) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawImageCover(ctx, canvas, imgA);

    if (lowerIndex !== upperIndex) {
      const span = upperIndex - lowerIndex;
      const frac = span > 0 ? (clamped - lowerIndex) / span : 0;
      if (frac > 0.02) {
        const imgB = getFrameDrawable(upperIndex) || findClosestLoadedDrawable(upperIndex);
        if (imgB && imgB !== imgA) {
          ctx.save();
          ctx.globalAlpha = frac;
          drawImageCover(ctx, canvas, imgB);
          ctx.restore();
        }
      }
    }
  }

  // Foreground statue cutout (above wordmark)
  function drawFgStatue() {
    if (!fgCtx || !fgCanvas || !fgImg || !fgImg.complete || !fgImg.naturalWidth) return;
    fgCtx.clearRect(0, 0, fgCanvas.width, fgCanvas.height);
    drawImageCover(fgCtx, fgCanvas, fgImg);
  }

  // Canvas buffer resize matching DPR
  function resizeAllCanvases() {
    if (!heroOrbitStage || !canvas) return;
    cachedStatueDownOffset = null;
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

  // ============================================================================
  // CHAPTER REVEALS & STATION DOTS
  // ============================================================================
  function updateChaptersFromProgress(p) {
    // p is 0.0 to 1.0 across the entire 200vh pin
    // Station 1: p = 0.00 to 0.18
    // Station 2: p = 0.40 to 0.60
    // Station 3: p = 0.85 to 1.00

    // Station 1: Intro & Wordmark
    if (elWordmark && elChapterIntro) {
      const s1Exit = clamp((p - 0.08) / 0.15, 0, 1);
      const s1Opacity = 1 - s1Exit;
      elWordmark.style.opacity = String(s1Opacity.toFixed(3));
      elChapterIntro.style.opacity = String(s1Opacity.toFixed(3));
      elWordmark.style.visibility = s1Opacity > 0.01 ? 'visible' : 'hidden';
      elChapterIntro.style.visibility = s1Opacity > 0.01 ? 'visible' : 'hidden';
      elWordmark.style.pointerEvents = s1Opacity > 0.6 ? 'auto' : 'none';
      elChapterIntro.classList.toggle('interactive', s1Opacity > 0.6);
      if (fgCanvas) {
        fgCanvas.style.opacity = String(s1Opacity.toFixed(3));
      }
    }

    // Station 2: Dual Architectural Plaques (Features on Right, Tech Stack on Left)
    const s2Enter = clamp((p - 0.35) / 0.12, 0, 1);
    const s2Exit = clamp((p - 0.62) / 0.12, 0, 1);
    const s2Opacity = s2Enter * (1 - s2Exit);

    if (elChapterFeatures) {
      elChapterFeatures.style.opacity = String(s2Opacity.toFixed(3));
      elChapterFeatures.style.visibility = s2Opacity > 0.01 ? 'visible' : 'hidden';
      elChapterFeatures.classList.toggle('interactive', s2Opacity > 0.6);

      if (elPillar1) elPillar1.style.opacity = String(Math.min(1, s2Opacity * 1.3).toFixed(3));
      if (elPillar2) elPillar2.style.opacity = String(Math.min(1, Math.max(0, (s2Opacity - 0.2) * 1.3)).toFixed(3));
      if (elPillar3) elPillar3.style.opacity = String(Math.min(1, Math.max(0, (s2Opacity - 0.4) * 1.3)).toFixed(3));
    }

    if (elChapterTechStack) {
      elChapterTechStack.style.opacity = String(s2Opacity.toFixed(3));
      elChapterTechStack.style.visibility = s2Opacity > 0.01 ? 'visible' : 'hidden';
      elChapterTechStack.classList.toggle('interactive', s2Opacity > 0.6);

      if (elStack1) elStack1.style.opacity = String(Math.min(1, s2Opacity * 1.3).toFixed(3));
      if (elStack2) elStack2.style.opacity = String(Math.min(1, Math.max(0, (s2Opacity - 0.2) * 1.3)).toFixed(3));
      if (elStack3) elStack3.style.opacity = String(Math.min(1, Math.max(0, (s2Opacity - 0.4) * 1.3)).toFixed(3));
    }

    // Station 3: Cue Link
    if (elChapterCue) {
      const s3Enter = clamp((p - 0.82) / 0.14, 0, 1);
      elChapterCue.style.opacity = String(s3Enter.toFixed(3));
      elChapterCue.style.visibility = s3Enter > 0.01 ? 'visible' : 'hidden';
      elChapterCue.classList.toggle('interactive', s3Enter > 0.6);
    }

    // Station dots tracking
    let activeStation = 0;
    if (p >= 0.75) {
      activeStation = 2;
    } else if (p >= 0.28) {
      activeStation = 1;
    }
    currentStationIndex = activeStation;
    updateStationDots(activeStation);
  }

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
  // DERIVE FRAME FROM SCROLL PROGRESS
  // ============================================================================
  function handleScrollProgress(progress) {
    const p = clamp(progress, 0, 1);

    // Continuous smooth frame interpolation:
    // Station 1 (0.0): frame 120 (Front)
    // Station 2 (0.5): frame 49  (Profile)
    // Station 3 (1.0): frame 0   (Back)
    let frameFloat = 120;
    if (p <= 0.5) {
      const t = p / 0.5;
      frameFloat = 120 + (49 - 120) * t;
    } else {
      const t = (p - 0.5) / 0.5;
      frameFloat = 49 + (0 - 49) * t;
    }

    currentFrameFloat = frameFloat;
    ensureSurroundingFrames(frameFloat);
    renderBlendedFrame(frameFloat);
    updateChaptersFromProgress(p);
  }

  // ============================================================================
  // OPTION A: CONTROLLED STEP TWEENING (GSAP SCROLLTO TWEEN)
  // ============================================================================
  const scrollProxy = { y: 0 };

  function jumpToEnd() {
    isHeroActive = false;
    queuedStationIndex = null;
    if (isTweening) {
      window.gsap.killTweensOf(scrollProxy);
      isTweening = false;
    }
    currentStationIndex = 2;
    updateStationDots(2);
    const targetScroll = pinDistance + 40;
    window.scrollTo({ top: targetScroll, behavior: 'smooth' });
  }

  function tweenToStation(targetStationIndex, isQueued = false) {
    if (isTweening) {
      queuedStationIndex = targetStationIndex;
      return;
    }
    if (targetStationIndex < 0 || targetStationIndex >= CONFIG.stations.length) return;

    const now = Date.now();
    if (!isQueued && (now - lastTweenEndTime < CONFIG.cooldownMs)) return;

    if (prefersReducedMotion) {
      const targetP = targetStationIndex === 0 ? 0 : (targetStationIndex === 1 ? 0.5 : 1.0);
      window.scrollTo(0, targetP * pinDistance);
      handleScrollProgress(targetP);
      return;
    }

    isTweening = true;
    currentStationIndex = targetStationIndex;
    updateStationDots(targetStationIndex);

    const targetP = targetStationIndex === 0 ? 0 : (targetStationIndex === 1 ? 0.5 : 1.0);
    const targetScrollY = Math.round(targetP * pinDistance);

    scrollProxy.y = window.scrollY || window.pageYOffset || 0;

    window.gsap.killTweensOf(scrollProxy);
    window.gsap.to(scrollProxy, {
      y: targetScrollY,
      duration: CONFIG.moveDuration,
      ease: 'power2.inOut',
      onUpdate: () => {
        window.scrollTo(0, scrollProxy.y);
      },
      onComplete: () => {
        isTweening = false;
        lastTweenEndTime = Date.now();
        window.scrollTo(0, targetScrollY);
        handleScrollProgress(targetP);
        if (queuedStationIndex !== null && queuedStationIndex !== currentStationIndex) {
          const nextTarget = queuedStationIndex;
          queuedStationIndex = null;
          tweenToStation(nextTarget, true);
        } else {
          queuedStationIndex = null;
        }
      }
    });
  }

  // ============================================================================
  // REALISTIC TRANSLUCENT PARTICLE TORCHES (ADDITIVE BLENDING)
  // ============================================================================
  const torchParticlePool = [[], []]; // 0 = Left, 1 = Right
  const torchEmbersPool = [[], []];
  let torchAnimFrameId = null;
  let isTorchVisible = true;

  // Randomized halo alpha targets for organic, non-sine flickering
  const haloState = [
    { currentAlpha: 0.07, targetAlpha: 0.07, lastUpdate: 0 },
    { currentAlpha: 0.08, targetAlpha: 0.08, lastUpdate: 0 }
  ];

  function initRealisticTorchParticles() {
    for (let t = 0; t < 2; t++) {
      torchParticlePool[t] = [];
      for (let i = 0; i < CONFIG.particleCount; i++) {
        torchParticlePool[t].push({
          age: Math.random(), // 0 to 1
          lifetime: 0.45 + Math.random() * 0.40, // 0.45s to 0.85s
          initialSizeRatio: 0.35 + Math.random() * 0.40,
          dx: (Math.random() - 0.5) * 10,
          dy: (Math.random() - 0.5) * 6,
          vx: (Math.random() - 0.5) * 0.4,
          vy: -(1.2 + Math.random() * 1.4),
          swayFreq: 7 + Math.random() * 6,
          swayAmp: 1.0 + Math.random() * 1.5,
          seed: Math.random() * 100
        });
      }

      torchEmbersPool[t] = [];
      for (let i = 0; i < CONFIG.emberCount; i++) {
        torchEmbersPool[t].push({
          x: 0,
          y: 0,
          vx: (Math.random() - 0.5) * 0.6,
          vy: -(2.0 + Math.random() * 1.6),
          size: 1.0 + Math.random() * 1.4,
          alpha: Math.random(),
          decay: 0.015 + Math.random() * 0.02,
          wobbleFreq: 8 + Math.random() * 6
        });
      }
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

  let lastTime = performance.now();

  function renderRealisticTorches(time) {
    if (!torchCtx || !torchCanvas || !isTorchVisible) return;
    const cw = torchCanvas.width;
    const ch = torchCanvas.height;
    torchCtx.clearRect(0, 0, cw, ch);

    if (CONFIG.flameIntensity <= 0.01) return;

    const dt = Math.min(0.05, (time - lastTime) * 0.001);
    lastTime = time;

    const iw = manifest.width || 2560;
    const ih = manifest.height || 1440;
    const scale = Math.max(cw / iw, ch / ih);
    const drawW = iw * scale;
    const drawH = ih * scale;
    const drawX = (cw - drawW) / 2;

    const statueDownOffset = getStatueDownOffset(ch, drawH);
    const drawY = (drawH > ch ? 0 : (ch - drawH) / 2) + statueDownOffset;

    const tracks = getInterpolatedTorchTrack(currentFrameFloat);
    if (!tracks) return;

    const torches = [
      { id: 0, data: tracks.leftTorch, speed: 1.0, intensity: 0.95 },
      { id: 1, data: tracks.rightTorch, speed: 1.16, intensity: 1.05 }
    ];

    torches.forEach((torch) => {
      const tData = torch.data;
      if (!tData || !tData.opacity || tData.opacity <= 0.01) return;

      const px = drawX + tData.x * drawW;
      const py = drawY + tData.y * drawH;
      const baseR = (tData.r || 0.015) * drawW;
      const opacity = tData.opacity;

      // 1. SCONCE BACKING (source-over): Dims baked KlingAI white blob to dark ember
      torchCtx.save();
      torchCtx.globalCompositeOperation = 'source-over';
      const dimGrad = torchCtx.createRadialGradient(px, py + baseR * 0.15, 1, px, py + baseR * 0.15, baseR * 1.3);
      dimGrad.addColorStop(0, `rgba(12, 11, 10, ${0.82 * opacity})`);
      dimGrad.addColorStop(0.6, `rgba(16, 14, 12, ${0.45 * opacity})`);
      dimGrad.addColorStop(1, 'rgba(16, 14, 12, 0)');
      torchCtx.fillStyle = dimGrad;
      torchCtx.beginPath();
      torchCtx.arc(px, py + baseR * 0.15, baseR * 1.3, 0, Math.PI * 2);
      torchCtx.fill();
      torchCtx.restore();

      // 2. SOFT WARM HALO: Very low alpha, organic random (not sine) flicker
      const hState = haloState[torch.id];
      if (time - hState.lastUpdate > 120) {
        hState.targetAlpha = 0.05 + Math.random() * 0.035;
        hState.lastUpdate = time;
      }
      hState.currentAlpha += (hState.targetAlpha - hState.currentAlpha) * 0.06;
      const haloAlpha = clamp(hState.currentAlpha * opacity * CONFIG.flameIntensity, 0.02, 0.12);

      torchCtx.save();
      torchCtx.globalCompositeOperation = 'lighter';
      const haloR = baseR * 5.2;
      const haloGrad = torchCtx.createRadialGradient(px, py, 2, px, py, haloR);
      haloGrad.addColorStop(0, `rgba(235, 140, 45, ${haloAlpha})`);
      haloGrad.addColorStop(0.4, `rgba(205, 120, 25, ${haloAlpha * 0.45})`);
      haloGrad.addColorStop(1, 'rgba(180, 80, 15, 0)');
      torchCtx.fillStyle = haloGrad;
      torchCtx.beginPath();
      torchCtx.arc(px, py, haloR, 0, Math.PI * 2);
      torchCtx.fill();

      // Static under prefers-reduced-motion
      if (prefersReducedMotion) {
        const staticGrad = torchCtx.createRadialGradient(px, py - baseR * 0.8, 1, px, py - baseR * 0.8, baseR * 1.4);
        staticGrad.addColorStop(0, `rgba(255, 230, 150, ${0.5 * opacity})`);
        staticGrad.addColorStop(0.5, `rgba(240, 120, 25, ${0.3 * opacity})`);
        staticGrad.addColorStop(1, 'rgba(180, 40, 5, 0)');
        torchCtx.fillStyle = staticGrad;
        torchCtx.beginPath();
        torchCtx.arc(px, py - baseR * 0.8, baseR * 1.4, 0, Math.PI * 2);
        torchCtx.fill();
        torchCtx.restore();
        return;
      }

      // 3. TRANSLUCENT FLAME PARTICLES (35-45 per torch, additive blending)
      const particles = torchParticlePool[torch.id];
      particles.forEach((p) => {
        p.age += (dt * torch.speed) / p.lifetime;
        if (p.age >= 1) {
          // Respawn at flame base
          p.age = 0;
          p.lifetime = 0.45 + Math.random() * 0.40;
          p.dx = (Math.random() - 0.5) * (baseR * 0.45);
          p.dy = (Math.random() - 0.5) * (baseR * 0.2);
          p.vx = (Math.random() - 0.5) * 0.4;
          p.vy = -(1.2 + Math.random() * 1.4);
          p.initialSizeRatio = 0.35 + Math.random() * 0.40;
        }

        // Upward acceleration of hot air
        p.vy -= 0.02;
        const timeSec = time * 0.001 * torch.speed;
        const noiseSway = Math.sin(timeSec * p.swayFreq + p.seed) * p.swayAmp;

        const partX = px + p.dx + (p.vx * p.age * 20) + noiseSway;
        const partY = py + p.dy + (p.vy * p.age * 24);
        const partR = baseR * p.initialSizeRatio * Math.max(0.12, 1.0 - p.age * 0.75);

        // Translucent color ramp by age (bell-shaped alpha fading cleanly at tips)
        const ageCurve = Math.sin(p.age * Math.PI);
        const pAlpha = clamp(ageCurve * 0.42 * opacity * CONFIG.flameIntensity, 0, 0.65);

        const pGrad = torchCtx.createRadialGradient(partX, partY, 0, partX, partY, partR);
        if (p.age < 0.20) {
          // Hot incandescent core
          pGrad.addColorStop(0, `rgba(255, 252, 235, ${pAlpha})`);
          pGrad.addColorStop(0.4, `rgba(255, 225, 90, ${pAlpha * 0.85})`);
          pGrad.addColorStop(1, 'rgba(255, 160, 30, 0)');
        } else if (p.age < 0.55) {
          // Vibrant torch gold
          pGrad.addColorStop(0, `rgba(255, 215, 65, ${pAlpha * 0.88})`);
          pGrad.addColorStop(0.5, `rgba(242, 125, 22, ${pAlpha * 0.62})`);
          pGrad.addColorStop(1, 'rgba(195, 45, 8, 0)');
        } else {
          // Licking smoky tip
          pGrad.addColorStop(0, `rgba(235, 95, 18, ${pAlpha * 0.60})`);
          pGrad.addColorStop(0.6, `rgba(165, 35, 6, ${pAlpha * 0.30})`);
          pGrad.addColorStop(1, 'rgba(95, 15, 0, 0)');
        }

        torchCtx.fillStyle = pGrad;
        torchCtx.beginPath();
        torchCtx.arc(partX, partY, partR, 0, Math.PI * 2);
        torchCtx.fill();
      });

      // 4. TINY RISING EMBERS (3-4 per torch, bright golden sparks)
      const embers = torchEmbersPool[torch.id];
      embers.forEach((ember) => {
        ember.y += ember.vy;
        ember.x += ember.vx + Math.sin(time * 0.005 + ember.wobbleFreq) * 0.4;
        ember.alpha -= ember.decay;

        if (ember.alpha > 0.05) {
          const ex = px + ember.x;
          const ey = py + ember.y;
          torchCtx.fillStyle = `rgba(255, 225, 130, ${clamp(ember.alpha * opacity, 0, 0.95)})`;
          torchCtx.beginPath();
          torchCtx.arc(ex, ey, ember.size, 0, Math.PI * 2);
          torchCtx.fill();
        } else {
          // Respawn
          ember.x = (Math.random() - 0.5) * (baseR * 0.8);
          ember.y = -Math.random() * (baseR * 0.5);
          ember.alpha = 0.85 + Math.random() * 0.15;
          ember.vy = -(2.0 + Math.random() * 1.5);
        }
      });

      torchCtx.restore();
    });
  }

  function torchLoop(now) {
    if (isTorchVisible && !document.hidden) {
      renderRealisticTorches(now);
    }
    torchAnimFrameId = requestAnimationFrame(torchLoop);
  }

  // ============================================================================
  // GESTURE CONTROLLER (INTERCEPTS WHEEL, TOUCH & KEYS SO PAGE CANNOT MOVE)
  // ============================================================================
  function setupOptionAGestures() {
    let touchStartY = 0;

    // 1. Wheel Listener (Non-passive so preventDefault works 100%)
    window.addEventListener('wheel', (e) => {
      const scrollY = window.scrollY || window.pageYOffset || 0;

      // When within the hero pin range (0 to pinDistance)
      if (scrollY <= pinDistance + 10) {
                // While tweening: queue one extra step instead of ignoring it
        if (isTweening) {
          e.preventDefault();
          if (Math.abs(e.deltaY) >= CONFIG.wheelThreshold) {
            if (e.deltaY > 0) {
              queuedStationIndex = Math.min(CONFIG.stations.length - 1, currentStationIndex + 1);
            } else {
              queuedStationIndex = Math.max(0, currentStationIndex - 1);
            }
          }
          return;
        }

        if (Math.abs(e.deltaY) < CONFIG.wheelThreshold) return;

        if (e.deltaY > 0) {
          // Downward gesture
          if (currentStationIndex === 0) {
            e.preventDefault();
            tweenToStation(1);
          } else if (currentStationIndex === 1) {
            e.preventDefault();
            tweenToStation(2);
          } else if (currentStationIndex === 2) {
            // At Station 3:
            if (scrollY < pinDistance - 8) {
              e.preventDefault();
              tweenToStation(2);
            } else {
              // At exact Station 3 pin end: check if access gate is locked
              isHeroActive = false;
            }
          }
        } else if (e.deltaY < 0) {
          // Upward gesture
          if (currentStationIndex === 2) {
            e.preventDefault();
            tweenToStation(1);
          } else if (currentStationIndex === 1) {
            e.preventDefault();
            tweenToStation(0);
          } else if (currentStationIndex === 0) {
            // At Station 1: top of page, allow native
          }
        }
      }
    }, { passive: false });

    // 2. Touch Swipes (Non-passive)
    window.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches.length) {
        touchStartY = e.touches[0].clientY;
      }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      const scrollY = window.scrollY || window.pageYOffset || 0;

      if (scrollY <= pinDistance + 10 && e.touches && e.touches.length) {
                if (isTweening) {
          e.preventDefault();
          const deltaY = touchStartY - e.touches[0].clientY;
          if (Math.abs(deltaY) > CONFIG.touchThreshold) {
            if (deltaY > 0) {
              queuedStationIndex = Math.min(CONFIG.stations.length - 1, currentStationIndex + 1);
            } else {
              queuedStationIndex = Math.max(0, currentStationIndex - 1);
            }
          }
          return;
        }

        const deltaY = touchStartY - e.touches[0].clientY;
        if (Math.abs(deltaY) > CONFIG.touchThreshold) {
          if (deltaY > 0) {
            // Swipe Up -> Step Down
            if (currentStationIndex === 0) {
              e.preventDefault();
              tweenToStation(1);
              touchStartY = e.touches[0].clientY;
            } else if (currentStationIndex === 1) {
              e.preventDefault();
              tweenToStation(2);
              touchStartY = e.touches[0].clientY;
            } else if (currentStationIndex === 2) {
              if (scrollY < pinDistance - 8) {
                e.preventDefault();
                tweenToStation(2);
                touchStartY = e.touches[0].clientY;
              } else {
                isHeroActive = false;
              }
            }
          } else {
            // Swipe Down -> Step Up
            if (currentStationIndex === 2) {
              e.preventDefault();
              tweenToStation(1);
              touchStartY = e.touches[0].clientY;
            } else if (currentStationIndex === 1) {
              e.preventDefault();
              tweenToStation(0);
              touchStartY = e.touches[0].clientY;
            }
          }
        }
      }
    }, { passive: false });

    // 3. Keyboard Navigation
    window.addEventListener('keydown', (e) => {
      const scrollY = window.scrollY || window.pageYOffset || 0;

      if (scrollY <= pinDistance + 10) {
        if (e.key === 'End' || e.key === 'PageDown') {
          e.preventDefault();
          jumpToEnd();
          return;
        }

        if (e.key === 'Home' || e.key === 'PageUp') {
          e.preventDefault();
          queuedStationIndex = null;
          if (isTweening) {
            window.gsap.killTweensOf(scrollProxy);
            isTweening = false;
          }
          tweenToStation(0, true);
          return;
        }

        if (isTweening) {
          if (['ArrowDown', ' '].includes(e.key)) {
            e.preventDefault();
            queuedStationIndex = Math.min(CONFIG.stations.length - 1, currentStationIndex + 1);
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            queuedStationIndex = Math.max(0, currentStationIndex - 1);
          }
          return;
        }

        if (['ArrowDown', ' '].includes(e.key)) {
          if (currentStationIndex === 0) {
            e.preventDefault();
            tweenToStation(1);
          } else if (currentStationIndex === 1) {
            e.preventDefault();
            tweenToStation(2);
          } else if (currentStationIndex === 2) {
            if (scrollY < pinDistance - 8) {
              e.preventDefault();
              tweenToStation(2);
            } else {
              jumpToEnd();
            }
          }
        } else if (e.key === 'ArrowUp') {
          if (currentStationIndex === 2) {
            e.preventDefault();
            tweenToStation(1);
          } else if (currentStationIndex === 1) {
            e.preventDefault();
            tweenToStation(0);
          }
        }
      }
    });

    // 4. Station Navigation Step Dots
    stationDots.forEach((dot, idx) => {
      dot.addEventListener('click', () => {
        tweenToStation(idx);
      });
    });

    // 5. Skip link & Project Links
    const jumpLinks = document.querySelectorAll('.skip-to-projects-link, .hero-skip-btn, a[href="#projects"]');
    jumpLinks.forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        jumpToEnd();
      });
    });
  }

  // ============================================================================
  // PROGRESSIVE ASSET PRELOADING
  function preloadAssetsProgressively() {
    isMobile = window.innerWidth < 768;

    // Load Cutout image
    fgImg = new Image();
    fgImg.src = framesBaseDir + (manifest.statueCutout || 'statue_cutout.webp');
    fgImg.onload = () => {
      drawFgStatue();
    };

    // 1. Station 1 (120) is loaded first synchronously in initHeroOrbit.
    // 2. Next, load Station 2 (Profile: 49) and Station 3 (Back: 0) as high priority:
    loadSingleFrame(49, true);
    loadSingleFrame(0, true);

    // 3. Queue in-between sampled frames progressively during idle:
    const queue = IN_BETWEEN_INDICES.filter((i) => !STATION_FRAME_INDICES.has(i));

    let qIdx = 0;
    const BATCH = 4;
    function loadBatch() {
      if (qIdx >= queue.length) return;
      const slice = queue.slice(qIdx, qIdx + BATCH);
      qIdx += BATCH;
      slice.forEach((idx) => loadSingleFrame(idx, false));
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(loadBatch, { timeout: 350 });
      } else {
        setTimeout(loadBatch, 60);
      }
    }

    setTimeout(loadBatch, 200);
  }

  // ============================================================================
  // SCROLLTRIGGER PIN INITIALIZATION
  // ============================================================================
  function setupOptionAPin() {
    if (!window.gsap || !window.ScrollTrigger) return;
    window.gsap.registerPlugin(window.ScrollTrigger);

    pinDistance = window.innerHeight * 2; // 200vh pinned track

    // Kill any existing trigger
    if (heroScrollTrigger) heroScrollTrigger.kill();

    heroScrollTrigger = window.ScrollTrigger.create({
      trigger: heroSection,
      start: 'top top',
      end: () => `+=${pinDistance}`,
      pin: true,
      pinSpacing: true,
      anticipatePin: 1,
      onUpdate: (self) => {
        handleScrollProgress(self.progress);
      }
    });

    // Initial update based on current scroll position
    handleScrollProgress(heroScrollTrigger.progress || 0);

    // Refresh all ScrollTriggers on the page
    window.ScrollTrigger.refresh();
  }

  // ============================================================================
  // MAIN INITIALIZATION
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
    elChapterTechStack = document.getElementById('heroChapterTechStack');
    elStack1 = document.getElementById('stackItem1');
    elStack2 = document.getElementById('stackItem2');
    elStack3 = document.getElementById('stackItem3');
    elChapterCue = document.getElementById('heroChapterCue');
    stationDots = Array.from(document.querySelectorAll('.station-dot'));

    // Synchronous call at startup: guarantee features, tech stack & cue are hidden before any fetch/load
    updateChaptersFromProgress(0);
    updateStationDots(0);

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

    // Setup realistic translucent torches
    initRealisticTorchParticles();
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
      if (window.createImageBitmap) {
        createImageBitmap(frontImg).then((bmp) => {
          stationBitmaps.set(frontIndex, bmp);
          frontImg.onload = null;
          frontImg.onerror = null;
          frontImg.src = '';
          resizeAllCanvases();
          renderBlendedFrame(frontIndex);
          updateChaptersFromProgress(0);
          updateStationDots(0);
          setupOptionAPin();
          preloadAssetsProgressively();
        }).catch(() => {
          resizeAllCanvases();
          updateChaptersFromProgress(0);
          setupOptionAPin();
        });
      } else {
        resizeAllCanvases();
        updateChaptersFromProgress(0);
        setupOptionAPin();
      }
    };

    resizeAllCanvases();
    setupOptionAGestures();

    // Debounced Resize listener
    let resizeTimer = 0;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        isMobile = window.innerWidth < 768;
        pinDistance = window.innerHeight * 2;
        resizeAllCanvases();
        if (heroScrollTrigger) {
          heroScrollTrigger.refresh();
        }
        if (window.ScrollTrigger) {
          window.ScrollTrigger.refresh();
        }
      }, 150);
    }, { passive: true });

    // Refresh ScrollTriggers
    setTimeout(() => {
      if (window.ScrollTrigger) window.ScrollTrigger.refresh();
    }, 350);
  }

  // Expose configuration and controls for live tuning
  window.HERO_ORBIT_CONFIG = CONFIG;
  window.tweenToStation = tweenToStation;
  window.initHeroOrbit = initHeroOrbit;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeroOrbit);
  } else {
    initHeroOrbit();
  }
})();

