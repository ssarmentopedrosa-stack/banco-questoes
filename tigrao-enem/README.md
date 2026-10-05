# Banco do Tigrão · Física do ENEM

App gamificado (celular, sem login) com as questões oficiais de Física do ENEM deste repositório,
no mesmo formato do Banco Arretado, com o **Tigrão** como mascote.

- Vite + React 19 + TypeScript + Tailwind 4; progresso salvo no `localStorage` do aparelho.
- Dados: `src/questoes.json`, gerado por `scripts/sync_questoes.py` a partir de `export/desafio-enem/`.
  Snapshot atual: questões/gabaritos/figuras do branch do PR #9 (2009–2025) + resoluções do branch do PR #10.
  Depois que os PRs forem decididos, regenere com `npm run sync` (lê o export do branch atual).
- Entram só questões com **gabarito oficial** e sem flag de revisão; ficam de fora também as com alternativas
  truncadas ou ausentes. A resolução é a explicação escrita por IA (Chico), sempre marcada como
  "aguardando revisão do professor". Questões 2009–2014 ainda não têm resolução (o app mostra só o gabarito oficial).
- Arte do Tigrão: `public/tigrao/` são recortes da arte oficial `Tigrão.png` (a mesma do Missão Orbital e do Drive).

## Comandos
```
npm install
npm run dev        # http://localhost:5175
npm run build
node scripts/prints.mjs ../caminho/prints   # teste em largura de celular + prints (Playwright + Chrome)
```

## Jogo
XP só por acerto (+10; +5 extra no simulado), meta diária de 10 questões (+20 XP), sequência de dias,
6 níveis (Calouro do Cursinho → Aprovado em Medicina), 16 medalhas, missões semanais (renovam na segunda),
prática por tema, Mistão do dia (10), Simulado ENEM (15 questões, 45 min, proporção por tema, evita repetir
questões vistas na prática) e revisão espaçada dos erros (1, 3 e 7 dias).
