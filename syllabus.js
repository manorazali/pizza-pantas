/* Pizza Pantas — Form 1 Mathematics (KSSM) syllabus + question generators.
   Chapters follow the DSKP Matematik Tingkatan 1 (13 chapters).
   Each chapter has:
     prep : kinds of topping orders (the maths is in HOW the order is worded)
     cash : generators for the counter challenge (type the answer)
   A "task" records a topic label so the score summary can show what is strong / weak. */
(function () {
  'use strict';
  const R = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
  const P = a => a[R(0, a.length - 1)];
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = R(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const gcd = (a, b) => b ? gcd(b, a % b) : Math.abs(a);
  const lcm = (a, b) => a / gcd(a, b) * b;
  const m = n => n < 0 ? '−' + (-n) : String(n);                     // unicode minus for display
  const dec = n => String(+n.toFixed(4));
  const f2 = c => (c / 100).toFixed(2);
  const T = o => Object.assign({ label: 'Cabaran kaunter', pre: '', suf: '' }, o);

  /* ---------- toppings ---------- */
  const TOP = {
    pep:   { name: 'Pepperoni',  color: '#c0392b', emoji: '🔴' },
    mush:  { name: 'Cendawan',   color: '#d9c7a6', emoji: '🍄' },
    pine:  { name: 'Nanas',      color: '#f2c94c', emoji: '🍍' },
    pepper:{ name: 'Lada hijau', color: '#7cb342', emoji: '🫑' },
    olive: { name: 'Zaitun',     color: '#4e5d2a', emoji: '⚫' }
  };
  const TOPS = ['pep', 'mush', 'pine', 'pepper', 'olive'];
  const nTop = order => order.mode === 'exact' ? new Set(order.target).size : order.parts.length;

  /* ---------- prep orders ---------- */
  const FR = { 1: '1/8', 2: '1/4', 3: '3/8', 4: '1/2', 5: '5/8', 6: '3/4', 7: '7/8' };
  const DEC = { 1: '0.125', 2: '0.25', 3: '0.375', 4: '0.5', 5: '0.625', 6: '0.75', 7: '0.875' };
  const nm = k => TOP[k].name;
  function countOrder(parts, text, topic) { return { mode: 'count', parts, text, topic }; }
  function exactOrder(target, text, topic) { return { mode: 'exact', target, text, topic }; }
  // exact order: slices whose number is in `set` get topping a, all others get topping b
  function setOrder(set, a, b, text, topic) { const t = []; for (let i = 1; i <= 8; i++) t.push(set.includes(i) ? a : b); return exactOrder(t, text, topic); }
  const NUMS = '{1, 2, 3, 4, 5, 6, 7, 8}';

  const PREP = {
    plain(tops) { const k = R(1, 7); return countOrder([{ top: tops[0], n: k }, { top: tops[1], n: 8 - k }], `<b>${k}</b> keping ${nm(tops[0])} dan <b>${8 - k}</b> keping ${nm(tops[1])}`, null); },
    frac(tops) {
      const k = P([1, 2, 3, 4, 5, 6, 7, 2, 4, 6]);
      return countOrder([{ top: tops[0], n: k }, { top: tops[1], n: 8 - k }], `<b>${FR[k]}</b> ${nm(tops[0])} dan <b>${FR[8 - k]}</b> ${nm(tops[1])}`, 'Pecahan');
    },
    dec(tops) {
      const k = R(1, 7);
      return countOrder([{ top: tops[0], n: k }, { top: tops[1], n: 8 - k }], `Pizza = 1. <b>${DEC[k]}</b> ${nm(tops[0])} dan <b>${DEC[8 - k]}</b> ${nm(tops[1])}`, 'Perpuluhan');
    },
    ratio(tops) {
      const [a, b] = P([[1, 1], [1, 3], [3, 1], [1, 7], [3, 5], [5, 3], [7, 1]]); const mm = P([1, 1, 2]); const s = a + b;
      return countOrder([{ top: tops[0], n: a * 8 / s }, { top: tops[1], n: b * 8 / s }], `Nisbah ${nm(tops[0])} : ${nm(tops[1])} = <b>${a * mm} : ${b * mm}</b>`, 'Nisbah');
    },
    three(tops) {
      const sl = P([[2, 2, 4], [1, 1, 6], [1, 3, 4], [2, 3, 3], [1, 2, 5], [4, 2, 2], [3, 3, 2], [5, 2, 1]]); const g = sl.reduce(gcd);
      return countOrder(sl.map((n, i) => ({ top: tops[i], n })), `Nisbah ${sl.map((_, i) => nm(tops[i])).join(' : ')} = <b>${sl.map(x => x / g).join(' : ')}</b>`, 'Nisbah 3 bahagian');
    },
    angle(tops) {
      const two = R(0, 1); const a = P(two ? [45, 90, 135, 180, 225, 270, 315] : [45, 90, 135, 180]);
      if (two) return countOrder([{ top: tops[0], n: a / 45 }, { top: tops[1], n: 8 - a / 45 }], `${nm(tops[0])} mengambil sudut <b>${a}°</b> di pusat pizza (satu pusingan penuh = 360°). Selebihnya ${nm(tops[1])}.`, 'Sudut pada satu titik');
      let b = P([45, 90, 135, 180].filter(v => v < 360 - a)); const rest = 360 - a - b;
      return countOrder([{ top: tops[0], n: a / 45 }, { top: tops[1], n: b / 45 }, { top: tops[2], n: rest / 45 }], `${nm(tops[0])} <b>${a}°</b>, ${nm(tops[1])} <b>${b}°</b> dan ${nm(tops[2])} selebihnya (satu pusingan penuh = 360°).`, 'Sudut pada satu titik');
    },
    /* exact orders: slice NUMBERS (1-8) carry the maths */
    n_factor(tops) { const N = P([6, 8, 12, 10, 7, 9, 5]); const s = [1, 2, 3, 4, 5, 6, 7, 8].filter(k => N % k === 0);
      return setOrder(s, tops[0], tops[1], `${nm(tops[0])} pada keping bernombor <b>faktor bagi ${N}</b>. Selebihnya ${nm(tops[1])}.`, 'Faktor'); },
    n_multiple(tops) { const N = P([2, 3, 4]); const s = [1, 2, 3, 4, 5, 6, 7, 8].filter(k => k % N === 0);
      return setOrder(s, tops[0], tops[1], `${nm(tops[0])} pada keping bernombor <b>gandaan ${N}</b>. Selebihnya ${nm(tops[1])}.`, 'Gandaan'); },
    n_prime(tops) {
      if (R(0, 1)) return setOrder([2, 3, 5, 7], tops[0], tops[1], `${nm(tops[0])} pada keping bernombor <b>nombor perdana</b>. Selebihnya ${nm(tops[1])}.`, 'Nombor perdana');
      const t = []; for (let i = 1; i <= 8; i++) t.push(i === 1 ? tops[2] : [2, 3, 5, 7].includes(i) ? tops[0] : tops[1]);
      return exactOrder(t, `${nm(tops[0])} pada <b>nombor perdana</b>, ${nm(tops[1])} pada <b>nombor gabungan</b> (bukan perdana, lebih daripada 1), dan ${nm(tops[2])} pada nombor <b>1</b> (bukan perdana dan bukan gabungan).`, 'Nombor perdana');
    },
    n_square(tops) { return setOrder([1, 4], tops[0], tops[1], `${nm(tops[0])} pada keping bernombor <b>kuasa dua sempurna</b>. Selebihnya ${nm(tops[1])}.`, 'Kuasa dua'); },
    n_cube(tops) { return setOrder([1, 8], tops[0], tops[1], `${nm(tops[0])} pada keping bernombor <b>kuasa tiga sempurna</b>. Selebihnya ${nm(tops[1])}.`, 'Kuasa tiga'); },
    n_root(tops) {
      const sq = P([[4, 2], [9, 3], [16, 4], [25, 5], [36, 6], [49, 7], [64, 8]]), cb = P([[1, 1], [8, 2], [27, 3]]);
      const a = sq, b = cb; if (a[1] === b[1]) return PREP.n_root(tops);
      const t = []; for (let i = 1; i <= 8; i++) t.push(i === a[1] ? tops[0] : i === b[1] ? tops[1] : tops[2]);
      return exactOrder(t, `${nm(tops[0])} pada keping bernombor <b>√${a[0]}</b>, ${nm(tops[1])} pada keping bernombor <b>∛${b[0]}</b>. Selebihnya ${nm(tops[2])}.`, 'Punca kuasa dua / tiga');
    },
    n_expr(tops) {
      let a, b, x, y, ex, ey, tx, ty; do { x = R(1, 3); a = R(1, 3); b = R(0, 2); y = R(1, 3); const c = R(1, 3), d = R(0, 2); ex = a * x + b; ey = c * y + d; tx = `${a === 1 ? '' : a}x${b ? ' + ' + b : ''}`; ty = `${c === 1 ? '' : c}y${d ? ' + ' + d : ''}`; } while (ex > 8 || ey > 8 || ex === ey || (a === 1 && !b));
      const t = []; for (let i = 1; i <= 8; i++) t.push(i === ex ? tops[0] : i === ey ? tops[1] : tops[2]);
      return exactOrder(t, `${nm(tops[0])} pada keping bernombor nilai <b>${tx}</b> apabila x = ${x}. ${nm(tops[1])} pada keping bernombor nilai <b>${ty}</b> apabila y = ${y}. Selebihnya ${nm(tops[2])}.`, 'Gantian ungkapan algebra');
    },
    n_eq(tops) {
      const s1 = R(1, 8); let s2 = R(1, 8); while (s2 === s1) s2 = R(1, 8);
      const a = R(1, 6); const e1 = `x + ${a} = ${s1 + a}`; const c = P([2, 3]); const e2 = P([`${c}x = ${c * s2}`, `${c}x − 1 = ${c * s2 - 1}`]);
      const t = []; for (let i = 1; i <= 8; i++) t.push(i === s1 ? tops[0] : i === s2 ? tops[1] : tops[2]);
      return exactOrder(t, `${nm(tops[0])} pada keping bernombor <b>x</b> jika <b>${e1}</b>. ${nm(tops[1])} pada keping bernombor <b>x</b> jika <b>${e2}</b>. Selebihnya ${nm(tops[2])}.`, 'Persamaan linear');
    },
    n_ineq(tops) {
      const k = R(0, 3); let s, txt;
      if (k === 0) { const a = R(2, 6); s = [1, 2, 3, 4, 5, 6, 7, 8].filter(v => v > a); txt = `x > ${a}`; }
      else if (k === 1) { const a = R(3, 7); s = [1, 2, 3, 4, 5, 6, 7, 8].filter(v => v <= a); txt = `x ≤ ${a}`; }
      else if (k === 2) { const a = R(2, 7); s = [1, 2, 3, 4, 5, 6, 7, 8].filter(v => v >= a); txt = `x ≥ ${a}`; }
      else { const a = R(1, 3), b = R(5, 8); s = [1, 2, 3, 4, 5, 6, 7, 8].filter(v => v > a && v <= b); txt = `${a} &lt; x ≤ ${b}`; }
      return setOrder(s, tops[0], tops[1], `${nm(tops[0])} pada keping bernombor <b>x</b> dengan <b>${txt}</b> (x ialah integer). Selebihnya ${nm(tops[1])}.`, 'Ketaksamaan');
    },
    n_sides(tops) {
      const POL = [['segi tiga', 3], ['sisi empat', 4], ['pentagon', 5], ['heksagon', 6], ['heptagon', 7], ['oktagon', 8]]; const [a, b] = shuffle(POL).slice(0, 2);
      const t = []; for (let i = 1; i <= 8; i++) t.push(i === a[1] ? tops[0] : i === b[1] ? tops[1] : tops[2]);
      return exactOrder(t, `${nm(tops[0])} pada keping bernombor <b>bilangan sisi ${a[0]}</b>, ${nm(tops[1])} pada keping bernombor <b>bilangan sisi ${b[0]}</b>. Selebihnya ${nm(tops[2])}.`, 'Bilangan sisi poligon');
    },
    n_set(tops) {
      const D = [['nombor genap', [2, 4, 6, 8]], ['nombor perdana', [2, 3, 5, 7]], ['faktor bagi 8', [1, 2, 4, 8]], ['gandaan 3', [3, 6]], ['nombor ganjil', [1, 3, 5, 7]], ['nombor kurang daripada 4', [1, 2, 3]]];
      const [name, s] = P(D); const def = R(0, 1) ? `A = {x : x ialah <b>${name}</b>}` : `A = {${s.join(', ')}}`;
      return setOrder(s, tops[0], tops[1], `ξ = ${NUMS} (nombor keping). Set ${def}. ${nm(tops[0])} pada unsur set <b>A</b>, ${nm(tops[1])} pada unsur set <b>A′</b> (pelengkap A).`, 'Pelengkap set');
    }
  };

  /* ---------- counter challenges ---------- */
  const C = {
    /* 1 Nombor Nisbah */
    int() {
      const k = R(0, 3);
      if (k === 0) { const a = R(-9, -2), d = R(3, 12); return T({ topic: 'Integer', q: `Suhu peti sejuk ialah <mark>${m(a)}°C</mark>. Ia naik <mark>${d}°C</mark>. Berapakah suhu sekarang?`, ans: a + d, suf: '°C', hint: `Tambah ${d} kepada ${m(a)}`, sol: `${m(a)} + ${d} = ${m(a + d)}` }); }
      if (k === 1) { const a = R(-8, 8), b = R(-9, -2); return T({ topic: 'Integer', q: `Hitung <mark>${m(a)} − (${m(b)})</mark>.`, ans: a - b, hint: 'Menolak integer negatif sama dengan menambah integer positif', sol: `${m(a)} + ${-b} = ${m(a - b)}` }); }
      if (k === 2) { const a = R(-9, 9), b = R(-9, -2), c = R(2, 6); return T({ topic: 'Integer', q: `Hitung <mark>${m(a)} + (${m(b)}) × ${c}</mark>.`, ans: a + b * c, hint: 'Darab dahulu, kemudian tambah (tertib operasi)', sol: `${m(a)} + (${m(b * c)}) = ${m(a + b * c)}` }); }
      const b = R(2, 6), q = R(-9, -2); return T({ topic: 'Integer', q: `Hitung <mark>${m(b * q)} ÷ ${b}</mark>.`, ans: q, hint: 'Negatif dibahagi positif = negatif', sol: `${m(b * q)} ÷ ${b} = ${m(q)}` });
    },
    frac() {
      const D = [2, 4, 5, 8, 10];
      for (;;) {   // denominators 2,4,5,8,10 keep every answer an exact decimal; subtraction must stay positive
        const d1 = P(D), d2 = P(D), n1 = R(1, d1 - 1), n2 = R(1, d2 - 1), op = P(['+', '−']);
        if (op === '−' && n1 / d1 <= n2 / d2) continue;
        return C.fracMake(n1, d1, n2, d2, op);
      }
    },
    fracMake(n1, d1, n2, d2, op) {
      const v = op === '+' ? n1 / d1 + n2 / d2 : n1 / d1 - n2 / d2;
      return T({ topic: 'Pecahan', q: `Hitung <mark>${n1}/${d1} ${op} ${n2}/${d2}</mark>. (Jawab sebagai perpuluhan, cth. 0.75, atau pecahan, cth. 3/4)`, ans: v, hint: `Samakan penyebut dahulu (guna GSTK bagi ${d1} dan ${d2})`, sol: `= ${dec(v)}` });
    },
    dec() {
      const pc = R(55, 140) * 10, dc = R(12, 45) * 10, tc = pc + dc; const paid = P([20, 30, 50].filter(v => v * 100 > tc));
      return T({ label: 'Bil', pre: 'RM', topic: 'Perpuluhan', base: tc / 100, ans: (paid * 100 - tc) / 100, q: `Pizza <mark>RM${f2(pc)}</mark> dan air <mark>RM${f2(dc)}</mark>. Pelanggan bayar <mark>RM${paid}</mark>. Berapakah baki?`,
        hint: `Jumlah bil dahulu: ${f2(pc)} + ${f2(dc)}, kemudian ${paid} − jumlah`, sol: `Bil = ${f2(tc)}; baki = ${f2(paid * 100 - tc)}` });
    },
    dec2() { const a = R(11, 49) / 10, k = R(2, 9); return T({ topic: 'Perpuluhan', q: `Sebiji kotak pizza berharga <mark>RM${a.toFixed(2)}</mark>. Berapakah harga <mark>${k}</mark> kotak?`, pre: 'RM', ans: Math.round(a * k * 100) / 100, hint: `Darab ${a.toFixed(2)} × ${k}`, sol: `${a.toFixed(2)} × ${k} = ${(a * k).toFixed(2)}` }); },

    /* 2 Faktor dan Gandaan */
    hcf() { const L = [12, 18, 24, 30, 36, 42, 48, 60]; const a = P(L); let b = P(L); while (b === a) b = P(L);
      return T({ topic: 'FSTB', q: `Ada <mark>${a}</mark> pizza keju dan <mark>${b}</mark> pizza pepperoni. Semuanya disusun dalam kotak dengan bilangan pizza yang sama; setiap kotak satu jenis sahaja. Berapakah bilangan pizza paling banyak dalam sebuah kotak?`, ans: gcd(a, b), suf: 'biji', hint: `Cari FSTB bagi ${a} dan ${b}`, sol: `FSTB(${a}, ${b}) = ${gcd(a, b)}` }); },
    hcf3() { const g = P([2, 3, 4, 6]); const mm = shuffle([2, 3, 4, 5, 6]).slice(0, 3); const [a, b, c] = mm.map(x => x * g); const ans = gcd(gcd(a, b), c);
      return T({ topic: 'FSTB', q: `Tiga rak mengandungi <mark>${a}</mark>, <mark>${b}</mark> dan <mark>${c}</mark> keping pizza. Semua keping disusun dalam kumpulan sama banyak tanpa baki. Berapakah bilangan paling banyak dalam satu kumpulan?`, ans, hint: 'Cari FSTB bagi tiga nombor itu (guna pembahagian berulang)', sol: `FSTB = ${ans}` }); },
    lcm() { const a = P([2, 3, 4, 5, 6, 8]); let b = P([3, 4, 5, 6, 9, 10]); while (b === a) b = P([3, 4, 5, 6, 9, 10]);
      return T({ topic: 'GSTK', q: `Promosi A diadakan setiap <mark>${a}</mark> hari dan promosi B setiap <mark>${b}</mark> hari. Hari ini kedua-duanya diadakan. Selepas berapa hari kedua-duanya diadakan serentak lagi?`, ans: lcm(a, b), suf: 'hari', hint: `Cari GSTK bagi ${a} dan ${b}`, sol: `GSTK(${a}, ${b}) = ${lcm(a, b)}` }); },
    nfactor() { const n = P([12, 16, 18, 20, 24, 28, 30, 36, 15, 21]); let c = 0; for (let i = 1; i <= n; i++) if (n % i === 0) c++;
      return T({ topic: 'Faktor', q: `Berapakah bilangan faktor bagi <mark>${n}</mark>?`, ans: c, hint: `Senaraikan semua nombor yang boleh membahagi ${n} tanpa baki`, sol: `Ada ${c} faktor` }); },
    pf() { const n = P([30, 28, 45, 42, 66, 70, 52, 63, 75, 44]); let x = n, l = 1; for (let p = 2; p <= x; p++) while (x % p === 0) { l = p; x /= p; }
      return T({ topic: 'Faktor perdana', q: `Berapakah faktor perdana yang <b>paling besar</b> bagi <mark>${n}</mark>?`, ans: l, hint: `Bahagikan ${n} berulang kali dengan nombor perdana (pemfaktoran perdana)`, sol: `Faktor perdana terbesar = ${l}` }); },

    /* 3 Kuasa dua, punca kuasa dua, kuasa tiga, punca kuasa tiga */
    sq() { const n = R(3, 15); return T({ topic: 'Kuasa dua', q: `Sebuah kotak pizza berbentuk segi empat sama dengan sisi <mark>${n} cm</mark>. Berapakah luasnya?`, ans: n * n, suf: 'cm²', hint: 'Luas = sisi × sisi', sol: `${n}² = ${n * n}` }); },
    sqrt() { const n = R(3, 15); return T({ topic: 'Punca kuasa dua', q: `Luas sebuah kotak pizza segi empat sama ialah <mark>${n * n} cm²</mark>. Berapakah panjang sisinya?`, ans: n, suf: 'cm', hint: `Cari nombor yang didarab dengan dirinya = ${n * n}`, sol: `√${n * n} = ${n}` }); },
    cube() { const n = R(2, 9); return T({ topic: 'Kuasa tiga', q: `Sebuah kotak hadiah berbentuk kubus dengan sisi <mark>${n} cm</mark>. Berapakah isi padunya?`, ans: n ** 3, suf: 'cm³', hint: 'Isi padu kubus = sisi × sisi × sisi', sol: `${n}³ = ${n ** 3}` }); },
    cbrt() { const n = R(2, 9); return T({ topic: 'Punca kuasa tiga', q: `Isi padu sebuah kotak kubus ialah <mark>${n ** 3} cm³</mark>. Berapakah panjang sisinya?`, ans: n, suf: 'cm', hint: `Cari nombor yang didarab tiga kali = ${n ** 3}`, sol: `∛${n ** 3} = ${n}` }); },
    mixpow() { const a = R(2, 9), b = R(2, 5), c = R(2, Math.min(8, a * a)); return T({ topic: 'Operasi kuasa dan punca', q: `Hitung <mark>${a}² + ∛${b ** 3} − √${c * c}</mark>.`, ans: a * a + b - c, hint: 'Cari setiap nilai dahulu, kemudian tambah dan tolak', sol: `${a * a} + ${b} − ${c} = ${a * a + b - c}` }); },

    /* 4 Nisbah, kadar dan kadaran */
    share() { const a = R(1, 5), b = R(1, 5), k = R(2, 6); return T({ topic: 'Nisbah', q: `Ali dan Siti berkongsi <mark>${k * (a + b)}</mark> keping pizza mengikut nisbah <mark>${a} : ${b}</mark>. Berapakah keping untuk Siti?`, ans: k * b, suf: 'keping', hint: `Jumlah bahagian = ${a} + ${b} = ${a + b}`, sol: `${k * (a + b)} ÷ ${a + b} × ${b} = ${k * b}` }); },
    ratioq() { const a = R(2, 5); let b = R(2, 7); while (b === a) b = R(2, 7); const k = R(2, 6); return T({ topic: 'Nisbah', q: `Nisbah pepperoni kepada cendawan pada sebiji pizza ialah <mark>${a} : ${b}</mark>. Jika ada <mark>${k * a}</mark> keping pepperoni, berapa keping cendawan?`, ans: k * b, suf: 'keping', hint: `${a} bahagian = ${k * a}, jadi satu bahagian = ${k}`, sol: `${k} × ${b} = ${k * b}` }); },
    rate() { const v = R(4, 12) * 5, t = R(2, 5); return T({ topic: 'Kadar', q: `Penghantar pizza bergerak <mark>${v * t} km</mark> dalam <mark>${t} jam</mark>. Berapakah lajunya?`, ans: v, suf: 'km/j', hint: 'Laju = jarak ÷ masa', sol: `${v * t} ÷ ${t} = ${v}` }); },
    unit() { const n = R(3, 8), p = R(3, 15); return T({ topic: 'Kadar', q: `<mark>${n}</mark> kotak pizza berharga <mark>RM${n * p}</mark>. Berapakah harga sebuah kotak?`, pre: 'RM', ans: p, hint: 'Harga seunit = jumlah ÷ bilangan', sol: `${n * p} ÷ ${n} = ${p}` }); },
    prop() { const a = R(2, 6); let b = R(3, 12); while (b === a) b = R(3, 12); const p = R(5, 14); return T({ topic: 'Kadaran', q: `<mark>${a}</mark> pizza berharga <mark>RM${a * p}</mark>. Berapakah harga <mark>${b}</mark> pizza yang sama?`, pre: 'RM', ans: b * p, base: b * p, hint: `Cari harga satu pizza dahulu: ${a * p} ÷ ${a}`, sol: `${p} × ${b} = ${b * p}` }); },
    recipe() { const a = R(2, 5), b = R(1, 4), k = R(2, 6); return T({ topic: 'Kadaran', q: `Resipi doh: <mark>${a}</mark> cawan tepung dengan <mark>${b}</mark> cawan air. Jika guna <mark>${a * k}</mark> cawan tepung, berapa cawan air diperlukan?`, ans: b * k, suf: 'cawan', hint: `Tepung digandakan ${k} kali, jadi air juga`, sol: `${b} × ${k} = ${b * k}` }); },

    /* 5 Ungkapan algebra */
    subst(order) { const n = nTop(order), a = R(2, 4), b = R(2, 6), price = a * n + b; const paid = P([20, 30, 50].filter(v => v > price));
      return T({ label: 'Bil', pre: 'RM', topic: 'Gantian ungkapan', base: price, ans: paid - price, q: `Harga pizza (RM) = <mark>${a}n + ${b}</mark>, dengan <i>n</i> = bilangan jenis topping. Pizza ini ada <mark>${n}</mark> jenis topping. Pelanggan bayar <mark>RM${paid}</mark>. Berapakah baki?`,
        hint: `Gantikan n = ${n}: ${a}(${n}) + ${b}`, sol: `Harga = ${price}; baki = ${paid} − ${price} = ${paid - price}` }); },
    evalx() { const a = R(2, 6), b = R(2, 6), x = R(1, 6), y = R(1, 6); return T({ topic: 'Gantian ungkapan', q: `Nilai bagi <mark>${a}x + ${b}y</mark> apabila <mark>x = ${x}</mark> dan <mark>y = ${y}</mark> ialah …`, ans: a * x + b * y, hint: `Gantikan nilai x dan y: ${a}(${x}) + ${b}(${y})`, sol: `${a * x} + ${b * y} = ${a * x + b * y}` }); },
    simp() { const a = R(2, 9), b = R(2, 9), c = R(1, a + b - 1); return T({ topic: 'Permudahan ungkapan', q: `Permudahkan <mark>${a}x + ${b}x − ${c}x</mark>. Hasilnya ialah <i>k</i>x. Berapakah <i>k</i>?`, ans: a + b - c, hint: 'Sebutan serupa: tambah dan tolak pekali sahaja', sol: `${a} + ${b} − ${c} = ${a + b - c}` }); },
    coef() { const a = R(2, 9), b = R(2, 9), c = R(1, 9); const which = P(['p', 'q']); return T({ topic: 'Pekali dan sebutan', q: `Dalam ungkapan <mark>${a}p + ${b}q + ${c}</mark>, berapakah pekali bagi <b>${which}</b>?`, ans: which === 'p' ? a : b, hint: 'Pekali ialah nombor yang mendarab pemboleh ubah', sol: `Pekali ${which} = ${which === 'p' ? a : b}` }); },

    /* 6 Persamaan linear */
    lin1() { const k = R(0, 2), x = R(2, 12);
      if (k === 0) { const a = R(2, 5), b = R(1, 9); return T({ topic: 'Persamaan 1 pemboleh ubah', q: `Selesaikan <mark>${a}x + ${b} = ${a * x + b}</mark>. Berapakah x?`, ans: x, hint: `${a}x = ${a * x + b} − ${b}`, sol: `${a}x = ${a * x}; x = ${x}` }); }
      if (k === 1) { const a = R(2, 5), b = R(1, 9); return T({ topic: 'Persamaan 1 pemboleh ubah', q: `Selesaikan <mark>${a}x − ${b} = ${a * x - b}</mark>. Berapakah x?`, ans: x, hint: `${a}x = ${a * x - b} + ${b}`, sol: `${a}x = ${a * x}; x = ${x}` }); }
      const a = P([2, 3]), d = R(2, 4); return T({ topic: 'Persamaan 1 pemboleh ubah', q: `<mark>${a}</mark> biji pizza yang sama harga dan <mark>1</mark> air <mark>RM${d}</mark> berjumlah <mark>RM${a * x + d}</mark>. Cari harga <b>sebiji pizza</b>.`, pre: 'RM', base: a * x + d, ans: x, hint: `${a}x + ${d} = ${a * x + d}  →  ${a}x = ${a * x}`, sol: `x = ${x}` }); },
    sim() { const x = R(6, 14), y = R(2, 5); const ask = R(0, 1); return T({ topic: 'Persamaan serentak', pre: 'RM', base: x + y, q: `Harga pizza = <i>p</i> dan harga air = <i>a</i> (dalam RM). <mark>p + a = ${x + y}</mark> dan <mark>p − a = ${x - y}</mark>. Berapakah harga ${ask ? '<b>air</b> (a)' : '<b>pizza</b> (p)'}?`,
      ans: ask ? y : x, hint: 'Tambah kedua-dua persamaan untuk hapuskan a: 2p = …', sol: `2p = ${2 * x}; p = ${x}; a = ${y}` }); },

    /* 7 Ketaksamaan linear */
    maxn() { const p = R(6, 14), B = R(30, 90); const n = Math.floor(B / p); return T({ topic: 'Ketaksamaan', q: `Pelanggan ada <mark>RM${B}</mark>. Sebiji pizza berharga <mark>RM${p}</mark>. Bilangan pizza maksimum yang boleh dibeli ialah …`, ans: n, suf: 'biji', hint: `${p}n ≤ ${B}`, sol: `n ≤ ${(B / p).toFixed(2)}, jadi maksimum ${n}` }); },
    minint() { const a = R(2, 5), b = R(1, 9), x0 = R(2, 9), c = a * x0 + b - R(0, a - 1); const ans = Math.floor((c - b) / a) + 1; return T({ topic: 'Ketaksamaan', q: `Cari nilai <b>integer terkecil</b> x yang memuaskan <mark>${a}x + ${b} > ${c}</mark>.`, ans, hint: `${a}x > ${c} − ${b}, kemudian bahagi dengan ${a}`, sol: `x > ${dec((c - b) / a)}, jadi x terkecil = ${ans}` }); },
    cntint() { const a = R(-3, 4), b = a + R(3, 8); const lo = P(['<', '≤']), hi = P(['<', '≤']); let c = 0; for (let x = a - 1; x <= b + 1; x++) if ((lo === '<' ? a < x : a <= x) && (hi === '<' ? x < b : x <= b)) c++;
      const sym = s => s === '<' ? '&lt;' : s;
      return T({ topic: 'Ketaksamaan', q: `Berapakah bilangan integer x yang memuaskan <mark>${m(a)} ${sym(lo)} x ${sym(hi)} ${b}</mark>?`, ans: c, hint: 'Senaraikan integer yang memenuhi; perhatikan sama ada hujungnya termasuk (≤) atau tidak (<)', sol: `Ada ${c} integer` }); },
    ineqsimple() { const a = R(2, 9), b = R(3, 15); return T({ topic: 'Ketaksamaan', q: `Nilai x terkecil (integer) yang memuaskan <mark>x − ${a} ≥ ${b}</mark> ialah …`, ans: a + b, hint: `Tambah ${a} kepada kedua-dua belah`, sol: `x ≥ ${a + b}` }); },

    /* 8 Garis dan sudut */
    comp() { const x = R(10, 80); return T({ topic: 'Sudut pelengkap / penggenap', q: `Sudut pelengkap bagi <mark>${x}°</mark> ialah …`, suf: '°', ans: 90 - x, hint: 'Sudut pelengkap berjumlah 90°', sol: `90 − ${x} = ${90 - x}` }); },
    supp() { const x = R(20, 160); return T({ topic: 'Sudut pelengkap / penggenap', q: `Sudut penggenap bagi <mark>${x}°</mark> ialah …`, suf: '°', ans: 180 - x, hint: 'Sudut penggenap berjumlah 180°', sol: `180 − ${x} = ${180 - x}` }); },
    point() { const a = R(60, 140), b = R(60, 140); return T({ topic: 'Sudut pada satu titik', q: `Tiga sudut pada satu titik ialah <mark>${a}°</mark>, <mark>${b}°</mark> dan x°. Cari x.`, suf: '°', ans: 360 - a - b, hint: 'Sudut pada satu titik berjumlah 360°', sol: `360 − ${a} − ${b} = ${360 - a - b}` }); },
    cut() { const n = P([4, 5, 6, 8, 9, 10, 12]); return T({ topic: 'Sudut pada satu titik', q: `Sebiji pizza dipotong kepada <mark>${n}</mark> keping yang sama besar. Berapakah sudut di pusat bagi setiap keping?`, suf: '°', ans: 360 / n, hint: 'Satu pusingan penuh = 360°', sol: `360 ÷ ${n} = ${360 / n}` }); },
    vert() { const x = R(25, 155); return T({ topic: 'Garis bersilang', q: `Dua garis lurus bersilang. Satu sudut ialah <mark>${x}°</mark>. Berapakah sudut yang <b>bersebelahan</b> dengannya pada garis lurus yang sama?`, suf: '°', ans: 180 - x, hint: 'Sudut pada garis lurus berjumlah 180°', sol: `180 − ${x} = ${180 - x}` }); },
    vertopp() { const x = R(25, 155); return T({ topic: 'Garis bersilang', q: `Dua garis lurus bersilang. Satu sudut ialah <mark>${x}°</mark>. Berapakah sudut <b>bertentangan puncak</b> dengannya?`, suf: '°', ans: x, hint: 'Sudut bertentangan puncak adalah sama', sol: `= ${x}°` }); },
    par() { const a = R(40, 140), k = R(0, 2); const nm2 = ['sepadan', 'selang-seli', 'dalam yang sebelah menyebelah (jumlah 180°)'];
      return T({ topic: 'Garis selari dan garis rentas lintang', q: `Dua garis selari dipotong oleh satu garis rentas lintang. Satu sudut ialah <mark>${a}°</mark>. Berapakah sudut <b>${nm2[k]}</b> dengannya?`, suf: '°', ans: k < 2 ? a : 180 - a, hint: k < 2 ? 'Sudut sepadan dan selang-seli adalah sama' : 'Sudut dalam sebelah menyebelah berjumlah 180°', sol: `= ${k < 2 ? a : 180 - a}°` }); },

    /* 9 Poligon asas */
    tri() { const a = R(30, 80), b = R(30, 80); return T({ topic: 'Sudut segi tiga', q: `Dua sudut dalam sebuah segi tiga ialah <mark>${a}°</mark> dan <mark>${b}°</mark>. Sudut dalam ketiga ialah …`, suf: '°', ans: 180 - a - b, hint: 'Jumlah sudut dalam segi tiga = 180°', sol: `180 − ${a} − ${b} = ${180 - a - b}` }); },
    ext() { const a = R(30, 80), b = R(30, 80); return T({ topic: 'Sudut luar segi tiga', q: `Dua sudut dalam bertentangan sebuah segi tiga ialah <mark>${a}°</mark> dan <mark>${b}°</mark>. Berapakah sudut luarnya?`, suf: '°', ans: a + b, hint: 'Sudut luar = hasil tambah dua sudut dalam bertentangan', sol: `${a} + ${b} = ${a + b}` }); },
    quad() { const a = R(60, 110), b = R(60, 110), c = R(60, 110); return T({ topic: 'Sudut sisi empat', q: `Tiga sudut dalam sebuah sisi empat ialah <mark>${a}°</mark>, <mark>${b}°</mark> dan <mark>${c}°</mark>. Sudut keempat ialah …`, suf: '°', ans: 360 - a - b - c, hint: 'Jumlah sudut dalam sisi empat = 360°', sol: `360 − ${a} − ${b} − ${c} = ${360 - a - b - c}` }); },
    para() { const a = R(50, 130); const opp = R(0, 1); return T({ topic: 'Sifat sisi empat', q: `Dalam sebuah segi empat selari, satu sudut ialah <mark>${a}°</mark>. Berapakah sudut ${opp ? '<b>bertentangan</b>' : '<b>bersebelahan</b>'} dengannya?`, suf: '°', ans: opp ? a : 180 - a, hint: opp ? 'Sudut bertentangan segi empat selari adalah sama' : 'Sudut bersebelahan berjumlah 180°', sol: `= ${opp ? a : 180 - a}°` }); },
    diag() { const P2 = [['pentagon', 5], ['heksagon', 6], ['heptagon', 7], ['oktagon', 8]]; const [nme, n] = P(P2); return T({ topic: 'Pepenjuru poligon', q: `Berapakah bilangan pepenjuru yang boleh dilukis dari <b>satu bucu</b> sebuah ${nme} (${n} sisi)?`, ans: n - 3, hint: 'Pepenjuru tidak dilukis ke bucu itu sendiri dan dua bucu bersebelahan', sol: `${n} − 3 = ${n - 3}` }); },

    /* 10 Perimeter dan luas */
    rectp() { const l = R(20, 60), w = R(10, 40); return T({ topic: 'Perimeter', q: `Kotak pizza segi empat tepat berukuran <mark>${l} cm × ${w} cm</mark>. Berapakah perimeternya?`, suf: 'cm', ans: 2 * (l + w), hint: 'Perimeter = 2 × (panjang + lebar)', sol: `2 × (${l} + ${w}) = ${2 * (l + w)}` }); },
    tria() { const b = R(5, 15) * 2, h = R(4, 14); return T({ topic: 'Luas segi tiga', q: `Sebuah segi tiga mempunyai tapak <mark>${b} cm</mark> dan tinggi <mark>${h} cm</mark>. Berapakah luasnya?`, suf: 'cm²', ans: b * h / 2, hint: 'Luas = ½ × tapak × tinggi', sol: `½ × ${b} × ${h} = ${b * h / 2}` }); },
    paraa() { const b = R(5, 20), h = R(4, 14); return T({ topic: 'Luas segi empat selari', q: `Tapak sebuah segi empat selari ialah <mark>${b} cm</mark> dan tingginya <mark>${h} cm</mark>. Berapakah luasnya?`, suf: 'cm²', ans: b * h, hint: 'Luas = tapak × tinggi', sol: `${b} × ${h} = ${b * h}` }); },
    kite() { const d1 = R(3, 12) * 2, d2 = R(3, 14); return T({ topic: 'Luas layang-layang', q: `Dua pepenjuru sebuah layang-layang ialah <mark>${d1} cm</mark> dan <mark>${d2} cm</mark>. Berapakah luasnya?`, suf: 'cm²', ans: d1 * d2 / 2, hint: 'Luas = ½ × hasil darab dua pepenjuru', sol: `½ × ${d1} × ${d2} = ${d1 * d2 / 2}` }); },
    trap() { let s = R(4, 14), t = R(4, 14); if ((s + t) % 2) t++; const h = R(3, 12); return T({ topic: 'Luas trapezium', q: `Dua sisi selari sebuah trapezium ialah <mark>${s} cm</mark> dan <mark>${t} cm</mark>, tinggi <mark>${h} cm</mark>. Berapakah luasnya?`, suf: 'cm²', ans: (s + t) * h / 2, hint: 'Luas = ½ × (hasil tambah sisi selari) × tinggi', sol: `½ × ${s + t} × ${h} = ${(s + t) * h / 2}` }); },
    relpa() { const s = R(3, 12); return T({ topic: 'Perimeter dan luas', q: `Perimeter sebuah kotak pizza segi empat sama ialah <mark>${4 * s} cm</mark>. Berapakah luasnya?`, suf: 'cm²', ans: s * s, hint: `Sisi = perimeter ÷ 4 = ${s}`, sol: `${s} × ${s} = ${s * s}` }); },
    widthq() { const l = R(8, 20), w = R(4, 12); return T({ topic: 'Perimeter dan luas', q: `Luas sebuah dulang segi empat tepat ialah <mark>${l * w} cm²</mark> dan panjangnya <mark>${l} cm</mark>. Berapakah lebarnya?`, suf: 'cm', ans: w, hint: 'Lebar = luas ÷ panjang', sol: `${l * w} ÷ ${l} = ${w}` }); },

    /* 11 Pengenalan set */
    comps() { const U = R(20, 40), a = R(6, U - 6); return T({ topic: 'Pelengkap set', q: `Antara <mark>${U}</mark> pelanggan, <mark>${a}</mark> memilih pepperoni (set A). Jika ξ ialah semua pelanggan, berapakah <b>n(A′)</b>, iaitu yang tidak memilih pepperoni?`, ans: U - a, hint: 'n(A′) = n(ξ) − n(A)', sol: `${U} − ${a} = ${U - a}` }); },
    cnt() { const k = R(3, 7); const pool = shuffle([2, 4, 6, 8, 10, 12, 14, 16, 18, 20]).slice(0, k).sort((x, y) => x - y); return T({ topic: 'Bilangan unsur set', q: `Set A = {${pool.join(', ')}}. Nyatakan <b>n(A)</b>.`, ans: k, hint: 'n(A) = bilangan unsur dalam set A', sol: `n(A) = ${k}` }); },
    subs() { const n = R(1, 3); const names = ['{pepperoni}', '{pepperoni, nanas}', '{pepperoni, nanas, cendawan}']; return T({ topic: 'Subset', q: `Set B = ${names[n - 1]} mempunyai ${n} unsur. Berapakah bilangan <b>subset</b> bagi B (termasuk set kosong dan B sendiri)?`, ans: 2 ** n, hint: 'Senaraikan semua subset: set kosong, setiap unsur, gabungan unsur, dan set itu sendiri', sol: `2^${n} = ${2 ** n}` }); },
    empty() { const U = R(15, 30), a = R(3, 10), b = R(3, 10); return T({ topic: 'Pelengkap set', q: `Dalam ξ ada <mark>${U}</mark> unsur. Set A mempunyai <mark>${a}</mark> unsur dan set B = A′ (pelengkap A). Berapakah <b>n(B)</b>?`, ans: U - a, hint: 'B ialah pelengkap A, jadi n(B) = n(ξ) − n(A)', sol: `${U} − ${a} = ${U - a}` }); },

    /* 12 Pengendalian data */
    freq() { let a, b, c; do { a = R(5, 20); b = R(5, 20); c = R(5, 20); } while (a === b && b === c); const k = P([0, 1]); const hi = Math.max(a, b, c), lo = Math.min(a, b, c);
      return T({ topic: 'Jadual kekerapan', q: `Jadual kekerapan jualan: Pepperoni <mark>${a}</mark>, Cendawan <mark>${b}</mark>, Nanas <mark>${c}</mark>. ${k ? 'Berapakah <b>jumlah</b> pizza terjual?' : 'Berapakah <b>beza</b> antara jualan paling banyak dengan paling sedikit?'}`,
        ans: k ? a + b + c : hi - lo, hint: k ? 'Tambah semua kekerapan' : 'Cari nilai terbesar dan terkecil, kemudian tolak', sol: k ? `${a} + ${b} + ${c} = ${a + b + c}` : `${hi} − ${lo} = ${hi - lo}` }); },
    tally() { const g = R(2, 6), r = R(1, 4); return T({ topic: 'Jadual kekerapan', q: `Tally jualan hari ini: <mark>${g}</mark> kumpulan lima (𝍸) dan <mark>${r}</mark> palang tunggal (|). Berapakah kekerapannya?`, ans: g * 5 + r, hint: 'Setiap kumpulan lima mewakili 5', sol: `${g} × 5 + ${r} = ${g * 5 + r}` }); },
    pie() { const tot = P([8, 12, 18, 20, 24, 30, 36, 40]); let c; do { c = R(1, tot - 1); } while ((360 * c) % tot !== 0);
      if (R(0, 1)) return T({ topic: 'Carta pai', q: `Dalam carta pai, <mark>${c}</mark> daripada <mark>${tot}</mark> pelanggan memilih pepperoni. Berapakah sudut sektor pepperoni?`, suf: '°', ans: 360 * c / tot, hint: `Sudut = ${c}/${tot} × 360°`, sol: `${c}/${tot} × 360 = ${360 * c / tot}` });
      return T({ topic: 'Carta pai', q: `Dalam carta pai bagi <mark>${tot}</mark> pelanggan, sektor pepperoni ialah <mark>${360 * c / tot}°</mark>. Berapakah pelanggan yang memilih pepperoni?`, ans: c, hint: `Bilangan = ${360 * c / tot}/360 × ${tot}`, sol: `${360 * c / tot}/360 × ${tot} = ${c}` }); },
    picto() { const k = P([2, 4, 5, 10]), n = R(2, 8), half = k % 2 === 0 && R(0, 1); return T({ topic: 'Piktograf', q: `Dalam piktograf, setiap 🍕 mewakili <mark>${k}</mark> pizza. Hari Isnin ada <mark>${n}${half ? ' dan setengah' : ''}</mark> 🍕. Berapakah pizza dijual hari Isnin?`, ans: n * k + (half ? k / 2 : 0), hint: 'Darab bilangan simbol dengan nilai satu simbol', sol: `${n}${half ? '.5' : ''} × ${k} = ${n * k + (half ? k / 2 : 0)}` }); },
    range() { const v = shuffle([R(8, 14), R(15, 22), R(23, 30), R(6, 12), R(12, 20)]); return T({ topic: 'Tafsiran data', q: `Jualan pizza lima hari: <mark>${v.join(', ')}</mark>. Berapakah beza antara jualan <b>tertinggi</b> dengan <b>terendah</b>?`, ans: Math.max(...v) - Math.min(...v), hint: 'Cari nilai terbesar dan terkecil', sol: `${Math.max(...v)} − ${Math.min(...v)} = ${Math.max(...v) - Math.min(...v)}` }); },

    /* 13 Teorem Pythagoras */
    hyp() { const [a, b, c] = P(TRIPLES); const k = P([1, 1, 2]); return T({ topic: 'Teorem Pythagoras', q: `Sebuah segi tiga bersudut tegak mempunyai sisi tegak <mark>${a * k} cm</mark> dan <mark>${b * k} cm</mark>. Berapakah panjang hipotenusnya?`, suf: 'cm', ans: c * k, hint: 'c² = a² + b²', sol: `√(${(a * k) ** 2} + ${(b * k) ** 2}) = ${c * k}` }); },
    leg() { const [a, b, c] = P(TRIPLES); const k = P([1, 1, 2]); return T({ topic: 'Teorem Pythagoras', q: `Hipotenus sebuah segi tiga bersudut tegak ialah <mark>${c * k} cm</mark> dan satu sisi tegak <mark>${a * k} cm</mark>. Berapakah sisi tegak yang satu lagi?`, suf: 'cm', ans: b * k, hint: 'a² = c² − b²', sol: `√(${(c * k) ** 2} − ${(a * k) ** 2}) = ${b * k}` }); },
    box() { const [a, b, c] = P([[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 15, 17]]); const k = P([2, 3, 4]); return T({ topic: 'Teorem Pythagoras', q: `Sebuah kotak pizza segi empat tepat berukuran <mark>${a * k} cm × ${b * k} cm</mark>. Berapakah panjang pepenjuru kotak itu?`, suf: 'cm', ans: c * k, hint: 'Pepenjuru ialah hipotenus bagi segi tiga bersudut tegak', sol: `√(${(a * k) ** 2} + ${(b * k) ** 2}) = ${c * k}` }); },
    conv() { const [a, b, c] = P(TRIPLES); const yes = R(0, 1); return T({ topic: 'Songsangan Pythagoras', q: `Sebuah segi tiga mempunyai sisi <mark>${a} cm</mark>, <mark>${b} cm</mark> dan <mark>${yes ? c : c + 1} cm</mark>. Adakah ia bersudut tegak? Taip <b>1</b> jika ya, <b>0</b> jika tidak.`, ans: yes ? 1 : 0, hint: `Semak sama ada ${a}² + ${b}² = ${yes ? c : c + 1}²`, sol: `${a * a} + ${b * b} = ${a * a + b * b}; ${(yes ? c : c + 1) ** 2} → ${yes ? 'ya' : 'tidak'}` }); }
  };
  const TRIPLES = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [20, 21, 29]];

  /* ---------- the 13 chapters ---------- */
  const mk = (n, title, desc, prep, cash, extra) => Object.assign({ n, title, desc, prep, cash, goal: 80, dur: 100, gap: [10, 14], patience: 85 }, extra || {});
  const CHAPTERS = [
    mk(1,  'Nombor Nisbah', 'Integer, pecahan, perpuluhan', ['frac', 'dec'], [C.int, C.int, C.frac, C.dec, C.dec2]),
    mk(2,  'Faktor dan Gandaan', 'Faktor, FSTB, gandaan, GSTK', ['n_factor', 'n_multiple', 'n_prime'], [C.hcf, C.hcf3, C.lcm, C.nfactor, C.pf]),
    mk(3,  'Kuasa Dua, Punca Kuasa Dua, Kuasa Tiga dan Punca Kuasa Tiga', 'Kuasa dua dan tiga, punca kuasa', ['n_square', 'n_cube', 'n_root', 'n_root'], [C.sq, C.sqrt, C.cube, C.cbrt, C.mixpow]),
    mk(4,  'Nisbah, Kadar dan Kadaran', 'Nisbah, kadar, kadaran', ['ratio', 'three'], [C.share, C.ratioq, C.rate, C.unit, C.prop, C.recipe]),
    mk(5,  'Ungkapan Algebra', 'Pemboleh ubah, gantian, permudahan', ['n_expr'], [C.subst, C.evalx, C.simp, C.coef]),
    mk(6,  'Persamaan Linear', 'Satu pemboleh ubah, persamaan serentak', ['n_eq'], [C.lin1, C.lin1, C.sim], { patience: 90 }),
    mk(7,  'Ketaksamaan Linear', 'Ketaksamaan, penyelesaian integer', ['n_ineq'], [C.maxn, C.minint, C.cntint, C.ineqsimple]),
    mk(8,  'Garis dan Sudut', 'Sudut pada satu titik, garis bersilang, garis selari', ['angle'], [C.comp, C.supp, C.point, C.cut, C.vert, C.vertopp, C.par]),
    mk(9,  'Poligon Asas', 'Segi tiga, sisi empat, sudut dalam dan luar', ['n_sides'], [C.tri, C.ext, C.quad, C.para, C.diag]),
    mk(10, 'Perimeter dan Luas', 'Perimeter; luas segi tiga, segi empat selari, layang-layang, trapezium', ['plain'], [C.rectp, C.tria, C.paraa, C.kite, C.trap, C.relpa, C.widthq]),
    mk(11, 'Pengenalan Set', 'Set, pelengkap, subset, gambar rajah Venn', ['n_set'], [C.comps, C.cnt, C.subs, C.empty]),
    mk(12, 'Pengendalian Data', 'Jadual kekerapan, piktograf, carta pai, tafsiran', ['plain'], [C.freq, C.tally, C.pie, C.picto, C.range]),
    mk(13, 'Teorem Pythagoras', 'Teorem Pythagoras dan songsangannya', ['plain'], [C.hyp, C.leg, C.box, C.conv], { patience: 90 })
  ];

  function genOrder(ch) {
    const tops = shuffle(TOPS); const kind = P(ch.prep); const o = PREP[kind](tops);
    o.kind = kind; return o;
  }
  function genCash(ch, order) {
    const c = P(ch.cash)(order);
    if (c.base === undefined) c.base = R(8, 15);
    return c;
  }
  window.PP_SYL = { CHAPTERS, TOP, TOPS, genOrder, genCash };
})();
