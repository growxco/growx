import {next, rewrite} from '@vercel/functions';
import {AGENDA_HEADERS, AGENDA_ORIGIN, hostRoute, parseHost} from './lib/agenda-host-policy.js';

// Intentionally no matcher exclusions: this gate runs before filesystem/cache.
export default function middleware(request) {
  const url = new URL(request.url);
  const host = request.headers.get('host');
  if (!parseHost(host) || parseHost(host) !== parseHost(url.host)) {
    return new Response('Not found', {status:404, headers:AGENDA_HEADERS});
  }
  const route = hostRoute({host, path:url.pathname, method:request.method}, process.env);
  const headers = route.private ? AGENDA_HEADERS : undefined;
  if (route.action === 'deny') return new Response('Not found', {status:404, headers:AGENDA_HEADERS});
  if (route.action === 'redirect') return new Response(null, {status:307, headers:{...AGENDA_HEADERS, Location:AGENDA_ORIGIN+'/'}});
  if (route.action === 'rewrite') {
    url.pathname = '/socios-agenda.html';
    return rewrite(url, {headers});
  }
  return next({headers});
}
