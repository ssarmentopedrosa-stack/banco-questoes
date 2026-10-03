# Figuras isoladas de 2021 (PR #7)

Pedido do Silas (03/10/2026). Antes, as 16 questões de Física de 2021 (caderno 7 azul, 2º dia) mostravam só o **recorte da questão inteira** (`kind = questao_integral`, `figures_status = recorte_integral_caderno_azul`), porque o texto vem de OCR (a camada de texto do PDF está corrompida) e as alternativas não estão transcritas.

## O que mudou

- `figures` passa a ter **figuras isoladas**: figura do enunciado, expressões em imagem e as **alternativas em imagem** (em 2021 elas não existem como texto). `figures_status = associada_caderno_azul`.
- O recorte da questão inteira **não foi apagado**. O arquivo foi renomeado para `{id}-integral-{k}.webp` e fica no campo novo `full_crops`. A ficha o exibe recolhido em “Ver a questão inteira (recorte do caderno, referência do texto)”, porque continua sendo a referência para conferir o OCR.
- A Q133 (fora do escopo de Física, revisão do Chico) continua como estava, com o recorte integral.
- Os textos, gabaritos e camadas pedagógicas não mudaram.

## Método

1. Página renderizada a 300 dpi (`pdftoppm -r 300`) do PDF oficial (sha256 `887b2a10…f540`).
2. As posições das palavras vêm do OCR (tesseract 5.5, `por`, saída TSV). As faixas com tinta fora das linhas de texto viraram candidatas a figura. As alternativas foram localizadas pelas linhas que começam com o marcador de alternativa (A–E).
3. Conferência visual em folhas de miniaturas, com as caixas desenhadas sobre a questão e depois os recortes finais lado a lado. Nos casos em que a detecção automática errou (tabela partida em faixas, linha de texto tomada como figura, rodapé da página dentro do recorte, alternativas gráficas em duas colunas), a caixa foi ajustada à mão.
4. A caixa final é aparada ao conteúdo, com 10 px de margem. As caixas e a origem de cada uma (`ocr` ou `manual`) estão em `artifacts/banco_fisica_enem/figuras_2021/plano_figuras_2021.json`. O script `isolar_figuras_2021.py --pdf <azul.pdf>` reproduz os recortes.

## Resultado: 32 recortes em 16 questões

| Questão | Recortes | Caixa |
|---|---|---|
| Q92 | figura (sino dos ventos) + alternativas | OCR |
| Q94 | figura (jogo Bang! Bang!) + alternativas | OCR |
| Q99 | figura (ilha de calor/brisa) + alternativas | OCR |
| Q100 | só alternativas (questão sem figura) | OCR |
| Q102 | figura (montagem das pilhas) + alternativas (circuitos) | manual (rodapé da página removido) |
| Q105 | figura (haltere no campo B) + alternativas (diagramas) | manual |
| Q107 | tabela + alternativas | tabela manual |
| Q108 | tabela dos planetas + alternativas | tabela manual |
| Q109 | tabela dos fios + alternativas | tabela manual |
| Q115 | 2 expressões (ΔQ/Δt; frações ½) + alternativas | expressões manuais |
| Q120 | espectro de absorção e cores complementares + alternativas | figura manual |
| Q125 | tirinha + alternativas | figura manual |
| Q126 | figura (bateria, lâmpadas, interruptor) + alternativas A–B + alternativas C–E | manual (as alternativas ocupam as duas colunas) |
| Q128 | só alternativas (questão sem figura) | OCR |
| Q131 | eletrocardiograma + alternativas | OCR |
| Q134 | tabela de correção + alternativas | tabela manual |

São 13 figuras do enunciado, 2 expressões e 17 recortes de alternativas.

**Nenhuma figura precisou voltar ao recorte inteiro.** Todas ficaram legíveis na conferência visual. Na Q126, o recorte integral antigo cortava a lâmpada AZUL da coluna da direita. Os recortes novos, feitos sobre a página inteira, mostram essa lâmpada completa.

## Testes

`scripts/banco-integrity.test.mjs`:
- `full_crops` precisa existir no disco, ter `kind = questao_integral`, usar o nome `-integral-k` e estar na página da questão. Os arquivos referenciados por `full_crops` contam para a regra de arquivo órfão.
- Nas questões de 2021 dentro do escopo: `figures_status = associada_caderno_azul`, nenhuma `questao_integral` em `figures`, pelo menos um recorte de alternativas e um `full_crops`.
- Na Q133 (fora do escopo), o recorte integral continua como antes.
- `withFig` continua 118.
