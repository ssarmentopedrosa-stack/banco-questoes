import json,os,re,unicodedata,sys,glob
B='/workspace/tmp/enem-api/public'
M='/workspace/wt-hum/tigrao-enem/scripts/multi'
G=json.load(open(f'{M}/gab/gabaritos.json'))
G['2010']={**G['2010'],**json.load(open('/workspace/wt-fg/tigrao-enem/scripts/multi/gab/gabarito_ch_2010.json'))['gabarito']}
GEO=set(json.load(open(f'{M}/labels/ch_geografia.json'))['ids'])|{f'2010-{n}' for n in json.load(open('/workspace/wt-fg/tigrao-enem/scripts/multi/labels/ch_geografia_2010.json'))['ids']}
SEG=json.load(open('seg.json'))
norm=lambda s: unicodedata.normalize('NFD',s.lower()).encode('ascii','ignore').decode()
words=lambda s:set(re.findall(r'[a-z]{4,}',norm(s)))
NOISE=set('questao adaptado caderno azul pagina rascunho fonte disponivel acesso ciencias humanas tecnologias suas enem'.split())
def rng(y): return range(46,91) if y==2009 or y>=2017 else range(1,46)
def ocr(f):
    c=f'/workspace/hum/ocr/{f.replace("/","_")}.txt'
    if not os.path.exists(c):
        os.makedirs('/workspace/hum/ocr',exist_ok=True)
        os.system(f'tesseract "{f}" "{c[:-4]}" -l por >/dev/null 2>&1')
    return open(c).read() if os.path.exists(c) else ''
V=set()
for f in glob.glob(f'{B}/*/questions/*/details.json'):
    q=json.load(open(f)); V|=words(' '.join([q['context'] or '',q['alternativesIntroduction'] or '']+[a['text'] or '' for a in q['alternatives']]))
sh=lambda w:''.join(chr((ord(c)-97-3)%26+97) for c in w)
def pdfw(t):
    r=set()
    for w in words(t):
        if w in V: r.add(w)
        elif sh(w) in V: r.add(sh(w))
    return r
out=[]
for y in range(2009,2024):
    for n in rng(y):
        k=f'{y}-{n}'
        if k in GEO: continue
        p=f'{B}/{y}/questions/{n}/details.json'
        r={'ano':y,'n':n}
        if not os.path.exists(p): r['fora']='questão ausente no dataset'; out.append(r); continue
        q=json.load(open(p)); d=os.path.dirname(p)
        if q.get('language'): continue
        g=G.get(str(y),{}).get(str(n))
        imgs=[os.path.join(d,u.rsplit('/',1)[1]) for u in re.findall(r'!\[[^\]]*\]\(([^)]*)\)',q['context'] or '')]+[os.path.join(d,a['file'].rsplit('/',1)[1]) for a in q['alternatives'] if a['file']]
        dev=re.sub(r'!\[[^\]]*\]\([^)]*\)',' ',' '.join([q['context'] or '',q['alternativesIntroduction'] or '']+[a['text'] or '' for a in q['alternatives']]))
        r['texto']=dev[:4000]
        if g is None: r['fora']='sem gabarito oficial disponível'
        elif g=='ANULADA': r['fora']='anulada pelo Inep'
        elif g!=q['correctAlternative']: r['fora']=f"gabarito do dataset ({q['correctAlternative']}) diverge do oficial do Inep ({g})"
        elif len(q['alternatives'])!=5 or any(not (a['text'] or '').strip() and not a['file'] for a in q['alternatives']): r['fora']='alternativas incompletas'
        elif any(not os.path.exists(f) for f in imgs) or 'broken' in (q['context'] or ''): r['fora']='figura ausente'
        else:
            pw=pdfw(SEG[str(y)].get(str(n),''))-NOISE
            dw=words(dev)
            cob=len(pw&dw)/max(1,len(pw))
            if cob<0.9 and imgs:
                for f in imgs: dw|=words(ocr(f))
                cob=len(pw&dw)/max(1,len(pw))
            r['cob']=round(cob,3); r['falta']=sorted(pw-dw)[:15]
            if len(pw)<8: r['fora']='texto não conferível com a prova oficial'
            elif cob<0.9: r['fora']=f'texto incompleto em relação à prova oficial (cobertura {cob:.0%})'
        out.append(r)
json.dump(out,open('cand.json','w'),ensure_ascii=False,indent=0)
import collections
print(len(out),collections.Counter(r.get('fora','ok').split(' (')[0] for r in out))
