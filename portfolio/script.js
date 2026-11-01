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

  /* ============ Page-Load Intro Animation (< 2s, Skippable) ============ */
  const introCurtain = document.getElementById('introCurtain');
  const introSkip    = document.getElementById('introSkip');

  function closeIntro() {
    if (!introCurtain || introCurtain.classList.contains('hidden')) return;
    introCurtain.classList.add('hidden');
    setTimeout(() => {
      if (introCurtain.parentNode) {
        introCurtain.parentNode.removeChild(introCurtain);
      }
    }, 500);
  }

  if (introCurtain) {
    if (prefersReducedMotion || window.innerWidth < 768) {
      closeIntro();
    } else {
      if (introSkip) {
        introSkip.addEventListener('click', closeIntro);
      }
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' || e.key === 'Enter') closeIntro();
      }, { once: true });
      setTimeout(closeIntro, 1400);
    }
  }

  /* ============ Scroll Progress Indicator ============ */
  const progress = document.getElementById('scrollProgress');
  function updateProgress() {
    const h = document.documentElement;
    const scrolled = (h.scrollTop) / (h.scrollHeight - h.clientHeight) * 100;
    if (progress) progress.style.width = scrolled + '%';
  }
  document.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();

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

    // Check WebGL availability
    function isWebGLAvailable() {
      try {
        const c = document.createElement('canvas');
        return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
      } catch (e) {
        return false;
      }
    }
    if (!isWebGLAvailable()) return;

    const isMobile = window.innerWidth < 768;

    /* -------------------------------------------------------------
       1. Hero 3D Scene: Floating Geometric Glass & Wireframe Objects
       ------------------------------------------------------------- */
    const heroCanvas = document.getElementById('hero3dCanvas');
    const heroSection = document.getElementById('hero');

    if (heroCanvas && heroSection) {
      const heroRenderer = new THREE.WebGLRenderer({
        canvas: heroCanvas,
        alpha: true,
        antialias: !isMobile,
        powerPreference: 'high-performance'
      });
      heroRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

      const heroScene = new THREE.Scene();
      const heroCamera = new THREE.PerspectiveCamera(45, heroSection.clientWidth / heroSection.clientHeight, 0.1, 100);
      heroCamera.position.z = 22;

      // Geometries & Materials (Palette: cream, orange #C8653B, deep charcoal #181614)
      const orangeMat = new THREE.MeshBasicMaterial({ color: 0xC8653B, wireframe: true, transparent: true, opacity: 0.35 });
      const darkMat   = new THREE.MeshBasicMaterial({ color: 0x181614, wireframe: true, transparent: true, opacity: 0.22 });
      const goldMat   = new THREE.MeshBasicMaterial({ color: 0xD97706, wireframe: true, transparent: true, opacity: 0.28 });

      const objectsGroup = new THREE.Group();
      heroScene.add(objectsGroup);

      // Low-poly floating geometric objects
      const count = isMobile ? 4 : 7;
      const geos = [
        new THREE.IcosahedronGeometry(1.4, 0),
        new THREE.OctahedronGeometry(1.2, 0),
        new THREE.TetrahedronGeometry(1.3, 0),
        new THREE.TorusGeometry(1.5, 0.25, 8, 20)
      ];

      const meshList = [];
      for (let i = 0; i < count; i++) {
        const geo = geos[i % geos.length];
        const mat = i % 2 === 0 ? orangeMat : (i % 3 === 0 ? goldMat : darkMat);
        const mesh = new THREE.Mesh(geo, mat);

        mesh.position.set(
          (Math.random() - 0.5) * 28,
          (Math.random() - 0.5) * 16,
          (Math.random() - 0.5) * 8
        );
        mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);

        mesh.userData = {
          rotSpeedX: (Math.random() - 0.5) * 0.008,
          rotSpeedY: (Math.random() - 0.5) * 0.008,
          driftSpeed: (Math.random() * 0.003 + 0.002),
          baseY: mesh.position.y
        };

        objectsGroup.add(mesh);
        meshList.push(mesh);
      }

      // Floating Particles
      const particleCount = isMobile ? 35 : 80;
      const particleGeo = new THREE.BufferGeometry();
      const posArray = new Float32Array(particleCount * 3);
      for (let i = 0; i < particleCount * 3; i++) {
        posArray[i] = (Math.random() - 0.5) * 40;
      }
      particleGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
      const particleMat = new THREE.PointsMaterial({
        size: 0.12,
        color: 0xC8653B,
        transparent: true,
        opacity: 0.4
      });
      const particles = new THREE.Points(particleGeo, particleMat);
      heroScene.add(particles);

      // Mouse Parallax
      let targetMouseX = 0, targetMouseY = 0;
      let curMouseX = 0, curMouseY = 0;
      window.addEventListener('mousemove', (e) => {
        targetMouseX = (e.clientX / window.innerWidth - 0.5) * 2.5;
        targetMouseY = (e.clientY / window.innerHeight - 0.5) * 2.5;
      }, { passive: true });

      function resizeHero() {
        if (!heroSection || !heroCanvas) return;
        const w = heroSection.clientWidth;
        const h = heroSection.clientHeight;
        heroCamera.aspect = w / h;
        heroCamera.updateProjectionMatrix();
        heroRenderer.setSize(w, h, false);
      }
      resizeHero();
      window.addEventListener('resize', resizeHero, { passive: true });

      // Frame Rate Throttling / Off-screen pausing
      let heroIsVisible = true;
      const heroIo = new IntersectionObserver(([entry]) => {
        heroIsVisible = entry.isIntersecting;
      }, { threshold: 0.05 });
      heroIo.observe(heroSection);

      let heroTime = 0;
      function animateHero() {
        if (heroIsVisible && !document.hidden) {
          heroTime += 0.01;
          curMouseX += (targetMouseX - curMouseX) * 0.05;
          curMouseY += (targetMouseY - curMouseY) * 0.05;

          objectsGroup.position.x = curMouseX * 1.5;
          objectsGroup.position.y = -curMouseY * 1.5;

          meshList.forEach(m => {
            m.rotation.x += m.userData.rotSpeedX;
            m.rotation.y += m.userData.rotSpeedY;
            m.position.y = m.userData.baseY + Math.sin(heroTime + m.position.x) * 0.4;
          });

          particles.rotation.y = heroTime * 0.04;
          heroRenderer.render(heroScene, heroCamera);
        }
        requestAnimationFrame(animateHero);
      }
      animateHero();
    }

    /* -------------------------------------------------------------
       2. Mascot GLB Model Check / Fallback
       ------------------------------------------------------------- */
    const mascotContainer = document.getElementById('mascot3dContainer');
    const mascotImgFallback = document.getElementById('mascotImgFallback');

    // Attempt to load GLB loader if model exists
    if (mascotContainer && typeof THREE.GLTFLoader !== 'undefined') {
      const loader = new THREE.GLTFLoader();
      loader.load('assets/character.glb', (gltf) => {
        // GLB found! Mount Three.js renderer inside mascotContainer
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
      }, undefined, (err) => {
        // Model not found - Keep fallback image + 3D tilt
        // console.info('character.glb not found at assets/character.glb; graceful fallback active.');
      });
    }

    /* -------------------------------------------------------------
       3. Backend Architecture Visualization (FastAPI, Redis, PostgreSQL, Groq)
       ------------------------------------------------------------- */
    const archCanvas = document.getElementById('arch3dCanvas');
    const archBox    = document.getElementById('arch3dCanvasBox');
    const tooltip    = document.getElementById('archNodeTooltip');

    if (archCanvas && archBox) {
      const archRenderer = new THREE.WebGLRenderer({
        canvas: archCanvas,
        alpha: true,
        antialias: !isMobile
      });
      archRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

      const archScene  = new THREE.Scene();
      const archCamera = new THREE.PerspectiveCamera(40, archBox.clientWidth / archBox.clientHeight, 0.1, 50);
      archCamera.position.set(0, 0, 11);

      const graphGroup = new THREE.Group();
      archScene.add(graphGroup);

      // Node definitions
      const nodeDefs = [
        { id: 'fastapi', name: 'FastAPI Service', role: 'Async Core Gateway & Routing Engine', pos: [0, 0.8, 0], color: 0xC8653B },
        { id: 'groq',    name: 'Groq API / LLM',  role: 'Llama 3.3 70B Real-Time Inference Stream', pos: [2.5, 1.4, -0.4], color: 0xD97706 },
        { id: 'redis',   name: 'Redis Cache',     role: 'Task Queue & In-Memory Response Caching', pos: [-2.4, -0.6, 0.2], color: 0x9333EA },
        { id: 'postgres',name: 'PostgreSQL DB',   role: 'ACID Relational Storage & Vector Search', pos: [1.8, -1.2, 0.2], color: 0x2563EB }
      ];

      const nodeMeshes = [];
      const nodeMat = new THREE.MeshBasicMaterial({ color: 0x181614 });

      nodeDefs.forEach(def => {
        const geom = new THREE.SphereGeometry(0.48, 16, 16);
        const ringGeom = new THREE.RingGeometry(0.58, 0.64, 24);
        const ringMat = new THREE.MeshBasicMaterial({ color: def.color, side: THREE.DoubleSide });

        const mesh = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({ color: def.color }));
        const ring = new THREE.Mesh(ringGeom, ringMat);

        mesh.position.set(def.pos[0], def.pos[1], def.pos[2]);
        ring.position.set(def.pos[0], def.pos[1], def.pos[2]);

        mesh.userData = def;
        graphGroup.add(mesh);
        graphGroup.add(ring);
        nodeMeshes.push(mesh);
      });

      // Pipeline Connection Lines
      const connections = [
        { from: nodeDefs[0], to: nodeDefs[1] }, // FastAPI -> Groq
        { from: nodeDefs[0], to: nodeDefs[2] }, // FastAPI -> Redis
        { from: nodeDefs[0], to: nodeDefs[3] }, // FastAPI -> Postgres
        { from: nodeDefs[2], to: nodeDefs[3] }  // Redis <-> Postgres sync
      ];

      const packetList = [];
      const lineMat = new THREE.LineBasicMaterial({ color: 0x181614, transparent: true, opacity: 0.25 });

      connections.forEach(conn => {
        const points = [
          new THREE.Vector3(...conn.from.pos),
          new THREE.Vector3(...conn.to.pos)
        ];
        const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(lineGeo, lineMat);
        graphGroup.add(line);

        // Data packets flowing along lines
        for (let p = 0; p < 2; p++) {
          const packetGeo = new THREE.SphereGeometry(0.09, 8, 8);
          const packetMesh = new THREE.Mesh(packetGeo, new THREE.MeshBasicMaterial({ color: 0xC8653B }));
          graphGroup.add(packetMesh);
          packetList.push({
            mesh: packetMesh,
            start: points[0],
            end: points[1],
            progress: Math.random()
          });
        }
      });

      // Drag Orbit with Angle Limits
      let isDragging = false;
      let prevX = 0, prevY = 0;
      let rotTargetX = 0, rotTargetY = 0;

      archBox.addEventListener('mousedown', (e) => {
        isDragging = true;
        prevX = e.clientX;
        prevY = e.clientY;
      });

      window.addEventListener('mouseup', () => {
        isDragging = false;
      });

      window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - prevX;
        const dy = e.clientY - prevY;
        prevX = e.clientX;
        prevY = e.clientY;

        rotTargetY = Math.max(-0.65, Math.min(0.65, rotTargetY + dx * 0.008));
        rotTargetX = Math.max(-0.45, Math.min(0.45, rotTargetX + dy * 0.008));
      });

      // Hover Raycasting for Node Role Tooltip
      const raycaster = new THREE.Raycaster();
      const mouseVec  = new THREE.Vector2();

      archBox.addEventListener('mousemove', (e) => {
        const rect = archBox.getBoundingClientRect();
        mouseVec.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouseVec.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouseVec, archCamera);
        const intersects = raycaster.intersectObjects(nodeMeshes);

        if (intersects.length > 0) {
          const targetNode = intersects[0].object.userData;
          if (tooltip) {
            tooltip.innerHTML = `<span class="node-name">${targetNode.name}:</span> ${targetNode.role}`;
            tooltip.classList.add('active');
          }
          intersects[0].object.scale.set(1.2, 1.2, 1.2);
        } else {
          if (tooltip) tooltip.classList.remove('active');
          nodeMeshes.forEach(m => m.scale.set(1, 1, 1));
        }
      }, { passive: true });

      function resizeArch() {
        if (!archBox || !archCanvas) return;
        const w = archBox.clientWidth;
        const h = archBox.clientHeight;
        archCamera.aspect = w / h;
        archCamera.updateProjectionMatrix();
        archRenderer.setSize(w, h, false);
      }
      resizeArch();
      window.addEventListener('resize', resizeArch, { passive: true });

      let archVisible = true;
      const archIo = new IntersectionObserver(([entry]) => {
        archVisible = entry.isIntersecting;
      }, { threshold: 0.05 });
      archIo.observe(archBox);

      let archTime = 0;
      function animateArch() {
        if (archVisible && !document.hidden) {
          archTime += 0.015;

          // Slow idle float + user drag inertia
          if (!isDragging) {
            rotTargetY += Math.sin(archTime * 0.5) * 0.001;
          }
          graphGroup.rotation.y += (rotTargetY - graphGroup.rotation.y) * 0.08;
          graphGroup.rotation.x += (rotTargetX - graphGroup.rotation.x) * 0.08;

          // Flowing data packets
          packetList.forEach(pkt => {
            pkt.progress += 0.012;
            if (pkt.progress > 1) pkt.progress = 0;
            pkt.mesh.position.lerpVectors(pkt.start, pkt.end, pkt.progress);
          });

          archRenderer.render(archScene, archCamera);
        }
        requestAnimationFrame(animateArch);
      }
      animateArch();
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
