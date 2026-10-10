# Pipeline multi-matéria (Biologia, Química, Geografia)

Gera `src/materias/{biologia,quimica,geografia}.json` e `public/figuras/<matéria>/`.
Física continua vindo de `scripts/sync_questoes.py` (sem mudança).

## Fontes
- **Texto/figuras 2009–2023:** enem.dev (github.com/yunger7/enem-api, GPL-2.0), caderno azul. Cada questão foi
  conferida palavra a palavra com o PDF oficial do Inep (+ OCR das imagens). Cobertura < 90% → fica de fora.
- **2024–2025 e reaproveitamentos:** texto transcrito do PDF oficial (só questões sem figura/tabela no trecho);
  marcadas com `textoDoPdf: true` e o app mostra "texto transcrito da prova oficial".
- **Gabaritos:** PDFs oficiais do Inep baixados via Wayback Machine com SHA-1 conferido (`gab/dl.py`,
  `gab/download_log*.json`) → `gab/gabaritos.json`. 2010 CN: leitura do gabarito oficial do pipeline de Física
  (`gab/fixture_cn_2009_2014.json`). Anuladas ficam de fora. Divergências enem.dev × Inep ficam de fora.
- **Área por número de questão** (não pela etiqueta do enem.dev): 2009 CN 1–45; 2010–2016 CN 46–90 / CH 1–45;
  2017+ CH 46–90 (dia 1) e CN 91–135 (dia 2). Física é separada usando o banco de Física já existente.

## Classificação
`classify.py` (palavras-chave) + rótulos manuais em `labels/` (`cn_overrides.json`, `ch_geografia.json` com os
ids de Geografia escolhidos à mão, `pdf_labels.json` para 2024–2025). Temas: `topics.py`. **Tudo isso precisa de
revisão do professor** → `revisao_professor.csv` lista cada questão com matéria/tema/gabarito.

## O que ficou de fora
`fora_do_banco.csv` / `relatorio_build.json` (motivo por questão).

## Rodar
Precisa de: clone do enem-api em `/workspace/tmp/enem-api`, PDFs das provas/gabaritos em `gab/`, venv com
`pymupdf pillow`, `tesseract-ocr` + `por`. Caminhos absolutos estão em `/workspace/enem_multi` (pasta de trabalho
original): `segment.py` → `ocr.py` → `build.py`.

## Resoluções
Nenhuma resolução foi gerada para as matérias novas (`explanation: null`): o app mostra só o gabarito oficial.
Se forem escritas por IA, ficam com `reviewed: false` (selo "aguardando revisão") até o Prof. Silas revisar.


## Correções de texto e resoluções (out/2026)
Depois de `build.py`, rodar nesta ordem (todos idempotentes):
1. `corrige_textos.py` — NFC em todas as matérias (inclusive Física), fórmulas/íons, quebras de linha, `**` quebrados,
   acentos conferidos com o PDF oficial, correções da auditoria. Contagem em `correcoes_log.json`.
2. `corrige_extra.py` — 2ª rodada de correções pontuais, figuras que eram só texto viram texto, remanejamentos
   (2018 Q116 e 2017 Q113 → Química; 2015 Q67 → Biologia). Log em `correcoes_extra_log.json`.
3. `aplica_resolucoes.py` — lê `resolucoes/*.txt` (resoluções geradas por IA, **não revisadas pelo professor**),
   confere a letra final com o gabarito oficial e grava `explanation` (`author: "IA"`, `reviewed: false`).
   Questões em que o raciocínio não chegou com segurança ao gabarito ficam em `resolucoes_sinalizadas.json` (só gabarito).
