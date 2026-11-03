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

  /* ============ Vertical Spotlight Navbar (Right Middle) ============ */
  function initSpotlightNavbar() {
    const nav = document.getElementById('spotlightNav');
    const inner = nav ? nav.querySelector('.spotlight-nav-inner') : null;
    const links = nav ? nav.querySelectorAll('.spotlight-nav-link') : [];
    if (!nav || !inner || !links.length) return;

    let activeIndex = 0;
    let isHovered = false;

    class NavSpring {
      constructor(v, k = 190, d = 22) {
        this.v = v;
        this.t = v;
        this.vel = 0;
        this.k = k;
        this.d = d;
      }
      update(dt) {
        const a = this.k * (this.t - this.v) - this.d * this.vel;
        this.vel += a * dt;
        this.v += this.vel * dt;
        return this.v;
      }
    }

    const ambienceSpring = new NavSpring(20, 190, 22);

    function updateActive(idx) {
      if (idx < 0 || idx >= links.length) return;
      activeIndex = idx;
      links.forEach((l, i) => l.classList.toggle('active', i === idx));

      const activeEl = links[idx];
      const navR = inner.getBoundingClientRect();
      const elR = activeEl.getBoundingClientRect();
      const targetY = (elR.top - navR.top) + elR.height / 2;
      ambienceSpring.t = targetY;
    }

    inner.addEventListener('mousemove', (e) => {
      const r = inner.getBoundingClientRect();
      const y = e.clientY - r.top;
      inner.style.setProperty('--spotlight-y', `${y}px`);
      if (!isHovered) {
        isHovered = true;
        inner.classList.add('is-hovered');
      }
    });

    inner.addEventListener('mouseleave', () => {
      isHovered = false;
      inner.classList.remove('is-hovered');
    });

    links.forEach((link, idx) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        updateActive(idx);
        const href = link.getAttribute('href');
        const target = document.querySelector(href);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });

    // ScrollSpy to sync active link as page scrolls
    const sectionIds = ['hero', 'projects', 'process', 'experience', 'contact'];
    function onScrollSpy() {
      const scrollY = window.scrollY + window.innerHeight * 0.4;
      let cur = 0;
      sectionIds.forEach((id, i) => {
        const el = document.getElementById(id);
        if (el && el.offsetTop <= scrollY) {
          cur = i;
        }
      });
      if (cur !== activeIndex) {
        updateActive(cur);
      }
    }
    window.addEventListener('scroll', onScrollSpy, { passive: true });

    let lastT = performance.now();
    function navLoop(now) {
      const dt = Math.min((now - lastT) / 1000, 0.1);
      lastT = now;
      const cy = ambienceSpring.update(dt);
      inner.style.setProperty('--ambience-y', `${cy}px`);
      requestAnimationFrame(navLoop);
    }
    requestAnimationFrame(navLoop);

    setTimeout(() => updateActive(0), 120);
  }

  initAnimatedFooter();
  initSpotlightNavbar();


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
