// =============================================
// CUSTOM CURSOR
// =============================================
const cursorDot = document.getElementById('cursorDot');
const cursorRing = document.getElementById('cursorRing');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let mouseX = 0, mouseY = 0;
let ringX = 0, ringY = 0;

if (cursorDot && cursorRing && !reduceMotion) {
  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    cursorDot.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`;
  });

  // Ring follows with lag
  function animateRing() {
    ringX += (mouseX - ringX) * 0.12;
    ringY += (mouseY - ringY) * 0.12;
    cursorRing.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
    requestAnimationFrame(animateRing);
  }
  animateRing();

  // Cursor grows on hover of interactive elements
  document.querySelectorAll('a, button, .proj, .skill-tab, .skill-item-card').forEach(el => {
    el.addEventListener('mouseenter', () => {
      cursorDot.style.width = '24px';
      cursorDot.style.height = '24px';
      cursorDot.style.opacity = '0.6';
      cursorRing.style.width = '50px';
      cursorRing.style.height = '50px';
      cursorRing.style.borderColor = 'rgba(0,212,255,0.7)';
    });
    el.addEventListener('mouseleave', () => {
      cursorDot.style.width = '16px';
      cursorDot.style.height = '16px';
      cursorDot.style.opacity = '1';
      cursorRing.style.width = '36px';
      cursorRing.style.height = '36px';
      cursorRing.style.borderColor = 'rgba(0,212,255,0.4)';
    });
  });
}

// =============================================
// BOOT SEQUENCE
// =============================================
const bootEl = document.getElementById('boot');
const heroMain = document.getElementById('heroMain');

const bootLines = [
  'initializing profile...',
  'loading experience... done',
  'loading projects[7]... done',
  'status: 200 OK',
];

function runBoot() {
  if (!heroMain) return;
  if (reduceMotion || !bootEl) {
    heroMain.classList.add('show');
    return;
  }
  let i = 0;
  const interval = setInterval(() => {
    if (i >= bootLines.length) {
      clearInterval(interval);
      setTimeout(() => heroMain.classList.add('show'), 150);
      return;
    }
    const p = document.createElement('p');
    p.textContent = bootLines[i];
    if (bootLines[i].includes('200 OK')) p.classList.add('ok');
    bootEl.appendChild(p);
    i++;
  }, 180);
}
// Fallback if boot sequence hangs
setTimeout(() => {
  if (heroMain && !heroMain.classList.contains('show')) {
    heroMain.classList.add('show');
  }
}, 1200);

runBoot();

// =============================================
// TYPEWRITER
// =============================================
const typeTarget = document.getElementById('typeTarget');
const typeStrings = [
  'echo "let\'s build something"',
  'curl -X POST /contact',
  'git commit -m "ship it"',
];

function typeLoop() {
  if (reduceMotion || !typeTarget) return;
  let stringIndex = 0, charIndex = 0, deleting = false;

  function tick() {
    const current = typeStrings[stringIndex];
    if (!deleting) {
      charIndex++;
      typeTarget.textContent = current.slice(0, charIndex);
      if (charIndex === current.length) {
        deleting = true;
        setTimeout(tick, 1400);
        return;
      }
    } else {
      charIndex--;
      typeTarget.textContent = current.slice(0, charIndex);
      if (charIndex === 0) {
        deleting = false;
        stringIndex = (stringIndex + 1) % typeStrings.length;
      }
    }
    setTimeout(tick, deleting ? 28 : 52);
  }
  tick();
}

// Trigger typewriter when whoami is visible
const whoamiSection = document.getElementById('whoami');
if (whoamiSection) {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) { typeLoop(); obs.disconnect(); }
    });
  }, { threshold: 0.3 });
  obs.observe(whoamiSection);
}

// =============================================
// MOBILE NAV
// =============================================
const navToggle = document.getElementById('navToggle');
const navLinks = document.querySelector('.nav-links');
if (navToggle && navLinks) {
  navToggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    navToggle.classList.toggle('open', isOpen);
    navToggle.setAttribute('aria-expanded', isOpen);
  });
  navLinks.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      navLinks.classList.remove('open');
      navToggle.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

// =============================================
// CONTACT FORM -> MAILTO
// =============================================
const contactForm = document.getElementById('contactForm');
const formNote = document.getElementById('formNote');
if (contactForm) {
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('cf-name').value.trim();
    const email = document.getElementById('cf-email').value.trim();
    const message = document.getElementById('cf-message').value.trim();
    const subject = encodeURIComponent(`Portfolio contact from ${name}`);
    const body = encodeURIComponent(`${message}\n\n— ${name} (${email})`);
    window.location.href = `mailto:adityarajput.86046@gmail.com?subject=${subject}&body=${body}`;
    if (formNote) formNote.textContent = 'Opening your email client...';
  });
}

// =============================================
// SCROLL PROGRESS BAR
// =============================================
const scrollProgress = document.getElementById('scrollProgress');
if (scrollProgress && !reduceMotion) {
  window.addEventListener('scroll', () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    scrollProgress.style.width = (docHeight > 0 ? (scrollTop / docHeight) * 100 : 0) + '%';
  }, { passive: true });
}

// =============================================
// NAV SCROLL SHADOW
// =============================================
const nav = document.querySelector('.nav');
if (nav) {
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });
}

// =============================================
// SCROLL REVEAL (IntersectionObserver)
// =============================================
if (!reduceMotion) {
  const revealEls = document.querySelectorAll('.reveal, .reveal-left');
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -20px 0px' });
  revealEls.forEach(el => revealObserver.observe(el));
} else {
  document.querySelectorAll('.reveal, .reveal-left').forEach(el => el.classList.add('visible'));
}

// =============================================
// INTERACTIVE SKILLS TABS
// =============================================
const skillsData = {
  backend: [
    { name: 'FastAPI', tag: '⚡', bg: 'rgba(0, 150, 136, 0.18)', color: '#00d4ff' },
    { name: 'Python', tag: 'Py', bg: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' },
    { name: 'Flask', tag: 'Fl', bg: 'rgba(255, 255, 255, 0.1)', color: '#ffffff' },
    { name: 'Django', tag: 'Dj', bg: 'rgba(16, 185, 129, 0.15)', color: '#34d399' },
    { name: 'REST APIs', tag: 'API', bg: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' },
    { name: 'Uvicorn', tag: 'Uv', bg: 'rgba(236, 72, 153, 0.15)', color: '#f472b6' },
  ],
  ai: [
    { name: 'LLM Integration', tag: '🤖', bg: 'rgba(123, 47, 190, 0.25)', color: '#c084fc' },
    { name: 'Groq API', tag: '⚡', bg: 'rgba(249, 115, 22, 0.18)', color: '#fb923c' },
    { name: 'llama-3.3-70b', tag: '🦙', bg: 'rgba(59, 130, 246, 0.18)', color: '#60a5fa' },
    { name: 'Prompt Eng.', tag: '✨', bg: 'rgba(0, 212, 255, 0.18)', color: '#00d4ff' },
    { name: 'OpenCV', tag: 'CV', bg: 'rgba(239, 68, 68, 0.18)', color: '#f87171' },
  ],
  databases: [
    { name: 'PostgreSQL', tag: '🐘', bg: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8' },
    { name: 'Supabase', tag: '⚡', bg: 'rgba(62, 207, 142, 0.2)', color: '#3ecf8e' },
    { name: 'Redis', tag: 'Rd', bg: 'rgba(239, 68, 68, 0.18)', color: '#f87171' },
    { name: 'MongoDB', tag: '🍃', bg: 'rgba(16, 185, 129, 0.18)', color: '#34d399' },
    { name: 'MySQL', tag: '🐬', bg: 'rgba(245, 158, 11, 0.18)', color: '#fbbf24' },
    { name: 'SQLAlchemy', tag: 'SQL', bg: 'rgba(217, 70, 239, 0.18)', color: '#e879f9' },
  ],
  languages: [
    { name: 'Python', tag: 'Py', bg: 'rgba(56, 189, 248, 0.18)', color: '#38bdf8' },
    { name: 'C', tag: 'C', bg: 'rgba(99, 102, 241, 0.18)', color: '#a5b4fc' },
    { name: 'C++', tag: 'C++', bg: 'rgba(59, 130, 246, 0.18)', color: '#60a5fa' },
    { name: 'C#', tag: 'C#', bg: 'rgba(168, 85, 247, 0.18)', color: '#c084fc' },
    { name: 'JavaScript', tag: 'JS', bg: 'rgba(234, 179, 8, 0.18)', color: '#facc15' },
    { name: 'Java', tag: '☕', bg: 'rgba(239, 68, 68, 0.18)', color: '#f87171' },
  ],
  frontend: [
    { name: 'React (Vite)', tag: '⚛️', bg: 'rgba(0, 212, 255, 0.18)', color: '#00d4ff' },
    { name: 'Node.js', tag: 'Node', bg: 'rgba(34, 197, 94, 0.18)', color: '#4ade80' },
    { name: 'Express.js', tag: 'Ex', bg: 'rgba(255, 255, 255, 0.1)', color: '#ffffff' },
    { name: 'Tailwind CSS', tag: '🌊', bg: 'rgba(56, 189, 248, 0.18)', color: '#38bdf8' },
    { name: 'HTML5', tag: '🌐', bg: 'rgba(249, 115, 22, 0.18)', color: '#fb923c' },
    { name: 'CSS3', tag: '🎨', bg: 'rgba(59, 130, 246, 0.18)', color: '#60a5fa' },
  ],
  iot: [
    { name: 'ESP32', tag: '⚡', bg: 'rgba(239, 68, 68, 0.18)', color: '#f87171' },
    { name: 'Sensor Int.', tag: '📡', bg: 'rgba(168, 85, 247, 0.18)', color: '#c084fc' },
    { name: 'GPS', tag: '📍', bg: 'rgba(56, 189, 248, 0.18)', color: '#38bdf8' },
    { name: 'MPU6050', tag: '📐', bg: 'rgba(245, 158, 11, 0.18)', color: '#fbbf24' },
    { name: 'Dashboards', tag: '📊', bg: 'rgba(34, 197, 94, 0.18)', color: '#4ade80' },
  ],
  tools: [
    { name: 'Git', tag: 'Git', bg: 'rgba(249, 115, 22, 0.18)', color: '#fb923c' },
    { name: 'GitHub', tag: '🐙', bg: 'rgba(255, 255, 255, 0.1)', color: '#ffffff' },
    { name: 'Postman', tag: '🚀', bg: 'rgba(249, 115, 22, 0.18)', color: '#f97316' },
    { name: 'Docker', tag: '🐳', bg: 'rgba(56, 189, 248, 0.18)', color: '#38bdf8' },
    { name: 'Kubernetes', tag: '☸️', bg: 'rgba(59, 130, 246, 0.18)', color: '#60a5fa' },
    { name: 'Render', tag: '▲', bg: 'rgba(168, 85, 247, 0.18)', color: '#c084fc' },
  ]
};

function renderSkills(category) {
  const panel = document.getElementById('skillsPanel');
  if (!panel) return;
  const items = skillsData[category] || [];
  
  // Re-trigger animation
  panel.style.animation = 'none';
  panel.offsetHeight; // reflow
  panel.style.animation = 'panelFade 0.3s cubic-bezier(0.22, 1, 0.36, 1) both';

  panel.innerHTML = items.map(skill => `
    <div class="skill-item-card">
      <div class="skill-badge" style="background:${skill.bg}; color:${skill.color};">
        ${skill.tag}
      </div>
      <span class="skill-name">${skill.name}</span>
    </div>
  `).join('');

  // Attach hover effect to new cards for custom cursor
  if (cursorDot && cursorRing && !reduceMotion) {
    panel.querySelectorAll('.skill-item-card').forEach(card => {
      card.addEventListener('mouseenter', () => {
        cursorDot.style.width = '24px';
        cursorDot.style.height = '24px';
        cursorDot.style.opacity = '0.6';
        cursorRing.style.width = '48px';
        cursorRing.style.height = '48px';
        cursorRing.style.borderColor = 'rgba(0,212,255,0.7)';
      });
      card.addEventListener('mouseleave', () => {
        cursorDot.style.width = '16px';
        cursorDot.style.height = '16px';
        cursorDot.style.opacity = '1';
        cursorRing.style.width = '36px';
        cursorRing.style.height = '36px';
        cursorRing.style.borderColor = 'rgba(0,212,255,0.4)';
      });
    });
  }
}

// Initialize tab click listeners
const skillTabs = document.querySelectorAll('.skill-tab');
if (skillTabs.length) {
  skillTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      skillTabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      const cat = tab.dataset.category;
      renderSkills(cat);
    });
  });

  // Render initial active category
  const initialActive = document.querySelector('.skill-tab.active');
  if (initialActive) {
    renderSkills(initialActive.dataset.category || 'backend');
  }
}

// =============================================
// ACTIVE NAV LINK ON SCROLL
// =============================================
const sections = ['whoami', 'experience', 'projects', 'skills', 'achievements', 'contact'];
const navLinkEls = document.querySelectorAll('.nav-links a[data-section]');

if (navLinkEls.length) {
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        navLinkEls.forEach(a => a.classList.toggle('active', a.dataset.section === id));
      }
    });
  }, { threshold: 0.4 });
  sections.forEach(id => {
    const el = document.getElementById(id);
    if (el) sectionObserver.observe(el);
  });
}

// =============================================
// PROJECT CARD MOUSE-TRACKING SHIMMER
// =============================================
if (!reduceMotion) {
  document.querySelectorAll('.proj').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--mouse-x', ((e.clientX - rect.left) / rect.width) * 100 + '%');
      card.style.setProperty('--mouse-y', ((e.clientY - rect.top) / rect.height) * 100 + '%');
    });
  });
}

// =============================================
// MATRIX RAIN CANVAS
// =============================================
if (!reduceMotion) {
  const canvas = document.getElementById('matrixCanvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    let W = canvas.width = window.innerWidth;
    let H = canvas.height = window.innerHeight;
    const fontSize = 13;
    let cols = Math.floor(W / fontSize);
    let drops = Array(cols).fill(1);
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*<>/|アイウエオカキクケコ';

    function drawMatrix() {
      ctx.fillStyle = 'rgba(5,5,5,0.05)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#00D4FF';
      ctx.font = fontSize + 'px JetBrains Mono, monospace';
      for (let i = 0; i < drops.length; i++) {
        const ch = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(ch, i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > H && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
    }

    let matrixInterval = setInterval(drawMatrix, 50);

    window.addEventListener('resize', () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
      cols = Math.floor(W / fontSize);
      drops = Array(cols).fill(1);
    }, { passive: true });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) clearInterval(matrixInterval);
      else matrixInterval = setInterval(drawMatrix, 50);
    });
  }
}

// =============================================
// HERO CONSTELLATION PARTICLES CANVAS
// =============================================
if (!reduceMotion) {
  const heroCanvas = document.getElementById('heroCanvas');
  if (heroCanvas) {
    const ctx = heroCanvas.getContext('2d');
    let width = heroCanvas.width = heroCanvas.parentElement.offsetWidth;
    let height = heroCanvas.height = heroCanvas.parentElement.offsetHeight;

    const particleCount = Math.min(Math.floor((width * height) / 9000), 100);
    const particles = [];
    let mousePos = { x: -1000, y: -1000 };

    class Particle {
      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.45;
        this.vy = (Math.random() - 0.5) * 0.45;
        this.radius = Math.random() * 1.5 + 0.8;
        this.baseAlpha = Math.random() * 0.6 + 0.2;
        this.color = Math.random() > 0.4 ? '#00D4FF' : '#7B2FBE';
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0) this.x = width;
        if (this.x > width) this.x = 0;
        if (this.y < 0) this.y = height;
        if (this.y > height) this.y = 0;
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.baseAlpha;
        ctx.shadowBlur = 8;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }
    }

    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    window.addEventListener('mousemove', (e) => {
      const rect = heroCanvas.getBoundingClientRect();
      mousePos.x = e.clientX - rect.left;
      mousePos.y = e.clientY - rect.top;
    });

    function renderConstellation() {
      ctx.clearRect(0, 0, width, height);

      // Draw connecting lines between particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = '#00D4FF';
            ctx.globalAlpha = (1 - dist / 100) * 0.12;
            ctx.lineWidth = 0.75;
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
        }
      }

      // Connect to mouse
      for (let i = 0; i < particles.length; i++) {
        const dx = particles[i].x - mousePos.x;
        const dy = particles[i].y - mousePos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 130) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(mousePos.x, mousePos.y);
          ctx.strokeStyle = '#00D4FF';
          ctx.globalAlpha = (1 - dist / 130) * 0.35;
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }

        particles[i].update();
        particles[i].draw();
      }

      requestAnimationFrame(renderConstellation);
    }

    renderConstellation();

    window.addEventListener('resize', () => {
      if (!heroCanvas.parentElement) return;
      width = heroCanvas.width = heroCanvas.parentElement.offsetWidth;
      height = heroCanvas.height = heroCanvas.parentElement.offsetHeight;
    }, { passive: true });
  }
}

