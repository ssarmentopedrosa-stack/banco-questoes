#!/usr/bin/env python3
"""Gera src/materias/portugues.json (Português e Literatura, ENEM 2009–2023, LC, caderno azul).
Fontes: texto/figuras enem.dev (yunger7/enem-api, GPL-2.0) em /workspace/tmp/enem-api; gabarito oficial Inep
(2009–2016: gab/gab_lc_2009_2016.json, PDFs do 2º dia; 2017+: gab/gabaritos.json). Candidatas: cand.json (cand.py);
matéria/tema/resolução: res/R_*.txt (M: pt|arte|ef). Gera também resolucoes/por_01.txt."""
import json, os, re, glob, unicodedata, collections
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); M = os.path.dirname(HERE); APP = os.path.dirname(os.path.dirname(M))
BASE = '/workspace/tmp/enem-api/public'; MAT = 'portugues'
G = json.load(open(f'{M}/gab/gabaritos.json')); GL = json.load(open(f'{M}/gab/gab_lc_2009_2016.json'))
TEMAS = {'G': 'Interpretação e Gêneros Textuais', 'L': 'Literatura', 'N': 'Gramática e Norma-Padrão', 'V': 'Variação Linguística',
         'F': 'Funções da Linguagem e Figuras', 'M': 'Linguagem, Mídia e Tecnologia'}
def gab(y, n): return GL[str(y)]['pt'][str(n)] if int(y) <= 2016 else G[str(y)][str(n)]
def ident(y, n): return f'ENEM-LC-{y}-REG-D2-C7-Q{n}' if int(y) <= 2016 else f'ENEM-LC-{y}-REG-D1-C1-Q{n}'
def limpa(s):
    s = s or ''
    s = re.sub(r'\\([\-\*_\[\]\(\)#.+!>])', r'\1', s); s = re.sub(r'(?<![\w*])_([^_\n]+?)_(?![\w*])', r'\1', s)
    s = s.replace('**', ''); s = re.sub(r'[ \t]+\n', '\n', s); s = re.sub(r'\n{3,}', '\n\n', s)
    return unicodedata.normalize('NFC', s.strip())
B = {}
for f in sorted(glob.glob(f'{HERE}/res/R_*.txt')):
    for blk in re.split(r'\n(?=@\d{4}-\d+)', open(f, encoding='utf-8').read().strip()):
        h, *L = blk.split('\n'); d = {'linhas': []}
        for l in L:
            if re.match(r'^[MT]: ', l): d[l[0]] = l[3:].strip()
            else: d['linhas'].append(l)
        B[h[1:].strip()] = d
def main():
    out, res, lab = [], [], {}
    for r in json.load(open(f'{HERE}/cand.json')):
        y, n = int(r['ano']), int(r['n']); k = f'{y}-{n}'
        if 'fora' in r: continue
        b = B[k]; lab[k] = b['M']
        if b['M'] != 'pt': continue
        qdir = f'{BASE}/{y}/questions/{n}'; q = json.load(open(f'{qdir}/details.json'))
        of = gab(y, n); assert q['correctAlternative'] == of, k
        id_ = ident(y, n); figs = []
        def repl(mm):
            src = os.path.join(qdir, mm.group(1).rsplit('/', 1)[1]); i = len(figs)
            rel = f'figuras/{MAT}/{y}/{id_}-{i + 1}.webp'; dst = f'{APP}/public/{rel}'; os.makedirs(os.path.dirname(dst), exist_ok=True)
            im = Image.open(src); im = im if im.mode in ('RGB', 'RGBA', 'L') else im.convert('RGBA'); im.save(dst, 'WEBP', quality=90, method=6)
            figs.append({'src': './' + rel, 'kind': 'enunciado', 'label': f'Figura {i + 1}', 'width': im.size[0], 'height': im.size[1]})
            return f'\n[[FIG {i}]]\n'
        st = limpa(re.sub(r'!\[[^\]]*\]\(([^)]*)\)', repl, q['context'] or '') + '\n\n' + (q['alternativesIntroduction'] or ''))
        opts = [{'letter': a['letter'], 'text': limpa(a['text'])} for a in q['alternatives']]
        for a, o in zip(q['alternatives'], opts):
            if a.get('file') and not o['text']:
                src = os.path.join(qdir, a['file'].rsplit('/', 1)[1]); rel = f'figuras/{MAT}/{y}/{id_}-alt{a["letter"]}.webp'
                os.makedirs(os.path.dirname(f'{APP}/public/{rel}'), exist_ok=True)
                im = Image.open(src); im = im if im.mode in ('RGB', 'RGBA', 'L') else im.convert('RGBA'); im.save(f'{APP}/public/{rel}', 'WEBP', quality=90, method=6); o['image'] = './' + rel
        out.append({'id': id_, 'year': y, 'area': TEMAS[b.get('T', 'G')], 'content': None, 'demand': None, 'statement': st, 'options': opts,
                    'figures': figs, 'number': n, 'booklet': 7 if y <= 2016 else 1, 'answer': of, 'explanation': None})
        res.append(f'@{id_}\n' + '\n'.join(b['linhas']).strip())
    out.sort(key=lambda x: (x['year'], x['number']))
    meta = {'materia': MAT, 'fonteTexto': 'enem.dev (github.com/yunger7/enem-api, GPL-2.0), caderno azul; texto conferido com o PDF oficial do Inep',
            'fonteGabarito': 'Gabaritos oficiais do Inep (caderno azul); 2009–2016 LC: PDFs do 2º dia (gab/gab_lc_2009_2016.json); 2017+: gab/gabaritos.json',
            'porAno': dict(sorted(collections.Counter(str(x['year']) for x in out).items())), 'total': len(out), 'fora': {},
            'porArea': dict(collections.Counter(x['area'] for x in out).most_common()), 'doPdfOficial': 0, 'comExplicacao': 0, 'revisadas': 0,
            'classificacao': 'manual pelo agente (pt/arte/ef e tema), a conferir pelo professor (linguagens/res/R_*.txt)'}
    json.dump({'meta': meta, 'questions': out}, open(f'{APP}/src/materias/{MAT}.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    open(f'{M}/resolucoes/por_01.txt', 'w', encoding='utf-8').write('\n\n'.join(res) + '\n')
    json.dump(lab, open(f'{HERE}/materia_lc.json', 'w'), indent=1)
    print(len(out), meta['porAno'], meta['porArea'], collections.Counter(lab.values()))
if __name__ == '__main__': main()
