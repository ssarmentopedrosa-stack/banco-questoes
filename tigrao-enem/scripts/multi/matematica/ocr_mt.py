import os,re,json,glob,subprocess
from concurrent.futures import ThreadPoolExecutor
os.environ['OMP_THREAD_LIMIT']='1'
jobs=[]
for y in range(2009,2024):
    for n in range(136,181):
        f=f'enem-api/public/{y}/questions/{n}/details.json'
        if not os.path.exists(f): continue
        q=json.load(open(f)); dd=os.path.dirname(f)
        for u in re.findall(r'!\[[^\]]*\]\(([^)]*)\)',q['context'] or '')+[a['file'] for a in q['alternatives'] if a['file']]:
            p=os.path.join(dd,u.rsplit('/',1)[1])
            if os.path.exists(p): jobs.append(p)
print(len(jobs),flush=True)
def run(f):
    out='ocr/'+f.replace('/','_')
    if os.path.exists(out+'.txt'): return
    subprocess.run(['timeout','60','tesseract',f,out,'-l','por','--psm','3'],capture_output=True)
with ThreadPoolExecutor(8) as ex: list(ex.map(run,jobs))
print('done',len(os.listdir('ocr')))
