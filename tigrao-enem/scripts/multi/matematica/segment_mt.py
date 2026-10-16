import pymupdf, re, json, sys, os
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
        # ordem de leitura: blocos em faixa vertical; linhas de largura total quebram a faixa
        lines.sort(key=lambda l:(l[1],l[2]))
        blocos=[];
        for l in lines:
            fw=(l[0]==-1)
            if not blocos or blocos[-1][0]!=fw: blocos.append([fw,[]])
            blocos[-1][1].append(l)
        lines=[]
        for fw,ls in blocos:
            lines+= ls if fw else sorted(ls,key=lambda l:(l[0],l[1],l[2]))
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
    for y in range(2009,2026):
        q={k:v for k,v in segs(f'pdf/{y}_d2prova.pdf').items() if 136<=k<=180}
        json.dump(q,open(f'seg/{y}.json','w'),ensure_ascii=False)
        print(y,len(q),[n for n in range(136,181) if n not in q])
