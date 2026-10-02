# Relatório de validação — v1.1

## O que foi validado automaticamente
| Checagem | Resultado |
|---|---|
| Fonte do enunciado | acervo enem-api (textos de provas oficiais) |
| Disciplina de origem | somente `ciencias-natureza` |
| Gabarito | campo `correctAlternative` do mesmo objeto |
| Ano / índice | copiados sem alteração |
| Enunciado alterado? | não |
| Questão inventada? | não |
| Parâmetro TRI inventado? | não |
| Código de habilidade inventado? | não (usa H1–H24 oficiais; associação inferida) |

## O que NÃO está validado
- Pertinência Física vs Química vs Biologia em revisão humana item a item.
- Caderno/cor oficial (azul, amarela, branca, cinza).
- Numeração idêntica à do caderno que o professor tiver em PDF.
- Habilidade oficial atribuída pelo INEP àquele item (quando existir em microdados de itens).
- Dificuldade observada (taxa de acerto nacional).

## Regras de prontidão
Um item só deve ser marcado `VALIDADO = true` quando:
1. fonte conferida no PDF INEP do ano;
2. número e gabarito conferidos no gabarito da mesma cor;
3. disciplina Física confirmada por professor;
4. conteúdo e habilidade revisados;
5. relações e duplicidade revisadas.

Nesta entrega, **todos** os itens estão `validado = false`.

## Amostra de controle interno
- Falso positivo grave corrigido: padrão `ima` classificava enzima/clima/estima como Magnetismo.
- Após o ajuste: 140 Física / 619 CN.
- Eletrodinâmica continua o conteúdo mais frequente, coerente com incidências publicadas (sem ser prova de cobertura total).

## Ampliação R2.0 (2020–2023)
`scripts/banco-integrity.test.mjs` verifica:
- 102 questões, com contagem por ano;
- gabarito oficial idêntico ao fixture (anulada fora);
- OCR de 2021 sinalizado;
- figuras existentes e sem órfãos;
- arestas originais intactas;
- arestas novas `CANDIDATE` e sem ciclos por tipo.

Nenhuma questão nova está `validado = true`.
