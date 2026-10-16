import pymupdf,re,json
d=pymupdf.open('pdf/2010_d2gab.pdf')
def rc(c): return tuple(round(x,2) for x in c) if c else None
seq=[]
for pi,p in enumerate(d):
    W=p.rect.width; ev=[]
    words=p.get_text('words')
    for i,w in enumerate(words):
        if w[4] in ('Questão','QUESTÃO') and i+1<len(words) and re.fullmatch(r'\d{2,3}',words[i+1][4]):
            ev.append((0 if w[0]<W/2 else 1,w[1],'Q',int(words[i+1][4])))
    drs=p.get_drawings()
    bul=[dr['rect'] for dr in drs if dr.get('fill') and not dr.get('color') and rc(dr['fill'])[:2]==(0.14,0.12) and 5<dr['rect'].width<14 and 5<dr['rect'].height<14]
    for dr in drs:
        if rc(dr.get('color'))!=(0.0,0.5,0.5): continue
        r=dr['rect']; cx=(r.x0+r.x1)/2
        same=sorted([b for b in bul if abs((b.x0+b.x1)/2-cx)<4],key=lambda b:b.y0)
        gs=[[]]
        for b in same:
            if gs[-1] and b.y0-gs[-1][-1].y0>120: gs.append([])
            gs[-1].append(b)
        out=None
        for g in gs:
            idx=[i for i,b in enumerate(g) if (r & b).get_area()>0.5*b.get_area()]
            if idx: out=(len(g),idx[0])
        ev.append((0 if r.x0<W/2 else 1,r.y0,'C',out))
    ev.sort(key=lambda e:(e[0],e[1])); seq+=ev
cur=None; G={}
for e in seq:
    if e[2]=='Q': cur=e[3]
    elif cur and 136<=cur<=180: G.setdefault(cur,[]).append(e[3])
ok={k:'ABCDE'[v[0][1]] for k,v in G.items() if len(v)==1 and v[0] and v[0][0]==5}
print('ok',len(ok),'bad',{k:v for k,v in G.items() if k not in ok})
json.dump({str(k):ok[k] for k in sorted(ok)},open('gab2010.json','w'))
print(ok)
