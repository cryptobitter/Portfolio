/**
 * Castle Access Gate Controller
 * Handles Supabase authentication, portcullis animation, content injection, and route shielding.
 */
import { AUTH_CONFIG, AUTH_TEXT } from './auth-constants.js';

let supabaseClient = null;
let currentSession = null;
let intendedTarget = '#projects';
let isContentInjected = false;
let isGateOpening = false;
let isGuestSession = false;

// Check if Guest Mode is enabled via query param or config
const urlParams = new URLSearchParams(window.location.search);
const allowGuest = AUTH_CONFIG.ALLOW_GUEST || urlParams.get('guest') === 'true';

// 1. Initialize Supabase Client
function initSupabase() {
  if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
    supabaseClient = window.supabase.createClient(AUTH_CONFIG.SUPABASE_URL, AUTH_CONFIG.SUPABASE_ANON_KEY);
    return supabaseClient;
  } else {
    console.error('[GATE] Supabase JS SDK not loaded.');
    return null;
  }
}

// 2. DOM Elements Cache
let overlayEl, portcullisEl, cardEl, alertEl, submitBtn, btnTextEl, btnSpinnerEl;
let tabLogin, tabSignup, tabMagic;
let nameGroup, emailInput, pwInput, confirmGroup, confirmInput, pwToggleBtn;
let forgotPwBtn, guestLinkEl;
let activeTab = 'login'; // 'login' | 'signup' | 'magic' | 'reset'

// 3. UI Helpers
function showAlert(message, type = 'error') {
  if (!alertEl) return;
  alertEl.textContent = message;
  alertEl.className = `gate-alert ${type}`;
  alertEl.style.display = 'flex';
}

function clearAlert() {
  if (!alertEl) return;
  alertEl.textContent = '';
  alertEl.style.display = 'none';
}

function setBtnLoading(isLoading, text = null) {
  if (!submitBtn) return;
  submitBtn.disabled = isLoading;
  if (btnSpinnerEl) {
    btnSpinnerEl.style.display = isLoading ? 'inline-block' : 'none';
  }
  if (btnTextEl && text) {
    btnTextEl.textContent = text;
  }
}

// 4. Focus Trap for Gate Modal
function setupFocusTrap() {
  document.addEventListener('keydown', (e) => {
    if (!overlayEl || !overlayEl.classList.contains('active')) return;

    // Esc does NOT close gate when locked
    if (e.key === 'Escape') {
      e.preventDefault();
      return;
    }

    if (e.key === 'Tab') {
      const focusable = overlayEl.querySelectorAll('button:not([disabled]), input:not([disabled]), a[href]');
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        last.focus();
        e.preventDefault();
      } else if (!e.shiftKey && document.activeElement === last) {
        first.focus();
        e.preventDefault();
      }
    }
  });
}

// 5. Open & Close Gate UI
export function openGate(target = '#projects') {
  if (currentSession || isGuestSession) {
    // Already unlocked
    navigateToTarget(target);
    return;
  }

  intendedTarget = target;
  clearAlert();

  if (overlayEl) {
    overlayEl.classList.remove('opening');
    overlayEl.classList.add('active');
    overlayEl.setAttribute('aria-hidden', 'false');

    // Update URL hash to #enter without jumping scroll
    if (window.location.hash !== '#enter') {
      history.pushState({ gate: true, target }, '', '#enter');
    }

    // Auto-focus first input
    setTimeout(() => {
      if (emailInput) emailInput.focus();
    }, 100);
  }
}

export function closeGate() {
  if (overlayEl) {
    overlayEl.classList.remove('active', 'opening');
    overlayEl.setAttribute('aria-hidden', 'true');
  }
}

// 6. Portcullis Lifting & Content Injection Sequence
async function unlockAndEnter() {
  if (isGateOpening) return;
  isGateOpening = true;

  setBtnLoading(true, AUTH_TEXT.STATE_VERIFYING);

  // 1. Fetch Protected Content from serverless API
  const token = currentSession?.access_token || '';
  let contentHtml = '';

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (isGuestSession) {
      headers['X-Guest-Access'] = 'true';
    }

    const res = await fetch('/api/content', {
      method: 'GET',
      headers
    });

    if (res.ok) {
      const data = await res.json();
      contentHtml = data.html || '';
    } else {
      console.warn('[GATE] Content fetch failed with status:', res.status);
      showAlert(AUTH_TEXT.ERR_GENERIC_AUTH, 'error');
      setBtnLoading(false, AUTH_TEXT.BTN_LOGIN);
      isGateOpening = false;
      return;
    }
  } catch (err) {
    console.error('[GATE] Network error fetching protected content:', err);
    showAlert('Network connection error contacting archive vault.', 'error');
    setBtnLoading(false, AUTH_TEXT.BTN_LOGIN);
    isGateOpening = false;
    return;
  }

  // 2. Inject Content into Root
  const root = document.getElementById('protected-content-root');
  if (root && contentHtml) {
    root.innerHTML = contentHtml;
    isContentInjected = true;
  }

  // 3. Update Cue & Nav state
  updateStation3Cue(true);
  renderNavUserChip();

  // 4. Trigger Portcullis Animation (1.2s lift)
  if (overlayEl) {
    overlayEl.classList.add('opening');
  }

  const liftDuration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 150 : 1250;

  setTimeout(() => {
    closeGate();
    isGateOpening = false;

    // 5. Initialize protected scripts & GSAP triggers
    if (typeof window.initProtectedSections === 'function') {
      window.initProtectedSections();
    }
    if (window.ScrollTrigger) {
      window.ScrollTrigger.refresh();
    }

    // 6. Navigate to intended target
    navigateToTarget(intendedTarget);
  }, liftDuration);
}

function navigateToTarget(target) {
  if (!target || target === '#enter') target = '#projects';

  if (target === 'download-cv') {
    downloadAuthenticatedCV();
    return;
  }

  if (window.location.hash !== target) {
    history.replaceState(null, '', target);
  }

  const el = document.querySelector(target);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' });
  } else {
    // Fallback: scroll past hero pin
    const heroPin = (window.innerHeight || 800) * 2 + 50;
    window.scrollTo({ top: heroPin, behavior: 'smooth' });
  }
}

// 7. Download Authenticated CV
function downloadAuthenticatedCV() {
  const token = currentSession?.access_token;
  if (!token && !isGuestSession) {
    openGate('download-cv');
    return;
  }

  const cvUrl = isGuestSession
    ? '/api/download-cv?guest=true'
    : `/api/download-cv?token=${encodeURIComponent(token)}`;

  window.open(cvUrl, '_blank', 'noopener');
}
window.downloadAuthenticatedCV = downloadAuthenticatedCV;

// 8. Station 3 Cue Dynamic Text
function updateStation3Cue(isUnlocked) {
  const cueTextEl = document.querySelector('.orbit-cue-text');
  if (cueTextEl) {
    cueTextEl.textContent = isUnlocked ? AUTH_TEXT.CUE_UNLOCKED : AUTH_TEXT.CUE_LOCKED;
  }
}

// 9. Top-bar User Chip & Sign Out
function renderNavUserChip() {
  const existingChip = document.getElementById('nav-auth-container');
  if (existingChip) existingChip.remove();

  if (!currentSession && !isGuestSession) return;

  const headerRight = document.querySelector('.header-right');
  if (!headerRight) return;

  const user = currentSession?.user;
  const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || (isGuestSession ? 'Guest' : 'Traveler');
  const initials = name.substring(0, 2).toUpperCase();

  const container = document.createElement('div');
  container.id = 'nav-auth-container';
  container.className = 'nav-auth-container';
  container.innerHTML = `
    <div class="nav-user-chip" title="${user?.email || 'Guest Explorer'}">
      <span class="nav-user-avatar">${initials}</span>
      <span class="nav-user-name">${name}</span>
    </div>
    <button type="button" id="nav-signout-btn" class="nav-signout-btn" aria-label="Sign out of archive">
      Sign out
    </button>
  `;

  headerRight.appendChild(container);

  container.querySelector('#nav-signout-btn').addEventListener('click', handleSignOut);
}

// 10. Sign Out Handler
export async function handleSignOut() {
  if (supabaseClient) {
    await supabaseClient.auth.signOut();
  }
  currentSession = null;
  isGuestSession = false;
  isContentInjected = false;

  // Clear injected content from DOM
  const root = document.getElementById('protected-content-root');
  if (root) root.innerHTML = '';

  // Remove user chip
  const chip = document.getElementById('nav-auth-container');
  if (chip) chip.remove();

  // Reset Station 3 cue text
  updateStation3Cue(false);

  // Return to top of hero
  window.scrollTo({ top: 0, behavior: 'smooth' });
  history.replaceState(null, '', window.location.pathname);
}
window.handleSignOut = handleSignOut;

// 11. Switch Tabs in Gate Card
function setTab(tab) {
  activeTab = tab;
  clearAlert();

  [tabLogin, tabSignup, tabMagic].forEach(t => t?.classList.remove('active'));

  if (tab === 'login') {
    tabLogin?.classList.add('active');
    nameGroup.style.display = 'none';
    confirmGroup.style.display = 'none';
    pwInput.closest('.gate-form-group').style.display = 'block';
    forgotPwBtn.style.display = 'inline-block';
    btnTextEl.textContent = AUTH_TEXT.BTN_LOGIN;
  } else if (tab === 'signup') {
    tabSignup?.classList.add('active');
    nameGroup.style.display = 'block';
    confirmGroup.style.display = 'block';
    pwInput.closest('.gate-form-group').style.display = 'block';
    forgotPwBtn.style.display = 'none';
    btnTextEl.textContent = AUTH_TEXT.BTN_SIGNUP;
  } else if (tab === 'magic') {
    tabMagic?.classList.add('active');
    nameGroup.style.display = 'none';
    confirmGroup.style.display = 'none';
    pwInput.closest('.gate-form-group').style.display = 'none';
    forgotPwBtn.style.display = 'none';
    btnTextEl.textContent = AUTH_TEXT.BTN_MAGIC;
  } else if (tab === 'reset') {
    nameGroup.style.display = 'none';
    confirmGroup.style.display = 'none';
    pwInput.closest('.gate-form-group').style.display = 'none';
    forgotPwBtn.style.display = 'none';
    btnTextEl.textContent = AUTH_TEXT.BTN_RESET;
  }
}

// 12. Form Submission Handler
async function handleFormSubmit(e) {
  e.preventDefault();
  clearAlert();

  const email = emailInput.value.trim();
  const password = pwInput.value;
  const confirmPassword = confirmInput ? confirmInput.value : '';
  const fullName = document.getElementById('gate-name')?.value.trim() || '';

  if (!email) {
    showAlert(AUTH_TEXT.ERR_EMAIL_REQUIRED, 'error');
    return;
  }

  if (activeTab === 'login') {
    if (!password) {
      showAlert('Password cipher is required.', 'error');
      return;
    }
    setBtnLoading(true, AUTH_TEXT.STATE_AUTHENTICATING);

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) {
      showAlert(error.message || AUTH_TEXT.ERR_GENERIC_AUTH, 'error');
      setBtnLoading(false, AUTH_TEXT.BTN_LOGIN);
      return;
    }
    currentSession = data.session;
    unlockAndEnter();

  } else if (activeTab === 'signup') {
    if (password.length < 10) {
      showAlert(AUTH_TEXT.ERR_SHORT_PASSWORD, 'error');
      return;
    }
    if (password !== confirmPassword) {
      showAlert(AUTH_TEXT.ERR_PASSWORD_MISMATCH, 'error');
      return;
    }
    setBtnLoading(true, AUTH_TEXT.STATE_AUTHENTICATING);

    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin
      }
    });

    if (error) {
      showAlert(error.message || AUTH_TEXT.ERR_GENERIC_AUTH, 'error');
      setBtnLoading(false, AUTH_TEXT.BTN_SIGNUP);
      return;
    }

    if (data.session) {
      currentSession = data.session;
      unlockAndEnter();
    } else {
      // Email confirmation required
      setBtnLoading(false, AUTH_TEXT.BTN_SIGNUP);
      showAlert(AUTH_TEXT.ERR_CHECK_EMAIL, 'success');
    }

  } else if (activeTab === 'magic') {
    setBtnLoading(true, AUTH_TEXT.STATE_SENDING);
    const { error } = await supabaseClient.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin }
    });

    setBtnLoading(false, AUTH_TEXT.BTN_MAGIC);
    if (error) {
      showAlert(error.message, 'error');
    } else {
      showAlert('A magic scroll link has been dispatched to your email.', 'success');
    }

  } else if (activeTab === 'reset') {
    setBtnLoading(true, AUTH_TEXT.STATE_SENDING);
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin
    });

    setBtnLoading(false, AUTH_TEXT.BTN_RESET);
    if (error) {
      showAlert(error.message, 'error');
    } else {
      showAlert(AUTH_TEXT.ERR_PASSWORD_RESET_SENT, 'success');
    }
  }
}

// 13. OAuth Handlers
async function handleOAuth(provider) {
  clearAlert();
  if (!supabaseClient) return;

  const { error } = await supabaseClient.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: window.location.origin
    }
  });

  if (error) {
    showAlert(error.message, 'error');
  }
}

// 14. Intercept Protected Links & Navigation
function setupProtectedLinkInterceptors() {
  document.addEventListener('click', (e) => {
    // Check if clicked element or parent is a protected anchor
    const link = e.target.closest('a[href^="#"], .nav-resume-btn, .btn-orbit-ghost');
    if (!link) return;

    const href = link.getAttribute('href') || '';

    // Station dots are internal to hero
    if (link.closest('.hero-stations-nav')) return;

    // Check CV buttons
    if (link.classList.contains('nav-resume-btn') || link.classList.contains('btn-orbit-ghost') || href.includes('resume.pdf')) {
      e.preventDefault();
      if (!currentSession && !isGuestSession) {
        openGate('download-cv');
      } else {
        downloadAuthenticatedCV();
      }
      return;
    }

    // Protected sections anchors
    const protectedTargets = ['#projects', '#process', '#experience', '#contact', '#animatedFooterGateway'];
    const matchesTarget = protectedTargets.find(t => href === t || href.endsWith(t));

    if (matchesTarget || link.classList.contains('skip-to-projects-link')) {
      if (!currentSession && !isGuestSession) {
        e.preventDefault();
        openGate(matchesTarget || '#projects');
      }
    }
  });

  // Handle direct URL hash on load
  const initialHash = window.location.hash;
  if (initialHash === '#enter') {
    openGate('#projects');
  } else if (['#projects', '#process', '#experience', '#contact'].includes(initialHash)) {
    if (!currentSession && !isGuestSession) {
      openGate(initialHash);
    }
  }

  window.addEventListener('hashchange', () => {
    if (window.location.hash === '#enter') {
      openGate(intendedTarget);
    }
  });
}

// 15. Mount Gate Modal to DOM
function mountGateDOM() {
  if (document.getElementById('access-gate-modal')) return;

  const gateHtml = `
  <div id="access-gate-modal" class="access-gate-overlay" role="dialog" aria-modal="true" aria-labelledby="gate-title-id" aria-hidden="true">
    <!-- Portcullis Iron Grate -->
    <div class="portcullis-assembly" aria-hidden="true">
      <div class="portcullis-crossbar pos-top"></div>
      <div class="portcullis-crossbar pos-mid"></div>
      <div class="portcullis-crossbar pos-bot"></div>
      ${Array.from({ length: 18 }).map(() => '<div class="portcullis-vertical-bar"></div>').join('')}
    </div>

    <!-- Central Stone Card -->
    <div class="gate-card-wrapper">
      <div class="gate-card">
        <span class="gate-badge">${AUTH_TEXT.GATE_BADGE}</span>
        <h2 id="gate-title-id" class="gate-title">${AUTH_TEXT.GATE_TITLE}</h2>
        <p class="gate-subtitle">${AUTH_TEXT.GATE_SUBTITLE}</p>

        <!-- Tabs -->
        <div class="gate-tabs" role="tablist">
          <button type="button" id="tab-login" class="gate-tab-btn active" role="tab">${AUTH_TEXT.TAB_LOGIN}</button>
          <button type="button" id="tab-signup" class="gate-tab-btn" role="tab">${AUTH_TEXT.TAB_SIGNUP}</button>
          <button type="button" id="tab-magic" class="gate-tab-btn" role="tab">${AUTH_TEXT.TAB_MAGIC}</button>
        </div>

        <!-- OAuth Providers -->
        <div class="gate-oauth-grid">
          <button type="button" id="btn-oauth-google" class="gate-oauth-btn">
            <svg viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/></svg>
            <span>${AUTH_TEXT.OAUTH_GOOGLE}</span>
          </button>
          <button type="button" id="btn-oauth-github" class="gate-oauth-btn">
            <svg viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
            <span>${AUTH_TEXT.OAUTH_GITHUB}</span>
          </button>
        </div>

        <div class="gate-divider">
          <span>${AUTH_TEXT.OAUTH_OR}</span>
        </div>

        <!-- Alert Banner -->
        <div id="gate-alert" class="gate-alert" style="display: none;" aria-live="polite"></div>

        <!-- Credentials Form -->
        <form id="gate-auth-form" novalidate>
          <div id="gate-group-name" class="gate-form-group" style="display: none;">
            <label for="gate-name" class="gate-label">${AUTH_TEXT.LABEL_NAME}</label>
            <input type="text" id="gate-name" class="gate-input" placeholder="${AUTH_TEXT.PLACEHOLDER_NAME}" autocomplete="name">
          </div>

          <div class="gate-form-group">
            <label for="gate-email" class="gate-label">${AUTH_TEXT.LABEL_EMAIL}</label>
            <input type="email" id="gate-email" class="gate-input" placeholder="${AUTH_TEXT.PLACEHOLDER_EMAIL}" required autocomplete="email">
          </div>

          <div class="gate-form-group">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <label for="gate-pw" class="gate-label">${AUTH_TEXT.LABEL_PASSWORD}</label>
              <button type="button" id="gate-btn-forgot" class="gate-pw-toggle" style="margin-bottom:0.35rem; padding:0;">${AUTH_TEXT.BTN_FORGOT}</button>
            </div>
            <div class="gate-input-wrap">
              <input type="password" id="gate-pw" class="gate-input" placeholder="${AUTH_TEXT.PLACEHOLDER_PASSWORD}" autocomplete="current-password">
              <button type="button" id="gate-toggle-pw" class="gate-pw-toggle" aria-label="Toggle password visibility">SHOW</button>
            </div>
          </div>

          <div id="gate-group-confirm" class="gate-form-group" style="display: none;">
            <label for="gate-confirm-pw" class="gate-label">${AUTH_TEXT.LABEL_CONFIRM_PASSWORD}</label>
            <input type="password" id="gate-confirm-pw" class="gate-input" placeholder="${AUTH_TEXT.PLACEHOLDER_CONFIRM}" autocomplete="new-password">
          </div>

          <button type="submit" id="gate-submit-btn" class="gate-btn-primary">
            <span id="gate-btn-text">${AUTH_TEXT.BTN_LOGIN}</span>
            <span id="gate-btn-spinner" class="gate-spinner" style="display: none;"></span>
          </button>
        </form>

        <!-- Footer Privacy & Guest link -->
        <div class="gate-footer-links">
          <p>${AUTH_TEXT.PRIVACY_LINE} <a href="#privacy" id="gate-privacy-link">${AUTH_TEXT.PRIVACY_LINK_TEXT}</a></p>
          ${allowGuest ? `<a href="#guest" id="gate-guest-link" class="gate-guest-link">${AUTH_TEXT.BTN_GUEST}</a>` : ''}
        </div>
      </div>
    </div>
  </div>
  `;

  document.body.insertAdjacentHTML('beforeend', gateHtml);

  // Cache elements
  overlayEl = document.getElementById('access-gate-modal');
  portcullisEl = overlayEl.querySelector('.portcullis-assembly');
  cardEl = overlayEl.querySelector('.gate-card');
  alertEl = document.getElementById('gate-alert');
  submitBtn = document.getElementById('gate-submit-btn');
  btnTextEl = document.getElementById('gate-btn-text');
  btnSpinnerEl = document.getElementById('gate-btn-spinner');

  tabLogin = document.getElementById('tab-login');
  tabSignup = document.getElementById('tab-signup');
  tabMagic = document.getElementById('tab-magic');

  nameGroup = document.getElementById('gate-group-name');
  confirmGroup = document.getElementById('gate-group-confirm');
  emailInput = document.getElementById('gate-email');
  pwInput = document.getElementById('gate-pw');
  confirmInput = document.getElementById('gate-confirm-pw');
  pwToggleBtn = document.getElementById('gate-toggle-pw');
  forgotPwBtn = document.getElementById('gate-btn-forgot');
  guestLinkEl = document.getElementById('gate-guest-link');

  // Tab listeners
  tabLogin.addEventListener('click', () => setTab('login'));
  tabSignup.addEventListener('click', () => setTab('signup'));
  tabMagic.addEventListener('click', () => setTab('magic'));

  // Password toggle
  pwToggleBtn.addEventListener('click', () => {
    const isPw = pwInput.type === 'password';
    pwInput.type = isPw ? 'text' : 'password';
    if (confirmInput) confirmInput.type = pwInput.type;
    pwToggleBtn.textContent = isPw ? 'HIDE' : 'SHOW';
  });

  // Forgot password
  forgotPwBtn.addEventListener('click', () => setTab('reset'));

  // Form submit
  document.getElementById('gate-auth-form').addEventListener('submit', handleFormSubmit);

  // OAuth buttons
  document.getElementById('btn-oauth-google').addEventListener('click', () => handleOAuth('google'));
  document.getElementById('btn-oauth-github').addEventListener('click', () => handleOAuth('github'));

  // Guest access click
  if (guestLinkEl) {
    guestLinkEl.addEventListener('click', (e) => {
      e.preventDefault();
      isGuestSession = true;
      unlockAndEnter();
    });
  }

  // Privacy notice link
  const privacyLink = document.getElementById('gate-privacy-link');
  if (privacyLink) {
    privacyLink.addEventListener('click', (e) => {
      e.preventDefault();
      alert('Privacy Notice: This system collects only your authenticated email address and name strictly for identification and gate access. No tracking cookies or advertising telemetry are deployed.');
    });
  }

  setupFocusTrap();
}

// 16. Bootstrap Controller
export async function initGateController() {
  mountGateDOM();
  const sb = initSupabase();

  if (sb) {
    // Check active session
    const { data: { session } } = await sb.auth.getSession();
    if (session) {
      currentSession = session;
      updateStation3Cue(true);
      renderNavUserChip();

      // Silently pre-load protected content in background so scrolling is instantaneous
      fetch('/api/content', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      }).then(r => r.json()).then(data => {
        if (data.html) {
          const root = document.getElementById('protected-content-root');
          if (root && !isContentInjected) {
            root.innerHTML = data.html;
            isContentInjected = true;
            if (typeof window.initProtectedSections === 'function') {
              window.initProtectedSections();
            }
          }
        }
      }).catch(e => console.warn('[GATE] Preload error:', e));

    } else {
      updateStation3Cue(false);
    }

    // Listen for auth state changes across tabs/sessions
    sb.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        currentSession = session;
        if (!isContentInjected) {
          unlockAndEnter();
        } else {
          renderNavUserChip();
          updateStation3Cue(true);
        }
      } else if (event === 'SIGNED_OUT') {
        currentSession = null;
        isGuestSession = false;
        isContentInjected = false;
        const root = document.getElementById('protected-content-root');
        if (root) root.innerHTML = '';
        renderNavUserChip();
        updateStation3Cue(false);
      } else if (event === 'TOKEN_REFRESHED' && session) {
        currentSession = session;
      }
    });
  }

  setupProtectedLinkInterceptors();
}

// Global hook for hero-orbit.js to check lock state
window.isGateLocked = function() {
  return !currentSession && !isGuestSession;
};

// Global hook to trigger gate from hero-orbit.js
window.triggerGate = function(target = '#projects') {
  openGate(target);
};

// Auto-run on DOM ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGateController);
  } else {
    initGateController();
  }
}
