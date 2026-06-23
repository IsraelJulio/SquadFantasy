# Esquadrão Imortal

Jogo casual de draft e simulação de uma copa, com identidade, atletas e seleções adversárias originais. O MVP roda inteiramente no navegador e salva campanhas em `localStorage`.

## Rodar localmente

Requer Node.js 20.19 ou superior.

```bash
npm install
npm run dev
```

Abra a URL exibida pelo Vite (normalmente `http://localhost:5173`).

## Validar

```bash
npm run lint
npm test
npm run build
```

## Fluxo do jogo

1. Clique em **Começar draft**.
2. Escolha um atleta em cada uma das 11 rodadas.
3. Defina formação e estilo de jogo.
4. Dispute três partidas na fase de grupos; são necessários quatro pontos para avançar.
5. Supere oitavas, quartas, semifinal e final. Uma derrota no mata-mata encerra a campanha.
6. Use **Ver minhas campanhas** para retomar um jogo salvo no navegador.

## Arquitetura

- `src/data`: seed local de 80 atletas fictícios e 12 adversários.
- `src/game`: regras puras de draft, elenco, simulação e torneio.
- `src/repository`: contrato de persistência local, isolado da UI.
- `src/components`: telas e componentes responsivos.
- `src/game/game.test.ts`: testes das regras essenciais.

Não há autenticação ou banco neste repositório. A camada de repositório foi separada para permitir uma futura troca por API e persistência PostgreSQL/Prisma sem levar regras de armazenamento para os componentes.
