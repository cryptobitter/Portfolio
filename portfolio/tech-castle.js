/**
 * tech-castle.js
 * 2D Heraldic Stone Castle for "Tools & Tech Stack"
 * Built with semantic HTML (ul/li), CSS Grid, and GSAP ScrollTrigger.
 */

(function () {
  'use strict';

  function initTechCastle() {
    const matrixContainer = document.getElementById('skillsMatrixGrid');
    const legendContainer = document.getElementById('skillsLegend');
    if (!matrixContainer) return;

    const tools = window.TECH_CASTLE_TOOLS || [];
    if (!tools.length) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isAlreadyBuilt = sessionStorage.getItem('tech_castle_built') === 'true';

    // 1. Build Castle Markup
    let castleHtml = `
      <div class="castle-stage" id="castleStage">
        <!-- Heraldic Crimson Pennant atop Left Tower -->
        <div class="castle-pennant" id="castlePennant" aria-hidden="true">
          <div class="pennant-pole"></div>
          <div class="pennant-cloth-wrap">
            <svg class="pennant-svg" viewBox="0 0 54 26" preserveAspectRatio="none">
              <defs>
                <linearGradient id="pennantGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#7A2432"/>
                  <stop offset="60%" stop-color="#5E1A24"/>
                  <stop offset="100%" stop-color="#401017"/>
                </linearGradient>
              </defs>
              <!-- Heraldic swallowtail pennant with gold border and lion charge accent -->
              <path d="M2 2 L50 2 L38 13 L50 24 L2 24 Z" fill="url(#pennantGrad)" stroke="#C9A24B" stroke-width="1.5" stroke-linejoin="round"/>
              <path d="M6 5 L44 5 L35 13 L44 21 L6 21 Z" fill="none" stroke="#C9A24B" stroke-width="0.8" stroke-dasharray="2 2" opacity="0.75"/>
              <circle cx="16" cy="13" r="3.5" fill="none" stroke="#C9A24B" stroke-width="1"/>
              <circle cx="16" cy="13" r="1.5" fill="#C9A24B"/>
            </svg>
          </div>
        </div>

        <ul class="castle-grid" role="list">
    `;

    // 2. Render Tool Tiles
    tools.forEach(tool => {
      if (tool.isDashed) {
        castleHtml += `
          <li class="castle-tile tile-dashed ${tool.catClass}" 
              data-id="${tool.id}"
              data-category="${tool.category}" 
              data-layer="${tool.layer}"
              style="grid-area: ${tool.gridArea};"
              tabindex="0"
              role="listitem"
              aria-label="Next Block, Empty architectural slot">
            <div class="tile-stone-bevel"></div>
            <div class="tile-icon-box">${tool.icon}</div>
            <span class="tile-name">${tool.name}</span>
            <div class="tile-tooltip" role="tooltip">Expansion Slot</div>
          </li>
        `;
      } else {
        castleHtml += `
          <li class="castle-tile ${tool.catClass}" 
              data-id="${tool.id}"
              data-category="${tool.category}" 
              data-layer="${tool.layer}"
              style="grid-area: ${tool.gridArea};"
              tabindex="0"
              role="listitem"
              aria-label="${tool.name}, ${tool.category}">
            <div class="tile-stone-bevel"></div>
            <div class="tile-icon-box">${tool.icon}</div>
            <span class="tile-name">${tool.name}</span>
            <div class="tile-cat-indicator">
              <span class="tile-dot ${tool.catClass}"></span>
            </div>
            <div class="tile-tooltip" role="tooltip">${tool.category}</div>
          </li>
        `;
      }
    });

    // 3. Render Battlements (Merlons) on Row 3 Cols 3 and 5
    castleHtml += `
      <li class="castle-merlon" style="grid-area: 3 / 3 / 4 / 4;" aria-hidden="true" data-layer="3">
        <div class="merlon-stone">
          <span class="merlon-emboss"></span>
        </div>
      </li>
      <li class="castle-merlon" style="grid-area: 3 / 5 / 4 / 6;" aria-hidden="true" data-layer="3">
        <div class="merlon-stone">
          <span class="merlon-emboss"></span>
        </div>
      </li>
    `;

    // 4. Render Arched Gate in Row 5 Col 4
    castleHtml += `
      <li class="castle-gate-portal" style="grid-area: 5 / 4 / 6 / 5;" aria-hidden="true" data-layer="1">
        <div class="gate-arch-keystone"></div>
        <div class="gate-tunnel">
          <svg class="portcullis-svg" viewBox="0 0 80 90" preserveAspectRatio="none">
            <!-- Portcullis iron grille with spiked tips -->
            <path d="M10 20 L10 82 M26 12 L26 82 M40 8 L40 82 M54 12 L54 82 M70 20 L70 82" stroke="#C9A24B" stroke-width="2" stroke-linecap="round"/>
            <path d="M5 28 L75 28 M5 46 L75 46 M5 64 L75 64" stroke="#C9A24B" stroke-width="2"/>
            <!-- Iron spikes at bottom -->
            <polygon points="10,82 7,88 13,88" fill="#C9A24B"/>
            <polygon points="26,82 23,88 29,88" fill="#C9A24B"/>
            <polygon points="40,82 37,88 43,88" fill="#C9A24B"/>
            <polygon points="54,82 51,88 57,88" fill="#C9A24B"/>
            <polygon points="70,82 67,88 73,88" fill="#C9A24B"/>
          </svg>
        </div>
        <div class="gate-drawbridge-threshold"></div>
      </li>
    `;

    // 5. Render Foundation Stone Plinth across Row 6 Cols 1-7
    castleHtml += `
      <li class="castle-plinth-strip" style="grid-area: 6 / 1 / 7 / 8;" aria-hidden="true" data-layer="1">
        <div class="plinth-chisel-line"></div>
        <div class="plinth-masonry-texture"></div>
      </li>
    `;

    castleHtml += `
        </ul><!-- /.castle-grid -->
      </div><!-- /.castle-stage -->
    `;

    matrixContainer.innerHTML = castleHtml;

    // 6. Category Legend Toggle Filters
    setupFilters();

    // 7. Build-Up Sequence
    setupBuildUpAnimation(prefersReducedMotion, isAlreadyBuilt);
  }

  /**
   * Category Legend Toggle Filter logic
   */
  function setupFilters() {
    const legendButtons = document.querySelectorAll('.skills-legend .legend-item');
    const castleTiles = document.querySelectorAll('.castle-tile:not(.tile-dashed)');

    if (!legendButtons.length || !castleTiles.length) return;

    let activeCategory = null;

    legendButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const cat = btn.getAttribute('data-category');

        if (activeCategory === cat) {
          // Clear active filter
          activeCategory = null;
          legendButtons.forEach(b => {
            b.classList.remove('is-filter-active');
            b.setAttribute('aria-pressed', 'false');
          });
          castleTiles.forEach(tile => {
            tile.classList.remove('is-highlighted', 'is-dimmed');
          });
        } else {
          // Set new active filter
          activeCategory = cat;
          legendButtons.forEach(b => {
            const isMatch = b.getAttribute('data-category') === cat;
            b.classList.toggle('is-filter-active', isMatch);
            b.setAttribute('aria-pressed', isMatch ? 'true' : 'false');
          });

          castleTiles.forEach(tile => {
            const tileCat = tile.getAttribute('data-category');
            if (tileCat === cat) {
              tile.classList.add('is-highlighted');
              tile.classList.remove('is-dimmed');
            } else {
              tile.classList.add('is-dimmed');
              tile.classList.remove('is-highlighted');
            }
          });
        }
      });
    });
  }

  /**
   * Build-up animation sequenced after banner unfurl and ScrollTrigger
   */
  function setupBuildUpAnimation(prefersReducedMotion, isAlreadyBuilt) {
    const allAnimatedElements = Array.from(document.querySelectorAll(
      '.castle-tile, .castle-merlon, .castle-gate-portal, .castle-plinth-strip, .castle-pennant'
    ));

    if (prefersReducedMotion || isAlreadyBuilt) {
      // Immediate resting static display
      allAnimatedElements.forEach(el => {
        el.style.opacity = '1';
        el.style.transform = 'none';
      });
      return;
    }

    // Set initial hidden state: slightly elevated (-8px) and transparent
    allAnimatedElements.forEach(el => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(-8px)';
      el.style.transition = 'none';
    });

    const triggerEl = document.getElementById('castleStage') || document.getElementById('skillsMatrixGrid');

    let buildRan = false;

    function runBuildTimeline() {
      if (buildRan) return;
      buildRan = true;

      // Group elements by layer 1 -> 5
      // Layer 1: Foundation (Row 5 + Plinth + Gate)
      // Layer 2: Curtain Wall & Gate lintel (Row 4)
      // Layer 3: Upper Wall & Towers (Row 3 + Merlons)
      // Layer 4: Turrets (Row 2 tools: RAG, ESP32)
      // Layer 5: Pinnacle & Dashed block (Row 1 Groq API + Pennant, Row 2 [+] Next Block)
      const layers = [1, 2, 3, 4, 5];
      const tl = gsap.timeline({
        onComplete: () => {
          sessionStorage.setItem('tech_castle_built', 'true');
          // Reset inline styles so CSS hover/focus works fluidly
          allAnimatedElements.forEach(el => {
            el.style.transition = '';
            el.style.transform = '';
          });
          if (window.ScrollTrigger) ScrollTrigger.refresh();
        }
      });

      let accumulatedDelay = 0;

      layers.forEach(layerNum => {
        const layerElements = allAnimatedElements.filter(el => {
          const l = parseInt(el.getAttribute('data-layer'), 10);
          return l === layerNum;
        });

        if (layerElements.length > 0) {
          tl.to(layerElements, {
            opacity: 1,
            y: 0,
            duration: 0.38,
            stagger: 0.04, // 40ms stagger between blocks in layer
            ease: 'back.out(1.2)' // ~4px subtle settle
          }, accumulatedDelay);

          accumulatedDelay += 0.14; // Stagger between layers
        }
      });

      // Reveal pennant with top layer
      const pennant = document.getElementById('castlePennant');
      if (pennant) {
        tl.to(pennant, {
          opacity: 1,
          y: 0,
          duration: 0.45,
          ease: 'power2.out'
        }, accumulatedDelay - 0.1);
      }
    }

    // Coordinate with ScrollTrigger and Banner Unfurl
    if (window.ScrollTrigger) {
      ScrollTrigger.create({
        trigger: triggerEl,
        start: 'top 70%', // Castle ~30% into viewport
        once: true,
        onEnter: () => {
          // Check if banner unfurl has already completed
          if (window.bannerUnfurlFinished) {
            runBuildTimeline();
          } else {
            // Listen for banner unfurl completion
            const onBannerComplete = () => {
              window.removeEventListener('bannerUnfurlComplete', onBannerComplete);
              runBuildTimeline();
            };
            window.addEventListener('bannerUnfurlComplete', onBannerComplete);

            // Safety timeout: in case user didn't unfurl banner or scrolled straight to castle
            setTimeout(() => {
              runBuildTimeline();
            }, 3200);
          }
        }
      });
    } else {
      // Fallback without ScrollTrigger
      setTimeout(runBuildTimeline, 1000);
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTechCastle);
  } else {
    initTechCastle();
  }
})();
