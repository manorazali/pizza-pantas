/* Pizza Pantas — account + score storage client.
   - Guest: runs live in this browser only (localStorage).
   - Logged in: runs are sent to the Cloudflare Worker (see worker/). If the network fails the run is queued
     on this device and sent next time. If PP_CONFIG.API_URL is empty, only guest mode is available. */
(function () {
  'use strict';
  const BASE = String((window.PP_CONFIG && window.PP_CONFIG.API_URL) || '').replace(/\/+$/, '');
  const mkStore = area => ({
    get(k, d) { try { const v = area.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { area.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } },
    del(k) { try { area.removeItem(k); } catch (e) { /* ignore */ } }
  });
  const ls = mkStore(window.localStorage), ss = mkStore(window.sessionStorage);
  let session = ls.get('pp_session', null);          // { token, user:{id, username, display} }
  let guest = !!ss.get('pp_guest', false);
  const MAX_LOCAL = 300;

  const fail = (msg, code, status) => { const e = new Error(msg); e.code = code; e.status = status; return e; };
  async function call(method, path, body) {
    const headers = { 'Content-Type': 'application/json' }; if (session) headers.Authorization = 'Bearer ' + session.token;
    let res;
    try { res = await fetch(BASE + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }); }
    catch (e) { throw fail('Tiada sambungan ke pelayan. Semak internet anda.', 'network', 0); }
    let data = null; try { data = await res.json(); } catch (e) { /* empty body */ }
    if (!res.ok) {
      if (res.status === 401 && session && path !== '/api/login' && path !== '/api/me') { clearSession(); window.dispatchEvent(new Event('pp:loggedout')); }
      throw fail((data && data.message) || 'Ralat pelayan.', (data && data.error) || 'error', res.status);
    }
    return data;
  }
  function setSession(s) { session = s; ls.set('pp_session', s); guest = false; ss.del('pp_guest'); }
  function clearSession() { session = null; ls.del('pp_session'); }
  const qKey = () => 'pp_queue_' + (session ? session.user.id : 'x');
  const cKey = () => 'pp_cache_' + (session ? session.user.id : 'x');

  async function flushQueue() {
    if (!session) return;
    const q = ls.get(qKey(), []); if (!q.length) return;
    const left = [];
    for (let i = 0; i < q.length; i++) {
      try { await call('POST', '/api/runs', q[i]); }
      catch (e) { if (e.code === 'network' || e.status >= 500) { left.push(...q.slice(i)); break; } /* rejected as invalid: drop it */ }
    }
    ls.set(qKey(), left);
  }

  window.PP_API = {
    enabled: !!BASE,
    user: () => session && session.user,
    isUser: () => !!session,
    isGuest: () => guest && !session,
    hasChosen: () => !!session || guest,
    playAsGuest() { clearSession(); guest = true; ss.set('pp_guest', true); },
    leaveGuest() { guest = false; ss.del('pp_guest'); },
    async register(username, password, display) { const d = await call('POST', '/api/register', { username, password, display }); setSession({ token: d.token, user: d.user }); return d.user; },
    async login(username, password) { const d = await call('POST', '/api/login', { username, password }); setSession({ token: d.token, user: d.user }); return d.user; },
    async logout() { try { if (session) await call('POST', '/api/logout'); } catch (e) { /* sign out locally anyway */ } clearSession(); guest = false; ss.del('pp_guest'); },
    async deleteAccount(password) { const id = session.user.id; await call('DELETE', '/api/me', { password }); ls.del('pp_queue_' + id); ls.del('pp_cache_' + id); clearSession(); },

    /* run = { ch, money, goal, stars, served, ok, bad, topics, at } -> { where: 'cloud' | 'local' | 'queued' | 'rejected' } */
    async saveRun(run) {
      if (!session) { const arr = ls.get('pp_runs_guest', []); arr.unshift(run); ls.set('pp_runs_guest', arr.slice(0, MAX_LOCAL)); return { where: 'local' }; }
      try { await flushQueue(); await call('POST', '/api/runs', run); return { where: 'cloud' }; }
      catch (e) {
        if (e.code === 'network' || e.status >= 500) { const q = ls.get(qKey(), []); q.push(run); ls.set(qKey(), q.slice(-100)); return { where: 'queued', message: e.message }; }
        if (e.status === 401) return { where: 'rejected', message: e.message };
        return { where: 'rejected', message: e.message };
      }
    },
    /* -> { runs (newest first), offline } */
    async listRuns() {
      if (!session) return { runs: ls.get('pp_runs_guest', []), offline: false };
      try { await flushQueue(); const d = await call('GET', '/api/runs?limit=300'); ls.set(cKey(), d.runs); return { runs: d.runs, offline: false }; }
      catch (e) {
        if (!session) return { runs: [], offline: false };
        const queued = ls.get(qKey(), []).slice().reverse();
        return { runs: queued.concat(ls.get(cKey(), [])), offline: true };
      }
    }
  };
})();
