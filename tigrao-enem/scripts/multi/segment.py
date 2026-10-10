import pymupdf, re, json, sys, os
SRC={}
for y in range(2009,2015): SRC[y]=[f'/workspace/enem-2009-2014/{y}/prova.pdf']
for y in (2015,2016): SRC[y]=[f'/workspace/enem-2015-2019/{y}/prova.pdf']
for y in (2017,2018,2019): SRC[y]=[f'gab/{y}_d1prova.pdf', f'/workspace/enem-2015-2019/{y}/prova.pdf']
for y in (2020,2021,2022,2023): SRC[y]=[f'gab/{y}_d1prova.pdf', f'/workspace/enem-{y}/azul.pdf']
SRC[2024]=['gab/2024_d1prova.pdf','/workspace/enem-2024/azul-oficial.pdf']
SRC[2025]=['gab/2025_d1prova.pdf','/workspace/enem-2025/azul-oficial.pdf']
QRX=re.compile(r'^\s*(?:QUEST[ÃA]O|Quest[ãa]o)\s+(\d{1,3})\s*$')
def segs(path):
    doc=pymupdf.open(path); out={}; cur=None
    for pi,page in enumerate(doc):
        W=page.rect.width; H=page.rect.height
        lines=[]
        d=page.get_text('dict')
        for b in d['blocks']:
            if b['type']!=0: continue
            for l in b['lines']:
                t=''.join(s['text'] for s in l['spans']).strip()
                if not t: continue
                x0,y0,x1,y1=l['bbox']
                col=0 if (x0+x1)/2<W/2 else 1
                if x1-x0>W*0.6: col=-1  # largura total (cabeçalho)
                lines.append((col,y0,x0,t,l['bbox']))
        # ignore header/footer lines (top/bottom 6%)
        lines=[l for l in lines if H*0.05<l[1]<H*0.95]
        rows={}
        for col,yy,xx,t,bb in lines:
            k=(col,round(yy/3))
            rows.setdefault(k,[]).append((xx,t,bb))
        lines=[]
        for (col,ry),v in rows.items():
            v.sort(); bb=[min(b[2][0] for b in v),min(b[2][1] for b in v),max(b[2][2] for b in v),max(b[2][3] for b in v)]
            lines.append((col,bb[1],bb[0],' '.join(x[1] for x in v),bb))
        lines.sort(key=lambda l:(0 if l[0]<=0 else 1, l[1], l[2]) if l[0]!=-1 else (-1,l[1],l[2]))
        pend=False
        for col,yy,xx,t,bb in lines:
            m=QRX.match(t)
            if re.fullmatch(r'(?:QUEST[ÃA]O|Quest[ãa]o)',t.strip()): pend=True; continue
            if pend and re.fullmatch(r'\d{1,3}',t.strip()): m=re.match(r'(\d+)',t.strip())
            pend=False
            if m:
                cur=int(m.group(1)); out[cur]={'text':'','regions':[]}; 
            if cur is None: continue
            out[cur]['text']+=t+'\n'
            out[cur]['regions'].append([pi,col]+list(bb))
    return out
if __name__=='__main__':
    os.makedirs('seg',exist_ok=True)
    for y,ps in SRC.items():
        allq={}
        for p in ps: allq.update(segs(p))
        json.dump(allq,open(f'seg/{y}.json','w'),ensure_ascii=False)
        ks=sorted(allq); print(y,len(ks),ks[:3],ks[-3:])
