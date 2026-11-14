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
      cursorDot.style.transform = `translate3d(${mx}px, ${my}px, 0) translate(-50%, -50%)`;
      if (!animActive) {
        animActive = true;
        requestAnimationFrame(animRing);
      }
    }, { passive: true });

    let lastCursorTime = performance.now();
    function animRing() {
      const now = performance.now();
      const dt = Math.min((now - lastCursorTime) / 1000, 0.05);
      lastCursorTime = now;
      const factor = 1 - Math.exp(-22 * dt);
      rx += (mx - rx) * factor;
      ry += (my - ry) * factor;
      cursorRing.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;
      if (Math.abs(mx - rx) > 0.2 || Math.abs(my - ry) > 0.2) {
        requestAnimationFrame(animRing);
      } else {
        rx = mx;
        ry = my;
        cursorRing.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;
        animActive = false;
      }
    }
  }

  /* ============ Direct Landing Page (Intro Animation Removed per user request) ============ */
  function initGalleryTunnel() {
    document.body.classList.remove('intro-active');
    return;
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
    const headings   = gateway.querySelector('.af-headings');

    if (headings) {
      headings.style.cursor = 'pointer';
      headings.addEventListener('click', () => {
        const contactSec = document.getElementById('contact');
        if (contactSec) {
          contactSec.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }

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
      if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return;

      const mouseCol = ((clientX - rect.left) / rect.width) * hand.columns;
      const mouseRow = ((clientY - rect.top) / rect.height) * hand.rows;
      const centerCol = Math.round(mouseCol);
      const centerRow = Math.round(mouseRow);

      let closest = null;
      let closestDist = Infinity;
      const rad = Math.ceil(HOVER_RADIUS);

      // Fast O(1) spatial neighborhood lookup (avoids iterating through thousands of cells)
      for (let r = centerRow - rad; r <= centerRow + rad; r++) {
        for (let c = centerCol - rad; c <= centerCol + rad; c++) {
          const cell = hand.cells.get(`${c},${r}`);
          if (cell) {
            const dx = mouseCol - c;
            const dy = mouseRow - r;
            const distSq = dx * dx + dy * dy;
            if (distSq < closestDist) {
              closestDist = distSq;
              closest = cell;
            }
          }
        }
      }
      if (closest && closestDist <= HOVER_RADIUS * HOVER_RADIUS) {
        highlightCluster(hand.cells, closest);
      }
    }

    let isGatewayVisible = false;
    let cachedGatewayRect = null;
    function onMouseMove(e) {
      if (!isGatewayVisible) return;
      const rect = cachedGatewayRect || gateway.getBoundingClientRect();
      if (e.clientY < rect.top - 60 || e.clientY > rect.bottom + 60) return;
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
      if (!isGatewayVisible) {
        rafId = 0;
        return;
      }
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

      // Continuous interactive state
      if (isStarted && !isCompleted) {
        if (timerText) {
          const elapsed = (t - startTime) / 1000;
          const remaining = Math.max(0, TOTAL_DURATION - elapsed);
          const secs = Math.ceil(remaining);
          timerText.textContent = `CONNECT REVEAL • 0${secs}s`;
          if (meterFill) meterFill.style.width = `${(remaining / TOTAL_DURATION) * 100}%`;
          if (elapsed >= TOTAL_DURATION) {
            completeGatewayTransition();
          }
        }
      }

      rafId = requestAnimationFrame(frame);
    }
    // Observer to activate and only render when visible in viewport
    const afObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isGatewayVisible = entry.isIntersecting;
          if (entry.isIntersecting) {
            cachedGatewayRect = gateway.getBoundingClientRect();
            if (!isStarted && !isCompleted) {
              isStarted = true;
              startTime = performance.now();
              animateIn();
            }
            if (!rafId) {
              rafId = requestAnimationFrame(frame);
            }
          } else {
            cachedGatewayRect = null;
            if (rafId) {
              cancelAnimationFrame(rafId);
              rafId = 0;
            }
          }
        });
      },
      { threshold: 0.05 }
    );
    afObserver.observe(gateway);
  }



  window.initScrollAnimations = initScrollAnimations;
  window.initAnimatedFooter = initAnimatedFooter;
  window.initProtectedSections = function() {
    if (typeof window.initBooksShowcase === 'function') window.initBooksShowcase();
    if (typeof window.initProcessBanner === 'function') window.initProcessBanner();
    if (typeof window.initTechCastle === 'function') window.initTechCastle();
    if (typeof window.initPulley === 'function') window.initPulley();
    if (typeof window.initScrollAnimations === 'function') window.initScrollAnimations();
    if (typeof window.initAnimatedFooter === 'function') window.initAnimatedFooter();
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
  };

  // ============================================================================
  // DESKTOP & MOBILE NAVIGATION: ACTIVE SECTION HIGHLIGHTING & GATE RESPECT
  // ============================================================================
  function initNavObserver() {
    const navLinks = document.querySelectorAll('.nav-link, .mobile-menu a');

    // Click handler respecting castle access-gate
    navLinks.forEach((link) => {
      link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (href && href.startsWith('#') && href !== '#hero') {
          if (typeof window.isGateLocked === 'function' && window.isGateLocked()) {
            e.preventDefault();
            if (typeof window.triggerGate === 'function') {
              window.triggerGate(href);
            }
            return;
          }
        }
      });
    });

    // Active Section Highlighting via IntersectionObserver
    const sections = [
      { id: 'hero', linkHref: '#hero' },
      { id: 'projects', linkHref: '#projects' },
      { id: 'process', linkHref: '#process' },
      { id: 'skills', linkHref: '#process' },
      { id: 'experience', linkHref: '#experience' },
      { id: 'contact', linkHref: '#contact' }
    ];

    const secElements = sections.map(s => ({
      el: document.getElementById(s.id),
      href: s.linkHref
    })).filter(s => s.el);

    if ('IntersectionObserver' in window && secElements.length > 0) {
      const navObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const targetId = entry.target.id;
            const match = sections.find(s => s.id === targetId);
            if (match) {
              document.querySelectorAll('.nav-link').forEach((nl) => {
                const isActive = nl.getAttribute('href') === match.linkHref;
                nl.classList.toggle('is-active', isActive);
                if (isActive) nl.setAttribute('aria-current', 'page');
                else nl.removeAttribute('aria-current');
              });
            }
          }
        });
      }, { rootMargin: '-20% 0px -60% 0px' });

      secElements.forEach(s => navObserver.observe(s.el));
    }
  }

  initNavObserver();
  initScrollAnimations();
  if (document.fonts) {
    document.fonts.ready.then(() => {
      if (window.ScrollTrigger) window.ScrollTrigger.refresh();
    });
  }
  window.addEventListener('load', () => {
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
  });
  initGalleryTunnel();
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

  /* ============ Tech Stack Castle ============ */
  // The stone castle is managed and rendered via tools-data.js and tech-castle.js

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

      let rect = null;
      let targetRotX = 0, targetRotY = 0;
      let currRotX = 0, currRotY = 0;
      let sheenX = 0, sheenY = 0;
      let isHovered = false;
      let rafId = null;

      function updateCard() {
        if (!isHovered && Math.abs(currRotX) < 0.05 && Math.abs(currRotY) < 0.05) {
          card.style.transform = '';
          sheen.style.background = '';
          rafId = null;
          return;
        }

        currRotX += (targetRotX - currRotX) * 0.16;
        currRotY += (targetRotY - currRotY) * 0.16;

        card.style.transform = `perspective(900px) rotateX(${currRotX.toFixed(2)}deg) rotateY(${currRotY.toFixed(2)}deg) translateY(${isHovered ? -4 : 0}px)`;
        if (isHovered) {
          sheen.style.background = `radial-gradient(circle at ${sheenX.toFixed(1)}px ${sheenY.toFixed(1)}px, rgba(200, 101, 59, 0.16) 0%, rgba(255, 255, 255, 0.04) 40%, transparent 75%)`;
        }
        rafId = requestAnimationFrame(updateCard);
      }

      card.addEventListener('mouseenter', () => {
        rect = card.getBoundingClientRect();
        isHovered = true;
        if (!rafId) rafId = requestAnimationFrame(updateCard);
      }, { passive: true });

      card.addEventListener('mousemove', (e) => {
        if (!rect) rect = card.getBoundingClientRect();
        sheenX = e.clientX - rect.left;
        sheenY = e.clientY - rect.top;
        const cx = rect.width / 2;
        const cy = rect.height / 2;

        targetRotX = ((sheenY - cy) / (cy || 1)) * -6;
        targetRotY = ((sheenX - cx) / (cx || 1)) * 6;

        if (!rafId) rafId = requestAnimationFrame(updateCard);
      }, { passive: true });

      card.addEventListener('mouseleave', () => {
        isHovered = false;
        rect = null;
        targetRotX = 0;
        targetRotY = 0;
      }, { passive: true });
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
      const animatedCards = document.querySelectorAll('.proj-card-editorial, .sec-proj-card, .timeline-row');
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

  /* ============ Dynamic Script Loader Removed (deferred in head) ============ */

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

  // Initialize scroll animations once DOM and deferred scripts are ready
  const startDeferredMotion = () => {
    initScrollAnimations();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startDeferredMotion);
  } else {
    startDeferredMotion();
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

