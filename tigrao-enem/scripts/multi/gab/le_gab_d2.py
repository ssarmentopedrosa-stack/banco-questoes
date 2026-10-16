"""Lê o gabarito oficial do Inep, 2º dia caderno 7 AZUL (LC 91–135), 2009 e 2011–2016; 2010 via le_gab_2010_d2.py."""
import subprocess,re,json
out={}
for y in range(2009,2017):
    if y==2010: continue
    t=subprocess.run(['pdftotext','-layout',f'{y}_d2gab.pdf','-'],capture_output=True,text=True).stdout
    tok=re.findall(r'\b(\d{2,3}|[A-E]|Anulad[oa]|ANULAD[OA])\b',t)
    g={};ing={};esp={};seen={}
    i=0
    while i<len(tok):
        if tok[i].isdigit() and 91<=int(tok[i])<=180:
            n=int(tok[i]); L=[]
            j=i+1
            while j<len(tok) and not tok[j].isdigit(): L.append(tok[j]); j+=1
            L=['ANULADA' if x.lower().startswith('anulad') else x for x in L]
            if y==2009:
                seen.setdefault(n,[]).append(L[0] if L else None)
            elif n<=135 and L:
                if n<=95 and len(L)>=2: ing[n]=L[0]; esp[n]=L[1]
                else: g.setdefault(n,L[0])
            i=j
        else: i+=1
    if y==2009: g={n:v[2] for n,v in seen.items() if len(v)==4 and n<=135}
    out[str(y)]={'pt':{str(k):v for k,v in sorted(g.items())},'ingles':{str(k):v for k,v in sorted(ing.items())},'espanhol':{str(k):v for k,v in sorted(esp.items())}}
    print(y,len(g),len(ing),len(esp),[n for n in range(96 if y>2009 else 91,136) if n not in g])
g10=json.load(open('g2010.json'))
out['2010']={'pt':{k:v for k,v in g10.items() if 96<=int(k)<=135},'ingles':{},'espanhol':{}}
json.dump(out,open('gab_lc_2009_2016.json','w'),indent=0)
