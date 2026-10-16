# Pipeline de Matemática (2º dia, caderno 7 azul, questões 136–180)

Gera `src/materias/matematica.json` e `public/figuras/matematica/`. Mesmas regras das outras matérias:
**nunca inventa questão, alternativa nem gabarito**; na dúvida, a questão fica de fora (motivo em
`relatorio_build_matematica.json` e em `../fora_do_banco.csv`).

## Fontes
- **Provas e gabaritos oficiais do Inep** (2º dia, caderno 7 azul), baixados de cópias do Wayback Machine com SHA-1
  conferido no CDX (`dl.py`, `urls_d2.tsv`, `download_log_d2*.json`). 2011: a 1ª cópia da prova estava truncada; usada
  `dia2_caderno7_azul.pdf`.
- **Gabarito** (`gab_mt.json`): `gabparse.py` lê os PDFs de gabarito (2009: coluna Azul do PDF com as 4 cores).
  2010 não tem PDF de gabarito em texto: `g2010.py` lê os círculos do gabarito marcado pelo Inep em `AZUL_Domingo_GAB.pdf`
  (posição do marcador entre as 5 bolinhas A–E); a Q138 foi conferida visualmente (E).
  Conferência cruzada: o gabarito do enem.dev bate com o do Inep em 659 das 670 questões presentes (2009–2023); as 11
  diferenças são 5 anuladas pelo Inep e 6 divergências reais (2010 Q139, 2012 Q165, 2021 Q139/Q145/Q152, 2022 Q143), todas fora.
- **Texto/figuras 2009–2023:** enem.dev (github.com/yunger7/enem-api, GPL-2.0), conferido com o texto do PDF oficial
  (cobertura de palavras ≥ 90%, com OCR das figuras do dataset).
- **2024–2025 (e fallback):** transcrição do PDF oficial só para questões de texto puro (sem figura, tabela, expoente,
  fração, fonte codificada); marcadas `textoDoPdf: true`. Todas as transcritas foram lidas pelo agente e as com perda
  de notação foram rejeitadas (`revisao_pdf_manual.json`).

## Filtros extras de Matemática
- expoentes/índices: se o PDF oficial tem sobrescrito/subscrito no trecho e o texto do dataset não traz, fica fora;
- marcação quebrada no dataset (`\u200b`, LaTeX solto, `^`) fica fora.

## Temas
`build_mt.py` (palavras-chave), 6 temas. **A revisar pelo professor** em `revisao_professor_matematica.csv`
(também em `../revisao_professor.csv`).

## Rodar (pasta de trabalho W com `enem-api/`, `pdf/`, `seg/`, `ocr/`)
```
python3 dl.py urls_d2.tsv download_log_d2.json        # em W/pdf
python3 gabparse.py && python g2010.py                # gab_mt.json
python segment_mt.py && python3 ocr_mt.py              # seg/ e ocr/ (pymupdf, tesseract-ocr + por)
python build_mt.py <tigrao-enem> W
python3 csv_mt.py <tigrao-enem> && python3 check_mt.py <tigrao-enem>
```
