# Ciências Humanas sem Geografia (História, Filosofia, Sociologia)

ENEM 2009–2023, caderno azul do 1º dia (CH). Só entram questões oficiais com o gabarito oficial do Inep.

1. `seg.py`: segmenta os PDFs oficiais (`gab/urls_d1_ch_2009_2023.tsv`, `gab/download_d1_notas.txt`) por questão.
2. `cand.py` gera `candidatas.json` com todas as questões de CH que não são de Geografia. Fica fora a questão em que:
   - o gabarito do enem.dev ≠ gabarito oficial;
   - faltam alternativas ou figuras;
   - a cobertura das palavras do PDF é < 90% ("texto incompleto"; em geral é texto dentro de imagem, e não há OCR);
   - o PDF tem < 8 palavras legíveis ("texto não conferível"; é o caso de 2021, que tem a camada de texto corrompida).
3. `cls.py`/`auto.py` + revisão manual: `labels/ch_humanas.json` (matéria e lista de duvidosas).
4. `historia.py`: gera `src/materias/historia.json` e `relatorio_historia.json`.
5. Resoluções: `resolucoes/his_01.txt` → `python3 scripts/multi/aplica_resolucoes.py`.
   - Feitas por IA, **não revisadas**; a letra final é conferida com o gabarito oficial.
   - Bloco `!` = resolução sinalizada (o app mostra só o gabarito).

Revisão do professor: `scripts/multi/revisao_professor_humanas.csv`.

Pendentes:
- Filosofia e Sociologia: a classificação está pronta, mas a matéria ainda não foi criada.
- 2024–2025: ainda não estão no enem.dev; precisam de transcrição do PDF.
