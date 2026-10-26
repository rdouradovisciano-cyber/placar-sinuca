(function(){
'use strict';

/* ======== Constantes e utilidades ======== */
const MEU_NOME='Renato';
const OPP_DEFAULT='Cabelo';
const APP_VERSION='2.3.1';
const VER_URL='https://raw.githubusercontent.com/rdouradovisciano-cyber/placar-sinuca/main/version.json';
const APK_URL='https://github.com/rdouradovisciano-cyber/placar-sinuca/releases/latest';
const KEY_M='sinuca_partidas_v1', KEY_C='sinuca_atual_v1', KEY_B='sinuca_backup_v1';
const DIAS=['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
const DIAS_C=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const JOGO=[2,3,5,6]; // Terça, Quarta, Sexta, Sábado
const TIPOS={
  '3bolas':{nome:'3 Bolas',sub:'8 pontos/set',meta:8,fixa:true},
  '5bolas':{nome:'5 Bolas',sub:'15 pontos/set',meta:15,fixa:false},
  'livre':{nome:'Livre',sub:'personalizado',meta:10,fixa:false}
};
const TIPO=t=>TIPOS[t]||TIPOS['3bolas'];
const $=s=>document.querySelector(s);
const C=window.SinucaCore;
const {esc,uid,hoje,parseD,fmtD,dow}=C;
function pillDia(s){const w=dow(s);return JOGO.includes(w)?`<span class="pill on">${DIAS[w]} · dia de jogo</span>`:`<span class="pill off">${DIAS[w]} · folga</span>`}
function vib(n){try{navigator.vibrate&&navigator.vibrate(n)}catch(e){}}
function load(k,def){try{const v=JSON.parse(localStorage.getItem(k));return v==null?def:v}catch(e){return def}}
function save(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){toast('Sem espaço para salvar!')}}

/* ======== Cores dos jogadores ======== */
const KEY_P='sinuca_cores_jog_v1';
const COR_PADRAO={me:'#a6000e',op:'#0029e6'};
const COR_OPCOES=['#0029e6','#a6000e','#0a7a3d','#d97706','#6d28d9','#be185d','#0e7490','#374151','#111111','#f5f5f0'];
function loadPC(){let v=null;try{v=JSON.parse(localStorage.getItem(KEY_P))}catch(e){}const ok=h=>typeof h==='string'&&/^#[0-9a-fA-F]{6}$/.test(h);return {me:v&&ok(v.me)?v.me:COR_PADRAO.me,op:v&&ok(v.op)?v.op:COR_PADRAO.op}}
function savePC(c){try{localStorage.setItem(KEY_P,JSON.stringify(c))}catch(e){}}
function fgDe(hex){const [r,g,b]=hexToRgb(hex);return (0.299*r+0.587*g+0.114*b)>160?'#111111':'#ffffff'}
function setPC(who,hex,keepUI){const c=loadPC();c[who]=hex;savePC(c);render();if(cur&&!keepUI)refreshPCUI()}
let pcWho=null;
function pcRows(){
  const c=cur,pc=loadPC();
  return [['me',MEU_NOME],['op',c.opp]].filter(([w])=>!pcWho||w===pcWho).map(([w,n])=>`<div style="margin:6px 0 12px"><div class="hint" style="margin:0 0 6px">Cor de ${esc(n)}</div>
    <div class="row" style="gap:8px">${COR_OPCOES.map(h=>`<button data-pcor="${w}|${h}" aria-label="${h}" style="width:36px;height:36px;border-radius:50%;border:${pc[w].toLowerCase()===h?'3px solid var(--gold)':'2px solid var(--line)'};background:${h};cursor:pointer;padding:0"></button>`).join('')}
    <input type="color" data-pcolor="${w}" value="${pc[w]}" style="width:44px;height:36px;padding:2px;border-radius:10px"></div></div>`).join('');
}
function refreshPCUI(){const b=$('#pcBox');if(b)b.innerHTML=pcRows()}

/* ======== Calendário e agenda ======== */
const MESES=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const ymd=C.ymd;
function agDoDia(d){return agenda.filter(a=>a.date===d).sort((x,y)=>(x.hora||'99').localeCompare(y.hora||'99'))}
function gcalUrl(a){
  const t=TIPOS[a.tipo]?TIPOS[a.tipo].nome:a.tipo;
  let dates;
  if(a.hora){
    const [h,mi]=a.hora.split(':').map(Number),d=parseD(a.date);
    const f=x=>ymd(x).replace(/-/g,'')+'T'+String(x.getHours()).padStart(2,'0')+String(x.getMinutes()).padStart(2,'0')+'00';
    const ini=new Date(d.getFullYear(),d.getMonth(),d.getDate(),h,mi),fim=new Date(ini.getTime()+2*3600e3);
    dates=f(ini)+'/'+f(fim);
  }else{
    const d=parseD(a.date),n=new Date(d.getFullYear(),d.getMonth(),d.getDate()+1);
    dates=a.date.replace(/-/g,'')+'/'+ymd(n).replace(/-/g,'');
  }
  return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text='+encodeURIComponent('Sinuca: '+MEU_NOME+' x '+a.opp)+'&dates='+dates+'&details='+encodeURIComponent(t+(a.nota?'\n'+a.nota:''));
}
function viewCal(){
  const hj=hoje();if(!calSel)calSel=hj;
  const prim=new Date(calY,calM,1),ini=new Date(calY,calM,1-prim.getDay());
  let cel='';
  for(let i=0;i<42;i++){
    const d=new Date(ini.getFullYear(),ini.getMonth(),ini.getDate()+i),k=ymd(d);
    const ag=agenda.filter(a=>a.date===k).length,ms=matches.filter(m=>m.date===k);
    const v=ms.filter(m=>resultado(m)==='w').length,dd=ms.filter(m=>resultado(m)==='l').length;
    const dots=(ag?'<i class="a"></i>':'')+(v?'<i class="v"></i>':'')+(dd?'<i class="d"></i>':'');
    cel+=`<button class="cd ${d.getMonth()!==calM?'out':''} ${JOGO.includes(d.getDay())?'play':''} ${k===hj?'today':''} ${k===calSel?'sel':''}" data-calday="${k}">${d.getDate()}<span class="dts">${dots}</span></button>`;
  }
  const dia=calSel,ags=agDoDia(dia),jog=matches.filter(m=>m.date===dia).sort(sortDesc);
  const prox=agenda.filter(a=>a.date>=hj).sort((x,y)=>x.date.localeCompare(y.date)||(x.hora||'').localeCompare(y.hora||'')).slice(0,5);
  const item=a=>`<div class="agi"><div class="tm">${a.hora||'—'}</div><div class="in"><b>${esc(a.opp)}</b><small>${TIPOS[a.tipo]?TIPOS[a.tipo].nome:esc(a.tipo)} · meta ${a.meta||'-'}${a.nota?' · '+esc(a.nota):''}</small>
      <div class="agb"><button class="btn gold sm" data-agstart="${a.id}">▶ Jogar agora</button><button class="btn ghost sm" data-agcal="${a.id}">📅 No calendário do celular</button><button class="btn ghost sm" data-agedit="${a.id}">✏️</button><button class="btn ghost sm" data-agdel="${a.id}">🗑️</button></div></div></div>`;
  return `<h2>Calendário</h2>
  <div class="card">
    <div class="calhd"><button data-calnav="-1" aria-label="Mês anterior">‹</button><div class="t">${MESES[calM]} ${calY}</div><button data-calnav="1" aria-label="Próximo mês">›</button></div>
    <div class="calw">${DIAS_C.map(x=>`<div>${x}</div>`).join('')}</div>
    <div class="calg">${cel}</div>
    <div class="hint" style="text-align:center;margin-top:10px"><span style="color:var(--gold)">●</span> agendada &nbsp; <span style="color:var(--green)">●</span> vitória &nbsp; <span style="color:var(--red)">●</span> derrota &nbsp; · contorno = dia de treino</div>
    <div class="row" style="margin-top:10px"><button class="btn ghost sm" data-calnav="0">Hoje</button></div>
  </div>
  <h3>${fmtD(dia)} · ${DIAS[dow(dia)]} ${JOGO.includes(dow(dia))?'(dia de jogo)':'(folga)'}</h3>
  <div class="card">
    ${ags.length?ags.map(item).join(''):'<div class="hint" style="margin:0 0 6px">Nenhuma partida agendada neste dia.</div>'}
    ${jog.length?`<div class="hint" style="margin:10px 0 0">Jogadas neste dia:</div>`+jog.map(itemHist).join(''):''}
    <button class="btn gold block" data-agnew="${dia}" style="margin-top:12px">＋ Agendar partida neste dia</button>
  </div>
  ${prox.length?`<h3>Próximas partidas</h3><div class="card">${prox.map(a=>`<div class="agi clickable" data-calday="${a.date}" style="cursor:pointer"><div class="tm">${fmtD(a.date).slice(0,5)}</div><div class="in"><b>${esc(a.opp)}</b><small>${DIAS_C[dow(a.date)]}${a.hora?' · '+a.hora:''} · ${TIPOS[a.tipo]?TIPOS[a.tipo].nome:esc(a.tipo)}</small></div></div>`).join('')}</div>`:''}`;
}
function openAg(id,dia){
  const novo=id==='new';
  const a=novo?{id:uid(),date:dia||hoje(),hora:'',opp:setup.opp||OPP_DEFAULT,tipo:'3bolas',meta:8,nota:''}:agenda.find(x=>x.id===id);
  if(!a)return;
  const ops=oponentes();
  $('#modalRoot').innerHTML=`<div class="ov" id="ov"><div class="modal">
    <h2>${novo?'Agendar partida':'Editar agendamento'}</h2>
    <div class="grid g2">
      <div class="field"><label>Data</label><input type="date" id="aDate" value="${a.date}"></div>
      <div class="field"><label>Hora (opcional)</label><input type="time" id="aHora" value="${a.hora||''}"></div>
    </div>
    <div class="field"><label>Adversário</label><input id="aOpp" list="aList" value="${esc(a.opp)}" placeholder="Nome do adversário"><datalist id="aList">${ops.map(o=>`<option value="${esc(o[1])}">`).join('')}</datalist></div>
    <div class="grid g2">
      <div class="field"><label>Tipo de jogo</label><select id="aTipo">${Object.entries(TIPOS).map(([k,v])=>`<option value="${k}" ${a.tipo===k?'selected':''}>${v.nome}</option>`).join('')}</select></div>
      <div class="field"><label>Pontos por set</label><input id="aMeta" type="number" min="1" inputmode="numeric" value="${a.meta||TIPO(a.tipo).meta}"></div>
    </div>
    <div class="field"><label>Observação (opcional)</label><input id="aNota" value="${esc(a.nota||'')}" placeholder="Ex.: valendo uma rodada"></div>
    <div class="row"><button class="btn ghost" id="aCancel" style="flex:1">Cancelar</button><button class="btn gold" id="aSave" style="flex:2">Salvar</button></div>
  </div></div>`;
  $('#aTipo').onchange=e=>{$('#aMeta').value=TIPO(e.target.value).meta};
  const close=()=>$('#modalRoot').innerHTML='';
  $('#aCancel').onclick=close;
  $('#ov').onclick=e=>{if(e.target.id==='ov')close()};
  $('#aSave').onclick=()=>{
    const d=$('#aDate').value;if(!d){toast('Informe a data');return}
    const rec=Object.assign({},a,{date:d,hora:$('#aHora').value||'',opp:$('#aOpp').value.trim()||'Adversário',tipo:$('#aTipo').value,meta:Math.max(1,+$('#aMeta').value||1),nota:$('#aNota').value.trim()});
    if(novo)agenda.push(rec);else agenda=agenda.map(x=>x.id===rec.id?rec:x);
    saveA();close();calSel=d;const dt=parseD(d);calY=dt.getFullYear();calM=dt.getMonth();
    tab='cal';render();toast('Partida agendada');
  };
}
async function startAg(id){
  const a=agenda.find(x=>x.id===id);if(!a)return;
  if(cur&&cur.iniciada){
    const ok=await confirmar('Há uma partida em andamento ('+cur.setsMe+'×'+cur.setsOp+', set '+cur.me+'×'+cur.op+').\n\nSubstituir pela partida agendada contra '+a.opp+'?\nA atual é descartada (dá para recuperar pelo Backup automático).',{titulo:'Partida em andamento',ok:'Substituir',perigo:true});
    if(!ok)return;
    snapshot('antes de trocar de partida');removerSetsDaPartida(cur.id);
  }
  cur=Object.assign(defaultCur(),{opp:a.opp,tipo:a.tipo,meta:Math.max(1,+a.meta||TIPO(a.tipo).meta),date:hoje(),iniciada:true});
  agenda=agenda.filter(x=>x.id!==id);saveA();saveC();tab='play';render();toast('Partida contra '+a.opp+' iniciada');
}
async function delAg(id){
  const a=agenda.find(x=>x.id===id);if(!a)return;
  const ok=await confirmar('Apagar o agendamento de '+fmtD(a.date)+' contra '+a.opp+'?',{titulo:'Apagar agendamento',ok:'Apagar',perigo:true});
  if(ok){snapshot('antes de apagar agendamento');agenda=agenda.filter(x=>x.id!==id);saveA();render();toast('Agendamento apagado')}
}

/* ======== Tema / cores ======== */
const KEY_T='sinuca_tema_v2';
const {hexToRgb,rgbToHex,mixHex,darken,lighten}=C;
const PRESETS={
  light:{name:'Claro',colors:{bg:'#f3f5f7',bg2:'#f3f5f7',felt:'#e7efe9',panel:'#ffffff',panel2:'#ffffff',line:'#e4e8ee',gold:'#0f766e',gold2:'#115e59',txt:'#0f172a',mut:'#64748b',red:'#dc2626',green:'#15803d',input:'#f1f4f8',gray:'#e8ecf1'}},
  classic:{name:'Verde clássico',colors:{bg:'#06120d',bg2:'#124d35',felt:'#0d3b29',panel:'#0f2a1e',panel2:'#143523',line:'#22503a',gold:'#e6b94d',gold2:'#b8872b',txt:'#f3f6f1',mut:'#8fb09d',red:'#e0615a',green:'#4cc38a',input:'#0a1f16',gray:'#2a3a33'}},
  blue:{name:'Azul oceano',colors:{bg:'#060d1a',bg2:'#0f2a5a',felt:'#0d2a4a',panel:'#0e1f3a',panel2:'#132a4d',line:'#1f3f6a',gold:'#5dd4ff',gold2:'#2aa8d6',txt:'#f1f6ff',mut:'#8fa8c9',red:'#e0615a',green:'#4cc38a',input:'#08132a',gray:'#2a3344'}},
  red:{name:'Vermelho arena',colors:{bg:'#120608',bg2:'#4d1218',felt:'#3b0d14',panel:'#2a0e12',panel2:'#351318',line:'#50222a',gold:'#f0a060',gold2:'#c07030',txt:'#f6f1f1',mut:'#b08f94',red:'#ff5a5a',green:'#4cc38a',input:'#1f0a0c',gray:'#3a2a2a'}},
  purple:{name:'Roxo royal',colors:{bg:'#0d0612',bg2:'#2a124d',felt:'#230d3b',panel:'#1a0e2a',panel2:'#231335',line:'#3a2250',gold:'#c9a0ff',gold2:'#9a6bd6',txt:'#f3f1f6',mut:'#a88fb0',red:'#e0615a',green:'#4cc38a',input:'#130a1f',gray:'#2f2a3a'}},
  teal:{name:'Turquesa',colors:{bg:'#061210',bg2:'#124d45',felt:'#0d3b35',panel:'#0e2a26',panel2:'#133530',line:'#225048',gold:'#4dffc9',gold2:'#2bd6a0',txt:'#f1f6f5',mut:'#8fb0aa',red:'#e0615a',green:'#4cc38a',input:'#0a1f1c',gray:'#2a3a38'}},
  amber:{name:'Âmbar',colors:{bg:'#120f06',bg2:'#4d3f12',felt:'#3b320d',panel:'#2a240e',panel2:'#352d13',line:'#504522',gold:'#ffd24d',gold2:'#d6a82b',txt:'#f6f5f1',mut:'#b0aa8f',red:'#e0615a',green:'#4cc38a',input:'#1f1b0a',gray:'#3a382a'}}
};
function loadTheme(){try{const v=JSON.parse(localStorage.getItem(KEY_T));if(v&&v.colors)return v}catch(e){}return {preset:'light',colors:PRESETS.light.colors}}
function applyTheme(t){
  const c=(t&&t.colors)||PRESETS.light.colors;
  const r=document.documentElement.style;
  Object.keys(c).forEach(k=>r.setProperty('--'+k,c[k]));
  r.setProperty('--onacc',fgDe(c.gold));
  document.body.style.background=`radial-gradient(1200px 700px at 50% -10%, ${c.bg2} 0%, ${c.bg} 60%) fixed`;
  const meta=document.querySelector('meta[name="theme-color"]'); if(meta) meta.setAttribute('content',c.bg);
}
function saveTheme(t){try{localStorage.setItem(KEY_T,JSON.stringify(t))}catch(e){}applyTheme(t)}
function themeFromColors(felt,accent){
  const bg=darken(felt,.78), bg2=darken(felt,.42), panel=darken(felt,.62), panel2=darken(felt,.5), line=lighten(felt,.12),
    input=darken(felt,.7), mut=lighten(felt,.45), txt='#f3f6f1', gold=accent, gold2=darken(accent,.22);
  return {preset:'custom',colors:{bg,bg2,felt,panel,panel2,line,gold,gold2,txt,mut,red:'#e0615a',green:'#4cc38a',input,gray:darken(felt,.55)}};
}

/* ======== Estado ======== */
let matches=load(KEY_M,[]);
if(!Array.isArray(matches))matches=[];
let cur=load(KEY_C,null);
let tab='play';
const KEY_PL='sinuca_placares_v1';
let placares=load(KEY_PL,[]);if(!Array.isArray(placares))placares=[];
function savePL(){save(KEY_PL,placares)}
const KEY_A='sinuca_agenda_v1';
let agenda=load(KEY_A,[]);if(!Array.isArray(agenda))agenda=[];
function saveA(){save(KEY_A,agenda)}
const _hj=new Date();
let calY=_hj.getFullYear(),calM=_hj.getMonth(),calSel=null;
let setup={opp:OPP_DEFAULT,tipo:'3bolas',meta:8,setsToWin:0,date:hoje()};
let F={tipo:'all',opp:'all',per:'all'};
let wake=null;
let bump=null, flash=null, celebrate=null;
let setupAtivo=false, ultimoSnap=0, promptInstalar=null;

function saveM(){save(KEY_M,matches)}
function saveC(){save(KEY_C,cur)}

/* ---- backup automático: cópia de verdade, tirada antes de algo destrutivo ---- */
function lerBackup(){
  const b=load(KEY_B,null);
  if(Array.isArray(b))return {em:0,motivo:'cópia antiga',partidas:b,agenda:[],placares:[],atual:null};
  return b&&Array.isArray(b.partidas)?b:null;
}
function snapshot(motivo){
  try{localStorage.setItem(KEY_B,JSON.stringify({em:Date.now(),motivo:motivo||'manual',partidas:matches,agenda,placares,atual:cur}))}catch(e){}
  ultimoSnap=Date.now();
}
function snapshotAuto(motivo){if(Date.now()-ultimoSnap>60e3)snapshot(motivo)}

/* sets de partidas apagadas/descartadas não devem aparecer no histórico */
function removerSetsDaPartida(id){
  const antes=placares.length;
  placares=placares.filter(p=>p.matchId!==id);
  if(placares.length!==antes)savePL();
}
function limparOrfaos(){
  const vivos=new Set(matches.map(m=>m.id));if(cur)vivos.add(cur.id);
  const antes=placares.length;
  placares=placares.filter(p=>!p.matchId||vivos.has(p.matchId));
  if(placares.length!==antes)savePL();
  return antes-placares.length;
}
/* limpa sets de partidas que não existem mais; se o histórico estiver vazio,
   não mexe em nada (pode ser recuperável pelo backup) */
if(matches.length)limparOrfaos();
if(!matches.length){
  const b=lerBackup();
  if(b&&b.partidas.length){
    setTimeout(()=>toast('Há um backup de '+b.partidas.length+' partida(s) na aba Backup'),700);
  }
}

function curVazia(c){return !c||(!c.me&&!c.op&&!c.setsMe&&!c.setsOp&&!(c.log&&c.log.length))}
function defaultCur(){return {id:uid(),opp:OPP_DEFAULT,tipo:'3bolas',meta:8,setsToWin:0,date:hoje(),me:0,op:0,setsMe:0,setsOp:0,log:[],undo:[],createdAt:Date.now(),iniciada:false}}
/* partidas salvas por versões antigas não têm a flag "iniciada" */
let curMudou=false;
if(cur&&cur.iniciada===undefined){cur.iniciada=!curVazia(cur);curMudou=true}
if(cur){
  if(!Array.isArray(cur.log)){cur.log=[];curMudou=true}
  if(!Array.isArray(cur.undo)){cur.undo=[];curMudou=true}
}
if(curMudou)saveC();

function toast(t){const e=$('#toast');e.textContent=t;e.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove('show'),2200)}

/* diálogo próprio, no visual do app (substitui confirm()) */
function confirmar(msg,opts){
  opts=opts||{};
  return new Promise(res=>{
    const box=document.createElement('div');
    box.className='ov ask';
    box.innerHTML=`<div class="modal" role="dialog" aria-modal="true">
      <h2>${esc(opts.titulo||'Confirmar')}</h2>
      <div class="askmsg">${esc(msg)}</div>
      <div class="row">
        <button class="btn ghost" data-ask="0" style="flex:1">${esc(opts.cancelar||'Cancelar')}</button>
        <button class="btn ${opts.perigo?'red':'gold'}" data-ask="1" style="flex:1.4">${esc(opts.ok||'Confirmar')}</button>
      </div>
    </div>`;
    document.body.appendChild(box);
    const fim=v=>{box.remove();document.removeEventListener('keydown',tecla);res(v)};
    const tecla=e=>{if(e.key==='Escape')fim(false);if(e.key==='Enter')fim(true)};
    box.addEventListener('click',e=>{
      const b=e.target.closest('[data-ask]');
      if(b){fim(b.dataset.ask==='1');return}
      if(e.target===box)fim(false);
    });
    document.addEventListener('keydown',tecla);
    box.querySelector('[data-ask="1"]').focus();
  });
}

async function keepAwake(){try{if('wakeLock' in navigator&&cur){wake=await navigator.wakeLock.request('screen')}}catch(e){}}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&cur)keepAwake()});

/* ======== Cálculos ======== */
const resultado=C.resultado;
const KEY_MC='sinuca_contagem_v1';
let modoSets=false;try{modoSets=localStorage.getItem(KEY_MC)==='set'}catch(e){}
const calc=list=>C.calc(list,modoSets);
const oppKey=C.oppKey;
const filtrarTudo=(skip,lista)=>C.filtrar(lista||matches,F,skip);
const filtrar=(skip,lista)=>filtrarTudo(skip,lista).filter(m=>!m.emAndamento);
const sortDesc=C.sortDesc;
function oponentes(){
  const map={};
  matches.concat(placares).forEach(m=>{const k=oppKey(m.opp);if(!map[k])map[k]=m.opp.trim()});
  return Object.entries(map).sort((a,b)=>a[1].localeCompare(b[1]));
}

/* ======== Navegação ======== */
function renderNav(){
  const I=d=>`<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const items=[
    ['play',I('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.4"/>'),'Placar'],
    ['cal',I('<rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M8 3.5v3M16 3.5v3M3.5 10h17"/>'),'Agenda'],
    ['stats',I('<path d="M4 20v-8M10 20V5M16 20v-5M22 20H2"/>'),'Relatórios'],
    ['hist',I('<path d="M8.5 6.5H20M8.5 12H20M8.5 17.5H20"/><circle cx="4.5" cy="6.5" r=".6"/><circle cx="4.5" cy="12" r=".6"/><circle cx="4.5" cy="17.5" r=".6"/>'),'Histórico'],
    ['data',I('<path d="M12 4v11m0 0-4-4m4 4 4-4M5 19.5h14"/>'),'Backup']];
  $('#nav').innerHTML=items.map(([k,i,t])=>`<button class="${tab===k?'act':''}" data-tab="${k}"><span class="ic">${i}</span>${t}</button>`).join('');
  $('#nav').querySelectorAll('button').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;render()});
  const t=hoje();$('#today').innerHTML=fmtD(t)+'<br>'+pillDia(t);
  $('#today').style.cursor='pointer';$('#today').title='Abrir agenda';
  $('#today').onclick=()=>{tab='cal';render()};
}
function render(){
  renderNav();
  const aoVivo=tab==='play'&&!!cur&&!!cur.iniciada&&!setupAtivo;
  document.body.classList.toggle('live',aoVivo);
  const a=$('#app');
  if(tab==='play')a.innerHTML=aoVivo?viewLive():viewSetup();
  else if(tab==='stats')a.innerHTML=viewStats();
  else if(tab==='cal')a.innerHTML=viewCal();
  else if(tab==='hist')a.innerHTML=viewHist();
  else a.innerHTML=viewData();
  if(tab==='play'&&!aoVivo)bindSetup();
  window.scrollTo(0,0);
}

/* ======== Placar: configuração ======== */
function viewSetup(){
  const ops=oponentes();
  const t=TIPOS[setup.tipo];
  const emAndamento=cur&&cur.iniciada;
  return `<h2>Nova partida</h2>
  <div class="card">
    <div class="field"><label>Adversário</label>
      <input id="sOpp" list="sOppList" maxlength="40" value="${esc(setup.opp)}" placeholder="Nome do adversário" autocomplete="off">
      <datalist id="sOppList">${ops.map(o=>`<option value="${esc(o[1])}">`).join('')}</datalist>
    </div>
    <div class="field"><label>Tipo de jogo</label>
      <div class="seg">${Object.entries(TIPOS).map(([k,v])=>`<button data-tipo="${k}" class="${setup.tipo===k?'sel':''}">${v.nome}<small>${v.sub}</small></button>`).join('')}</div>
    </div>
    <div class="grid g2">
      <div class="field"><label>Pontos para fechar o set</label>
        <input id="sMeta" type="number" min="1" max="99" inputmode="numeric" value="${setup.tipo==='3bolas'?8:setup.meta}" ${t.fixa?'readonly':''}></div>
      <div class="field"><label>Sets p/ vencer (opcional)</label>
        <input id="sSets" type="number" min="0" max="15" inputmode="numeric" value="${setup.setsToWin||''}" placeholder="livre"></div>
    </div>
    <div class="field"><label>Data da partida</label>
      <input id="sDate" type="date" value="${setup.date}"></div>
    <button class="btn gold block" id="sGo" style="font-size:1.15rem;padding:18px">▶ Iniciar partida</button>
    <div class="hint" style="text-align:center;margin-top:10px">${esc(MEU_NOME)} × <span id="sHintName">${esc(setup.opp||'adversário')}</span> · a partida é salva automaticamente.</div>
    ${emAndamento?`<button class="btn ghost block" id="sBack" style="margin-top:10px">↩ Voltar para a partida (${cur.setsMe}×${cur.setsOp})</button>`:''}
  </div>
  ${matches.length?`<h3>Últimas partidas</h3><div class="card">${matches.slice().sort(sortDesc).slice(0,3).map(itemHist).join('')}</div>`:''}`;
}
function bindSetup(){
  const opp=$('#sOpp');
  if(opp){
    opp.oninput=e=>{setup.opp=e.target.value;const h=$('#sHintName');if(h)h.textContent=setup.opp.trim()||'adversário'};
    opp.onchange=e=>{setup.opp=e.target.value.trim()};
  }
  document.querySelectorAll('[data-tipo]').forEach(b=>b.onclick=()=>{
    setup.tipo=b.dataset.tipo;
    setup.meta=TIPOS[setup.tipo].meta;
    setup.setsToWin=+($('#sSets').value)||0;
    setup.date=$('#sDate').value||hoje();
    $('#app').innerHTML=viewSetup();bindSetup();
  });
  $('#sMeta').oninput=e=>setup.meta=+e.target.value||1;
  $('#sSets').oninput=e=>setup.setsToWin=+e.target.value||0;
  $('#sDate').onchange=e=>{setup.date=e.target.value||hoje();};
  const back=$('#sBack');
  if(back)back.onclick=()=>{setupAtivo=false;tab='play';render()};
  $('#sGo').onclick=()=>{
    const t=TIPOS[setup.tipo];
    setup.opp=(setup.opp||'').trim()||OPP_DEFAULT;
    if(cur&&cur.iniciada)saveInProgressToHistory();
    snapshot('antes de começar outra partida');
    cur={id:uid(),opp:setup.opp,tipo:setup.tipo,
      meta:t.fixa?t.meta:Math.max(1,+setup.meta||t.meta),setsToWin:+setup.setsToWin||0,
      date:setup.date||hoje(),me:0,op:0,setsMe:0,setsOp:0,log:[],undo:[],createdAt:Date.now(),iniciada:true};
    setupAtivo=false;
    saveC();keepAwake();render();
  };
}

/* ======== Placar: partida ao vivo ======== */
function viewLive(){
  const c=cur,t=TIPO(c.tipo),pc=loadPC();
  const confetti = celebrate ? Array.from({length:40},(_,i)=>'<span class="confetti" style="left:'+(Math.random()*100)+'%;top:'+(Math.random()*20)+'%;background:'+['#e6b94d','#fff','#4cc38a','#e0615a','#5dd4ff'][i%5]+';animation-delay:'+(Math.random()*.4)+'s"></span>').join('') : '';
  const overlay = celebrate ? '<div class="celebrate">'+confetti+'<div class="ctext">SET!</div></div>' : '';
  const half=(who,nome,pts,sets,cls)=>`
    <div class="half ${cls} ${flash===who?'flash':''}" data-act="add" data-who="${who}" role="button" tabindex="0"
      aria-label="${esc(nome)}: ${pts} pontos, ${sets} sets. Toque para somar um ponto" style="background:${pc[who]};color:${fgDe(pc[who])}">
      <div class="hd"><div class="lname" data-pname="${who}">${esc(nome)}</div><div class="lsets">Sets ${sets}</div></div>
      <button class="mn" data-act="sub" data-who="${who}" aria-label="Tirar 1 ponto de ${esc(nome)}">−</button>
      <div class="num ${bump===who?'pop':''}" aria-live="polite">${pts}</div>
    </div>`;
  const html=`<div class="lv">
    ${half('op',c.opp,c.op,c.setsOp,'opp')}
    ${half('me',MEU_NOME,c.me,c.setsMe,'me')}
    <div class="mid">${t.nome} · Set ${c.log.length+1} · meta ${c.meta}</div>
    <button class="fab l" id="bUndo" aria-label="Desfazer" ${c.undo.length?'':'disabled'}>↶</button>
    <button class="fab r" id="bMenu" aria-label="Menu da partida">⋯</button>
    ${overlay}
  </div>`;
  bump=null;flash=null;celebrate=null;
  return html;
}
function closeMenu(){$('#modalRoot').innerHTML=''}
function openMenu(){
  const c=cur;if(!c)return;
  const t=TIPO(c.tipo);
  $('#modalRoot').innerHTML=`<div class="ov" id="ov"><div class="modal">
    <h2>Menu da partida</h2>
    <div class="hint" style="margin:0 0 8px">${esc(c.opp)} · ${t.nome} · meta ${c.meta} · ${fmtD(c.date)} · ${DIAS_C[dow(c.date)]}${c.setsToWin?' · vence com '+c.setsToWin+' sets':''}</div>
    ${[['me',MEU_NOME,c.setsMe],['op',c.opp,c.setsOp]].map(([w,n,v])=>`<div class="trow"><div class="nm">Sets de ${esc(n)}</div><div class="setadj"><button data-mact="setsub" data-who="${w}" aria-label="Menos um set de ${esc(n)}">−</button><b>${v}</b><button data-mact="setadd" data-who="${w}" aria-label="Mais um set de ${esc(n)}">+</button></div></div>`).join('')}
    ${c.log.length?`<div class="setlog" style="justify-content:flex-start;margin:10px 0">${c.log.map((x,i)=>`<span class="${x.w==='me'?'w':'l'}">S${i+1}: ${x.me}×${x.op}</span>`).join('')}</div>`:''}
    <div class="grid g3" style="margin:14px 0 12px">
      <button class="btn ghost sm" data-go="stats">📊 Relatórios</button>
      <button class="btn ghost sm" data-go="hist">📋 Histórico</button>
      <button class="btn ghost sm" data-go="data">💾 Backup</button>
    </div>
    <div class="grid g2" style="margin-bottom:12px">
      <button class="btn ghost sm" id="mUndo">↶ Desfazer</button>
      <button class="btn ghost sm" id="mZero">0️⃣ Zerar set</button>
      <button class="btn ghost sm" id="mSaveHist">💾 Salvar no histórico</button>
      <button class="btn ghost sm" id="mCC">🎨 Cores</button>
      <button class="btn ghost sm" id="mName">✏️ Adversário</button>
      <button class="btn ghost sm" id="mNew">＋ Nova partida</button>
    </div>
    <button class="btn gold block" id="mEnd" style="padding:16px;margin-bottom:10px">🏁 Encerrar partida</button>
    <button class="btn red block" id="mDrop" style="margin-bottom:10px">🗑️ Descartar partida</button>
    <button class="btn ghost block" id="mClose">Fechar</button>
    <div class="hint" style="text-align:center">Segure o nome de um jogador na tela para trocar cor e nome.</div>
  </div></div>`;
  $('#ov').onclick=e=>{if(e.target.id==='ov')closeMenu()};
}
function openCores(){
  pcWho=null;
  $('#modalRoot').innerHTML=`<div class="ov" id="ov"><div class="modal">
    <h2>Cores dos jogadores</h2>
    <div id="pcBox">${pcRows()}</div>
    <button class="btn gold block" id="jOk" style="margin-top:6px">Pronto</button>
  </div></div>`;
  $('#ov').onclick=e=>{if(e.target.id==='ov'){closeMenu();render()}};
}
function snap(){cur.undo.push({me:cur.me,op:cur.op,setsMe:cur.setsMe,setsOp:cur.setsOp,log:JSON.parse(JSON.stringify(cur.log))});if(cur.undo.length>60)cur.undo.shift()}
function act(a,who){
  const c=cur;if(!c)return;
  if(a==='add'||a==='sub')bump=who;
  if(a==='add')flash=who;
  if(a==='add'){
    snap();c[who]++;vib(15);
    if(c[who]>=c.meta){
      const w=who;
      const sid=uid(),agora=Date.now();
      c.log.push({w,me:c.me,op:c.op,sid,t:agora});
      placares.push({id:sid,matchId:c.id,ts:agora,date:c.date||hoje(),opp:c.opp,tipo:c.tipo,meta:c.meta,me:c.me,op:c.op,w});savePL();
      if(w==='me')c.setsMe++;else c.setsOp++; celebrate=true;
      const nome=w==='me'?MEU_NOME:c.opp;
      c.me=0;c.op=0;vib([60,40,60]);
      toast('🏆 Set para '+nome+'!');
      saveC();render();
      if(c.setsToWin&&(c.setsMe>=c.setsToWin||c.setsOp>=c.setsToWin)){
        setTimeout(()=>{
          confirmar('Um jogador chegou a '+c.setsToWin+' sets ('+c.setsMe+' × '+c.setsOp+').\nEncerrar e salvar a partida agora?',{titulo:'Fim da partida',ok:'Encerrar e salvar',cancelar:'Continuar jogando'}).then(ok=>{if(ok)finish()});
        },350);
      }
      return;
    }
  }else if(a==='sub'){
    if(c[who]<=0)return;snap();c[who]--;vib(10);
  }else if(a==='setadd'){snap();who==='me'?c.setsMe++:c.setsOp++}
  else if(a==='setsub'){const k=who==='me'?'setsMe':'setsOp';if(c[k]<=0)return;snap();c[k]--}
  saveC();render();
}
function undo(){
  const c=cur;if(!c||!c.undo.length)return;
  const s=c.undo.pop();Object.assign(c,s);
  const vivos=new Set(c.log.map(x=>x.sid).filter(Boolean));
  const antes=placares.length;placares=placares.filter(x=>x.matchId!==c.id||vivos.has(x.id));if(placares.length!==antes)savePL();
  saveC();render();toast('Ação desfeita');
}
function saveInProgressToHistory(){
  const c=cur;if(!c)return;
  const rec={id:c.id,date:c.date,opp:c.opp,tipo:c.tipo,meta:c.meta,setsMe:c.setsMe,setsOp:c.setsOp,setsToWin:c.setsToWin||0,
    sets:c.log.map(s=>({w:s.w,me:s.me,op:s.op,sid:s.sid,t:s.t})),createdAt:c.createdAt,emAndamento:true,me:c.me,op:c.op};
  const idx=matches.findIndex(m=>m.id===c.id);
  if(idx>=0)matches[idx]=rec;else matches.push(rec);
  saveM();toast('Partida salva no histórico');
}
function resumeMatch(id){
  const m=matches.find(x=>x.id===id);if(!m||!m.emAndamento)return;
  if(cur&&cur.iniciada&&cur.id!==m.id){saveInProgressToHistory();snapshot('antes de retomar outra partida')}
  cur={id:m.id,date:m.date,opp:m.opp,tipo:m.tipo,meta:m.meta,setsToWin:m.setsToWin||0,me:m.me||0,op:m.op||0,
    setsMe:m.setsMe||0,setsOp:m.setsOp||0,log:(m.sets||[]).map(s=>({w:s.w,me:s.me,op:s.op,sid:s.sid,t:s.t})),undo:[],createdAt:m.createdAt,iniciada:true};
  setupAtivo=false;saveC();tab='play';render();toast('Partida retomada');
}
function finish(){
  const c=cur;
  const rec={id:c.id,date:c.date,opp:c.opp,tipo:c.tipo,meta:c.meta,setsMe:c.setsMe,setsOp:c.setsOp,setsToWin:c.setsToWin||0,
    sets:c.log.map(s=>({w:s.w,me:s.me,op:s.op,sid:s.sid,t:s.t})),createdAt:c.createdAt};
  const fi=matches.findIndex(m=>m.id===rec.id);if(fi>=0)matches[fi]=rec;else matches.push(rec);saveM();
  cur=defaultCur();saveC();try{wake&&wake.release()}catch(e){}
  setup.opp=rec.opp;setup.tipo=rec.tipo;setup.meta=rec.meta;setup.setsToWin=rec.setsToWin||0;setup.date=hoje();
  setupAtivo=false;snapshot('partida encerrada');
  const r=resultado(rec);
  toast(r==='w'?'🏆 Vitória salva! '+rec.setsMe+'×'+rec.setsOp:r==='l'?'Derrota salva: '+rec.setsMe+'×'+rec.setsOp:'Empate salvo: '+rec.setsMe+'×'+rec.setsOp);
  histModo='partidas';
  tab='hist';render();
  abrirResumo(rec);
}
function abrirResumo(rec){
  const r=resultado(rec),txt=r==='w'?'Vitória':r==='l'?'Derrota':'Empate';
  $('#modalRoot').innerHTML=`<div class="ov" id="ov"><div class="modal">
    <div style="text-align:center;padding:4px 0 0">
      <div class="hint" style="letter-spacing:.12em;text-transform:uppercase;margin:0">${esc(MEU_NOME)} × ${esc(rec.opp)}</div>
      <div class="resnum ${r==='w'?'win':r==='l'?'loss':''}">${rec.setsMe}<span>×</span>${rec.setsOp}</div>
      <span class="badge ${r}" style="margin:0">${txt.toUpperCase()}</span>
      <div class="hint" style="margin-top:8px">${TIPOS[rec.tipo]?TIPOS[rec.tipo].nome:esc(rec.tipo)} · meta ${rec.meta} · ${fmtD(rec.date)}</div>
    </div>
    <button class="btn gold block" id="rRev" style="margin:16px 0 10px">🔁 Revanche contra ${esc(rec.opp)}</button>
    <div class="grid g2">
      <button class="btn ghost sm" id="rShare">📤 Compartilhar</button>
      <button class="btn ghost sm" id="rClose">Fechar</button>
    </div>
  </div></div>`;
  $('#ov').onclick=e=>{if(e.target.id==='ov')closeMenu()};
  $('#rRev').onclick=()=>{
    closeMenu();
    cur={id:uid(),opp:rec.opp,tipo:rec.tipo,meta:rec.meta,setsToWin:rec.setsToWin||0,date:hoje(),me:0,op:0,setsMe:0,setsOp:0,log:[],undo:[],createdAt:Date.now(),iniciada:true};
    setupAtivo=false;saveC();snapshotAuto('revanche');tab='play';render();toast('Revanche contra '+rec.opp);
  };
  $('#rShare').onclick=()=>compartilhar(rec);
  $('#rClose').onclick=closeMenu;
}
async function endMatch(){
  const c=cur;if(!c)return;
  let msg='Eu '+c.setsMe+' × '+c.setsOp+' '+c.opp;
  if(c.me||c.op)msg+='\n\nAtenção: o set em andamento ('+c.me+'×'+c.op+') não será contado.';
  if(c.setsMe===0&&c.setsOp===0)msg+='\n\nNenhum set foi concluído (será salvo como empate 0×0).';
  const ok=await confirmar(msg,{titulo:'Encerrar partida?',ok:'Encerrar e salvar',cancelar:'Continuar'});
  if(ok)finish();
}

/* ======== Relatórios ======== */
function filtersHTML(){
  const ops=oponentes();
  return `<div class="filters">
    <div><label>Período</label><select data-f="per">
      ${[['all','Todo o período'],['month','Este mês'],['30','Últimos 30 dias'],['90','Últimos 90 dias'],['year','Este ano']].map(([v,t])=>`<option value="${v}" ${F.per===v?'selected':''}>${t}</option>`).join('')}</select></div>
    <div><label>Tipo de jogo</label><select data-f="tipo"><option value="all">Todos</option>
      ${Object.entries(TIPOS).map(([k,v])=>`<option value="${k}" ${F.tipo===k?'selected':''}>${v.nome}</option>`).join('')}</select></div>
    <div class="f3"><label>Adversário</label><select data-f="opp"><option value="all">Todos</option>
      ${ops.map(o=>`<option value="${esc(o[0])}" ${F.opp===o[0]?'selected':''}>${esc(o[1])}</option>`).join('')}</select></div>
  </div>`;
}
function bindFilters(){
  document.querySelectorAll('[data-f]').forEach(s=>s.onchange=()=>{F[s.dataset.f]=s.value;render()});
}
function bindTheme(){
  document.querySelectorAll('[data-preset]').forEach(b=>b.onclick=()=>{
    const p=b.dataset.preset; const t={preset:p,colors:JSON.parse(JSON.stringify(PRESETS[p].colors))};
    saveTheme(t);
    render();
  });
  const cf=$('#cFelt'), ca=$('#cAccent');
  if(cf) cf.oninput=e=>{ const t=themeFromColors(e.target.value, (ca&&ca.value)||loadTheme().colors.gold); saveTheme(t); };
  if(ca) ca.oninput=e=>{ const t=themeFromColors((cf&&cf.value)||loadTheme().colors.felt, e.target.value); saveTheme(t); };
  const cr=$('#cReset');
  if(cr) cr.onclick=()=>{ saveTheme({preset:'light',colors:JSON.parse(JSON.stringify(PRESETS.light.colors))}); render(); };
}
function viewStats(){
  setTimeout(bindFilters,0);
  if(!matches.some(m=>!m.emAndamento))return `<h2>Relatórios</h2><div class="card empty">Nenhuma partida registrada ainda.<br>Jogue ou registre uma partida para ver suas estatísticas.${matches.length?'<br><br>'+matches.length+' partida(s) em andamento ficam fora dos relatórios.':''}</div>`;
  const L=filtrar(),S=calc(L);
  const un=modoSets?'set(s)':'partida(s)';
  let h=`<h2>Relatórios</h2>
  <div class="seg" style="grid-template-columns:1fr 1fr;margin-bottom:12px">
    <button data-conta="partida" class="${modoSets?'':'sel'}">Contar por partida<small>2×0 = 1 vitória</small></button>
    <button data-conta="set" class="${modoSets?'sel':''}">Contar por set<small>2×0 = 2 vitórias</small></button>
  </div>${filtersHTML()}
  <div class="grid g4">
    <div class="card stat"><div class="v">${S.n}</div><div class="k">${modoSets?'Sets jogados':'Partidas'}</div></div>
    <div class="card stat win"><div class="v">${S.w}</div><div class="k">Vitórias</div></div>
    <div class="card stat loss"><div class="v">${S.l}</div><div class="k">Derrotas</div></div>
    <div class="card stat"><div class="v">${S.pct}%</div><div class="k">Aproveitamento</div></div>
  </div>
  <div class="hint" style="text-align:center">${S.d?S.d+' empate(s) · ':''}Sets: ${S.sf} pró × ${S.sa} contra</div>
  ${matches.filter(m=>m.emAndamento).length?`<div class="hint" style="text-align:center">${matches.filter(m=>m.emAndamento).length} partida(s) em andamento ficam fora dos relatórios</div>`:''}`;

  // por tipo
  const Lt=filtrar('tipo');
  h+=`<h3>Desempenho por tipo de jogo</h3><div class="card">`+Object.entries(TIPOS).map(([k,v])=>{
    const s=calc(Lt.filter(m=>m.tipo===k));
    return `<div class="trow"><div class="nm">${v.nome}<div class="sub">${s.n} ${un} · ${s.w}V ${s.l}D${s.d?' '+s.d+'E':''}</div></div>
      <div class="mini"><div class="bar"><i style="width:${s.pct}%"></i></div></div><div class="pc">${s.pct}%</div></div>`}).join('')+`</div>`;

  // por adversário
  const Lo=filtrar('opp');
  const map={};
  Lo.forEach(m=>{const k=oppKey(m.opp);(map[k]=map[k]||{nome:m.opp.trim(),l:[]}).l.push(m)});
  const rows=Object.entries(map).map(([k,o])=>({k,nome:o.nome,s:calc(o.l),l:o.l.slice().sort(sortDesc)})).sort((a,b)=>b.s.n-a.s.n||a.nome.localeCompare(b.nome));
  h+=`<h3>Confrontos por adversário</h3><div class="card">`+(rows.length?rows.map(r=>`
    <div class="trow clickable" data-opp="${esc(r.k)}"><div class="nm">${esc(r.nome)}<div class="sub">${r.s.n} ${un} · ${r.s.w}V ${r.s.l}D${r.s.d?' '+r.s.d+'E':''} · sets ${r.s.sf}×${r.s.sa}</div></div>
    <div class="dots">${r.l.slice(0,5).map(m=>{const x=resultado(m);return `<div class="dot ${x}">${x==='w'?'V':x==='l'?'D':'E'}</div>`}).join('')}</div>
    <div class="pc">${r.s.pct}%</div></div>`).join(''):'<div class="empty">Sem dados neste filtro.</div>')+`</div>
  <div class="hint">Toque em um adversário para filtrar todo o relatório por ele.</div>`;

  // dias da semana
  const Lw=filtrar();
  h+=`<h3>Partidas por dia da semana</h3><div class="card"><div class="wk">`+[1,2,3,4,5,6,0].map(d=>{
    const s=calc(Lw.filter(m=>dow(m.date)===d));
    return `<div class="${JOGO.includes(d)?'play':''}"><div class="d">${DIAS_C[d]}</div><div class="n">${s.n}</div><div class="p">${s.n?s.pct+'%':'—'}</div></div>`}).join('')+`</div>
    <div class="hint">Borda dourada = dia de treino (Ter, Qua, Sex, Sáb). Folgas: Seg, Qui, Dom.</div></div>`;
  return h;
}

/* ======== Histórico ======== */
function itemHist(m){
  const r=resultado(m);
  const badge = m.emAndamento
    ? '<span class="badge" style="margin:0;background:rgba(230,185,77,.18);color:var(--gold)">EM ANDAMENTO</span>'
    : '<span class="badge '+r+'" style="margin:0">'+(r==='w'?MEU_NOME.toUpperCase()+' VENCEU':r==='l'?MEU_NOME.toUpperCase()+' PERDEU':'EMPATE')+'</span>';
  const resumeBtn = m.emAndamento ? '<button class="ibtn" data-resume="'+m.id+'" title="Retomar" aria-label="Retomar partida">&#9658;</button>' : '';
  const shareBtn = m.emAndamento ? '' : '<button class="ibtn" data-share="'+m.id+'" title="Compartilhar placar" aria-label="Compartilhar placar">&#128228;</button>';
  return '<div class="mitem">'+
    '<div class="mdate"><b>'+fmtD(m.date).slice(0,5)+'</b>'+DIAS_C[dow(m.date)]+'<br>'+m.date.slice(0,4)+'</div>'+
    '<div class="minfo"><div class="o">vs '+esc(m.opp)+'</div>'+
      '<div class="t">'+(TIPOS[m.tipo]?TIPOS[m.tipo].nome:esc(m.tipo))+' - meta '+(m.meta||'-')+'</div>'+
      '<div style="margin-top:5px">'+badge+'</div></div>'+
    '<div class="mscore" style="text-align:center">'+m.setsMe+'-'+m.setsOp+'<div style="font-size:.62rem;font-weight:600;color:var(--mut);max-width:84px;overflow:hidden;text-overflow:ellipsis">'+esc(MEU_NOME)+' - '+esc(m.opp)+'</div></div>'+
    '<div class="mact">'+resumeBtn+shareBtn+'<button class="ibtn" data-edit="'+m.id+'" title="Editar" aria-label="Editar partida">&#9998;</button><button class="ibtn" data-del="'+m.id+'" title="Apagar" aria-label="Apagar partida">&#128465;</button></div>'+
  '</div>';
}
let histModo='sets';
const hhmm=C.hhmm;
function itemSet(p){
  const g=p.w==='me';
  return `<div class="mitem">
    <div class="mdate"><b>${hhmm(p.ts)}</b>${fmtD(p.date).slice(0,5)}</div>
    <div class="minfo"><div class="o">${esc(MEU_NOME)} × ${esc(p.opp)}</div>
      <div class="t">${TIPOS[p.tipo]?TIPOS[p.tipo].nome:esc(p.tipo)} · meta ${p.meta||'-'}</div>
      <div style="margin-top:5px"><span class="badge ${g?'w':'l'}" style="margin:0">${g?'SET GANHO':'SET PERDIDO'}</span></div></div>
    <div class="mscore" style="color:${g?'var(--green)':'var(--red)'}">${p.me}×${p.op}</div>
    <div class="mact"><button class="ibtn" data-pldel="${p.id}" title="Apagar">&#128465;</button></div>
  </div>`;
}
function viewHistSets(){
  const L=filtrar(undefined,placares).sort((a,b)=>b.ts-a.ts);
  if(!L.length)return `<div class="card"><div class="empty">${placares.length?'Nenhum set neste filtro.':'Nenhum set registrado ainda.<br>Cada set fechado aparece aqui com o placar e o horário.'}</div></div>`;
  const grupos={};L.forEach(p=>{(grupos[p.date]=grupos[p.date]||[]).push(p)});
  return Object.keys(grupos).sort().reverse().map(d=>{
    const g=grupos[d],v=g.filter(x=>x.w==='me').length;
    return `<h3>${fmtD(d)} · ${DIAS[dow(d)]} · ${g.length} set(s) · ${v}V ${g.length-v}D</h3><div class="card">${g.map(itemSet).join('')}</div>`;
  }).join('')+`<div class="hint" style="text-align:center;margin-top:12px">${L.length} set(s) listado(s)</div>`;
}
function viewHist(){
  setTimeout(bindFilters,0);
  const L=filtrarTudo().sort(sortDesc);
  const modo=`<div class="seg" style="grid-template-columns:1fr 1fr;margin-bottom:12px"><button data-hmodo="sets" class="${histModo==='sets'?'sel':''}">Sets<small>placar de cada set</small></button><button data-hmodo="partidas" class="${histModo==='partidas'?'sel':''}">Partidas<small>resultado final</small></button></div>`;
  if(histModo==='sets')return `<div class="row sp"><h2 style="margin:0">Histórico</h2><button class="btn gold sm" data-edit="new">＋ Registrar</button></div><div style="height:12px"></div>${modo}${(matches.length||placares.length)?filtersHTML():''}${viewHistSets()}`;
  return `<div class="row sp"><h2 style="margin:0">Histórico</h2><button class="btn gold sm" data-edit="new">＋ Registrar</button></div>
  <div style="height:12px"></div>${modo}
  ${matches.length?filtersHTML():''}
  <div class="card">${L.length?L.map(itemHist).join(''):`<div class="empty">${matches.length?'Nenhuma partida neste filtro.':'Nenhuma partida salva ainda.'}</div>`}</div>
  ${L.length?`<div class="hint" style="text-align:center">${L.length} partida(s) listada(s)</div>`:''}`;
}

/* ======== Editar / registrar ======== */
function openEdit(id,pre){
  const isNew=id==='new';
  const m=isNew?{id:uid(),date:hoje(),opp:setup.opp||'',tipo:'3bolas',meta:8,setsMe:0,setsOp:0,sets:[],createdAt:Date.now()}:matches.find(x=>x.id===id);
  if(isNew&&pre)Object.assign(m,pre);
  if(!m)return;
  const ops=oponentes();
  $('#modalRoot').innerHTML=`<div class="ov" id="ov"><div class="modal">
    <h2>${isNew?'Registrar partida':'Editar partida'}</h2>
    <div class="field"><label>Data</label><input type="date" id="eDate" value="${m.date}"></div>
    <div class="field"><label>Adversário</label><input id="eOpp" list="eList" value="${esc(m.opp)}" placeholder="Nome do adversário"><datalist id="eList">${ops.map(o=>`<option value="${esc(o[1])}">`).join('')}</datalist></div>
    <div class="grid g2">
      <div class="field"><label>Tipo de jogo</label><select id="eTipo">${Object.entries(TIPOS).map(([k,v])=>`<option value="${k}" ${m.tipo===k?'selected':''}>${v.nome}</option>`).join('')}</select></div>
      <div class="field"><label>Pontos por set</label><input id="eMeta" type="number" min="1" inputmode="numeric" value="${m.meta||TIPO(m.tipo).meta}"></div>
      <div class="field"><label>Meus sets</label><input id="eMe" type="number" min="0" inputmode="numeric" value="${m.setsMe}"></div>
      <div class="field"><label>Sets do adversário</label><input id="eOp" type="number" min="0" inputmode="numeric" value="${m.setsOp}"></div>
    </div>
    <div class="row" style="margin-top:6px"><button class="btn ghost" id="eCancel" style="flex:1">Cancelar</button><button class="btn gold" id="eSave" style="flex:2">Salvar</button></div>
    ${isNew?'<button class="btn ghost block" id="eSaveMore" style="margin-top:10px">＋ Salvar e adicionar outra</button><div class="hint" style="text-align:center">Mantém data, adversário e tipo para o próximo registro.</div>':''}
  </div></div>`;
  $('#eDate').onchange=e=>{if(e.target.value)m.date=e.target.value;};
  $('#eTipo').onchange=e=>{$('#eMeta').value=TIPOS[e.target.value].meta};
  const close=()=>$('#modalRoot').innerHTML='';
  $('#eCancel').onclick=close;
  $('#ov').onclick=e=>{if(e.target.id==='ov')close()};
  const salvar=(mais)=>{
    const d=$('#eDate').value;if(!d){toast('Informe a data');return}
    const rec=Object.assign({},m,{
      date:d,opp:($('#eOpp').value.trim()||'Adversário'),tipo:$('#eTipo').value,
      meta:Math.max(1,+$('#eMeta').value||1),
      setsMe:Math.max(0,parseInt($('#eMe').value)||0),setsOp:Math.max(0,parseInt($('#eOp').value)||0)
    });
    if(isNew){snapshotAuto('partida registrada')}
    else{
      snapshot('edição de partida');
      const antes=(m.setsMe||0)+(m.setsOp||0);
      if(antes!==rec.setsMe+rec.setsOp)removerSetsDaPartida(rec.id);
      placares.forEach(p=>{if(p.matchId===rec.id){p.opp=rec.opp;p.tipo=rec.tipo;p.meta=rec.meta}});
      savePL();
    }
    if(isNew)matches.push(rec);else matches=matches.map(x=>x.id===rec.id?rec:x);
    saveM();close();histModo='partidas';render();
    if(mais&&isNew){toast('Partida salva · registre a próxima');openEdit('new',{date:rec.date,opp:rec.opp,tipo:rec.tipo,meta:rec.meta})}
    else toast('Partida salva');
  };
  $('#eSave').onclick=()=>salvar(false);
  const sm=$('#eSaveMore');if(sm)sm.onclick=()=>salvar(true);
}
async function delMatch(id){
  const m=matches.find(x=>x.id===id);if(!m)return;
  const ok=await confirmar('Apagar a partida de '+fmtD(m.date)+' contra '+m.opp+' ('+m.setsMe+'×'+m.setsOp+')?\n\nOs sets dela também saem do histórico.',{titulo:'Apagar partida',ok:'Apagar',perigo:true});
  if(!ok)return;
  snapshot('antes de apagar partida');
  matches=matches.filter(x=>x.id!==id);saveM();
  removerSetsDaPartida(id);
  toast('Partida apagada');render();
}

/* card do placar para compartilhar no WhatsApp etc. */
function cardSinuca(m){
  const W=1080,H=1080,cv=document.createElement('canvas');cv.width=W;cv.height=H;
  const x=cv.getContext('2d'),th=loadTheme().colors,r=resultado(m);
  const g=x.createLinearGradient(0,0,W,H);g.addColorStop(0,th.bg2);g.addColorStop(1,th.bg);
  x.fillStyle=g;x.fillRect(0,0,W,H);
  x.fillStyle='rgba(255,255,255,.05)';x.beginPath();x.arc(W-60,120,300,0,7);x.fill();
  x.textAlign='center';
  x.fillStyle=th.mut;x.font='700 30px system-ui,-apple-system,sans-serif';
  x.fillText('PLACAR DE SINUCA',W/2,120);
  x.fillStyle=th.txt;x.font='800 50px system-ui,-apple-system,sans-serif';
  x.fillText((TIPOS[m.tipo]?TIPOS[m.tipo].nome:m.tipo)+' · meta '+m.meta,W/2,190);
  x.font='900 54px system-ui,-apple-system,sans-serif';
  x.fillText(MEU_NOME.slice(0,12),250,390);
  x.fillText(String(m.opp).slice(0,12),830,390);
  x.fillStyle=th.mut;x.font='700 40px system-ui,-apple-system,sans-serif';x.fillText('×',W/2,375);
  x.fillStyle=th.txt;x.font='900 250px system-ui,-apple-system,sans-serif';
  x.fillText(m.setsMe+'-'+m.setsOp,W/2,640);
  const cor=r==='w'?th.green:r==='l'?th.red:th.mut;
  x.fillStyle=cor;x.font='900 46px system-ui,-apple-system,sans-serif';
  x.fillText(r==='w'?'VITORIA':r==='l'?'DERROTA':'EMPATE',W/2,740);
  if(Array.isArray(m.sets)&&m.sets.length){
    x.fillStyle=th.mut;x.font='600 34px system-ui,-apple-system,sans-serif';
    x.fillText(m.sets.map(s=>s.me+'×'+s.op).join('   '),W/2,820);
  }
  x.fillStyle=th.mut;x.font='600 32px system-ui,-apple-system,sans-serif';
  x.fillText(fmtD(m.date)+' · '+DIAS[dow(m.date)],W/2,890);
  x.fillStyle=th.gold;x.font='700 28px system-ui,-apple-system,sans-serif';
  x.fillText('Placar de Sinuca',W/2,990);
  return cv;
}
function compartilhar(m){
  if(!m)return;
  const nome='sinuca-'+m.date+'.png';
  const Cw=window.Capacitor,P=Cw&&Cw.Plugins;
  const cv=cardSinuca(m);
  if(Cw&&Cw.isNativePlatform&&Cw.isNativePlatform()&&P&&P.Filesystem&&P.Share){
    P.Filesystem.writeFile({path:nome,data:cv.toDataURL('image/png').split(',')[1],directory:'CACHE'})
      .then(r=>P.Share.share({title:'Placar de Sinuca',url:r.uri,dialogTitle:'Compartilhar placar'}))
      .catch(e=>{if(!/cancel/i.test(String(e&&e.message||e)))toast('Não foi possível compartilhar')});
    return;
  }
  cv.toBlob(async blob=>{
    const file=new File([blob],nome,{type:'image/png'});
    try{
      if(navigator.canShare&&navigator.canShare({files:[file]})){
        await navigator.share({files:[file],title:'Placar de Sinuca',text:MEU_NOME+' '+m.setsMe+'×'+m.setsOp+' '+m.opp});
        return;
      }
    }catch(e){if(e&&e.name==='AbortError')return}
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=nome;document.body.appendChild(a);a.click();
    setTimeout(()=>{URL.revokeObjectURL(url);a.remove()},1000);
    toast('Imagem do placar gerada');
  },'image/png');
}

/* ======== Backup / ajustes ======== */
const KEY_REM='sinuca_lembretes_v1';
let lembrete=load(KEY_REM,{on:false,hora:'19:00',dias:[2,3,5,6]});
if(!lembrete||typeof lembrete!=='object')lembrete={on:false,hora:'19:00',dias:[2,3,5,6]};
if(!Array.isArray(lembrete.dias))lembrete.dias=[2,3,5,6];
function nativo(){return !!(window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform())}
function pluginsCap(){return (window.Capacitor&&window.Capacitor.Plugins)||{}}

async function aplicarLembretes(silencioso){
  const LN=pluginsCap().LocalNotifications;
  if(!LN){
    if(!silencioso){
      if(lembrete.on){lembrete.on=false;save(KEY_REM,lembrete)}
      toast('Lembretes só funcionam no app instalado (APK)');
      render();
    }
    return;
  }
  try{
    let perm=LN.checkPermissions?await LN.checkPermissions():{display:'granted'};
    if(perm.display!=='granted'&&!silencioso)perm=await LN.requestPermissions();
    if(perm.display!=='granted'){
      if(!silencioso){lembrete.on=false;save(KEY_REM,lembrete);toast('Permissão de notificação negada');render()}
      return;
    }
    const pend=await LN.getPending();
    if(pend&&Array.isArray(pend.notifications)&&pend.notifications.length){
      await LN.cancel({notifications:pend.notifications.map(n=>({id:n.id}))});
    }
    if(!lembrete.on)return;
    const [h,mi]=String(lembrete.hora||'19:00').split(':').map(Number);
    await LN.schedule({notifications:lembrete.dias.map(d=>({
      id:100+d,
      title:'Dia de sinuca 🎱',
      body:'Hoje tem jogo! Já acertou com quem?',
      schedule:{on:{weekday:d===0?1:d+1,hour:h||19,minute:mi||0},repeats:true,allowWhileIdle:true}
    }))});
    if(!silencioso)toast('Lembretes agendados');
  }catch(e){if(!silencioso)toast('Não foi possível agendar os lembretes')}
}
function viewData(){
  setTimeout(bindTheme,0);
  const th=loadTheme();
  const bk=lerBackup();
  const presetBtns=Object.entries(PRESETS).map(([k,v])=>`<button class="btn ${th.preset===k?'gold':'ghost'} sm" data-preset="${k}" style="flex:0 0 auto">${v.name}</button>`).join('');
  return `<h2>Backup de dados</h2>
  <div class="card" style="margin-bottom:14px">
    <h3 style="margin:0 0 10px">Aparência</h3>
    <div class="hint" style="margin:0 0 12px">Escolha um tema pronto ou personalize as cores da mesa.</div>
    <div class="row" style="gap:8px;flex-wrap:wrap;margin-bottom:14px">${presetBtns}</div>
    <div class="grid g2">
      <div class="field"><label>Cor do feltro (mesa)</label><input type="color" id="cFelt" value="${th.colors.felt}"></div>
      <div class="field"><label>Cor de destaque</label><input type="color" id="cAccent" value="${th.colors.gold}"></div>
    </div>
    <div class="row sp"><button class="btn ghost sm" id="cReset">Restaurar padrão</button><span class="hint" style="margin:0">Salvo neste navegador.</span></div>
  </div>
  <div class="card" style="margin-bottom:14px">
    <h3 style="margin:0 0 10px">Lembretes</h3>
    <div class="row sp" style="margin-bottom:6px"><span>Lembrar nos dias de jogo</span>
      <label class="switch"><input type="checkbox" id="remOn" ${lembrete.on?'checked':''}><span></span></label></div>
    <div class="hint" style="margin:0 0 10px">${nativo()?'Aviso local, funciona com o app fechado.':'Só no app instalado (APK). No navegador o aviso não chega com o app fechado.'}</div>
    <div class="dias">${DIAS_C.map((d,i)=>`<button class="dia ${lembrete.dias.includes(i)?'on':''}" data-dia="${i}" aria-pressed="${lembrete.dias.includes(i)}">${d}</button>`).join('')}</div>
    <div class="field" style="margin:12px 0 0"><label>Horário do aviso</label><input type="time" id="remHora" value="${lembrete.hora||'19:00'}"></div>
  </div>
  <div class="card">
    <div class="hint" style="margin:0 0 14px">Seus dados ficam salvos apenas neste navegador (${matches.length} partida(s)). Um backup automático é guardado antes de qualquer exclusão.</div>
    <div class="grid g2">
      <button class="btn gold" id="xJson">⬇ Exportar JSON</button>
      <button class="btn ghost" id="xCsv">⬇ Exportar CSV</button>
    </div>
    <h3>Importar backup</h3>
    <input type="file" id="iFile" accept=".json,application/json">
    <div class="hint">Aceita arquivos JSON exportados por este app. As partidas importadas são somadas às atuais (sem duplicar) e o backup automático é guardado antes.</div>
    <h3>Atualização</h3>
    <div class="row sp" style="margin-bottom:10px"><span>Versão instalada</span><b style="color:var(--gold)">v${APP_VERSION}</b></div>
    <button class="btn ghost block" id="xUpd">🔄 Verificar atualização</button>
    <div class="hint" id="updMsg">Se o app parecer desatualizado, toque aqui. Suas partidas não são apagadas.</div>
    ${(!nativo()&&promptInstalar)?'<button class="btn ghost block" id="xInstall" style="margin-top:10px">📲 Instalar no celular</button>':''}
    <h3>Zona de risco</h3>
    <div class="hint" style="margin:0 0 10px">Backup automático: <b>${bk&&bk.em?fmtD(ymd(new Date(bk.em)))+' às '+hhmm(bk.em):'ainda não gerado'}</b>${bk?' · '+bk.partidas.length+' partida(s)':''}</div>
    <button class="btn ghost block" id="xSnap" style="margin-bottom:10px">💾 Gerar backup agora</button>
    <button class="btn ghost block" id="xRestore" style="margin-bottom:10px">↩ Restaurar backup automático</button>
    <button class="btn red block" id="xAll">Zerar tudo (histórico, agenda e placar)</button>
  </div>`;
}
function download(name,text,type){
  const Cap=window.Capacitor,P=Cap&&Cap.Plugins;
  if(Cap&&Cap.isNativePlatform&&Cap.isNativePlatform()&&P&&P.Filesystem&&P.Share){
    P.Filesystem.writeFile({path:name,data:text,directory:'CACHE',encoding:'utf8'})
      .then(r=>P.Share.share({title:name,url:r.uri,dialogTitle:'Salvar ou enviar backup'}))
      .catch(e=>{if(!/cancel/i.test(String(e&&e.message||e)))toast('Não foi possível exportar')});
    return;
  }
  const b=new Blob([text],{type});const a=document.createElement('a');
  a.href=URL.createObjectURL(b);a.download=name;document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500);
}
function exportJSON(){
  download('sinuca-backup-'+hoje()+'.json',JSON.stringify({app:'placar-sinuca',versao:2,exportadoEm:new Date().toISOString(),matches,agenda,placares,atual:cur},null,2),'application/json');
  toast('Backup JSON gerado');
}
function exportCSV(){
  const q=v=>'"'+String(v).replace(/"/g,'""')+'"';
  const rows=[['Data','Dia','Adversario','Tipo','Meus Sets','Sets Adversario','Resultado','Pontos p/ fechar set']];
  matches.filter(m=>!m.emAndamento).slice().sort(sortDesc).forEach(m=>{const r=resultado(m);rows.push([fmtD(m.date),DIAS[dow(m.date)],m.opp,TIPOS[m.tipo]?TIPOS[m.tipo].nome:m.tipo,m.setsMe,m.setsOp,r==='w'?'Vitoria':r==='l'?'Derrota':'Empate',m.meta||''])});
  download('sinuca-partidas-'+hoje()+'.csv','\uFEFF'+rows.map(r=>r.map(q).join(';')).join('\r\n'),'text/csv;charset=utf-8');
  toast('CSV gerado');
}
function importFile(file){
  const rd=new FileReader();
  rd.onload=()=>{
    try{
      const j=JSON.parse(rd.result);
      const arr=Array.isArray(j)?j:(Array.isArray(j.matches)?j.matches:null);
      if(!arr)throw 0;
      snapshot('antes de importar backup');
      const ids=new Set(matches.map(m=>m.id));let add=0;
      arr.forEach(x=>{
        const rec=C.sanitizarPartida(x,TIPOS);
        if(!rec||ids.has(rec.id))return;
        ids.add(rec.id);matches.push(rec);add++;
      });
      if(!Array.isArray(j)&&Array.isArray(j.placares)){
        const pids=new Set(placares.map(x=>x.id));
        j.placares.forEach(x=>{
          const rec=C.sanitizarPlacar(x,TIPOS);
          if(!rec||pids.has(rec.id))return;pids.add(rec.id);placares.push(rec);
        });
        savePL();
      }
      let addA=0;
      if(!Array.isArray(j)&&Array.isArray(j.agenda)){
        const aids=new Set(agenda.map(a=>a.id));
        j.agenda.forEach(x=>{
          const rec=C.sanitizarAgenda(x,TIPOS);
          if(!rec||aids.has(rec.id))return;aids.add(rec.id);agenda.push(rec);addA++;
        });
        saveA();
      }
      saveM();
      toast(add+' partida(s)'+(addA?' e '+addA+' agendamento(s)':'')+' importada(s)');
      render();
    }catch(e){toast('Arquivo inválido')}
  };
  rd.readAsText(file);
}

/* ======== Atualização ======== */
const {verNum,verMaior}=C;
async function recarregarLimpo(){
  try{const rs=await navigator.serviceWorker.getRegistrations();await Promise.all(rs.map(r=>r.unregister()))}catch(e){}
  try{const ks=await caches.keys();await Promise.all(ks.map(k=>caches.delete(k)))}catch(e){}
  location.href=location.pathname+'?atualizado='+Date.now();
}
async function verificarAtualizacao(){
  const msg=$('#updMsg'),btn=$('#xUpd');
  const say=t=>{if(msg)msg.textContent=t;else toast(t)};
  if(btn)btn.disabled=true;say('Verificando…');
  try{
    const r=await fetch(VER_URL+'?t='+Date.now(),{cache:'no-store'});
    if(!r.ok)throw 0;
    const j=await r.json();const nova=j.versao;
    if(nova&&verMaior(nova,APP_VERSION)){
      if(nativo()){
        say('Nova versão v'+nova+' disponível'+(j.nota?': '+j.nota:'')+'.');
        const ok=await confirmar('Nova versão v'+nova+' disponível.'+(j.nota?'\n'+j.nota:'')+'\n\nAbrir a página para baixar o novo APK?\n(Suas partidas continuam salvas ao instalar por cima.)',{titulo:'Atualizar',ok:'Abrir download'});
        if(ok)window.open(APK_URL,'_blank');
      }else{
        say('Atualizando para v'+nova+'…');
        await recarregarLimpo();return;
      }
    }else{
      say('Você já está na versão mais recente (v'+APP_VERSION+').');
      if(!nativo()){
        const ok=await confirmar('Você já está na versão mais recente.\n\nQuer recarregar o app limpando o cache?',{titulo:'Atualização',ok:'Recarregar'});
        if(ok)await recarregarLimpo();
      }
    }
  }catch(e){say('Não foi possível verificar. Confira a internet e tente de novo.')}
  if(btn)btn.disabled=false;
}

async function instalar(){
  if(!promptInstalar){toast('Use o menu do navegador → Instalar app');return}
  const p=promptInstalar;promptInstalar=null;
  try{p.prompt();await p.userChoice}catch(e){}
  render();
}

/* ======== Long-press para trocar adversário ======== */
let oppPressTimer=null, oppLongFired=false;
function clearOppPress(){if(oppPressTimer){clearTimeout(oppPressTimer);oppPressTimer=null}}
document.addEventListener('pointerdown',e=>{
  const el=e.target.closest('[data-pname]'); if(!el) return;
  const who=el.dataset.pname;
  oppLongFired=false;
  oppPressTimer=setTimeout(()=>{oppLongFired=true;if(cur){vib(25);openJog(who)}},500);
});
document.addEventListener('pointerup',clearOppPress);
document.addEventListener('pointercancel',clearOppPress);
document.addEventListener('pointerleave',clearOppPress);
document.addEventListener('contextmenu',e=>{if(e.target.closest('[data-pname]'))e.preventDefault()});
function openJog(who){
  pcWho=who;
  const nome=who==='me'?MEU_NOME:cur.opp;
  $('#modalRoot').innerHTML=`<div class="ov" id="ov"><div class="modal">
    <h2>${esc(nome)}</h2>
    ${who==='op'?`<div class="field"><label>Nome do adversário</label><input id="jNome" value="${esc(cur.opp)}" autocomplete="off"></div>`:''}
    <div id="pcBox">${pcRows()}</div>
    <button class="btn gold block" id="jOk" style="margin-top:6px">Pronto</button>
  </div></div>`;
  $('#ov').onclick=e=>{if(e.target.id==='ov')fechaJog()};
}
function fechaJog(){
  const n=$('#jNome');
  if(n&&cur){const v=n.value.trim();if(v&&v!==cur.opp){cur.opp=v;saveC()}}
  pcWho=null;closeMenu();render();
}

/* ======== Eventos globais ======== */
document.addEventListener('click',async e=>{
  if(oppLongFired){oppLongFired=false;e.stopPropagation();e.preventDefault();return}
  const t=e.target.closest('button,[data-opp],[data-act],[data-go],[data-calday]');if(!t)return;
  if(t.dataset.hmodo){histModo=t.dataset.hmodo;render();return}
  if(t.dataset.pldel){
    const p=placares.find(x=>x.id===t.dataset.pldel);
    const ok=await confirmar('Apagar este set do histórico?\n\nO resultado da partida é recalculado pelos sets que sobrarem.',{titulo:'Apagar set',ok:'Apagar',perigo:true});
    if(ok){
      snapshot('antes de apagar set');
      placares=placares.filter(x=>x.id!==t.dataset.pldel);savePL();
      if(p&&p.matchId){
        const m=matches.find(x=>x.id===p.matchId);
        if(m){
          const resto=placares.filter(x=>x.matchId===m.id);
          m.setsMe=resto.filter(x=>x.w==='me').length;
          m.setsOp=resto.filter(x=>x.w==='op').length;
          if(Array.isArray(m.sets))m.sets=m.sets.filter(x=>x.sid!==p.id);
          saveM();
        }
      }
      render();
    }
    return;
  }
  if(t.dataset.calday){calSel=t.dataset.calday;const d=parseD(calSel);calY=d.getFullYear();calM=d.getMonth();render();return}
  if(t.dataset.calnav!==undefined){const n=+t.dataset.calnav;if(n===0){const h=new Date();calY=h.getFullYear();calM=h.getMonth();calSel=hoje()}else{const d=new Date(calY,calM+n,1);calY=d.getFullYear();calM=d.getMonth()}render();return}
  if(t.dataset.agnew){openAg('new',t.dataset.agnew);return}
  if(t.dataset.agedit){openAg(t.dataset.agedit);return}
  if(t.dataset.agdel){delAg(t.dataset.agdel);return}
  if(t.dataset.agstart){startAg(t.dataset.agstart);return}
  if(t.dataset.agcal){const a=agenda.find(x=>x.id===t.dataset.agcal);if(a)window.open(gcalUrl(a),'_blank');return}
  if(t.dataset.conta){modoSets=t.dataset.conta==='set';try{localStorage.setItem(KEY_MC,t.dataset.conta)}catch(e){}render();return}
  if(t.dataset.pcor){const [w,h]=t.dataset.pcor.split('|');setPC(w,h);return}
  if(t.dataset.dia!==undefined){
    const d=+t.dataset.dia;
    lembrete.dias=lembrete.dias.includes(d)?lembrete.dias.filter(x=>x!==d):lembrete.dias.concat([d]).sort((a,b)=>a-b);
    save(KEY_REM,lembrete);
    if(lembrete.on)aplicarLembretes(true);
    render();return;
  }
  if(t.dataset.act){act(t.dataset.act,t.dataset.who);return}
  if(t.dataset.mact){act(t.dataset.mact,t.dataset.who);openMenu();return}
  if(t.dataset.go){closeMenu();tab=t.dataset.go;render();return}
  if(t.dataset.resume){resumeMatch(t.dataset.resume);return}
  if(t.dataset.share){const m=matches.find(x=>x.id===t.dataset.share);if(m)compartilhar(m);return}
  if(t.dataset.edit){openEdit(t.dataset.edit);return}
  if(t.dataset.del){delMatch(t.dataset.del);return}
  if(t.dataset.opp){F.opp=t.dataset.opp;render();return}
  switch(t.id){
    case 'jOk':fechaJog();break;
    case 'bUndo':undo();break;
    case 'bMenu':openMenu();break;
    case 'mUndo':undo();if(cur)openMenu();break;
    case 'mZero':{
      if(!cur||!(cur.me||cur.op)){toast('O set já está zerado');break}
      const ok=await confirmar('Zerar os pontos do set atual?',{titulo:'Zerar set',ok:'Zerar',perigo:true});
      if(ok){snap();cur.me=0;cur.op=0;saveC();closeMenu();render()}
      break;
    }
    case 'mSaveHist':saveInProgressToHistory();openMenu();break;
    case 'mCC':closeMenu();openCores();break;
    case 'mName':closeMenu();openJog('op');break;
    case 'mNew':closeMenu();setupAtivo=true;if(cur)setup.opp=cur.opp;tab='play';render();toast('Configure a nova partida');break;
    case 'mEnd':closeMenu();await endMatch();break;
    case 'mDrop':{
      const ok=await confirmar('Descartar esta partida sem salvar?\n\nOs sets dela também saem do histórico.',{titulo:'Descartar partida',ok:'Descartar',perigo:true});
      if(!ok)break;
      closeMenu();snapshot('antes de descartar');
      if(cur)removerSetsDaPartida(cur.id);
      cur=defaultCur();saveC();try{wake&&wake.release()}catch(e){}
      tab='play';setupAtivo=false;render();break;
    }
    case 'mClose':closeMenu();break;
    case 'xInstall':instalar();break;
    case 'xUpd':verificarAtualizacao();break;
    case 'xJson':exportJSON();break;
    case 'xCsv':exportCSV();break;
    case 'xSnap':snapshot('manual');toast('Backup automático atualizado');render();break;
    case 'xRestore':{
      const bk=lerBackup();
      if(!bk){toast('Nenhum backup encontrado');break}
      const quando=bk.em?fmtD(ymd(new Date(bk.em)))+' às '+hhmm(bk.em):'data desconhecida';
      const ok=await confirmar('Restaurar a cópia de '+quando+' ('+bk.partidas.length+' partida(s))?\n\nIsso substitui os dados atuais.',{titulo:'Restaurar backup',ok:'Restaurar',perigo:true});
      if(!ok)break;
      snapshot('antes de restaurar');
      matches=Array.isArray(bk.partidas)?bk.partidas:[];saveM();
      if(Array.isArray(bk.placares)){placares=bk.placares;savePL()}
      if(Array.isArray(bk.agenda)){agenda=bk.agenda;saveA()}
      if(bk.atual){cur=bk.atual;saveC()}
      limparOrfaos();
      toast('Backup restaurado');render();break;
    }
    case 'xAll':{
      const ok=await confirmar('Isso apaga o histórico ('+matches.length+' partida(s)), a agenda e o placar atual.\n\nUm backup automático é guardado antes, e você pode exportar um JSON depois.',{titulo:'Zerar tudo?',ok:'Apagar tudo',perigo:true});
      if(!ok)break;
      snapshot('antes de zerar tudo');
      matches=[];agenda=[];placares=[];saveM();saveA();savePL();
      cur=defaultCur();saveC();setupAtivo=false;
      toast('Tudo zerado. Boa sorte na terça!');render();break;
    }
  }
});
document.addEventListener('keydown',e=>{
  if(e.key!=='Enter'&&e.key!==' ')return;
  const el=e.target&&e.target.closest&&e.target.closest('[data-act="add"][tabindex]');
  if(el){e.preventDefault();act('add',el.dataset.who)}
});
document.addEventListener('input',e=>{const el=e.target;if(el&&el.dataset&&el.dataset.pcolor)setPC(el.dataset.pcolor,el.value,true)});
document.addEventListener('change',e=>{
  if(e.target.id==='iFile'&&e.target.files[0]){importFile(e.target.files[0]);e.target.value='';return}
  if(e.target.id==='remOn'){lembrete.on=e.target.checked;save(KEY_REM,lembrete);aplicarLembretes();return}
  if(e.target.id==='remHora'){lembrete.hora=e.target.value||'19:00';save(KEY_REM,lembrete);if(lembrete.on)aplicarLembretes(true);return}
});

window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();promptInstalar=e;if(tab==='data')render()});

$('#hv').textContent='v'+APP_VERSION;
$('#hv').onclick=()=>verificarAtualizacao();
applyTheme(loadTheme());
render();
if(cur&&!setupAtivo)keepAwake();
if(lembrete.on&&nativo())setTimeout(()=>aplicarLembretes(true),1200);
if('serviceWorker' in navigator&&location.protocol!=='file:'){window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}))}
})();
