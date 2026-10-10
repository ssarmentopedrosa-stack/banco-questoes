import pymupdf, json, re
from segment import SRC
_docs={}
def doc(p):
    if p not in _docs: _docs[p]=pymupdf.open(p)
    return _docs[p]
SEG={y:json.load(open(f'seg/{y}.json')) for y in range(2009,2026)}
def pdf_for(y,n):
    ps=SRC[y]
    if len(ps)==1: return ps[0]
    return ps[0] if n<=90 else ps[1]
def has_figure(y,n):
    s=SEG[y].get(str(n))
    if not s: return None
    d=doc(pdf_for(y,n))
    boxes={}
    for pi,col,x0,y0,x1,y1 in s['regions']:
        b=boxes.setdefault((pi,col),[x0,y0,x1,y1]); b[0]=min(b[0],x0);b[1]=min(b[1],y0);b[2]=max(b[2],x1);b[3]=max(b[3],y1)
    for (pi,col),b in boxes.items():
        page=d[pi]; R=pymupdf.Rect(b)
        for im in page.get_image_info():
            r=pymupdf.Rect(im['bbox'])
            if min(r.width,r.height)<40 or r.x0<20 or r.y0>page.rect.height*0.94: continue
            if (r & R).get_area()>0.3*r.get_area(): return True
        n_draw=0
        for dr in page.get_drawings():
            r=dr['rect']
            if not r.intersects(R): continue
            if r.width<8 or r.height<8 or r.x0<20 or r.y0>page.rect.height*0.94: continue
            if (r & R).get_area()>0.3*r.get_area() and r.width*r.height>600: n_draw+=1
        if n_draw>=1: return True
    return False
