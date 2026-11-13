/**
 * Heraldic Castle Pulley Hoist for Achievements & Certifications
 * Aditya Rajput Portfolio
 * 
 * Features:
 * - Rotatable brass & iron winch pulley wheel
 * - Dual braided rope tension animation
 * - Vertical carriage translation with mechanical hoist easing
 * - Multi-input: Move Up / Move Down buttons, clickable rope knots, touch swipe, wheel scroll, keyboard arrows
 * - Accessible ARIA live region announcements
 */
(function () {
  'use strict';

  const ACHIEVEMENTS_DATA = [
    {
      id: 'gdgoc-psit',
      number: '01',
      total: '06',
      category: 'CAMPUS LEADERSHIP',
      catClass: 'badge-gold',
      date: '2024 — PRESENT',
      title: 'Google Developer Groups on Campus (GDGoC) PSIT',
      subtitle: 'Technical Head',
      desc: 'Leading technical initiatives, architecting developer learning roadmaps, conducting hands-on engineering workshops, and mentoring student developers across web architecture, APIs, and AI systems at PSIT.',
      tags: ['GDGoC', 'Technical Head', 'Developer Community', 'System Workshops', 'Mentorship']
    },
    {
      id: 'walmart-simulation',
      number: '02',
      total: '06',
      category: 'SOFTWARE ENGINEERING SIMULATION',
      catClass: 'badge-blue',
      date: 'AUG 2026',
      title: 'Walmart Global Tech — Advanced Software Engineering',
      subtitle: 'Job Simulation via Forage',
      desc: 'Completed Walmart Global Tech\'s intensive advanced engineering simulation covering Advanced Data Structures, Enterprise Software Architecture, Relational Database Design, and Data Munging pipelines.',
      tags: ['Walmart Global Tech', 'Data Structures', 'Software Architecture', 'Relational DB', 'Data Munging']
    },
    {
      id: 'ibm-python',
      number: '03',
      total: '06',
      category: 'PROFESSIONAL CERTIFICATION',
      catClass: 'badge-emerald',
      date: '2026',
      title: 'IBM — Data Analysis with Python',
      subtitle: 'Professional Certification via Coursera',
      desc: 'Mastered production data analysis and statistical pipelines using Python, pandas, NumPy, and SciPy; engineered automated data wrangling workflows and exploratory analytics.',
      tags: ['IBM', 'Coursera', 'Python', 'Data Analysis', 'Pandas', 'NumPy']
    },
    {
      id: 'anthropic-academy',
      number: '04',
      total: '06',
      category: 'AI & LLM CERTIFICATIONS',
      catClass: 'badge-crimson',
      date: '2026',
      title: 'Anthropic Academy — Claude 101 & AI Fluency',
      subtitle: 'Dual Certifications for Students',
      desc: 'Completed specialized Anthropic certifications covering Claude 3.5/3 model architectures, context-window optimization, system prompts, structured tool use, and generative AI application design.',
      tags: ['Anthropic', 'Claude API', 'LLM Architectures', 'Prompt Engineering', 'AI Fluency']
    },
    {
      id: 'buildwithbharat',
      number: '05',
      total: '06',
      category: 'NATIONAL HACKATHON',
      catClass: 'badge-amber',
      date: 'SEP 2026',
      title: 'BuildWithBharat 2.0 — National Semifinalist',
      subtitle: 'NIT Delhi (Team The Wildcards)',
      desc: 'Qualified as National Semifinalist in Build with Bharat 2.0 at NIT Delhi (13–14 September 2026), demonstrating high-impact systems engineering and FastAPI backend innovation (organized by Codeverse, HackCulture, Logitech, and GitHub).',
      tags: ['NIT Delhi', 'National Hackathon', 'Systems Architecture', 'FastAPI', 'High-Impact Tech']
    },
    {
      id: 'coderush-nexify',
      number: '06',
      total: '06',
      category: 'NATIONAL HACKATHON',
      catClass: 'badge-amber',
      date: 'APR 2026',
      title: 'BBD National Hackathon (Coderush 2.0 & NEXIFY)',
      subtitle: 'National Hackathon Finalist — BBDNIIT',
      desc: 'Finalist at Coderush 2.0 Hackathon organized by BBDNIIT (13th April 2026) and NEXIFY\'26 as lead backend developer (FastAPI), architecting real-time microservices and async data pipelines.',
      tags: ['BBDNIIT', 'FastAPI', 'Microservices', 'Async Pipelines', 'Finalist']
    }
  ];

  function initPulley() {
    const root = document.getElementById('achievementsPulleyRoot');
    if (!root) return;

    let currentIndex = 0;
    let wheelRotation = 0;
    const total = ACHIEVEMENTS_DATA.length;

    const track = root.querySelector('.pulley-track');
    const wheel = root.querySelector('.pulley-wheel-spindle');
    const ropeLeft = root.querySelector('.pulley-cable-left');
    const ropeRight = root.querySelector('.pulley-cable-right');
    const btnUp = root.querySelector('.pulley-btn-up');
    const btnDown = root.querySelector('.pulley-btn-down');
    const counterCur = root.querySelector('.pulley-counter-current');
    const counterTotal = root.querySelector('.pulley-counter-total');
    const knots = root.querySelectorAll('.pulley-knot');
    const liveAnnounce = root.querySelector('#pulleyLiveAnnounce');

    if (counterTotal) {
      counterTotal.textContent = String(total).padStart(2, '0');
    }

    function updatePulley(targetIndex, direction = 1) {
      // Loop smoothly around 0 .. total-1
      if (targetIndex < 0) {
        targetIndex = total - 1;
      } else if (targetIndex >= total) {
        targetIndex = 0;
      }

      currentIndex = targetIndex;

      // Update track position (100% per card)
      if (track) {
        track.style.transform = `translateY(-${currentIndex * 100}%)`;
      }

      // Rotate wheel: Move Up (hoist) spins clockwise, Move Down spins counter-clockwise
      wheelRotation += direction * 65;
      if (wheel) {
        wheel.style.transform = `rotate(${wheelRotation}deg)`;
      }

      // Cable tension vibration effect
      [ropeLeft, ropeRight].forEach(rope => {
        if (!rope) return;
        rope.classList.remove('is-pulling');
        void rope.offsetWidth; // trigger reflow
        rope.classList.add('is-pulling');
      });

      // Update counter
      if (counterCur) {
        counterCur.textContent = String(currentIndex + 1).padStart(2, '0');
      }

      // Update knots / rope beads
      knots.forEach((knot, i) => {
        const isActive = i === currentIndex;
        knot.classList.toggle('is-active', isActive);
        knot.setAttribute('aria-current', isActive ? 'true' : 'false');
      });

      // Live region announcement for screen readers
      if (liveAnnounce) {
        const item = ACHIEVEMENTS_DATA[currentIndex];
        liveAnnounce.textContent = `Hoisted achievement ${currentIndex + 1} of ${total}: ${item.title}, ${item.subtitle}`;
      }
    }

    // Button event listeners
    if (btnUp) {
      btnUp.addEventListener('click', (e) => {
        e.preventDefault();
        // Move Up: Hoist up to next achievement (+1)
        updatePulley(currentIndex + 1, 1);
      });
    }

    if (btnDown) {
      btnDown.addEventListener('click', (e) => {
        e.preventDefault();
        // Move Down: Lower down to previous achievement (-1)
        updatePulley(currentIndex - 1, -1);
      });
    }

    // Direct knot jump
    knots.forEach((knot) => {
      knot.addEventListener('click', (e) => {
        e.preventDefault();
        const target = parseInt(knot.getAttribute('data-index'), 10);
        if (!isNaN(target) && target !== currentIndex) {
          const dir = target > currentIndex ? 1 : -1;
          updatePulley(target, dir);
        }
      });
    });

    // Keyboard navigation when carriage is focused
    const viewport = root.querySelector('.pulley-viewport');
    if (viewport) {
      viewport.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowUp' || e.key === 'PageUp') {
          e.preventDefault();
          updatePulley(currentIndex - 1, -1);
        } else if (e.key === 'ArrowDown' || e.key === 'PageDown') {
          e.preventDefault();
          updatePulley(currentIndex + 1, 1);
        }
      });

      // Mouse wheel handling (with gentle debounce)
      let wheelTimeout = null;
      viewport.addEventListener('wheel', (e) => {
        if (Math.abs(e.deltaY) < 18) return;
        e.preventDefault();
        if (wheelTimeout) return;
        wheelTimeout = setTimeout(() => { wheelTimeout = null; }, 320);

        if (e.deltaY > 0) {
          updatePulley(currentIndex + 1, 1);
        } else {
          updatePulley(currentIndex - 1, -1);
        }
      }, { passive: false });

      // Touch swipe handling
      let touchStartY = 0;
      viewport.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
          touchStartY = e.touches[0].clientY;
        }
      }, { passive: true });

      viewport.addEventListener('touchend', (e) => {
        if (e.changedTouches.length === 1) {
          const touchEndY = e.changedTouches[0].clientY;
          const deltaY = touchEndY - touchStartY;
          if (Math.abs(deltaY) > 36) {
            if (deltaY < 0) {
              // Swipe up -> hoist next
              updatePulley(currentIndex + 1, 1);
            } else {
              // Swipe down -> lower prev
              updatePulley(currentIndex - 1, -1);
            }
          }
        }
      }, { passive: true });
    }

    // Initialize first state
    updatePulley(0, 0);
  }

  window.initPulley = initPulley;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPulley);
  } else {
    initPulley();
  }
})();

