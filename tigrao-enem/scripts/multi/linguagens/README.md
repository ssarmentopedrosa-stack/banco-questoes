# Linguagens (LC), ENEM 2009–2023

- `seg.py`: segmenta as provas oficiais. 2009–2016 vêm do 2º dia, caderno 7 azul (Q91/96–135); 2017+ vêm do 1º dia, caderno azul (Q6–45).
- `cand.py` gera `cand.json` com 605 questões de língua portuguesa, arte e EF. Critérios para entrar:
  - o gabarito do dataset tem de ser igual ao oficial do Inep;
  - texto com cobertura de pelo menos 90% em relação ao PDF;
  - figuras presentes.
  O resultado: 511 ok e 94 fora.
- `res/R_*.txt`: classificação de cada questão (M: pt|arte|ef), tema (T) e resolução da IA, não revisada.
- `portugues.py` gera `src/materias/portugues.json` e `resolucoes/por_01.txt`.
- Gabaritos 2009–2016 LC estão em `gab/gab_lc_2009_2016.json`, lidos dos PDFs oficiais com `le_gab_d2.py` e `le_gab_2010_d2.py`. As fontes estão em `lc_urls.tsv` e `lc_download_log.json`; ver também `lc_notas.txt`.

## Pendente
- Arte: 50 questões classificadas (M: arte), fora do banco.
- Educação Física: 49 questões (M: ef), fora do banco.
- Inglês e Espanhol: ainda não processados; os itens estão em pastas "N-ingles"/"N-espanhol" no enem.dev. O gabarito 2009–2016 já foi extraído.
- 2024–2025: fora do escopo da base.
