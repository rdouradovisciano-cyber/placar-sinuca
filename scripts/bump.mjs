import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('..', import.meta.url));
const [versao, ...resto] = process.argv.slice(2);
const nota = resto.join(' ').trim();

if (!/^\d+\.\d+\.\d+$/.test(versao || '')) {
  console.error('uso: npm run bump -- 2.3.0 "nota da versão"');
  process.exit(1);
}

const ler = f => fs.readFileSync(raiz + f, 'utf8');
const gravar = (f, t) => fs.writeFileSync(raiz + f, t);

// app.js
const app = ler('app.js').replace(/const APP_VERSION='[^']*';/, `const APP_VERSION='${versao}';`);
if (!/const APP_VERSION='[^']*';/.test(app)) throw new Error('APP_VERSION não encontrado em app.js');
gravar('app.js', app);

// version.json (lido pelo verificador de atualização)
gravar('version.json', JSON.stringify({ versao, nota }) + '\n');

// sw.js — cache novo a cada versão, senão o service worker serve o antigo
let sw = ler('sw.js');
const m = sw.match(/const CACHE = "sinuca-v(\d+)";/);
const n = m ? Number(m[1]) + 1 : 1;
sw = sw.replace(/const CACHE = "sinuca-v\d+";/, `const CACHE = "sinuca-v${n}";`);
gravar('sw.js', sw);

// package.json
const pkg = JSON.parse(ler('package.json'));
pkg.version = versao;
gravar('package.json', JSON.stringify(pkg, null, 2) + '\n');

console.log(`versão ${versao} aplicada em app.js, version.json, package.json e sw.js (cache v${n})`);
if (nota) console.log(`nota: ${nota}`);
