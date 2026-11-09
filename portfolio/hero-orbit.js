/**
 * ============================================================================
 * HERO ORBIT: SCROLL-DRIVEN MARBLE WARRIOR-KING STATUE
 * ============================================================================
 * 
 * - 400vh native ScrollTrigger pin
 * - Cover-fit, devicePixelRatio-aware canvas
 * - Reverse scrub: progress 0 = front (frame 120), progress 1 = back (frame 0)
 * - Progressive loading with instant front-frame poster
 * - Mobile frame skipping (loads every 2nd frame)
 * - Reduced motion fallback
 * - Coordinated chapter transitions:
 *     0.00 - 0.20: Wordmark, Bio, Buttons
 *     0.20 - 0.55: Three Feature Pillars (staggered)
 *     0.55 - 0.85: Tech Chips floating near statue
 *     0.85 - 1.00: "Scroll to see work" cue & pin release
 * - Refreshes all subsequent ScrollTriggers seamlessly
 */
(function () {
  'use strict';
  // Single constant for role label
  const ROLE_LABEL = 'FULL STACK & AI ENGINEER';
  // Fallback manifest if json fetch is blocked
  const DEFAULT_MANIFEST = {
    frameCount: 121,
    width: 1280,
    height: 720,
    fps: 24,
    format: 'webp',
    prefix: 'frame_',
    digits: 4,
    frontFrameIndex: 120,
    backFrameIndex: 0
  };
  let manifest = DEFAULT_MANIFEST;
  let canvas = null;
  let ctx = null;
  let heroOrbitStage = null;
  let heroSection = null;
  let fgCanvas = null;
  let fgCtx = null;
  let fgImg = null;
  // DOM Chapter Elements
  let elWordmark = null;
  let elChapterIntro = null;
  let elChapterFeatures = null;
  let elPillar1 = null;
  let elPillar2 = null;
  let elPillar3 = null;
  let elChapterChips = null;
  let elChips = [];
  let elChapterCue = null;
  // Frame Cache
  const loadedFrames = new Map();
  let renderedFrameIndex = -1;
  let isMobile = false;
  let prefersReducedMotion = false;
  let framesBaseDir = 'frames/';
  // Math helper
  const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
  const norm = (val, min, max) => clamp((val - min) / (max - min), 0, 1);
  /**
   * Determine the URL of a frame by index (0-based)
   */
  function getFrameUrl(index) {
    const frameNum = index + 1; // 1-based files (frame_0001.webp .. frame_0121.webp)
    const padded = String(frameNum).padStart(manifest.digits || 4, '0');
    return `${framesBaseDir}${manifest.prefix || 'frame_'}${padded}.${manifest.format || 'webp'}`;
  }
  /**
   * Draw specific frame on the canvas with cover-fit & horizontal centering
   */
  let currentTargetFrameIndex = -1;
  const pendingRequests = new Set();

  function findClosestLoadedFrame(targetIndex) {
    if (loadedFrames.has(targetIndex)) return loadedFrames.get(targetIndex);
    let bestDist = Infinity;
    let bestImg = null;
    for (const [idx, img] of loadedFrames.entries()) {
      if (img && img.complete && img.naturalWidth) {
        const d = Math.abs(idx - targetIndex);
        if (d < bestDist) {
          bestDist = d;
          bestImg = img;
        }
      }
    }
    return bestImg;
  }

  function loadSingleFrame(index) {
    if (index < 0 || index >= manifest.frameCount) return;
    if (loadedFrames.has(index) || pendingRequests.has(index)) return;

    pendingRequests.add(index);
    const img = new Image();
    img.src = getFrameUrl(index);
    img.onload = () => {
      loadedFrames.set(index, img);
      pendingRequests.delete(index);
      if (Math.abs(currentTargetFrameIndex - index) <= 1) {
        drawFrame(currentTargetFrameIndex, true);
      }
    };
    img.onerror = () => {
      pendingRequests.delete(index);
    };
  }

  /**
   * Draw specific frame on the canvas with cover-fit & horizontal centering
   */
  function drawFrame(frameIndex, forceRedraw = false) {
    if (!ctx || !canvas) return;
    currentTargetFrameIndex = frameIndex;

    let img = loadedFrames.get(frameIndex);
    if (!img) {
      img = findClosestLoadedFrame(frameIndex) || loadedFrames.get(manifest.frontFrameIndex);
      loadSingleFrame(frameIndex);
      loadSingleFrame(frameIndex - 1);
      loadSingleFrame(frameIndex + 1);
    }
    if (!img || !img.complete || !img.naturalWidth) return;
    if (renderedFrameIndex === frameIndex && !forceRedraw) return;
    renderedFrameIndex = frameIndex;
    const cw = canvas.width;
    const ch = canvas.height;
    const iw = img.naturalWidth || manifest.width;
    const ih = img.naturalHeight || manifest.height;
    // Cover-fit calculation
    const scale = Math.max(cw / iw, ch / ih);
    const drawW = iw * scale;
    const drawH = ih * scale;
    // Centered on statue so on narrow screens (phones), sides are cropped not the king
    const drawX = (cw - drawW) / 2;
    // Keep statue crown in full view: top-align when drawH > ch so crown is never chopped off
    const drawY = drawH > ch ? 0 : (ch - drawH) / 2;
    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
  }
  /**
   * Resize canvas taking into account devicePixelRatio (capped at 2)
   */
  /**
   * Draw the transparent statue cutout on the foreground canvas (above wordmark)
   */
  function drawFgStatue() {
    if (!fgCtx || !fgCanvas || !fgImg || !fgImg.complete || !fgImg.naturalWidth) return;
    const cw = fgCanvas.width;
    const ch = fgCanvas.height;
    const iw = fgImg.naturalWidth || manifest.width;
    const ih = fgImg.naturalHeight || manifest.height;
    const scale = Math.max(cw / iw, ch / ih);
    const drawW = iw * scale;
    const drawH = ih * scale;
    const drawX = (cw - drawW) / 2;
    const drawY = drawH > ch ? 0 : (ch - drawH) / 2;
    fgCtx.clearRect(0, 0, cw, ch);
    fgCtx.drawImage(fgImg, drawX, drawY, drawW, drawH);
  }
  /**
   * Resize canvases taking into account devicePixelRatio (capped at 2)
   */
  function resizeCanvas() {
    if (!canvas || !heroOrbitStage) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = heroOrbitStage.getBoundingClientRect();
    const w = rect.width || window.innerWidth;
    const h = rect.height || window.innerHeight;
    const pw = Math.round(w * dpr);
    const ph = Math.round(h * dpr);
    canvas.width = pw;
    canvas.height = ph;
    if (fgCanvas) {
      fgCanvas.width = pw;
      fgCanvas.height = ph;
      if (fgCtx) {
        fgCtx.imageSmoothingEnabled = true;
        fgCtx.imageSmoothingQuality = 'high';
      }
    }
    if (ctx) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
    }
    drawFrame(renderedFrameIndex >= 0 ? renderedFrameIndex : manifest.frontFrameIndex, true);
    drawFgStatue();
  }
  /**
   * Update chapters opacity, transform, and visibility based on scroll progress (0..1)
   */
  function updateChapters(p) {
    // ----------------------------------------------------
    // CHAPTER 1: Wordmark, Name, Role, Bio, Buttons (0.00 - 0.20)
    // ----------------------------------------------------
    if (elWordmark) {
      if (p <= 0.10) {
        elWordmark.style.opacity = '1';
        elWordmark.style.transform = 'translateY(0px)';
        elWordmark.style.pointerEvents = 'auto';
      } else if (p <= 0.20) {
        const t = norm(p, 0.10, 0.20);
        elWordmark.style.opacity = String((1 - t).toFixed(3));
        elWordmark.style.transform = `translateY(${-25 * t}px)`;
        elWordmark.style.pointerEvents = 'none';
      } else {
        elWordmark.style.opacity = '0';
        elWordmark.style.pointerEvents = 'none';
      }
    }
    // Foreground statue cutout (above wordmark) matches wordmark visibility
    if (fgCanvas) {
      if (p <= 0.10) {
        fgCanvas.style.opacity = '1';
      } else if (p <= 0.20) {
        const t = norm(p, 0.10, 0.20);
        fgCanvas.style.opacity = String((1 - t).toFixed(3));
      } else {
        fgCanvas.style.opacity = '0';
      }
    }
    if (elChapterIntro) {
      if (p <= 0.12) {
        elChapterIntro.style.opacity = '1';
        elChapterIntro.style.transform = 'translateY(0px)';
        elChapterIntro.classList.add('interactive');
      } else if (p <= 0.20) {
        const t = norm(p, 0.12, 0.20);
        elChapterIntro.style.opacity = String((1 - t).toFixed(3));
        elChapterIntro.style.transform = `translateY(${-20 * t}px)`;
        elChapterIntro.classList.remove('interactive');
      } else {
        elChapterIntro.style.opacity = '0';
        elChapterIntro.classList.remove('interactive');
      }
    }
    // ----------------------------------------------------
    // CHAPTER 2: Three Feature Blocks on Right (0.20 - 0.55)
    // ----------------------------------------------------
    if (elChapterFeatures) {
      if (p >= 0.20 && p <= 0.55) {
        const enterT = norm(p, 0.20, 0.25);
        const exitT  = norm(p, 0.50, 0.55);
        const overallOpacity = enterT * (1 - exitT);
        elChapterFeatures.style.opacity = String(overallOpacity.toFixed(3));
        elChapterFeatures.style.transform = `translateY(calc(-50% + ${(1 - enterT) * 20 - exitT * 20}px))`;
        elChapterFeatures.classList.toggle('interactive', overallOpacity > 0.4);
        // Staggered individual pillar reveals
        if (elPillar1) {
          const p1T = norm(p, 0.22, 0.28);
          elPillar1.style.opacity = String(p1T.toFixed(3));
          elPillar1.style.transform = `translateX(${(1 - p1T) * 18}px)`;
        }
        if (elPillar2) {
          const p2T = norm(p, 0.29, 0.35);
          elPillar2.style.opacity = String(p2T.toFixed(3));
          elPillar2.style.transform = `translateX(${(1 - p2T) * 18}px)`;
        }
        if (elPillar3) {
          const p3T = norm(p, 0.36, 0.42);
          elPillar3.style.opacity = String(p3T.toFixed(3));
          elPillar3.style.transform = `translateX(${(1 - p3T) * 18}px)`;
        }
      } else {
        elChapterFeatures.style.opacity = '0';
        elChapterFeatures.classList.remove('interactive');
      }
    }
    // ----------------------------------------------------
    // CHAPTER 3: Floating Tech Chips (0.55 - 0.85)
    // ----------------------------------------------------
    if (elChapterChips) {
      if (p >= 0.55 && p <= 0.85) {
        const enterT = norm(p, 0.55, 0.62);
        const exitT  = norm(p, 0.78, 0.85);
        const chipsOpacity = enterT * (1 - exitT);
        elChapterChips.style.opacity = String(chipsOpacity.toFixed(3));
        // Subtle organic float animation based on progress
        const floatDelta = (p - 0.55) / 0.30;
        elChips.forEach((chip, i) => {
          const sign = i % 2 === 0 ? 1 : -1;
          const floatY = Math.sin(floatDelta * Math.PI * 2 + i) * 10 * sign;
          const floatX = Math.cos(floatDelta * Math.PI * 2 + i) * 6 * sign;
          chip.style.transform = `translate(${floatX}px, ${floatY}px)`;
        });
      } else {
        elChapterChips.style.opacity = '0';
      }
    }
    // ----------------------------------------------------
    // CHAPTER 4: Scroll to See Work Cue (0.85 - 1.00)
    // ----------------------------------------------------
    if (elChapterCue) {
      if (p >= 0.85 && p <= 1.00) {
        const cueT = norm(p, 0.85, 0.92);
        elChapterCue.style.opacity = String(cueT.toFixed(3));
        elChapterCue.style.transform = `translate(-50%, ${(1 - cueT) * 15}px)`;
        elChapterCue.classList.toggle('interactive', cueT > 0.5);
      } else {
        elChapterCue.style.opacity = '0';
        elChapterCue.classList.remove('interactive');
      }
    }
  }
  /**
   * Main scrub handler called on scroll
   */
  function handleOrbitScroll(progress) {
    const p = clamp(progress, 0, 1);
    // REVERSE order formula:
    // progress 0 = FRONT of statue (last video frame, e.g. 120)
    // progress 1 = BACK of statue (first video frame, e.g. 0)
    const frameIndex = Math.round((1 - p) * (manifest.frameCount - 1));
    drawFrame(frameIndex);
    updateChapters(p);
  }
  /**
   * Preload video frames progressively in background
   */
  function preloadFrames() {
    isMobile = window.innerWidth < 768;
    const step = isMobile ? 2 : 1;
    const total = manifest.frameCount;
    const frontIdx = manifest.frontFrameIndex;
    // Load nearby front frames first, then remainder
    const loadQueue = [];
    // Prioritize frames right next to front
    for (let r = 1; r <= 15; r++) {
      if (frontIdx - r >= 0) loadQueue.push(frontIdx - r);
    }
    // Then queue remaining frames
    for (let i = total - 1; i >= 0; i -= step) {
      if (!loadQueue.includes(i) && i !== frontIdx) {
        loadQueue.push(i);
      }
    }
    let queueIndex = 0;
    const BATCH_SIZE = 12;
    function loadNextBatch() {
      if (queueIndex >= loadQueue.length) return;
      const batch = loadQueue.slice(queueIndex, queueIndex + BATCH_SIZE);
      queueIndex += BATCH_SIZE;
      let batchLoaded = 0;
      batch.forEach((idx) => {
        if (loadedFrames.has(idx)) {
          batchLoaded++;
          if (batchLoaded === batch.length) scheduleNext();
          return;
        }
        const img = new Image();
        img.src = getFrameUrl(idx);
        img.onload = () => {
          loadedFrames.set(idx, img);
          batchLoaded++;
          if (Math.abs(currentTargetFrameIndex - idx) <= 1) {
            drawFrame(currentTargetFrameIndex, true);
          }
          if (batchLoaded === batch.length) scheduleNext();
        };
        img.onerror = () => {
          batchLoaded++;
          if (batchLoaded === batch.length) scheduleNext();
        };
      });
    }
    function scheduleNext() {
      setTimeout(loadNextBatch, 16);
    }
    scheduleNext();
  }
  /**
   * Setup GSAP ScrollTrigger 400vh Pin
   */
  function setupScrollTrigger() {
    if (!window.gsap || !window.ScrollTrigger) {
      console.warn('[HeroOrbit] GSAP ScrollTrigger not available, falling back to static');
      return;
    }
    window.gsap.registerPlugin(window.ScrollTrigger);
    // Pin the hero section firmly at the top for 400vh
    window.ScrollTrigger.create({
      trigger: heroSection,
      start: 'top top',
      end: '+=400%',
      pin: true,
      pinSpacing: true,
      anticipatePin: 1,
      scrub: 0.15,
      onUpdate: (self) => {
        handleOrbitScroll(self.progress);
      }
    });
    // Refresh all ScrollTriggers across the page to ensure accurate trigger points
    window.ScrollTrigger.refresh();
  }
  /**
   * Initialize Hero Orbit
   */
  async function initHeroOrbit() {
    heroSection = document.getElementById('hero');
    heroOrbitStage = document.getElementById('heroOrbitStage');
    canvas = document.getElementById('heroOrbitCanvas');
    fgCanvas = document.getElementById('heroOrbitFgCanvas');
    if (!heroSection || !heroOrbitStage || !canvas) return;
    ctx = canvas.getContext('2d');
    if (fgCanvas) fgCtx = fgCanvas.getContext('2d');
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
    // Update role labels to constant
    document.querySelectorAll('.nav-role, .hero-tagline').forEach((el) => {
      el.textContent = ROLE_LABEL;
    });
    // Determine frames base path & load manifest
    const manifestCandidates = ['public/frames/manifest.json', 'frames/manifest.json'];
    for (const mUrl of manifestCandidates) {
      try {
        const res = await fetch(mUrl);
        if (res.ok) {
          manifest = await res.json();
          framesBaseDir = mUrl.replace('manifest.json', '');
          break;
        }
      } catch (e) {
        // Continue to fallback
      }
    }
    // Load foreground statue cutout (placed in front of PORTFOLIO wordmark)
    fgImg = new Image();
    fgImg.src = framesBaseDir + (manifest.statueCutout || 'statue_cutout.webp');
    fgImg.onload = () => {
      drawFgStatue();
    };
    // Load FRONT frame (poster) immediately!
    const frontIndex = manifest.frontFrameIndex !== undefined ? manifest.frontFrameIndex : 120;
    const frontImg = new Image();
    frontImg.src = getFrameUrl(frontIndex);
    frontImg.onload = () => {
      loadedFrames.set(frontIndex, frontImg);
      resizeCanvas();
      drawFrame(frontIndex, true);
      updateChapters(0);
      // Begin preloading the remaining frames in background
      preloadFrames();
      // If user prefers reduced motion: show static front view and document flow
      if (prefersReducedMotion) {
        heroSection.classList.add('reduced-motion');
        updateChapters(0);
        return;
      }
      // Initialize ScrollTrigger pin
      setupScrollTrigger();
      // Ensure subsequent section triggers (#projects, #process, #experience, footer) start at exact positions
      setTimeout(() => {
        if (window.ScrollTrigger) window.ScrollTrigger.refresh();
      }, 250);
    };
    // If image fails or slow network, resize anyway
    resizeCanvas();
    // Resize listener (debounced)
    let resizeTimer = 0;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        isMobile = window.innerWidth < 768;
        resizeCanvas();
        if (window.ScrollTrigger) {
          window.ScrollTrigger.refresh();
        }
      }, 150);
    }, { passive: true });
  }
  // Export to window
  window.ROLE_LABEL = ROLE_LABEL;
  window.initHeroOrbit = initHeroOrbit;
  // Auto-init on DOMContentLoaded or immediate if document already loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeroOrbit);
  } else {
    initHeroOrbit();
  }
})();