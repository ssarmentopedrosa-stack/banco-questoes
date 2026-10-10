import sys,os,re,subprocess;sys.path.insert(0,'.');from load import *
from concurrent.futures import ThreadPoolExecutor
os.environ['OMP_THREAD_LIMIT']='1'
jobs=[]
for q in items():
    for u in re.findall(r'!\[\]\(([^)]*)\)',q['context'] or '')+[a['file'] for a in q['alternatives'] if a['file']]:
        f=os.path.join(q['_dir'],u.rsplit('/',1)[1])
        if os.path.exists(f): jobs.append(f)
print(len(jobs),flush=True)
def run(f):
    out='ocr/'+f.replace('/','_')
    if os.path.exists(out+'.txt'): return
    subprocess.run(['timeout','60','tesseract',f,out,'-l','por','--psm','3'],capture_output=True)
with ThreadPoolExecutor(8) as ex: list(ex.map(run,jobs))
print('done',len(os.listdir('ocr')),flush=True)
