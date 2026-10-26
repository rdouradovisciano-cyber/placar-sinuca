# Placar de Sinuca

Placar e relatórios de sinuca/bilhar, feito para usar com o celular apoiado na mesa.
É um PWA (site instalável + APK Android). Os dados ficam no próprio aparelho.

## Funcionalidades

- Partida ao vivo com placar em tela dividida (toque no lado do jogador = +1 ponto)
- Set, "melhor de N sets", encerramento com resumo e revanche
- Relatórios por período, tipo de jogo e adversário (contagem por partida ou por set)
- Histórico com edição, exclusão, retomada de partida em andamento e compartilhamento do placar como imagem
- Agenda de jogos com calendário e destaque dos dias de sinuca
- Backup automático antes de qualquer exclusão, além de exportar/importar JSON e CSV
- Temas de cores e cores por jogador
- Lembretes nos dias de jogo (no APK, com o app fechado)
- Funciona offline

## Estrutura

| Arquivo | O que é |
| --- | --- |
| `index.html` | marcação da tela |
| `styles.css` | estilos |
| `core.js` | funções puras (cálculos, filtros, datas, saneamento de importação) |
| `app.js` | o app: estado, telas e eventos |
| `sw.js` | service worker (rede primeiro, cache como reserva) |
| `manifest.webmanifest` | dados de instalação do PWA |
| `tests/` | testes automatizados |
| `scripts/bump.mjs` | troca a versão em todos os lugares de uma vez |

Sem build: é só abrir `index.html` ou publicar a pasta em qualquer host estático.
A ordem dos scripts importa: `core.js` antes de `app.js`.

## Desenvolvimento

```bash
npm install
npm test          # lógica pura + fluxo real num navegador simulado (jsdom)
```

Para testar no celular na mesma rede, rode um servidor na pasta e abra o IP indicado:

```bash
npx serve .        # ou python3 -m http.server 8081
```

`servidor.ps1` / `servidor2.ps1` fazem o mesmo no Windows, e `abrir-no-cel.html` mostra o QR code.

### Versão

A versão aparece num lugar só no código (`APP_VERSION` em `app.js`) e é replicada para o
`version.json` (usado pelo botão "Verificar atualização"), o `package.json` e o cache do
service worker:

```bash
npm run bump -- 2.3.1 "corrige o botão de desfazer"
```

O service worker é *network first*: com internet ele sempre pega a versão publicada; o cache
só serve para abrir offline.

## APK Android

O workflow `.github/workflows/apk.yml` roda a cada push na `main`:

1. instala dependências e roda os testes;
2. copia o site para `www/`, cria o projeto Android e sincroniza;
3. compila e publica o APK na release fixa `apk-latest`.

O `capacitor.config.json` **não** aponta para o site publicado: o APK carrega os arquivos
de dentro dele, então funciona sem internet. Quando há versão nova, o app avisa e abre a
página da release para baixar o APK.

### Assinatura

Sem configuração extra o APK sai assinado com a chave de debug **do próprio repositório**
(`signing/debug.keystore`), o que faz a versão nova instalar por cima da anterior sem
desinstalar — e sem perder o histórico salvo no aparelho. Essa chave **não** serve para a
Play Store.

Se você já tinha instalado um APK gerado antes dessa chave fixa, vai precisar desinstalar
**uma vez** (exporte o JSON antes, em Backup, e importe depois). Dali em diante as
atualizações entram por cima.

Para assinar de verdade, cadastre os segredos do repositório:

| Segredo | Conteúdo |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | keystore `.jks` em base64 (`base64 -w0 minha-chave.jks`) |
| `ANDROID_KEYSTORE_PASSWORD` | senha do keystore |
| `ANDROID_KEY_ALIAS` | alias da chave |
| `ANDROID_KEY_PASSWORD` | senha da chave |

Só com os **quatro** segredos preenchidos o workflow tenta a assinatura de release. Se faltar
algum, ou se o patch do Gradle falhar, ele avisa e compila em debug em vez de quebrar.

### Lembretes

Usam `@capacitor/local-notifications` (agendamento local, sem servidor). Precisam de
`npx cap sync` — o workflow já faz. No navegador não funcionam com o app fechado, e a tela
de Backup avisa isso.

## Publicação do PWA

O `firebase.json` publica a pasta atual, mas ignora `signing/`, `tests/`, `scripts/`,
`.github/`, `android/`, `www/`, `node_modules/` e arquivos de desenvolvimento — assim a
keystore de debug e os scripts locais não vão para o site.

```bash
firebase deploy --only hosting
```

## Para quem vai continuar o desenvolvimento
Veja `AGENTS.md` (arquitetura, regras e como publicar).
