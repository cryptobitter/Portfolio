document.addEventListener('DOMContentLoaded', () => {

  /* ============ Custom Cursor with Lag ============ */
  const cursorDot  = document.getElementById('cursor-dot');
  const cursorRing = document.getElementById('cursor-ring');
  let mx = -200, my = -200, rx = -200, ry = -200;

  document.addEventListener('mousemove', (e) => {
    mx = e.clientX;
    my = e.clientY;
    if (cursorDot) {
      cursorDot.style.left = mx + 'px';
      cursorDot.style.top  = my + 'px';
    }
  }, { passive: true });

  (function animRing() {
    rx += (mx - rx) * 0.14;
    ry += (my - ry) * 0.14;
    if (cursorRing) {
      cursorRing.style.left = rx + 'px';
      cursorRing.style.top  = ry + 'px';
    }
    requestAnimationFrame(animRing);
  })();

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

  /* ============ 3D Mascot Character Proximity & Pop Interaction ============ */
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

    // Cursor tracking: 3D tilt & Proximity Pop trigger
    window.addEventListener('mousemove', (e) => {
      const rect = mascotCard.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top  + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // 3D Tilt angle towards cursor
      const normX = dx / (window.innerWidth / 2);
      const normY = dy / (window.innerHeight / 2);
      tiltX = Math.max(-15, Math.min(15, normY * -20));
      tiltY = Math.max(-20, Math.min(20, normX * 20));

      mascotCard.style.transform = `rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;

      // Proximity Trigger: POP bounce when cursor gets within 220px
      const now = Date.now();
      if (dist < 220) {
        mascotStage.classList.add('near');
        if (now - lastPopTime > 1600) {
          lastPopTime = now;
          mascotCard.classList.remove('pop');
          void mascotCard.offsetWidth; // Reflow
          mascotCard.classList.add('pop');

          // Cycle speech bubble phrase
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

    // Idle Float Loop
    let idleAngle = 0;
    function idleFloat() {
      idleAngle += 0.02;
      const floatY = Math.sin(idleAngle) * 6;
      mascotCard.style.transform = `translateY(${floatY}px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
      requestAnimationFrame(idleFloat);
    }
    idleFloat();
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
    // Calculate slots: at least 20 slots (4 cols x 5 rows).
    // If more than 20, grow by whole rows of 4 and pad the last row with empty blocks.
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

  /* ============ Scroll Reveal (Intersection Observer) ============ */
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