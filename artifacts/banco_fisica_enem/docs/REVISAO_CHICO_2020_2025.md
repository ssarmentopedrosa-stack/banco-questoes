# Revisão pedagógica do Chico (2020–2025)

**Quem:** Chico Arretadim, bot de física, em 03/10/2026. É uma **revisão pedagógica automatizada, não validação humana do professor.**

**Fonte:** `revisao_chico/revisao.csv` e `revisao.md`, copiados sem alteração. As decisões cobrem as 42 questões com `review_required = true` de 2020–2025. O lote R2.1 (2015–2019) foi revisado depois, em um commit à parte: ver `REVISAO_CHICO_2015_2019.md`.

**Base:** este branch parte de `amplia-2015-2019` (PR #6) para evitar conflito em `public/banco.json`, `public/oficial-view.json` e `scripts/banco-integrity.test.mjs`. O diff só fica limpo depois do merge do #6.

## Como fica marcado
- `pedagogical_review = { status: "REVIEWED", origin: "revisado: Chico", ... }` guarda a decisão, o domínio e a habilidade propostos, a justificativa e a habilidade alternativa.
- `taxonomy_status` e `matrix_status` passam a `REVIEWED`. Na interface, o selo aparece como "REVISADO: CHICO". **Não usamos `CONFIRMED`.**
- `discipline` assume `FISICA`, `INTERDISCIPLINAR` ou `NAO_FISICA`. Nas interdisciplinares, `interface_note` é mantida.
- `review_reasons` registra a revisão. Os motivos de dados (OCR, alternativas em imagem, expoentes, alternativas incompletas, casamento PROBABLE) continuam.
- Nas questões que eram de interface, as camadas pedagógicas (matemática, raciocínio, representação, pré-requisitos, Bloom, demanda, preparação) **não foram classificadas**. O Chico não as avaliou e elas não foram inventadas. Por isso essas questões seguem com `review_required`.

## Aplicado
- **41 revisadas como Física ou Interdisciplinar e 1 fora do escopo.**
  - 17 saíram de `INTERFACE_FISICA` (12 de 2020–2023 e 5 de 2024–2025) e ganharam domínio, conteúdo e habilidade.
  - Entre as 24 de Física do R2.0:
    - 22 tiveram a habilidade confirmada;
    - 2 trocaram de habilidade: 2020-Q107 (H20 → H17, C5) e 2021-Q128 (H23 → H5, C2);
    - 1 trocou de conteúdo: 2021-Q100 (CINEMATICA → DINAMICA). O subconteúdo QUEDA_LIVRE foi mantido.
- **2021-Q133 (Química):** fica `out_of_scope = true` e `domain = FORA_DO_ESCOPO`. O registro e o oficial-view continuam, mas a questão sai das listas, do mapa, dos clusters e do desafio. A ficha segue acessível pela URL, como as excluídas do R2.1, que estão documentadas e fora do conjunto.
- **Duplicatas ligadas como variantes.** O registro é mantido com `canonical_id` e não aparece na lista. A variante entra em `oficial-view[canônica].variants`.
  - `2024-REG-D2-C6-Q92` → `2024-D2-CAN-083`, como `confirmed`. Enunciado com similaridade de 0,90 frente ao caderno azul e mesmo gabarito (B).
  - `2025-REG-D2-C5-Q101` → `2025-D2-CAN-010`, como `probable`, porque o grupo da canônica já é PROBABLE. Similaridade de 0,94 e mesmo gabarito (A).
- **2024–2025:** `review_reasons` e `interface_note` preenchidos nas 5 questões.

## Correções de dados
- **CAN-025:** estava H24/C6, mas na Matriz oficial a H24 é da C7 (Química), e o texto gravado não era oficial. Passou para **H21 (C6)**, com o texto oficial. O conteúdo é lei de Coulomb/eletrostática. `matrix_status = INFERRED`, com o motivo registrado.
- **H22:** o `skill_text` foi trocado pelo texto oficial em 6 questões. Os novos H22 da revisão já entraram com o texto oficial.
- **Matriz oficial:** está em `matriz_cn_oficial.json`, extraída do PDF da Matriz que veio com a revisão. O teste confere código, competência e texto (ignorando espaços e hífens) de todas as questões.
  - Diferenças só tipográficas foram mantidas: "situações-problema" na C6 e "e(ou)" na H21.
- **FENOMENOS_ONDULATORIOS:** domínio único **ONDAS**. 2023-Q112 (difração) saiu de OPTICA; as outras 5 questões já estavam em ONDAS.
- **ESPECTRO_ELETROMAGNETICO:** apareceu o mesmo problema. Ficou com domínio único **OPTICA**, como nas outras 4 e na revisão do Chico. 2017-Q101 (R2.1, inferida) saiu de ONDAS.
- **Vocabulário:** `vocabulario_taxonomia.json` (domínio → conteúdo → subconteúdo) recebeu os valores novos `DILATACAO_TERMICA` (conteúdo de TERMODINAMICA) e `FISSAO_NUCLEAR` e `ENERGIA_NUCLEAR` (subconteúdos de FISICA_MODERNA/RADIOATIVIDADE).

## Relações
Só as relações que dependem dos campos alterados (domínio, conteúdo, subconteúdo, habilidade, competência) foram recalculadas. As arestas originais (R1.x) não foram tocadas.
- **Arestas pedagógicas:** 277 removidas (só de R2.0/R2.1, que ficaram incoerentes) e 1509 adicionadas, com `origin = REV-CHICO` e status CANDIDATE.
- **Arestas de aprendizagem:** 11 removidas (APPLICATION_PREPARATION da 2021-Q100 com questões de CINEMATICA) e 6 adicionadas. Sem ciclos.
- **Caminhos:** 41 removidos (os que usavam as arestas removidas) e 6 adicionados.
- **Limite:** as reclassificadas que eram de interface não têm nível de preparação. Por isso não receberam relações de aprendizagem nem de progressão, só as relações de conteúdo, domínio e Matriz.

## O que ficou de fora
- As camadas pedagógicas das 17 questões que eram de interface.
- As habilidades alternativas que o Chico citou: ficaram registradas em `pedagogical_review.skill_alternative`, mas não foram aplicadas.
- Enunciados e alternativas: nada foi reescrito ou inventado. OCR ruim e alternativas ausentes continuam marcados.
- O lote R2.1 (2015–2019) ficou de fora deste commit e foi revisado depois (`REVISAO_CHICO_2015_2019.md`).

## Duplicata 2024-C6-Q91 → CAN-053 (pedido do Silas, 03/10/2026)
- **Situação:** a `ENEM-CN-2024-REG-D2-C6-Q91` só existe no caderno cinza e não tinha figura (`nao_associada_variante_sem_caderno_azul`). O PR #2 já tinha apontado que ela é duplicata da azul Q131 (CAN-053).
- **Conferência:** o enunciado é 0,989 igual ao da azul (0,982–0,986 frente aos outros cadernos), com o mesmo gabarito (B) e a mesma classificação.
- **Vínculo:** feito como na Q92/CAN-083. O registro ganha `canonical_id`, `matching_status = confirmed` e `matching_origin`, e a variante entra em `oficial-view[CAN-053].variants`. A ficha passa a mostrar a figura da CAN-053.
- **Limpeza:** todas as 42 arestas de aprendizagem e as 338 pedagógicas da Q91 já existiam, iguais, na CAN-053. Foram removidas, junto com os 137 caminhos que passavam pela Q91. Entre elas havia 31 arestas de aprendizagem originais (7 CONFIRMED) e 87 pedagógicas originais; o teste foi ajustado.
- **Script:** `revisao_chico/aplicar_vinculo_q91.py`.
