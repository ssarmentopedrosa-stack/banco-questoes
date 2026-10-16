import subprocess,re,json
G={}
for y in range(2009,2026):
    if y==2010: continue
    t=subprocess.run(['pdftotext','-layout',f'/workspace/mat_work/pdf/{y}_d2gab.pdf','-'],capture_output=True,text=True).stdout
    g={}
    for line in t.split('\n'):
        prs=re.findall(r'\b(1[3-8]\d)\s+([A-E]|[Aa]nulad[oa]|ANULAD[OA]|\*)(?=\s|$)',line)
        if y==2009:
            prs=re.findall(r'\b(\d{2,3})\s+([A-E]|Anulad[oa])(?=\s|$)',line)
            if len(prs)==4: prs=[prs[2]]
            else: prs=[]
        for n,l in prs:
            n=int(n)
            if 136<=n<=180: g[n]='ANULADA' if l.lower().startswith('anul') or l=='*' else l
    # lone number lines (e.g. '*' above)
    miss=[n for n in range(136,181) if n not in g]
    G[y]=g; print(y,len(g),'faltam',miss,'anuladas',[n for n,v in g.items() if v=='ANULADA'])
json.dump({str(y):{str(n):v for n,v in sorted(g.items())} for y,g in G.items()},open('/workspace/mat_work/gab_mt.json','w'),indent=0)
