# Roleta

Aplicação web de sorteios em português. Adicione nomes ou prêmios, gire a roleta e acompanhe os últimos 50 resultados. Todas as opções têm a mesma chance; entradas repetidas contam como participações separadas.

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

## Estrutura

- `src/App.tsx`: interface, giro, participantes e histórico.
- `src/roulette.ts`: seleção aleatória e validação dos dados locais.
- `src/style.css`: layout responsivo.

As fontes são distribuídas com a aplicação, sem serviços externos. O sorteio usa `crypto.getRandomValues`; rode em localhost ou em HTTPS. O projeto não tem contas, pagamentos ou sincronização entre dispositivos.
