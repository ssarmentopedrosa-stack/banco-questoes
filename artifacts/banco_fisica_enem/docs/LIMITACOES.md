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
- 2021: texto via OCR (camada de texto do PDF corrompida). Alternativas não transcritas; a referência é o recorte integral.
- Competência e habilidade das novas questões são **inferidas** (`matrix_status = INFERRED`). Classificação `CANDIDATE`/`PARTIAL`.
- Detalhes em `R2.0_AMPLIACAO_2020_2023.md`.

## Ampliação R2.1 (ENEM 2015–2019)
- Só o caderno azul de cada ano (2015–2016: 1º dia, caderno 1; 2017–2019: 2º dia, caderno 7). Não há casamento entre cores (`not_matched`).
- PDFs oficiais do INEP obtidos via cópias arquivadas no Wayback Machine, porque o portal falha por TLS neste ambiente. O SHA-256 está registrado.
- A classificação pedagógica e a habilidade da Matriz são **inferidas**. 28 questões estão em revisão: interface, alternativas em imagem e expressões com expoente ou fração perdidos.
- `banco.json` cresceu para cerca de 4,9 MB por causa das arestas candidatas.
- Detalhes em `R2.1_AMPLIACAO_2015_2019.md`.
