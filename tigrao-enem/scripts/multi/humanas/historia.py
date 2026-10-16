#!/usr/bin/env python3
"""Gera src/materias/historia.json (ENEM 2009–2023, CH, caderno azul do 1º dia).

Pipeline (mesmas regras do build.py):
  seg.py   → segmenta o PDF oficial do Inep por questão;
  cand.py  → para cada questão de CH que não é de Geografia: gabarito do dataset == oficial Inep,
             5 alternativas, figuras presentes, cobertura ≥ 90% das palavras do PDF (fora → motivo);
  cls.py/auto.py + labels/ch_humanas.json → matéria (historia/filosofia/sociologia), revisão manual do agente.
Este script lê humanas/candidatas.json (resultado do cand.py) e labels/ch_humanas.json e monta a matéria.
Texto/figuras: enem.dev (yunger7/enem-api, GPL-2.0), clone em /workspace/tmp/enem-api.
"""
import json, os, re, sys, unicodedata, collections
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); M = os.path.dirname(HERE); APP = os.path.dirname(os.path.dirname(M))
BASE = '/workspace/tmp/enem-api/public'
G = json.load(open(f'{M}/gab/gabaritos.json'))
G['2010'] = {**G.get('2010', {}), **json.load(open(f'{M}/gab/gabarito_ch_2010.json'))['gabarito']}
LAB = json.load(open(f'{M}/labels/ch_humanas.json'))
CAND = json.load(open(f'{HERE}/candidatas.json'))
MAT = sys.argv[1] if len(sys.argv) > 1 else 'historia'
norm = lambda s: unicodedata.normalize('NFD', s.lower()).encode('ascii', 'ignore').decode()

TEMAS = {'historia': [
 ('Antiguidade e Idade Média', r'grec|roma|romano|atenas|esparta|egit|mesopotam|feudal|medieva|idade media|cruzad|igreja catolica medieval|vassal|servidao|cruzad|bizant|antiguidade|faraó|farao'),
 ('Brasil Colônia', r'colonia|colonial|engenho|bandeirant|jesuit|capitania|sesmaria|inconfiden|quilomb|palmares|minera|cabral|portugues(es)? .*brasil|metropole'),
 ('Brasil Império', r'imperio|imperial|d\. pedro|regencia|monarquia|abolic|lei aurea|escravid|escravo|cafe|paraguai|1822|1888|princesa isabel|regente'),
 ('Brasil República: da República Velha à Era Vargas', r'republica velha|primeira republica|coronel|canudos|vargas|estado novo|getulio|tenent|1930|1937|clt|oligarquia|contestado|revolta da vacina|1889'),
 ('Brasil: Ditadura e Redemocratização', r'ditadura|militar|ai-5|1964|golpe|anistia|diretas|constituinte|1988|comissao nacional da verdade|tortura|censura|redemocratiza|herzog|geisel|goulart'),
 ('Idade Moderna, Iluminismo e Revoluções', r'renascen|reforma protestante|lutero|absolutis|iluminis|revolucao francesa|revolucao industrial|mercantil|1789|burgues|navega|independencia dos estados unidos|napole'),
 ('Mundo Contemporâneo: Guerras e Guerra Fria', r'guerra mundial|nazis|fascis|hitler|guerra fria|sovietic|urss|socialis|comunis|totalit|holocaust|imperialis|descoloniza|apartheid|cuba|vietna|1914|1939|1945'),
 ('África, América e Povos Originários', r'africa|indigena|indio|asteca|maia|inca|nativ|povos originarios|america latina|afro'),
]}
TEMA_PADRAO = {'historia': 'Cultura, Memória e Cidadania'}

def tema(txt):
    t = norm(txt); best, bs = None, 0
    for nome, rx in TEMAS[MAT]:
        s = len(re.findall(rx, t))
        if s > bs: best, bs = nome, s
    return best or TEMA_PADRAO[MAT]

def limpa(s):
    s = s or ''
    s = re.sub(r'\\([\-\*_\[\]\(\)#.+!>])', r'\1', s)
    s = re.sub(r'(?<![\w*])_([^_\n]+?)_(?![\w*])', r'\1', s)
    s = s.replace('**', '')
    s = re.sub(r'[ \t]+\n', '\n', s); s = re.sub(r'\n{3,}', '\n\n', s)
    return unicodedata.normalize('NFC', s.strip())

def main():
    out, fora = [], []
    for r in CAND:
        y, n = r['ano'], r['n']; k = f'{y}-{n}'
        if LAB['materia'].get(k) != MAT: continue
        if 'fora' in r: fora.append({'ano': y, 'n': n, 'motivo': r['fora'], **({'cobertura': r['cob']} if r.get('cob') is not None else {})}); continue
        qdir = f'{BASE}/{y}/questions/{n}'; q = json.load(open(f'{qdir}/details.json'))
        of = G[str(y)][str(n)]; assert q['correctAlternative'] == of, k
        id_ = f'ENEM-CH-{y}-REG-D1-C1-Q{n}'; figs = []
        def repl(mm):
            src = os.path.join(qdir, mm.group(1).rsplit('/', 1)[1]); i = len(figs)
            rel = f'figuras/{MAT}/{y}/{id_}-{i + 1}.webp'; dst = f'{APP}/public/{rel}'
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            im = Image.open(src); im = im if im.mode in ('RGB', 'RGBA', 'L') else im.convert('RGBA')
            im.save(dst, 'WEBP', quality=90, method=6)
            figs.append({'src': './' + rel, 'kind': 'enunciado', 'label': f'Figura {i + 1}', 'width': im.size[0], 'height': im.size[1]})
            return f'\n[[FIG {i}]]\n'
        ctx = re.sub(r'!\[[^\]]*\]\(([^)]*)\)', repl, q['context'] or '')
        st = limpa(ctx + '\n\n' + (q['alternativesIntroduction'] or ''))
        opts = [{'letter': a['letter'], 'text': limpa(a['text'])} for a in q['alternatives']]
        for a, o in zip(q['alternatives'], opts):
            if a.get('file') and not o['text']:
                src = os.path.join(qdir, a['file'].rsplit('/', 1)[1]); rel = f'figuras/{MAT}/{y}/{id_}-alt{a["letter"]}.webp'
                os.makedirs(os.path.dirname(f'{APP}/public/{rel}'), exist_ok=True)
                im = Image.open(src); im = im if im.mode in ('RGB', 'RGBA', 'L') else im.convert('RGBA')
                im.save(f'{APP}/public/{rel}', 'WEBP', quality=90, method=6); o['image'] = './' + rel
        out.append({'id': id_, 'year': y, 'area': tema(st + ' ' + ' '.join(o['text'] for o in opts)), 'content': None, 'demand': None,
                    'statement': st, 'options': opts, 'figures': figs, 'number': n, 'booklet': 1, 'answer': of, 'explanation': None})
    p = f'{APP}/src/materias/{MAT}.json'
    old = {x['id']: x for x in json.load(open(p))['questions']} if os.path.exists(p) else {}
    for x in out:
        if x['id'] in old and old[x['id']].get('explanation'): x['explanation'] = old[x['id']]['explanation']
    out.sort(key=lambda x: (x['year'], x['number']))
    fp = collections.Counter(str(f['ano']) for f in fora)
    meta = {'materia': MAT,
            'fonteTexto': 'enem.dev (github.com/yunger7/enem-api, GPL-2.0), caderno azul; texto conferido com o PDF oficial do Inep',
            'fonteGabarito': 'Gabaritos oficiais do Inep (caderno azul); 2010 CH: AZUL_Sabado_GAB.pdf (gab/gabarito_ch_2010.json)',
            'porAno': dict(sorted(collections.Counter(str(x['year']) for x in out).items())),
            'foraPorAno': dict(sorted(fp.items())), 'total': len(out), 'fora': {},
            'porArea': dict(collections.Counter(x['area'] for x in out).most_common()),
            'doPdfOficial': 0, 'comExplicacao': sum(1 for x in out if x['explanation']), 'revisadas': 0,
            'classificacao': 'automática (palavras-chave) + revisão manual dos casos ambíguos pelo agente; a conferir pelo professor (labels/ch_humanas.json)'}
    json.dump({'meta': meta, 'questions': out}, open(p, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    json.dump({'entram': [f"{x['year']}-{x['number']}" for x in out], 'fora': fora}, open(f'{HERE}/relatorio_{MAT}.json', 'w'), ensure_ascii=False, indent=1)
    print(MAT, 'entram', len(out), meta['porAno'], '| fora', len(fora), dict(fp)); print(meta['porArea'])

if __name__ == '__main__': main()
