/*
 * Lead capture for the New Clients pages (SRS 1.1, 1.2, 1.3).
 * - Package buttons pre-fill the signup form and scroll to it.
 * - Submissions POST to ENLINEA_CONFIG.leadsEndpoint as JSON.
 * - With no endpoint configured, the visitor's email app opens instead,
 *   so a lead is never shown a success message and then lost.
 */
(function () {
  const cfg = window.ENLINEA_CONFIG || {};
  const PACKAGE_NAMES = {
    growth: 'Growth',
    reach: 'Reach',
    rank: 'Rank',
    geo: 'GEO and AI Ads'
  };

  /* Keep ad-campaign parameters for the whole visit so each lead can be
     attributed to the Meta or Google campaign that sent it. */
  const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid'];
  function readUtm() {
    let stored = {};
    try { stored = JSON.parse(sessionStorage.getItem('enlinea_utm') || '{}'); } catch (e) { stored = {}; }
    const params = new URLSearchParams(location.search);
    UTM_KEYS.forEach((k) => { if (params.get(k)) stored[k] = params.get(k); });
    try { sessionStorage.setItem('enlinea_utm', JSON.stringify(stored)); } catch (e) { /* private mode */ }
    return stored;
  }
  const utm = readUtm();

  function track(event, detail) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(Object.assign({ event }, detail || {}));
    if (event === 'lead_submitted' && typeof window.fbq === 'function') window.fbq('track', 'Lead', detail);
    if (event === 'audit_completed' && typeof window.fbq === 'function') window.fbq('trackCustom', 'AuditCompleted', detail);
  }

  async function post(url, payload) {
    if (!url) return false;
    try {
      // No Content-Type header keeps this a "simple" request, which Google
      // Apps Script and most webhooks accept without a CORS preflight.
      const res = await fetch(url, { method: 'POST', body: JSON.stringify(payload) });
      return res.ok || res.type === 'opaque';
    } catch (e) {
      return false;
    }
  }

  function mailtoFallback(payload) {
    const lines = Object.entries(payload)
      .filter(([, v]) => v !== '' && v !== undefined && typeof v !== 'object')
      .map(([k, v]) => `${k}: ${v}`);
    const subject = encodeURIComponent(`New ${payload.package || 'package'} signup from ${payload.business_name || payload.full_name || 'website'}`);
    location.href = `mailto:${cfg.fallbackEmail}?subject=${subject}&body=${encodeURIComponent(lines.join('\n'))}`;
  }

  function prefillPackage(pkg, opts) {
    const form = document.querySelector('[data-signup-form]');
    if (!form) return;
    const select = form.querySelector('[name="package"]');
    if (select && pkg) {
      const label = PACKAGE_NAMES[pkg] || pkg;
      const option = Array.from(select.options).find((o) => o.value === label);
      if (option) select.value = label;
      select.dispatchEvent(new Event('change'));
    }
    if (opts && opts.plan) {
      const hidden = form.querySelector('[name="audit_plan"]');
      if (hidden) hidden.value = opts.plan;
      const visible = form.querySelector('[data-plan-note]');
      if (visible) visible.textContent = `From your audit: ${opts.plan}.`;
    }
    const target = document.getElementById('signup');
    if (target) target.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    const first = form.querySelector('[name="full_name"]');
    if (first) setTimeout(() => first.focus({ preventScroll: true }), 450);
  }

  document.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-signup]');
    if (!btn) return;
    event.preventDefault();
    prefillPackage(btn.getAttribute('data-signup'));
  });

  document.querySelectorAll('[data-signup-form]').forEach((form) => {
    const select = form.querySelector('[name="package"]');
    const price = form.querySelector('[data-selected-price]');
    const keyFor = (label) => Object.keys(PACKAGE_NAMES).find((k) => PACKAGE_NAMES[k] === label);
    const updatePrice = () => {
      if (!select || !price) return;
      const p = cfg.prices && cfg.prices[keyFor(select.value)];
      price.textContent = p ? `${p.amount} ${p.period}` : '';
    };
    if (select) select.addEventListener('change', updatePrice);
    updatePrice();

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const status = form.querySelector('[data-form-status]');
      const button = form.querySelector('button[type="submit"]');
      if (!form.reportValidity()) return;

      const data = Object.fromEntries(new FormData(form).entries());
      const payload = Object.assign({
        type: 'signup',
        form_source: form.getAttribute('data-form-source'),
        page_url: location.href.split('#')[0],
        submitted_at: new Date().toISOString()
      }, data, utm);

      button.disabled = true;
      const label = button.textContent;
      button.textContent = 'Sending…';
      if (status) status.textContent = '';

      const ok = await post(cfg.leadsEndpoint, payload);
      track('lead_submitted', { form_source: payload.form_source, package: payload.package });

      if (ok) {
        try { sessionStorage.setItem('enlinea_last_signup', JSON.stringify({ name: data.full_name, package: data.package })); } catch (e) { /* ignore */ }
        location.href = form.getAttribute('data-thank-you');
        return;
      }

      if (!cfg.leadsEndpoint) {
        // Not wired yet: hand the lead to the visitor's email app, then confirm.
        mailtoFallback(payload);
        try { sessionStorage.setItem('enlinea_last_signup', JSON.stringify({ name: data.full_name, package: data.package, via: 'email' })); } catch (e) { /* ignore */ }
        setTimeout(() => { location.href = form.getAttribute('data-thank-you'); }, 900);
        return;
      }

      button.disabled = false;
      button.textContent = label;
      if (status) status.textContent = `Your details didn't send. Check your connection and try again, or email ${cfg.fallbackEmail}.`;
    });
  });

  // Prices on the page come from config.js so they only need changing once.
  document.querySelectorAll('[data-price]').forEach((el) => {
    const p = cfg.prices && cfg.prices[el.getAttribute('data-price')];
    if (p) el.textContent = p.amount;
  });

  // Arriving from the audit on the other page: ?package=growth#signup
  const incoming = new URLSearchParams(location.search).get('package');
  if (incoming && PACKAGE_NAMES[incoming]) {
    const select = document.querySelector('[data-signup-form] [name="package"]');
    if (select) { select.value = PACKAGE_NAMES[incoming]; select.dispatchEvent(new Event('change')); }
  }

  window.ENLINEA = Object.assign(window.ENLINEA || {}, { prefillPackage, post, track, utm, PACKAGE_NAMES });
})();
