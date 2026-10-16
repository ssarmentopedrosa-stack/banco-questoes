"""Candidatas de Inglês/Espanhol (LE), ENEM 2010–2023. Segmenta a prova oficial (1ª ocorrência de Q1–5/91–95 = Inglês,
2ª = Espanhol), confere gabarito do dataset com o oficial do Inep e cobertura de palavras ≥ 90%."""
import pymupdf as fitz, json, re, os, glob, unicodedata, collections
B = '/workspace/tmp/enem-api/public'
GL = json.load(open('/workspace/lin/pdf/gab_lc_2009_2016.json')); GD = json.load(open('gab_le_2017_2023.json'))
norm = lambda s: unicodedata.normalize('NFD', s.lower()).encode('ascii', 'ignore').decode()
words = lambda s: set(re.findall(r'[a-z]{4,}', norm(s)))
NOISE = set('questao adaptado caderno azul pagina rascunho fonte disponivel acesso linguagens codigos tecnologias suas enem lingua estrangeira ingles espanhol opcao'.split())
V = set()
for f in glob.glob(f'{B}/*/questions/*/details.json'):
    q = json.load(open(f)); V |= words(' '.join([q['context'] or '', q['alternativesIntroduction'] or ''] + [a['text'] or '' for a in q['alternatives']]))
def seg(y):
    f = f'/workspace/hum/pdf/{y}_d1prova.pdf' if y >= 2017 else f'/workspace/lin/pdf/{y}_d2prova.pdf'
    ns = range(1, 6) if y >= 2017 else range(91, 96); s = []; cur = None
    for p in fitz.open(f):
        W = p.rect.width
        for b in sorted([b for b in p.get_text('blocks') if b[6] == 0], key=lambda b: (0 if b[0] < W / 2 - 10 else 1, b[1])):
            parts = re.split(r'(?mi)^\s*QUEST[ÃA]O\s+0?(\d+)\s*$', b[4])
            if cur is not None: s[cur][1] += parts[0]
            for i in range(1, len(parts), 2):
                n = int(parts[i]); s.append([n, parts[i + 1]]); cur = len(s) - 1
        if len(s) > 12: break
    res = {'ingles': {}, 'espanhol': {}}
    for n, t in s:
        if n in ns: res['espanhol' if n in res['ingles'] else 'ingles'].setdefault(n, t)
    return res, ns
out = []
for y in range(2010, 2024):
    S, ns = seg(y)
    for lang in ('ingles', 'espanhol'):
        for n in ns:
            r = {'ano': y, 'n': n, 'lingua': lang}; p = f'{B}/{y}/questions/{n}-{lang}/details.json'
            g = (GL[str(y)][lang].get(str(n)) if y <= 2016 else GD[str(y)][lang][str(1 + n - ns[0])]) if y != 2010 else None
            if not os.path.exists(p): r['fora'] = 'questão ausente no dataset'; out.append(r); continue
            q = json.load(open(p)); d = os.path.dirname(p)
            imgs = [os.path.join(d, u.rsplit('/', 1)[1]) for u in re.findall(r'!\[[^\]]*\]\(([^)]*)\)', q['context'] or '')] + [os.path.join(d, a['file'].rsplit('/', 1)[1]) for a in q['alternatives'] if a['file']]
            dev = re.sub(r'!\[[^\]]*\]\([^)]*\)', ' ', ' '.join([q['context'] or '', q['alternativesIntroduction'] or ''] + [a['text'] or '' for a in q['alternatives']]))
            if g is None: r['fora'] = 'sem gabarito oficial legível (2010: caderno com gabarito marcado não separa Inglês/Espanhol)' if y == 2010 else 'sem gabarito oficial disponível'
            elif g != q['correctAlternative']: r['fora'] = f"gabarito do dataset ({q['correctAlternative']}) diverge do oficial do Inep ({g})"
            elif len(q['alternatives']) != 5 or any(not (a['text'] or '').strip() and not a['file'] for a in q['alternatives']): r['fora'] = 'alternativas incompletas'
            elif any(not os.path.exists(f) for f in imgs): r['fora'] = 'figura ausente'
            else:
                pw = {w for w in words(S[lang].get(n, '')) if w in V} - NOISE; dw = words(dev)
                cob = len(pw & dw) / max(1, len(pw)); r['cob'] = round(cob, 3); r['falta'] = sorted(pw - dw)[:15]
                if len(pw) < 8: r['fora'] = 'texto não conferível com a prova oficial'
                elif cob < 0.9: r['fora'] = f'texto incompleto em relação à prova oficial (cobertura {cob:.0%})'
            out.append(r)
json.dump(out, open('cand_le.json', 'w'), ensure_ascii=False, indent=0)
print(len(out), collections.Counter(r.get('fora', 'ok').split(' (')[0] for r in out))
print(collections.Counter((r['lingua'], r['ano']) for r in out if 'fora' not in r))
print([(r['ano'], r['n'], r['lingua'], r.get('cob'), r['falta'][:6]) for r in out if 'incompleto' in r.get('fora', '')])
