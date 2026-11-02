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

  /* ============ 3D Gallery Tunnel — Originkit Page-Load Intro ============ */
  function initGalleryTunnel() {
    const curtain    = document.getElementById('introCurtain');
    const frame      = document.getElementById('tunnelFrame');
    const canvas     = document.getElementById('tunnelCanvas');
    const cursorEl   = document.getElementById('tunnelCursor');
    const cursorText = document.getElementById('tunnelCursorText');
    const skipBtn    = document.getElementById('introSkip');

    if (!curtain || !frame || !canvas || typeof THREE === 'undefined') {
      document.body.classList.remove('intro-active');
      if (curtain) {
        curtain.classList.add('hidden');
        setTimeout(() => curtain.remove(), 400);
      }
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
      background: '#050505',
      lineColor: '#A0A0A0',
      lineOpacity: 45,
      colors: ['#C8653B', '#FF6A00', '#AB54F7', '#EA3737', '#0072E3', '#00AA3C', '#FFB200'],
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
    const geoWall  = new THREE.PlaneGeometry(SEGMENT_DEPTH, rowH);

    const geoTubeZ = new THREE.TubeGeometry(
      new THREE.LineCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -SEGMENT_DEPTH)),
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
      (hex) => new THREE.MeshBasicMaterial({ color: new THREE.Color(hex), side: THREE.DoubleSide })
    );

    const imageMats = DEFAULT_IMAGES.map((url) => {
      const mat = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
      });
      loader.load(
        url,
        (tex) => {
          if (!alive) { tex.dispose(); return; }
          tex.minFilter = THREE.LinearFilter;
          tex.generateMipmaps = false;
          if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
          mat.map = tex;
          mat.needsUpdate = true;
          fading.push(mat);
        },
        undefined,
        () => {}
      );
      return mat;
    });

    const tube = (geo, x, y, z = 0) => {
      const m = new THREE.Mesh(geo, lineMaterial);
      m.position.set(x, y, z);
      return m;
    };

    const SLOTS = [];
    {
      const z = -SEGMENT_DEPTH / 2;
      for (let i = 0; i < cols; i++) {
        const x = -hw + i * colW + colW / 2;
        SLOTS.push({
          geo: geoFloor,
          pos: new THREE.Vector3(x, -hh, z),
          rot: new THREE.Euler(-Math.PI / 2, 0, 0),
        });
        SLOTS.push({
          geo: geoFloor,
          pos: new THREE.Vector3(x, hh, z),
          rot: new THREE.Euler(Math.PI / 2, 0, 0),
        });
      }
      for (let i = 0; i < rows; i++) {
        const y = -hh + i * rowH + rowH / 2;
        SLOTS.push({
          geo: geoWall,
          pos: new THREE.Vector3(-hw, y, z),
          rot: new THREE.Euler(0, Math.PI / 2, 0),
        });
        SLOTS.push({
          geo: geoWall,
          pos: new THREE.Vector3(hw, y, z),
          rot: new THREE.Euler(0, -Math.PI / 2, 0),
        });
      }
    }

    function populate(group) {
      const takesSlabs = populateIndex % 2 === 0;
      populateIndex++;
      const slabs = group.userData.slabs;
      if (!slabs) return;

      for (const slab of slabs) {
        if (!takesSlabs || Math.random() > 0.5) {
          slab.visible = false;
          continue;
        }
        slab.visible = true;
        if (Math.random() > 0.5) {
          slab.material = colorMats[(5 * colorIndex) % colorMats.length];
          colorIndex++;
        } else {
          slab.material = imageMats[(3 * imageIndex) % imageMats.length];
          imageIndex++;
        }
      }
    }

    function createSegment(z) {
      const group = new THREE.Group();
      group.position.z = z;

      for (let i = 0; i <= cols; i++) {
        const x = -hw + i * colW;
        group.add(tube(geoTubeZ, x, -hh));
        group.add(tube(geoTubeZ, x, hh));
      }
      for (let i = 1; i < rows; i++) {
        const y = -hh + i * rowH;
        group.add(tube(geoTubeZ, -hw, y));
        group.add(tube(geoTubeZ, hw, y));
      }
      group.add(tube(geoTubeX, -hw, -hh));
      group.add(tube(geoTubeX, -hw, hh));
      group.add(tube(geoTubeY, -hw, -hh));
      group.add(tube(geoTubeY, hw, -hh));

      const slabs = SLOTS.map((slot) => {
        const m = new THREE.Mesh(slot.geo, colorMats[0]);
        m.position.copy(slot.pos);
        m.rotation.copy(slot.rot);
        m.visible = false;
        group.add(m);
        return m;
      });
      group.userData.slabs = slabs;

      populate(group);
      return group;
    }

    const segments = [];
    for (let i = 0; i < NUM_SEGMENTS; i++) {
      const g = createSegment(-i * SEGMENT_DEPTH);
      scene.add(g);
      segments.push(g);
    }

    const resize = () => {
      if (!frame || !canvas) return;
      const w = Math.max(1, frame.clientWidth);
      const h = Math.max(1, frame.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    window.addEventListener('resize', resize, { passive: true });
    resize();

    const speedVal = DEFAULTS.speed / 100;
    const boostVal = DEFAULTS.boost / 10;
    const START_SWITCH_SECONDS = 6.0; // Whole 3D animation runs for 6s, then blurs out bit by bit
    const SWITCH_DURATION_MS = 4000;  // 4s cross-dissolve -> whole transition is ~10s total
    let startTime = null;

    const animate = (now) => {
      if (!alive) return;
      raf = requestAnimationFrame(animate);

      if (startTime === null) startTime = now;
      const elapsed = (now - startTime) / 1000;
      const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
      last = now;

      // 10s total timeline:
      // 0 to 3.5s: Glides in slow
      // 3.5s to 6.0s: Accelerates smoothly
      // 6.0s to 10.0s: Blurs out bit by bit as speed surges and portfolio reveals
      const normTime = Math.min(elapsed / 9.5, 1);
      const accelCurve = Math.pow(normTime, 2.8);
      const speedMultiplier = 0.45 + accelCurve * 15.0;

      const activeSpeed = pressed ? Math.max(boostVal, speedVal * speedMultiplier * 1.4) : (speedVal * speedMultiplier);
      scrollPos += activeSpeed * (dt * 60);

      // Camera FOV dynamically widens as acceleration surges
      const targetFov = 45 + accelCurve * 16;
      camera.fov += (targetFov - camera.fov) * 0.1;
      camera.updateProjectionMatrix();

      // At 6.0s: Whole animation is for 6s, now begins blurring out bit by bit
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

    // Interactive pointer & cursor pill
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

    // Clean exit function with 4s cross-dissolve (whole sequence ~10s total)
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

      // Both switch continuously: animation 100% -> 0%, portfolio 0% -> 100%
      document.body.classList.remove('intro-active');
      curtain.classList.add('hidden');

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

  initGalleryTunnel();


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
    const scrollY = window.scrollY + 60;
    const projectsEl = document.getElementById('projects');
    const processEl  = document.getElementById('process');
    const expEl      = document.getElementById('experience');
    const contactEl  = document.getElementById('contact');

    let isLight = false;
    // Projects (Light)
    if (projectsEl && processEl && scrollY >= projectsEl.offsetTop && scrollY < processEl.offsetTop) {
      isLight = true;
    }
    // Experience (Light)
    else if (expEl && contactEl && scrollY >= expEl.offsetTop && scrollY < contactEl.offsetTop) {
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
    { name: 'Python', badge: 'PY', category: 'Language', catClass: 'cat-lang' },
    { name: 'JavaScript', badge: 'JS', category: 'Language', catClass: 'cat-lang' },
    { name: 'SQL', badge: 'SQ', category: 'Language', catClass: 'cat-lang' },

    // Backend & frameworks
    { name: 'FastAPI', badge: 'FA', category: 'Backend', catClass: 'cat-backend' },
    { name: 'React', badge: 'RE', category: 'Backend', catClass: 'cat-backend' },
    { name: 'Redis', badge: 'RD', category: 'Backend', catClass: 'cat-backend' },

    // LLM, RAG & AI
    { name: 'Groq API', badge: 'GQ', category: 'LLM / RAG', catClass: 'cat-ai' },
    { name: 'RAG Pipelines', badge: 'RG', category: 'LLM / RAG', catClass: 'cat-ai' },
    { name: 'Embeddings', badge: 'EM', category: 'LLM / RAG', catClass: 'cat-ai' },
    { name: 'Vector DB', badge: 'VD', category: 'LLM / RAG', catClass: 'cat-ai' },
    { name: 'OpenCV', badge: 'CV', category: 'LLM / RAG', catClass: 'cat-ai' },

    // Databases
    { name: 'PostgreSQL', badge: 'PG', category: 'Database', catClass: 'cat-db' },
    { name: 'Neon', badge: 'NE', category: 'Database', catClass: 'cat-db' },
    { name: 'Supabase', badge: 'SB', category: 'Database', catClass: 'cat-db' },

    // Deployment & DevOps
    { name: 'Vercel', badge: 'VC', category: 'Deployment', catClass: 'cat-devops' },
    { name: 'Render', badge: 'RN', category: 'Deployment', catClass: 'cat-devops' },
    { name: 'Docker', badge: 'DK', category: 'Deployment', catClass: 'cat-devops' },
    { name: 'Git / GitHub', badge: 'GT', category: 'Deployment', catClass: 'cat-devops' },

    // Hardware / IoT
    { name: 'ESP32', badge: 'ES', category: 'IoT', catClass: 'cat-iot' }
  ];

  const matrixContainer = document.getElementById('skillsMatrixGrid');
  if (matrixContainer) {
    const totalSkills = skillsMatrixData.length;
    const targetSlots = totalSkills <= 20 ? 20 : Math.ceil(totalSkills / 4) * 4;
    const emptyCount = targetSlots - totalSkills;

    const cardsHtml = skillsMatrixData.map(skill => `
      <div class="skill-circle-card ${skill.catClass}">
        <div class="circle-icon">${skill.badge}</div>
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
      const sections = document.querySelectorAll('section');
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

  /* ============ Contact Form Handler (Mailto Fallback) ============ */
  const form = document.getElementById('contactForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name    = document.getElementById('cf-name').value;
      const email   = document.getElementById('cf-email').value;
      const message = document.getElementById('cf-message').value;

      const subject = encodeURIComponent(`Portfolio Inquiry from ${name}`);
      const body    = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`);

      window.location.href = `mailto:adityarajput.86046@gmail.com?subject=${subject}&body=${body}`;
    });
  }

});
