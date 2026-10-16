#!/usr/bin/env python3
"""Inclui em src/materias/geografia.json as questões de Geografia do ENEM 2010 (1º dia, caderno 1 AZUL, CH 1–45).

Antes ficavam fora por "sem gabarito oficial disponível". Agora o gabarito vem do PDF oficial do Inep
AZUL_Sabado_GAB.pdf (alternativa circulada em verde; gab/gabarito_ch_2010.json, gab/le_gab_ch_2010.py).
Mesmo padrão do build.py:
  - texto/figuras do enem.dev (yunger7/enem-api, GPL-2.0) — clone em /workspace/tmp/enem-api;
  - gabarito do dataset tem de ser IGUAL ao oficial do Inep (senão fica fora);
  - texto conferido com o PDF oficial (dia1_caderno1_azul.pdf): ≥ 90% das palavras do PDF presentes no dataset,
    senão fica fora ("texto incompleto");
  - quais questões são de Geografia: rótulo manual em labels/ch_geografia_2010.json (a conferir pelo professor).
Uso: python3 scripts/multi/geografia_2010.py <pdf dia1_caderno1_azul.pdf>   (idempotente)
"""
import json, os, re, sys, unicodedata, collections
import pymupdf as fitz
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); APP = os.path.dirname(os.path.dirname(HERE))
BASE = '/workspace/tmp/enem-api/public/2010/questions'
G = json.load(open(f'{HERE}/gab/gabarito_ch_2010.json'))['gabarito']
LAB = json.load(open(f'{HERE}/labels/ch_geografia_2010.json'))
TEMA = LAB['tema']
# Linhas de crédito que o enem.dev omitiu: copiadas do PDF oficial (dia1_caderno1_azul.pdf).
DO_PDF = {1: 'Fonte: Incra, Estatísticas cadastrais 1998.',
          8: 'TEIXEIRA, W. et. al. (Orgs.) Decifrando a Terra. São Paulo: Companhia Editora Nacional, 2009 (adaptado).'}
norm = lambda s: unicodedata.normalize('NFD', s.lower()).encode('ascii', 'ignore').decode()
words = lambda s: set(re.findall(r'[a-z]{4,}', norm(s)))
NOISE = set('questao adaptado caderno azul pagina rascunho fonte disponivel acesso ciencias humanas tecnologias suas enem'.split())

# Correções conferidas com o PDF oficial (erros de digitação do enem.dev).
FIX = {4: [('Almanaque Brasil\nSocioambiental 2008.\nSão Paulo', 'Almanaque Brasil Socioambiental 2008. São Paulo')],
       7: [('verticais e o convergem', 'verticais e convergem')],
       9: [('Dísponivel', 'Disponível')],
       14: [('Dísponivel', 'Disponível'), ('5353', '5 353'), ('Acesso em 27', 'Acesso em: 27')],
       15: [('BACOCCINA, D. QUEIROZ, G.: BORGES, R.', 'BACOCCINA, D.; QUEIROZ, G.; BORGES, R.'), ('confusão.\nIstoé', 'confusão. Istoé'), ('n.o 655, 28 abri 2010', 'n.º 655, 28 abr. 2010')],
       17: [('2001-\n2005', '2001-2005')]}

def fix(n, s):
    for a, b in FIX.get(n, []): s = s.replace(a, b)
    return s

def segmenta(pdf):
    d = fitz.open(pdf); out = {}; cur = None
    for p in d:
        W = p.rect.width
        bl = sorted([b for b in p.get_text('blocks') if b[6] == 0], key=lambda b: (0 if b[0] < W / 2 - 10 else 1, b[1]))
        for b in bl:
            m = re.match(r'\s*Questão\s+(\d+)\s*', b[4])
            if m: cur = int(m.group(1)); out[cur] = b[4][m.end():]; continue
            if cur: out[cur] += b[4]
    return out

def limpa(s):
    s = s or ''
    s = re.sub(r'\\([\-\*_\[\]\(\)#.+!>])', r'\1', s)
    s = re.sub(r'(?<![\w*])_([^_\n]+?)_(?![\w*])', r'\1', s)
    s = s.replace('**', '')
    s = re.sub(r'[ \t]+\n', '\n', s); s = re.sub(r'\n{3,}', '\n\n', s)
    return unicodedata.normalize('NFC', s.strip())

def main():
    seg = segmenta(sys.argv[1])
    p = f'{APP}/src/materias/geografia.json'; d = json.load(open(p, encoding='utf-8'))
    d['questions'] = [q for q in d['questions'] if q['year'] != 2010]
    entram, fora = [], []
    for n in LAB['ids']:
        q = json.load(open(f'{BASE}/{n}/details.json')); qdir = f'{BASE}/{n}'
        oficial = G[str(n)]
        if q['correctAlternative'] != oficial:
            fora.append((n, f"gabarito do dataset ({q['correctAlternative']}) diverge do oficial do Inep ({oficial})")); continue
        if n in DO_PDF: q['context'] = (q['context'] or '') + '\n\n' + DO_PDF[n]
        dev = re.sub(r'!\[[^\]]*\]\([^)]*\)', ' ', ' '.join([q['context'] or '', q['alternativesIntroduction'] or ''] + [a['text'] or '' for a in q['alternatives']]))
        pw = words(seg.get(n, '')) - NOISE; dw = words(dev)
        cob = len(pw & dw) / max(1, len(pw))
        if cob < 0.9:
            fora.append((n, f'texto incompleto em relação à prova oficial (cobertura {cob:.0%})')); continue
        if len(q['alternatives']) != 5 or any(not (a['text'] or '').strip() and not a['file'] for a in q['alternatives']):
            fora.append((n, 'alternativas incompletas')); continue
        id_ = f'ENEM-CH-2010-REG-D1-C1-Q{n}'; figs = []
        def repl(mm):
            src = os.path.join(qdir, mm.group(1).rsplit('/', 1)[1]); k = len(figs)
            rel = f'figuras/geografia/2010/{id_}-{k + 1}.webp'; dst = f'{APP}/public/{rel}'
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            im = Image.open(src); im = im if im.mode in ('RGB', 'RGBA', 'L') else im.convert('RGBA')
            im.save(dst, 'WEBP', quality=90, method=6)
            figs.append({'src': './' + rel, 'kind': 'enunciado', 'label': f'Figura {k + 1}', 'width': im.size[0], 'height': im.size[1]})
            return f'\n[[FIG {k}]]\n'
        ctx = re.sub(r'!\[[^\]]*\]\(([^)]*)\)', repl, q['context'] or '')
        entram.append({'id': id_, 'year': 2010, 'area': TEMA[str(n)], 'content': None, 'demand': None,
                       'statement': fix(n, limpa(ctx + '\n\n' + (q['alternativesIntroduction'] or ''))),
                       'options': [{'letter': a['letter'], 'text': fix(n, limpa(a['text']))} for a in q['alternatives']],
                       'figures': figs, 'number': n, 'booklet': 1, 'answer': oficial, 'explanation': None,
                       '_cobertura': round(cob, 3)})
    d['questions'] = sorted(d['questions'] + entram, key=lambda x: (x['year'], x['number']))
    qs = d['questions']; m = d['meta']
    m['porAno'] = dict(sorted(collections.Counter(str(x['year']) for x in qs).items()))
    m['total'] = len(qs); m['porArea'] = dict(collections.Counter(x['area'] for x in qs).most_common())
    m['comExplicacao'] = sum(1 for x in qs if x.get('explanation'))
    m['fonteGabarito'] = m['fonteGabarito'] + '; 2010 CH: AZUL_Sabado_GAB.pdf (gab/gabarito_ch_2010.json)'
    if fora: m['foraPorAno'] = {**m.get('foraPorAno', {}), '2010': len(fora)}
    for x in entram:
        x.pop('_cobertura')
        for a, b in FIX.get(x['number'], []): assert a not in x['statement'] + ' '.join(o['text'] for o in x['options']), (x['number'], a)
    json.dump(d, open(p, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    json.dump({'entram': [x['number'] for x in entram], 'fora': fora}, open(f'{HERE}/relatorio_geografia_2010.json', 'w'), ensure_ascii=False, indent=1)
    print('Geografia 2010: entram', len(entram), [x['number'] for x in entram], '| fora', fora)

if __name__ == '__main__': main()
