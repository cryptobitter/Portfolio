/**
 * ============================================================================
 * BLOSSOM THEME & SCROLL-DRIVEN PETAL ENGINE (Aditya Rajput Portfolio)
 * 
 * Elegant cherry blossom tree illustration fixed in background with alternating
 * branch sides per section and dynamic scroll-velocity wind petals.
 * ============================================================================
 */

// TODO: If you later provide your own custom tree artwork or floral graphics,
// customize or swap the branch geometry, colors, or petal densities below:
window.BLOSSOM_CONFIG = {
  tree: {
    barkColor: '#4A3A33',
    petalSoft: '#F2C9CF',
    petalDeep: '#D98C9B',
    petalHighlight: '#FFF0F2',
    stamenColor: '#C8653B',
    opacity: 0.92,
  },
  petals: {
    maxDesktop: 65,      // 40-80 on desktop
    maxMobile: 20,       // 15-25 on mobile (< 768px)
    gravity: 0.42,       // Gentle downward drift
    baseDrift: 0.5,      // Natural lateral flutter
    gustDecay: 0.94,     // Friction on wind gusts
    fpsThreshold: 45,    // Auto-throttle if frame rate drops
  },
  sections: [
    { id: 'hero', side: 'right' },
    { id: 'projects', side: 'left' },
    { id: 'process', side: 'right' },
    { id: 'experience', side: 'left' },
    { id: 'contact', side: 'right' },
  ]
};

(function initBlossomEngine() {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = window.innerWidth < 768;

  // DOM Elements
  const treeRight = document.getElementById('blossomTreeRight');
  const treeLeft  = document.getElementById('blossomTreeLeft');
  const canvas    = document.getElementById('blossomPetalsCanvas');

  let activeSide = 'right';
  let lastScrollY = window.scrollY || 0;
  let scrollDelta = 0;
  let scrollGust = 0;
  let currentSectionIdx = 0;

  // Set initial tree state
  function updateTreeSide(side) {
    if (activeSide === side && treeRight && treeLeft && 
        (side === 'right' ? treeRight.classList.contains('is-active') : treeLeft.classList.contains('is-active'))) {
      return;
    }
    activeSide = side;
    if (treeRight && treeLeft) {
      if (side === 'right') {
        treeRight.classList.add('is-active');
        treeRight.classList.remove('is-inactive');
        treeLeft.classList.remove('is-active');
        treeLeft.classList.add('is-inactive');
      } else {
        treeLeft.classList.add('is-active');
        treeLeft.classList.remove('is-inactive');
        treeRight.classList.remove('is-active');
        treeRight.classList.add('is-inactive');
      }
    }
  }

  updateTreeSide('right');

  const sectionIds = ['hero', 'projects', 'process', 'experience', 'contact'];

  // Check which section is currently centered/active in viewport
  function checkActiveSection() {
    const scrollMid = (window.scrollY || 0) + window.innerHeight * 0.4;
    let foundIdx = 0;

    for (let i = 0; i < sectionIds.length; i++) {
      const el = document.getElementById(sectionIds[i]);
      if (el) {
        const top = el.offsetTop;
        const bottom = top + el.offsetHeight;
        if (scrollMid >= top && scrollMid < bottom) {
          foundIdx = i;
          break;
        } else if (scrollMid >= bottom && i === sectionIds.length - 1) {
          foundIdx = i;
        }
      }
    }

    if (foundIdx !== currentSectionIdx) {
      currentSectionIdx = foundIdx;
      const targetSide = foundIdx % 2 === 0 ? 'right' : 'left';
      updateTreeSide(targetSide);
      if (!prefersReduced && typeof window.triggerBlossomGust === 'function') {
        window.triggerBlossomGust(targetSide, isMobile ? 12 : 22);
      }
    }
  }

  // Parallax subtle shift on tree branches & scroll wind
  function onScrollHandler() {
    const sy = window.scrollY || 0;
    scrollDelta = sy - lastScrollY;
    lastScrollY = sy;

    // Add scroll velocity to wind gust
    scrollGust += (Math.abs(scrollDelta) * 0.14) * (activeSide === 'right' ? -1 : 1);

    if (treeRight && treeLeft) {
      const shift = (sy * 0.035) % 40;
      treeRight.style.transform = `translate3d(0, ${shift}px, 0)`;
      treeLeft.style.transform = `translate3d(0, ${shift}px, 0)`;
    }

    checkActiveSection();
  }

  window.addEventListener('scroll', onScrollHandler, { passive: true });
  setTimeout(checkActiveSection, 150);

  // If reduced motion is requested, show static tree only, no canvas loop
  if (prefersReduced || !canvas) {
    if (canvas) canvas.style.display = 'none';
    return;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Canvas Resizing & DPR handling
  let width = 0;
  let height = 0;
  let dpr = 1;

  function resizeCanvas() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas, { passive: true });

  // ─── PETAL POOLING SYSTEM (Zero allocations per frame) ─────────────────────
  const maxPetals = isMobile ? window.BLOSSOM_CONFIG.petals.maxMobile : window.BLOSSOM_CONFIG.petals.maxDesktop;
  let activePetalCount = maxPetals;
  const petalPool = [];

  class Petal {
    constructor() {
      this.reset(true);
    }

    reset(initial = false) {
      this.z = 0.5 + Math.random() * 0.9;
      this.size = (9 + Math.random() * 8) * this.z;
      
      if (initial) {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
      } else {
        if (Math.random() < 0.6) {
          this.x = Math.random() * width;
          this.y = -20 - Math.random() * 40;
        } else {
          this.x = activeSide === 'right' ? width + 20 : -20;
          this.y = Math.random() * (height * 0.65);
        }
      }

      const dir = activeSide === 'right' ? -1 : 1;
      this.vx = (dir * (0.8 + Math.random() * 1.4) + (Math.random() - 0.5) * 0.5) * this.z;
      this.vy = (window.BLOSSOM_CONFIG.petals.gravity + Math.random() * 0.7) * this.z;
      this.rotX = Math.random() * Math.PI * 2;
      this.rotY = Math.random() * Math.PI * 2;
      this.rotZ = Math.random() * Math.PI * 2;
      this.vRotX = (Math.random() - 0.5) * 0.04;
      this.vRotY = (Math.random() - 0.5) * 0.04;
      this.vRotZ = (Math.random() - 0.5) * 0.03;
      this.wobble = Math.random() * Math.PI * 2;
      this.wobbleSpeed = 0.02 + Math.random() * 0.03;
      this.opacity = 0.6 + Math.random() * 0.35;
      
      const colorRatio = Math.random();
      this.colorA = colorRatio < 0.6 ? '#F2C9CF' : '#D98C9B';
      this.colorB = colorRatio < 0.6 ? '#D98C9B' : '#E8AAB6';
    }

    applyGust(direction, strength) {
      this.vx += direction * strength * (0.8 + Math.random() * 0.6) * this.z;
      this.vy -= Math.random() * strength * 0.25;
      this.vRotX *= 2.2;
      this.vRotY *= 2.2;
    }

    update(dt, windX) {
      this.wobble += this.wobbleSpeed;
      const sway = Math.sin(this.wobble) * 0.65 * this.z;

      this.x += (this.vx + windX + sway);
      this.y += this.vy;

      this.rotX += this.vRotX;
      this.rotY += this.vRotY;
      this.rotZ += this.vRotZ;

      if (this.y > height - 30) {
        this.vy *= 0.94;
        this.opacity *= 0.97;
      }

      if (this.y > height + 40 || this.x < -80 || this.x > width + 80 || this.opacity < 0.05) {
        this.reset(false);
      }
    }

    draw(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotZ);

      const scaleX = Math.cos(this.rotX);
      const scaleY = Math.sin(this.rotY);
      ctx.scale(Math.max(0.12, Math.abs(scaleX)), Math.max(0.12, Math.abs(scaleY)));
      ctx.globalAlpha = this.opacity;

      const s = this.size;
      ctx.beginPath();
      ctx.moveTo(0, s * 0.5);
      ctx.bezierCurveTo(-s * 0.65, s * 0.2, -s * 0.6, -s * 0.35, -s * 0.15, -s * 0.5);
      ctx.lineTo(0, -s * 0.38);
      ctx.lineTo(s * 0.15, -s * 0.5);
      ctx.bezierCurveTo(s * 0.6, -s * 0.35, s * 0.65, s * 0.2, 0, s * 0.5);
      ctx.closePath();

      const grad = ctx.createLinearGradient(0, s * 0.5, 0, -s * 0.5);
      grad.addColorStop(0, this.colorA);
      grad.addColorStop(0.7, this.colorB);
      grad.addColorStop(1, '#FFF0F2');
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.restore();
    }
  }

  for (let i = 0; i < maxPetals; i++) {
    petalPool.push(new Petal());
  }

  window.triggerBlossomGust = function(fromSide = 'right', strength = 20) {
    const dir = fromSide === 'right' ? -1 : 1;
    scrollGust += dir * strength * 0.18;
    petalPool.forEach((p) => {
      p.applyGust(dir, strength * 0.15);
    });
  };

  // ─── ANIMATION LOOP & DYNAMIC FPS ADAPTATION ──────────────────────────────
  let lastTime = performance.now();
  let isRunning = true;
  let frameCount = 0;
  let fpsTimer = performance.now();

  function loop(now) {
    if (!isRunning) return;

    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    frameCount++;
    if (now - fpsTimer >= 1000) {
      const currentFps = (frameCount * 1000) / (now - fpsTimer);
      frameCount = 0;
      fpsTimer = now;

      if (currentFps < window.BLOSSOM_CONFIG.petals.fpsThreshold && activePetalCount > 15) {
        activePetalCount = Math.max(15, Math.floor(activePetalCount * 0.75));
      }
    }

    scrollGust *= window.BLOSSOM_CONFIG.petals.gustDecay;
    const baseWind = (activeSide === 'right' ? -window.BLOSSOM_CONFIG.petals.baseDrift : window.BLOSSOM_CONFIG.petals.baseDrift);
    const totalWind = baseWind + scrollGust;

    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < activePetalCount; i++) {
      petalPool[i].update(dt, totalWind);
      petalPool[i].draw(ctx);
    }

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      isRunning = false;
    } else {
      isRunning = true;
      lastTime = performance.now();
      requestAnimationFrame(loop);
    }
  });

})();
