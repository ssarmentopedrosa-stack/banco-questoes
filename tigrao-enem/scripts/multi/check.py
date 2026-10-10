import sys,json,re;sys.path.insert(0,'.');from classify import *
SEG={y:json.load(open(f'seg/{y}.json')) for y in range(2009,2026)}
def words(s): return set(w for w in re.findall(r'[a-z]{4,}',norm(s)))
def devtext(q): return re.sub(r'!\[\]\([^)]*\)',' ',' '.join([q['context'] or '',q['alternativesIntroduction'] or '']+[a['text'] or '' for a in q['alternatives']]))
def cover(q):
    s=SEG[q['year']].get(str(q['index']))
    if not s: return None,None
    pw=words(s['text']); dw=words(devtext(q))
    if not pw or not dw: return 0,0
    return len(pw&dw)/len(pw), len(pw&dw)/len(dw)
def imgs(q): return [os.path.join(q['_dir'],u.rsplit('/',1)[1]) for u in re.findall(r'!\[\]\(([^)]*)\)',q['context'] or '')]
def ocrtext(q):
    t=''
    for f in imgs(q)+[os.path.join(q['_dir'],a['file'].rsplit('/',1)[1]) for a in q['alternatives'] if a['file']]:
        p='/workspace/enem_multi/ocr/'+f.replace('/','_')+'.txt'
        if os.path.exists(p): t+=' '+open(p).read()
    return t
def cover2(q):
    s=SEG[q['year']].get(str(q['index']))
    if not s: return None
    pw=words(s['text']); dw=words(devtext(q)+' '+ocrtext(q))
    return len(pw&dw)/max(1,len(pw))
NOISE=set('questao adaptado caderno azul pagina rascunho redacao transcreva fonte disponivel acesso dia ciencias natureza humanas tecnologias suas enem'.split())
_VOC=None
def voc():
    global _VOC
    if _VOC is None:
        _VOC=set()
        for q in items(): _VOC|=words(devtext(q))
    return _VOC
def cover3(q):
    s=SEG[q['year']].get(str(q['index']))
    if not s: return 0.0,0
    V=voc(); pw=set(w for w in words(s['text']) if w in V and w not in NOISE)
    dw=words(devtext(q)+' '+ocrtext(q))
    return len(pw&dw)/max(1,len(pw)), len(pw)
