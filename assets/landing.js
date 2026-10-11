/* Landing helpers: live office times in the ticker, footer year. */
(function () {
  function fmt(tz) {
    try {
      return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz }).format(new Date());
    } catch (e) { return ''; }
  }
  function tick() {
    document.querySelectorAll('[data-clock]').forEach((el) => {
      const t = fmt(el.getAttribute('data-clock'));
      if (t) el.textContent = `${t} ${el.getAttribute('data-label') || ''}`.trim();
    });
  }
  tick();
  setInterval(tick, 30000);

  // Duplicate ticker content once so the scroll loops seamlessly.
  document.querySelectorAll('.ticker-inner').forEach((t) => { t.innerHTML += t.innerHTML; });

  document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
})();
