# E1 — Explicações escritas por IA (Chico), 2015–2025

- 173 explicações (uma por questão visível de 2015–2025) no campo `explanation` de `public/banco.json`.
- Fonte: `artifacts/banco_fisica_enem/explicacoes_chico/explicacoes-2015-2025.jsonl`; aplicação: `python3 scripts/importa-explicacoes.py` (idempotente).
- **Não é validação do professor.** Todas ficam `status: aguardando_revisao_professor`, com o selo
  "Explicação escrita por IA (Chico) — aguardando revisão do professor" e a confiança (alta 153, média 14, baixa 6).
- Confiança baixa → `needs_review: true` ("precisa de revisão"): 2024 CAN-039, CAN-064, CAN-073; 2025 CAN-004, CAN-056, CAN-072.
- Enunciado, alternativas, gabarito e classificação não foram alterados (teste de integridade confere que o "Por que X" bate com o gabarito oficial onde ele existe).
- Desafio: a explicação vai só em `export/desafio-enem/gabarito.json` (servidor), nunca em `publico.json` (teste em `export.test.ts`). 171 entram no export (CAN-073/2024 e CAN-056/2025 não têm gabarito oficial e ficam fora do desafio).
- As `observacoes` internas do Chico **não** estão no repositório (ele é público) nem no app: o app não tem papel de professor. Pendência: definir onde guardá-las para acesso só do professor.
- As 91 questões de 2009–2014 (PR #9) ainda não têm explicação.
