// Shared by Edge middleware and Node functions. No client header can enable a host.
export const AGENDA_HOST = 'agenda.growx.com.br';
export const AGENDA_ORIGIN = `https://${AGENDA_HOST}`;
export const AGENDA_CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob:; connect-src 'self'; frame-src 'none'; worker-src 'none'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests";
export const AGENDA_HEADERS = {
  'Content-Security-Policy': AGENDA_CSP,
  'Cache-Control': 'no-store, private',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
};
export function parseHost(value) {
  if (typeof value !== 'string' || value.length > 253 || !/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/i.test(value)) return null;
  return value.toLowerCase();
}
export function allowedAgendaHosts(env = {}) {
  const hosts = new Set([AGENDA_HOST]);
  if (env.VERCEL_ENV === 'preview' && env.VERCEL_GIT_COMMIT_REF === 'feat/partners-agenda') {
    for (const value of [env.VERCEL_URL, env.VERCEL_BRANCH_URL]) {
      const host = parseHost(value);
      if (host && host.endsWith('.vercel.app')) hosts.add(host);
    }
  }
  return hosts;
}
export function isAgendaHost(value, env = {}) {
  const host = parseHost(value);
  return !!host && allowedAgendaHosts(env).has(host);
}
export function agendaPathKind(path) {
  if (typeof path !== 'string' || /[%\\]/.test(path) || path.includes('//')) return 'deny';
  if (['/', '/socios/agenda', '/socios/agenda/', '/socios-agenda.html'].includes(path)) return 'document';
  if (['/api/socios/session', '/api/socios/agenda'].includes(path)) return 'api';
  if (path === '/favicon.svg') return 'asset';
  // Only the separate agenda build writes this flat namespace. Main/marketing
  // output remains under /assets and cannot be served on the agenda origin.
  if (/^\/agenda-assets\/[a-zA-Z0-9_-]+-[a-zA-Z0-9_-]{8,}\.(?:js|css|woff2?|png|jpe?g|webp|svg|ico|avif)$/.test(path)) return 'asset';
  return 'deny';
}
function reservedAgendaAlias(path) {
  // Classify encodings before the platform can resolve a filesystem alias.
  // Never allow a credential setup document on the marketing origin.
  let decoded = path;
  for (let n=0; n<8; n++) {
    let next;
    try { next = decodeURIComponent(decoded); } catch { return true; }
    if (next === decoded) break;
    decoded = next;
    if (n === 7 && decoded.includes('%')) return true;
  }
  decoded = decoded.replaceAll('\\', '/').replace(/\/{2,}/g, '/');
  try { decoded = new URL(decoded, 'https://invalid.example').pathname; } catch { return true; }
  return decoded.startsWith('/api/socios') || decoded.startsWith('/agenda-assets') ||
    decoded.startsWith('/socios-agenda.html') || decoded.startsWith('/socios/agenda');
}
export function hostRoute({host, path, method}, env = {}) {
  if (!parseHost(host)) return {action:'deny'};
  if (isAgendaHost(host, env)) {
    const kind = agendaPathKind(path);
    if (kind === 'api' && ['GET','POST'].includes(method)) return {action:'next', private:true};
    if (['GET','HEAD'].includes(method)) {
      if (kind === 'document') return {action:'rewrite', private:true};
      if (kind === 'asset') return {action:'next', private:true};
    }
    return {action:'deny', private:true};
  }
  if (path.startsWith('/api/socios') || path.startsWith('/agenda-assets/')) return {action:'deny'};
  if (['/socios/agenda','/socios/agenda/','/socios-agenda.html'].includes(path)) {
    return ['GET','HEAD'].includes(method) ? {action:'redirect'} : {action:'deny'};
  }
  if (reservedAgendaAlias(path)) return {action:'deny'};
  return {action:'next'};
}
