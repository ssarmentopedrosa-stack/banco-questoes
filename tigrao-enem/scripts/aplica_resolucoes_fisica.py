"""Aplica em src/questoes.json as resoluções de Física 2009–2014 geradas por IA (NÃO revisadas pelo professor),
no mesmo padrão das matérias novas (scripts/multi/aplica_resolucoes.py): K: conceito + 3–6 frases + **Resposta: X**.
Só preenche questões SEM resolução; a letra final tem de ser igual ao gabarito oficial. Idempotente.
Rodar depois de `npm run sync` (sync_questoes.py regenera questoes.json)."""
import json, os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R = {}
for f in sorted(os.listdir(f'{ROOT}/scripts/resolucoes_fisica')):
    if f.endswith('.txt'):
        for blk in re.split(r'\n(?=@ENEM)', open(f'{ROOT}/scripts/resolucoes_fisica/{f}', encoding='utf-8').read().strip()):
            if blk.startswith('@'): R[blk.split('\n', 1)[0][1:].strip()] = blk
p = f'{ROOT}/src/questoes.json'; d = json.load(open(p, encoding='utf-8')); n = 0; erros = []
for q in d['questions']:
    b = R.get(q['id'])
    if not b or (q.get('explanation') and q['explanation'].get('author') != 'IA'): continue
    ls = b.split('\n')[1:]; k = ls[0][2:].strip() if ls[0].startswith('K:') else ''
    texto = '\n'.join(ls[1 if k else 0:]).strip()
    m = re.search(r'\*\*Resposta: ([A-E])\*\*\s*$', texto)
    if not m or m.group(1) != q['answer']: erros.append(q['id']); continue
    q['explanation'] = {'markdown': texto, 'keyConcept': k, 'commonMistake': '', 'lowConfidence': False, 'author': 'IA', 'reviewed': False}; n += 1
d['meta']['comExplicacao'] = sum(1 for q in d['questions'] if q.get('explanation'))
json.dump(d, open(p, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('aplicadas', n, '| sem resolução:', sum(1 for q in d['questions'] if not q.get('explanation')), '| ERROS', erros)
sys.exit(1 if erros else 0)
