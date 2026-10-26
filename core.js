/* Placar de Sinuca: funções puras (sem DOM) — usadas pelo app e pelos testes */
(function (root) {
  'use strict';

  function ymd(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function hoje() { return ymd(new Date()); }
  function parseD(s) { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, m - 1, d); }
  function fmtD(s) { if (!s) return ''; const [y, m, d] = String(s).split('-'); return d + '/' + m + '/' + y; }
  function dow(s) { return parseD(s).getDay(); }
  function hhmm(ts) {
    const d = new Date(ts);
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  function sortDesc(a, b) { return (String(b.date).localeCompare(String(a.date))) || ((b.createdAt || 0) - (a.createdAt || 0)); }

  /* ---------- cores ---------- */
  function hexToRgb(h) {
    h = String(h).replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgbToHex(r, g, b) {
    const c = v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
    return '#' + c(r) + c(g) + c(b);
  }
  function mixHex(a, b, t) {
    const x = hexToRgb(a), y = hexToRgb(b);
    return rgbToHex(x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t);
  }
  const darken = (h, t) => mixHex(h, '#000000', t);
  const lighten = (h, t) => mixHex(h, '#ffffff', t);

  /* ---------- versão ---------- */
  function verNum(v) { return String(v).split('.').map(n => parseInt(n) || 0); }
  function verMaior(a, b) {
    const x = verNum(a), y = verNum(b);
    for (let i = 0; i < Math.max(x.length, y.length); i++) {
      const d = (x[i] || 0) - (y[i] || 0);
      if (d) return d > 0;
    }
    return false;
  }

  /* ---------- partidas ---------- */
  function resultado(m) { return m.setsMe > m.setsOp ? 'w' : m.setsMe < m.setsOp ? 'l' : 'd'; }
  const oppKey = s => String(s).trim().toLowerCase();

  function calc(list, modoSets) {
    let n = list.length, w = 0, l = 0, d = 0, sf = 0, sa = 0;
    list.forEach(m => {
      const r = resultado(m);
      if (r === 'w') w++; else if (r === 'l') l++; else d++;
      sf += m.setsMe; sa += m.setsOp;
    });
    if (modoSets) { n = sf + sa; w = sf; l = sa; d = 0; }
    return { n, w, l, d, sf, sa, pct: n ? Math.round(w / n * 100) : 0 };
  }

  /* filtro de relatórios: não altera a lista original */
  function filtrar(lista, F, skip, now) {
    now = now || new Date();
    return (lista || []).filter(m => {
      if (skip !== 'tipo' && F.tipo !== 'all' && m.tipo !== F.tipo) return false;
      if (skip !== 'opp' && F.opp !== 'all' && oppKey(m.opp) !== F.opp) return false;
      if (skip !== 'per' && F.per !== 'all') {
        const d = parseD(m.date);
        if (F.per === 'month' && !(d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear())) return false;
        if (F.per === 'year' && d.getFullYear() !== now.getFullYear()) return false;
        if (F.per === '30' && (now - d) / 864e5 > 30) return false;
        if (F.per === '90' && (now - d) / 864e5 > 90) return false;
      }
      return true;
    });
  }

  /* ---------- saneamento de importação ---------- */
  const DATA_RE = /^\d{4}-\d{2}-\d{2}$/;
  const HORA_RE = /^\d{2}:\d{2}$/;
  function dataValida(s) {
    if (!DATA_RE.test(String(s || ''))) return false;
    const d = parseD(s);
    return !isNaN(d) && d.getFullYear() === +s.slice(0, 4) && d.getMonth() + 1 === +s.slice(5, 7) && d.getDate() === +s.slice(8, 10);
  }
  function horaValida(s) {
    if (!HORA_RE.test(String(s || ''))) return false;
    const [h, m] = String(s).split(':').map(Number);
    return h < 24 && m < 60;
  }
  const nomeCurto = s => String(s == null ? '' : s).trim().slice(0, 40);

  function sanitizarPartida(x, tipos) {
    if (!x || !dataValida(x.date)) return null;
    tipos = tipos || {};
    return {
      id: String(x.id || uid()),
      date: x.date,
      opp: nomeCurto(x.opp) || 'Adversário',
      tipo: tipos[x.tipo] ? x.tipo : 'livre',
      meta: Math.max(0, Math.trunc(+x.meta || 0)),
      setsMe: Math.max(0, Math.trunc(+x.setsMe || 0)),
      setsOp: Math.max(0, Math.trunc(+x.setsOp || 0)),
      sets: Array.isArray(x.sets) ? x.sets.map(sanitizarSet).filter(Boolean) : [],
      createdAt: +x.createdAt || Date.now(),
      emAndamento: !!x.emAndamento,
      me: Math.max(0, Math.trunc(+x.me || 0)),
      op: Math.max(0, Math.trunc(+x.op || 0)),
      setsToWin: Math.max(0, Math.trunc(+x.setsToWin || 0))
    };
  }
  function sanitizarSet(s) {
    if (!s) return null;
    return {
      w: s.w === 'op' ? 'op' : 'me',
      me: Math.max(0, Math.trunc(+s.me || 0)),
      op: Math.max(0, Math.trunc(+s.op || 0)),
      sid: s.sid ? String(s.sid) : uid(),
      t: +s.t || 0
    };
  }
  function sanitizarPlacar(x, tipos) {
    if (!x || !dataValida(x.date) || !(+x.ts)) return null;
    tipos = tipos || {};
    return {
      id: String(x.id || uid()),
      matchId: String(x.matchId || ''),
      ts: +x.ts,
      date: x.date,
      opp: nomeCurto(x.opp) || 'Adversário',
      tipo: tipos[x.tipo] ? x.tipo : 'livre',
      meta: Math.max(0, Math.trunc(+x.meta || 0)),
      me: Math.max(0, Math.trunc(+x.me || 0)),
      op: Math.max(0, Math.trunc(+x.op || 0)),
      w: x.w === 'op' ? 'op' : 'me'
    };
  }
  function sanitizarAgenda(x, tipos) {
    if (!x || !dataValida(x.date)) return null;
    tipos = tipos || {};
    return {
      id: String(x.id || uid()),
      date: x.date,
      hora: horaValida(x.hora) ? x.hora : '',
      opp: nomeCurto(x.opp) || 'Adversário',
      tipo: tipos[x.tipo] ? x.tipo : 'livre',
      meta: Math.max(1, Math.trunc(+x.meta || 1)),
      nota: String(x.nota || '').slice(0, 120)
    };
  }

  const SinucaCore = {
    ymd, hoje, parseD, fmtD, dow, hhmm, esc, uid, sortDesc,
    hexToRgb, rgbToHex, mixHex, darken, lighten,
    verNum, verMaior, resultado, oppKey, calc, filtrar,
    dataValida, horaValida, sanitizarPartida, sanitizarSet, sanitizarPlacar, sanitizarAgenda
  };

  if (typeof module === 'object' && module.exports) module.exports = SinucaCore;
  else root.SinucaCore = SinucaCore;
})(typeof globalThis !== 'undefined' ? globalThis : this);
