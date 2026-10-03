# Relatório de limitações

## Cobertura temporal
O pedido pedia ~15 anos. O acervo estruturado disponível e processado cobre **2009–2023** (15 edições).  
**2024 e 2025** existem no portal INEP em PDF, mas não foram extraídos item a item nesta entrega. Não foram inventados.

## Cobertura intra-ano
O dataset não tem 45 itens de CN em todos os anos (ex.: 2023 com 34 no acervo). Lacuna do dataset, não da prova oficial.

## Identificação de Física
Classificador automático com viés de precisão.  
140 Física é **subconjunto confiável**, não o censo de todas as questões de Física do período. A literatura de cursinhos costuma apontar ~12–15 itens de Física por prova regular; portanto há Física ainda dentro de `CN_indefinido` e, pontualmente, de Química.

## Caderno e cor
O identificador usa o índice do acervo, não a cor do caderno. Para aplicação formal, conferir o PDF da cor usada.

## Habilidades
Associação C6 / H20–H24 (e H1, H5, H21–H23) é **inferida pelo conteúdo**.  
`habilidade_status = inferido`.

## Dificuldade
Modelo pedagógico multidimensional. Sem microdados de acerto, a escala enviesa para Fácil/Média.  
Não confundir com parâmetro *b* da TRI.

## Imagens
Figuras apontam para URLs do enem.dev. Sem rede, a figura não carrega; o texto permanece.

## Direitos
Textos de provas oficiais são atos oficiais. A classificação pedagógica e o software deste repositório são camada analítica. Este projeto não é afiliado ao INEP/MEC.

## Ampliação R2.0 (ENEM 2020–2023)
- Só o caderno 7 AZUL de cada ano: sem casamento entre cores (`not_matched`).
- Os PDFs não puderam ser baixados do INEP neste ambiente. O de 2020 tem metadados de terceiro (fisica.net/iText).
- 2021: texto via OCR (camada de texto do PDF corrompida). Alternativas não transcritas: aparecem em imagem (recorte isolado das alternativas). A referência do texto é o recorte da questão inteira, guardado em `full_crops` e exibido recolhido na ficha. Ver `FIGURAS_2021_ISOLADAS.md`.
- Competência e habilidade das novas questões são **inferidas** (`matrix_status = INFERRED`). Classificação `CANDIDATE`/`PARTIAL`.
- Detalhes em `R2.0_AMPLIACAO_2020_2023.md`.

## Ampliação R2.1 (ENEM 2015–2019)
- Só o caderno azul de cada ano (2015–2016: 1º dia, caderno 1; 2017–2019: 2º dia, caderno 7). Não há casamento entre cores (`not_matched`).
- PDFs oficiais do INEP obtidos via cópias arquivadas no Wayback Machine, porque o portal falha por TLS neste ambiente. O SHA-256 está registrado.
- A classificação pedagógica e a habilidade da Matriz são **inferidas**. 28 questões estão em revisão: interface, alternativas em imagem e expressões com expoente ou fração perdidos.
- `banco.json` cresceu para cerca de 4,9 MB por causa das arestas candidatas.
- Detalhes em `R2.1_AMPLIACAO_2015_2019.md`.

## Revisão pedagógica do Chico (2020–2025)
- Feita por um bot de física (Chico Arretadim), com status `REVIEWED` e origem "revisado: Chico". **Não é validação humana do professor.**
- Nas 17 questões que eram de interface, as camadas pedagógicas seguem sem classificação e as questões continuam em revisão.
- O registro 2021-Q133 (Química) e os dois registros de duplicata ficam no JSON, mas fora da lista de Física. Os dois de duplicata estão ligados como variantes.
- Detalhes em `REVISAO_CHICO_2020_2025.md`.

## Revisão do Chico — lote 2015–2019
- O Chico revisou as 76 questões do lote. 9 de interface viraram interdisciplinares, a 2018-Q118 virou Física e a 2017-Q121 ficou fora do escopo, sem ser apagada.
- As 10 ex-interface seguem em revisão, porque as camadas pedagógicas não foram avaliadas.
- Questões sem marca de revisão continuam com classificação inferida ou de pipeline, não validada (ver `REVISAO_CHICO_2015_2019.md`).

## Ampliação R2.2 (ENEM 2009–2014)
- Só o caderno 1 azul do 1º dia (CN = Q1–45 em 2009 e Q46–90 em 2010–2014). Não há casamento entre cores (`not_matched`).
- PDFs oficiais do INEP obtidos via cópias arquivadas no Wayback Machine, com SHA-256 registrado. Em 2010, o gabarito foi lido dos círculos verdes da prova-gabarito do INEP. A prova de 2013 do INEP já vem com a resposta marcada, e a tinta verde foi tirada antes dos recortes.
- A classificação pedagógica e a habilidade da Matriz são **inferidas** e ainda não passaram pelo Chico nem pelo professor. 22 questões estão em revisão: 12 de interface e 10 com alternativas em imagem ou expressões.
- `banco.json` cresceu para cerca de 11 MB por causa das arestas candidatas.
- Detalhes em `R2.2_AMPLIACAO_2009_2014.md`.
