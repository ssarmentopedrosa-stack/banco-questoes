#!/usr/bin/env python3
"""Inclui no src/questoes.json as 16 questões de Física do ENEM 2021 (2º dia, caderno 7 AZUL).

No export do banco elas estão com reviewRequired=true porque o texto veio de OCR (camada de texto do PDF corrompida)
e as alternativas estavam só em imagem. Aqui o enunciado e as alternativas foram transcritos e conferidos com o
recorte da página do PDF oficial do Inep (textos_conferidos.json). Alternativas gráficas (Q102, Q105, Q126)
continuam em imagem. Tabelas transcritas viram texto (o recorte da tabela sai das figuras).
Gabarito: o oficial do Inep que já está no export (gabarito.json) — conferido com 2021_GB_impresso_D2_CD7.
Resolução: a do branch explicacoes-chico (IA, aguardando revisão do professor), só se a letra bater com o gabarito.
Uso (depois de `npm run sync`):
  python3 scripts/fisica_2021/aplica_fisica_2021.py --ref origin/amplia-2009-2014 --explicacoes-ref origin/explicacoes-chico
Idempotente."""
import json, os, re, subprocess, sys
from collections import Counter
HERE = os.path.dirname(os.path.abspath(__file__)); APP = os.path.dirname(os.path.dirname(HERE)); REPO = os.path.dirname(APP)
arg = lambda k, d=None: sys.argv[sys.argv.index(k) + 1] if k in sys.argv else d
ref, eref = arg('--ref', 'origin/amplia-2009-2014'), arg('--explicacoes-ref', 'origin/explicacoes-chico')
show = lambda r, path: subprocess.check_output(['git', '-C', REPO, 'show', f'{r}:{path}'])
pub = json.loads(show(ref, 'export/desafio-enem/publico.json'))
gab = json.loads(show(ref, 'export/desafio-enem/gabarito.json'))['answers']
egab = json.loads(show(eref, 'export/desafio-enem/gabarito.json'))['answers']
gab, egab = (dict(x) if isinstance(x, list) else x for x in (gab, egab))
T = json.load(open(os.path.join(HERE, 'textos_conferidos.json'), encoding='utf-8'))
OFICIAL = json.load(open(os.path.join(HERE, 'gabarito_oficial_2021_d2.json')))
AREAS = {"MECANICA": "Mecânica", "TERMODINAMICA": "Termologia", "ONDAS": "Ondulatória", "OPTICA": "Óptica",
         "ELETROMAGNETISMO": "Eletricidade e Magnetismo", "FISICA_MODERNA": "Física Moderna"}
TABELA_TRANSCRITA = {'ENEM-CN-2021-REG-D2-C7-Q107', 'ENEM-CN-2021-REG-D2-C7-Q108', 'ENEM-CN-2021-REG-D2-C7-Q109', 'ENEM-CN-2021-REG-D2-C7-Q134'}
p = os.path.join(APP, 'src', 'questoes.json'); d = json.load(open(p, encoding='utf-8'))
d['questions'] = [q for q in d['questions'] if q['id'] not in T]
novas, sinal = [], []
for q in pub['questions']:
    t = T.get(q['id'])
    if not t: continue
    n = q['source']['number']; ans = gab[q['id']]['answer']
    assert ans == OFICIAL[str(n)], (q['id'], ans, OFICIAL[str(n)])
    figs = []
    for f in q['figures']:
        if f['kind'] == 'expressao': continue                       # fórmulas transcritas no texto
        if f['kind'] == 'alternativas' and t['options']: continue    # alternativas transcritas
        if f['kind'] == 'enunciado' and q['id'] in TABELA_TRANSCRITA: continue
        dst = os.path.join(APP, 'public' + f['src']); os.makedirs(os.path.dirname(dst), exist_ok=True)
        open(dst, 'wb').write(show(ref, 'public' + f['src']))
        figs.append({**f, 'src': '.' + f['src']})
    ex = (egab.get(q['id']) or {}).get('explanation'); expl = None
    if ex:
        m = re.findall(r'\*\*Por que ([A-E])\b', ex['markdown'])
        if m and m[-1] == ans:
            md = re.sub(r'\*\*Resolução \([^)]*\):\*\*', '**Resolução:**', ex['markdown'])  # cabeçalho padrão do parser
            expl = {'markdown': md, 'keyConcept': ex['keyConcept'], 'commonMistake': ex['commonMistake'],
                    'lowConfidence': bool(ex.get('needsReview')), 'author': ex['author'], 'reviewed': False}
        else: sinal.append(q['id'])
    else: sinal.append(q['id'])
    novas.append({'id': q['id'], 'year': 2021, 'area': AREAS.get(q['domain'], q['domain']), 'content': q['content'],
                  'demand': q['demand'], 'statement': t['statement'],
                  'options': [{'letter': L, 'text': s} for L, s in zip('ABCDE', t['options'])] if t['options'] else None,
                  'figures': figs, 'number': n, 'booklet': q['source']['booklet'], 'answer': ans, 'explanation': expl,
                  'textoDoPdf': True})
novas.sort(key=lambda q: q['number'])
i = max([k + 1 for k, q in enumerate(d['questions']) if q['year'] < 2021] or [0])
d['questions'][i:i] = novas  # mantém a ordem original das demais
m = d['meta']; qs = d['questions']
m['porAno'] = dict(sorted(Counter(str(q['year']) for q in qs).items()))
m['foraPorAno'] = {k: v for k, v in m.get('foraPorAno', {}).items() if k != '2021'}
if 'fisica2021' not in m and m.get('fora', {}).get('em revisão (flag)'): m['fora']['em revisão (flag)'] -= len(novas)
m['total'] = len(qs); m['porArea'] = dict(Counter(q['area'] for q in qs))
m['comExplicacao'] = sum(1 for q in qs if q.get('explanation'))
m['fisica2021'] = {'incluidas': len(novas), 'fonteTexto': 'transcrição conferida com o PDF oficial do Inep (scripts/fisica_2021)', 'semResolucao': sinal}
json.dump(d, open(p, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('Física 2021 incluídas:', len(novas), '| sem resolução (sinalizadas):', sinal, '| total:', len(qs))
