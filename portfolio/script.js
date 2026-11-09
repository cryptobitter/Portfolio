document.addEventListener('DOMContentLoaded', () => {

  /* ============ Check Reduced Motion Preference ============ */
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ============ Custom Cursor (Touch-Device Safe) ============ */
  const cursorDot  = document.getElementById('cursor-dot');
  const cursorRing = document.getElementById('cursor-ring');
  let mx = -200, my = -200, rx = -200, ry = -200;

  const isTouchDevice = () => ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (window.innerWidth < 768);

  if (!isTouchDevice() && cursorDot && cursorRing) {
    let animActive = false;
    document.addEventListener('mousemove', (e) => {
      mx = e.clientX;
      my = e.clientY;
      cursorDot.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
      if (!animActive) {
        animActive = true;
        requestAnimationFrame(animRing);
      }
    }, { passive: true });

    function animRing() {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      cursorRing.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      if (Math.abs(mx - rx) > 0.5 || Math.abs(my - ry) > 0.5) {
        requestAnimationFrame(animRing);
      } else {
        animActive = false;
      }
    }
  }

  /* ============ Direct Landing Page (Intro Animation Removed per user request) ============ */
  function initGalleryTunnel() {
    document.body.classList.remove('intro-active');
    return;
  }
  function _unusedGalleryTunnel() {
    const curtain    = document.getElementById('introCurtain');
    const frame      = document.getElementById('tunnelFrame');
    const canvas     = document.getElementById('tunnelCanvas');
    const cursorEl   = document.getElementById('tunnelCursor');
    const cursorText = document.getElementById('tunnelCursorText');
    const skipBtn    = document.getElementById('introSkip');

    if (!curtain || !frame || !canvas || typeof THREE === 'undefined') {
      document.body.classList.remove('intro-active');
      return;
    }

    if (prefersReducedMotion) {
      document.body.classList.remove('intro-active');
      curtain.classList.add('hidden');
      setTimeout(() => curtain.remove(), 300);
      return;
    }

    document.body.classList.add('intro-active');

    const DEFAULT_IMAGES = [
      'https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/f8b3688c-11d0-425c-0b6f-66f133322c00/w=800',
      'https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/c083d83a-f5a4-4434-989f-4eaa9bbe7500/w=800',
      'https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/12e8b0be-f114-4134-1ab7-53116bfc2800/w=800',
      'https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/b14ae2a2-1116-4a7f-0a18-1d74c4a46f00/w=800',
      'https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/babdb603-8b5b-4520-58d6-240a34463c00/w=800',
    ];

    const DEFAULTS = {
      background: '#261812',
      lineColor: '#A0A0A0',
      lineOpacity: 45,
      colors: ['#C8653B', '#D97706', '#E0784B', '#A0522D', '#B86D43', '#D48C5E', '#FFB200'],
      grid: 4,
      speed: 100,
      boost: 250,
      fade: 100,
    };

    const TUNNEL_WIDTH = 2;
    const TUNNEL_HEIGHT = 1.8;
    const SEGMENT_DEPTH = 1;
    const NUM_SEGMENTS = 15;
    const LINE_RADIUS = 0.003;
    const SCROLL_TO_Z = 0.05;
    const CAMERA_CHASE = 0.1;
    const FADE_IN = 1;
    const FOG_FAR = NUM_SEGMENTS * SEGMENT_DEPTH * 0.95;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(DEFAULTS.background);

    const fogNear = Math.min(
      FOG_FAR * (1 - Math.min(100, Math.max(0, DEFAULTS.fade)) / 100),
      FOG_FAR - 0.01
    );
    scene.fog = new THREE.Fog(new THREE.Color(DEFAULTS.background), fogNear, FOG_FAR);

    const camera = new THREE.PerspectiveCamera(45, frame.clientWidth / frame.clientHeight, 0.1, 1000);
    camera.position.set(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(frame.clientWidth, frame.clientHeight, false);

    const lineMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(DEFAULTS.lineColor),
      transparent: true,
      opacity: Math.min(100, Math.max(0, DEFAULTS.lineOpacity)) / 100,
    });

    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    const fading = [];

    let imageIndex = 0;
    let colorIndex = 0;
    let populateIndex = 0;
    let scrollPos = 0;
    let raf = 0;
    let last = 0;
    let pressed = false;
    let alive = true;

    const hw = TUNNEL_WIDTH / 2;
    const hh = TUNNEL_HEIGHT / 2;

    const cols = Math.max(1, Math.round(DEFAULTS.grid));
    const rows = Math.max(1, Math.round(DEFAULTS.grid));
    const colW = TUNNEL_WIDTH / cols;
    const rowH = TUNNEL_HEIGHT / rows;

    const geoFloor = new THREE.PlaneGeometry(colW, SEGMENT_DEPTH);
    const geoWall = new THREE.PlaneGeometry(rowH, SEGMENT_DEPTH);

    const geoTubeZ = new THREE.TubeGeometry(
      new THREE.LineCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, SEGMENT_DEPTH)),
      1, LINE_RADIUS, 8
    );
    const geoTubeX = new THREE.TubeGeometry(
      new THREE.LineCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(TUNNEL_WIDTH, 0, 0)),
      1, LINE_RADIUS, 8
    );
    const geoTubeY = new THREE.TubeGeometry(
      new THREE.LineCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, TUNNEL_HEIGHT, 0)),
      1, LINE_RADIUS, 8
    );

    const colorMats = DEFAULTS.colors.map(
      (c) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c), side: THREE.DoubleSide })
    );

    const imageMats = DEFAULT_IMAGES.map(
      (url) =>
        new THREE.MeshBasicMaterial({
          map: loader.load(url),
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0,
        })
    );

    function nextColor() {
      const m = colorMats[colorIndex % colorMats.length];
      colorIndex++;
      return m;
    }

    function nextImage() {
      const m = imageMats[imageIndex % imageMats.length];
      imageIndex++;
      return m;
    }

    const segments = [];
    for (let i = 0; i < NUM_SEGMENTS; i++) {
      const seg = new THREE.Group();
      seg.position.z = -i * SEGMENT_DEPTH;
      segments.push(seg);
      scene.add(seg);
    }

    function populate(seg) {
      while (seg.children.length) seg.remove(seg.children[0]);

      for (let c = 0; c < cols; c++) {
        const x = -hw + c * colW + colW / 2;

        const mf = (populateIndex + c) % 2 === 0 ? nextColor() : nextImage();
        const f = new THREE.Mesh(geoFloor, mf);
        f.position.set(x, -hh, SEGMENT_DEPTH / 2);
        f.rotation.x = -Math.PI / 2;
        seg.add(f);
        if (mf.transparent) fading.push(mf);

        const mc = (populateIndex + c) % 3 === 0 ? nextImage() : nextColor();
        const ce = new THREE.Mesh(geoFloor, mc);
        ce.position.set(x, hh, SEGMENT_DEPTH / 2);
        ce.rotation.x = Math.PI / 2;
        seg.add(ce);
        if (mc.transparent) fading.push(mc);
      }

      for (let r = 0; r < rows; r++) {
        const y = -hh + r * rowH + rowH / 2;

        const ml = (populateIndex + r) % 2 === 1 ? nextColor() : nextImage();
        const wl = new THREE.Mesh(geoWall, ml);
        wl.position.set(-hw, y, SEGMENT_DEPTH / 2);
        wl.rotation.y = Math.PI / 2;
        wl.rotation.z = Math.PI / 2;
        seg.add(wl);
        if (ml.transparent) fading.push(ml);

        const mr = (populateIndex + r) % 3 === 1 ? nextImage() : nextColor();
        const wr = new THREE.Mesh(geoWall, mr);
        wr.position.set(hw, y, SEGMENT_DEPTH / 2);
        wr.rotation.y = -Math.PI / 2;
        wr.rotation.z = -Math.PI / 2;
        seg.add(wr);
        if (mr.transparent) fading.push(mr);
      }

      const txBottom = new THREE.Mesh(geoTubeX, lineMaterial);
      txBottom.position.set(-hw, -hh, 0);
      seg.add(txBottom);

      const txTop = new THREE.Mesh(geoTubeX, lineMaterial);
      txTop.position.set(-hw, hh, 0);
      seg.add(txTop);

      const tyLeft = new THREE.Mesh(geoTubeY, lineMaterial);
      tyLeft.position.set(-hw, -hh, 0);
      seg.add(tyLeft);

      const tyRight = new THREE.Mesh(geoTubeY, lineMaterial);
      tyRight.position.set(hw, -hh, 0);
      seg.add(tyRight);

      const tzBL = new THREE.Mesh(geoTubeZ, lineMaterial);
      tzBL.position.set(-hw, -hh, 0);
      seg.add(tzBL);

      const tzBR = new THREE.Mesh(geoTubeZ, lineMaterial);
      tzBR.position.set(hw, -hh, 0);
      seg.add(tzBR);

      const tzTL = new THREE.Mesh(geoTubeZ, lineMaterial);
      tzTL.position.set(-hw, hh, 0);
      seg.add(tzTL);

      const tzTR = new THREE.Mesh(geoTubeZ, lineMaterial);
      tzTR.position.set(hw, hh, 0);
      seg.add(tzTR);

      populateIndex++;
    }

    segments.forEach(populate);

    function resize() {
      camera.aspect = frame.clientWidth / frame.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(frame.clientWidth, frame.clientHeight, false);
    }
    window.addEventListener('resize', resize);

    const speedVal = DEFAULTS.speed / 1000;
    const boostVal = DEFAULTS.boost / 1000;
    const START_SWITCH_SECONDS = 5.5; // At 5.5s, trigger cross-dissolve to portfolio
    const SWITCH_DURATION_MS = 2500;

    let startTime = performance.now();

    const animate = (now) => {
      if (!alive) return;
      raf = requestAnimationFrame(animate);

      if (!last) last = now;
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;

      const elapsed = (now - startTime) / 1000;
      const normTime = Math.min(elapsed / START_SWITCH_SECONDS, 1);
      const accelCurve = Math.pow(normTime, 2.2);
      const speedMultiplier = 0.5 + accelCurve * 8.0;

      const activeSpeed = pressed ? Math.max(boostVal, speedVal * speedMultiplier * 1.4) : (speedVal * speedMultiplier);
      scrollPos += activeSpeed * (dt * 60);

      const targetFov = 45 + accelCurve * 14;
      camera.fov += (targetFov - camera.fov) * 0.1;
      camera.updateProjectionMatrix();

      if (elapsed >= START_SWITCH_SECONDS && !closing) {
        closeIntro(false);
      }

      const want = -SCROLL_TO_Z * scrollPos;
      camera.position.z += CAMERA_CHASE * (want - camera.position.z);

      const span = NUM_SEGMENTS * SEGMENT_DEPTH;
      const z = camera.position.z;
      for (const seg of segments) {
        if (seg.position.z > z + SEGMENT_DEPTH) {
          let min = 0;
          for (const s of segments) min = Math.min(min, s.position.z);
          seg.position.z = min - SEGMENT_DEPTH;
          populate(seg);
        } else if (seg.position.z < z - span - SEGMENT_DEPTH) {
          let max = -999999;
          for (const s of segments) max = Math.max(max, s.position.z);
          seg.position.z = max + SEGMENT_DEPTH;
          populate(seg);
        }
      }

      for (let i = fading.length - 1; i >= 0; i--) {
        const m = fading[i];
        m.opacity = Math.min(1, m.opacity + dt / FADE_IN);
        if (m.opacity >= 1) fading.splice(i, 1);
      }

      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(animate);

    const onMove = (e) => {
      if (!cursorEl) return;
      const rect = frame.getBoundingClientRect();
      const sx = rect.width > 0 ? frame.clientWidth / rect.width : 1;
      const sy = rect.height > 0 ? frame.clientHeight / rect.height : 1;
      cursorEl.style.left = ((e.clientX - rect.left) * sx) + 'px';
      cursorEl.style.top  = ((e.clientY - rect.top) * sy) + 'px';
    };
    const onEnter = () => {
      if (cursorEl) cursorEl.style.opacity = '1';
    };
    const onLeave = () => {
      pressed = false;
      if (cursorEl) {
        cursorEl.style.opacity = '0';
        cursorEl.classList.remove('boosting');
        if (cursorText) cursorText.textContent = 'Press to Boost';
      }
    };
    const onDown = (e) => {
      if (e.target && e.target.closest('#introSkip')) return;
      pressed = true;
      if (cursorEl) {
        cursorEl.classList.add('boosting');
        if (cursorText) cursorText.textContent = 'HYPERSPEED >>';
      }
    };
    const onUp = () => {
      pressed = false;
      if (cursorEl) {
        cursorEl.classList.remove('boosting');
        if (cursorText) cursorText.textContent = 'Press to Boost';
      }
    };

    frame.addEventListener('pointermove', onMove);
    frame.addEventListener('pointerenter', onEnter);
    frame.addEventListener('pointerleave', onLeave);
    frame.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);

    let closing = false;
    function closeIntro(immediate = false) {
      if (closing || !curtain || curtain.classList.contains('hidden')) return;
      closing = true;

      const durationMs = immediate ? 350 : SWITCH_DURATION_MS;

      if (immediate) {
        curtain.style.transition = 'opacity 0.35s ease, filter 0.35s ease';
        document.querySelectorAll('main, header, footer').forEach((el) => {
          el.style.transition = 'opacity 0.35s ease, filter 0.35s ease, transform 0.35s ease';
        });
      }

      document.body.classList.remove('intro-active');
      curtain.classList.add('hidden');

      // Trigger blossom gust across hero as tunnel closes!
      if (typeof window.triggerBlossomGust === 'function') {
        window.triggerBlossomGust('right', 35);
      }

      setTimeout(() => {
        alive = false;
        cancelAnimationFrame(raf);
        document.body.classList.add('intro-complete');

        window.removeEventListener('resize', resize);
        frame.removeEventListener('pointermove', onMove);
        frame.removeEventListener('pointerenter', onEnter);
        frame.removeEventListener('pointerleave', onLeave);
        frame.removeEventListener('pointerdown', onDown);
        window.removeEventListener('pointerup', onUp);

        geoFloor.dispose();
        geoWall.dispose();
        geoTubeZ.dispose();
        geoTubeX.dispose();
        geoTubeY.dispose();
        colorMats.forEach((m) => m.dispose());
        imageMats.forEach((m) => {
          if (m.map) m.map.dispose();
          m.dispose();
        });
        lineMaterial.dispose();
        renderer.dispose();

        if (curtain.parentNode) {
          curtain.parentNode.removeChild(curtain);
        }
      }, durationMs + 100);
    }

    if (skipBtn) {
      skipBtn.addEventListener('click', () => closeIntro(true));
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' || e.key === 'Enter') closeIntro(true);
    }, { once: true });
  }

  /* ============ Animated Footer Gateway (Vengeance UI ASCII Hands) ============ */
  function initAnimatedFooter() {
    const gateway    = document.getElementById('animatedFooterGateway');
    const leftWrap   = document.getElementById('afLeftWrap');
    const rightWrap  = document.getElementById('afRightWrap');
    const leftCanvas = document.getElementById('afLeftCanvas');
    const rightCanvas= document.getElementById('afRightCanvas');
    const timerText  = document.getElementById('afTimerText');
    const meterFill  = document.getElementById('afMeterFill');
    const proceedBtn = document.getElementById('afProceedBtn');

    if (!gateway || !leftWrap || !rightWrap || !leftCanvas || !rightCanvas) {
      return;
    }

    const ASCII_CHARS = "........:::=+xX#0369";
    const CHAR_COLOR = "#C8653B";
    const HOVER_COLOR = "#FF8C42";
    const HOVER_CHAR_COLOR = "#FAF7F2";
    const HIGHLIGHT_LIFETIME = 350; // ms hovered cell stays lit
    const CLUSTER_SIZE = 10;
    const PARALLAX_EASE = 0.06;
    const PARALLAX_STRENGTH = 24;
    const HOVER_RADIUS = 8;
    const TOTAL_DURATION = 5.5; // 5.5 seconds duration (5-6 sec as requested)

    const columns = window.innerWidth < 768 ? 48 : 74;
    const cellSize = window.innerWidth < 768 ? 13 : 16;
    const fontSize = window.innerWidth < 768 ? 12 : 15;

    const hands = [];
    const wrappers = [leftWrap, rightWrap];

    function buildHandCells(image, cols, chars) {
      const rows = Math.max(1, Math.round(cols / (image.naturalWidth / image.naturalHeight || 1)));
      const sampler = document.createElement('canvas');
      sampler.width = cols;
      sampler.height = rows;
      const sampleCtx = sampler.getContext('2d');
      const cells = new Map();
      if (!sampleCtx) return { rows, cells };

      sampleCtx.drawImage(image, 0, 0, cols, rows);
      const pixels = sampleCtx.getImageData(0, 0, cols, rows).data;
      const bgCharIdx = chars.lastIndexOf('.');

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const offset = (row * cols + col) * 4;
          const brightness = (pixels[offset] * 0.299 + pixels[offset + 1] * 0.587 + pixels[offset + 2] * 0.114) / 255;
          const charIndex = Math.min(chars.length - 1, Math.floor((1 - brightness) * chars.length));
          if (charIndex <= bgCharIdx) continue;

          cells.set(`${col},${row}`, {
            col,
            row,
            char: chars[charIndex],
            highlightEndTime: 0
          });
        }
      }
      return { rows, cells };
    }

    function highlightCluster(cells, startCell) {
      const now = Date.now();
      startCell.highlightEndTime = now + HIGHLIGHT_LIFETIME;
      const steps = Math.floor(Math.random() * CLUSTER_SIZE) + 1;
      const litCells = [startCell];
      let current = startCell;

      for (let step = 0; step < steps; step++) {
        const neighbours = [];
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nb = cells.get(`${current.col + dx},${current.row + dy}`);
            if (nb && !litCells.includes(nb)) neighbours.push(nb);
          }
        }
        if (neighbours.length === 0) break;
        const next = neighbours[Math.floor(Math.random() * neighbours.length)];
        next.highlightEndTime = now + HIGHLIGHT_LIFETIME + step * 12;
        litCells.push(next);
        current = next;
      }
    }

    function setupHand(image, canvas, direction) {
      const { rows, cells } = buildHandCells(image, columns, ASCII_CHARS);
      if (cells.size === 0) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = columns * cellSize * dpr;
      canvas.height = rows * cellSize * dpr;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = `${fontSize}px 'Space Mono', monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';

      const metrics = ctx.measureText('X');
      const glyphHeight = (metrics.actualBoundingBoxAscent || fontSize * 0.8) + (metrics.actualBoundingBoxDescent || fontSize * 0.2);
      const baselineOffset = cellSize / 2 + glyphHeight / 2 - (metrics.actualBoundingBoxDescent || 2);

      hands.push({
        canvas,
        ctx,
        cells,
        cellList: [...cells.values()],
        rows,
        columns,
        cellSize,
        baselineOffset,
        direction
      });
    }

    function loadHand(src, canvas, direction) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      let done = false;
      const onDone = () => {
        if (done) return;
        done = true;
        setupHand(img, canvas, direction);
      };
      img.onload = onDone;
      img.src = src;
      if (img.complete && img.naturalWidth) onDone();
    }

    loadHand('assets/hand-left.jpg', leftCanvas, 1);
    loadHand('assets/hand-right.jpg', rightCanvas, -1);

    function renderHand(hand, now) {
      const { ctx, cellList, cellSize: cs, baselineOffset, columns: cols, rows } = hand;
      ctx.clearRect(0, 0, cols * cs, rows * cs);

      for (let i = 0; i < cellList.length; i++) {
        const cell = cellList[i];
        const x = cell.col * cs;
        const y = cell.row * cs;
        const isLit = cell.highlightEndTime > now;

        if (isLit) {
          ctx.fillStyle = HOVER_COLOR;
          ctx.fillRect(x, y, cs, cs);
        }
        ctx.fillStyle = isLit ? HOVER_CHAR_COLOR : CHAR_COLOR;
        ctx.fillText(cell.char, x + cs / 2, y + baselineOffset);
      }
    }

    const pointer = { x: 0, y: 0 };
    const drift = { x: 0, y: 0 };
    const curtain = { offset: 125 };
    let isStarted = false;
    let isCompleted = false;
    let startTime = 0;

    function hoverHand(hand, clientX, clientY) {
      const rect = hand.canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const mouseCol = ((clientX - rect.left) / rect.width) * hand.columns;
      const mouseRow = ((clientY - rect.top) / rect.height) * hand.rows;

      let closest = null;
      let closestDist = Infinity;
      const list = hand.cellList;
      for (let i = 0; i < list.length; i++) {
        const cell = list[i];
        const dx = mouseCol - cell.col;
        const dy = mouseRow - cell.row;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < closestDist) {
          closestDist = dist;
          closest = cell;
        }
      }
      if (closest && closestDist <= HOVER_RADIUS) {
        highlightCluster(hand.cells, closest);
      }
    }

    function onMouseMove(e) {
      const rect = gateway.getBoundingClientRect();
      const w = rect.width || 1;
      const h = rect.height || 1;
      pointer.x = ((e.clientX - rect.left) / w - 0.5) * PARALLAX_STRENGTH * 2;
      pointer.y = ((e.clientY - rect.top) / h - 0.5) * PARALLAX_STRENGTH * 2;
      for (let i = 0; i < hands.length; i++) {
        hoverHand(hands[i], e.clientX, e.clientY);
      }
    }
    window.addEventListener('mousemove', onMouseMove, { passive: true });

    // Heading chars
    const chars = gateway.querySelectorAll('[data-af-char]');

    function animateIn() {
      // Ease curtain in
      const startCurtain = curtain.offset;
      const startTimeCurtain = performance.now();
      const curtainDur = 1100;

      function stepCurtain(t) {
        const prog = Math.min(1, (t - startTimeCurtain) / curtainDur);
        const ease = 1 - Math.pow(1 - prog, 3);
        curtain.offset = startCurtain * (1 - ease);
        if (prog < 1) requestAnimationFrame(stepCurtain);
      }
      requestAnimationFrame(stepCurtain);

      // Stagger chars unmasking from center
      const center = (chars.length - 1) / 2;
      chars.forEach((ch, idx) => {
        const dist = Math.abs(idx - center);
        const delay = dist * 55;
        setTimeout(() => {
          ch.style.transform = 'translateY(0%)';
        }, delay);
      });
    }

    function completeGatewayTransition(immediate = false) {
      if (isCompleted) return;
      isCompleted = true;

      gateway.classList.add('af-dismissed');

      setTimeout(() => {
        gateway.style.display = 'none';
        const contactSec = document.getElementById('contact');
        if (contactSec) {
          contactSec.scrollIntoView({ behavior: 'smooth' });
        }
      }, immediate ? 50 : 750);
    }

    if (proceedBtn) {
      proceedBtn.addEventListener('click', (e) => {
        e.preventDefault();
        completeGatewayTransition(true);
      });
    }

    // Animation & timer loop
    let rafId = 0;
    function frame(t) {
      const now = Date.now();
      for (let i = 0; i < hands.length; i++) {
        renderHand(hands[i], now);
      }

      drift.x += (pointer.x - drift.x) * PARALLAX_EASE;
      drift.y += (pointer.y - drift.y) * PARALLAX_EASE;
      const scale = 1 + (PARALLAX_STRENGTH * 2) / 200;

      for (let i = 0; i < wrappers.length; i++) {
        const dir = i === 0 ? 1 : -1;
        const revealX = i === 0 ? -curtain.offset : curtain.offset;
        const x = drift.x * dir || 0;
        const y = -drift.y || 0;
        wrappers[i].style.transform = `translateX(${revealX}%) translate(${x}px, ${y}px) scale(${scale})`;
      }

      // Timer countdown if activated
      if (isStarted && !isCompleted) {
        const elapsed = (t - startTime) / 1000;
        const remaining = Math.max(0, TOTAL_DURATION - elapsed);
        const secs = Math.ceil(remaining);
        if (timerText) timerText.textContent = `CONNECT REVEAL • 0${secs}s`;
        if (meterFill) meterFill.style.width = `${(remaining / TOTAL_DURATION) * 100}%`;

        if (elapsed >= TOTAL_DURATION) {
          completeGatewayTransition();
        }
      }

      rafId = requestAnimationFrame(frame);
    }
    rafId = requestAnimationFrame(frame);

    // Observer to activate on scroll
    const afObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isStarted && !isCompleted) {
            isStarted = true;
            startTime = performance.now();
            animateIn();
          }
        });
      },
      { threshold: 0.25 }
    );
    afObserver.observe(gateway);
  }



  initGalleryTunnel();
  initAnimatedFooter();


  /* ============ Scroll Progress Indicator ============ */
  const progress = document.getElementById('scrollProgress');
  function updateProgress() {
    const h = document.documentElement;
    const scrolled = (h.scrollTop) / (h.scrollHeight - h.clientHeight) * 100;
    if (progress) progress.style.width = scrolled + '%';
  }
  document.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();

  /* ============ Dynamic Nav Theme (Swaps between Dark & Light Sections) ============ */
  const navHeader = document.querySelector('.nav-header');
  function updateNavTheme() {
    if (!navHeader) return;
    if (window.scrollY > 40) {
      navHeader.classList.add('nav-scrolled');
    } else {
      navHeader.classList.remove('nav-scrolled');
    }
    const scrollY = window.scrollY + 60;
    const projectsEl = document.getElementById('projects');
    const processEl  = document.getElementById('process');
    const expEl      = document.getElementById('experience');
    const contactEl  = document.getElementById('contact');

    let isLight = false;
    // 01. Hero (Dark Stone & Marble)
    if (!projectsEl || scrollY < projectsEl.offsetTop) {
      isLight = false;
    }
    // 02. Projects (Dark Roasted Coffee)
    else if (processEl && scrollY >= projectsEl.offsetTop && scrollY < processEl.offsetTop) {
      isLight = false;
    }
    // 03. Process & Skills (White / Warm Cream)
    else if (expEl && scrollY >= processEl.offsetTop && scrollY < expEl.offsetTop) {
      isLight = true;
    }
    // 04. Experience & Animated Footer (Dark Roasted Coffee)
    else if (contactEl && scrollY >= expEl.offsetTop && scrollY < contactEl.offsetTop) {
      isLight = false;
    }
    // 05. Contact Section (White / Warm Cream)
    else if (contactEl && scrollY >= contactEl.offsetTop) {
      isLight = true;
    }

    if (isLight) {
      navHeader.classList.add('nav-light');
    } else {
      navHeader.classList.remove('nav-light');
    }
  }
  document.addEventListener('scroll', updateNavTheme, { passive: true });
  window.addEventListener('resize', updateNavTheme, { passive: true });
  updateNavTheme();

  /* ============ Mobile Navigation Toggle ============ */
  const navToggle  = document.getElementById('navToggle');
  const mobileMenu = document.getElementById('mobileMenu');

  if (navToggle && mobileMenu) {
    navToggle.addEventListener('click', () => {
      const isOpen = mobileMenu.classList.contains('open');
      mobileMenu.classList.toggle('open', !isOpen);
      navToggle.setAttribute('aria-expanded', String(!isOpen));
    });

    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ============ 4x5 Tech Stack Matrix ============ */
  const skillsMatrixData = [
    // Languages
    {
      name: 'Python',
      icon: '<svg viewBox="0 0 128 128" width="24" height="24"><path fill="#387EB8" d="M63.5 13c-27.2 0-25.5 11.8-25.5 11.8l.1 12.2h26.1v3.7H27.9S13 39 13 66.2c0 27.2 13 26.3 13 26.3h7.7V81.7s-.4-12.8 12.6-12.8h25.8s12.2.2 12.2-11.8V25.2s1.7-12.2-20.8-12.2zm-14 7.6c2.4 0 4.4 2 4.4 4.4 0 2.4-2 4.4-4.4 4.4s-4.4-2-4.4-4.4c0-2.4 2-4.4 4.4-4.4z"/><path fill="#FFE052" d="M64.5 115c27.2 0 25.5-11.8 25.5-11.8l-.1-12.2H63.8v-3.7h36.3s14.9 1.7 14.9-25.5c0-27.2-13-26.3-13-26.3h-7.7v10.8s.4 12.8-12.6 12.8H55.9s-12.2-.2-12.2 11.8v31.9s-1.7 12.2 20.8 12.2zm14-7.6c-2.4 0-4.4-2-4.4-4.4 0-2.4 2-4.4 4.4-4.4s4.4 2 4.4 4.4c0 2.4-2 4.4-4.4 4.4z"/></svg>',
      category: 'Language',
      catClass: 'cat-lang'
    },
    {
      name: 'JavaScript',
      icon: '<svg viewBox="0 0 128 128" width="24" height="24"><rect width="128" height="128" rx="16" fill="#F7DF1E"/><path fill="#000" d="M34 102c4.4 2.8 10 4.5 15.3 4.5 14.2 0 23.3-7.2 23.3-25.1V22H53v59.3c0 9.2-4.6 13.5-11.8 13.5-4 0-6.7-.8-8.7-1.8L34 102zm46.5 2.8c7.3 4.2 17.5 7 26.7 7 15.6 0 25.5-7.8 25.5-20 0-11.3-7.2-17.5-20.5-23.2-9-3.8-12.2-6.6-12.2-11.2 0-4.4 3.7-7.6 10.4-7.6 6.3 0 11.7 2 15.2 4.2l3.8-14.7c-4.4-2.2-11.5-4-19.4-4-15.6 0-25.3 8.6-25.3 20.4 0 11.8 8.1 18.2 20.8 23.5 8.7 3.7 11.8 6.8 11.8 11.5 0 4.7-4.4 8.2-11.5 8.2-7.5 0-14.4-2.8-19-6l-5.7 11.9z"/></svg>',
      category: 'Language',
      catClass: 'cat-lang'
    },
    {
      name: 'SQL',
      icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#E2B855" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>',
      category: 'Language',
      catClass: 'cat-lang'
    },

    // Backend & frameworks
    {
      name: 'FastAPI',
      icon: '<svg viewBox="0 0 128 128" width="24" height="24"><circle cx="64" cy="64" r="64" fill="#05998B"/><path fill="#FFF" d="M72.2 14L28 70h30.2L50 114l50-56H68.8L72.2 14z"/></svg>',
      category: 'Backend',
      catClass: 'cat-backend'
    },
    {
      name: 'React',
      icon: '<svg viewBox="-11.5 -10.23174 23 20.46348" width="24" height="24"><circle cx="0" cy="0" r="2.05" fill="#61DAFB"/><g stroke="#61DAFB" stroke-width="1" fill="none"><ellipse rx="11" ry="4.2"/><ellipse rx="11" ry="4.2" transform="rotate(60)"/><ellipse rx="11" ry="4.2" transform="rotate(120)"/></g></svg>',
      category: 'Backend',
      catClass: 'cat-backend'
    },
    {
      name: 'Redis',
      icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#D82C20" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z" fill="rgba(216,44,32,0.25)"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>',
      category: 'Backend',
      catClass: 'cat-backend'
    },

    // LLM, RAG & AI
    {
      name: 'Groq API',
      icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#F55036" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="3" fill="rgba(245,80,54,0.18)"/><path d="M9 9h6v6H9z"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2"/></svg>',
      category: 'LLM / RAG',
      catClass: 'cat-ai'
    },
    {
      name: 'RAG Pipelines',
      icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#E88B3A" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M4 12h10M4 18h6"/><circle cx="18" cy="15" r="3" fill="rgba(232,139,58,0.3)"/><path d="M18 12v-2M15 15h-2"/></svg>',
      category: 'LLM / RAG',
      catClass: 'cat-ai'
    },
    {
      name: 'Embeddings',
      icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#38BDF8" stroke-width="2"><circle cx="6" cy="6" r="2.5" fill="#38BDF8"/><circle cx="18" cy="6" r="2.5" fill="#38BDF8"/><circle cx="12" cy="18" r="2.5" fill="#38BDF8"/><path d="M8 7.5l8 0M7 8l4 8M17 8l-4 8" stroke="rgba(56,189,248,0.4)" stroke-dasharray="2 2"/></svg>',
      category: 'LLM / RAG',
      catClass: 'cat-ai'
    },
    {
      name: 'Vector DB',
      icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#A855F7" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="8" ry="2.5" fill="rgba(168,85,247,0.25)"/><path d="M4 5v14c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5V5"/><path d="M4 12c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5"/><circle cx="12" cy="12" r="1.5" fill="#A855F7"/></svg>',
      category: 'LLM / RAG',
      catClass: 'cat-ai'
    },
    {
      name: 'OpenCV',
      icon: '<svg viewBox="0 0 24 24" width="24" height="24"><circle cx="12" cy="7" r="3.5" fill="none" stroke="#EA4335" stroke-width="2.2"/><circle cx="7" cy="15.5" r="3.5" fill="none" stroke="#4285F4" stroke-width="2.2"/><circle cx="17" cy="15.5" r="3.5" fill="none" stroke="#34A853" stroke-width="2.2"/></svg>',
      category: 'LLM / RAG',
      catClass: 'cat-ai'
    },

    // Databases
    {
      name: 'PostgreSQL',
      icon: '<svg viewBox="0 0 128 128" width="24" height="24"><path fill="#336791" d="M64 8C33.1 8 8 33.1 8 64c0 30.9 25.1 56 56 56s56-25.1 56-56c0-30.9-25.1-56-56-56zm28.8 81.6c-4.4 2.2-11.4 3.5-16.7 3.5-12.7 0-16.4-6.3-16.4-15.6V56.2h-9.7v-9.6h9.7v-9.8l11.4-3.5v13.3h14v9.6h-14v18.7c0 4.6 1.8 7 6.4 7 3.1 0 6.6-.9 8.7-2.2l.6 10.4z"/></svg>',
      category: 'Database',
      catClass: 'cat-db'
    },
    {
      name: 'Neon',
      icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#00E599" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="rgba(0,229,153,0.25)"/></svg>',
      category: 'Database',
      catClass: 'cat-db'
    },
    {
      name: 'Supabase',
      icon: '<svg viewBox="0 0 109 113" width="24" height="24" fill="none"><path d="M63.7 110.3c-2.3 3.1-7.4 1.7-7.7-2.2L52 57.3H98c5.4 0 8.3 6.3 4.8 10.4L63.7 110.3z" fill="#3ECF8E"/><path d="M45.3 2.7c2.3-3.1 7.4-1.7 7.7 2.2l4 50.8H11c-5.4 0-8.3-6.3-4.8-10.4L45.3 2.7z" fill="#3ECF8E" fill-opacity=".75"/></svg>',
      category: 'Database',
      catClass: 'cat-db'
    },

    // Deployment & DevOps
    {
      name: 'Vercel',
      icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="#FFFFFF"><path d="M12 1L24 22H0L12 1Z"/></svg>',
      category: 'Deployment',
      catClass: 'cat-devops'
    },
    {
      name: 'Render',
      icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#46E3B7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5" fill="rgba(70,227,183,0.3)"/><rect x="14" y="3" width="7" height="7" rx="1.5" fill="rgba(70,227,183,0.3)"/><rect x="14" y="14" width="7" height="7" rx="1.5" fill="rgba(70,227,183,0.3)"/><path d="M3 14h7v7H3z"/></svg>',
      category: 'Deployment',
      catClass: 'cat-devops'
    },
    {
      name: 'Docker',
      icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="#2496ED"><path d="M13.9 8.5h-1.8v1.8h1.8V8.5zm-2.4 0H9.7v1.8h1.8V8.5zm-2.4 0H7.3v1.8h1.8V8.5zm7.2 0h-1.8v1.8h1.8V8.5zm-4.8-2.4H9.7v1.8h1.8V6.1zm2.4 0h-1.8v1.8h1.8V6.1zm2.4 0h-1.8v1.8h1.8V6.1zm-7.2 4.8H7.3v1.8h1.8v-1.8zm2.4 0H9.7v1.8h1.8v-1.8zm2.4 0h-1.8v1.8h1.8v-1.8zm2.4 0h-1.8v1.8h1.8v-1.8z"/><path d="M23.8 11.8c-.5-.4-1.6-.6-2.4-.2-.2-.8-.7-1.4-1.5-1.7l-.6-.2-.4.5c-.7 1-1 2.2-.9 3.5 0 .2.1.4.1.6H1.1c-.6 0-1 .4-1 1 0 3.3 2.1 6.3 5.4 7.6 5.8 2.3 12.8 1.1 17.1-3 1.1-1.1 1.7-2.6 1.8-4.2.1-.8-.1-2.6-.6-3.6z"/></svg>',
      category: 'Deployment',
      catClass: 'cat-devops'
    },
    {
      name: 'Git / GitHub',
      icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="#F05032"><path d="M21.6 10.9L13.1 2.4c-.8-.8-2-.8-2.8 0L8.5 4.2l3.6 3.6c.9-.3 1.9 0 2.5.6.7.7.9 1.7.6 2.5l3.4 3.4c.9-.3 1.9 0 2.5.6 1 .9 1 2.5 0 3.5s-2.5 1-3.5 0c-.8-.8-1-2-.4-3l-3.2-3.2v6.2c.5.3.8.9.8 1.5 0 1.1-.9 2-2 2s-2-.9-2-2c0-.7.4-1.3 1-1.7V9.7c-.6-.4-1-1-1-1.7 0-.4.1-.7.3-1L4.2 10.5c-.8.8-.8 2 0 2.8l8.5 8.5c.8.8 2 .8 2.8 0l6.1-6.1c.8-.8.8-2 0-2.8z"/></svg>',
      category: 'Deployment',
      catClass: 'cat-devops'
    },

    // Hardware / IoT
    {
      name: 'ESP32',
      icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#E0784B" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="5" width="14" height="14" rx="2" fill="rgba(224,120,75,0.25)"/><path d="M9 9h6v6H9z"/><path d="M2 9h3M2 15h3M19 9h3M19 15h3M9 2v3M15 2v3M9 19v3M15 19v3"/></svg>',
      category: 'IoT',
      catClass: 'cat-iot'
    }
  ];

  const matrixContainer = document.getElementById('skillsMatrixGrid');
  if (matrixContainer) {
    const totalSkills = skillsMatrixData.length;
    const targetSlots = totalSkills <= 20 ? 20 : Math.ceil(totalSkills / 4) * 4;
    const emptyCount = targetSlots - totalSkills;

    const cardsHtml = skillsMatrixData.map(skill => `
      <div class="skill-circle-card ${skill.catClass}">
        <div class="circle-icon">${skill.icon || skill.badge}</div>
        <span class="skill-name">${skill.name}</span>
        <div class="skill-cat-row">
          <span class="cat-indicator-dot"></span>
          <span class="skill-cat">${skill.category}</span>
        </div>
      </div>
    `).join('');

    let emptyHtml = '';
    for (let i = 0; i < emptyCount; i++) {
      emptyHtml += `<div class="skill-card-empty" aria-hidden="true">+</div>`;
    }

    matrixContainer.innerHTML = cardsHtml + emptyHtml;
  }

  /* ============ 3D Mascot Character Proximity, Tilt & GLB Model Handler ============ */
  const mascotCard   = document.getElementById('mascotCard');
  const mascotStage  = document.getElementById('heroMascotStage');
  const mascotBubble = document.getElementById('mascotBubble');

  const bubblePhrases = [
    "Hey, I'm Aditya! 👋",
    "Building FastAPI & AI models! ⚡",
    "Llama 3.3 70B stream active 🚀",
    "Python & Redis task queues 🔥",
    "Got a project in mind? 💡"
  ];
  let phraseIdx = 0;
  let lastPopTime = 0;
  let tiltX = 0, tiltY = 0;

  if (mascotCard && mascotStage) {
    window.addEventListener('mousemove', (e) => {
      const rect = mascotCard.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top  + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const normX = dx / (window.innerWidth / 2);
      const normY = dy / (window.innerHeight / 2);
      tiltX = Math.max(-14, Math.min(14, normY * -18));
      tiltY = Math.max(-18, Math.min(18, normX * 18));

      mascotCard.style.transform = `rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;

      const now = Date.now();
      if (dist < 220) {
        mascotStage.classList.add('near');
        if (now - lastPopTime > 1600) {
          lastPopTime = now;
          mascotCard.classList.remove('pop');
          void mascotCard.offsetWidth;
          mascotCard.classList.add('pop');

          if (mascotBubble) {
            phraseIdx = (phraseIdx + 1) % bubblePhrases.length;
            mascotBubble.textContent = bubblePhrases[phraseIdx];
          }

          setTimeout(() => mascotCard.classList.remove('pop'), 600);
        }
      } else {
        mascotStage.classList.remove('near');
      }
    }, { passive: true });
  }

  /* ============ 3D Cards Tilt with Soft Moving Sheen ============ */
  function setup3dCardsTilt() {
    if (prefersReducedMotion || isTouchDevice()) return;

    const cards = document.querySelectorAll('.proj-card-editorial, .sec-proj-card, .skill-circle-card');
    cards.forEach(card => {
      let sheen = card.querySelector('.card-shine-sheen');
      if (!sheen) {
        sheen = document.createElement('div');
        sheen.className = 'card-shine-sheen';
        sheen.setAttribute('aria-hidden', 'true');
        card.appendChild(sheen);
      }

      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const cx = rect.width / 2;
        const cy = rect.height / 2;

        const rotX = ((y - cy) / cy) * -7;
        const rotY = ((x - cx) / cx) * 7;

        card.style.transform = `perspective(900px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) translateY(-4px)`;
        sheen.style.background = `radial-gradient(circle at ${x}px ${y}px, rgba(200, 101, 59, 0.16) 0%, rgba(255, 255, 255, 0.04) 40%, transparent 75%)`;
      }, { passive: true });

      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });
  }
  setup3dCardsTilt();

  /* ============ GSAP ScrollTrigger Scroll-Driven Motion ============ */
  function initScrollAnimations() {
    if (prefersReducedMotion) {
      document.querySelectorAll('.reveal, .reveal-left').forEach(el => el.classList.add('visible'));
      return;
    }

    if (window.gsap && window.ScrollTrigger) {
      gsap.registerPlugin(ScrollTrigger);

      // Section Depth Parallax
      const sections = document.querySelectorAll('section:not(#hero)');
      sections.forEach(sec => {
        gsap.fromTo(sec, 
          { opacity: 0.94, y: 30 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: sec,
              start: 'top 85%',
              toggleActions: 'play none none none'
            }
          }
        );
      });

      // Cards 3D Entry Motion
      const animatedCards = document.querySelectorAll('.proj-card-editorial, .sec-proj-card, .timeline-row, .process-step');
      animatedCards.forEach(card => {
        gsap.fromTo(card,
          { opacity: 0, y: 35, rotateX: 6 },
          {
            opacity: 1,
            y: 0,
            rotateX: 0,
            duration: 0.75,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: card,
              start: 'top 88%',
              toggleActions: 'play none none none'
            }
          }
        );
      });
    } else {
      // IntersectionObserver Fallback
      const revealEls = document.querySelectorAll('.reveal');
      const io = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1 });
      revealEls.forEach(el => io.observe(el));
    }
  }

  /* ============ 3D WebGL Scenes (Lazy-Loaded After Core Render) ============ */
  function init3dScenes() {
    if (prefersReducedMotion || typeof THREE === 'undefined') return;

    /* Mascot GLB Model Check / Fallback */
    const mascotContainer = document.getElementById('mascot3dContainer');
    const mascotImgFallback = document.getElementById('mascotImgFallback');

    if (mascotContainer && typeof THREE.GLTFLoader !== 'undefined') {
      const loader = new THREE.GLTFLoader();
      loader.load('assets/character.glb', (gltf) => {
        mascotContainer.style.display = 'block';
        if (mascotImgFallback) mascotImgFallback.style.display = 'none';

        const mRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        mRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        mRenderer.setSize(mascotContainer.clientWidth, mascotContainer.clientHeight);
        mascotContainer.appendChild(mRenderer.domElement);

        const mScene = new THREE.Scene();
        const mCam = new THREE.PerspectiveCamera(45, mascotContainer.clientWidth / mascotContainer.clientHeight, 0.1, 50);
        mCam.position.set(0, 0, 5);

        const light = new THREE.DirectionalLight(0xFFFFFF, 1.2);
        light.position.set(2, 4, 3);
        mScene.add(light);
        mScene.add(new THREE.AmbientLight(0xFFF0E0, 0.8));

        const model = gltf.scene;
        mScene.add(model);

        function animMascot() {
          mRenderer.render(mScene, mCam);
          requestAnimationFrame(animMascot);
        }
        animMascot();
      }, undefined, () => {});
    }
  }


  /* ============ Dynamic Script Loader ============ */
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) return resolve();
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = resolve;
      s.onerror = reject;
      document.body.appendChild(s);
    });
  }

  // Initial immediate lightweight reveal fallback
  const revealEls = document.querySelectorAll('.reveal, .reveal-left');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('visible'));
  }

  // Defer 3D and Scroll initialization until main page content has finished paint
  const startDeferredMotion = async () => {
    // Mobile (<768px) and reduced-motion use the lightweight static/IntersectionObserver fallback
    if (prefersReducedMotion || window.innerWidth < 768) {
      initScrollAnimations();
      return;
    }

    try {
      // Lazy load GSAP & ScrollTrigger
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js');
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js');
      initScrollAnimations();
    } catch (e) {
      console.warn('GSAP lazy load fallback:', e);
      initScrollAnimations();
    }

    try {
      // Lazy load Three.js
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js');
      init3dScenes();
    } catch (e) {
      console.warn('Three.js lazy load fallback:', e);
    }
  };

  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      startDeferredMotion();
    }, { timeout: 1200 });
  } else {
    setTimeout(startDeferredMotion, 350);
  }

  /* ============ Contact Form Handler (Direct Delivery via Web3Forms API) ============ */
  const contactForm = document.getElementById('contactForm');
  const submitBtn   = document.getElementById('cfSubmitBtn');
  const formStatus  = document.getElementById('formStatus');

  if (contactForm && submitBtn && formStatus) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const btnText = submitBtn.querySelector('.btn-text');
      const arrow   = submitBtn.querySelector('.arrow');
      const originalText = btnText ? btnText.textContent : 'SEND MESSAGE';

      // Set sending UI state
      submitBtn.disabled = true;
      if (btnText) btnText.textContent = 'SENDING...';
      if (arrow) arrow.style.display = 'none';

      formStatus.className = 'form-status info';
      formStatus.textContent = 'Transmitting message to Aditya...';

      const formData = new FormData(contactForm);
      const name     = (formData.get('name') || '').toString().trim();
      const email    = (formData.get('email') || '').toString().trim();
      const message  = (formData.get('message') || '').toString().trim();
      const accessKey = (formData.get('access_key') || '').toString().trim();

      // Check if user has entered their Web3Forms key
      const isPlaceholderKey = !accessKey || accessKey === 'YOUR_ACCESS_KEY_HERE';

      if (isPlaceholderKey) {
        // Safe automatic fallback: trigger email client with populated details
        setTimeout(() => {
          const subject = encodeURIComponent(`Portfolio Inquiry from ${name || 'Visitor'}`);
          const body    = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`);
          window.location.href = `mailto:adityarajput.86046@gmail.com?subject=${subject}&body=${body}`;

          formStatus.className = 'form-status success';
          formStatus.innerHTML = `✓ Form ready! Opening your email client to dispatch to <strong>adityarajput.86046@gmail.com</strong>.<br><small style="opacity:0.85;">(To enable background 1-click delivery without opening mail client, add your free Web3Forms access key in index.html)</small>`;
          submitBtn.disabled = false;
          if (btnText) btnText.textContent = originalText;
          if (arrow) arrow.style.display = '';
        }, 500);
        return;
      }

      try {
        const response = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          body: formData
        });

        const data = await response.json();

        if (response.status === 200 && data.success) {
          formStatus.className = 'form-status success';
          formStatus.innerHTML = `✓ Thank you, <strong>${name || 'there'}</strong>! Your message has been dispatched directly to Aditya's inbox. Expect a response within 24h.`;
          contactForm.reset();
        } else {
          throw new Error(data.message || 'Transmission failed');
        }
      } catch (err) {
        console.warn('Direct delivery fallback:', err);
        formStatus.className = 'form-status error';
        const fallbackSub = encodeURIComponent(`Portfolio Inquiry from ${name || 'Visitor'}`);
        const fallbackBody = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`);
        formStatus.innerHTML = `⚠️ Direct transmission encountered a network block. <a href="mailto:adityarajput.86046@gmail.com?subject=${fallbackSub}&body=${fallbackBody}">Click here to dispatch directly via email →</a>`;
      } finally {
        submitBtn.disabled = false;
        if (btnText) btnText.textContent = originalText;
        if (arrow) arrow.style.display = '';
      }
    });
  }

});
