# Arquitetura — Banco Inteligente de Física do ENEM

## Princípio
Uma questão não é um texto isolado. É um nó em um grafo:

```
ANO → CONTEÚDO → SUBCONTEÚDO → CONCEITOS → FENÔMENO
    → COMPETÊNCIA → HABILIDADE → MATEMÁTICA → RACIOCÍNIO
    → DIFICULDADE → PRÉ-REQUISITOS → CONTEXTOS
    → QUESTÕES RELACIONADAS → DESEMPENHO → RECOMENDAÇÃO
```

## Camadas
1. **Ingestão** — provas oficiais (INEP) via acervo estruturado enem-api (2009–2023).
2. **Identificação disciplinar** — Física / Química / Biologia / indefinido, com confiança.
3. **Taxonomia** — 8 áreas, conteúdos, subconteúdos, conceitos, fenômenos.
4. **Multiclassificação** — conteúdo principal + secundários + pesos.
5. **Modelo de dificuldade** — 7+ dimensões → rótulo + score 0–100 (estimativa).
6. **Modelo cognitivo** — Bloom adaptado (N1–N6).
7. **Matriz ENEM** — C1–C8 e H1–H30; status `inferido` até validação humana.
8. **Grafo** — relações mesmo conteúdo / mesmo ano / complementar.
9. **Busca e listas** — filtros sobre todos os metadados.
10. **Analítica futura** — `student_attempts`, `student_mastery`, `item_tri`.

## Entidades
Ver `schema/schema.sql`:
QUESTIONS, OPTIONS, SOURCES, SKILLS, COMPETENCIES, TAGS,
PREREQUISITES, QUESTION_RELATIONS, ITEM_TRI,
STUDENTS, STUDENT_ATTEMPTS, STUDENT_MASTERY,
ASSESSMENTS, AUDIT_LOG.

## Identificador
`ENEM-FIS-{ANO}-DIA2-Q{NNN}`

O campo `cor` permanece `nao_especificada` nesta versão porque o acervo usado não distingue caderno. O número da questão é o índice do dataset (em geral alinhado ao caderno de referência do enem-api, não necessariamente ao caderno azul oficial).

## Segurança pedagógica
- Gabarito oculto por padrão na interface.
- Classificações versionadas (`classification_version`).
- TRI só entra com `TRI_STATUS = não estimado` até haver volume real de respostas.
- Não há exclusão automática de “duplicatas”; apenas estrutura para classificar similaridade.

## Integração futura (Plataforma de Física / Desafio ENEM)
- Importar `data/indice_busca.json` ou `data/banco_fisica.json`.
- Persistir tentativas em `student_attempts`.
- Recalibrar `difficulty_score` com taxa de acerto observada, sem apagar a estimativa original.

## Ampliação R2.0
Questões 2020–2023 entram como variantes isoladas do caderno azul (`ENEM-CN-{ano}-REG-D2-C7-Q{n}`), com estes campos extras:
- `source_batch`;
- `review_reasons`;
- `interface_note`;
- `variants[].text_source`.

Os recortes ficam em `public/figuras/{ano}/`, com os tipos `enunciado`, `alternativas`, `expressao` e `questao_integral`. Ver `R2.0_AMPLIACAO_2020_2023.md`. Em 2021 o recorte da questão inteira fica no campo `full_crops` (referência recolhida na ficha), e `figures` tem as figuras isoladas. Ver `FIGURAS_2021_ISOLADAS.md`.

## Ampliação R2.1
Questões 2015–2019 (`source_batch = "R2.1"`) seguem o mesmo modelo do R2.0. Os IDs são `ENEM-CN-{ano}-REG-D1-C1-Q{n}` em 2015–2016 (CN no 1º dia) e `ENEM-CN-{ano}-REG-D2-C7-Q{n}` em 2017–2019. As arestas têm `origin = "R2.1"`. Os recortes ficam em `public/figuras/{2015..2019}/`. Ver `R2.1_AMPLIACAO_2015_2019.md`.
