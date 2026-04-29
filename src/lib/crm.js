/**
 * Grow-X CRM adapter.
 * Wires forms to a configurable webhook (HubSpot, Brevo, Make, n8n, Zapier or backend).
 *
 * Resolution order:
 *  1. VITE_CRM_WEBHOOK_URL — preferred (any HTTPS endpoint accepting JSON POST)
 *  2. VITE_FORMSUBMIT_EMAIL — fallback to https://formsubmit.co (no backend needed)
 *  3. mailto: as ultimate fallback (degraded but functional)
 *
 * UTM, referrer and session metadata are added automatically.
 */

import { analytics } from './analytics';

const ENV = (import.meta.env || {});
const isBrowser = typeof window !== 'undefined';

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid', 'li_fat_id'];

function readUtms() {
  if (!isBrowser) return {};
  const url = new URL(window.location.href);
  const fromUrl = {};
  UTM_KEYS.forEach((k) => {
    const v = url.searchParams.get(k);
    if (v) {
      fromUrl[k] = v;
      try { sessionStorage.setItem(`growx-${k}`, v); } catch {}
    } else {
      try {
        const stored = sessionStorage.getItem(`growx-${k}`);
        if (stored) fromUrl[k] = stored;
      } catch {}
    }
  });
  return fromUrl;
}

/**
 * Compute a lightweight lead score (0–100) for B2B routing.
 * Pure heuristic; SDR re-scores manually.
 */
export function scoreLead({ segment, role, companySize, urgency, hasEmail }) {
  let score = 0;
  if (hasEmail) score += 5;
  if (segment === 'industrial') score += 15;
  if (segment === 'cooperativa') score += 18;
  if (role && /(diretor|c-?level|ceo|cto|coo|presidente|gerente)/i.test(role)) score += 20;
  const sizeMap = { '1-10': 2, '11-50': 8, '51-200': 16, '201-1000': 22, '1000+': 26 };
  if (companySize) score += (sizeMap[companySize] ?? 0);
  const urgMap = { 'agora': 25, '30d': 18, '90d': 10, 'sem-prazo': 2 };
  if (urgency) score += (urgMap[urgency] ?? 0);
  return Math.min(100, score);
}

/**
 * Submit a form to the lead pipeline.
 * Resolution order:
 *   1. /api/contact (server-side: AI enrichment + multi-destination routing)
 *   2. VITE_CRM_WEBHOOK_URL (direct webhook configured by client)
 *   3. https://formsubmit.co (no-backend fallback)
 *   4. mailto: (degraded fallback)
 */
export async function submitLead(payload, meta = {}) {
  const utms = readUtms();
  const enriched = {
    ...payload,
    ...utms,
    _form: meta.form,
    _segment: meta.segment ?? 'unknown',
    _source: meta.source ?? 'site',
    _path: isBrowser ? window.location.pathname : '',
    _referrer: isBrowser ? document.referrer : '',
    _ts: new Date().toISOString(),
    _ua: isBrowser ? navigator.userAgent : '',
  };

  analytics.formSubmit(meta.form, meta.segment);

  // Mode 1: server-side endpoint (preferred — AI enrichment + multi-route)
  try {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(enriched),
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: true, mode: 'api', enrichment: data.enrichment };
    }
  } catch { /* fall through */ }

  // Mode 2: direct CRM webhook
  const url = ENV.VITE_CRM_WEBHOOK_URL;
  if (url) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(enriched),
      });
      if (res.ok) return { ok: true, mode: 'webhook' };
    } catch { /* fall through */ }
  }

  // Mode 3: formsubmit.co (no backend needed)
  const formsubmitEmail = ENV.VITE_FORMSUBMIT_EMAIL;
  if (formsubmitEmail) {
    try {
      const res = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(formsubmitEmail)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(enriched),
      });
      if (res.ok) return { ok: true, mode: 'formsubmit' };
    } catch { /* fall through */ }
  }

  // Mode 4: mailto (degraded fallback)
  if (isBrowser) {
    const subject = encodeURIComponent(`[Grow-X · ${meta.form ?? 'form'}] novo lead`);
    const body = encodeURIComponent(
      Object.entries(enriched)
        .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
        .join('\n'),
    );
    window.location.href = `mailto:growx@growx.com.br?subject=${subject}&body=${body}`;
    return { ok: true, mode: 'mailto' };
  }
  return { ok: false, mode: 'none' };
}

export const CONTACT = {
  whatsapp: 'https://wa.me/5541995494343',
  whatsappRaw: '+5541995494343',
  email: 'growx@growx.com.br',
  emailMarketing: 'mkt@growx.com.br',
  emailJuridico: 'juridico@growx.com.br',
  emailPrivacidade: 'privacidade@growx.com.br',
  emailImprensa: 'imprensa@growx.com.br',
  phone: '+55 (41) 99549-4343',
  calendly: ENV.VITE_CALENDLY_URL || '',
};

export function whatsappLink(message) {
  const text = message ? `?text=${encodeURIComponent(message)}` : '';
  return `${CONTACT.whatsapp}${text}`;
}
