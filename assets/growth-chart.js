/*
 * Client growth chart (SRS 2.4)
 * PLACEHOLDER FIGURES from the requirements study. Replace GROWTH_DATA with a
 * live pull from the reporting tool (Windsor.ai) once Meta Ads and every client
 * account are connected, then set GROWTH_DATA_IS_PLACEHOLDER to false.
 */
(function () {
  const GROWTH_DATA_IS_PLACEHOLDER = true;
  const MONTHS = ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
  const GROWTH_DATA = [
    { client: 'W Tires', industry: 'Automotive', color: '#12151B', points: { Mar: [600, 25], Jun: [650, 22], Aug: [750, 30] } },
    { client: 'Travel360', industry: 'Travel', color: '#FF4E32', points: { Mar: [400, 18], Jun: [480, 24], Aug: [520, 29] } },
    { client: 'The Body Shop LK', industry: 'Retail', color: '#1E4D3D', points: { Mar: [900, 60], Jun: [1050, 74], Aug: [1200, 88] } },
    { client: 'Towmaster', industry: 'Services', color: '#B7791F', points: { Mar: [300, 15], Jun: [340, 19], Aug: [390, 23] } }
  ];
  const METRICS = {
    leads: { label: 'Leads and conversions', get: (p) => p[1], fmt: (v) => `${v}` },
    spend: { label: 'Ad spend', get: (p) => p[0], fmt: (v) => `$${v.toLocaleString()}` },
    cpl: { label: 'Cost per lead', get: (p) => p[0] / p[1], fmt: (v) => `$${v.toFixed(2)}` }
  };

  function mount(root) {
    let metric = 'leads';
    const hidden = new Set();
    const svgWrap = root.querySelector('[data-chart-canvas]');
    const legend = root.querySelector('[data-chart-legend]');
    const tip = root.querySelector('[data-chart-tip]');
    const summary = root.querySelector('[data-chart-summary]');
    const table = root.querySelector('[data-chart-table]');
    const note = root.querySelector('[data-chart-note]');
    if (note) note.hidden = !GROWTH_DATA_IS_PLACEHOLDER;

    root.querySelectorAll('[data-metric]').forEach((b) => {
      b.addEventListener('click', () => {
        metric = b.getAttribute('data-metric');
        root.querySelectorAll('[data-metric]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        draw();
      });
    });

    legend.innerHTML = GROWTH_DATA.map((d, i) => `
      <button type="button" aria-pressed="true" data-series="${i}" style="--c:${d.color}">
        <i></i><span>${d.industry}</span><small>${d.client}</small>
      </button>`).join('');
    legend.addEventListener('click', (e) => {
      const b = e.target.closest('[data-series]');
      if (!b) return;
      const i = Number(b.getAttribute('data-series'));
      if (hidden.has(i)) hidden.delete(i); else if (hidden.size < GROWTH_DATA.length - 1) hidden.add(i);
      b.setAttribute('aria-pressed', String(!hidden.has(i)));
      draw();
    });

    function draw() {
      const W = 720, H = 360, pad = { l: 58, r: 132, t: 20, b: 40 };
      const M = METRICS[metric];
      const visible = GROWTH_DATA.map((d, i) => ({ d, i })).filter((x) => !hidden.has(x.i));
      const vals = visible.flatMap(({ d }) => Object.values(d.points).map(M.get));
      const max = Math.max(...vals) * 1.12;
      const min = metric === 'cpl' ? Math.min(...vals) * 0.8 : 0;
      const x = (m) => pad.l + (MONTHS.indexOf(m) / (MONTHS.length - 1)) * (W - pad.l - pad.r);
      const y = (v) => pad.t + (1 - (v - min) / (max - min)) * (H - pad.t - pad.b);
      const ticks = 4;
      let g = '';
      for (let t = 0; t <= ticks; t++) {
        const v = min + ((max - min) * t) / ticks;
        g += `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y(v)}" y2="${y(v)}" class="gc-grid"/><text x="${pad.l - 10}" y="${y(v) + 4}" class="gc-axis" text-anchor="end">${M.fmt(metric === 'leads' ? Math.round(v) : Math.round(v))}</text>`;
      }
      MONTHS.forEach((m) => { g += `<text x="${x(m)}" y="${H - 12}" class="gc-axis" text-anchor="middle">${m}</text>`; });

      const labelYs = [];
      visible.forEach(({ d, i }) => {
        const pts = MONTHS.filter((m) => d.points[m]).map((m) => [x(m), y(M.get(d.points[m])), m, M.get(d.points[m])]);
        g += `<polyline points="${pts.map((p) => p.slice(0, 2).join(',')).join(' ')}" fill="none" stroke="${d.color}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>`;
        pts.forEach((p) => {
          g += `<circle cx="${p[0]}" cy="${p[1]}" r="6" fill="#fff" stroke="${d.color}" stroke-width="3" tabindex="0" class="gc-pt" data-i="${i}" data-m="${p[2]}" aria-label="${d.client}, ${d.industry}, ${p[2]} 2026: ${M.label.toLowerCase()} ${M.fmt(p[3])}"/>`;
        });
        const last = pts[pts.length - 1];
        let ly = last[1];
        labelYs.forEach((o) => { if (Math.abs(o - ly) < 18) ly = o + 18; });
        labelYs.push(ly);
        g += `<text x="${last[0] + 12}" y="${ly + 4}" class="gc-end" fill="${d.color}">${d.industry}</text>`;
      });

      svgWrap.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${M.label} by industry, March to August 2026">${g}</svg>`;

      svgWrap.querySelectorAll('.gc-pt').forEach((c) => {
        const show = () => {
          const d = GROWTH_DATA[Number(c.getAttribute('data-i'))];
          const p = d.points[c.getAttribute('data-m')];
          tip.innerHTML = `<b>${d.client}</b><span>${d.industry} · ${c.getAttribute('data-m')} 2026</span><span>Ad spend ${METRICS.spend.fmt(p[0])}</span><span>Leads ${p[1]}</span><span>Cost per lead ${METRICS.cpl.fmt(p[0] / p[1])}</span>`;
          const box = svgWrap.getBoundingClientRect();
          const cb = c.getBoundingClientRect();
          tip.style.left = `${Math.min(cb.left - box.left + 14, box.width - 190)}px`;
          tip.style.top = `${cb.top - box.top - 10}px`;
          tip.hidden = false;
        };
        c.addEventListener('mouseenter', show);
        c.addEventListener('focus', show);
        c.addEventListener('mouseleave', () => { tip.hidden = true; });
        c.addEventListener('blur', () => { tip.hidden = true; });
      });

      // One-line takeaway for the selected metric.
      const change = visible.map(({ d }) => {
        const a = M.get(d.points.Mar), b = M.get(d.points.Aug);
        return { d, pct: Math.round(((b - a) / a) * 100) };
      });
      if (summary) {
        if (metric === 'leads') summary.textContent = `Leads grew in every industry shown, from +${Math.min(...change.map((c) => c.pct))}% to +${Math.max(...change.map((c) => c.pct))}% between March and August.`;
        else if (metric === 'spend') summary.textContent = 'Budgets were raised gradually as results held, not all at once.';
        else summary.textContent = `Cost per lead moved between ${Math.min(...change.map((c) => c.pct))}% and ${Math.max(...change.map((c) => c.pct))}% from March to August as spend scaled.`;
      }
    }

    if (table) {
      table.innerHTML = `<table class="comp-table"><thead><tr><th scope="col">Client</th><th scope="col">Industry</th><th scope="col">Month</th><th scope="col">Ad spend</th><th scope="col">Leads</th></tr></thead><tbody>${GROWTH_DATA.flatMap((d) => Object.entries(d.points).map(([m, p]) => `<tr><td>${d.client}</td><td>${d.industry}</td><td>${m} 2026</td><td>$${p[0].toLocaleString()}</td><td>${p[1]}</td></tr>`)).join('')}</tbody></table>`;
    }
    draw();
  }

  document.querySelectorAll('[data-growth-chart]').forEach(mount);
})();
