# Banco Inteligente de Questões de Física do ENEM

Grafo de conhecimento + banco pesquisável + sistema pedagógico (fundação).

Não é um dump de PDFs. Cada item carrega conteúdo, habilidade inferida, matemática, raciocínio, contexto, pré-requisitos, relações e estimativa de dificuldade.

## Como abrir
Abra no navegador:

`app/index.html`

Abas: Busca · Painel docente · Gerador de listas · Mapas · Fontes e limites.

## Números desta versão (v1.1)
- Anos no acervo processado: **2009–2023**
- Itens de Ciências da Natureza importados: **619**
- Itens classificados como Física (alta precisão automática): **140**
- Itens 2024, 2025, PPL e reaplicação: **não incorporados** (fonte estruturada ausente)
- TRI: **não estimado**

Distribuição Física (amostra classificada):
- Eletromagnetismo 53
- Mecânica 36
- Ondas 20
- Termodinâmica 12
- Óptica 9
- Física Moderna 8
- Ambiental/tecnológica 2

## Árvore do projeto
```
banco_fisica_enem/
├── app/index.html              # interface pesquisável
├── data/
│   ├── banco_fisica.json       # somente Física
│   ├── banco_cn_completo.json  # CN com classificação disciplinar
│   ├── indice_busca.json       # payload da UI
│   └── raw/                    # JSON brutos 91–135 (parcial)
├── taxonomy/
│   ├── taxonomia_fisica.json
│   └── matriz_enem_cn.json
├── schema/schema.sql
├── scripts/
│   ├── classificar_banco.py
│   ├── reclassificar.py
│   └── gerar_app.py
├── reports/estatisticas.json
└── docs/
    ├── ARQUITETURA.md
    ├── FASES_STATUS.md
    ├── VALIDACAO.md
    └── LIMITACOES.md
```

## Fontes
1. INEP — Provas e gabaritos  
   https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem/provas-e-gabaritos
2. INEP — Matriz de Referência do ENEM
3. INEP — Microdados (estrutura futura de TRI / incidência observada)
4. Acervo público enem-api (2009–2023), textos de atos oficiais

## Regras que este projeto cumpre
- Não inventa questão.
- Não apresenta enunciado modificado como original.
- Não inventa parâmetro de TRI.
- Não afirma habilidade oficial quando ela só foi inferida.
- Marca limitação quando o PDF oficial não foi parseado.

## Próximos passos recomendados
1. Revisar os 246 itens CN `indefinido` (muitos são só-imagem).
2. Ingerir PDFs oficiais 2024 e 2025.
3. Cruzar `ITENS_PROVA` dos microdados (quando o item for público) para habilidade/posição.
4. Validação humana conteúdo + gabarito por cor.
5. Ligar tentativas de alunos e só então estimar TRI.
