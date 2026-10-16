#!/usr/bin/env python3
"""Gera src/materias/<ingles|espanhol>.json (ENEM 2011–2023, LE, caderno azul) e resolucoes/<ing|esp>_01.txt.
Gabarito oficial Inep: 2011–2016 gab/gab_lc_2009_2016.json (2º dia); 2017–2023 gab/gab_le_2017_2023.json (1º dia, le_gab_d1.py).
Candidatas: cand_le.json (cand_le.py). Resoluções IA não revisadas: <lingua>.txt (ano-n|gabarito|tema|conceito ou !|texto)."""
import json, os, re, sys, unicodedata, collections
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); M = os.path.dirname(os.path.dirname(HERE)); APP = os.path.dirname(os.path.dirname(M))
BASE = '/workspace/tmp/enem-api/public'; MAT = sys.argv[1]; PREF = MAT[:3]
GL = json.load(open(f'{M}/gab/gab_lc_2009_2016.json')); GD = json.load(open(f'{M}/gab/gab_le_2017_2023.json'))
TEMAS = {'I': 'Interpretação e Gêneros Textuais', 'L': 'Literatura e Canção', 'C': 'Cultura e Sociedade', 'V': 'Vocabulário e Expressões'}
def gab(y, n): return GL[str(y)][MAT][str(n)] if y <= 2016 else GD[str(y)][MAT][str(n)]
def ident(y, n): return (f'ENEM-LC-{y}-REG-D2-C7-Q{n}' if y <= 2016 else f'ENEM-LC-{y}-REG-D1-C1-Q{n}') + '-' + MAT.upper()
def limpa(s):
    s = s or ''
    s = re.sub(r'\\([\-\*_\[\]\(\)#.+!>])', r'\1', s); s = re.sub(r'(?<![\w*])_([^_\n]+?)_(?![\w*])', r'\1', s)
    s = s.replace('**', ''); s = re.sub(r'[ \t]+\n', '\n', s); s = re.sub(r'\n{3,}', '\n\n', s)
    return unicodedata.normalize('NFC', s.strip())
def webp(src, rel):
    dst = f'{APP}/public/{rel}'; os.makedirs(os.path.dirname(dst), exist_ok=True)
    im = Image.open(src); im = im if im.mode in ('RGB', 'RGBA', 'L') else im.convert('RGBA'); im.save(dst, 'WEBP', quality=90, method=6); return im
R = {}
for l in open(f'{HERE}/{MAT}.txt', encoding='utf-8'):
    k, g, t, kk, txt = l.rstrip('\n').split('|', 4); R[k] = (g, t, kk, txt)
out, res = [], []
for r in json.load(open(f'{HERE}/cand_le.json')):
    if r['lingua'] != MAT or 'fora' in r: continue
    y, n = r['ano'], r['n']; k = f'{y}-{n}'; g, t, kk, txt = R[k]
    qdir = f'{BASE}/{y}/questions/{n}-{MAT}'; q = json.load(open(f'{qdir}/details.json'))
    of = gab(y, n); assert q['correctAlternative'] == of == g, k
    id_ = ident(y, n); figs = []
    def repl(mm):
        i = len(figs); rel = f'figuras/{MAT}/{y}/{id_}-{i + 1}.webp'; im = webp(os.path.join(qdir, mm.group(1).rsplit('/', 1)[1]), rel)
        figs.append({'src': './' + rel, 'kind': 'enunciado', 'label': f'Figura {i + 1}', 'width': im.size[0], 'height': im.size[1]}); return f'\n[[FIG {i}]]\n'
    st = limpa(re.sub(r'!\[[^\]]*\]\(([^)]*)\)', repl, q['context'] or '') + '\n\n' + (q['alternativesIntroduction'] or ''))
    opts = [{'letter': a['letter'], 'text': limpa(a['text'])} for a in q['alternatives']]
    for a, o in zip(q['alternatives'], opts):
        if a.get('file') and not o['text']:
            rel = f'figuras/{MAT}/{y}/{id_}-alt{a["letter"]}.webp'; webp(os.path.join(qdir, a['file'].rsplit('/', 1)[1]), rel); o['image'] = './' + rel
    out.append({'id': id_, 'year': y, 'area': TEMAS[t], 'content': None, 'demand': None, 'statement': st, 'options': opts, 'figures': figs,
                'number': n, 'booklet': 7 if y <= 2016 else 1, 'answer': of, 'explanation': None})
    res.append(f'@{id_}\n' + ('!\nR: ' + txt if kk == '!' else f'K: {kk}\n{txt}'))
out.sort(key=lambda x: (x['year'], x['number']))
meta = {'materia': MAT, 'fonteTexto': 'enem.dev (github.com/yunger7/enem-api, GPL-2.0), caderno azul; texto conferido com o PDF oficial do Inep',
        'fonteGabarito': 'Gabaritos oficiais do Inep (caderno azul); 2011–2016: gab/gab_lc_2009_2016.json; 2017–2023: gab/gab_le_2017_2023.json',
        'porAno': dict(sorted(collections.Counter(str(x['year']) for x in out).items())), 'total': len(out), 'fora': {},
        'porArea': dict(collections.Counter(x['area'] for x in out).most_common()), 'doPdfOficial': 0, 'comExplicacao': 0, 'revisadas': 0,
        'classificacao': 'tema atribuído manualmente pelo agente, a conferir pelo professor (linguagens/le/)'}
json.dump({'meta': meta, 'questions': out}, open(f'{APP}/src/materias/{MAT}.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
open(f'{M}/resolucoes/{PREF}_01.txt', 'w', encoding='utf-8').write('\n\n'.join(res) + '\n')
print(MAT, len(out), meta['porAno'], meta['porArea'])
