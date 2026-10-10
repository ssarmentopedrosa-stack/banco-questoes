import json,glob,os,re,collections
G=json.load(open('/workspace/enem_multi/gab/gabaritos.json'))
BASE='/workspace/tmp/enem-api/public'
def area(y,n):
    if y==2009: return 'CN' if 1<=n<=45 else 'CH' if 46<=n<=90 else None
    if y<=2016: return 'CH' if 1<=n<=45 else 'CN' if 46<=n<=90 else None
    return 'CH' if 46<=n<=90 else 'CN' if 91<=n<=135 else None
def items():
    for y in range(2009,2024):
        for d in sorted(glob.glob(f'{BASE}/{y}/questions/*/details.json')):
            q=json.load(open(d)); a=area(y,q['index'])
            if a and not q.get('language'): q['_area']=a; q['_dir']=os.path.dirname(d); yield q
