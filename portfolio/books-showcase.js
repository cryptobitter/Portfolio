/**
 * 3D Books / Projects Showcase for Aditya Rajput Portfolio
 * Adapted from Vengeance UI 3D Books Showcase into high-performance Vanilla Three.js
 */

(function () {
  'use strict';

  // Demo Project Configurations (The 3 Featured Projects)
  const PROJECTS_DATA = [
    {
      id: "nayay-ai",
      title: "NAYAY AI",
      subtitle: "AI Legal Clause Explainer & Aid Platform",
      author: "FastAPI • Groq API • Supabase",
      badge: "LIVE PRODUCT",
      year: "2026",
      stars: 5,
      desc: "Bilingual (English/Hindi) legal assistant and clause explainer for Indian citizens. Powered by Groq's llama-3.3-70b via FastAPI backend for low-latency guidance, with Supabase Auth & PostgreSQL.",
      tags: ["FastAPI", "Groq API", "Supabase", "PostgreSQL", "Bilingual NLP"],
      github: "https://github.com/cryptobitter/nayay-ai-legal-clause-explainer",
      demo: "https://github.com/cryptobitter/nayay-ai-legal-clause-explainer",
      spineBg: "#261812",
      spineInk: "#E0784B",
      spineFont: "700 38px 'Playfair Display', Georgia, serif",
      backBg: "#261812",
      backInk: "245,242,236",
      edge: "#EAE5DB",
      accent: "#C8653B",
      chapters: [
        "Legal Query Ingestion",
        "Groq LLaMA-3 Pipeline",
        "Clause Deconstruction",
        "Bilingual Translation",
        "Supabase Auth & Audit"
      ]
    },
    {
      id: "nirnay",
      title: "NIRNAY",
      subtitle: "On-Chain Policy Decision Auditor",
      author: "RAG • LLM • Blockchain",
      badge: "IN DEVELOPMENT",
      year: "2026",
      stars: 5,
      desc: "RAG and LLM system that audits policy decisions and records an immutable audit trail on the blockchain. Verifies institutional compliance while preserving transparent, verifiable decision histories.",
      tags: ["RAG", "LLM", "Blockchain", "FastAPI", "Vector DB"],
      github: "https://github.com/cryptobitter/Nirnay",
      demo: "https://github.com/cryptobitter/Nirnay",
      spineBg: "#3E2920",
      spineInk: "#FFFFFF",
      spineFont: "700 40px 'Playfair Display', Georgia, serif",
      backBg: "#3E2920",
      backInk: "245,242,236",
      edge: "#DFD8CC",
      accent: "#D97706",
      chapters: [
        "Policy Ingestion & RAG",
        "Vector Search Verification",
        "LLM Audit Pipeline",
        "Smart Contract Logging",
        "Immutable Audit Trail"
      ]
    },
    {
      id: "fractoes",
      title: "FRACTOES",
      subtitle: "AI Fracture X-Ray Analysis & Radiology PDF",
      author: "FastAPI • ReportLab • Vision",
      badge: "PRODUCTION SHIPPED",
      year: "2026",
      stars: 5,
      desc: "Sole backend engineer on a 5-person team. FastAPI backend on Render with JWT auth & OTP email verification. Feeds X-ray detection models into Grok-generated radiology PDF reports.",
      tags: ["FastAPI", "SQLAlchemy", "Supabase", "ReportLab", "JWT Auth"],
      github: "https://github.com/cryptobitter/FRACTOES",
      demo: "https://github.com/cryptobitter/FRACTOES",
      spineBg: "#C8653B",
      spineInk: "#FFFFFF",
      spineFont: "700 38px 'Playfair Display', Georgia, serif",
      backBg: "#A0522D",
      backInk: "255,255,255",
      edge: "#F5F2EC",
      accent: "#E0784B",
      chapters: [
        "X-Ray Preprocessing",
        "Vision Detection Feeds",
        "ReportLab PDF Engine",
        "JWT & OTP Auth",
        "Microservice Deployment"
      ]
    }
  ];

  // Helper spring for damped smooth animation
  class Spring {
    constructor(v, k, d) {
      this.v = v;
      this.t = v;
      this.vel = 0;
      this.k = k || 120;
      this.d = d || 14;
    }
    set(v) {
      this.v = v;
      this.t = v;
      this.vel = 0;
      return this;
    }
    update(dt) {
      const a = this.k * (this.t - this.v) - this.d * this.vel;
      this.vel += a * dt;
      this.v += this.vel * dt;
      return this.v;
    }
  }

  function mkCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }

  function drawSpaced(x, text, cx, y, ls) {
    const prev = x.textAlign;
    x.textAlign = 'left';
    const chars = [...text];
    let tot = 0;
    const ws = chars.map((ch) => {
      const w = x.measureText(ch).width;
      tot += w;
      return w;
    });
    tot += ls * (chars.length - 1);
    let px = cx - tot / 2;
    chars.forEach((ch, i) => {
      x.fillText(ch, px, y);
      px += ws[i] + ls;
    });
    x.textAlign = prev;
  }

  function rr(x, px, py, w, h, r) {
    x.beginPath();
    x.moveTo(px + r, py);
    x.arcTo(px + w, py, px + w, py + h, r);
    x.arcTo(px + w, py + h, px, py + h, r);
    x.arcTo(px, py + h, px, py, r);
    x.arcTo(px, py, px + w, py, r);
    x.closePath();
  }

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  function initBooksShowcase() {
    const root = document.getElementById('booksShowcaseRoot');
    const canvasEl = document.getElementById('booksCanvas');
    if (!root || !canvasEl || typeof THREE === 'undefined') return;

    let cancelled = false;
    const timeouts = [];
    const setT = (fn, ms) => {
      const id = setTimeout(() => {
        if (!cancelled) fn();
      }, ms);
      timeouts.push(id);
      return id;
    };

    const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const lowPowerDevice =
      RM ||
      window.matchMedia('(max-width: 900px)').matches ||
      (navigator.hardwareConcurrency ?? 8) <= 4;

    // Renderer
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas: canvasEl,
        antialias: !lowPowerDevice,
        alpha: true,
        powerPreference: 'high-performance'
      });
    } catch (err) {
      console.warn('BooksShowcase: WebGL failed', err);
      return;
    }

    const dims = { w: root.clientWidth || 1000, h: root.clientHeight || 680 };

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowPowerDevice ? 1 : 1.5));
    if (THREE.SRGBColorSpace) {
      renderer.outputColorSpace = THREE.SRGBColorSpace;
    } else if (THREE.sRGBEncoding) {
      renderer.outputEncoding = THREE.sRGBEncoding;
    }
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = !lowPowerDevice;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    const ANISO = renderer.capabilities ? renderer.capabilities.getMaxAnisotropy() : 1;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(26, dims.w / dims.h, 0.1, 100);
    camera.position.set(0, 0.1, 9.6);

    // Environment map via PMREM
    function envBlob(x, cx, cy, r, rgb, a) {
      const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, 'rgba(' + rgb + ',' + a + ')');
      g.addColorStop(1, 'rgba(' + rgb + ',0)');
      x.fillStyle = g;
      x.beginPath();
      x.arc(cx, cy, r, 0, 6.2832);
      x.fill();
    }
    (function buildEnv() {
      const c = mkCanvas(512, 256),
        x = c.getContext('2d');
      const g = x.createLinearGradient(0, 0, 0, 256);
      g.addColorStop(0, '#5A463B');
      g.addColorStop(0.55, '#261812');
      g.addColorStop(1, '#150C08');
      x.fillStyle = g;
      x.fillRect(0, 0, 512, 256);
      envBlob(x, 140, 66, 95, '255,255,255', 0.95);
      envBlob(x, 405, 84, 55, '224,120,75', 0.55);
      envBlob(x, 256, 150, 120, '200,101,59', 0.32);
      const tx = new THREE.CanvasTexture(c);
      tx.mapping = THREE.EquirectangularReflectionMapping;
      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromEquirectangular(tx).texture;
      tx.dispose();
      pmrem.dispose();
    })();

    // Lighting
    const hemi = new THREE.HemisphereLight(0xF5F2EC, 0x261812, 0.45);
    scene.add(hemi);

    const key = new THREE.DirectionalLight(0xFFFFFF, 0.95);
    key.position.set(3.5, 5, 6);
    key.castShadow = !lowPowerDevice;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -4;
    key.shadow.camera.right = 4;
    key.shadow.camera.top = 4;
    key.shadow.camera.bottom = -4;
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 20;
    key.shadow.bias = -0.0004;
    scene.add(key);

    const fillLight = new THREE.DirectionalLight(0xE0784B, 0.28);
    fillLight.position.set(-4, 1, 4);
    scene.add(fillLight);

    const rim = new THREE.DirectionalLight(0xFFD4B2, 0.35);
    rim.position.set(-2, 3, -5);
    scene.add(rim);

    const bookRoot = new THREE.Group();
    scene.add(bookRoot);

    // Procedural textures
    function tex(c) {
      const t = new THREE.CanvasTexture(c);
      if (THREE.SRGBColorSpace) t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = ANISO;
      return t;
    }

    function noiseTexture(base, amp, scratches) {
      const s = 256,
        c = mkCanvas(s, s),
        x = c.getContext('2d');
      const img = x.createImageData(s, s),
        d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const v = base + (Math.random() - 0.5) * 2 * amp;
        d[i] = d[i + 1] = d[i + 2] = v;
        d[i + 3] = 255;
      }
      x.putImageData(img, 0, 0);
      if (scratches) {
        x.strokeStyle = 'rgba(200,200,200,.25)';
        x.lineWidth = 1;
        for (let i = 0; i < 5; i++) {
          x.beginPath();
          const y = Math.random() * s;
          x.moveTo(0, y);
          x.lineTo(s, y + (Math.random() - 0.5) * 22);
          x.stroke();
        }
      }
      return new THREE.CanvasTexture(c);
    }
    const laminateBump = noiseTexture(128, 10, true);

    const clothBump = (function () {
      const s = 128,
        c = mkCanvas(s, s),
        x = c.getContext('2d');
      x.fillStyle = '#808080';
      x.fillRect(0, 0, s, s);
      for (let i = 0; i < s; i += 2) {
        x.fillStyle = i % 4 === 0 ? 'rgba(255,255,255,.22)' : 'rgba(0,0,0,.22)';
        x.fillRect(i, 0, 1, s);
        x.fillRect(0, i, s, 1);
      }
      return new THREE.CanvasTexture(c);
    })();

    function striationTexture(vertical) {
      const s = 512,
        c = mkCanvas(s, s),
        x = c.getContext('2d');
      x.fillStyle = '#ece4d2';
      x.fillRect(0, 0, s, s);
      let p = 0;
      while (p < s) {
        const w = 1 + Math.random() * 2.4,
          tone = Math.random();
        x.fillStyle =
          tone < 0.12 ? 'rgba(140,125,95,.5)' : tone < 0.5 ? 'rgba(255,255,252,.55)' : 'rgba(190,178,150,.45)';
        if (vertical) x.fillRect(p, 0, w, s);
        else x.fillRect(0, p, s, w);
        p += w + 0.6 + Math.random() * 1.6;
      }
      for (let i = 0; i < 1800; i++) {
        x.fillStyle = 'rgba(120,108,84,' + (Math.random() * 0.1).toFixed(3) + ')';
        x.fillRect(Math.random() * s, Math.random() * s, 1.2, 1.2);
      }
      return tex(c);
    }
    const striV = striationTexture(true);
    const striH = striationTexture(false);

    const endpaperTex = (function () {
      const s = 512,
        c = mkCanvas(s, s),
        x = c.getContext('2d');
      x.fillStyle = '#f3edde';
      x.fillRect(0, 0, s, s);
      for (let i = 0; i < 1000; i++) {
        x.fillStyle = 'rgba(120,105,70,' + (0.04 + Math.random() * 0.08).toFixed(3) + ')';
        x.fillRect(Math.random() * s, Math.random() * s, 1.4, 1.4);
      }
      const g = x.createLinearGradient(0, 0, s, 0);
      g.addColorStop(0, 'rgba(0,0,0,.08)');
      g.addColorStop(0.15, 'rgba(0,0,0,0)');
      g.addColorStop(0.85, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,.08)');
      x.fillStyle = g;
      x.fillRect(0, 0, s, s);
      return tex(c);
    })();

    const blobTex = (function () {
      const s = 256,
        c = mkCanvas(s, s),
        x = c.getContext('2d');
      const g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      g.addColorStop(0, 'rgba(0,0,0,.75)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g;
      x.fillRect(0, 0, s, s);
      return new THREE.CanvasTexture(c);
    })();

    // Editorial Book Cover Painters
    function paintProjectFront(x, w, h, cfg) {
      // Background gradient
      const bg = cfg.spineBg || '#261812';
      const g = x.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, bg);
      g.addColorStop(1, '#140D0A');
      x.fillStyle = g;
      x.fillRect(0, 0, w, h);

      // Fine linen grain
      x.fillStyle = 'rgba(255,255,255,0.04)';
      for (let i = 0; i < 300; i++) x.fillRect(Math.random() * w, Math.random() * h, 2, 2);

      // Double gold/copper border
      x.strokeStyle = cfg.accent || '#C8653B';
      x.lineWidth = 4;
      x.strokeRect(60, 60, w - 120, h - 120);
      x.lineWidth = 1.5;
      x.strokeStyle = 'rgba(255,255,255,0.2)';
      x.strokeRect(74, 74, w - 148, h - 148);

      // Category Pill at top
      x.fillStyle = cfg.accent || '#C8653B';
      rr(x, w / 2 - 130, 140, 260, 48, 24);
      x.fill();
      x.fillStyle = '#FFFFFF';
      x.font = "700 20px 'Space Mono', monospace";
      x.textAlign = 'center';
      x.fillText(cfg.badge, w / 2, 172);

      // Geometric crest / emblem
      x.strokeStyle = 'rgba(255,255,255,0.3)';
      x.lineWidth = 2;
      x.beginPath();
      x.arc(w / 2, 340, 80, 0, Math.PI * 2);
      x.stroke();
      x.beginPath();
      x.arc(w / 2, 340, 65, 0, Math.PI * 2);
      x.stroke();

      x.fillStyle = cfg.accent || '#C8653B';
      x.font = "800 48px 'Playfair Display', Georgia, serif";
      x.fillText(cfg.title.substring(0, 2), w / 2, 356);

      // Big Project Title
      x.fillStyle = '#FFFFFF';
      x.font = "800 82px 'Playfair Display', Georgia, serif";
      x.fillText(cfg.title, w / 2, 590);

      // Subtitle
      x.fillStyle = '#EAE5DB';
      x.font = "500 32px 'Plus Jakarta Sans', sans-serif";
      const subWords = cfg.subtitle.split(' ');
      let line = '';
      let curY = 670;
      subWords.forEach((word) => {
        const test = line ? line + ' ' + word : word;
        if (x.measureText(test).width > w - 240 && line) {
          x.fillText(line, w / 2, curY);
          line = word;
          curY += 44;
        } else line = test;
      });
      if (line) x.fillText(line, w / 2, curY);

      // Gold divider line
      x.fillStyle = cfg.accent || '#C8653B';
      x.fillRect(w / 2 - 60, curY + 40, 120, 3);

      // Author / Tech at bottom
      x.fillStyle = 'rgba(255,255,255,0.85)';
      x.font = "600 24px 'Space Mono', monospace";
      x.fillText(cfg.author, w / 2, h - 180);

      x.fillStyle = cfg.accent || '#C8653B';
      x.font = "700 20px 'Space Mono', monospace";
      x.fillText(`ENGINEERED BY ADITYA RAJPUT • ${cfg.year}`, w / 2, h - 130);
    }

    function paintBack(x, w, h, cfg) {
      x.fillStyle = cfg.backBg || '#261812';
      x.fillRect(0, 0, w, h);
      const ink = cfg.backInk || '255,255,255';

      // Header on back
      x.fillStyle = 'rgba(' + ink + ',.7)';
      x.font = "700 24px 'Space Mono', monospace";
      x.textAlign = 'center';
      x.fillText("PRODUCTION ARCHITECTURE", w / 2, 170);

      x.fillStyle = cfg.accent || '#C8653B';
      x.fillRect(w / 2 - 50, 195, 100, 3);

      // Synopsis preview lines
      x.fillStyle = 'rgba(' + ink + ',.35)';
      for (let i = 0; i < 8; i++) {
        const lw = i === 7 ? w - 460 : w - 260 - (i % 2) * 60;
        rr(x, 130, 260 + i * 46, lw, 14, 7);
        x.fill();
      }

      // Chip emblem
      x.fillStyle = 'rgba(' + ink + ',.3)';
      x.beginPath();
      x.arc(w / 2, h - 360, 36, 0, 6.2832);
      x.fill();

      // Barcode box
      x.fillStyle = '#FFFFFF';
      rr(x, w - 320, h - 230, 220, 120, 8);
      x.fill();

      x.fillStyle = '#111111';
      let bx = w - 300;
      while (bx < w - 120) {
        const bw = 2 + Math.random() * 5;
        if (Math.random() > 0.38) x.fillRect(bx, h - 215, bw, 70);
        bx += bw + 2 + Math.random() * 4;
      }
      x.font = '500 16px Arial';
      x.textAlign = 'center';
      x.fillText('ADITYA • CSE • 2026', w - 210, h - 122);
    }

    function paintSpine(x, w, h, cfg) {
      x.fillStyle = cfg.spineBg || '#261812';
      x.fillRect(0, 0, w, h);

      // Gold headbands
      x.fillStyle = cfg.accent || '#C8653B';
      x.fillRect(0, 0, w, 22);
      x.fillRect(0, h - 22, w, 22);

      x.save();
      x.translate(w / 2, h / 2);
      x.rotate(Math.PI / 2);
      x.fillStyle = cfg.spineInk || '#FFFFFF';
      x.font = cfg.spineFont || "700 40px 'Playfair Display', Georgia";
      drawSpaced(x, cfg.title.toUpperCase(), -h * 0.08, 14, 8);

      x.globalAlpha = 0.85;
      x.fillStyle = cfg.accent || '#C8653B';
      x.font = "600 24px 'Space Mono', monospace";
      drawSpaced(x, "ADITYA RAJPUT", h * 0.34, 8, 4);
      x.globalAlpha = 1;
      x.restore();

      x.fillStyle = cfg.accent || '#C8653B';
      x.fillRect(w / 2 - 20, 80, 40, 3);
      x.fillRect(w / 2 - 20, h - 80, 40, 3);
    }

    function trimToWidth(x, text, maxW) {
      if (x.measureText(text).width <= maxW) return text;
      let t = text;
      while (t.length > 1 && x.measureText(t + '...').width > maxW) t = t.slice(0, -1);
      return t + '...';
    }

    function makeIndexPageTex(cfg) {
      const w = 1024,
        h = 1536,
        c = mkCanvas(w, h),
        x = c.getContext('2d');
      x.fillStyle = '#F5F2EC';
      x.fillRect(0, 0, w, h);

      // Grain
      x.fillStyle = 'rgba(130,110,80,0.06)';
      for (let i = 0; i < 1500; i++) x.fillRect(Math.random() * w, Math.random() * h, 1.2, 1.2);

      x.fillStyle = '#261812';
      x.textAlign = 'center';
      x.font = "800 76px 'Playfair Display', Georgia, serif";
      x.fillText('ARCHITECTURE', w / 2, 180);

      x.fillStyle = cfg.accent || '#C8653B';
      x.fillRect(w / 2 - 120, 215, 240, 3);

      x.fillStyle = '#70685F';
      x.font = "600 22px 'Space Mono', monospace";
      x.fillText(cfg.title + ' — MODULE BREAKDOWN', w / 2, 260);

      const list = cfg.chapters || [
        'Architecture Overview',
        'Backend Data Pipeline',
        'API & Auth Integration',
        'Performance & Latency',
        'Deployment & Verification'
      ];

      x.textAlign = 'left';
      x.font = "600 42px 'Plus Jakarta Sans', sans-serif";
      let y = 380;
      for (let i = 0; i < list.length; i++) {
        const n = String(i + 1).padStart(2, '0');
        const pageNo = String(10 + i * 15).padStart(3, ' ');
        const left = n + '. ' + trimToWidth(x, list[i], 620);

        x.fillStyle = '#261812';
        x.fillText(left, 140, y);

        x.textAlign = 'right';
        x.fillStyle = cfg.accent || '#C8653B';
        x.font = "700 36px 'Space Mono', monospace";
        x.fillText('P.' + pageNo.trim(), w - 140, y);

        x.textAlign = 'left';
        x.font = "600 42px 'Plus Jakarta Sans', sans-serif";

        x.fillStyle = 'rgba(38,24,18,0.12)';
        x.fillRect(140, y + 18, w - 280, 1.5);
        y += 120;
      }
      return tex(c);
    }

    // Geometry parameters
    const W = 1.42,
      H = 2.14,
      T = 0.34,
      CT = 0.032,
      OV = 0.05;
    const PAGE_N = lowPowerDevice ? 5 : 8,
      BACK_PAGE_N = lowPowerDevice ? 3 : 5,
      PW = W - 0.02,
      PH = H - 0.02;
    const BLOCK_D = 0.245,
      BLOCK_Z = -0.0205,
      PIVOT_Z = T / 2 + CT / 2,
      BPIVOT_Z = -(T / 2 + CT / 2),
      HINGE_OVERLAP = 0.05;

    const coverGeo = new THREE.BoxGeometry(W + OV, H + OV * 2, CT);
    const blockGeo = new THREE.BoxGeometry(W - 0.015, H, BLOCK_D);
    const pageGeo = new THREE.PlaneGeometry(PW, PH);
    const spineGeo = new THREE.BoxGeometry(0.028, H + OV * 2, T + CT * 2 + 0.006);
    const hitGeo = new THREE.BoxGeometry(1.85, 2.55, 1.2);
    const blobGeo = new THREE.PlaneGeometry(1, 1);
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });

    function std(o) {
      return new THREE.MeshStandardMaterial(Object.assign({ metalness: 0.02 }, o));
    }

    const paperFlat = std({ color: 0xF5F2EC, roughness: 0.95, envMapIntensity: 0.2 });
    const striMatV = std({ map: striV, bumpMap: striV, bumpScale: 0.0025, roughness: 0.95, envMapIntensity: 0.2 });
    const striMatH = std({ map: striH, bumpMap: striH, bumpScale: 0.0025, roughness: 0.95, envMapIntensity: 0.2 });
    const endpaperMat = std({ map: endpaperTex, roughness: 0.9, envMapIntensity: 0.25 });
    const pageMats = [0xF5F2EC, 0xEAE5DB, 0xF8F6F0].map((c) =>
      std({ color: c, roughness: 0.92, envMapIntensity: 0.22, side: THREE.DoubleSide })
    );

    const bookInstances = [];
    const hitMeshes = [];

    function buildBook(cfg, index) {
      const rootG = new THREE.Group();
      const float = new THREE.Group();
      rootG.add(float);
      bookRoot.add(rootG);

      const indexPageMat = std({
        map: makeIndexPageTex(cfg),
        roughness: 0.92,
        envMapIntensity: 0.2,
        side: THREE.DoubleSide
      });

      const edgeColor = cfg.edge || '#EAE5DB';
      const mEdge = std({ color: edgeColor, bumpMap: laminateBump, bumpScale: 0.0035, roughness: 0.68, envMapIntensity: 0.3 });

      // Front cover texture
      const cFront = mkCanvas(1024, 1536);
      paintProjectFront(cFront.getContext('2d'), 1024, 1536, cfg);
      const mFront = std({ map: tex(cFront), bumpMap: laminateBump, bumpScale: 0.0035, roughness: 0.52, envMapIntensity: 0.3 });

      // Back cover texture
      const cBack = mkCanvas(1024, 1536);
      paintBack(cBack.getContext('2d'), 1024, 1536, cfg);
      const mBack = std({ map: tex(cBack), bumpMap: laminateBump, bumpScale: 0.0035, roughness: 0.58, envMapIntensity: 0.26 });

      // Spine texture
      const cSpine = mkCanvas(220, 1536);
      paintSpine(cSpine.getContext('2d'), 220, 1536, cfg);
      const mSpine = std({ map: tex(cSpine), bumpMap: clothBump, bumpScale: 0.006, roughness: 0.78, envMapIntensity: 0.22 });

      // Back cover pivot
      const backPivot = new THREE.Group();
      backPivot.position.set(-W / 2 - HINGE_OVERLAP, 0, BPIVOT_Z);
      const backMesh = new THREE.Mesh(coverGeo, [mEdge, mEdge, mEdge, mEdge, endpaperMat, mBack]);
      backMesh.position.x = (W + OV) / 2;
      backMesh.castShadow = backMesh.receiveShadow = true;
      backPivot.add(backMesh);
      float.add(backPivot);

      // Front cover pivot
      const pivot = new THREE.Group();
      pivot.position.set(-W / 2 - HINGE_OVERLAP, 0, PIVOT_Z);
      const frontMesh = new THREE.Mesh(coverGeo, [mEdge, mEdge, mEdge, mEdge, mFront, endpaperMat]);
      frontMesh.position.x = (W + OV) / 2;
      frontMesh.castShadow = frontMesh.receiveShadow = true;
      pivot.add(frontMesh);
      float.add(pivot);

      // Spine
      const spine = new THREE.Mesh(spineGeo, mSpine);
      spine.position.set(-W / 2 - 0.013, 0, 0);
      spine.castShadow = true;
      float.add(spine);

      // Block
      const block = new THREE.Mesh(blockGeo, [striMatV, paperFlat, striMatH, striMatH, paperFlat, paperFlat]);
      block.position.set(-0.0075, 0, BLOCK_Z);
      block.castShadow = block.receiveShadow = true;
      float.add(block);

      // Pages
      const pages = [],
        pageF = [];
      for (let i = 0; i < PAGE_N; i++) {
        const pp = new THREE.Group();
        pp.position.set(-W / 2 + 0.01, (Math.random() - 0.5) * 0.006, 0.166 - i * 0.0042);
        const pm = new THREE.Mesh(pageGeo, i === 0 ? indexPageMat : pageMats[i % 3]);
        pm.position.x = PW / 2;
        pm.rotation.z = (Math.random() - 0.5) * 0.006;
        pp.add(pm);
        float.add(pp);
        pages.push(pp);
        pageF.push(0.3 * Math.pow(1 - i / PAGE_N, 2.6));
      }

      const pagesB = [],
        pageFB = [];
      for (let i = 0; i < BACK_PAGE_N; i++) {
        const pp = new THREE.Group();
        pp.position.set(-W / 2 + 0.01, (Math.random() - 0.5) * 0.006, -0.166 + i * 0.0042);
        const pm = new THREE.Mesh(pageGeo, pageMats[i % 3]);
        pm.position.x = PW / 2;
        pm.rotation.z = (Math.random() - 0.5) * 0.006;
        pp.add(pm);
        float.add(pp);
        pagesB.push(pp);
        pageFB.push(0.3 * Math.pow(1 - i / BACK_PAGE_N, 2.6));
      }

      // Soft contact shadow blob
      const blob = new THREE.Mesh(
        blobGeo,
        new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, opacity: 0.55, depthWrite: false })
      );
      blob.scale.set(3.1, 3.9, 1);
      blob.position.set(0.1, -0.3, -0.85);
      blob.renderOrder = -5;
      rootG.add(blob);

      // Raycast hit mesh
      const hit = new THREE.Mesh(hitGeo, hitMat);
      float.add(hit);
      hitMeshes.push(hit);

      const springs = {
        px: new Spring(0, 18, 6.8),
        py: new Spring(0, 18, 6.8),
        pz: new Spring(0, 18, 6.8),
        rx: new Spring(0, 18, 6.8),
        ry: new Spring(0, 18, 6.8),
        rz: new Spring(0, 18, 6.8),
        sc: new Spring(1, 18, 6.8),
        tiltX: new Spring(0, 120, 13),
        tiltY: new Spring(0, 120, 13),
        lift: new Spring(0, 120, 13),
        cover: new Spring(0, 90, 12),
        coverB: new Spring(0, 90, 12),
        drag: new Spring(0, 160, 16),
      };

      const b = {
        cfg,
        index,
        root: rootG,
        float,
        pivot,
        backPivot,
        frontMesh,
        spine,
        block,
        pages,
        pageF,
        pagesB,
        pageFB,
        hit,
        springs,
        phase: Math.random() * 6.28,
        slotScale: 1,
        hitEdge: null,
        scr: { x: 0, y: 0 },
        orbY: 0,
        orbYv: 0,
        orbPhase: 'idle',
        orbTarget: 0,
        orbXs: new Spring(0, 60, 12),
        exit: null,
      };
      bookInstances.push(b);
      return b;
    }

    PROJECTS_DATA.forEach(buildBook);
    const bookByHit = (m) => bookInstances.find((b) => b.hit === m);

    // Floating particles / leaves in detail view
    const leaves = {
      items: [],
      anchor: null,
      activate(book) {
        this.anchor = book;
        this.items.forEach((l) => {
          l.kick.set(-l.hx + (Math.random() - 0.5) * 0.6, -l.hy + (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.5);
          l.s.t = l.size;
          l.mesh.visible = true;
        });
      },
      deactivate() {
        this.items.forEach((l) => {
          l.s.t = 0;
        });
      },
      push(dx, dy) {
        if (!this.anchor) return;
        this.items.forEach((l) => {
          l.kick.x += dx * 2.4 * Math.random();
          l.kick.y += -dy * 2.4 * Math.random();
        });
      },
      update(dt, t) {
        if (!this.anchor) return;
        const ap = this.anchor.root.position;
        const w = RM ? 0.15 : 1;
        this.items.forEach((l) => {
          l.kick.multiplyScalar(Math.exp(-1.15 * dt));
          l.mesh.position.set(
            ap.x + l.hx + Math.sin(t * l.sp + l.ph) * 0.4 * w + l.kick.x,
            ap.y + l.hy + Math.cos(t * l.sp * 0.83 + l.ph * 1.3) * 0.3 * w + l.kick.y,
            ap.z * 0.4 + l.hz + l.kick.z
          );
          l.mesh.rotation.x += l.rv.x * dt * (0.3 + w);
          l.mesh.rotation.y += l.rv.y * dt * (0.3 + w);
          l.mesh.rotation.z += l.rv.z * dt * (0.3 + w);
          const s = l.s.update(dt);
          l.mesh.scale.setScalar(Math.max(s, 0.0001));
          if (l.s.t === 0 && s < 0.01) l.mesh.visible = false;
        });
      },
    };

    (function buildLeaves() {
      const shape = new THREE.Shape();
      shape.moveTo(0, -0.5);
      shape.bezierCurveTo(0.3, -0.28, 0.3, 0.22, 0, 0.55);
      shape.bezierCurveTo(-0.3, 0.22, -0.3, -0.28, 0, -0.5);
      const geo = new THREE.ShapeGeometry(shape, 10);
      const cols = [0xC8653B, 0xE0784B, 0xD97706, 0x3E2920];
      for (let i = 0; i < 16; i++) {
        const mat = std({ color: cols[i % 4], roughness: 0.55, envMapIntensity: 0.3, side: THREE.DoubleSide });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.visible = false;
        bookRoot.add(mesh);
        let hx = (Math.random() - 0.5) * 4.6;
        if (i % 5 === 0) hx += 2.8 * Math.sign(hx || 1);
        leaves.items.push({
          mesh,
          hx,
          hy: (Math.random() - 0.5) * 3.2,
          hz: -0.5 + Math.random() * 1.5,
          sp: 0.25 + Math.random() * 0.5,
          ph: Math.random() * 6.28,
          rv: new THREE.Vector3((Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.8),
          kick: new THREE.Vector3(),
          size: 0.14 + Math.random() * 0.16,
          s: new Spring(0, 60, 10),
        });
      }
    })();

    // State machine
    const state = {
      mode: 'hero', // 'hero' | 'opening' | 'detail' | 'closing'
      selected: null,
      hovered: null,
      kbIndex: -1
    };

    const SLOTS = { hero: [], detail: null, portrait: false };

    function computeSlots() {
      const a = dims.w / Math.max(1, dims.h);
      const portrait = a < 0.85;
      const fit = portrait ? clamp(a / 1.08, 0.38, 0.74) : clamp(a / 1.62, 0.52, 1);
      bookRoot.scale.setScalar(fit);
      bookRoot.position.y = -(1 - fit) * 0.28;
      SLOTS.portrait = portrait;

      SLOTS.hero = portrait
        ? [
            { p: [-1.36, -0.58, -0.12], r: [-0.045, 0.4, 0.185], s: 1.25 },
            { p: [0.2, -0.22, 0.6], r: [-0.05, -0.1, -0.035], s: 1.35 },
            { p: [1.62, -0.62, -0.34], r: [-0.045, -0.42, -0.17], s: 1.25 },
          ]
        : [
            { p: [-2.05, -0.58, -0.12], r: [-0.045, 0.4, 0.185], s: 1.22 },
            { p: [0.25, -0.36, 0.6], r: [-0.05, -0.1, -0.035], s: 1.32 },
            { p: [2.15, -0.62, -0.34], r: [-0.045, -0.42, -0.17], s: 1.22 },
          ];

      SLOTS.detail = portrait
        ? { p: [0, 0.75, 1.25], r: [0, 0, 0], s: 1.15 }
        : { p: [-1.45, -0.05, 1.35], r: [0, 0.02, 0], s: 1.3 };
    }

    function applyMode() {
      computeSlots();
      if (state.mode === 'hero') {
        bookInstances.forEach((b, i) => {
          const s = SLOTS.hero[i] || SLOTS.hero[1];
          b.slotScale = s.s;
          b.springs.px.t = s.p[0];
          b.springs.py.t = s.p[1];
          b.springs.pz.t = s.p[2];
          b.springs.rx.t = s.r[0];
          b.springs.ry.t = s.r[1];
          b.springs.rz.t = s.r[2];
          b.springs.sc.t = s.s;
          b.root.visible = true;
        });
      } else if (state.mode === 'opening' || state.mode === 'detail') {
        const b = state.selected;
        if (!b) return;
        const s = SLOTS.detail;
        b.slotScale = s.s;
        b.springs.px.t = s.p[0];
        b.springs.py.t = s.p[1];
        b.springs.pz.t = s.p[2];
        b.springs.rx.t = s.r[0];
        b.springs.ry.t = s.r[1];
        b.springs.rz.t = s.r[2];
        b.springs.sc.t = s.s;
      }
    }

    const camSprings = {
      x: new Spring(0, 18, 7),
      y: new Spring(0.1, 18, 7),
      z: new Spring(9.6, 18, 7),
      lx: new Spring(0, 18, 7),
      ly: new Spring(0, 18, 7),
      lz: new Spring(0, 18, 7),
    };

    function camTo(mode) {
      if (mode === 'hero') {
        camSprings.x.t = 0;
        camSprings.y.t = 0.1;
        camSprings.z.t = 9.6;
        camSprings.lx.t = 0;
        camSprings.ly.t = 0;
        camSprings.lz.t = 0;
      } else {
        camSprings.x.t = SLOTS.portrait ? 0 : -0.2;
        camSprings.y.t = SLOTS.portrait ? 0.35 : 0.05;
        camSprings.z.t = 9.2;
        camSprings.lx.t = SLOTS.portrait ? 0 : -0.2;
        camSprings.ly.t = SLOTS.portrait ? 0.35 : 0;
        camSprings.lz.t = 0;
      }
    }

    function sendOut(b, slotIdx, delay) {
      const exitDir = slotIdx === 0 ? -1 : 1;
      const arcSign = slotIdx === 0 ? 1 : -1;
      setT(() => {
        b.exit = {
          segs: [
            {
              p0: [b.springs.px.v, b.springs.py.v, b.springs.pz.v],
              p1: [b.springs.px.v + exitDir * 0.9, b.springs.py.v + 0.5, b.springs.pz.v - 0.4],
              p2: [b.springs.px.v + exitDir * 2.8, b.springs.py.v + 1.2, b.springs.pz.v - 1.2],
              p3: [b.springs.px.v + exitDir * 5.2, b.springs.py.v + 2.0, b.springs.pz.v - 2.8],
              dur: 0.95,
              rZ: arcSign * 0.35,
              sc: 0.45,
            },
          ],
          i: 0,
          t: 0,
        };
      }, delay * 1000);
    }

    function bringBack(b, slotIdx, delay) {
      b.root.visible = true;
      const s = SLOTS.hero[slotIdx] || SLOTS.hero[1];
      const enterDir = slotIdx === 0 ? -1 : 1;
      setT(() => {
        b.springs.px.set(s.p[0] + enterDir * 3.5);
        b.springs.py.set(s.p[1] + 1.2);
        b.springs.pz.set(s.p[2] - 1.5);
        b.springs.sc.set(0.6);
        b.slotScale = s.s;
        b.springs.px.t = s.p[0];
        b.springs.py.t = s.p[1];
        b.springs.pz.t = s.p[2];
        b.springs.rx.t = s.r[0];
        b.springs.ry.t = s.r[1];
        b.springs.rz.t = s.r[2];
        b.springs.sc.t = s.s;
        b.exit = null;
      }, delay * 1000);
    }

    // Detail Panel DOM Elements
    const dpPanel = document.getElementById('booksDetailPanel');
    const dpCategory = document.getElementById('bsDpCategory');
    const dpTitle = document.getElementById('bsDpTitle');
    const dpDesc = document.getElementById('bsDpDesc');
    const dpAuthor = document.getElementById('bsDpAuthor');
    const dpYear = document.getElementById('bsDpYear');
    const dpTags = document.getElementById('bsDpTags');
    const dpGithub = document.getElementById('bsGithubBtn');
    const dpDemo = document.getElementById('bsDemoBtn');
    const openBtn = document.getElementById('booksOpenBtn');
    const closeBtn = document.getElementById('booksCloseBtn');

    function updateDetailUI(cfg) {
      if (!cfg) return;
      if (dpCategory) dpCategory.textContent = cfg.badge;
      if (dpTitle) dpTitle.textContent = cfg.title;
      if (dpDesc) dpDesc.textContent = cfg.desc;
      if (dpAuthor) dpAuthor.textContent = cfg.author;
      if (dpYear) dpYear.textContent = cfg.year;

      if (dpTags) {
        dpTags.innerHTML = '';
        (cfg.tags || []).forEach((tag) => {
          const s = document.createElement('span');
          s.className = 'bs-dp-tag';
          s.textContent = tag;
          dpTags.appendChild(s);
        });
      }

      if (dpGithub) {
        dpGithub.href = cfg.github || 'https://github.com/cryptobitter';
      }
      if (dpDemo) {
        dpDemo.href = cfg.demo || cfg.github;
      }
    }

    function open(book) {
      if (state.mode !== 'hero') return;
      state.mode = 'opening';
      state.selected = book;
      root.setAttribute('data-state', 'opening');

      updateDetailUI(book.cfg);
      computeSlots();

      let out = 0;
      bookInstances.forEach((b, i) => {
        if (b !== book) sendOut(b, i, out++ * 0.08);
      });

      setT(() => {
        if (state.mode !== 'opening' && state.mode !== 'detail') return;
        book.orbY = RM ? 0 : -6.2832;
        book.orbYv = RM ? 0 : 3;
        book.orbPhase = 'return';
        book.orbTarget = 0;
        book.orbXs.set(0);
        applyMode();
        camTo('detail');
      }, 760);

      setT(() => leaves.activate(book), 1000);

      setT(() => {
        if (state.mode === 'opening') {
          bookInstances.forEach((b) => {
            if (b !== book) {
              b.exit = null;
              b.root.visible = false;
            }
          });
          root.setAttribute('data-state', 'detail');
          state.mode = 'detail';
        }
      }, 1400);
    }

    function close() {
      if (state.mode !== 'detail') return;
      state.mode = 'closing';
      root.setAttribute('data-state', 'closing');
      leaves.deactivate();
      orbit.drag = false;

      const b = state.selected;
      if (b) {
        b.orbTarget = Math.round(b.orbY / 6.2832) * 6.2832 + 6.2832;
        b.orbYv = Math.max(b.orbYv, 3);
        b.orbPhase = 'return';
        b.orbXs.t = 0;
      }

      setT(() => {
        applyMode();
        camTo('hero');
        let back = 0;
        bookInstances.forEach((bk, i) => {
          if (bk !== b) bringBack(bk, i, 0.85 + back++ * 0.1);
        });
      }, 250);

      setT(() => {
        if (state.mode === 'closing') {
          state.mode = 'hero';
          root.setAttribute('data-state', 'hero');
          state.selected = null;
        }
      }, 1600);
    }

    if (closeBtn) closeBtn.addEventListener('click', close);
    if (openBtn) {
      openBtn.addEventListener('click', () => {
        if (state.hovered) open(state.hovered);
      });
    }

    // Input handlers
    const ptr = {
      ndcX: 0,
      ndcY: 0,
      cx: 0,
      cy: 0,
      lastX: 0,
      lastY: 0,
      down: false,
      downX: 0,
      downY: 0,
      moved: 0,
      t0: 0,
      seen: false,
      id: null,
    };
    let dragBook = null,
      rayBook = null;
    const orbit = { drag: false, dxAcc: 0, dyAcc: 0 };
    const ray = new THREE.Raycaster();
    const tmpV = new THREE.Vector3();

    canvasEl.addEventListener('contextmenu', (e) => e.preventDefault());

    const localXY = (e) => {
      const r = root.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };

    const onPointerMove = (e) => {
      if (ptr.id !== null && e.pointerId !== ptr.id) return;
      const { x: cx, y: cy } = localXY(e);
      const dxN = (cx - ptr.lastX) / dims.w;
      const dyN = (cy - ptr.lastY) / dims.h;
      ptr.lastX = cx;
      ptr.lastY = cy;
      ptr.cx = cx;
      ptr.cy = cy;
      ptr.ndcX = (cx / dims.w) * 2 - 1;
      ptr.ndcY = -(cy / dims.h) * 2 + 1;
      ptr.seen = true;

      if (state.mode === 'detail') leaves.push(dxN, dyN);

      if (ptr.down && dragBook) {
        ptr.moved += Math.abs(dxN * dims.w) + Math.abs(dyN * dims.h);
        dragBook.springs.drag.t = clamp(((ptr.downX - cx) / dims.w) * 3.4, 0, 1.0);
      }
      if (ptr.down && orbit.drag) {
        orbit.dxAcc += dxN;
        orbit.dyAcc += dyN;
        ptr.moved += Math.abs(dxN * dims.w) + Math.abs(dyN * dims.h);
      }
    };
    canvasEl.addEventListener('pointermove', onPointerMove);

    const onPointerDown = (e) => {
      if (ptr.id !== null) return;
      ptr.id = e.pointerId;
      const { x: cx, y: cy } = localXY(e);
      ptr.cx = cx;
      ptr.cy = cy;
      ptr.lastX = cx;
      ptr.lastY = cy;
      ptr.ndcX = (cx / dims.w) * 2 - 1;
      ptr.ndcY = -(cy / dims.h) * 2 + 1;
      ptr.seen = true;

      castRay();
      if (state.mode === 'hero' && rayBook) {
        ptr.down = true;
        dragBook = rayBook;
        ptr.downX = cx;
        ptr.downY = cy;
        ptr.moved = 0;
        ptr.t0 = performance.now();
        canvasEl.setPointerCapture(e.pointerId);
      } else if (state.mode === 'detail' && rayBook === state.selected) {
        ptr.down = true;
        orbit.drag = true;
        orbit.dxAcc = 0;
        orbit.dyAcc = 0;
        ptr.moved = 0;
        ptr.t0 = performance.now();
        canvasEl.setPointerCapture(e.pointerId);
      }
    };
    canvasEl.addEventListener('pointerdown', onPointerDown);

    const onPointerUp = (e) => {
      if (ptr.id !== null && e.pointerId !== ptr.id) return;
      ptr.id = null;
      orbit.drag = false;
      if (dragBook) {
        const slop = 14;
        const wasDrag = ptr.moved > slop;
        dragBook.springs.drag.t = 0;
        if (!wasDrag && state.mode === 'hero' && performance.now() - ptr.t0 < 550) {
          open(dragBook);
        }
        dragBook = null;
      }
      ptr.down = false;
    };
    window.addEventListener('pointerup', onPointerUp);

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && state.mode === 'detail') close();
    });

    function castRay() {
      ray.setFromCamera({ x: ptr.ndcX, y: ptr.ndcY }, camera);
      const hits = ray.intersectObjects(hitMeshes, false);
      if (hits.length) {
        rayBook = bookByHit(hits[0].object);
        const lp = rayBook.hit.worldToLocal(hits[0].point.clone());
        rayBook.hitEdge = clamp((lp.x / 0.9) * 0.5 + 0.5, 0, 1);
      } else {
        rayBook = null;
      }
    }

    function screenPos(b) {
      b.root.getWorldPosition(tmpV).project(camera);
      b.scr.x = (tmpV.x * 0.5 + 0.5) * dims.w;
      b.scr.y = (-tmpV.y * 0.5 + 0.5) * dims.h;
    }

    const clock = new THREE.Clock();
    const idle = RM ? 0 : 1;
    const DETAIL_OPEN_ANGLE = 0.88;
    const DETAIL_OPEN_SWAY = 0.035;

    function tickBook(b, dt, t) {
      const s = b.springs;
      const isHov = state.hovered === b;
      const inDetail = state.mode === 'detail' && state.selected === b;
      const orbitActive = state.selected === b && state.mode !== 'hero';

      if (orbitActive) {
        if (orbit.drag && inDetail) {
          const step = orbit.dxAcc * 6.5;
          orbit.dxAcc = 0;
          b.orbY += step;
          b.orbYv = clamp(b.orbYv * 0.5 + (step / Math.max(dt, 0.001)) * 0.5, -14, 14);
          b.orbXs.t = clamp(b.orbXs.t + orbit.dyAcc * 3.2, -0.55, 0.55);
          orbit.dyAcc = 0;
          b.orbPhase = 'drag';
        } else {
          b.orbXs.t = 0;
          if (b.orbPhase === 'drag') {
            if (Math.abs(b.orbYv) > 0.6) b.orbPhase = 'spin';
            else {
              b.orbPhase = 'return';
              b.orbTarget = Math.round((b.orbY + b.orbYv * 1.2) / Math.PI) * Math.PI;
            }
          }
          if (b.orbPhase === 'spin') {
            b.orbYv *= Math.exp(-0.9 * dt);
            b.orbY += b.orbYv * dt;
            if (Math.abs(b.orbYv) < 0.5) {
              b.orbPhase = 'return';
              b.orbTarget = Math.round((b.orbY + b.orbYv * 1.2) / Math.PI) * Math.PI;
            }
          } else if (b.orbPhase === 'return') {
            const acc = 16 * (b.orbTarget - b.orbY) - 8 * b.orbYv;
            b.orbYv += acc * dt;
            b.orbY += b.orbYv * dt;
            if (Math.abs(b.orbTarget - b.orbY) < 0.002 && Math.abs(b.orbYv) < 0.01) {
              b.orbY = b.orbTarget;
              b.orbYv = 0;
              b.orbPhase = 'idle';
            }
          }
        }
      }
      b.orbXs.update(dt);

      let coverBase = 0;
      if (inDetail) coverBase = DETAIL_OPEN_ANGLE + Math.sin(t * 0.8 + b.phase) * DETAIL_OPEN_SWAY * idle;
      const fan = orbitActive ? clamp(b.orbYv * 0.16, 0, 0.75) : 0;
      const fanB = orbitActive ? clamp(-b.orbYv * 0.16, 0, 0.75) : 0;
      let coverBBase = 0;
      if (inDetail) coverBBase = 0.2 + Math.sin(t * 0.8 + b.phase + 1.7) * 0.02 * idle;

      if (isHov && ptr.seen && state.mode === 'hero') {
        const dxN = (ptr.cx - b.scr.x) / (dims.w * 0.25);
        const dyN = (b.scr.y - ptr.cy) / (dims.h * 0.3);
        s.tiltY.t = clamp(dxN * 0.28, -0.15, 0.15);
        s.tiltX.t = clamp(-dyN * 0.1, -0.09, 0.1);
        s.lift.t = 0.3;
        coverBase = 0;
      } else {
        s.tiltY.t = 0;
        s.tiltX.t = 0;
        s.lift.t = 0;
      }
      s.cover.t = coverBase + fan;
      s.coverB.t = coverBBase + fanB;
      s.sc.t = b.slotScale * (isHov && state.mode === 'hero' ? 1.09 : 1);

      Object.values(s).forEach((sp) => sp.update(dt));

      if (b.exit) {
        const ex = b.exit;
        const seg = ex.segs[ex.i];
        ex.t += dt / seg.dur;
        const u = clamp(ex.t, 0, 1);
        const e = u * u * (3 - 2 * u);
        const inv = 1 - e;
        const px = inv * inv * inv * seg.p0[0] + 3 * inv * inv * e * seg.p1[0] + 3 * inv * e * e * seg.p2[0] + e * e * e * seg.p3[0];
        const py = inv * inv * inv * seg.p0[1] + 3 * inv * inv * e * seg.p1[1] + 3 * inv * e * e * seg.p2[1] + e * e * e * seg.p3[1];
        const pz = inv * inv * inv * seg.p0[2] + 3 * inv * inv * e * seg.p1[2] + 3 * inv * e * e * seg.p2[2] + e * e * e * seg.p3[2];
        b.root.position.set(px, py, pz);
        b.root.rotation.z = s.rz.v + seg.rZ * e;
        const sc = s.sc.v * (1 - (1 - seg.sc) * e);
        b.root.scale.setScalar(Math.max(sc, 0.0001));
        if (u >= 1) {
          ex.i++;
          ex.t = 0;
          if (ex.i >= ex.segs.length) {
            b.exit = null;
            b.root.visible = false;
          }
        }
      } else {
        b.root.position.set(s.px.v, s.py.v, s.pz.v);
        b.root.rotation.set(s.rx.v, s.ry.v, s.rz.v);
        b.root.scale.setScalar(s.sc.v);
      }

      const idleFloat = inDetail
        ? 0
        : Math.sin(t * 1.05 + b.phase) * 0.035 * idle;
      b.float.position.set(0, s.lift.v + idleFloat, 0);

      if (orbitActive) {
        b.float.rotation.set(b.orbXs.v, b.orbY, 0);
      } else {
        b.float.rotation.set(s.tiltX.v, s.tiltY.v, 0);
      }

      b.pivot.rotation.y = -s.cover.v;
      b.backPivot.rotation.y = s.coverB.v;

      const peel = inDetail ? s.cover.v / DETAIL_OPEN_ANGLE : s.cover.v;
      b.pages.forEach((pp, i) => {
        pp.rotation.y = -peel * b.pageF[i];
      });
      b.pagesB.forEach((pp, i) => {
        pp.rotation.y = s.coverB.v * b.pageFB[i];
      });
    }

    // Resize observer
    function onResize() {
      dims.w = root.clientWidth || 1000;
      dims.h = root.clientHeight || 680;
      camera.aspect = dims.w / dims.h;
      camera.updateProjectionMatrix();
      renderer.setSize(dims.w, dims.h, false);
      computeSlots();
      applyMode();
    }
    const ro = new ResizeObserver(onResize);
    ro.observe(root);
    onResize();

    // Render loop
    function animate() {
      if (cancelled) return;
      requestAnimationFrame(animate);

      const dt = Math.min(clock.getDelta(), 0.1);
      const t = clock.getElapsedTime();

      if (state.mode === 'hero') {
        castRay();
        state.hovered = rayBook;
        if (state.hovered && openBtn) {
          screenPos(state.hovered);
          openBtn.style.opacity = '1';
          openBtn.style.transform = `translate(${state.hovered.scr.x - 70}px, ${state.hovered.scr.y + 110}px) scale(1)`;
          openBtn.style.pointerEvents = 'auto';
        } else if (openBtn) {
          openBtn.style.opacity = '0';
          openBtn.style.pointerEvents = 'none';
        }
      } else if (openBtn) {
        openBtn.style.opacity = '0';
        openBtn.style.pointerEvents = 'none';
      }

      bookInstances.forEach((b) => {
        screenPos(b);
        tickBook(b, dt, t);
      });

      leaves.update(dt, t);

      ['x', 'y', 'z', 'lx', 'ly', 'lz'].forEach((k) => camSprings[k].update(dt));
      camera.position.set(camSprings.x.v, camSprings.y.v, camSprings.z.v);
      camera.lookAt(camSprings.lx.v, camSprings.ly.v, camSprings.lz.v);

      renderer.render(scene, camera);
    }
    animate();
  }

  // Auto-init when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBooksShowcase);
  } else {
    initBooksShowcase();
  }
})();
