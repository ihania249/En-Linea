/*
 * EN LINEA — SITE CONFIGURATION
 * ------------------------------------------------------------------
 * This is the only file most people need to edit before going live.
 * Anything left blank falls back to a safe default, described below.
 * See docs/BACKEND-HANDOFF.md for what each endpoint must accept.
 */
window.ENLINEA_CONFIG = {
  /* Where the two signup forms send leads (SRS 1.1 / 1.2).
   * Paste a Google Apps Script web-app URL, a CRM webhook, or a form
   * service URL. Blank = the visitor's email app opens with the lead
   * pre-written to fallbackEmail, so no lead is silently lost. */
  leadsEndpoint: '',

  /* Where every audit run is reported internally (SRS 1.3 "Internal lead
   * reporting"), including visitors who never sign up.
   * Blank = uses leadsEndpoint. */
  auditLeadsEndpoint: '',

  /* The live audit engine (SRS 1.3). Receives the visitor's inputs and
   * returns scores. Blank = the built-in demo engine runs and every
   * result screen is clearly marked "Sample results". */
  auditEndpoint: '',

  fallbackEmail: 'info@enlineacreative.com',

  /* Client dashboard API (SRS Part 2). Blank = demo data, demo login.
   * Example: 'https://portal.enlineacreative.com/api' */
  apiBase: '',

  /* Package prices shown on the landing pages. Confirm the currency. */
  prices: {
    growth: { amount: '$1,000', period: 'per month' },
    reach:  { amount: '$1,000', period: 'per month' },
    rank:   { amount: '$1,000', period: 'per month' },
    geo:    { amount: '$799',   period: 'per month' }
  },

  /* Contracts expiring within this many days get an "Expiring soon" flag. */
  contractWarningDays: 60
};
