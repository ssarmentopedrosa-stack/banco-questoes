"""Extrai do PDF oficial do Inep as questões SÓ DE TEXTO (sem figura/tabela detectada), para 2024–2025
e para as de 2009–2023 cujo texto no enem.dev veio incompleto. Gabarito sempre do Inep."""
import re, json, sys
sys.path.insert(0,'/workspace/enem_multi')
from pdfq import SEG, has_figure
from check import voc, words
G=json.load(open('/workspace/enem_multi/gab/gabaritos.json'))
def area(y,n):
    if y==2009: return 'CN' if 1<=n<=45 else 'CH' if 46<=n<=90 else None
    if y<=2016: return 'CH' if 1<=n<=45 else 'CN' if 46<=n<=90 else None
    return 'CH' if 46<=n<=90 else 'CN' if 91<=n<=135 else None
def lixo(l):
    s=l.strip()
    if re.search(r'(ENEM20\d\d){2,}',s) or re.search(r'(\d{4}MENE){2,}',s): return True
    if len(s)>40 and ' ' not in s: return True
    if re.fullmatch(r'\*?[A-Z0-9]{8,}\*?',s): return True
    if re.search(r'Página \d+|CADERNO \d|Caderno \d|\d+º DIA|º DIA',s) and len(s)<80: return True
    return False
def junta(linhas):
    t='\n'.join(linhas)
    t=re.sub(r'(\w)-\n([a-zà-ú])',r'\1\2',t)
    t=re.sub(r'(?<![.:?!;)\n])\n(?=[a-zà-ú0-9(“"])',' ',t)
    t=re.sub(r'(?m)^([^\n]{48,}[^.:?!;\n])\n(?=[A-ZÀ-Ú])',r'\1 ',t)
    return re.sub(r'[ \t]{2,}',' ',t).strip()
def extrai(y,n):
    s=SEG[y].get(str(n))
    if not s: return None,'sem texto no PDF'
    k=G.get(str(y),{}).get(str(n))
    if k is None: return None,'sem gabarito oficial disponível'
    if k=='ANULADA': return None,'anulada pelo Inep'
    if k not in list('ABCDE'): return None,'gabarito ilegível'
    if has_figure(y,n): return None,'tem figura/tabela (não extraída nesta rodada)'
    linhas=[l for l in s['text'].split('\n') if l.strip() and not lixo(l)]
    if linhas and re.match(r'\s*(QUEST[ÃA]O|Quest[ãa]o)\s*\d*\s*$',linhas[0]): linhas=linhas[1:]
    if linhas and re.fullmatch(r'\d{1,3}',linhas[0].strip()): linhas=linhas[1:]
    def parse(rx):
        # procura a ÚLTIMA sequência A..E (assim um "A internet..." no enunciado não vira alternativa)
        starts=[i for i,l in enumerate(linhas) if re.match(rx.replace('L','A'),l)]
        for st in reversed(starts):
            alts={};cur=None
            for l in linhas[st:]:
                m=re.match(rx.replace('L','([A-E])'),l)
                if m and cur!='Z' and (cur is None or ord(m.group(1))==ord(cur)+1):
                    cur=m.group(1); alts[cur]=[l[m.end():].strip()] if l[m.end():].strip() else []; continue
                if cur and cur!='Z':
                    if len(alts[cur])>=3 or (alts[cur] and re.search(r'[.?!]$',alts[cur][-1]) and re.match(r'[A-ZÀ-Ú]',l)): cur='Z'; continue
                    alts[cur].append(l)
            if list(alts)==list('ABCDE'): return linhas[:st],alts
        return linhas,{}
    enun,alts=parse(r'^L\t\s*')
    if not alts: enun,alts=parse(r'^L\s+(?=\S)')
    if list(alts)!=list('ABCDE'): return None,'alternativas não reconhecidas no PDF'
    opts=[{'letter':L,'text':junta(v),'file':None} for L,v in alts.items()]
    st=junta(enun)
    tudo=st+' '+' '.join(o['text'] for o in opts)
    if any(len(o['text'])==0 for o in opts): return None,'alternativa vazia'
    if re.search(r'[\uf000-\uf8ff\ufffd]',tudo): return None,'caracteres ilegíveis no PDF'
    if any(re.fullmatch(r'[\d+\-−]{1,2}',l.strip()) for l in enun): return None,'subscrito/sobrescrito quebrado no PDF'
    ws=re.findall(r'[a-z]{4,}',tudo.lower())
    ruins=[w for w in ws if re.search(r'[wky]|q(?!u)|[^aeiouáéíóúâêôãõ]{5,}',w) or not re.search(r'[aeiouáéíóúâêôãõ]',w)]
    if ws and len(ruins)/len(ws)>0.06: return None,'texto do PDF com palavras ilegíveis'
    if len(st)<80: return None,'enunciado curto demais'
    return {'year':y,'index':n,'_area':area(y,n),'context':st,'alternativesIntroduction':'','alternatives':opts,
            'correctAlternative':k,'files':[],'_dir':None,'_fonte':'pdf','language':None},'ok'
