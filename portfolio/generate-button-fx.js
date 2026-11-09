/**
 * ============================================================================
 * VENGEANCE UI: GENERATE BUTTON EFFECT (hue: 210)
 * ============================================================================
 * 
 * Injects the Vengeance UI GenerateButton interactive animations:
 * - 4-pointed AI sparkle icon with ambient flicker
 * - Skeuomorphic bevel and aura glow highlights with hue 210
 * - Continuous staggered letter shimmer wave
 * - Active / focused generating state animation
 */

(function () {
  'use strict';

  const SPARKLE_SVG = `
    <svg class="gen-btn-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
      <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"></path>
    </svg>
  `;

  const SELECTORS = [
    '.nav-resume-btn',
    '.btn-editorial',
    '.btn-orbit-gold',
    '.btn-orbit-ghost',
    '.bs-open-pill',
    '.bs-btn',
    '.af-proceed-btn',
    '.lt-btn',
    '#cfSubmitBtn',
    '.skip-to-projects-link',
    '.orbit-cue-link'
  ];

  function applyGenerateEffect(btn) {
    if (!btn || btn.dataset.genBtnInit) return;
    btn.dataset.genBtnInit = 'true';
    btn.classList.add('gen-btn');

    // Extract text node or text span
    let textTarget = btn.querySelector('.btn-text, span:not(.arrow):not(.bs-arrow):not(.orbit-cue-icon):not(.bs-pill-arrow)') || btn;
    let rawText = '';
    
    // Check if button has child arrow span or existing SVG
    const arrow = btn.querySelector('.arrow, .bs-arrow, .bs-pill-arrow, .orbit-cue-icon');
    
    // Find pure text content
    if (textTarget === btn) {
      const textNodes = Array.from(btn.childNodes).filter(n => n.nodeType === Node.TEXT_NODE);
      rawText = textNodes.map(n => n.textContent).join('').trim();
      textNodes.forEach(n => n.remove());
    } else {
      rawText = textTarget.textContent.trim();
      textTarget.textContent = '';
    }

    if (!rawText) return;

    // Create wrapper for letters
    const lettersWrap = document.createElement('span');
    lettersWrap.className = 'gen-txt-wrapper';
    
    Array.from(rawText).forEach((char, i) => {
      const span = document.createElement('span');
      span.className = 'gen-btn-letter';
      span.textContent = char === ' ' ? '\u00A0' : char;
      span.style.animationDelay = `${(i * 0.07).toFixed(2)}s`;
      lettersWrap.appendChild(span);
    });

    // Prepend Sparkle SVG if not already present
    if (!btn.querySelector('.gen-btn-svg')) {
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(SPARKLE_SVG, 'image/svg+xml');
      const svgEl = svgDoc.documentElement;
      btn.insertBefore(svgEl, btn.firstChild);
    }

    if (textTarget === btn) {
      if (arrow) {
        btn.insertBefore(lettersWrap, arrow);
      } else {
        btn.appendChild(lettersWrap);
      }
    } else {
      textTarget.appendChild(lettersWrap);
    }

    // Interactive Generating state on Click
    let generatingTimer = null;
    function triggerGenerating() {
      btn.setAttribute('data-generating', 'true');
      clearTimeout(generatingTimer);
      generatingTimer = setTimeout(() => {
        btn.removeAttribute('data-generating');
      }, 1400);
    }

    btn.addEventListener('click', triggerGenerating);
  }

  function initAllGenerateButtons() {
    SELECTORS.forEach((sel) => {
      document.querySelectorAll(sel).forEach(applyGenerateEffect);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAllGenerateButtons);
  } else {
    initAllGenerateButtons();
  }

  // Also support dynamically opened panels (like 3D books detail panel)
  if (typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver(() => {
      initAllGenerateButtons();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
})();
