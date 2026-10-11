/*
 * Automated market audit (SRS 1.3)
 * Flow: details -> scan -> you vs market -> 3-6 month outlook + ranked plan -> signup.
 *
 * Engine: if ENLINEA_CONFIG.auditEndpoint is set, inputs are POSTed there and the
 * response (see docs/BACKEND-HANDOFF.md, "Audit response") is rendered.
 * Otherwise a demo engine produces repeatable sample figures, and every result
 * screen carries a visible "Sample results" notice. Do not run paid ads to the
 * audit in demo mode.
 */
(function () {
  const cfg = window.ENLINEA_CONFIG || {};
  const PKG = {
    growth: { name: 'Growth', area: 'ads' },
    reach: { name: 'Reach', area: 'video' },
    rank: { name: 'Rank', area: 'ai' },
    geo: { name: 'GEO and AI Ads', area: 'gbp' }
  };
  const AREAS = {
    ads: { label: 'Ads and tracking', pkg: 'growth', fix: 'fix ad spend and tracking' },
    video: { label: 'Video content', pkg: 'reach', fix: 'close your video content gap' },
    ai: { label: 'AI answer visibility', pkg: 'rank', fix: 'get cited in AI answers' },
    gbp: { label: 'Google profile and reviews', pkg: 'geo', fix: 'grow reviews and local visibility' }
  };
  const STEPS = ['Your details', 'Scan', 'You vs your market', 'Your next 3–6 months'];
  const INDUSTRIES = ['Automotive', 'Travel and tourism', 'Retail', 'Home and local services', 'Restaurants and food', 'Health and beauty', 'Real estate', 'Education', 'Professional services', 'Other'];

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Demo engine (repeatable per input) ---------- */
  function seeded(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return function () { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const between = (r, a, b) => Math.round(a + r() * (b - a));

  function demoEngine(input) {
    const r = seeded([input.website, input.industry, input.city].join('|').toLowerCase());
    const hasSocial = !!(input.instagram || input.facebook || input.tiktok);
    const area = {
      ads: { you: between(r, 22, 62), market: between(r, 55, 72) },
      video: { you: between(r, hasSocial ? 25 : 8, hasSocial ? 60 : 30), market: between(r, 52, 70) },
      ai: { you: between(r, 12, 55), market: between(r, 40, 62) },
      gbp: { you: between(r, 20, 64), market: between(r, 55, 74) }
    };

    const detail = {
      ads: {
        metrics: [
          { label: 'Ad activity on Meta and Google', you: between(r, 15, 65), market: between(r, 55, 75) },
          { label: 'Landing page quality', you: between(r, 30, 70), market: between(r, 60, 78) },
          { label: 'Conversion tracking set up', you: r() > 0.5 ? 60 : 20, market: 80 }
        ],
        findings: (() => {
          const waste = between(r, 18, 36);
          const out = [`Roughly ${waste}% of a typical monthly budget at your setup is likely going to clicks that don't convert.`];
          if (input.budget) out.push(`Within your stated budget of ${esc(input.budget)} a month, there is room to scale once tracking is fixed, before any increase in spend.`);
          else out.push('Add a monthly budget next time to see your headroom to scale within it.');
          out.push('Conversion tracking is incomplete, so platforms can\'t learn which clicks turn into customers.');
          return out;
        })()
      },
      video: {
        metrics: [
          { label: 'Videos posted per week', you: between(r, 0, 2), market: between(r, 3, 5), unit: 'count' },
          { label: 'Short-form share of posts', you: between(r, 10, 45), market: between(r, 55, 75), unit: '%' },
          { label: 'Posting consistency', you: between(r, 20, 60), market: between(r, 60, 80) }
        ],
        findings: [
          `Businesses in ${esc(input.industry.toLowerCase())} around ${esc(input.city)} post short videos more often than you do.`,
          'Your posts lean on still images; short vertical video is where comparable accounts get reach.',
          'A monthly content calendar with scripted hooks would close most of the gap in 8–12 weeks.'
        ]
      },
      ai: {
        platforms: ['ChatGPT', 'Gemini', 'Google AI Overviews'].map((p) => {
          const x = r();
          return { name: p, status: x > 0.75 ? 'Recommended' : x > 0.4 ? 'Mentioned' : 'Not found' };
        }),
        findings: [
          `When asked for the best ${esc(input.industry.toLowerCase())} options in ${esc(input.city)}, AI tools mostly cite businesses with complete listings and recent reviews.`,
          'Your business details differ slightly between listings, which makes AI tools less confident citing you.',
          'Your website lacks structured information (services, area served, FAQs) that AI tools pull answers from.'
        ]
      },
      gbp: {
        metrics: [
          { label: 'Profile completeness', you: between(r, 40, 80), market: between(r, 82, 95), unit: '%' },
          { label: 'Total Google reviews', you: between(r, 4, 60), market: between(r, 70, 180), unit: 'count' },
          { label: 'Reviews in the last 90 days', you: between(r, 0, 6), market: between(r, 9, 20), unit: 'count' },
          { label: 'Average rating', you: (3.8 + r() * 0.9).toFixed(1), market: (4.3 + r() * 0.4).toFixed(1), unit: 'rating' }
        ],
        competitors: ['Competitor A', 'Competitor B', 'Competitor C'].map((n) => ({
          name: n, reviews: between(r, 80, 260), rating: (4.3 + r() * 0.6).toFixed(1)
        })),
        findings: [
          'Review recency matters as much as volume: AI tools and Google favour businesses with a steady flow of new reviews.',
          'Several profile fields are empty, including services and business description.',
          'A simple request-and-follow-up routine after each sale is the fastest way to lift review volume.'
        ]
      }
    };

    return { demo: true, area, detail };
  }

  async function runEngine(input) {
    if (cfg.auditEndpoint) {
      try {
        const res = await fetch(cfg.auditEndpoint, { method: 'POST', body: JSON.stringify(input) });
        if (res.ok) {
          const data = await res.json();
          data.demo = false;
          return data;
        }
      } catch (e) { /* fall through to demo */ }
      const fallback = demoEngine(input);
      fallback.unavailable = true;
      return fallback;
    }
    return demoEngine(input);
  }

  /* ---------- Ranking, plan and outlook ---------- */
  function rankGaps(result, focus) {
    const areas = Object.keys(AREAS).map((k) => {
      const a = result.area[k];
      return { key: k, gap: Math.max(0, a.market - a.you), you: a.you, market: a.market };
    });
    // Rank by size of gap; ties go to the package the visitor came for.
    areas.sort((a, b) => (b.gap - a.gap) || (a.key === PKG[focus].area ? -1 : 1));
    return areas;
  }

  function planFor(ranked, focus) {
    const gaps = ranked.filter((a) => a.gap >= 8);
    let steps;
    if (focus === 'geo') {
      // GEO and AI Ads covers profile, reviews and AI visibility together.
      const others = gaps.filter((g) => g.key === 'ads' || g.key === 'video');
      steps = [{ pkg: 'geo', why: 'grow reviews and get cited in AI answers' }]
        .concat(others.map((g) => ({ pkg: AREAS[g.key].pkg, why: AREAS[g.key].fix })));
    } else {
      steps = gaps.filter((g) => g.key !== 'gbp').map((g) => ({ pkg: AREAS[g.key].pkg, why: AREAS[g.key].fix }));
      const gbp = gaps.find((g) => g.key === 'gbp');
      if (gbp) steps.push({ pkg: 'geo', why: AREAS.gbp.fix });
    }
    if (!steps.length) steps = [{ pkg: focus, why: 'defend your position as competitors catch up' }];
    const seen = new Set();
    return steps.filter((s) => (seen.has(s.pkg) ? false : seen.add(s.pkg))).slice(0, 3);
  }

  const WHAT_WE_DO = {
    growth: ['Restructure your Meta and Google Ads accounts and fix conversion tracking.', 'Rebuild audience and keyword targeting around your best customers.', 'Adjust bids and budgets every week.', 'Send a monthly report showing cost per result and return on ad spend.'],
    reach: ['Plan a monthly calendar of video ideas mapped to each platform.', 'Write 3 to 5 scripted hooks for every video.', 'Give your team (or an on-demand editor) a shot list to film from.', 'Review what performed after posting and adjust the next month.'],
    rank: ['Audit whether you appear in ChatGPT, Gemini and AI Overviews for your category.', 'Correct and align your business listings everywhere they appear.', 'Add structured content to your website that AI tools can cite.', 'Report on your ranking movement every month.'],
    geo: ['Audit your Google Business Profile and fill every gap.', 'Set up review requests: templates, timing and follow-up.', 'Monitor new reviews and your rating every month.', 'Check how AI tools describe and recommend you, and fix what\'s missing.']
  };

  function outlook(focus, result) {
    const g = result.detail.gbp.metrics;
    const recent = Number(g[2].you) || 0;
    const O = {
      growth: ['Tracking fixed and wasted spend cut back, so the same budget produces more enquiries.', 'A steadier cost per lead and a clear view of which campaigns to scale.'],
      reach: ['A consistent weekly video rhythm and a first read on which formats your audience responds to.', 'A library of proven hooks and formats, with reach growing on the platforms that suit you.'],
      rank: ['Your listings consistent everywhere, and your website structured so AI tools can cite it.', 'Measurable movement in how often AI tools mention or recommend you for your category.'],
      geo: [`A steady flow of new Google reviews, rather than the ${recent} you've had in the last 90 days, and a complete profile.`, 'A review count and rating closer to the local leaders, and more frequent mentions in AI answers.']
    };
    return O[focus];
  }

  /* ---------- Rendering helpers ---------- */
  function fmt(v, unit) {
    if (unit === '%') return `${v}%`;
    if (unit === 'rating') return `${v} ★`;
    if (unit === 'count') return String(v);
    return `${v}/100`;
  }
  function barPct(v, market, unit) {
    const n = Number(v); const m = Number(market);
    if (unit === 'rating') return Math.max(0, Math.min(100, ((n - 3) / 2) * 100));
    if (unit === 'count') return Math.round((n / Math.max(n, m, 1)) * 100);
    return Math.max(0, Math.min(100, n));
  }
  function compareRow(m, marketLabel) {
    const u = m.unit;
    return `
      <div class="cmp-row">
        <div class="cmp-label">${esc(m.label)}</div>
        <div class="cmp-bars">
          <div class="cmp-bar cmp-you"><span style="--w:${barPct(m.you, m.market, u)}%"></span><b>${fmt(m.you, u)}</b><em>You</em></div>
          <div class="cmp-bar cmp-market"><span style="--w:${barPct(m.market, m.you, u)}%"></span><b>${fmt(m.market, u)}</b><em>${esc(marketLabel)}</em></div>
        </div>
      </div>`;
  }

  /* ---------- Widget ---------- */
  function mount(root) {
    const fixed = root.getAttribute('data-audit-package');
    let state = { step: 0, focus: fixed && fixed !== 'choose' ? fixed : 'growth', input: null, result: null, done: 0 };
    const stepper = root.querySelector('[data-audit-steps]');
    const body = root.querySelector('[data-audit-body]');

    function renderStepper() {
      stepper.innerHTML = STEPS.map((s, i) => {
        const cls = i === state.step ? 'is-current' : i < state.step ? 'is-done' : '';
        const clickable = i < state.step && i !== 1;
        return `<li class="${cls}">${clickable ? `<button type="button" data-goto="${i}">` : '<span>'}<i>${i + 1}</i>${esc(s)}${clickable ? '</button>' : '</span>'}</li>`;
      }).join('');
    }

    function go(step) {
      state.step = step;
      renderStepper();
      [renderDetails, renderScan, renderCompare, renderOutlook][step]();
      if (step > 0) {
        const heading = body.querySelector('h3');
        if (heading) { heading.setAttribute('tabindex', '-1'); heading.focus({ preventScroll: true }); }
        root.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
      }
    }

    stepper.addEventListener('click', (e) => {
      const b = e.target.closest('[data-goto]');
      if (b) go(Number(b.getAttribute('data-goto')));
    });

    function renderDetails() {
      const v = state.input || {};
      const chooser = fixed === 'choose' ? `
        <fieldset class="pkg-choice">
          <legend>Which package are you considering?</legend>
          ${['growth', 'reach', 'rank'].map((k) => `<label><input type="radio" name="focus" value="${k}" ${state.focus === k ? 'checked' : ''}/><span>${PKG[k].name}</span></label>`).join('')}
        </fieldset>` : '';
      const showBudget = state.focus === 'growth' || state.focus === 'geo';
      body.innerHTML = `
        <form class="audit-form" novalidate>
          <h3>Tell us where to look</h3>
          <p class="audit-note">Takes about a minute. We compare you against businesses like yours in your area.</p>
          ${chooser}
          <div class="audit-fields">
            <label class="span-2">Website
              <input name="website" type="text" inputmode="url" autocomplete="url" placeholder="yourbusiness.com" value="${esc(v.website)}" required />
              <small class="field-error" data-err="website"></small>
            </label>
            <label>Industry
              <select name="industry" required>
                <option value="">Choose one</option>
                ${INDUSTRIES.map((i) => `<option ${v.industry === i ? 'selected' : ''}>${i}</option>`).join('')}
              </select>
              <small class="field-error" data-err="industry"></small>
            </label>
            <label>City or country you sell in
              <input name="city" type="text" autocomplete="address-level2" placeholder="Colombo, or Vancouver" value="${esc(v.city)}" required />
              <small class="field-error" data-err="city"></small>
            </label>
            <label><span>Instagram <span class="opt">(optional)</span></span><input name="instagram" type="text" placeholder="@handle" value="${esc(v.instagram)}" /></label>
            <label><span>Facebook <span class="opt">(optional)</span></span><input name="facebook" type="text" placeholder="Page name or link" value="${esc(v.facebook)}" /></label>
            <label><span>TikTok <span class="opt">(optional)</span></span><input name="tiktok" type="text" placeholder="@handle" value="${esc(v.tiktok)}" /></label>
            <label ${showBudget ? '' : 'hidden'} data-budget><span>Monthly ad budget <span class="opt">(optional)</span></span><input name="budget" type="text" placeholder="e.g. $600 or LKR 150,000" value="${esc(v.budget)}" /></label>
          </div>
          <div class="audit-actions">
            <button class="btn-primary" type="submit">Run my audit</button>
            <span class="audit-small">Free. No signup needed to see your results.</span>
          </div>
        </form>`;
      const form = body.querySelector('form');
      form.addEventListener('change', (e) => {
        if (e.target.name === 'focus') {
          state.focus = e.target.value;
          const b = form.querySelector('[data-budget]');
          b.hidden = !(state.focus === 'growth');
        }
      });
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const d = Object.fromEntries(new FormData(form).entries());
        const errors = {};
        if (!/^(https?:\/\/)?[\w-]+(\.[\w-]+)+/i.test((d.website || '').trim())) errors.website = 'Enter your website address, like yourbusiness.com';
        if (!d.industry) errors.industry = 'Choose the closest industry';
        if (!(d.city || '').trim()) errors.city = 'Enter the city or country you sell in';
        form.querySelectorAll('[data-err]').forEach((el) => { el.textContent = errors[el.getAttribute('data-err')] || ''; });
        form.querySelectorAll('input, select').forEach((el) => el.setAttribute('aria-invalid', errors[el.name] ? 'true' : 'false'));
        const first = Object.keys(errors)[0];
        if (first) { form.querySelector(`[name="${first}"]`).focus(); return; }
        state.input = { website: d.website.trim(), industry: d.industry, city: d.city.trim(), instagram: d.instagram, facebook: d.facebook, tiktok: d.tiktok, budget: d.budget, package: state.focus };
        go(1);
      });
    }

    const SCAN = {
      growth: ['Looking for active Meta and Google ads', 'Checking your landing page speed and clarity', 'Checking conversion tracking', 'Comparing with businesses like yours nearby'],
      reach: ['Reading your recent posts', 'Counting videos and posting frequency', 'Checking format mix', 'Comparing with businesses like yours nearby'],
      rank: ['Asking ChatGPT about your category', 'Checking Gemini and AI Overviews', 'Checking your listings for consistency', 'Comparing with businesses like yours nearby'],
      geo: ['Checking your Google Business Profile', 'Counting reviews and how recent they are', 'Finding local competitors', 'Asking AI tools who they recommend', 'Checking ads, video and tracking', 'Building your combined GEO score']
    };

    async function renderScan() {
      const items = SCAN[state.focus];
      body.innerHTML = `
        <div class="scan">
          <h3>Scanning ${esc(state.input.website)}</h3>
          <div class="scan-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-label="Audit progress"><span></span></div>
          <ul class="scan-list">${items.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
          <p class="sr-only" aria-live="polite" data-scan-live></p>
        </div>`;
      const bar = body.querySelector('.scan-progress');
      const lis = body.querySelectorAll('.scan-list li');
      const live = body.querySelector('[data-scan-live]');
      const per = reduced() ? 120 : 700;
      const enginePromise = runEngine(state.input);
      for (let i = 0; i < lis.length; i++) {
        lis[i].classList.add('is-active');
        await new Promise((r) => setTimeout(r, per));
        lis[i].classList.remove('is-active');
        lis[i].classList.add('is-done');
        const pct = Math.round(((i + 1) / lis.length) * 100);
        bar.style.setProperty('--p', pct + '%');
        bar.setAttribute('aria-valuenow', pct);
        live.textContent = `${items[i]}: done`;
      }
      state.result = await enginePromise;
      report();
      go(2);
    }

    function demoBanner() {
      if (!state.result.demo) return '';
      const msg = state.result.unavailable
        ? 'Our live audit is busy right now, so these are sample figures. We\'ll send your full report by email when you sign up.'
        : 'Sample results. The live audit engine isn\'t connected yet, so these figures are illustrative.';
      return `<p class="demo-banner" role="note">${msg}</p>`;
    }

    function renderCompare() {
      const res = state.result; const f = state.focus; const inp = state.input;
      const marketLabel = `Typical in ${inp.city}`;
      const areaKey = PKG[f].area;
      const main = res.area[areaKey];
      let detailHtml = '';

      if (f === 'rank' || f === 'geo') {
        detailHtml += `<div class="ai-grid">${res.detail.ai.platforms.map((p) => `<div class="ai-cell ai-${p.status.split(' ')[0].toLowerCase()}"><span>${esc(p.name)}</span><b>${esc(p.status)}</b></div>`).join('')}</div>`;
      }
      if (f === 'geo') {
        detailHtml += res.detail.gbp.metrics.map((m) => compareRow(m, marketLabel)).join('');
        detailHtml += `
          <h4>Local competitors currently ahead of you</h4>
          <table class="comp-table"><thead><tr><th scope="col">Business</th><th scope="col">Reviews</th><th scope="col">Rating</th></tr></thead><tbody>
          ${res.detail.gbp.competitors.map((c) => `<tr><td>${esc(c.name)}${res.demo ? ' <span class="opt">example</span>' : ''}</td><td>${esc(c.reviews)}</td><td>${esc(c.rating)} ★</td></tr>`).join('')}
          <tr class="is-you"><td>You</td><td>${esc(res.detail.gbp.metrics[1].you)}</td><td>${esc(res.detail.gbp.metrics[3].you)} ★</td></tr>
          </tbody></table>`;
        detailHtml += ['ads', 'video'].map((k) => compareRow({ label: AREAS[k].label, you: res.area[k].you, market: res.area[k].market }, marketLabel)).join('');
      } else if (f !== 'rank') {
        detailHtml += res.detail[areaKey].metrics.map((m) => compareRow(m, marketLabel)).join('');
      }

      const scoreName = f === 'geo' ? 'Combined GEO score' : f === 'rank' ? 'AI visibility score' : `${AREAS[areaKey].label} score`;
      const combined = f === 'geo' ? Math.round((res.area.gbp.you * 0.4) + (res.area.ai.you * 0.4) + (res.area.ads.you * 0.1) + (res.area.video.you * 0.1)) : main.you;
      const combinedMarket = f === 'geo' ? Math.round((res.area.gbp.market * 0.4) + (res.area.ai.market * 0.4) + (res.area.ads.market * 0.1) + (res.area.video.market * 0.1)) : main.market;
      const ahead = combined >= combinedMarket;

      const others = Object.keys(AREAS).filter((k) => k !== areaKey && f !== 'geo');

      body.innerHTML = `
        ${demoBanner()}
        <div class="result-head">
          <div class="score-dial" style="--s:${combined}" aria-hidden="true"><b>${combined}</b><span>of 100</span></div>
          <div>
            <h3>${esc(scoreName)}: ${combined}. ${ahead ? 'You\'re ahead of most of your market.' : `Businesses like yours in ${esc(inp.city)} average ${combinedMarket}.`}</h3>
            <p>${ahead ? 'The job now is to defend that lead as competitors catch up.' : `That gap is where customers are choosing someone else. Here's where it comes from.`}</p>
          </div>
        </div>
        <div class="cmp-block">${detailHtml}</div>
        <h4>What we found</h4>
        <ul class="finding-list">${(f === 'geo' ? res.detail.gbp.findings.concat(res.detail.ai.findings.slice(0, 1)) : res.detail[areaKey].findings).map((x) => `<li>${res.demo ? x : esc(x)}</li>`).join('')}</ul>
        ${others.length ? `<h4>Also worth knowing</h4><div class="mini-scores">${others.map((k) => `<div><span>${AREAS[k].label}</span><b>${res.area[k].you}</b><em>market ${res.area[k].market}</em></div>`).join('')}</div>` : ''}
        <div class="audit-actions"><button class="btn-primary" type="button" data-next>See your next 3–6 months</button></div>`;
      body.querySelector('[data-next]').addEventListener('click', () => go(3));
    }

    function renderOutlook() {
      const res = state.result; const f = state.focus;
      const ranked = rankGaps(res, f);
      const plan = planFor(ranked, f);
      state.plan = plan;
      const [three, six] = outlook(plan[0].pkg, res);
      const first = plan[0].pkg;
      const planText = plan.map((p, i) => `${i === 0 ? 'Start with' : 'then'} ${PKG[p.pkg].name}`).join(', ');
      body.innerHTML = `
        ${demoBanner()}
        <h3>Your plan, in order of what matters most</h3>
        <ol class="plan-list">
          ${plan.map((p, i) => `<li><b>${i === 0 ? 'Start with' : 'Then'} ${esc(PKG[p.pkg].name)}</b><span>to ${esc(p.why)}${i > 0 ? ', once the step before is stable' : ''}.</span></li>`).join('')}
        </ol>
        <h4>What En Linea would do first</h4>
        <ul class="finding-list">${WHAT_WE_DO[first].map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
        <div class="outlook">
          <div><span>After 3 months</span><p>${esc(three)}</p></div>
          <div><span>After 6 months</span><p>${esc(six)}</p></div>
        </div>
        <p class="audit-small outlook-note">An estimate based on businesses starting from a similar position. Results depend on your market, budget and how quickly changes go live.</p>
        <div class="audit-actions">
          <button class="btn-primary" type="button" data-go-signup>Sign up for ${esc(PKG[first].name)}</button>
          <button class="btn-ghost" type="button" data-restart>Audit another business</button>
        </div>`;
      body.querySelector('[data-go-signup]').addEventListener('click', () => {
        const target = PKG[first];
        const onPage = document.querySelector(`[data-signup-form] option[value="${target.name}"]`);
        if (onPage && window.ENLINEA) {
          window.ENLINEA.prefillPackage(first, { plan: planText });
        } else {
          // Recommended package lives on the other landing page.
          const url = first === 'geo' ? '/geo-ai-ads#signup' : `/packages?package=${first}#signup`;
          location.href = url;
        }
      });
      body.querySelector('[data-restart]').addEventListener('click', () => { state.input = null; go(0); });
    }

    function report() {
      if (!window.ENLINEA) return;
      const ranked = rankGaps(state.result, state.focus);
      const plan = planFor(ranked, state.focus);
      const payload = Object.assign({
        type: 'audit_run',
        form_source: root.getAttribute('data-form-source'),
        page_url: location.href.split('#')[0],
        submitted_at: new Date().toISOString(),
        demo_results: !!state.result.demo,
        scores: Object.fromEntries(Object.keys(AREAS).map((k) => [k, state.result.area[k].you])),
        market: Object.fromEntries(Object.keys(AREAS).map((k) => [k, state.result.area[k].market])),
        suggested_packages: plan.map((p) => PKG[p.pkg].name).join(' > ')
      }, state.input, window.ENLINEA.utm);
      window.ENLINEA.post(cfg.auditLeadsEndpoint || cfg.leadsEndpoint, payload);
      window.ENLINEA.track('audit_completed', { package: PKG[state.focus].name });
    }

    // Package cards can open the audit with their package already chosen.
    document.addEventListener('click', (e) => {
      const b = e.target.closest('[data-audit-open]');
      if (!b) return;
      e.preventDefault();
      if (fixed === 'choose') state.focus = b.getAttribute('data-audit-open');
      go(0);
      root.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
      setTimeout(() => { const w = root.querySelector('[name="website"]'); if (w) w.focus({ preventScroll: true }); }, 450);
    });

    go(0);
  }

  document.querySelectorAll('[data-audit]').forEach(mount);
})();
