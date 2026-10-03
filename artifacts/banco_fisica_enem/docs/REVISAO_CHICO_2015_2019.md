# Revisão pedagógica do Chico — lote 2015–2019 (R2.1)

**Quem e quando:** Chico Arretadim, bot de física, em 03/10/2026. É uma **revisão pedagógica automatizada, não validação humana do professor.**

**Fonte:** `revisao_chico/revisao-2015-2019.csv` e `.md`, copiados sem alteração. São 76 decisões, que cobrem todas as questões do lote R2.1:
- grupo A: 11 de interface;
- grupo B: 17 sinalizadas por alternativas ou expressões;
- grupo C: 48 não sinalizadas.

**Script:** `revisao_chico/aplicar_revisao_2015_2019.py`. Roda depois de `aplicar_revisao.py`, é determinístico e não é idempotente.

A marcação é a mesma da revisão de 2020–2025 (ver `REVISAO_CHICO_2020_2025.md`): `pedagogical_review` com `status: "REVIEWED"`, `origin: "revisado: Chico"` e o grupo; `taxonomy_status` e `matrix_status` como `REVIEWED`; `discipline`. Nada passa a `CONFIRMED`.

## Aplicado
- **Interface (grupo A):**
  - 9 viraram interdisciplinares com domínio, conteúdo e habilidade. A `interface_note` foi mantida.
  - 2018-Q118 passou a **Física**, em TERMODINAMICA / DILATACAO_TERMICA, H17 (C5).
  - 2017-Q121 (Química, eletroquímica) ficou **fora do escopo** (`out_of_scope`, `domain = FORA_DO_ESCOPO`). O registro não foi apagado, mas sai das listas, do mapa, dos clusters e do desafio.
  - Novos valores: 2015-Q73 recebe o subconteúdo FISSAO_NUCLEAR, 2015-Q85 o conteúdo PROPAGACAO_RETILINEA (com H15/C4, habilidade de Biologia que o Chico escolheu) e 2019-Q98 o subconteúdo COR_ADITIVA.
- **Habilidades:**
  - 3 trocas: 2017-Q127 (H21 → H6, C2), 2015-Q79 (H21 → H18, C5) e 2019-Q94 (H21 → H3, C1).
  - As outras 62 foram confirmadas. Na 2017-Q101, o domínio OPTICA já tinha sido corrigido no commit anterior.
- **O que continua igual:**
  - Camadas pedagógicas das 10 que eram de interface: ficam **sem classificação**, porque o Chico não as avaliou e elas não foram inventadas. Por isso essas questões seguem com `review_required`.
  - Grupo B: as 17 seguem em revisão por alternativas em imagem, frações ou expoentes perdidos.
  - Grupo C: as 48 seguem sem `review_required`. As demais camadas continuam inferidas (R2.1, PARTIAL).
  - Nenhum enunciado foi reescrito.

## Vocabulário
- Entraram PROPAGACAO_RETILINEA (conteúdo de OPTICA) e COR_ADITIVA (subconteúdo de OPTICA / ESPECTRO_ELETROMAGNETICO).
- **NATUREZA_DA_LUZ** (OPTICA) foi criado na inferência do R2.1, para a 2019-Q135 (Huygens: modelos ondulatório × corpuscular). O Chico aceitou e o valor ficou documentado em `vocabulario_taxonomia.json`.

## Relações
Foram recalculados só os tipos que dependem dos campos alterados.
- 378 arestas pedagógicas removidas: todas de R2.1 ou REV-CHICO, de competência ou habilidade que mudaram.
- 902 arestas adicionadas, com `origin = REV-CHICO` e status CANDIDATE.
- Nenhuma aresta de aprendizagem foi alterada: as ex-interface não têm nível de preparação, e nenhum conteúdo de questão com relações mudou.

## Regra: sem marca de revisão = inferida, não validada
- Toda questão **sem** `pedagogical_review` mantém a classificação que veio do pipeline, sem revisão:
  - **R2.0, 32 questões:** `CANDIDATE`/`INFERRED`/`PARTIAL`, com o motivo "inferidas (R2.0), não validadas por professor";
  - **2024–2025, 28 questões:** `CONFIRMED` gerado pelo pipeline R1.x.
- **`CONFIRMED` do pipeline não é validação humana**, e `REVIEWED` também não. Nenhuma questão tem `validado = true`.
- A regra também está em `vocabulario_taxonomia.json` (`regra_status`) e é conferida no teste de integridade.
