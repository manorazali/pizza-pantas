/* Pizza Pantas — a time-management pizza shop where the maths IS the gameplay.
   Prep step : the order's wording (fractions, ratios, angles, sets, inequalities…) decides which topping goes on which slice.
   Cash step : a Form 1 problem (money, factors, algebra, Pythagoras…) to answer at the counter.
   Chapters + generators live in syllabus.js; accounts / score storage live in api.js. */
(function () {
  'use strict';
  const SYL = window.PP_SYL, API = window.PP_API;
  const { CHAPTERS, TOP, TOPS, genOrder, genCash } = SYL;
  const $ = (s, r) => (r || document).querySelector(s);
  const R = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = n => { n = Math.round(n * 100) / 100; return 'RM' + (Number.isInteger(n) ? n : n.toFixed(2)); };
  const num = v => String(+Number(v).toFixed(4));
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* blocked */ } }
  };
  const BAKE = 5, BURN = 9, SEATS = 4;
  const NAMES = ['Ali', 'Siti', 'Ah Meng', 'Kumar', 'Aisyah', 'Hafiz', 'Mei Ling', 'Raju', 'Nurul', 'Daniel', 'Farah', 'Jason'];
  const FACES = ['🧑', '👩', '👨', '👧', '👦', '🧓', '👵', '🧔', '👩‍🦱', '👨‍🦰'];
  const P = a => a[R(0, a.length - 1)];

  /* ---------- sound (tiny synth, optional) ---------- */
  let actx = null, muted = store.get('pp_mute', false);
  function beep(freq, dur, type, vol) {
    if (muted) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = type || 'sine'; o.frequency.value = freq; g.gain.value = vol || .06; o.connect(g); g.connect(actx.destination); o.start();
      g.gain.exponentialRampToValueAtTime(.0001, actx.currentTime + dur); o.stop(actx.currentTime + dur);
    } catch (e) { /* no audio */ }
  }
  const sfx = {
    ok() { beep(660, .12); setTimeout(() => beep(880, .18), 90); },
    coin() { beep(988, .1, 'square', .04); setTimeout(() => beep(1319, .25, 'square', .04), 80); },
    bad() { beep(160, .25, 'sawtooth', .05); }, ding() { beep(1200, .3, 'triangle', .06); }, pop() { beep(420, .05, 'sine', .04); }
  };

  /* ---------- score summary maths ---------- */
  const acc = (ok, bad) => ok + bad ? Math.round(ok / (ok + bad) * 100) : null;
  function summarize(runs) {
    const per = {}; CHAPTERS.forEach(c => { per[c.n] = { plays: 0, ok: 0, bad: 0, best: 0, bestMoney: 0 }; });
    const topics = {}; let served = 0;
    runs.forEach(r => {
      const p = per[r.ch]; if (!p) return; p.plays++; p.ok += r.ok || 0; p.bad += r.bad || 0; p.best = Math.max(p.best, r.stars || 0); p.bestMoney = Math.max(p.bestMoney, r.money || 0); served += r.served || 0;
      Object.keys(r.topics || {}).forEach(t => { const k = r.ch + '|' + t; const o = topics[k] || (topics[k] = { ch: r.ch, topic: t, ok: 0, bad: 0 }); o.ok += r.topics[t].ok; o.bad += r.topics[t].bad; });
    });
    const all = Object.values(per);
    return { per, topics: Object.values(topics), plays: runs.length, served, ok: all.reduce((a, p) => a + p.ok, 0), bad: all.reduce((a, p) => a + p.bad, 0),
      stars: all.reduce((a, p) => a + p.best, 0), played: all.filter(p => p.plays).length };
  }
  function statusOf(p) {
    const a = acc(p.ok, p.bad); if (!p.plays || a === null) return { k: 'none', t: 'Belum cuba' };
    if (a >= 85 && p.best >= 1) return { k: 'top', t: 'Mantap' }; if (a >= 60) return { k: 'ok', t: 'Baik' }; return { k: 'low', t: 'Perlu latihan' };
  }
  const starsHtml = (n, max) => '★'.repeat(n) + '<i>' + '★'.repeat((max || 3) - n) + '</i>';
  const dateText = at => { const d = new Date(at); return d.toLocaleDateString('ms-MY', { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' }); };

  let RUNS = [], OFFLINE = false, screen = '';
  async function refreshRuns() { const r = await API.listRuns(); RUNS = r.runs || []; OFFLINE = !!r.offline; }

  /* ---------- screens plumbing ---------- */
  const SCREENS = ['auth', 'home', 'game', 'result', 'summary'];
  function show(id) { screen = id; SCREENS.forEach(s => $('#' + s).classList.toggle('hidden', s !== id)); window.scrollTo(0, 0); }
  function topbar() {
    const u = API.user();
    return `<header class="top"><a class="brand" href="#" data-go="home">🍕 Pizza Pantas</a><div class="top-r">
      <button class="chip" data-go="summary">📊 Ringkasan</button>
      ${u ? `<span class="chip">👤 ${esc(u.display)}</span><button class="chip" data-act="logout">Keluar</button>` : `<span class="chip">👤 Tetamu</span><button class="chip" data-act="relogin">Log masuk</button>`}</div></header>`;
  }
  document.addEventListener('click', async e => {
    const go = e.target.closest('[data-go]'), act = e.target.closest('[data-act]');
    if (go) { e.preventDefault(); if (go.dataset.go === 'home') viewHome(); else if (go.dataset.go === 'summary') viewSummary(); return; }
    if (!act) return;
    if (act.dataset.act === 'logout') { await API.logout(); RUNS = []; viewAuth(); }
    else if (act.dataset.act === 'relogin') { API.leaveGuest(); RUNS = []; viewAuth(); }
    else if (act.dataset.act === 'print') window.print();
    else if (act.dataset.act === 'delete') deleteAccount();
  });
  window.addEventListener('pp:loggedout', () => { RUNS = []; if (G.running) { G.running = false; cancelAnimationFrame(G.raf); } viewAuth(); toast('Sesi tamat. Sila log masuk semula.', 'bad'); });

  /* ---------- auth screen ---------- */
  function viewAuth(mode) {
    mode = mode || 'login'; show('auth');
    $('#auth').innerHTML = `<div class="menu-card"><div class="logo-pizza" aria-hidden="true">🍕</div><h1>Pizza Pantas</h1>
      <p class="sub">Game Matematik Tingkatan 1 (KSSM): 13 bab ikut DSKP, dengan ringkasan skor setiap bab.</p>
      ${API.enabled ? `<div class="tabs"><button class="tab ${mode === 'login' ? 'on' : ''}" data-tab="login">Log masuk</button><button class="tab ${mode === 'register' ? 'on' : ''}" data-tab="register">Daftar</button></div>
        <form id="authForm" class="form">
          <label>Nama pengguna<input id="fUser" autocomplete="username" maxlength="20" autocapitalize="none" spellcheck="false" required></label>
          ${mode === 'register' ? '<label>Nama paparan (pilihan)<input id="fDisp" maxlength="20" autocomplete="nickname"></label>' : ''}
          <label>Kata laluan<input id="fPass" type="password" autocomplete="${mode === 'login' ? 'current-password' : 'new-password'}" maxlength="72" required></label>
          <p class="msg bad" id="authErr" role="alert"></p>
          <button class="btn pri wide" id="authGo">${mode === 'login' ? 'Log masuk' : 'Daftar akaun'}</button>
        </form>
        ${mode === 'register' ? '<p class="fine">Tiada e-mel diperlukan. Jangan guna nama penuh sebenar. Tiada pemulihan kata laluan, jadi ingat kata laluan anda.</p>' : ''}
        <div class="or"><span>atau</span></div>`
        : '<p class="fine warn">Log masuk belum diaktifkan di laman ini. Anda masih boleh main sebagai tetamu.</p>'}
      <button class="btn wide" id="guestBtn">Main sebagai tetamu</button><p class="fine">Tetamu: skor disimpan dalam pelayar ini sahaja.</p></div>`;
    $('#guestBtn').onclick = () => { API.playAsGuest(); RUNS = []; viewHome(); };
    document.querySelectorAll('#auth .tab').forEach(b => { b.onclick = () => viewAuth(b.dataset.tab); });
    const f = $('#authForm');
    if (f) f.onsubmit = async ev => {
      ev.preventDefault(); const err = $('#authErr'), go = $('#authGo'); err.textContent = '';
      const u = $('#fUser').value.trim(), p = $('#fPass').value;
      if (mode === 'register' && !/^[A-Za-z0-9_]{3,20}$/.test(u)) { err.textContent = 'Nama pengguna: 3–20 huruf, nombor atau _ (tanpa ruang).'; return; }
      if (mode === 'register' && p.length < 6) { err.textContent = 'Kata laluan mesti sekurang-kurangnya 6 aksara.'; return; }
      go.disabled = true; go.textContent = 'Sila tunggu…';
      try { if (mode === 'login') await API.login(u, p); else await API.register(u, p, $('#fDisp').value.trim()); RUNS = []; viewHome(); }
      catch (e) { err.textContent = e.message; go.disabled = false; go.textContent = mode === 'login' ? 'Log masuk' : 'Daftar akaun'; }
    };
  }
  async function deleteAccount() {
    if (!confirm('Padam akaun dan SEMUA skor anda? Tindakan ini tidak boleh dibatalkan.')) return;
    const pw = prompt('Taip kata laluan anda untuk mengesahkan:'); if (pw === null) return;
    try { await API.deleteAccount(pw); RUNS = []; viewAuth(); toast('Akaun telah dipadam.', 'good'); } catch (e) { toast(e.message, 'bad'); }
  }

  /* ---------- home: pick a chapter ---------- */
  function viewHome() { show('home'); renderHome(); refreshRuns().then(() => { if (screen === 'home') renderHome(); }); }
  function renderHome() {
    const s = summarize(RUNS); const overall = acc(s.ok, s.bad);
    $('#home').innerHTML = `${topbar()}<main class="wrap">
      <section class="hero"><h1>Pilih bab Matematik</h1><p>Tingkatan 1 (KSSM). Setiap bab ialah satu hari di kedai pizza.</p></section>
      ${API.isGuest() && API.enabled ? '<p class="banner">Anda main sebagai <b>tetamu</b>: skor hanya disimpan dalam pelayar ini. <button class="link" data-act="relogin">Log masuk</button> untuk simpan skor di akaun.</p>' : ''}
      ${OFFLINE ? '<p class="banner warn">Tiada sambungan ke pelayan. Menunjukkan skor yang tersimpan pada peranti ini.</p>' : ''}
      <div class="kpis"><div><b>${s.played}/13</b><small>Bab dimainkan</small></div><div><b>${s.stars}/39</b><small>Bintang</small></div><div><b>${overall === null ? '–' : overall + '%'}</b><small>Ketepatan</small></div></div>
      <div class="chapters">${CHAPTERS.map(c => { const p = s.per[c.n], st = statusOf(p), a = acc(p.ok, p.bad);
        return `<button class="chap s-${st.k}" data-n="${c.n}"><span class="cn">Bab ${c.n}</span><b>${esc(c.title)}</b><small>${esc(c.desc)}</small>
          <span class="cm"><span class="st">${starsHtml(p.best)}</span><em class="pill ${st.k}">${st.t}</em>${a === null ? '' : `<span class="pc">${a}%</span>`}</span></button>`; }).join('')}</div>
      <details class="how"><summary>Cara main</summary><ol>
        <li><b>Ketik pelanggan</b> dan baca pesanan. Maths dalam pesanan menentukan topping pada setiap keping (nombor 1–8).</li>
        <li>Masuk <b>oven</b>, ambil pizza sebelum hangus, kemudian jawab <b>cabaran kaunter</b>.</li>
        <li>Laju dan betul pada percubaan pertama = tip lebih dan <b>combo</b>. 3 pelanggan marah = hari tamat.</li>
        <li>Capai sasaran RM80 untuk 1 bintang (96 = 2, 120 = 3). Lihat <b>Ringkasan</b> untuk bab yang perlu dilatih.</li></ol></details>
      <p class="fine">Bab dan topik mengikut DSKP KSSM Matematik Tingkatan 1. Soalan dijana rawak.</p></main>`;
  }
  $('#home').addEventListener('click', e => { const b = e.target.closest('.chap'); if (b) startChapter(+b.dataset.n); });

  /* ---------- summary screen ---------- */
  function viewSummary() { show('summary'); renderSummary(); refreshRuns().then(() => { if (screen === 'summary') renderSummary(); }); }
  function renderSummary() {
    const s = summarize(RUNS); const overall = acc(s.ok, s.bad); const u = API.user();
    const weak = s.topics.filter(t => t.ok + t.bad >= 3 && acc(t.ok, t.bad) < 85).sort((a, b) => acc(a.ok, a.bad) - acc(b.ok, b.bad)).slice(0, 6);
    $('#summary').innerHTML = `${topbar()}<main class="wrap">
      <section class="hero"><h1>Ringkasan skor</h1><p>${u ? esc(u.display) + ' (@' + esc(u.username) + ')' : 'Tetamu'} · Matematik Tingkatan 1</p></section>
      ${OFFLINE ? '<p class="banner warn">Tiada sambungan ke pelayan. Menunjukkan skor yang tersimpan pada peranti ini.</p>' : ''}
      ${!s.plays ? '<p class="banner">Belum ada permainan. Pilih satu bab dan main untuk lihat ringkasan di sini.</p>' : ''}
      <div class="kpis four"><div><b>${s.plays}</b><small>Permainan</small></div><div><b>${s.played}/13</b><small>Bab dimainkan</small></div><div><b>${s.stars}/39</b><small>Bintang</small></div><div><b>${overall === null ? '–' : overall + '%'}</b><small>Ketepatan kali pertama</small></div></div>
      <h2 class="lbl">Setiap bab</h2>
      <div class="srows">${CHAPTERS.map(c => { const p = s.per[c.n], st = statusOf(p), a = acc(p.ok, p.bad);
        return `<div class="srow"><span class="sn">Bab ${c.n}</span><span class="stt">${esc(c.title)}</span><span class="sp">${p.plays ? p.plays + '×' : '–'}</span><span class="st">${starsHtml(p.best)}</span>
          <span class="sa"><i class="abar"><u class="${st.k}" style="width:${a || 0}%"></u></i><b>${a === null ? '–' : a + '%'}</b></span><em class="pill ${st.k}">${st.t}</em></div>`; }).join('')}</div>
      <p class="fine">Mantap = ketepatan ≥ 85% dan sekurang-kurangnya 1 bintang · Baik = 60–84% · Perlu latihan = bawah 60%. Ketepatan = tugasan betul pada percubaan pertama.</p>
      <h2 class="lbl">Topik yang perlu dilatih</h2>
      ${weak.length ? `<div class="weak">${weak.map(t => `<div class="wk"><span>Bab ${t.ch}: ${esc(t.topic)}</span><b>${acc(t.ok, t.bad)}%</b><small>${t.ok}/${t.ok + t.bad} betul</small></div>`).join('')}</div>` : '<p class="fine">Belum ada topik di bawah 85% (atau belum cukup data: perlu sekurang-kurangnya 3 tugasan setiap topik).</p>'}
      <h2 class="lbl">Permainan terkini</h2>
      ${RUNS.length ? `<div class="recent">${RUNS.slice(0, 10).map(r => { const c = CHAPTERS.find(x => x.n === r.ch); return `<div class="rr"><span>${dateText(r.at)}</span><span>Bab ${r.ch}: ${esc(c ? c.title : '')}</span><span>${money(r.money)} / ${money(r.goal)}</span><span class="st">${starsHtml(r.stars)}</span><span>${acc(r.ok, r.bad) === null ? '–' : acc(r.ok, r.bad) + '%'}</span></div>`; }).join('')}</div>` : '<p class="fine">Tiada.</p>'}
      <div class="acts noprint"><button class="btn pri" data-go="home">Pilih bab</button><button class="btn" data-act="print">Cetak ringkasan</button></div>
      ${u ? '<p class="fine noprint"><button class="link" data-act="delete">Padam akaun dan semua skor saya</button></p>' : ''}</main>`;
  }

  /* ---------- game state ---------- */
  const G = { ch: null, t: 0, money: 0, hearts: 3, combo: 1, seats: [], ovens: [], sel: null, served: 0, spawnIn: 0, running: false, paused: false, last: 0, raf: 0, stats: {}, brush: 'pep', uid: 0, tipTotal: 0, workKey: '' };

  function startChapter(n) {
    const ch = CHAPTERS.find(c => c.n === n);
    Object.assign(G, { ch, t: ch.dur, money: 0, hearts: 3, combo: 1, seats: Array(SEATS).fill(null), ovens: [{ s: 'empty', t: 0 }, { s: 'empty', t: 0 }],
      sel: null, served: 0, spawnIn: .3, running: true, paused: false, stats: {}, brush: 'pep', tipTotal: 0, workKey: '' });
    $('#hCh').textContent = ch.n; $('#hGoal').textContent = ch.goal; $('#pauseOv').classList.add('hidden'); $('#muteBtn').textContent = muted ? '🔇' : '🔊';
    show('game'); renderSeats(); renderWork(); renderOvens(); tickUI();
    G.last = performance.now(); cancelAnimationFrame(G.raf); G.raf = requestAnimationFrame(loop);
  }
  function endDay(failMsg) {
    G.running = false; cancelAnimationFrame(G.raf);
    const ch = G.ch, m = G.money; const stars = failMsg ? 0 : m >= ch.goal * 1.5 ? 3 : m >= ch.goal * 1.2 ? 2 : m >= ch.goal ? 1 : 0;
    const topics = {}; let ok = 0, bad = 0; Object.keys(G.stats).forEach(k => { topics[k] = { ok: G.stats[k].ok, bad: G.stats[k].bad }; ok += G.stats[k].ok; bad += G.stats[k].bad; });
    const run = { ch: ch.n, money: Math.round(m * 100) / 100, goal: ch.goal, stars, served: G.served, ok, bad, topics, at: Date.now() };
    RUNS.unshift(run);
    const a = acc(ok, bad);
    const rows = Object.keys(G.stats).map(k => { const t = G.stats[k], tot = t.ok + t.bad; return `<div class="tp"><span>${esc(k)}</span><span>${t.ok}/${tot} betul kali pertama</span><i><u style="width:${tot ? t.ok / tot * 100 : 0}%"></u></i></div>`; }).join('');
    const worst = Object.keys(G.stats).filter(k => G.stats[k].bad > 0).sort((x, y) => G.stats[y].bad - G.stats[x].bad)[0];
    $('#result').innerHTML = `${topbar()}<div class="res">
      <div class="stars" aria-label="${stars} bintang">${starsHtml(stars)}</div>
      <h1>${failMsg ? 'Alamak!' : stars ? 'Bab ' + ch.n + ' berjaya!' : 'Belum capai sasaran'}</h1>
      <p>${failMsg ? esc(failMsg) : esc(ch.title)}</p>
      <div class="money">${money(m)}</div><p>Sasaran ${money(ch.goal)} · ${G.served} pelanggan dilayan · tip ${money(G.tipTotal)}</p>
      <div class="kpis"><div><b>${a === null ? '–' : a + '%'}</b><small>Ketepatan kali pertama</small></div><div><b>${ok}</b><small>Betul</small></div><div><b>${bad}</b><small>Perlu cuba semula</small></div></div>
      <div class="topics">${rows || '<p>Tiada tugasan diselesaikan.</p>'}</div>
      ${worst ? `<p>Latih lagi: <b>${esc(worst)}</b></p>` : ''}
      <p class="savemsg" id="saveMsg">Menyimpan skor…</p>
      <div class="acts"><button class="btn pri" id="again">Main semula</button><button class="btn" data-go="home">Bab lain</button><button class="btn" data-go="summary">Ringkasan skor</button></div></div>`;
    show('result'); $('#again').onclick = () => startChapter(ch.n); stars ? sfx.ok() : sfx.bad();
    API.saveRun(run).then(r => {
      const el = $('#saveMsg'); if (!el) return;
      el.textContent = r.where === 'cloud' ? '✔ Skor disimpan ke akaun anda.' : r.where === 'local' ? '✔ Skor disimpan dalam pelayar ini (tetamu).' : r.where === 'queued' ? '⚠ Tiada sambungan. Skor disimpan pada peranti dan akan dihantar kemudian.' : '⚠ Skor tidak dapat disimpan: ' + (r.message || 'ralat');
      el.className = 'savemsg ' + (r.where === 'cloud' || r.where === 'local' ? 'good' : 'warn');
    });
  }

  /* ---------- game loop ---------- */
  function loop(now) {
    if (!G.running) return;
    const dt = Math.min(.25, (now - G.last) / 1000); G.last = now;
    if (!G.paused) step(dt);
    if (G.running) { tickUI(); G.raf = requestAnimationFrame(loop); }
  }
  function step(dt) {
    G.t -= dt; if (G.t <= 0) { G.t = 0; return endDay(); }
    G.spawnIn -= dt;
    if (G.spawnIn <= 0) G.spawnIn = spawn() ? R(G.ch.gap[0], G.ch.gap[1]) : 1;
    G.seats.forEach(c => { if (c) { c.p -= dt; if (c.p <= 0 && G.running) leaveAngry(c); } });
    if (!G.running) return;
    let changed = false;
    G.ovens.forEach(o => {
      if (o.s === 'baking') { o.t += dt; if (o.t >= BAKE) { const c = G.seats.find(x => x && x.id === o.cid); o.s = 'ready'; o.t = 0; if (c) c.stage = 'ready'; changed = true; sfx.ding(); } }
      else if (o.s === 'ready') {
        o.t += dt;
        if (o.t >= BURN) {
          const c = G.seats.find(x => x && x.id === o.cid);
          if (c) { c.stage = 'prep'; c.slices = Array(8).fill(null); c.oven = null; c.prepBad++; c.p = Math.max(1, c.p - 8); }
          Object.assign(o, { s: 'empty', t: 0, cid: null }); changed = true; toast('Pizza hangus! Buat semula.', 'bad'); sfx.bad(); G.combo = 1;
        }
      }
    });
    if (changed) { renderSeats(); syncWork(); renderOvens(); }
  }
  function spawn() {
    const free = G.seats.map((c, i) => c ? -1 : i).filter(i => i >= 0); if (!free.length) return false;
    const seat = P(free); const order = genOrder(G.ch);
    const c = { id: ++G.uid, seat, name: P(NAMES), face: P(FACES), p: G.ch.patience, pMax: G.ch.patience, order, slices: Array(8).fill(null), stage: 'prep', oven: null, cash: null, prepBad: 0, cashBad: 0 };
    G.seats[seat] = c; sfx.pop();
    if (!G.sel) G.sel = c.id;
    renderSeats(); syncWork(); return true;
  }
  function removeCustomer(c) {
    G.seats[c.seat] = null;
    G.ovens.forEach(o => { if (o.cid === c.id) Object.assign(o, { s: 'empty', t: 0, cid: null }); });
    if (G.sel === c.id) { const nxt = G.seats.find(x => x); G.sel = nxt ? nxt.id : null; }
    renderSeats(); syncWork(); renderOvens();
  }
  function leaveAngry(c) {
    G.hearts--; G.combo = 1; toast(c.name + ' marah dan pergi!', 'bad'); sfx.bad(); removeCustomer(c);
    if (G.hearts <= 0) endDay('Tiga pelanggan pergi dengan marah.');
  }
  const record = (topic, ok) => { if (!topic) return; const s = G.stats[topic] || (G.stats[topic] = { ok: 0, bad: 0 }); ok ? s.ok++ : s.bad++; };

  /* ---------- rendering ---------- */
  const cur = () => G.seats.find(c => c && c.id === G.sel) || null;
  const STG = { prep: '📝 Pesanan', bake: '🔥 Dalam oven', ready: '✅ Ambil!', cash: '💰 Kaunter' };
  function renderSeats() {
    $('#seats').innerHTML = G.seats.map(c => c
      ? `<button class="seat has ${c.id === G.sel ? 'sel' : ''} st-${c.stage}" data-id="${c.id}"><span class="md" id="md${c.id}">😀</span><span class="av">${c.face}</span><span class="nm">${esc(c.name)}</span><span class="pat"><i id="pb${c.id}"></i></span><span class="stg">${STG[c.stage]}</span></button>`
      : '<div class="seat" aria-hidden="true"></div>').join('');
  }
  $('#seats').addEventListener('click', e => { const b = e.target.closest('.seat.has'); if (!b) return; G.sel = +b.dataset.id; sfx.pop(); renderSeats(); renderWork(); });

  function pizzaSVG(c) {
    const cx = 100, cy = 100, r = 88; let out = '<svg class="pizza" viewBox="0 0 200 200" role="img" aria-label="Pizza 8 keping, bernombor 1 hingga 8"><circle cx="100" cy="100" r="96" fill="#d99a4e"/>';
    for (let i = 0; i < 8; i++) {
      const a1 = (-90 + i * 45) * Math.PI / 180, a2 = (-90 + (i + 1) * 45) * Math.PI / 180, am = (a1 + a2) / 2; const t = c.slices[i];
      const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1), x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2);
      out += `<path data-i="${i}" d="M${cx} ${cy} L${x1.toFixed(1)} ${y1.toFixed(1)} A${r} ${r} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z" fill="${t ? TOP[t].color : '#f7dfa8'}" stroke="#b9772f" stroke-width="2"/>`;
      if (t) out += `<text x="${(cx + 50 * Math.cos(am)).toFixed(1)}" y="${(cy + 50 * Math.sin(am) + 7).toFixed(1)}" text-anchor="middle" font-size="22" pointer-events="none">${TOP[t].emoji}</text>`;
      out += `<text x="${(cx + (t ? 76 : 55) * Math.cos(am)).toFixed(1)}" y="${(cy + (t ? 76 : 55) * Math.sin(am) + (t ? 4 : 6)).toFixed(1)}" text-anchor="middle" font-size="${t ? 12 : 17}" font-weight="800" fill="#7a4a17" opacity="${t ? .85 : .6}" pointer-events="none">${i + 1}</text>`;
    }
    return out + '</svg>';
  }
  function syncWork() { const c = cur(); const key = c ? c.id + ':' + c.stage : 'none'; if (key !== G.workKey) renderWork(); }
  function renderWork(keepMsg) {
    const w = $('#work'); const c = cur(); G.workKey = c ? c.id + ':' + c.stage : 'none';
    if (!c) { w.innerHTML = `<div class="idle"><div class="big">🍕</div><b>${G.running ? 'Menunggu pelanggan…' : ''}</b><span>Ketik pelanggan untuk lihat pesanan.</span></div>`; return; }
    const ticket = `<div class="ticket"><small>Pesanan ${esc(c.name)}</small><p>${c.order.text}</p></div>`;
    if (c.stage === 'prep') {
      const cnt = {}; c.slices.forEach(s => s && (cnt[s] = (cnt[s] || 0) + 1)); const empty = c.slices.filter(s => !s).length;
      w.innerHTML = ticket + `<div class="prep">${pizzaSVG(c)}<div class="tools">
        <div class="brushes">${TOPS.map(k => `<button class="brush ${G.brush === k ? 'on' : ''}" data-b="${k}"><i class="sw" style="background:${TOP[k].color}"></i>${TOP[k].name}</button>`).join('')}<button class="brush ${G.brush === null ? 'on' : ''}" data-b="">⌫ Padam</button></div>
        <div class="counts">${TOPS.filter(k => cnt[k]).map(k => `<span>${TOP[k].name}: <b>${cnt[k]}</b></span>`).join('') || '<span>Pilih topping, kemudian ketik keping pizza.</span>'}${empty ? `<span>Kosong: <b>${empty}</b></span>` : ''}</div>
        <div class="msg" id="pmsg">${keepMsg || ''}</div>
        <button class="btn pri" data-act2="oven" ${empty ? 'disabled' : ''}>Masuk oven 🔥</button></div></div>`;
    } else if (c.stage === 'bake') {
      w.innerHTML = ticket + `<div class="statebox"><div class="big">🔥</div><b>Pizza ${esc(c.name)} sedang dibakar…</b><span>Sementara itu, layan pelanggan lain!</span></div>`;
    } else if (c.stage === 'ready') {
      w.innerHTML = ticket + '<div class="statebox"><div class="big">✅</div><b>Pizza sudah masak!</b><span>Ketik oven yang menyala hijau sebelum hangus.</span></div>';
    } else {
      const k = c.cash; const im = k.ans < 0 || k.topic === 'Pecahan' ? 'text' : 'decimal';
      w.innerHTML = `<div class="ticket"><small>${esc(k.label)} · ${esc(c.name)}</small><p>${k.q}</p></div>
        <div class="ansrow">${k.pre ? `<span>${esc(k.pre)}</span>` : ''}<input id="ans" type="text" inputmode="${im}" autocomplete="off" placeholder="Jawapan" aria-label="Jawapan">${k.suf ? `<span>${esc(k.suf)}</span>` : ''}<button class="btn pri" data-act2="pay">Semak</button></div>
        ${c.cashBad ? `<div class="hint">💡 ${esc(k.hint)}${c.cashBad >= 3 ? ` — Jawapan: <b>${esc(num(k.ans))}</b>` : ''}</div>` : ''}`;
      const inp = $('#ans'); if (inp) inp.focus({ preventScroll: true });
    }
  }
  $('#work').addEventListener('click', e => {
    const c = cur(); if (!c) return;
    const path = e.target.closest('path[data-i]');
    if (path && c.stage === 'prep') { c.slices[+path.dataset.i] = G.brush; sfx.pop(); return renderWork(); }
    const br = e.target.closest('[data-b]'); if (br) { G.brush = br.dataset.b || null; return renderWork($('#pmsg') && $('#pmsg').textContent); }
    const act = e.target.closest('[data-act2]'); if (!act) return;
    if (act.dataset.act2 === 'oven') sendToOven(c); else if (act.dataset.act2 === 'pay') pay(c);
  });
  $('#work').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'ans') { const c = cur(); if (c) pay(c); } });

  function renderOvens() {
    $('#ovens').innerHTML = G.ovens.map((o, i) => {
      const who = o.cid ? (G.seats.find(c => c && c.id === o.cid) || {}).name : '';
      const label = o.s === 'empty' ? 'Kosong' : o.s === 'baking' ? 'Membakar: ' + esc(who) : 'Siap! ' + esc(who);
      return `<button class="oven ${o.s === 'baking' ? 'baking' : o.s === 'ready' ? 'ready' : ''}" data-o="${i}"><div class="ol">Oven ${i + 1}</div><div class="os">${label}</div><div class="ob" id="ob${i}"></div></button>`;
    }).join('');
  }
  $('#ovens').addEventListener('click', e => {
    const b = e.target.closest('.oven'); if (!b) return; const o = G.ovens[+b.dataset.o]; if (o.s !== 'ready') return;
    const c = G.seats.find(x => x && x.id === o.cid); Object.assign(o, { s: 'empty', t: 0, cid: null });
    if (c) { c.stage = 'cash'; c.oven = null; c.cash = genCash(G.ch, c.order); G.sel = c.id; sfx.ok(); }
    renderSeats(); renderWork(); renderOvens();
  });
  function tickUI() {
    $('#hTime').textContent = Math.ceil(G.t) + 's'; $('#hMoney').textContent = money(G.money).slice(2);
    $('#hBar').style.width = Math.min(100, G.money / G.ch.goal * 100) + '%';
    $('#hHearts').textContent = '♥'.repeat(G.hearts) + '♡'.repeat(3 - G.hearts); $('#hCombo').textContent = '×' + G.combo;
    G.seats.forEach(c => {
      if (!c) return; const f = Math.max(0, c.p / c.pMax); const b = document.getElementById('pb' + c.id), m = document.getElementById('md' + c.id);
      if (b) { b.style.width = (f * 100) + '%'; b.className = f < .3 ? 'low' : f < .6 ? 'mid' : ''; }
      if (m) m.textContent = f > .65 ? '😀' : f > .4 ? '🙂' : f > .2 ? '😟' : '😠';
    });
    G.ovens.forEach((o, i) => { const b = document.getElementById('ob' + i); if (b) b.style.width = o.s === 'baking' ? (o.t / BAKE * 100) + '%' : o.s === 'ready' ? (100 - o.t / BURN * 100) + '%' : '0'; });
  }

  /* ---------- actions ---------- */
  function checkPrep(c) {
    const o = c.order; const reveal = c.prepBad >= 1;
    if (o.mode === 'exact') {
      const wrong = []; for (let i = 0; i < 8; i++) if (c.slices[i] !== o.target[i]) wrong.push(i);
      if (!wrong.length) return null;
      return reveal ? `Keping nombor ${wrong[0] + 1} sepatutnya ${TOP[o.target[wrong[0]]].name}. (${wrong.length} keping salah)` : `${wrong.length} keping belum tepat. Baca semula peraturan pada pesanan.`;
    }
    const cnt = {}; c.slices.forEach(s => { cnt[s] = (cnt[s] || 0) + 1; });
    const wrong = o.parts.find(p => (cnt[p.top] || 0) !== p.n) || Object.keys(cnt).filter(k => !o.parts.some(p => p.top === k)).map(k => ({ top: k, n: 0 }))[0];
    if (!wrong) return null;
    return reveal ? `${TOP[wrong.top].name} sepatutnya ${wrong.n} keping. Betulkan dan cuba lagi.` : `Kiraan ${TOP[wrong.top].name} belum tepat. Cuba semak semula!`;
  }
  function sendToOven(c) {
    const msgEl = $('#pmsg'); const say = (t, bad) => { if (msgEl) { msgEl.textContent = t; msgEl.className = 'msg ' + (bad ? 'bad' : 'good'); } };
    if (c.slices.includes(null)) return say('Masih ada keping kosong.', true);
    const free = G.ovens.findIndex(o => o.s === 'empty'); if (free < 0) return say('Semua oven penuh. Tunggu sebentar.', true);
    const problem = checkPrep(c);
    if (problem) {
      say(problem, true); c.prepBad++; c.p = Math.max(1, c.p - 4); G.combo = 1; sfx.bad();
      const p = $('.pizza'); if (p) { p.classList.add('shake'); setTimeout(() => p.classList.remove('shake'), 350); } return;
    }
    record(c.order.topic, c.prepBad === 0);
    G.ovens[free] = { s: 'baking', t: 0, cid: c.id }; c.stage = 'bake'; c.oven = free; sfx.ok();
    const nxt = G.seats.find(x => x && x.stage === 'prep'); if (nxt) G.sel = nxt.id;
    renderSeats(); renderWork(); renderOvens();
  }
  function parseAnswer(raw) {
    const s = String(raw).trim().replace(/[−–—]/g, '-').replace(',', '.'); if (!s) return NaN;
    let m = /^(-?)\s*(\d+)\s+(\d+)\/(\d+)$/.exec(s); if (m) { const v = +m[2] + +m[3] / +m[4]; return m[1] ? -v : v; }
    m = /^(-?\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/.exec(s); if (m) return +m[2] === 0 ? NaN : +m[1] / +m[2];
    return /^-?\d+(?:\.\d+)?$/.test(s) ? parseFloat(s) : NaN;
  }
  function pay(c) {
    const raw = ($('#ans') || {}).value || ''; const v = parseAnswer(raw);
    if (isNaN(v)) { toast('Taip nombor dahulu (cth. 12, 3.5 atau 3/4).', 'bad'); return; }
    if (Math.abs(v - c.cash.ans) < .005) {
      const clean = c.prepBad === 0 && c.cashBad === 0; record(c.cash.topic, c.cashBad === 0);
      G.combo = clean ? Math.min(5, G.combo + 1) : 1;
      const tip = Math.round(Math.max(0, c.p / c.pMax) * 5); const bonus = clean ? (G.combo - 1) * 2 : 0;
      const earn = c.cash.base + tip + bonus; G.money += earn; G.tipTotal += tip + bonus; G.served++;
      toast(`+${money(earn)}  ·  ${c.cash.sol}`, 'good'); sfx.coin(); removeCustomer(c);
    } else {
      c.cashBad++; c.p = Math.max(1, c.p - 6); G.combo = 1; sfx.bad(); renderWork();
      const inp = $('#ans'); if (inp) { inp.value = raw; inp.select(); inp.classList.add('shake'); }
    }
  }

  /* ---------- toast / pause / mute ---------- */
  let toastT = 0;
  function toast(msg, kind) { const t = $('#toast'); t.textContent = msg; t.className = 'toast show ' + (kind || ''); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2800); }
  $('#pauseBtn').onclick = () => { G.paused = true; $('#pauseOv').classList.remove('hidden'); };
  $('#resumeBtn').onclick = () => { G.paused = false; G.last = performance.now(); $('#pauseOv').classList.add('hidden'); };
  $('#quitBtn').onclick = () => { G.running = false; cancelAnimationFrame(G.raf); viewHome(); };
  $('#muteBtn').onclick = () => { muted = !muted; store.set('pp_mute', muted); $('#muteBtn').textContent = muted ? '🔇' : '🔊'; };
  document.addEventListener('visibilitychange', () => { if (document.hidden && G.running && !G.paused) $('#pauseBtn').click(); });

  /* ---------- boot ---------- */
  if (API.hasChosen()) viewHome(); else viewAuth();
})();
