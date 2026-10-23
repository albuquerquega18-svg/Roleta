# Roleta LabTour

Aplicação web de sorteios em português. Adicione nomes ou prêmios, gire a roleta e acompanhe os últimos 50 resultados. Todas as opções têm a mesma chance; entradas repetidas contam como participações separadas.

Use **Tela cheia** para mostrar apenas a roleta, o resultado e os controles do sorteio. Saia pelo botão **Sair da tela cheia** ou pela tecla **Esc**. Navegadores sem suporte à tela cheia nativa usam um modo de apresentação dentro da página. A lista e o histórico são mantidos ao alternar entre os modos.

Cada resultado novo dispara confetes no modo normal e em tela cheia. Os confetes não reaparecem ao recarregar a página ou alternar o modo de exibição e são desativados quando o navegador está configurado para movimento reduzido.

Ao girar, um rufar de tambores acelera até o resultado, seguido de uma fanfarra de comemoração. Os sons são sintetizados localmente com Web Audio, sem arquivos externos, e só começam depois de uma interação com o sorteador. O botão de alto-falante permite silenciar ou ativar o som, inclusive durante o giro; a preferência fica salva neste navegador. Ao ocultar a aba, o áudio é interrompido. Se o navegador não permitir áudio, o sorteio continua funcionando normalmente.

## Desenvolvimento

Requer Node.js 24 e npm. Não precisa de banco de dados, chaves ou variáveis de ambiente.

```sh
npm ci
npm run dev
```

O servidor de desenvolvimento usa a porta 5173. Os dados ficam apenas no `localStorage` do navegador; limpar os dados do site apaga a lista e o histórico. O aplicativo avisa quando não consegue salvar. O exemplo inicial usa seis nomes e pode ser substituído ou apagado.

## Verificação

```sh
npm test
npm run build
npm run preview
```

O build faz a checagem de TypeScript e gera os arquivos estáticos em `dist/`. O preview usa a porta 4173. Os testes verificam o sorteio sem viés, o alinhamento do ponteiro e a restauração dos dados. A animação respeita a preferência de movimento reduzido do navegador.

Para testar tela cheia, confetes e o modo móvel em Chromium:

```sh
npx playwright install chromium
npm run test:e2e
```

Se já tiver Chromium instalado, pode usar `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/caminho/do/chromium npm run test:e2e` sem baixar outro navegador. Os testes iniciam o servidor de desenvolvimento automaticamente quando necessário.

## Estrutura

- `src/App.tsx`: interface, giro, participantes e histórico.
- `src/roulette.ts`: seleção aleatória e validação dos dados locais.
- `src/Confetti.tsx`: celebração de novos resultados.
- `src/useWheelFullscreen.ts`: tela cheia, modo alternativo e navegação por teclado.
- `src/rouletteAudio.ts` e `src/useRouletteAudio.ts`: percussão, fanfarra e controle dos sons.
- `src/style.css`: layout responsivo.
- `tests/roulette.spec.ts`: testes de interação no navegador.

As fontes são distribuídas com a aplicação, sem serviços externos. O sorteio usa `crypto.getRandomValues`; rode em localhost ou em HTTPS. O projeto não tem contas, pagamentos ou sincronização entre dispositivos.

## Identidade visual

A logo em `public/labtour-logo.png` foi preparada com fundo transparente a partir da referência fornecida. Ela aparece no cabeçalho, rodapé e modo de tela cheia. A interface usa azul-marinho (`#0c2f5b`), turquesa (`#00b5ca`) e verde (`#42bd50`), com as variáveis de tema no início de `src/style.css`. A paleta da roleta e dos confetes fica em `src/roulette.ts`; os rótulos usam texto claro ou escuro conforme o setor.
