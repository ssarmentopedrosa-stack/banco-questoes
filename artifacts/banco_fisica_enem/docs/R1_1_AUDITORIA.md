# R1.1 — Auditoria do projeto atual
Data: 2026-09-23
Escopo: somente leitura da estrutura existente. Nenhuma ingestão 2024/2025 executada.

## STATUS
PARCIAL (fundação utilizável; pipeline oficial INEP/PDF inexistente)

## IMPLEMENTADO
- Banco JSON 2009–2023 (CN + recorte Física)
- Taxonomia e matriz ENEM em arquivos
- Schema SQL declarativo (não instanciado)
- UI estática com busca, filtros, listas, mapas
- Classificador léxico reutilizável
- Documentação de limites e validação

## BLOQUEADO PARA R1 (até existir pipeline novo)
- Download/hash de PDF oficial INEP
- Extração de página/questão/imagem a partir do caderno
- Caderno/cor/aplicação oficiais
- Variantes entre cores
- Banco relacional persistido
- Testes automatizados
- Audit log operacional
