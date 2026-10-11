/*
 * Client dashboard (SRS Part 2).
 * Answers the three questions: am I still under contract, have I paid what I
 * owe, and what did the agency do for me this month.
 * All data comes from PortalAPI, which only ever asks for "my" data.
 */
(function () {
  const api = window.PortalAPI;
  const cfg = window.ENLINEA_CONFIG || {};
  const WARN_DAYS = cfg.contractWarningDays || 60;
  const view = document.querySelector('[data-view]');
  const dialog = document.querySelector('[data-invoice-dialog]');
  const PLATFORM = { google: 'Google Ads', meta: 'Meta Ads', tiktok: 'TikTok Ads' };
  const state = { me: null, contracts: null, invoices: null, perf: {}, month: api.months()[0] };

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const parse = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
  const daysUntil = (iso) => Math.round((parse(iso) - today()) / 86400000);
  const fmtDate = (iso) => parse(iso.slice(0, 10)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const monthName = (ym) => { const [y, m] = ym.split('-').map(Number); return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }); };
  const money = (n, cur) => {
    const v = Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return cur === 'USD' ? `$${v}` : `${cur} ${v}`;
  };
  const moneyShort = (n, cur) => {
    const v = Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 });
    return cur === 'USD' ? `$${v}` : `${cur} ${v}`;
  };
  const total = (inv) => inv.lines.reduce((s, l) => s + Number(l.amount), 0);
  const invStatus = (inv) => (inv.paid_at ? 'paid' : daysUntil(inv.due_date) < 0 ? 'overdue' : 'unpaid');
  const contractStatus = (c) => { const d = daysUntil(c.end_date); return d < 0 ? 'ended' : d <= WARN_DAYS ? 'expiring' : 'active'; };
  const chip = (kind, text) => `<span class="chip chip-${kind}">${esc(text || kind)}</span>`;

  function signedOut() { location.replace('/client/login'); }
  async function load(fn) {
    try { return await fn(); } catch (e) { if (e.code === 401) signedOut(); throw e; }
  }

  /* ---------------- Views ---------------- */
  function renderOverview() {
    const cur = state.me.client.currency;
    const current = state.contracts.filter((c) => contractStatus(c) !== 'ended').sort((a, b) => a.end_date.localeCompare(b.end_date))[0];
    const open = state.invoices.filter((i) => invStatus(i) !== 'paid');
    const overdue = open.filter((i) => invStatus(i) === 'overdue');
    const owed = open.reduce((s, i) => s + total(i), 0);
    const perf = state.perf[state.month];
    const actions = perf ? perf.platforms.reduce((s, p) => s + p.actions.length, 0) : 0;
    const results = perf ? perf.platforms.reduce((s, p) => s + p.results, 0) : 0;

    let contractCard;
    if (!current) {
      contractCard = `<div class="big">No active contract</div><p class="sub">Your last contract has ended. Talk to your account manager about renewing.</p>`;
    } else {
      const d = daysUntil(current.end_date);
      contractCard = `<div class="big">${d <= WARN_DAYS ? `${d} days left` : 'Yes, active'}</div>
        <p class="sub">${esc(current.title)} runs until ${fmtDate(current.end_date)}.${d <= WARN_DAYS ? ' Your account manager will be in touch about renewal.' : ''}</p>`;
    }

    view.innerHTML = `
      <div class="page-head"><div><h1>Hi ${esc(state.me.user.name || '')}.</h1><p>Here's where your account stands today.</p></div></div>
      ${overdue.length ? `<div class="notice warn" role="alert"><span class="dot"></span><div><b>${overdue.length} invoice${overdue.length > 1 ? 's are' : ' is'} overdue.</b> <a href="#billing" class="text-link">Review and pay</a></div></div>` : ''}
      <div class="answers">
        <a class="answer ${current && daysUntil(current.end_date) <= WARN_DAYS ? 'dark' : ''}" href="#contracts">
          <span class="q">Am I still under contract?</span>${contractCard}
          <span class="go"><span>See contracts</span></span>
        </a>
        <a class="answer ${overdue.length ? 'dark' : ''}" href="#billing">
          <span class="q">Have I paid what I owe?</span>
          <div class="big">${open.length ? moneyShort(owed, cur) : 'All paid'}</div>
          <p class="sub">${open.length ? `${open.length} open invoice${open.length > 1 ? 's' : ''}${overdue.length ? `, ${overdue.length} overdue` : ''}.` : 'Nothing outstanding. Thank you.'}</p>
          <span class="go"><span>${open.length ? 'Pay now' : 'See invoices'}</span></span>
        </a>
        <a class="answer" href="#performance">
          <span class="q">What did En Linea do this month?</span>
          <div class="big">${actions} actions</div>
          <p class="sub">${perf ? `Across ${perf.platforms.map((p) => PLATFORM[p.platform]).join(', ')}, producing ${results} results so far in ${monthName(state.month).split(' ')[0]}.` : 'This month\'s summary will appear once data syncs.'}</p>
          <span class="go"><span>See the summary</span></span>
        </a>
      </div>`;
  }

  function renderContracts() {
    const rows = state.contracts.slice().sort((a, b) => b.end_date.localeCompare(a.end_date));
    const soon = rows.filter((c) => contractStatus(c) === 'expiring');
    view.innerHTML = `
      <div class="page-head"><div><h1>Contracts</h1><p>Managed by your account manager. Contact them to change or renew.</p></div></div>
      ${soon.map((c) => `<div class="notice warn" role="status"><span class="dot"></span><div><b>${esc(c.title)} ends in ${daysUntil(c.end_date)} days</b>, on ${fmtDate(c.end_date)}. Your account manager will contact you about renewal, or email <a class="text-link" href="mailto:info@enlineacreative.com">info@enlineacreative.com</a>.</div></div>`).join('')}
      ${rows.length ? `<div class="table-wrap"><table class="data">
        <thead><tr><th scope="col">Contract</th><th scope="col">Start</th><th scope="col">End</th><th scope="col">Status</th><th scope="col" class="act"><span class="sr-only">Document</span></th></tr></thead>
        <tbody>${rows.map((c) => {
          const st = contractStatus(c);
          const label = st === 'expiring' ? `Ends in ${daysUntil(c.end_date)} days` : st === 'ended' ? 'Ended' : 'Active';
          return `<tr class="${st === 'expiring' ? 'is-alert' : ''}"><td><div class="row-title">${esc(c.title)}</div><div class="row-sub">${esc(c.packages.join(' + '))}</div></td>
            <td>${fmtDate(c.start_date)}</td><td>${fmtDate(c.end_date)}</td><td>${chip(st, label)}</td>
            <td class="act">${c.document_url ? `<a class="btn-s" href="${esc(c.document_url)}" target="_blank" rel="noopener">View PDF</a>` : '<span class="mono-s">PDF on request</span>'}</td></tr>`;
        }).join('')}</tbody></table></div>` : '<div class="empty">No contracts on file yet. Your account manager adds them here once signed.</div>'}`;
  }

  function renderBilling(filter) {
    filter = filter || 'all';
    const cur = state.me.client.currency;
    const all = state.invoices.slice().sort((a, b) => b.issue_date.localeCompare(a.issue_date));
    const rows = filter === 'all' ? all : all.filter((i) => (filter === 'open' ? invStatus(i) !== 'paid' : invStatus(i) === 'paid'));
    const open = all.filter((i) => invStatus(i) !== 'paid');
    const paidYear = all.filter((i) => i.paid_at && i.paid_at.slice(0, 4) === String(new Date().getFullYear())).reduce((s, i) => s + total(i), 0);
    view.innerHTML = `
      <div class="page-head"><div><h1>Billing</h1><p>Invoices are issued on the 5th for the month before, after our team checks the numbers. Ad spend is pulled from each platform, not estimated.</p></div></div>
      <div class="filters">
        <div class="seg" role="group" aria-label="Filter invoices">
          ${[['all', 'All'], ['open', 'To pay'], ['paid', 'Paid']].map(([k, l]) => `<button type="button" data-filter="${k}" aria-pressed="${filter === k}">${l}</button>`).join('')}
        </div>
        <div class="totals">
          <div><span>Outstanding</span><b>${money(open.reduce((s, i) => s + total(i), 0), cur)}</b></div>
          <div><span>Paid this year</span><b>${money(paidYear, cur)}</b></div>
        </div>
      </div>
      ${rows.length ? `<div class="table-wrap"><table class="data">
        <thead><tr><th scope="col">Invoice</th><th scope="col">Issued</th><th scope="col">Due</th><th scope="col">Status</th><th scope="col" class="num">Amount</th><th scope="col" class="act"><span class="sr-only">Actions</span></th></tr></thead>
        <tbody>${rows.map((i) => {
          const st = invStatus(i);
          return `<tr class="${st === 'overdue' ? 'is-alert' : ''}">
            <td><div class="row-title">${esc(monthName(i.period))}</div><div class="row-sub">${esc(i.number)}</div></td>
            <td>${fmtDate(i.issue_date)}</td><td>${fmtDate(i.due_date)}</td>
            <td>${chip(st, st === 'paid' ? `Paid ${fmtDate(i.paid_at)}` : st)}</td>
            <td class="num">${money(total(i), i.currency)}</td>
            <td class="act"><button type="button" class="btn-s" data-open-inv="${esc(i.id)}">View</button>${st !== 'paid' && i.pay_url ? `<button type="button" class="btn-s pay" data-pay-inv="${esc(i.id)}">Pay</button>` : ''}</td>
          </tr>`;
        }).join('')}</tbody></table></div>` : `<div class="empty">${filter === 'open' ? 'Nothing to pay right now.' : 'No invoices here yet.'}</div>`}`;
    view.querySelectorAll('[data-filter]').forEach((b) => b.addEventListener('click', () => renderBilling(b.getAttribute('data-filter'))));
  }

  async function renderPerformance() {
    const months = api.months();
    const perf = state.perf[state.month] !== undefined ? state.perf[state.month] : (state.perf[state.month] = await load(() => api.performance(state.month)));
    const cur = state.me.client.currency;
    const allowed = state.me.client.platforms;
    const plats = perf ? perf.platforms.filter((p) => allowed.includes(p.platform)) : [];
    view.innerHTML = `
      <div class="page-head">
        <div><h1>${esc(monthName(state.month))}</h1><p>${perf && perf.month_to_date ? 'Month to date. ' : ''}Pulled from your ad accounts${perf ? `, last updated ${new Date(perf.updated_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}` : ''}.</p></div>
        <div class="month-pick"><label for="month">Month</label>
          <select id="month">${months.map((m) => `<option value="${m}" ${m === state.month ? 'selected' : ''}>${esc(monthName(m))}</option>`).join('')}</select></div>
      </div>
      ${plats.length ? `<div class="plat-grid">${plats.map((p) => `
        <section class="plat" aria-labelledby="plat-${p.platform}">
          <div class="plat-head"><h2 id="plat-${p.platform}">${PLATFORM[p.platform]}</h2></div>
          <div class="plat-kpis">
            <div><span>Spend</span><b>${moneyShort(p.spend, cur)}</b></div>
            <div><span>${esc(p.result_label)}</span><b>${p.results}</b></div>
            <div><span>Cost each</span><b>${moneyShort(p.results ? p.spend / p.results : 0, cur)}</b></div>
          </div>
          <h3>What we did</h3>
          <ul>${p.actions.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>
        </section>`).join('')}</div>` : '<div class="empty">No activity recorded for this month yet. Data syncs from your ad accounts daily.</div>'}`;
    view.querySelector('#month').addEventListener('change', (e) => { state.month = e.target.value; renderPerformance(); });
  }

  /* ---------------- Invoice dialog ---------------- */
  function openInvoice(id) {
    const i = state.invoices.find((x) => x.id === id);
    if (!i) return;
    const st = invStatus(i);
    const groups = [['ad_spend', 'Ad spend (actual, from platforms)'], ['fee', 'Agency fees'], ['other', 'Other fees']];
    dialog.innerHTML = `
      <div class="inv-top">
        <div><span class="mono-s">${esc(i.number)}</span><h2 id="inv-title">Invoice for ${esc(monthName(i.period))}</h2><div style="margin-top:10px">${chip(st, st === 'paid' ? 'Paid' : st)}</div></div>
        <button type="button" class="inv-close" data-close aria-label="Close">×</button>
      </div>
      <div class="inv-body">
        <div class="inv-meta">
          <div><span>Billed to</span><b>${esc(state.me.client.name)}</b></div>
          <div><span>Issued</span><b>${fmtDate(i.issue_date)}</b></div>
          <div><span>${st === 'paid' ? 'Paid' : 'Due'}</span><b>${fmtDate(st === 'paid' ? i.paid_at : i.due_date)}</b></div>
        </div>
        <table class="inv-lines">
          <thead><tr><th scope="col">Item</th><th scope="col" class="num">Amount (${esc(i.currency)})</th></tr></thead>
          <tbody>${groups.map(([k, label]) => {
            const lines = i.lines.filter((l) => l.kind === k);
            if (!lines.length) return '';
            return `<tr class="grp"><td colspan="2">${label}</td></tr>` + lines.map((l) => `<tr><td>${esc(l.label)}${l.source ? `<span class="src">Source: ${esc(l.source)}</span>` : ''}</td><td class="num">${money(l.amount, i.currency)}</td></tr>`).join('');
          }).join('')}</tbody>
          <tfoot><tr><td>Total</td><td class="num">${money(total(i), i.currency)}</td></tr></tfoot>
        </table>
        <div class="inv-actions">
          ${st !== 'paid' && i.pay_url ? `<button type="button" class="btn-primary" data-pay>Pay ${money(total(i), i.currency)}</button>` : ''}
          <button type="button" class="btn-ghost" data-download>Download PDF</button>
        </div>
        <p class="inv-status-msg" data-inv-msg role="status"></p>
      </div>`;
    dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
    const pay = dialog.querySelector('[data-pay]');
    if (pay) pay.addEventListener('click', () => payInvoice(i, dialog.querySelector('[data-inv-msg]')));
    dialog.querySelector('[data-download]').addEventListener('click', () => {
      if (i.pdf_url) window.open(i.pdf_url, '_blank', 'noopener');
      else window.print(); // choose "Save as PDF" in the print dialog
    });
    dialog.showModal();
  }

  function payInvoice(i, msgEl) {
    if (!i.pay_url || i.pay_url.startsWith('#demo')) {
      const text = 'In the live dashboard this opens a secure payment page for this invoice. Payments aren\'t connected in this preview.';
      if (msgEl) msgEl.textContent = text; else alert(text);
      return;
    }
    window.open(i.pay_url, '_blank', 'noopener');
  }

  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  document.addEventListener('click', (e) => {
    const o = e.target.closest('[data-open-inv]');
    if (o) openInvoice(o.getAttribute('data-open-inv'));
    const p = e.target.closest('[data-pay-inv]');
    if (p) { openInvoice(p.getAttribute('data-pay-inv')); }
  });

  /* ---------------- Routing ---------------- */
  const ROUTES = { overview: renderOverview, contracts: renderContracts, billing: () => renderBilling('all'), performance: renderPerformance };
  function route() {
    const key = (location.hash || '#overview').slice(1);
    const name = ROUTES[key] ? key : 'overview';
    document.querySelectorAll('[data-tab]').forEach((a) => {
      if (a.getAttribute('data-tab') === name) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    ROUTES[name]();
    const h = view.querySelector('h1');
    if (h && document.activeElement && document.activeElement.closest('.tabs, .answer')) { h.setAttribute('tabindex', '-1'); h.focus(); }
  }

  async function init() {
    try {
      const [me, contracts, invoices, perf] = await Promise.all([
        load(() => api.me()), load(() => api.contracts()), load(() => api.invoices()), load(() => api.performance(state.month))
      ]);
      Object.assign(state, { me, contracts, invoices });
      state.perf[state.month] = perf;
    } catch (e) {
      if (e.code !== 401) view.innerHTML = '<div class="empty">We couldn\'t load your account. Refresh the page, or email info@enlineacreative.com if it keeps happening.</div>';
      return;
    }
    document.querySelector('[data-client-name]').textContent = state.me.client.name;
    document.querySelector('[data-user-email]').textContent = state.me.user.email;
    const due = state.invoices.filter((i) => invStatus(i) !== 'paid').length;
    if (due) document.querySelector('[data-tab="billing"]').insertAdjacentHTML('beforeend', `<span class="count" aria-label="${due} to pay">${due}</span>`);
    if (!api.live) document.querySelector('[data-demo-strip]').hidden = false;
    route();
  }

  window.addEventListener('hashchange', route);
  document.querySelector('[data-signout]').addEventListener('click', async () => { await api.logout(); location.href = '/client/login'; });
  const sw = document.querySelector('[data-switch]');
  if (sw) sw.addEventListener('click', async () => { await api.logout(); location.href = '/client/login'; });
  init();
})();
