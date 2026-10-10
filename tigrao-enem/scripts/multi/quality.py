import sys;sys.path.insert(0,'/workspace/enem_multi');from check import *
G=json.load(open('/workspace/enem_multi/gab/gabaritos.json'))
def quality(q):
    """retorna (ok, motivo)"""
    y=str(q['year']); k=G.get(y,{}).get(str(q['index']))
    if k is None: return False,'sem gabarito oficial disponível'
    if k=='ANULADA': return False,'anulada pelo Inep'
    if k!=q['correctAlternative']: return False,'gabarito do dataset diverge do oficial'
    if len(q['alternatives'])!=5: return False,'alternativas incompletas'
    for a in q['alternatives']:
        if not (a['text'] or '').strip() and not a['file']: return False,'alternativa vazia'
        if a['file'] and not os.path.exists(os.path.join(q['_dir'],a['file'].rsplit('/',1)[1])): return False,'imagem de alternativa ausente'
    for f in imgs(q):
        if not os.path.exists(f) or 'broken' in f: return False,'figura ausente'
    if 'broken-image' in (q['context'] or ''): return False,'figura ausente'
    c,n=cover3(q)
    vis=len(re.sub(r'!\[\]\([^)]*\)','',(q['context'] or '')+(q['alternativesIntroduction'] or '')).strip())
    if n>=10:
        if c<0.9: return False,'texto incompleto em relação à prova oficial (cobertura %.0f%%)'%(c*100)
    else:
        if vis<200: return False,'texto não conferível com a prova oficial e curto'
    return True,'ok'
