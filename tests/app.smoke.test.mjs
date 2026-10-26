import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JSDOM, VirtualConsole } from 'jsdom';

const raiz = fileURLToPath(new URL('..', import.meta.url));
const ler = f => fs.readFileSync(raiz + f, 'utf8');

/* monta a página com core.js e app.js inline, sem rede */
function abrir(storage) {
  const html = ler('index.html')
    .replace('<link rel="stylesheet" href="styles.css">', '')
    .replace('<script src="core.js"></script>', `<script>${ler('core.js')}</script>`)
    .replace('<script src="app.js"></script>', `<script>${ler('app.js')}</script>`);

  const erros = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => erros.push(e));

  const dom = new JSDOM(html, {
    url: 'http://localhost/',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(win) {
      win.scrollTo = () => {};
      win.navigator.vibrate = () => true;
      if (storage) for (const [k, v] of Object.entries(storage)) win.localStorage.setItem(k, v);
    }
  });
  dom.erros = erros;
  return dom;
}

const espera = (ms = 15) => new Promise(r => setTimeout(r, ms));
const clicar = (el, win) => {
  assert.ok(el, 'elemento para clicar existe');
  el.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true }));
};

async function iniciar(win, doc, { opp = 'Zé', tipo = '3bolas' } = {}) {
  const campo = doc.querySelector('#sOpp');
  campo.value = opp;
  campo.dispatchEvent(new win.Event('input', { bubbles: true }));
  clicar(doc.querySelector(`[data-tipo="${tipo}"]`), win);
  clicar(doc.querySelector('#sGo'), win);
  await espera();
}

test('primeira tela é a configuração da partida (não o placar)', async () => {
  const dom = abrir();
  const doc = dom.window.document;
  await espera();
  assert.match(doc.querySelector('#app').textContent, /Nova partida/);
  assert.ok(doc.querySelector('#sOpp'), 'adversário é editável');
  assert.ok(!doc.querySelector('.lv'), 'não entra direto no placar');
  dom.window.close();
});

test('fluxo completo: ponto, set, encerrar, resumo e histórico', async () => {
  const dom = abrir();
  const { window: win } = dom;
  const doc = win.document;
  await espera();

  // 5 bolas tem meta 15
  clicar(doc.querySelector('[data-tipo="5bolas"]'), win);
  assert.equal(doc.querySelector('#sMeta').value, '15');
  await iniciar(win, doc, { opp: 'Zé', tipo: '5bolas' });

  assert.ok(doc.querySelector('.lv'), 'placar ao vivo apareceu');
  assert.match(doc.querySelector('.lv').textContent, /Zé/);

  // 15 pontos = 1 set (o DOM é redesenhado a cada ponto)
  for (let i = 0; i < 15; i++) clicar(doc.querySelector('.half.me'), win);
  await espera(30);
  assert.match(doc.querySelector('.lv').textContent, /Sets 1/);

  const atual = JSON.parse(win.localStorage.getItem('sinuca_atual_v1'));
  assert.equal(atual.setsMe, 1);
  assert.equal(atual.tipo, '5bolas');
  assert.equal(atual.me, 0, 'placar do set zerou depois de fechar');

  // menu -> encerrar -> diálogo do app -> confirma
  clicar(doc.querySelector('#bMenu'), win);
  await espera();
  clicar(doc.querySelector('#mEnd'), win);
  await espera();
  const dlg = doc.querySelector('.ov.ask');
  assert.ok(dlg, 'diálogo de confirmação apareceu');
  clicar(dlg.querySelector('[data-ask="1"]'), win);
  await espera(30);

  assert.ok(doc.querySelector('.resnum'), 'resumo aparece depois de encerrar');
  assert.equal(doc.querySelector('.resnum').textContent.replace(/\s/g, ''), '1×0');

  const partidas = JSON.parse(win.localStorage.getItem('sinuca_partidas_v1'));
  assert.equal(partidas.length, 1);
  assert.equal(partidas[0].opp, 'Zé');
  assert.equal(partidas[0].setsMe, 1);
  assert.ok(!partidas[0].emAndamento, 'partida encerrada não fica em andamento');

  const sets = JSON.parse(win.localStorage.getItem('sinuca_placares_v1'));
  assert.equal(sets.length, 1);
  assert.equal(sets[0].me, 15);
  assert.equal(sets[0].matchId, partidas[0].id);

  // revanche mantém adversário e tipo
  clicar(doc.querySelector('#rRev'), win);
  await espera();
  const rev = JSON.parse(win.localStorage.getItem('sinuca_atual_v1'));
  assert.equal(rev.opp, 'Zé');
  assert.equal(rev.tipo, '5bolas');
  assert.equal(rev.setsMe, 0);
  assert.equal(rev.iniciada, true);
  dom.window.close();
});

test('revanche no menu e "Nova partida" não perdem a partida em andamento', async () => {
  const dom = abrir();
  const { window: win } = dom;
  const doc = win.document;
  await espera();

  await iniciar(win, doc, { opp: 'Cabelo' });
  clicar(doc.querySelector('.half.me'), win);
  await espera();

  // abre "Nova partida" pelo menu
  clicar(doc.querySelector('#bMenu'), win);
  await espera();
  clicar(doc.querySelector('#mNew'), win);
  await espera();
  assert.match(doc.querySelector('#app').textContent, /Nova partida/);
  assert.ok(doc.querySelector('#sBack'), 'oferece voltar para a partida');

  // começar outra guarda a anterior no histórico
  await iniciar(win, doc, { opp: 'Outro' });
  const partidas = JSON.parse(win.localStorage.getItem('sinuca_partidas_v1'));
  assert.equal(partidas.length, 1);
  assert.equal(partidas[0].opp, 'Cabelo');
  assert.equal(partidas[0].emAndamento, true);
  assert.equal(JSON.parse(win.localStorage.getItem('sinuca_atual_v1')).opp, 'Outro');
  dom.window.close();
});

test('partida em andamento fica fora dos relatórios', async () => {
  const dom = abrir();
  const { window: win } = dom;
  const doc = win.document;
  await espera();

  await iniciar(win, doc, { opp: 'Teste' });
  clicar(doc.querySelector('.half.me'), win);
  clicar(doc.querySelector('#bMenu'), win);
  await espera();
  clicar(doc.querySelector('#mSaveHist'), win);
  await espera();
  clicar(doc.querySelector('[data-go="stats"]'), win);
  await espera(30);

  const txt = doc.querySelector('#app').textContent;
  assert.match(txt, /em andamento ficam fora/);
  dom.window.close();
});

test('apagar partida remove também os sets dela', async () => {
  const dom = abrir();
  const { window: win } = dom;
  const doc = win.document;
  await espera();

  await iniciar(win, doc, { opp: 'Cabelo', tipo: '3bolas' });
  for (let i = 0; i < 8; i++) clicar(doc.querySelector('.half.me'), win);
  await espera(30);

  clicar(doc.querySelector('#bMenu'), win);
  await espera();
  clicar(doc.querySelector('#mEnd'), win);
  await espera();
  clicar(doc.querySelector('.ov.ask [data-ask="1"]'), win);
  await espera(30);
  clicar(doc.querySelector('#rClose'), win);
  await espera();

  assert.equal(JSON.parse(win.localStorage.getItem('sinuca_placares_v1')).length, 1);

  clicar(doc.querySelector('[data-del]'), win);
  await espera();
  clicar(doc.querySelector('.ov.ask [data-ask="1"]'), win);
  await espera(30);

  assert.equal(JSON.parse(win.localStorage.getItem('sinuca_partidas_v1')).length, 0);
  assert.equal(JSON.parse(win.localStorage.getItem('sinuca_placares_v1')).length, 0);
  dom.window.close();
});

test('Escape fecha o diálogo de confirmação sem agir', async () => {
  const dom = abrir();
  const { window: win } = dom;
  const doc = win.document;
  await espera();

  await iniciar(win, doc);
  clicar(doc.querySelector('#bMenu'), win);
  await espera();
  clicar(doc.querySelector('#mDrop'), win);
  await espera();
  const dlg = doc.querySelector('.ov.ask');
  assert.ok(dlg);
  dlg.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await espera();
  assert.ok(!doc.querySelector('.ov.ask'), 'diálogo sumiu');
  assert.equal(JSON.parse(win.localStorage.getItem('sinuca_atual_v1')).opp, 'Zé', 'partida continua');
  dom.window.close();
});

test('descartar partida zera o placar e volta para a configuração', async () => {
  const dom = abrir();
  const { window: win } = dom;
  const doc = win.document;
  await espera();

  await iniciar(win, doc);
  clicar(doc.querySelector('.half.me'), win);
  clicar(doc.querySelector('#bMenu'), win);
  await espera();
  clicar(doc.querySelector('#mDrop'), win);
  await espera();
  clicar(doc.querySelector('.ov.ask [data-ask="1"]'), win);
  await espera(30);

  assert.match(doc.querySelector('#app').textContent, /Nova partida/);
  assert.equal(JSON.parse(win.localStorage.getItem('sinuca_atual_v1')).me, 0);
  dom.window.close();
});

test('partida em andamento é restaurada ao abrir o app de novo', async () => {
  const dom = abrir();
  const { window: win } = dom;
  const doc = win.document;
  await espera();

  await iniciar(win, doc, { opp: 'Seu Zé' });
  clicar(doc.querySelector('.half.me'), win);
  await espera();

  const guardado = {};
  for (let i = 0; i < win.localStorage.length; i++) {
    const k = win.localStorage.key(i);
    guardado[k] = win.localStorage.getItem(k);
  }
  dom.window.close();

  const dom2 = abrir(guardado);
  await espera(30);
  const doc2 = dom2.window.document;
  assert.ok(doc2.querySelector('.lv'), 'voltou direto para o placar');
  assert.match(doc2.querySelector('.lv').textContent, /Seu Zé/);
  assert.equal(doc2.querySelector('.half.me .num').textContent.trim(), '1');
  assert.deepEqual(dom2.erros.map(String), []);
  dom2.window.close();
});

test('partida salva pela versão antiga (sem o campo iniciada) continua abrindo no placar', async () => {
  const d = new Date();
  const iso = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const antiga = {
    id: 'antiga1', opp: 'Velho', tipo: '3bolas', meta: 8, setsToWin: 0, date: iso,
    me: 3, op: 2, setsMe: 1, setsOp: 0, log: [], createdAt: Date.now()
  };
  const dom = abrir({ sinuca_atual_v1: JSON.stringify(antiga) });
  await espera(30);
  const doc = dom.window.document;

  assert.ok(doc.querySelector('.lv'), 'abriu no placar e não na configuração');
  assert.match(doc.querySelector('.lv').textContent, /Velho/);
  assert.equal(doc.querySelector('.half.me .num').textContent.trim(), '3');
  assert.equal(JSON.parse(dom.window.localStorage.getItem('sinuca_atual_v1')).iniciada, true);
  dom.window.close();
});

test('placar antigo vazio abre na configuração, sem partida fantasma', async () => {
  const d = new Date();
  const iso = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const vazia = {
    id: 'vazia1', opp: 'Cabelo', tipo: '3bolas', meta: 8, setsToWin: 0, date: iso,
    me: 0, op: 0, setsMe: 0, setsOp: 0, log: [], undo: [], createdAt: Date.now()
  };
  const dom = abrir({ sinuca_atual_v1: JSON.stringify(vazia) });
  await espera(30);
  const doc = dom.window.document;

  assert.match(doc.querySelector('#app').textContent, /Nova partida/);
  assert.ok(!doc.querySelector('.lv'));
  dom.window.close();
});

test('todas as abas abrem sem erro de JavaScript', async () => {
  const dom = abrir();
  const { window: win } = dom;
  const doc = win.document;
  await espera();

  const abas = ['cal', 'stats', 'hist', 'data', 'play'];
  for (const aba of abas) {
    clicar(doc.querySelector(`[data-tab="${aba}"]`), win);
    await espera(20);
    assert.ok(doc.querySelector('#app').textContent.trim().length > 10, `aba ${aba} tem conteúdo`);
  }
  assert.deepEqual(dom.erros.map(String), [], 'nenhum erro solto no console');
  dom.window.close();
});

test('backup automático guarda cópia antes de apagar e permite restaurar', async () => {
  const dom = abrir();
  const { window: win } = dom;
  const doc = win.document;
  await espera();

  await iniciar(win, doc, { opp: 'Cabelo', tipo: '3bolas' });
  for (let i = 0; i < 8; i++) clicar(doc.querySelector('.half.me'), win);
  await espera(30);
  clicar(doc.querySelector('#bMenu'), win);
  await espera();
  clicar(doc.querySelector('#mEnd'), win);
  await espera();
  clicar(doc.querySelector('.ov.ask [data-ask="1"]'), win);
  await espera(30);
  clicar(doc.querySelector('#rClose'), win);
  await espera();

  const backup = JSON.parse(win.localStorage.getItem('sinuca_backup_v1'));
  assert.ok(backup.em > 0, 'backup tem data');
  assert.equal(backup.partidas.length, 1);

  clicar(doc.querySelector('[data-del]'), win);
  await espera();
  clicar(doc.querySelector('.ov.ask [data-ask="1"]'), win);
  await espera(30);
  assert.equal(JSON.parse(win.localStorage.getItem('sinuca_partidas_v1')).length, 0);

  clicar(doc.querySelector('[data-tab="data"]'), win);
  await espera(20);
  clicar(doc.querySelector('#xRestore'), win);
  await espera();
  clicar(doc.querySelector('.ov.ask [data-ask="1"]'), win);
  await espera(30);

  assert.equal(JSON.parse(win.localStorage.getItem('sinuca_partidas_v1')).length, 1);
  dom.window.close();
});

test('lembretes: alternar dias e horário fica salvo', async () => {
  const dom = abrir();
  const { window: win } = dom;
  const doc = win.document;
  await espera();

  clicar(doc.querySelector('[data-tab="data"]'), win);
  await espera(20);

  const dia = doc.querySelector('[data-dia="4"]'); // quinta (não vem marcada por padrão)
  const estava = dia.classList.contains('on');
  clicar(dia, win);
  await espera(20);

  const depois = JSON.parse(win.localStorage.getItem('sinuca_lembretes_v1'));
  assert.ok(depois, 'preferências salvas');
  assert.equal(depois.dias.includes(4), !estava);

  clicar(doc.querySelector('[data-dia="4"]'), win);
  await espera(20);
  assert.equal(JSON.parse(win.localStorage.getItem('sinuca_lembretes_v1')).dias.includes(4), estava);

  const hora = doc.querySelector('#remHora');
  hora.value = '20:30';
  hora.dispatchEvent(new win.Event('change', { bubbles: true }));
  await espera(20);
  assert.equal(JSON.parse(win.localStorage.getItem('sinuca_lembretes_v1')).hora, '20:30');
  dom.window.close();
});

test('registrar partida na mão e editar o resultado', async () => {
  const dom = abrir();
  const { window: win } = dom;
  const doc = win.document;
  await espera();

  clicar(doc.querySelector('[data-tab="hist"]'), win);
  await espera(20);
  clicar(doc.querySelector('[data-edit="new"]'), win);
  await espera();

  assert.ok(doc.querySelector('#eOpp'), 'formulário de registro abriu');
  doc.querySelector('#eOpp').value = 'Beto';
  doc.querySelector('#eMe').value = '2';
  doc.querySelector('#eOp').value = '1';
  clicar(doc.querySelector('#eSave'), win);
  await espera(30);

  const partidas = JSON.parse(win.localStorage.getItem('sinuca_partidas_v1'));
  assert.equal(partidas.length, 1);
  assert.equal(partidas[0].opp, 'Beto');
  assert.equal(partidas[0].setsMe, 2);
  assert.equal(partidas[0].setsOp, 1);

  // editar muda o placar final
  clicar(doc.querySelector('[data-edit="' + partidas[0].id + '"]'), win);
  await espera();
  doc.querySelector('#eMe').value = '0';
  doc.querySelector('#eOp').value = '3';
  clicar(doc.querySelector('#eSave'), win);
  await espera(30);

  const depois = JSON.parse(win.localStorage.getItem('sinuca_partidas_v1'));
  assert.equal(depois.length, 1);
  assert.equal(depois[0].setsMe, 0);
  assert.equal(depois[0].setsOp, 3);
  dom.window.close();
});

test('editar o resultado apaga os sets antigos daquela partida', async () => {
  const dom = abrir();
  const { window: win } = dom;
  const doc = win.document;
  await espera();

  await iniciar(win, doc, { opp: 'Cabelo' });
  for (let i = 0; i < 8; i++) clicar(doc.querySelector('.half.me'), win);
  await espera(30);
  clicar(doc.querySelector('#bMenu'), win);
  await espera();
  clicar(doc.querySelector('#mEnd'), win);
  await espera();
  clicar(doc.querySelector('.ov.ask [data-ask="1"]'), win);
  await espera(30);
  clicar(doc.querySelector('#rClose'), win);
  await espera();

  assert.equal(JSON.parse(win.localStorage.getItem('sinuca_placares_v1')).length, 1);

  const m = JSON.parse(win.localStorage.getItem('sinuca_partidas_v1'))[0];
  clicar(doc.querySelector('[data-edit="' + m.id + '"]'), win);
  await espera();
  doc.querySelector('#eMe').value = '2';
  doc.querySelector('#eOp').value = '0';
  clicar(doc.querySelector('#eSave'), win);
  await espera(30);

  assert.equal(JSON.parse(win.localStorage.getItem('sinuca_placares_v1')).length, 0, 'sets antigos saíram');
  assert.equal(JSON.parse(win.localStorage.getItem('sinuca_partidas_v1'))[0].setsMe, 2);
  dom.window.close();
});

test('apagar um set recalcula o resultado da partida', async () => {
  const dom = abrir();
  const { window: win } = dom;
  const doc = win.document;
  await espera();

  await iniciar(win, doc, { opp: 'Cabelo' });
  for (let i = 0; i < 8; i++) clicar(doc.querySelector('.half.me'), win);
  await espera(30);
  for (let i = 0; i < 8; i++) clicar(doc.querySelector('.half.me'), win);
  await espera(30);
  clicar(doc.querySelector('#bMenu'), win);
  await espera();
  clicar(doc.querySelector('#mEnd'), win);
  await espera();
  clicar(doc.querySelector('.ov.ask [data-ask="1"]'), win);
  await espera(30);
  clicar(doc.querySelector('#rClose'), win);
  await espera();

  let m = JSON.parse(win.localStorage.getItem('sinuca_partidas_v1'))[0];
  assert.equal(m.setsMe, 2);

  clicar(doc.querySelector('[data-hmodo="sets"]'), win);
  await espera(20);
  clicar(doc.querySelector('[data-pldel]'), win);
  await espera();
  clicar(doc.querySelector('.ov.ask [data-ask="1"]'), win);
  await espera(30);

  assert.equal(JSON.parse(win.localStorage.getItem('sinuca_placares_v1')).length, 1);
  m = JSON.parse(win.localStorage.getItem('sinuca_partidas_v1'))[0];
  assert.equal(m.setsMe, 1);
  assert.equal(m.setsOp, 0);
  dom.window.close();
});
