# Placar de Sinuca — guia para agentes (OpenCode, Claude Code etc.)

App pessoal de placar e histórico de sinuca/bilhar do Renato. Idioma da interface e dos textos: **português do Brasil**.

## Visão geral
- **Um único arquivo** `index.html` com HTML, CSS e JavaScript (sem framework, sem build). Tudo roda no navegador.
- Dados só em `localStorage` (sem backend). Chaves principais:
  `sinuca_partidas_v1` (partidas), `sinuca_atual_v1` (placar em andamento), `sinuca_placares_v1` (cada set fechado, com horário),
  `sinuca_agenda_v1` (agendamentos), `sinuca_cores_jog_v1` (cores dos jogadores), `sinuca_tema_v2` (tema), `sinuca_contagem_v1` (contar por partida/set),
  mais cópias automáticas `sinuca_backup_v1` e `sinuca_atual_backup_v1`.
- PWA: `manifest.webmanifest` + `sw.js` (rede primeiro, cache só como reserva offline).
- Publicado no **GitHub Pages**: https://rdouradovisciano-cyber.github.io/placar-sinuca/
- APK Android via **Capacitor** (`capacitor.config.json`, `package.json`), compilado pelo GitHub Actions (`.github/workflows/apk.yml`).
  O APK carrega o site publicado (`server.url`), então atualizar o site atualiza o app sem reinstalar. A assinatura fixa está em `signing/debug.keystore`.

## Regras do jogo (não mudar sem pedir)
- **3 Bolas:** 1 ponto por bola; quem chega a **8** fecha o set, a pontuação zera e soma +1 set.
- **5 Bolas** (meta padrão 15) e **Livre** (meta padrão 10) têm meta configurável.
- O placar `Eu × adversário` é sempre do ponto de vista do Renato (constante `MEU_NOME`). O adversário padrão é `OPP_DEFAULT`.
- Dias de treino: terça, quarta, sexta e sábado (`JOGO=[2,3,5,6]`).

## Telas
- **Placar** (tela cheia dividida, adversário em cima/azul, Renato embaixo/vermelho): tocar na metade soma +1, botão redondo "−" tira 1, ↶ desfaz, ⋯ abre o menu. **Segurar o nome** abre a folha de cor (e do nome, no adversário).
- **Histórico:** abas *Sets* (cada set fechado com placar e horário) e *Partidas* (resultado final), com filtros, editar, apagar e registrar manualmente.
- **Backup:** exportar/importar JSON, CSV, tema, restaurar backup automático, verificar atualização, zerar tudo.
- **Relatórios** e **Calendário** existem no código, mas o acesso foi retirado da barra de baixo a pedido do usuário (Relatórios ainda abre pelo menu ⋯).

## Estilo visual
Tema **claro e limpo** por padrão (cartões brancos, destaque verde-azulado). Todas as cores vêm de variáveis CSS (`--bg`, `--panel`, `--gold` = cor de destaque, `--onacc`, `--txt`, `--mut`...), definidas por `applyTheme`. Use variáveis, nunca cores fixas, para os temas continuarem funcionando. A tela do placar é a exceção: fundo preto e cores dos jogadores.

## Como testar
- Sintaxe do JS: extraia o conteúdo da tag `<script>` principal e rode `node --check`.
- Teste de interface: Playwright (Chromium) abrindo `index.html` via `file://`, com viewport de celular (ex. 420×900). Durante a partida a barra de baixo fica escondida; navegue pelo menu ⋯.

## Ao fazer qualquer mudança (obrigatório)
1. Aumente `APP_VERSION` em `index.html`.
2. Atualize `version.json` (`versao` e `nota`) com o mesmo número. O botão "Verificar atualização" compara os dois.
3. Troque o nome do cache em `sw.js` (`const CACHE = "sinuca-vNN"`), senão o celular pode manter arquivos antigos.
4. Faça commit em `main`. O push dispara o GitHub Pages e o fluxo que gera o APK em Releases.

## Cuidados
- **Nunca apague dados do usuário** sem confirmação dupla; o histórico só existe no aparelho. Mudanças de formato precisam ser compatíveis com backups JSON antigos (veja `importFile`).
- Não troque `appId` (`com.sinuca.placar`) nem a chave de assinatura: o Android deixaria de instalar por cima.
- Mantenha tudo em um único `index.html` e sem dependências externas, para funcionar offline.
