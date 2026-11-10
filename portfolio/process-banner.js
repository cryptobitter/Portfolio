/**
 * process-banner.js
 * Heraldic Castle Banner: Cloth physics, rolling unfurl, and continuous wave.
 * Calibrated against frame-by-frame analysis of reference video flag_reference.mp4.
 */
(function () {
  'use strict';

  // --- Measured & Calibrated Parameters ---
  const CALIBRATION = {
    // Unfurl timing (0 to 1.4s unroll, 1.4 to 3.5s overshoot & settle)
    unfurlDuration: 1.40,
    overshootDuration: 2.10, // 1.4s -> 3.5s settle
    unfurlThreshold: 'top 70%', // ~30% into viewport

    // Wave parameters (calibrated to ~3.0s wave period, 3-4 soft vertical folds, 3.5% hem sway)
    baseSpeed: 1.0,           // Multiplier for wave frequency
    wavePeriod: 2.85,         // Idle wave period in seconds
    hemAmplitudePct: 0.035,   // ~3.5% of banner width (~14px depth, ~10px lateral)
    dropAmplitudeBoost: 1.85, // Higher wave amplitude during drop, decaying to 1.0
    scrollGustMax: 2.0,       // Boost on quick scroll
    scrollGustDecay: 0.93,

    // Geometry resolution
    segmentsXDesktop: 48,
    segmentsYDesktop: 72,
    segmentsXMobile: 24,
    segmentsYMobile: 36,

    // Framerate targets
    fpsDesktop: 60,
    fpsMobile: 30
  };

  // DOM Elements
  const bannerCol = document.getElementById('processBannerCol');
  if (!bannerCol) return;

  const clothWrap = document.getElementById('bannerClothWrap');
  const cloth = document.getElementById('bannerCloth');
  const waveCanvas = document.getElementById('bannerWaveCanvas');
  const bannerContent = document.getElementById('bannerContent');
  const stepItems = Array.from(document.querySelectorAll('.banner-step-item'));
  const quoteRibbon = document.getElementById('bannerRibbonQuote');
  const fringeSvg = document.querySelector('.banner-fringe-svg');

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (window.innerWidth <= 768);
  const targetFps = isMobile ? CALIBRATION.fpsMobile : CALIBRATION.fpsDesktop;
  const frameInterval = 1000 / targetFps;

  // Runtime State
  let isWavingActive = false;
  let isIntersecting = false;
  let animationFrameId = null;
  let lastFrameTime = performance.now();
  let gust = 0;
  let lastScrollY = window.scrollY;

  // Three.js Core Objects
  let renderer = null;
  let scene = null;
  let camera = null;
  let mesh = null;
  let material = null;
  let clothTexture = null;
  let clock = null;

  // Unfurl progress uniforms
  const unfurlState = {
    progress: 1.0, // 0.0 (rolled at rod) to 1.0 (at hem)
    overshoot: 0.0, // vertical bounce
    amplitudeMult: 1.0
  };

  // Step vertical positions (relative 0.0 at top to 1.0 at bottom)
  const stepFractions = [0.22, 0.38, 0.54, 0.70, 0.86];

  // --- 1. Helper: Read CSS Theme Variables ---
  function parseColor(str, fallbackHex) {
    if (!str || !window.THREE) return new THREE.Color(fallbackHex);
    try {
      return new THREE.Color(str.trim());
    } catch (e) {
      return new THREE.Color(fallbackHex);
    }
  }

  function getBannerCssVars() {
    const cs = getComputedStyle(document.documentElement);
    const topHex = cs.getPropertyValue('--banner-cloth-top').trim() || '#7A2432';
    const btmHex = cs.getPropertyValue('--banner-cloth-bottom').trim() || '#5E1A24';
    const trimHex = cs.getPropertyValue('--banner-gold-trim').trim() || '#C9A24B';
    const stitchHex = cs.getPropertyValue('--banner-gold-stitch').trim() || 'rgba(201, 162, 75, 0.45)';
    const ampMult = parseFloat(cs.getPropertyValue('--banner-wave-amplitude')) || 1.0;
    const spdMult = parseFloat(cs.getPropertyValue('--banner-wave-speed')) || 1.0;

    return {
      topHex,
      btmHex,
      trimHex,
      stitchHex,
      colorTop: parseColor(topHex, 0x7A2432),
      colorBottom: parseColor(btmHex, 0x5E1A24),
      goldTrim: parseColor(trimHex, 0xC9A24B),
      ampMult,
      spdMult
    };
  }

  // --- 2. Canvas 2D Procedural Cloth Texture Generator ---
  function createClothTexture(width, height) {
    const texCanvas = document.createElement('canvas');
    // Crisp texture resolution
    const w = 512;
    const h = 768;
    texCanvas.width = w;
    texCanvas.height = h;
    const ctx = texCanvas.getContext('2d');

    const vars = getBannerCssVars();

    // A. Vertical Crimson Gradient
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, vars.topHex);
    grad.addColorStop(1, vars.btmHex);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // B. Quilted Diamond Textile Weave Pattern
    ctx.save();
    ctx.lineWidth = 1;
    const diagSpacing = 18;
    // Light diagonal lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
    ctx.beginPath();
    for (let x = -h; x < w + h; x += diagSpacing) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x + h, h);
    }
    ctx.stroke();

    // Dark opposing diagonal lines
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.beginPath();
    for (let x = -h; x < w + h; x += diagSpacing) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x - h, h);
    }
    ctx.stroke();
    ctx.restore();

    // C. Thin Gold Stitched Border (Inset ~20px)
    ctx.save();
    ctx.strokeStyle = vars.trimHex;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    const inset = 18;
    const notchH = 46; // Swallowtail notch in texture coords
    ctx.beginPath();
    ctx.moveTo(inset, inset);
    ctx.lineTo(w - inset, inset);
    ctx.lineTo(w - inset, h - notchH - inset);
    ctx.lineTo(w / 2, h - inset);
    ctx.lineTo(inset, h - notchH - inset);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    // D. 5 Horizontal Band Divider Stitched Lines
    ctx.save();
    ctx.strokeStyle = 'rgba(201, 162, 75, 0.35)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([3, 3]);
    const bandYs = [0.28, 0.44, 0.60, 0.76];
    bandYs.forEach(yRatio => {
      const y = h * yRatio;
      ctx.beginPath();
      ctx.moveTo(inset + 10, y);
      ctx.lineTo(w - inset - 10, y);
      ctx.stroke();
    });
    ctx.restore();

    // E. 5 Gold Medallion Circle Backings on the Left
    const medallionCenters = [0.22, 0.38, 0.54, 0.70, 0.86];
    const medX = inset + 32;
    const medR = 20;

    medallionCenters.forEach(yRatio => {
      const y = h * yRatio;
      // Outer gold rim
      ctx.save();
      ctx.beginPath();
      ctx.arc(medX, y, medR, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fill();

      ctx.lineWidth = 2.0;
      ctx.strokeStyle = vars.trimHex;
      ctx.setLineDash([]);
      ctx.stroke();

      // Inner subtle rim
      ctx.beginPath();
      ctx.arc(medX, y, medR - 3, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1.0;
      ctx.stroke();
      ctx.restore();
    });

    const texture = new THREE.CanvasTexture(texCanvas);
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return texture;
  }

  // --- 3. Three.js Cloth Engine (Option B with Dynamic Shading & Unroll) ---
  function initWaveCloth() {
    if (prefersReducedMotion || !window.THREE || !waveCanvas || !cloth) return;

    try {
      clock = new THREE.Clock();
      const rect = cloth.getBoundingClientRect();
      const width = Math.max(rect.width, 280);
      const height = Math.max(rect.height, 420);

      // Renderer
      renderer = new THREE.WebGLRenderer({
        canvas: waveCanvas,
        alpha: true,
        antialias: !isMobile,
        powerPreference: 'low-power'
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.0));
      renderer.setSize(width, height, false);

      // Orthographic Camera matching physical pixel dimensions
      scene = new THREE.Scene();
      camera = new THREE.OrthographicCamera(width / -2, width / 2, height / 2, height / -2, 0.1, 1000);
      camera.position.z = 120;

      // Segments: 48x72 for desktop cloth realism, 24x36 for mobile
      const segX = isMobile ? CALIBRATION.segmentsXMobile : CALIBRATION.segmentsXDesktop;
      const segY = isMobile ? CALIBRATION.segmentsYMobile : CALIBRATION.segmentsYDesktop;
      const geometry = new THREE.PlaneGeometry(width, height, segX, segY);

      clothTexture = createClothTexture(width, height);
      const vars = getBannerCssVars();

      // Custom Vertex Shader: 3-harmonic wave + rolling cylinder unfurl + physical analytical normal
      const vertexShader = `
        uniform float uTime;
        uniform float uAmplitude;
        uniform float uSpeed;
        uniform float uGust;
        uniform float uUnfurlProgress;  // 0.0 (rolled at rod) to 1.0 (unrolled to hem)
        uniform float uOvershoot;       // Overshoot bounce displacement
        uniform float uHeight;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying float vFold;
        varying float vRolled;

        void main() {
          vUv = uv;

          // uv.y in Three.js PlaneGeometry: 1.0 is rod (top), 0.0 is hem (bottom)
          // Effective unroll drop position
          float effectiveProg = clamp(uUnfurlProgress + uOvershoot * 0.08, 0.0, 1.0);
          float rollY = 1.0 - effectiveProg;

          vec3 pos = position;

          if (uv.y < rollY) {
            // Vertices below the leading edge are rolled forward in a cylinder roll
            float distBelow = rollY - uv.y;
            float rollRadius = max(0.001, (1.0 - uUnfurlProgress) * 22.0);
            float angle = distBelow * (uHeight / max(rollRadius, 1.0)) * 0.85;

            pos.y = (rollY - 0.5) * uHeight - sin(angle) * rollRadius;
            pos.z = (1.0 - cos(angle)) * rollRadius + 4.0;
            vRolled = 1.0;
            vNormal = vec3(0.0, -sin(angle), cos(angle));
            vFold = 0.0;
          } else {
            // Vertices above the leading edge are deployed cloth
            vRolled = 0.0;

            // Distance from rod: top ~15% is almost still, hem moves most
            float yFactor = smoothstep(0.92, 0.12, uv.y);

            // Multi-harmonic traveling sine waves (3 overlapping frequencies for non-repeating flow)
            float t = uTime * uSpeed;
            float w1 = sin(uv.x * 6.28 * 1.55 + t * 2.10) * 0.52;
            float w2 = sin(uv.x * 6.28 * 2.85 - t * 2.70 + (1.0 - uv.y) * 2.30) * 0.33;
            float w3 = sin((uv.x + (1.0 - uv.y)) * 4.40 + t * 1.25) * 0.15;

            float wave = (w1 + w2 + w3);
            float totalAmp = (uAmplitude + uGust * 12.0) * yFactor;

            // Z displacement + lateral shear + slight vertical foreshortening
            pos.z += wave * totalAmp * 16.0;
            pos.x += wave * totalAmp * 2.8;
            pos.y += -abs(wave) * totalAmp * 2.2 + uOvershoot * yFactor * 14.0;

            vFold = wave * yFactor;

            // Analytical derivatives for surface normal (produces 3-4 soft fold bands across width)
            float dW_dx = (cos(uv.x * 6.28 * 1.55 + t * 2.10) * 6.28 * 1.55 * 0.52 +
                           cos(uv.x * 6.28 * 2.85 - t * 2.70 + (1.0 - uv.y) * 2.30) * 6.28 * 2.85 * 0.33 +
                           cos((uv.x + (1.0 - uv.y)) * 4.40 + t * 1.25) * 4.40 * 0.15) * yFactor;
            float dW_dy = (cos(uv.x * 6.28 * 2.85 - t * 2.70 + (1.0 - uv.y) * 2.30) * -2.30 * 0.33 +
                           cos((uv.x + (1.0 - uv.y)) * 4.40 + t * 1.25) * -4.40 * 0.15) * yFactor;

            vNormal = normalize(vec3(-dW_dx * 0.08, -dW_dy * 0.08, 1.0));
          }

          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `;

      // Custom Fragment Shader: Normal-based fold shading + velvet Fresnel sheen + swallowtail discard
      const fragmentShader = `
        uniform sampler2D uTexture;
        uniform float uHeight;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying float vFold;
        varying float vRolled;

        void main() {
          // Swallowtail V-notch Cut (Discard outside below notch)
          float notchPx = 42.0;
          float notchY = notchPx / uHeight;
          float distFromCenter = abs(vUv.x - 0.5) * 2.0;
          float cutLineY = (1.0 - distFromCenter) * notchY;

          if (vUv.y < cutLineY && vRolled < 0.5) {
            discard;
          }

          // Sample canvas texture
          vec4 texColor = texture2D(uTexture, vUv);

          // Normal-based Lighting: Directional warm light (upper-left key light)
          vec3 lightDir = normalize(vec3(0.40, 0.60, 0.70));
          float diff = dot(vNormal, lightDir);
          // Half-Lambert transmission curve gives soft velvet folds
          diff = clamp(diff * 0.45 + 0.55, 0.38, 1.28);

          // Subtle Velvet Sheen (Fresnel rim highlight on grazing angles)
          float fresnel = pow(clamp(1.0 - abs(vNormal.z), 0.0, 1.0), 2.4);
          vec3 sheenColor = vec3(1.0, 0.85, 0.70) * fresnel * 0.30;

          vec3 finalColor = texColor.rgb * diff + sheenColor;

          // Deepen crease shadows in fold troughs
          if (vFold < -0.12 && vRolled < 0.5) {
            finalColor *= 1.0 + (vFold + 0.12) * 0.40;
          }

          // Shading on rolled cylinder portion
          if (vRolled > 0.5) {
            finalColor *= clamp(vNormal.z * 0.5 + 0.5, 0.35, 1.0);
          }

          gl_FragColor = vec4(finalColor, texColor.a);
        }
      `;

      material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uAmplitude: { value: vars.ampMult },
          uSpeed: { value: CALIBRATION.baseSpeed * vars.spdMult },
          uGust: { value: 0 },
          uUnfurlProgress: { value: unfurlState.progress },
          uOvershoot: { value: unfurlState.overshoot },
          uHeight: { value: height },
          uTexture: { value: clothTexture }
        },
        transparent: true,
        depthWrite: false
      });

      mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);

      if (isIntersecting && isWavingActive) {
        startRenderLoop();
      }
    } catch (err) {
      console.warn('[Process Banner] WebGL init fallback:', err);
    }
  }

  // --- 4. Animation Render Loop (Continuous Wave & Micro Text Offset) ---
  function startRenderLoop() {
    if (animationFrameId || !renderer || prefersReducedMotion) return;
    lastFrameTime = performance.now();
    animationFrameId = requestAnimationFrame(renderLoop);
  }

  function stopRenderLoop() {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  }

  function renderLoop(currentTime) {
    if (!isIntersecting || !isWavingActive || prefersReducedMotion) {
      animationFrameId = null;
      return;
    }

    animationFrameId = requestAnimationFrame(renderLoop);

    const elapsed = currentTime - lastFrameTime;
    if (elapsed < frameInterval) return;
    lastFrameTime = currentTime - (elapsed % frameInterval);

    if (material && clock) {
      const time = clock.getElapsedTime();

      // Exponential decay of scroll wind gust
      gust *= CALIBRATION.scrollGustDecay;
      if (gust < 0.001) gust = 0;

      material.uniforms.uTime.value = time;
      material.uniforms.uGust.value = gust;
      material.uniforms.uUnfurlProgress.value = unfurlState.progress;
      material.uniforms.uOvershoot.value = unfurlState.overshoot;

      // A. Real HTML Step Text: Micro-offset from same wave function (max 2.5px, 0 at top)
      const spd = material.uniforms.uSpeed.value;
      stepItems.forEach((item, idx) => {
        // Distance from rod fraction
        const yFrac = (idx + 1) / stepItems.length;
        // Subtle organic sway: max 2.5px at bottom, 0 at top
        const xOffset = Math.sin(time * 2.1 * spd + idx * 0.9) * (yFrac * 2.4);
        item.style.transform = `translateX(${xOffset.toFixed(2)}px)`;
      });

      // B. Swallowtail Fringe fluttering with the hem
      if (fringeSvg) {
        const fringeSway = Math.sin(time * 2.6 * spd) * 3.2;
        fringeSvg.style.transform = `translateX(${fringeSway.toFixed(2)}px)`;
      }

      renderer.render(scene, camera);
    }
  }

  // --- 5. Scroll Gust Breeze Handler ---
  window.addEventListener('scroll', () => {
    if (!isWavingActive || !isIntersecting) return;
    const currentY = window.scrollY;
    const delta = Math.abs(currentY - lastScrollY);
    lastScrollY = currentY;

    if (delta > 8) {
      gust = Math.min(CALIBRATION.scrollGustMax, gust + delta * 0.015);
    }
  }, { passive: true });

  // --- 6. Resize Handler ---
  function handleResize() {
    if (!cloth || !renderer || !camera || !mesh) return;
    const rect = cloth.getBoundingClientRect();
    const width = Math.max(rect.width, 280);
    const height = Math.max(rect.height, 420);

    renderer.setSize(width, height, false);
    camera.left = width / -2;
    camera.right = width / 2;
    camera.top = height / 2;
    camera.bottom = height / -2;
    camera.updateProjectionMatrix();

    const segX = isMobile ? CALIBRATION.segmentsXMobile : CALIBRATION.segmentsXDesktop;
    const segY = isMobile ? CALIBRATION.segmentsYMobile : CALIBRATION.segmentsYDesktop;
    if (mesh.geometry) mesh.geometry.dispose();
    mesh.geometry = new THREE.PlaneGeometry(width, height, segX, segY);

    if (clothTexture) {
      clothTexture.dispose();
      clothTexture = createClothTexture(width, height);
      if (material) material.uniforms.uTexture.value = clothTexture;
    }

    if (material && material.uniforms.uHeight) {
      material.uniforms.uHeight.value = height;
    }
  }

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(handleResize, 150);
  });

  // --- 7. IntersectionObserver & Tab Visibility ---
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      isIntersecting = entry.isIntersecting;
      if (isIntersecting && isWavingActive) {
        startRenderLoop();
      } else {
        stopRenderLoop();
      }
    });
  }, { threshold: 0.05 });

  io.observe(bannerCol);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      isIntersecting = false;
      stopRenderLoop();
    } else {
      const rect = bannerCol.getBoundingClientRect();
      isIntersecting = rect.top < window.innerHeight && rect.bottom > 0;
      if (isIntersecting && isWavingActive) {
        startRenderLoop();
      }
    }
  });

  // --- 8. Unfurl (First Visit Only, Matching Reference Video 0-3.5s) ---
  function setupUnfurlAnimation() {
    const hasUnfurled = sessionStorage.getItem('heraldic_banner_unfurled');

    if (prefersReducedMotion || hasUnfurled) {
      // Already unfurled or prefers-reduced-motion: show hung immediately
      unfurlState.progress = 1.0;
      unfurlState.overshoot = 0.0;
      if (clothWrap) gsap.set(clothWrap, { scaleY: 1, opacity: 1 });
      stepItems.forEach(item => gsap.set(item, { opacity: 1 }));
      if (quoteRibbon) gsap.set(quoteRibbon, { opacity: 1, y: 0 });

      isWavingActive = true;
      initWaveCloth();
      if (isIntersecting) startRenderLoop();
    } else {
      // Initial state: rolled under the rod
      unfurlState.progress = 0.0;
      unfurlState.overshoot = 0.0;
      if (clothWrap) gsap.set(clothWrap, { scaleY: 1, opacity: 1 });
      stepItems.forEach(item => gsap.set(item, { opacity: 0, y: 12 }));
      if (quoteRibbon) gsap.set(quoteRibbon, { opacity: 0, y: 12 });

      if (window.ScrollTrigger) {
        ScrollTrigger.create({
          trigger: bannerCol,
          start: CALIBRATION.unfurlThreshold, // ~30% into viewport
          once: true,
          onEnter: () => {
            sessionStorage.setItem('heraldic_banner_unfurled', 'true');
            initWaveCloth();

            const tl = gsap.timeline({
              onComplete: () => {
                isWavingActive = true;
                if (isIntersecting) startRenderLoop();
                if (window.ScrollTrigger) ScrollTrigger.refresh();
              }
            });

            // 0 - 1.4s: Unroll downward from rod
            tl.to(unfurlState, {
              progress: 1.0,
              duration: CALIBRATION.unfurlDuration,
              ease: 'power2.inOut',
              onUpdate: () => {
                // Step rows fade in sequentially as the roll edge passes them
                stepItems.forEach((item, idx) => {
                  if (unfurlState.progress >= stepFractions[idx] && item.style.opacity !== '1') {
                    gsap.to(item, { opacity: 1, y: 0, duration: 0.38, ease: 'power2.out' });
                  }
                });
              }
            }, 0);

            // 1.4 - 3.5s: Overshoot and settle bounce (overshoot -> rebound -> settle)
            tl.to(unfurlState, {
              overshoot: 1.0, // Peak downward overshoot at ~1.75s
              duration: 0.40,
              ease: 'power2.out'
            }, 1.35);

            tl.to(unfurlState, {
              overshoot: -0.35, // Rebound upward at ~2.15s
              duration: 0.45,
              ease: 'power2.inOut'
            }, 1.75);

            tl.to(unfurlState, {
              overshoot: 0.15, // Secondary small bounce at ~2.70s
              duration: 0.55,
              ease: 'power2.inOut'
            }, 2.20);

            tl.to(unfurlState, {
              overshoot: 0.0, // Settle to equilibrium by ~3.45s
              duration: 0.75,
              ease: 'power2.out'
            }, 2.75);

            // Quote ribbon under the hem fades in as banner settles
            if (quoteRibbon) {
              tl.to(quoteRibbon, {
                opacity: 1,
                y: 0,
                duration: 0.65,
                ease: 'power2.out'
              }, 2.50);
            }
          }
        });
      } else {
        // Fallback
        unfurlState.progress = 1.0;
        stepItems.forEach(item => gsap.set(item, { opacity: 1, y: 0 }));
        if (quoteRibbon) gsap.set(quoteRibbon, { opacity: 1, y: 0 });
        isWavingActive = true;
        initWaveCloth();
      }
    }
  }

  // --- 9. Window Tuning API ---
  window.setHeraldicBannerWave = function (amplitude, speed, foldMultiplier) {
    if (material) {
      if (typeof amplitude === 'number') material.uniforms.uAmplitude.value = amplitude;
      if (typeof speed === 'number') material.uniforms.uSpeed.value = CALIBRATION.baseSpeed * speed;
    }
  };

  window.setHeraldicBannerColor = function (topHex, btmHex) {
    const cs = document.documentElement.style;
    if (topHex) cs.setProperty('--banner-cloth-top', topHex);
    if (btmHex) cs.setProperty('--banner-cloth-bottom', btmHex);
    handleResize();
  };

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupUnfurlAnimation);
  } else {
    setupUnfurlAnimation();
  }
})();
