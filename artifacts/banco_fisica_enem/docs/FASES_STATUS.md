# Status das fases

Convenção: IMPLEMENTADO | PARCIAL | PREPARADO | PENDENTE

## FASE 0 — Auditoria das fontes
STATUS: IMPLEMENTADO (com lacunas documentadas)
IMPLEMENTADO: portal INEP de provas/gabaritos; matriz de referência; acervo enem-api 2009–2023; microdados identificados como fonte futura.
PENDÊNCIAS: 2024, 2025, PPL, reaplicação, digital; caderno/cor oficial por item.
RISCOS: numeração do acervo ≠ caderno azul; imagens hospedadas em enem.dev.
VALIDAÇÕES: disciplina `ciencias-natureza` conferida no JSON de origem; gabarito importado do mesmo objeto.
PRÓXIMA: ingestão direta dos PDFs oficiais INEP para 2024–2025.

## FASE 1 — Identificação das questões de Física
STATUS: PARCIAL
IMPLEMENTADO: classificador léxico + regras fortes; 619 CN → 140 Física (precisão privilegiada).
PENDÊNCIAS: revisão humana dos 246 indefinidos (prováveis Física de enunciado visual).
RISCOS: falso negativo em item só-imagem; falso positivo residual.
VALIDAÇÕES: correção do falso positivo `ima` ⊂ enzima/clima.
PRÓXIMA: fila de validação pedagógica.

## FASE 2 — Taxonomia principal
STATUS: IMPLEMENTADO
Arquivo: `taxonomy/taxonomia_fisica.json` (8 áreas, conteúdos e subconteúdos).

## FASE 3 — Multiclassificação
STATUS: IMPLEMENTADO
Campos: conteudo_principal, conteudos_secundarios, peso_conteudos.

## FASE 4 — Dificuldade multidimensional
STATUS: IMPLEMENTADO (estimativa)
difficulty_score 0–100 + rótulo + dimensões.
PENDÊNCIA: calibração com microdados / respostas reais.
Observação: a distribuição atual enviesa para Fácil/Média — esperado sem TRI.

## FASE 5 — Modelo cognitivo
STATUS: IMPLEMENTADO
Bloom adaptado N1–N6 no campo complexidade_cognitiva.

## FASE 6 — Matriz do ENEM
STATUS: PARCIAL
Matriz C1–C8 / H1–H30 em `taxonomy/matriz_enem_cn.json`.
Habilidades associadas por conteúdo com `habilidade_status = inferido`.
Não inventamos códigos. Não afirmamos confirmação INEP.

## FASE 7 — Matemática necessária
STATUS: IMPLEMENTADO

## FASE 8 — Tipo de raciocínio
STATUS: IMPLEMENTADO

## FASE 9 — Contexto
STATUS: IMPLEMENTADO

## FASE 10 — Representações
STATUS: IMPLEMENTADO

## FASE 11 — Pré-requisitos
STATUS: IMPLEMENTADO (por conteúdo)

## FASE 12 — Relações entre questões
STATUS: PARCIAL
Relações automáticas por mesmo conteúdo (até 8 vizinhos).
PENDÊNCIA: similaridade semântica e estratégia de resolução.

## FASE 13 — Grafo de conhecimento
STATUS: PARCIAL
Estrutura área → conteúdo → questões implementada nos JSON e na UI de mapas.
PENDÊNCIA: visualização em grafo interativo.

## FASE 14 — Metadados completos
STATUS: IMPLEMENTADO
Schema alinhado ao contrato da Fase 14 + campos de auditoria.

## FASE 15 — Análise de distribuição
STATUS: IMPLEMENTADO
`reports/estatisticas.json` + painel docente.

## FASE 16 — Mapa de incidência
STATUS: IMPLEMENTADO (amostra classificada)

## FASE 17 — Mapa de pré-requisitos
STATUS: IMPLEMENTADO (árvore dos grandes campos)

## FASE 18 — Sistema de busca
STATUS: IMPLEMENTADO
`app/index.html` — busca textual + filtros de metadados.

## FASE 19 — Gerador de listas
STATUS: IMPLEMENTADO
Revisão, simulado, diagnóstica, formativa, recuperação, pré-ENEM + export JSON.

## FASE 20 — Sistema adaptativo
STATUS: PREPARADO
Tabelas student_* no schema. Sem dados reais de aluno nesta entrega.

## FASE 21 — Análise de desempenho
STATUS: PREPARADO
Mesma base. Sem misturar dificuldade estimada com observada.

## FASE 22 — TRI
STATUS: PREPARADO
`TRI_STATUS = não estimado` em todos os itens. Nenhum parâmetro a/b/c inventado.

## FASE 23 — Duplicatas
STATUS: PREPARADO
Campos previstos; rotina automática ainda não executada (acervo oficial tem pouca duplicata exata entre anos).

## FASE 24 — Validação
STATUS: PARCIAL
Fonte/ano/número/gabarito importados.
Classificação automática marcada `validado = false`.
Relatório em `docs/VALIDACAO.md`.

## FASE 25 — Arquitetura do banco
STATUS: IMPLEMENTADO
`schema/schema.sql`

## FASE 26 — Interface do professor
STATUS: IMPLEMENTADO (MVP)
Painel de totais, áreas, anos, habilidades, filtros, gerador.

## FASE 27 — Interface do aluno
STATUS: PREPARADO
A busca e o gerador já permitem “10 questões de Mecânica”; perfil de aluno ainda não persiste.

## FASE 28 — Recomendação inteligente
STATUS: PREPARADO
Relações + pré-requisitos + faixa de dificuldade prontos para motor futuro.

## FASE 29 — Segurança e integridade
STATUS: PREPARADO
audit_log no schema; gabarito oculto na UI; sem escrita de aluno no banco de itens.

## FASE 30 — Resultado final desta entrega
STATUS: PARCIAL — fundação verificável, não o banco “completo de 15 anos revisado à mão”.
Entregues: estrutura, esquema, taxonomia, classificação v1.1, mapas, busca, listas, painel, docs, limites.
Não entregue como concluído: 100% dos itens de Física 2009–2025 validados item a item, TRI, desempenho real.
