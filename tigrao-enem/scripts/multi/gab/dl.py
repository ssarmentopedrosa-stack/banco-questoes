import subprocess,hashlib,base64,json,os,time,sys
from concurrent.futures import ThreadPoolExecutor
def get(line):
    y,k,bare=line.strip().split('\t'); f=f'{y}_{k}.pdf'
    cdx=subprocess.run(['curl','-s','--max-time','120',f'https://web.archive.org/cdx/search/cdx?url={bare}&fl=timestamp,digest,statuscode,original&filter=statuscode:200'],capture_output=True,text=True).stdout.split('\n')
    rows=[r.split() for r in cdx if r.strip()]
    if not rows: return dict(year=y,kind=k,url=bare,ok=False,err='no capture')
    dig=rows[-1][1]; ts=[r[0] for r in rows if r[1]==dig][0]; orig=rows[-1][3]
    ok=False
    for a in range(5):
        subprocess.run(['curl','-sL','--max-time','300','-o',f,f'https://web.archive.org/web/{ts}id_/{orig}'])
        b=open(f,'rb').read() if os.path.exists(f) else b''
        if base64.b32encode(hashlib.sha1(b).digest()).decode()==dig: ok=True;break
        time.sleep(5)
    return dict(year=y,kind=k,url='https://'+bare,capture=ts,digest=dig,sha1_ok=ok,size=len(b),sha256=hashlib.sha256(b).hexdigest())
with ThreadPoolExecutor(4) as ex: log=list(ex.map(get,open(sys.argv[1])))
for l in log: print(l.get('year'),l.get('kind'),l.get('sha1_ok'),l.get('size'),l.get('err',''))
json.dump(log,open(sys.argv[2],'w'),indent=1)
