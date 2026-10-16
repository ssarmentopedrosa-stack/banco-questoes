import pymupdf as fitz, json, re
out={}
H=json.load(open('/workspace/hum/seg.json'))
for y in range(2009,2024):
    if y>=2017: out[y]=H[str(y)]; continue
    d=fitz.open(f'pdf/{y}_d2prova.pdf'); s={}; cur=None
    for p in d:
        W=p.rect.width
        bl=sorted([b for b in p.get_text('blocks') if b[6]==0],key=lambda b:(0 if b[0]<W/2-10 else 1,b[1]))
        for b in bl:
            parts=re.split(r'(?mi)^\s*QUEST[ÃA]O\s+(\d+)\s*$',b[4])
            if cur: s[cur]+=parts[0]
            for i in range(1,len(parts),2):
                cur=int(parts[i]); s[cur]=parts[i+1]
    out[y]=s; print(y,len(s),sorted(s)[:2],sorted(s)[-1])
json.dump(out,open('seg.json','w'),ensure_ascii=False)
