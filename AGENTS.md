# Placar de Sinuca — guia para agentes (OpenCode, Claude Code etc.)

App de placar e relatórios de sinuca/bilhar do Renato. **Idioma: português do Brasil** (textos da interface, commits e respostas).

## Arquitetura
- **Um único arquivo**: `index.html` com HTML, CSS e JavaScript embutidos. Sem build, sem framework, sem dependências no navegador.
- PWA: `manifest.webmanifest`, `sw.js` (rede primeiro, cache só como reserva offline), ícones `icon-*.png` e `icon.svg`.
- Dados 100% no `localStorage` do navegador (sem backend). Chaves:
  - `sinuca_partidas_v1` partidas · `sinuca_atual_v1` placar em andamento · `sinuca_backup_v1` / `sinuca_atual_backup_v1` cópias automáticas
  - `sinuca_placares_v1` placar e horário de cada set · `sinuca_agenda_v1` agendamentos
  - `sinuca_tema_v2` tema · `sinuca_cores_jog_v1` cores dos jogadores · `sinuca_contagem_v1` contar por partida/set
- APK Android: Capacitor (`capacitor.config.json`, `package.json`). O APK é só uma janela para o site publicado (`server.url`), então atualizar o site atualiza o app.
- Publicação: GitHub Pages (`https://rdouradovisciano-cyber.github.io/placar-sinuca/`) a partir da raiz da branch `main`. O workflow `.github/workflows/apk.yml` compila o APK a cada push e publica em Releases. A chave de assinatura fixa está em `signing/debug.keystore` (necessária para o APK instalar por cima do anterior).

## Regras de negócio
- Jogador "eu" = constante `MEU_NOME` ("Renato"). Adversário padrão: `OPP_DEFAULT`.
- Tipos de jogo em `TIPOS`: 3 Bolas (set fecha com 8 pontos), 5 Bolas (15), Livre (personalizado).
- Ao atingir a meta, o set fecha: zera os pontos, soma +1 set, registra em `cur.log` e em `placares` (com horário). Desfazer remove o placar do set.
- Dias de treino: terça, quarta, sexta e sábado (`JOGO=[2,3,5,6]`).
- Relatórios podem contar por partida ou por set (`modoSets`).

## Interface
- Tela do placar: tela cheia dividida (adversário em cima, eu embaixo), toque no cartão soma +1, botão redondo "−" tira 1, botões redondos ↶ e ⋯ nos cantos. Segurar o nome abre cor (e nome do adversário).
- Demais telas: tema claro e limpo (variáveis CSS em `:root`; temas em `PRESETS`). Barra de baixo: Placar, Histórico, Backup.
- Não usar cores fixas no CSS fora das variáveis, exceto na tela do placar.

## Ao fazer uma mudança
1. Edite `index.html`.
2. **Suba a versão** em três lugares: `APP_VERSION` em `index.html`, `version.json` e o nome do cache `CACHE` em `sw.js`.
3. Valide a sintaxe do script:
   `sed -n '/<script>/,/<\/script>/p' index.html | sed '1d;$d' > /tmp/chk.js && node --check /tmp/chk.js`
4. Teste no navegador (Playwright/Chromium funciona com `file://`), principalmente: somar pontos até fechar um set, desfazer, histórico, backup.
5. Faça commit e push na `main`. Não crie dependências nem etapa de build.

## Cuidados
- **Nunca apague ou migre dados do usuário sem confirmação**. O histórico dele já foi perdido uma vez ao trocar de origem do app.
- Ao mudar o formato dos dados, mantenha leitura compatível com o antigo e inclua o novo campo na exportação/importação de backup (JSON).
- Funções com `confirm()` são usadas de propósito (funcionam no WebView do Capacitor).
- Texto de interface sempre em português, com acentuação correta.
