import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const C = require('../core.js');

const TIPOS = {
  '3bolas': { nome: '3 Bolas', meta: 8, fixa: true },
  '5bolas': { nome: '5 Bolas', meta: 15 },
  livre: { nome: 'Livre', meta: 10 }
};

test('resultado da partida', () => {
  assert.equal(C.resultado({ setsMe: 2, setsOp: 1 }), 'w');
  assert.equal(C.resultado({ setsMe: 0, setsOp: 2 }), 'l');
  assert.equal(C.resultado({ setsMe: 1, setsOp: 1 }), 'd');
});

test('calc conta por partida', () => {
  const l = [
    { setsMe: 2, setsOp: 0 },
    { setsMe: 1, setsOp: 2 },
    { setsMe: 1, setsOp: 1 }
  ];
  assert.deepEqual(C.calc(l, false), { n: 3, w: 1, l: 1, d: 1, sf: 4, sa: 3, pct: 33 });
});

test('calc conta por set', () => {
  const l = [
    { setsMe: 2, setsOp: 0 },
    { setsMe: 1, setsOp: 2 }
  ];
  assert.deepEqual(C.calc(l, true), { n: 5, w: 3, l: 2, d: 0, sf: 3, sa: 2, pct: 60 });
});

test('calc com lista vazia não divide por zero', () => {
  assert.deepEqual(C.calc([], false), { n: 0, w: 0, l: 0, d: 0, sf: 0, sa: 0, pct: 0 });
});

test('filtrar por tipo, adversário e período', () => {
  const now = new Date(2026, 9, 26, 12, 0, 0); // 26/10/2026
  const lista = [
    { date: '2026-10-25', tipo: '3bolas', opp: 'Cabelo', setsMe: 2, setsOp: 0 },
    { date: '2026-10-20', tipo: '5bolas', opp: 'Zé', setsMe: 0, setsOp: 2 },
    { date: '2026-08-01', tipo: '3bolas', opp: 'Cabelo', setsMe: 1, setsOp: 2 },
    { date: '2025-12-31', tipo: 'livre', opp: 'Cabelo', setsMe: 1, setsOp: 1 }
  ];
  const F = { tipo: 'all', opp: 'all', per: 'all' };
  assert.equal(C.filtrar(lista, F, null, now).length, 4);
  assert.equal(C.filtrar(lista, { ...F, tipo: '3bolas' }, null, now).length, 2);
  assert.equal(C.filtrar(lista, { ...F, opp: 'cabelo' }, null, now).length, 3);
  assert.equal(C.filtrar(lista, { ...F, per: '30' }, null, now).length, 2);
  assert.equal(C.filtrar(lista, { ...F, per: 'month' }, null, now).length, 2);
  assert.equal(C.filtrar(lista, { ...F, per: 'year' }, null, now).length, 3);
});

test('filtrar ignora o próprio filtro quando skip é usado', () => {
  const now = new Date(2026, 9, 26, 12, 0, 0);
  const lista = [
    { date: '2026-10-25', tipo: '3bolas', opp: 'Cabelo', setsMe: 2, setsOp: 0 },
    { date: '2026-10-20', tipo: '5bolas', opp: 'Zé', setsMe: 0, setsOp: 2 }
  ];
  const F = { tipo: '5bolas', opp: 'all', per: 'all' };
  assert.equal(C.filtrar(lista, F, null, now).length, 1);
  assert.equal(C.filtrar(lista, F, 'tipo', now).length, 2);
});

test('filtrar não altera a lista original', () => {
  const lista = [{ date: '2026-10-25', tipo: '3bolas', opp: 'Cabelo', setsMe: 2, setsOp: 0 }];
  const copia = lista.slice();
  C.filtrar(lista, { tipo: '5bolas', opp: 'all', per: 'all' }, null, new Date());
  assert.deepEqual(lista, copia);
});

test('verMaior compara versões', () => {
  assert.equal(C.verMaior('2.3.0', '2.2.9'), true);
  assert.equal(C.verMaior('2.2.3', '2.2.3'), false);
  assert.equal(C.verMaior('2.2.3', '2.10.0'), false);
  assert.equal(C.verMaior('10.0', '9.9.9'), true);
});

test('datas em ida e volta', () => {
  assert.equal(C.ymd(new Date(2026, 0, 5)), '2026-01-05');
  assert.equal(C.fmtD('2026-01-05'), '05/01/2026');
  assert.equal(C.fmtD(''), '');
  assert.equal(C.dow('2026-10-26'), 1); // segunda
  assert.equal(C.hhmm(new Date(2026, 9, 26, 9, 7).getTime()), '09:07');
});

test('sortDesc ordena por data e depois por criação', () => {
  const l = [
    { date: '2026-10-20', createdAt: 2 },
    { date: '2026-10-25', createdAt: 1 },
    { date: '2026-10-25', createdAt: 9 }
  ];
  assert.deepEqual(l.slice().sort(C.sortDesc).map(m => m.createdAt), [9, 1, 2]);
});

test('sanitizarPartida rejeita data inválida', () => {
  assert.equal(C.sanitizarPartida(null, TIPOS), null);
  assert.equal(C.sanitizarPartida({ date: '25/10/2026' }, TIPOS), null);
  assert.equal(C.sanitizarPartida({ date: '2026-13-40' }, TIPOS), null); // formato ok, data impossível
  assert.equal(C.sanitizarPartida({ date: '2026-02-30' }, TIPOS), null);
});

test('sanitizarPartida normaliza campos', () => {
  const r = C.sanitizarPartida({
    date: '2026-10-25', opp: '  Cabelo  ', tipo: 'inexistente',
    meta: -3, setsMe: '2', setsOp: -1, sets: [{ w: 'op', me: 8, op: 5, t: 10 }, null],
    emAndamento: 1, me: 4, op: 2, setsToWin: 2
  }, TIPOS);
  assert.equal(r.opp, 'Cabelo');
  assert.equal(r.tipo, 'livre');
  assert.equal(r.meta, 0);
  assert.equal(r.setsMe, 2);
  assert.equal(r.setsOp, 0);
  assert.equal(r.sets.length, 1);
  assert.equal(r.sets[0].w, 'op');
  assert.equal(r.emAndamento, true);
  assert.equal(r.setsToWin, 2);
  assert.ok(r.id && typeof r.id === 'string');
});

test('sanitizarSet usa "me" como padrão e gera sid', () => {
  const s = C.sanitizarSet({ me: 8, op: 6 });
  assert.equal(s.w, 'me');
  assert.ok(s.sid);
});

test('sanitizarAgenda valida hora e limita texto', () => {
  const a = C.sanitizarAgenda({ date: '2026-10-27', hora: '25:99', opp: 'Zé', meta: 8, nota: 'x'.repeat(200) }, TIPOS);
  assert.equal(a.hora, ''); // hora fora de 0-23/0-59
  assert.equal(C.sanitizarAgenda({ date: '2026-10-27', hora: '19:30' }, TIPOS).hora, '19:30');
  assert.equal(a.nota.length, 120);
  assert.equal(C.sanitizarAgenda({ date: '2026-10-27', hora: '7h' }, TIPOS).hora, '');
  assert.equal(C.sanitizarAgenda({ date: 'ontem' }, TIPOS), null);
});

test('sanitizarPlacar exige ts e data', () => {
  assert.equal(C.sanitizarPlacar({ date: '2026-10-25' }, TIPOS), null);
  const p = C.sanitizarPlacar({ date: '2026-10-25', ts: 5, w: 'op', me: 3, op: 8 }, TIPOS);
  assert.equal(p.w, 'op');
  assert.equal(p.me, 3);
});

test('esc apaixa caracteres perigosos', () => {
  assert.equal(C.esc('<b>"x" & \'y\'</b>'), '&lt;b&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/b&gt;');
  assert.equal(C.esc(null), '');
});

test('cores: mixHex, darken e lighten', () => {
  assert.equal(C.mixHex('#000000', '#ffffff', 0.5), '#808080');
  assert.equal(C.darken('#ffffff', 1), '#000000');
  assert.equal(C.lighten('#000000', 1), '#ffffff');
  assert.equal(C.hexToRgb('#0f766e').length, 3);
  assert.equal(C.rgbToHex(255, 0, 0), '#ff0000');
});

test('uid gera ids diferentes', () => {
  const ids = new Set(Array.from({ length: 200 }, () => C.uid()));
  assert.equal(ids.size, 200);
});
