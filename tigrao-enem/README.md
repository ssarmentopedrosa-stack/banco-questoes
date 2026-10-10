# Tigrão ENEM · Física, Biologia, Química e Geografia (questões oficiais)

## Matérias (out/2026)
- Tela inicial de **escolha de matéria**: Física (163), Biologia (215), Química (158), Geografia (200) e
  **Ciências da Natureza** (Física + Biologia + Química juntas, simulado misto 5/5/5 e 15/15/15).
- Cada matéria tem **progresso próprio** (XP, domínio, revisões, medalhas, simulados) em chaves separadas do
  `localStorage`. A de Física continua `tigrao-enem-fisica-v1` (quem já jogava não perde nada e cai direto na Física).
  Biologia/Química/Geografia/Natureza: `tigrao-enem-<matéria>-v1`. Matéria escolhida: `tigrao-enem-materia`.
- Biologia/Química/Geografia: `src/materias/*.json` + `public/figuras/<matéria>/`, gerados pelo pipeline em
  `scripts/multi/` (ver o README de lá). Gabarito oficial do Inep em todas; **sem resolução comentada ainda**;
  classificação de matéria/tema automática + manual, **a revisar pelo professor** (`scripts/multi/revisao_professor.csv`).
- Simulados das matérias novas: mesmo formato (15 q/45 min e 45 q/2h30), pesos proporcionais ao banco de cada tema.
- Backup: o código guarda a matéria; códigos antigos valem para Física; código de outra matéria é recusado.
- Testes: `node scripts/prints.mjs` (Física) e `node scripts/materias.mjs` (matérias novas + preservação da Física).

---

# Física

App gamificado (celular, sem login) com as questões oficiais de Física do ENEM deste repositório,
no mesmo formato do Banco Arretado, com o **Tigrão** como mascote.

- Vite + React 19 + TypeScript + Tailwind 4; progresso salvo no `localStorage` do aparelho.
- Dados: `src/questoes.json`, gerado por `scripts/sync_questoes.py` a partir de `export/desafio-enem/`.
  Snapshot atual: questões/gabaritos/figuras do branch do PR #9 (2009–2025) + resoluções do branch do PR #10.
  Depois que os PRs forem decididos, regenere com `npm run sync` (lê o export do branch atual).
- Entram só questões com **gabarito oficial** e sem flag de revisão; ficam de fora também as com alternativas
  truncadas ou ausentes. A resolução é a explicação escrita por IA (Chico), marcada como
  "aguardando revisão do professor" até ser revisada. Questões 2009–2014 ainda não têm resolução (o app mostra só o gabarito oficial).
- Arte do Tigrão: `public/tigrao/` são recortes da arte oficial `Tigrão.png` (a mesma do Missão Orbital e do Drive).

## Comandos
```
npm install
npm run dev        # http://localhost:5175
npm run build
node scripts/prints.mjs ../caminho/prints   # teste em largura de celular + prints (Playwright + Chrome)
```

## Jogo
- **XP só por acerto**: +10 (com 1 dica: 7; com 2 dicas: 5), +5 extra no simulado, +5 por **erro recuperado** na revisão
  espaçada (1, 3 e 7 dias). Erro = 0 XP. Meta diária de 10 questões (+20 XP), sequência de dias, 16 medalhas.
- **Níveis medem XP (treino), não nota**: Calouro → Vestibulando → Cientista da Natureza → Rumo aos 700 → Rumo aos 800 → Mestre do ENEM.
- **Modos**: Treino inteligente (até 3 revisões vencidas + 4 do tema mais fraco + 3 inéditas), Praticar por tema,
  Mistão do dia (10), Revisar erros, **Mini-simulado** (15 q, 45 min) e **Simulado ENEM** (45 q, 2h30; pesos
  Mecânica 13, Eletricidade 10, Ondulatória 8, Termologia 8, Óptica 4, Moderna 2). Nos simulados não há dica,
  e gabarito/resolução só aparecem no final, com relatório por tema (% de acertos, não é nota TRI).
- **Meu domínio**: % de acertos nas últimas 10 questões diferentes de cada tema (mínimo 3) e nas últimas 5 de cada subtema.
- **Missões da semana**: o foco é o tema mais fraco no início da semana.
- **Dica do Tigrão**: só trechos da resolução existente (conceito-chave e "Ideia central"). Sem resolução, sem dica.
- **Selo da resolução**: "Aguardando revisão do professor" para as de IA; "Revisada pelo Prof. Silas" quando o
  gabarito trouxer `reviewedByProfessor: true` (ou status `revisada_professor`).
- **Ajustes**: tamanho da letra (Normal/Grande/Maior), backup do progresso por código (`TGR1.` + deflate/base64url) ou
  arquivo, e importação com confirmação. Progresso antigo (v1) é migrado automaticamente e guardado em
  `tigrao-enem-fisica-v1-backup-v1`.
- **OCR**: `sync_questoes.py` corrige ligaduras partidas ("gráfi co"), expoentes de unidade (m/s², kg/m³, m s⁻², ×10⁻⁹)
  sem tocar em dados de tabela/figura; questões ilegíveis ficam em `ILEGIVEIS` (fora do app até revisão).
- Rodapé: "Questões oficiais do ENEM (Inep). App independente, sem vínculo com o Inep/MEC." e fonte em cada questão.
