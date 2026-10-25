/**
 * Thiao Thanjai — safe first-stage Cloudflare Worker API.
 * Handles public read-only data without exposing any private records.
 * IMPORTANT: Authentication, real booking writes, payments, and merchant administration
 * are intentionally NOT enabled until real Supabase Auth + RLS are implemented.
 */
const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  },
});

const stateFor = (activities) => ({
  mode: 'read-only-demo',
  user: null,
  profile: null,
  isAdmin: false,
  shop: null,
  activities,
  bookings: [],
  managedBookings: [],
  favorites: [],
  counts: [],
  closed: [],
  tickets: [],
  applications: [],
  reviewStats: [],
});

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    if (path === '/api/health') {
      if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405);
      return json({ ok: true, service: 'thiao-thanjai', backend: 'cloudflare-worker', mode: 'read-only-demo' });
    }
    if (path === '/api/state' || path === '/api/activities') {
      if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405);
      const catalog = new URL('/catalog.json', url.origin);
      const res = await env.ASSETS.fetch(new Request(catalog, { method: 'GET' }));
      if (!res.ok) return json({ error: 'Catalog unavailable' }, 503);
      try {
        const activities = await res.json();
        if (!Array.isArray(activities)) throw new Error('Invalid catalog');
        return json(path === '/api/activities' ? activities : stateFor(activities));
      } catch {
        return json({ error: 'Catalog invalid' }, 503);
      }
    }
    if (path.startsWith('/api/')) {
      return json({
        error: 'This action is disabled until Supabase Auth, permissions and durable bookings are deployed.',
        code: 'AUTH_AND_DB_REQUIRED',
      }, 501);
    }
    if (path === '/') {
      const entry = new URL('/app.html', url.origin);
      return env.ASSETS.fetch(new Request(entry, { method: 'GET' }));
    }
    return env.ASSETS.fetch(request);
  },
};
