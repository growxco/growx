// Metricool's official tag reads the full URL and referrer. Fail closed on
// anything outside the public marketing allowlist; never pass form values.
export function createMetricoolTracker({ hosts, paths, hasConsent, win = window, doc = document }) {
  const source = 'https://tracker.metricool.com/resources/be.js';
  let script;
  let sent = false;
  function safeUrl(value, current = false) {
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:' || url.search || url.hash || url.username || url.password) return false;
      if (current || hosts.includes(url.hostname)) return hosts.includes(url.hostname) && paths.includes(url.pathname);
      // External referrers are sent by the official tag too. Only bare origins
      // are accepted, avoiding private paths, identifiers and arbitrary text.
      return url.pathname === '/';
    } catch { return false; }
  }
  function eligible() {
    return hasConsent() && safeUrl(win.location.href, true)
      && (!doc.referrer || safeUrl(doc.referrer));
  }
  function send() {
    if (sent || !eligible() || typeof win.beTracker?.t !== 'function') return;
    sent = true;
    win.beTracker.t({ hash: '900d4a87c72b86f89fd9ee35a9438508' });
  }
  return function start() {
    if (sent || !eligible()) return;
    if (script) { send(); return; }
    // Do not initialize an existing installation a second time.
    if (win.beTracker || doc.querySelector(`script[src="${source}"]`)) return;
    script = doc.createElement('script');
    script.type = 'text/javascript';
    script.src = source;
    script.async = true;
    script.referrerPolicy = 'no-referrer';
    script.onload = send;
    script.onerror = () => { script.remove(); script = null; };
    doc.head.appendChild(script);
  };
}
