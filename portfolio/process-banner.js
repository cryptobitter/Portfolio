/**
 * process-banner.js
 * Heraldic Castle Banner: Unfurls downward on first scroll into view,
 * then waves gently forever via a lightweight Three.js vertex-shader mesh.
 */
(function () {
  'use strict';

  // --- Tuneable Configuration ---
  const BANNER_CONFIG = {
    // Wave physics
    baseAmplitude: 14.0,   // Peak depth displacement (px) at the bottom hem
    baseSpeed: 1.0,        // Wind speed multiplier
    scrollGustDecay: 0.94, // How fast scroll breeze subsides
    maxGust: 2.2,          // Cap on scroll wind boost
    fpsDesktop: 60,
    fpsMobile: 30,
    // Unfurl animation
    unfurlDuration: 1.4,
    unfurlEase: 'back.out(1.15)',
    unfurlStart: 'top 70%' // ~30% into viewport
  };

  // DOM Elements
  const bannerCol = document.getElementById('processBannerCol');
  if (!bannerCol) return;

  const clothWrap = document.getElementById('bannerClothWrap');
  const cloth = document.getElementById('bannerCloth');
  const waveCanvas = document.getElementById('bannerWaveCanvas');
  const bannerContent = document.getElementById('bannerContent');
  const stepItems = document.querySelectorAll('.banner-step-item');
  const quoteRibbon = document.getElementById('bannerRibbonQuote');

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (window.innerWidth <= 768);
  const targetFps = isMobile ? BANNER_CONFIG.fpsMobile : BANNER_CONFIG.fpsDesktop;
  const frameInterval = 1000 / targetFps;

  let isWavingActive = false;
  let isIntersecting = false;
  let animationFrameId = null;
  let lastFrameTime = performance.now();
  let gust = 0;
  let lastScrollY = window.scrollY;

  // Three.js State
  let renderer = null;
  let scene = null;
  let camera = null;
  let mesh = null;
  let material = null;
  let clock = null;

  // --- 1. Helper: Read CSS Variables ---
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
    const ampMult = parseFloat(cs.getPropertyValue('--banner-wave-amplitude')) || 1.0;
    const spdMult = parseFloat(cs.getPropertyValue('--banner-wave-speed')) || 1.0;

    return {
      colorTop: parseColor(topHex, 0x7A2432),
      colorBottom: parseColor(btmHex, 0x5E1A24),
      goldTrim: parseColor(trimHex, 0xC9A24B),
      ampMult,
      spdMult
    };
  }

  // --- 2. Three.js Wave Cloth Engine (Option B) ---
  function initWaveCloth() {
    if (prefersReducedMotion || !window.THREE || !waveCanvas || !cloth) return;

    try {
      clock = new THREE.Clock();
      const rect = cloth.getBoundingClientRect();
      const width = Math.max(rect.width, 280);
      const height = Math.max(rect.height, 400);

      // Renderer
      renderer = new THREE.WebGLRenderer({
        canvas: waveCanvas,
        alpha: true,
        antialias: !isMobile,
        powerPreference: 'low-power'
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.0 : 1.75));
      renderer.setSize(width, height, false);

      // Scene & Camera
      scene = new THREE.Scene();
      camera = new THREE.OrthographicCamera(width / -2, width / 2, height / 2, height / -2, 0.1, 1000);
      camera.position.z = 100;

      // Plane Geometry (20 horizontal segments, 32 vertical segments for silky folds)
      const geometry = new THREE.PlaneGeometry(width, height, 20, 32);

      const vars = getBannerCssVars();

      // Custom Vertex & Fragment Shaders
      const vertexShader = `
        uniform float uTime;
        uniform float uAmplitude;
        uniform float uSpeed;
        uniform float uGust;
        uniform float uHeight;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying float vFold;

        void main() {
          vUv = uv;

          // uv.y in Three.js PlaneGeometry: 1.0 at rod (top), 0.0 at hem (bottom)
          // Distance from rod factor: 0 at top, 1 at bottom
          float yFactor = pow(clamp(1.0 - uv.y, 0.0, 1.0), 1.42);

          // Multi-harmonic wind waves (3 distinct frequencies avoid repetitive cycling)
          float t = uTime * uSpeed;
          float w1 = sin(uv.x * 6.28 * 1.45 + t * 1.85) * 0.54;
          float w2 = sin(uv.x * 6.28 * 2.80 - t * 2.45 + (1.0 - uv.y) * 2.4) * 0.32;
          float w3 = sin((uv.x + (1.0 - uv.y)) * 4.2 + t * 1.15) * 0.14;

          float wave = w1 + w2 + w3;
          float dispZ = wave * (uAmplitude + uGust * 12.0) * yFactor;
          vFold = wave * yFactor;

          vec3 pos = position;
          pos.z += dispZ;
          // Micro lateral sway for organic textile shear
          pos.x += wave * yFactor * 2.2;
          pos.y += -abs(wave) * yFactor * 1.8;

          // Normal estimation for dynamic fold specular & shading
          float dW_dx = (cos(uv.x * 6.28 * 1.45 + t * 1.85) * 6.28 * 1.45 * 0.54 +
                         cos(uv.x * 6.28 * 2.80 - t * 2.45 + (1.0 - uv.y) * 2.4) * 6.28 * 2.80 * 0.32) * yFactor;
          vNormal = normalize(vec3(-dW_dx * 0.06, 0.0, 1.0));

          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `;

      const fragmentShader = `
        uniform vec3 uColorTop;
        uniform vec3 uColorBottom;
        uniform vec3 uGoldTrim;
        uniform float uHeight;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying float vFold;

        void main() {
          // Swallowtail V-notch Cut (Discard below the notch line)
          // At bottom (uv.y near 0.0), center cuts up by ~38px
          float notchPx = 38.0;
          float notchY = notchPx / uHeight;
          float distFromCenter = abs(vUv.x - 0.5) * 2.0; // 0 at center, 1 at side edges
          float cutLineY = (1.0 - distFromCenter) * notchY;

          if (vUv.y < cutLineY) {
            discard;
          }

          // Crimson gradient from top (rod) to bottom (hem)
          vec3 clothColor = mix(uColorBottom, uColorTop, vUv.y);

          // Dynamic fold lighting: light source from upper-left
          vec3 lightDir = normalize(vec3(0.35, 0.65, 0.70));
          float diff = dot(vNormal, lightDir);
          // Soft wrap-around half-lambert shading for velvet / heavy silk
          diff = clamp(diff * 0.45 + 0.55, 0.45, 1.25);
          clothColor *= diff;

          // Subtle woven fabric crosshatch micro-texture
          float weave = sin(vUv.x * 280.0) * cos(vUv.y * 280.0) * 0.022;
          clothColor += vec3(weave);

          // Deepen shadow in deeper trough creases
          if (vFold < -0.15) {
            clothColor *= 1.0 + (vFold + 0.15) * 0.35;
          }

          gl_FragColor = vec4(clothColor, 1.0);
        }
      `;

      material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uAmplitude: { value: BANNER_CONFIG.baseAmplitude * vars.ampMult },
          uSpeed: { value: BANNER_CONFIG.baseSpeed * vars.spdMult },
          uGust: { value: 0 },
          uHeight: { value: height },
          uColorTop: { value: vars.colorTop },
          uColorBottom: { value: vars.colorBottom },
          uGoldTrim: { value: vars.goldTrim }
        },
        transparent: true,
        depthWrite: false
      });

      mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);

      // Start loop if banner is visible
      if (isIntersecting && isWavingActive) {
        startRenderLoop();
      }
    } catch (err) {
      console.warn('[Process Banner] WebGL init fallback:', err);
    }
  }

  // --- 3. Animation Render Loop ---
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

    // Update uniform time and wind gust
    if (material && clock) {
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Exponential decay of scroll gust breeze
      gust *= BANNER_CONFIG.scrollGustDecay;
      if (gust < 0.001) gust = 0;

      material.uniforms.uTime.value = time;
      material.uniforms.uGust.value = gust;

      // Subtle shared sway on text layer (~0.28 degrees) to feel organically attached
      if (bannerContent) {
        const sway = Math.sin(time * 0.9 * material.uniforms.uSpeed.value) * 0.28;
        bannerContent.style.transform = `rotate(${sway.toFixed(3)}deg)`;
      }

      renderer.render(scene, camera);
    }
  }

  // --- 4. Scroll Gust Handler ---
  window.addEventListener('scroll', () => {
    if (!isWavingActive || !isIntersecting) return;
    const currentY = window.scrollY;
    const delta = Math.abs(currentY - lastScrollY);
    lastScrollY = currentY;

    if (delta > 6) {
      gust = Math.min(BANNER_CONFIG.maxGust, gust + delta * 0.012);
    }
  }, { passive: true });

  // --- 5. Resize Handler ---
  function handleResize() {
    if (!cloth || !renderer || !camera || !mesh) return;
    const rect = cloth.getBoundingClientRect();
    const width = Math.max(rect.width, 280);
    const height = Math.max(rect.height, 400);

    renderer.setSize(width, height, false);
    camera.left = width / -2;
    camera.right = width / 2;
    camera.top = height / 2;
    camera.bottom = height / -2;
    camera.updateProjectionMatrix();

    if (mesh.geometry) mesh.geometry.dispose();
    mesh.geometry = new THREE.PlaneGeometry(width, height, 20, 32);

    if (material && material.uniforms.uHeight) {
      material.uniforms.uHeight.value = height;
    }
  }

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(handleResize, 150);
  });

  // --- 6. IntersectionObserver (Pause off-screen) & Tab Visibility ---
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

  // --- 7. Unfurl (First Visit Only) & ScrollTrigger Setup ---
  function setupUnfurlAnimation() {
    const hasUnfurled = sessionStorage.getItem('heraldic_banner_unfurled');

    if (prefersReducedMotion || hasUnfurled) {
      // Already unfurled in session or prefers-reduced-motion: show hung immediately
      if (clothWrap) gsap.set(clothWrap, { scaleY: 1, opacity: 1 });
      if (stepItems.length) gsap.set(stepItems, { opacity: 1, y: 0 });
      if (quoteRibbon) gsap.set(quoteRibbon, { opacity: 1, y: 0 });

      isWavingActive = true;
      initWaveCloth();
      if (isIntersecting) startRenderLoop();
    } else {
      // Initial state before trigger (cloth rolled up at rod)
      if (clothWrap) gsap.set(clothWrap, { scaleY: 0, transformOrigin: 'top center' });
      if (stepItems.length) gsap.set(stepItems, { opacity: 0, y: 16 });
      if (quoteRibbon) gsap.set(quoteRibbon, { opacity: 0, y: 12 });

      if (window.ScrollTrigger) {
        ScrollTrigger.create({
          trigger: bannerCol,
          start: BANNER_CONFIG.unfurlStart, // ~30% into view
          once: true,
          onEnter: () => {
            sessionStorage.setItem('heraldic_banner_unfurled', 'true');

            // Initialize Three.js wave canvas ready to wave
            initWaveCloth();

            const tl = gsap.timeline({
              onComplete: () => {
                isWavingActive = true;
                if (isIntersecting) startRenderLoop();
                if (window.ScrollTrigger) ScrollTrigger.refresh();
              }
            });

            // Cloth drops from rod with overshoot and settle
            tl.to(clothWrap, {
              scaleY: 1,
              duration: BANNER_CONFIG.unfurlDuration,
              ease: BANNER_CONFIG.unfurlEase
            }, 0);

            // Step rows fade in sequentially as cloth passes them
            if (stepItems.length) {
              tl.to(stepItems, {
                opacity: 1,
                y: 0,
                duration: 0.45,
                stagger: 0.16,
                ease: 'power2.out'
              }, 0.35);
            }

            // Quote ribbon under the hem appears at end of unfurl
            if (quoteRibbon) {
              tl.to(quoteRibbon, {
                opacity: 1,
                y: 0,
                duration: 0.55,
                ease: 'power2.out'
              }, 1.15);
            }
          }
        });
      } else {
        // Fallback if ScrollTrigger not yet loaded
        if (clothWrap) gsap.to(clothWrap, { scaleY: 1, duration: 1.4, ease: 'back.out(1.15)' });
        if (stepItems.length) gsap.to(stepItems, { opacity: 1, y: 0, duration: 0.5, stagger: 0.15 });
        if (quoteRibbon) gsap.to(quoteRibbon, { opacity: 1, y: 0, duration: 0.5, delay: 1 });
        isWavingActive = true;
        initWaveCloth();
      }
    }
  }

  // --- 8. Window Tuning API ---
  window.setHeraldicBannerWave = function (amplitude, speed) {
    if (material) {
      if (typeof amplitude === 'number') material.uniforms.uAmplitude.value = BANNER_CONFIG.baseAmplitude * amplitude;
      if (typeof speed === 'number') material.uniforms.uSpeed.value = BANNER_CONFIG.baseSpeed * speed;
    }
  };

  window.setHeraldicBannerColor = function (topHex, btmHex) {
    if (material) {
      if (topHex) material.uniforms.uColorTop.value = parseColor(topHex, 0x7A2432);
      if (btmHex) material.uniforms.uColorBottom.value = parseColor(btmHex, 0x5E1A24);
    }
  };

  // Run when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupUnfurlAnimation);
  } else {
    setupUnfurlAnimation();
  }
})();
