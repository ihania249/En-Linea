/*
 * Client dashboard data layer (SRS Part 2).
 *
 * DATA ISOLATION (SRS hard requirement): no request below carries a client ID.
 * Every endpoint is "/me/..." and the SERVER decides whose data to return from
 * the authenticated session. Hiding things in this file is not security; the
 * backend must scope every query to the session's client account.
 * Full API contract: docs/BACKEND-HANDOFF.md
 *
 * With ENLINEA_CONFIG.apiBase blank, the portal runs on demo data below.
 */
(function () {
  const cfg = window.ENLINEA_CONFIG || {};
  const LIVE = !!cfg.apiBase;
  const DEMO_KEY = 'enlinea_demo_session';

  async function call(path, opts) {
    const res = await fetch(cfg.apiBase.replace(/\/$/, '') + path, Object.assign({
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' }
    }, opts || {}));
    if (res.status === 401) { const e = new Error('signed_out'); e.code = 401; throw e; }
    if (!res.ok) { const e = new Error('request_failed'); e.code = res.status; throw e; }
    return res.status === 204 ? null : res.json();
  }

  /* ---------------- Demo data (two separate client accounts) ---------------- */
  const iso = (d) => d; // dates are ISO strings YYYY-MM-DD
  const DEMO = {
    lk: {
      me: {
        user: { email: 'accounts@lankahome.example', name: 'Dilini' },
        client: { name: 'Lanka Home Goods', currency: 'LKR', packages: ['Growth', 'Rank'], platforms: ['google', 'meta'] }
      },
      contracts: [
        { id: 'c-lk-1', title: 'Growth and Rank retainer', packages: ['Growth', 'Rank'], start_date: iso('2025-11-12'), end_date: iso('2026-11-11'), document_url: null }
      ],
      invoices: [
        // Generated 5 Sep for August, still awaiting internal approval: never returned to the client.
        { id: 'INV-LK-2608', number: 'EL-2608-014', period: '2026-08', status: 'draft', published_at: null },
        { id: 'INV-LK-2607', number: 'EL-2607-014', period: '2026-07', status: 'published', published_at: '2026-08-06', issue_date: '2026-08-05', due_date: '2026-08-25', paid_at: null, currency: 'LKR',
          lines: [
            { kind: 'ad_spend', label: 'Google Ads spend, July', source: 'Google Ads', amount: 182450 },
            { kind: 'ad_spend', label: 'Meta Ads spend, July', source: 'Meta Ads', amount: 146200 },
            { kind: 'fee', label: 'Growth package fee', amount: 300000 },
            { kind: 'fee', label: 'Rank package fee', amount: 300000 }
          ], pay_url: '#demo-pay', pdf_url: null },
        { id: 'INV-LK-2606', number: 'EL-2606-014', period: '2026-06', status: 'published', published_at: '2026-07-06', issue_date: '2026-07-05', due_date: '2026-07-25', paid_at: '2026-07-18', currency: 'LKR',
          lines: [
            { kind: 'ad_spend', label: 'Google Ads spend, June', source: 'Google Ads', amount: 171300 },
            { kind: 'ad_spend', label: 'Meta Ads spend, June', source: 'Meta Ads', amount: 139880 },
            { kind: 'fee', label: 'Growth package fee', amount: 300000 },
            { kind: 'fee', label: 'Rank package fee', amount: 300000 }
          ], pay_url: null, pdf_url: null },
        { id: 'INV-LK-2605', number: 'EL-2605-014', period: '2026-05', status: 'published', published_at: '2026-06-06', issue_date: '2026-06-05', due_date: '2026-06-25', paid_at: '2026-06-20', currency: 'LKR',
          lines: [
            { kind: 'ad_spend', label: 'Google Ads spend, May', source: 'Google Ads', amount: 158020 },
            { kind: 'ad_spend', label: 'Meta Ads spend, May', source: 'Meta Ads', amount: 120400 },
            { kind: 'fee', label: 'Growth package fee', amount: 300000 },
            { kind: 'fee', label: 'Rank package fee', amount: 300000 }
          ], pay_url: null, pdf_url: null }
      ],
      performance: {
        '2026-09': {
          updated_at: '2026-09-28T06:10:00Z', month_to_date: true,
          platforms: [
            { platform: 'google', spend: 128400, results: 41, result_label: 'Leads', actions: ['Paused 14 search keywords that spent without converting', 'Launched a Performance Max campaign for the new sofa range', 'Moved 20% of budget to the best-performing weekday hours'] },
            { platform: 'meta', spend: 97250, results: 63, result_label: 'Leads', actions: ['Tested 3 new carousel ads; the best is now running at full budget', 'Built a lookalike audience from past buyers', 'Fixed the purchase event on the website so sales are tracked again'] }
          ]
        },
        '2026-08': {
          updated_at: '2026-09-03T06:10:00Z', month_to_date: false,
          platforms: [
            { platform: 'google', spend: 179900, results: 52, result_label: 'Leads', actions: ['Restructured campaigns by product category', 'Added call tracking to search ads'] },
            { platform: 'meta', spend: 151300, results: 71, result_label: 'Leads', actions: ['Refreshed creative for the mid-year clearance sale', 'Excluded recent buyers from prospecting ads'] }
          ]
        }
      }
    },
    ca: {
      me: {
        user: { email: 'owner@fraservalleyauto.example', name: 'Marcus' },
        client: { name: 'Fraser Valley Auto', currency: 'USD', packages: ['Growth', 'Reach'], platforms: ['google', 'meta', 'tiktok'] }
      },
      contracts: [
        { id: 'c-ca-2', title: 'Growth and Reach retainer', packages: ['Growth', 'Reach'], start_date: iso('2026-03-01'), end_date: iso('2027-02-28'), document_url: null },
        { id: 'c-ca-1', title: 'Growth retainer', packages: ['Growth'], start_date: iso('2025-03-01'), end_date: iso('2026-02-28'), document_url: null }
      ],
      invoices: [
        { id: 'INV-CA-2608', number: 'EL-2608-031', period: '2026-08', status: 'published', published_at: '2026-09-05', issue_date: '2026-09-05', due_date: '2026-10-05', paid_at: null, currency: 'USD',
          lines: [
            { kind: 'ad_spend', label: 'Google Ads spend, August', source: 'Google Ads', amount: 1240.55 },
            { kind: 'ad_spend', label: 'Meta Ads spend, August', source: 'Meta Ads', amount: 865.10 },
            { kind: 'ad_spend', label: 'TikTok Ads spend, August', source: 'TikTok Ads', amount: 410.00 },
            { kind: 'fee', label: 'Growth package fee', amount: 1000 },
            { kind: 'fee', label: 'Reach package fee', amount: 1000 },
            { kind: 'other', label: 'On-demand video editing (3 videos)', amount: 270 }
          ], pay_url: '#demo-pay', pdf_url: null },
        { id: 'INV-CA-2607', number: 'EL-2607-031', period: '2026-07', status: 'published', published_at: '2026-08-05', issue_date: '2026-08-05', due_date: '2026-09-04', paid_at: '2026-08-21', currency: 'USD',
          lines: [
            { kind: 'ad_spend', label: 'Google Ads spend, July', source: 'Google Ads', amount: 1180.20 },
            { kind: 'ad_spend', label: 'Meta Ads spend, July', source: 'Meta Ads', amount: 790.45 },
            { kind: 'fee', label: 'Growth package fee', amount: 1000 },
            { kind: 'fee', label: 'Reach package fee', amount: 1000 }
          ], pay_url: null, pdf_url: null }
      ],
      performance: {
        '2026-09': {
          updated_at: '2026-09-28T06:10:00Z', month_to_date: true,
          platforms: [
            { platform: 'google', spend: 1105.30, results: 38, result_label: 'Calls and bookings', actions: ['Added winter tyre keywords ahead of the season', 'Raised bids on "near me" searches within 10 km'] },
            { platform: 'meta', spend: 720.80, results: 29, result_label: 'Leads', actions: ['Launched a lead form for free tyre inspections', 'Retargeted site visitors who viewed the booking page'] },
            { platform: 'tiktok', spend: 355.00, results: 14, result_label: 'Leads', actions: ['Posted 4 short videos from this month\'s shot list', 'Boosted the "tyre tread check" video, the best performer so far'] }
          ]
        },
        '2026-08': {
          updated_at: '2026-09-03T06:10:00Z', month_to_date: false,
          platforms: [
            { platform: 'google', spend: 1240.55, results: 44, result_label: 'Calls and bookings', actions: ['Split brand and non-brand campaigns'] },
            { platform: 'meta', spend: 865.10, results: 31, result_label: 'Leads', actions: ['Tested video against image ads; video won'] },
            { platform: 'tiktok', spend: 410.00, results: 12, result_label: 'Leads', actions: ['First TikTok campaign launched'] }
          ]
        }
      }
    }
  };
  const DEMO_ACCOUNTS = [
    { key: 'lk', label: 'Sri Lankan client, billed in LKR', client: DEMO.lk.me.client.name },
    { key: 'ca', label: 'Canadian client, billed in USD', client: DEMO.ca.me.client.name }
  ];
  const demoSession = () => { try { return sessionStorage.getItem(DEMO_KEY); } catch (e) { return null; } };
  const demoData = () => {
    const k = demoSession();
    if (!k || !DEMO[k]) { const e = new Error('signed_out'); e.code = 401; throw e; }
    return DEMO[k];
  };
  const wait = (v) => new Promise((r) => setTimeout(() => r(v), 180));
  const clone = (v) => JSON.parse(JSON.stringify(v));

  /* ---------------- Public API ---------------- */
  window.PortalAPI = {
    live: LIVE,
    demoAccounts: DEMO_ACCOUNTS,

    async login(email, password) {
      if (LIVE) return call('/session', { method: 'POST', body: JSON.stringify({ email, password }) });
      throw Object.assign(new Error('demo_mode'), { code: 'demo' });
    },
    async requestMagicLink(email) {
      if (LIVE) return call('/session/magic-link', { method: 'POST', body: JSON.stringify({ email }) });
      throw Object.assign(new Error('demo_mode'), { code: 'demo' });
    },
    demoLogin(key) {
      try { sessionStorage.setItem(DEMO_KEY, key); } catch (e) { /* ignore */ }
    },
    async logout() {
      if (LIVE) { try { await call('/session', { method: 'DELETE' }); } catch (e) { /* already gone */ } return; }
      try { sessionStorage.removeItem(DEMO_KEY); } catch (e) { /* ignore */ }
    },

    async me() { return LIVE ? call('/me') : wait(clone(demoData().me)); },
    async contracts() { return LIVE ? call('/me/contracts') : wait(clone(demoData().contracts)); },
    async invoices() {
      if (LIVE) return call('/me/invoices'); // server returns published invoices only
      // Demo mirrors the approval gate (SRS 2.2): drafts are never returned.
      return wait(clone(demoData().invoices.filter((i) => i.status === 'published' && i.published_at)));
    },
    async performance(month) {
      if (LIVE) return call('/me/performance?month=' + encodeURIComponent(month));
      return wait(clone(demoData().performance[month] || null));
    },
    months() {
      if (!LIVE) return ['2026-09', '2026-08'];
      const out = []; const d = new Date(); d.setDate(1);
      for (let i = 0; i < 6; i++) { out.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')); d.setMonth(d.getMonth() - 1); }
      return out;
    }
  };
})();
