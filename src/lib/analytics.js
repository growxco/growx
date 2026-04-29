/**
 * Grow-X Analytics adapter.
 * Single entrypoint to fire events to GA4 + Meta Pixel + LinkedIn Insight + Microsoft Clarity.
 *
 * All providers are no-ops when their ID env var isn't set.
 * IDs configured via Vite env (VITE_GA_ID, VITE_META_PIXEL_ID, VITE_LINKEDIN_PARTNER_ID, VITE_CLARITY_ID).
 *
 * Snippets injected by `installAnalytics()` on app boot. Idempotent.
 */

const ENV = (import.meta.env || {});
const isBrowser = typeof window !== 'undefined';

let installed = false;

function injectScript(src, attrs = {}) {
  const s = document.createElement('script');
  s.src = src;
  s.async = true;
  Object.entries(attrs).forEach(([k, v]) => s.setAttribute(k, v));
  document.head.appendChild(s);
  return s;
}

export function installAnalytics() {
  if (!isBrowser || installed) return;
  installed = true;

  const ga = ENV.VITE_GA_ID;
  const pixel = ENV.VITE_META_PIXEL_ID;
  const li = ENV.VITE_LINKEDIN_PARTNER_ID;
  const clarity = ENV.VITE_CLARITY_ID;

  // GA4
  if (ga) {
    injectScript(`https://www.googletagmanager.com/gtag/js?id=${ga}`);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', ga, { anonymize_ip: true, send_page_view: true });
  }

  // Meta Pixel
  if (pixel) {
    !function(f,b,e,v,n,t,s){
      if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', pixel);
    window.fbq('track', 'PageView');
  }

  // LinkedIn Insight
  if (li) {
    window._linkedin_partner_id = li;
    window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
    window._linkedin_data_partner_ids.push(li);
    (function(l) {
      if (!l) {
        window.lintrk = function(a,b){window.lintrk.q.push([a,b])};
        window.lintrk.q=[]
      }
      var s = document.getElementsByTagName('script')[0];
      var b = document.createElement('script');
      b.type = 'text/javascript'; b.async = true;
      b.src = 'https://snap.licdn.com/li.lms-analytics/insight.min.js';
      s.parentNode.insertBefore(b, s);
    })(window.lintrk);
  }

  // Microsoft Clarity
  if (clarity) {
    (function(c,l,a,r,i,t,y){
      c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
      t=l.createElement(r);t.async=1;t.src='https://www.clarity.ms/tag/'+i;
      y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, 'clarity', 'script', clarity);
  }
}

/**
 * Fire a high-level conversion event to all enabled providers.
 * @param {string} name event name (snake_case). Examples:
 *   page_view, click_cta_demo, click_cta_waitlist, click_whatsapp,
 *   form_start, form_submit, form_qualified, lead, schedule_demo
 * @param {object} params optional payload (value, currency, page, segment, ...)
 */
export function track(name, params = {}) {
  if (!isBrowser) return;
  const safeParams = { ...params, ts: Date.now() };

  if (ENV.DEV) {
    console.debug('[track]', name, safeParams);
  }

  // GA4
  try { window.gtag?.('event', name, safeParams); } catch {}

  // Meta Pixel — map common ones to standard events
  try {
    const stdMap = {
      lead: 'Lead',
      form_submit: 'Lead',
      schedule_demo: 'Schedule',
      click_cta_waitlist: 'CompleteRegistration',
    };
    if (stdMap[name]) window.fbq?.('track', stdMap[name], safeParams);
    else window.fbq?.('trackCustom', name, safeParams);
  } catch {}

  // LinkedIn — only meaningful on conversions configured server-side
  try { window.lintrk?.('track', { conversion_id: safeParams.li_conversion_id }); } catch {}

  // Vercel Analytics (custom event)
  try { window.va?.('event', { name, data: safeParams }); } catch {}
}

/** Convenience helpers — keep names canonical across the site. */
export const analytics = {
  pageView: (path) => track('page_view', { path }),
  ctaDemo: (page) => track('click_cta_demo', { page }),
  ctaWaitlist: (page) => track('click_cta_waitlist', { page }),
  ctaWhatsApp: (page, intent) => track('click_whatsapp', { page, intent }),
  formStart: (form) => track('form_start', { form }),
  formSubmit: (form, segment) => track('form_submit', { form, segment }),
  formQualified: (form, score) => track('form_qualified', { form, score }),
  scheduleDemo: (segment) => track('schedule_demo', { segment }),
  leadCaptured: (segment, source) => track('lead', { segment, source }),
};
