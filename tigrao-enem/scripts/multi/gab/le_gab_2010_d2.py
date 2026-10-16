"""Lê o gabarito oficial do ENEM 2010, 1º dia, caderno 1 AZUL (CH 1–45) a partir do PDF oficial do Inep
'AZUL_Sabado_GAB.pdf' (prova com a alternativa correta circulada em verde). Para cada questão: localiza os
5 marcadores de alternativa (discos de 7 pt) entre o cabeçalho 'Questão N' e o próximo, e acha qual deles
está dentro do círculo verde (traço RGB ~ (0, 0.67, 0))."""
import pymupdf as fitz, json, sys
d=fitz.open(sys.argv[1]); res={}; prob=[]
for pno,p in enumerate(d):
    W=p.rect.width
    ws=p.get_text('words')
    heads=[]
    for i,w in enumerate(ws):
        if w[4]=='Questão' and i+1<len(ws) and ws[i+1][4].isdigit():
            heads.append((int(ws[i+1][4]), 0 if w[0]<W/2 else 1, w[1]))
    if not heads: continue
    dr=p.get_drawings()
    marks=[(0 if x['rect'].x0<W/2 else 1, x['rect'].y0, x['rect']) for x in dr if x.get('fill') and max(x['fill'])<0.2 and 6<x['rect'].width<8 and 6<x['rect'].height<8]
    greens=[x['rect'] for x in dr if x.get('color') and x['color'][1]>0.4 and x['color'][0]<0.3]
    order=sorted(heads,key=lambda h:(h[1],h[2]))
    for k,(n,col,y) in enumerate(order):
        y2=order[k+1][2] if k+1<len(order) and order[k+1][1]==col else 1e9
        ms=sorted([m for m in marks if m[0]==col and y<m[1]<y2],key=lambda m:m[1])
        gs=[g for g in greens if (0 if g.x0<W/2 else 1)==col and y<g.y0<y2]
        if len(ms)!=5 or len(gs)!=1: prob.append((n,pno+1,len(ms),len(gs))); continue
        g=gs[0]; c=fitz.Point((g.x0+g.x1)/2,(g.y0+g.y1)/2)
        i=min(range(5),key=lambda j:abs((ms[j][2].y0+ms[j][2].y1)/2-c.y))
        res[n]='ABCDE'[i]
print(json.dumps(dict(sorted(res.items())))); print('problemas',prob,file=sys.stderr)
