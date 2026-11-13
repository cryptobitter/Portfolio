/**
 * Access Gate Copy & UI Constants
 * Centralized castle theme terminology, screen reader announcements, and error mappings.
 */
export const AUTH_CONFIG = {
  SUPABASE_URL: 'https://rhclizphxdneznjzqrir.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_BiqeeMo2hFAihh9zn50woA_jvtCamYV',
  ALLOW_GUEST: false, // Override dynamically if config fetched or URL ?guest=true
};

export const AUTH_TEXT = {
  // Gate Hero & Badges
  GATE_BADGE: 'INNER KEEP · RESTRICTED ACCESS',
  GATE_TITLE: 'ENTRY INTO THE ARCHIVE',
  GATE_SUBTITLE: 'Identify thyself to raise the portcullis and inspect featured architecture, systems, and engineering records.',
  
  // Station 3 Lock Cue
  CUE_LOCKED: 'Sign in to see my work',
  CUE_UNLOCKED: 'SCROLL TO SEE MY WORK',
  
  // Tabs
  TAB_LOGIN: 'LOG IN',
  TAB_SIGNUP: 'CREATE ACCOUNT',
  TAB_MAGIC: 'MAGIC LINK',
  
  // OAuth
  OAUTH_GOOGLE: 'Continue with Google',
  OAUTH_GITHUB: 'Continue with GitHub',
  OAUTH_OR: 'OR WITH CREDENTIALS',
  
  // Form Labels
  LABEL_NAME: 'FULL NAME',
  LABEL_EMAIL: 'ELECTRONIC MAIL',
  LABEL_PASSWORD: 'SECRET CIPHER (PASSWORD)',
  LABEL_CONFIRM_PASSWORD: 'CONFIRM CIPHER',
  
  // Placeholders
  PLACEHOLDER_NAME: 'Alexander of Alexandria',
  PLACEHOLDER_EMAIL: 'traveler@domain.com',
  PLACEHOLDER_PASSWORD: 'At least 10 characters',
  PLACEHOLDER_CONFIRM: 'Repeat your password',
  
  // Buttons
  BTN_LOGIN: 'ENTER CITADEL',
  BTN_SIGNUP: 'REGISTER & ENTER',
  BTN_MAGIC: 'SEND MAGIC SCROLL LINK',
  BTN_FORGOT: 'Forgot password?',
  BTN_RESET: 'SEND CIPHER RESET',
  BTN_GUEST: 'Continue as guest →',
  
  // Status & Spinners
  STATE_VERIFYING: 'Raising portcullis...',
  STATE_AUTHENTICATING: 'Verifying seal...',
  STATE_SENDING: 'Dispatching parchment...',
  STATE_SESSION_EXPIRED: 'Session expired. The portcullis has lowered. Please sign in again.',
  
  // Privacy
  PRIVACY_LINE: 'We store only your email and name to verify your admission.',
  PRIVACY_LINK_TEXT: 'Privacy Notice',
  
  // Error messages
  ERR_SHORT_PASSWORD: 'Password must contain at least 10 characters for castle defenses.',
  ERR_PASSWORD_MISMATCH: 'Ciphers do not match. Please verify your passwords.',
  ERR_EMAIL_REQUIRED: 'Valid email address is required for credentials dispatch.',
  ERR_GENERIC_AUTH: 'Authentication failed. Please verify credentials or try another method.',
  ERR_CHECK_EMAIL: 'Confirmation parchment dispatched. Please inspect your inbox to complete entry.',
  ERR_PASSWORD_RESET_SENT: 'Password reset link sent to your email.'
};
