#!/usr/bin/env python3
"""Procura lixo de PDF (carimbo de impressão com caracteres dobrados, rodapé "7 | AZUL 9", "CH - 1º dia",
"Página N", datas/horas de impressão) nos enunciados/alternativas de TODAS as matérias.
Uso: python3 scripts/checa_lixo.py          → lista e sai com 1 se achar algo
     python3 scripts/checa_lixo.py --fix    → remove só as LINHAS inteiras que são comprovadamente lixo e lista o que mudou"""
import json, re, sys, os, glob
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARQ = [os.path.join(ROOT, 'src/questoes.json')] + sorted(glob.glob(os.path.join(ROOT, 'src/materias/*.json')))
COR = r'(AZUL|AMARELO|ROSA|BRANCO|CINZA|VERDE|LARANJA)'
def dobrado(t): return len(t) >= 4 and len(t) % 2 == 0 and all(t[i] == t[i + 1] for i in range(0, len(t), 2))
def linha_lixo(l):
    s = l.strip()
    r = re.sub(r'^\d{1,2}\s*\|\s*' + COR + r'\s*\d{0,3}\s*', '', s)
    toks = r.split()
    if toks and all(dobrado(t) for t in toks) and re.search(r'[/:]', r): return True        # carimbo dobrado
    if re.fullmatch(r'(CN|CH|LC|MT)\s*[-–]\s*\d\s*[ºo°]\s*dia.*', s): return True
    if re.fullmatch(r'QUEST[ÃAã]O\s*\d{1,3}', s, re.I): return True                        # cabeçalho da questão
    if re.fullmatch(r'(P[aá]gina|Pág\.)\s*\d+', s, re.I): return True
    if re.fullmatch(r'\d{2}/\d{2}/\d{4}\s+\d{1,2}:\d{2}(:\d{2})?', s): return True            # data/hora de impressão
    if re.fullmatch(r'\S+\.indd\s+\d+.*', s): return True
    if re.fullmatch(r'(CADERNO\s*\d+\s*[|•]?\s*)?' + COR + r'(\s*[|•]\s*\d+)?', s): return True
    return False
SUSPEITO = [r'(\d)\1(\d)\2//', r'\d\d::\d\d', r'\b(CN|CH|LC|MT)\s*[-–]\s*\d\s*[ºo°]\s*dia', r'P[aá]gina\s+\d+\b', r'\.indd\b']
fix = '--fix' in sys.argv; achou = []
for f in ARQ:
    d = json.load(open(f)); mudou = False
    if 'questions' not in d: continue
    for q in d['questions']:
        campos = [('statement', q, 'statement')] + [(f'alt {o["letter"]}', o, 'text') for o in (q.get('options') or [])]
        for nome, obj, k in campos:
            t = obj.get(k) or ''
            ls = t.split('\n'); novas = [l for l in ls if not linha_lixo(l)]
            if len(novas) != len(ls):
                rem = [l for l in ls if linha_lixo(l)]
                achou.append((os.path.basename(f), q['id'], nome, rem))
                if fix: obj[k] = '\n'.join(novas).rstrip(); mudou = True
            else:
                for rx in SUSPEITO:
                    m = re.search(rx, t)
                    if m: achou.append((os.path.basename(f), q['id'], nome, ['SUSPEITO (não removido): ' + t[max(0, m.start() - 30):m.end() + 30]]))
    if mudou: json.dump(d, open(f, 'w'), ensure_ascii=False, indent=1)
for a in achou: print(*a[:3], '→', ' | '.join(a[3]))
print(('removido' if fix else 'encontrado'), len(achou))
sys.exit(1 if achou and not fix else 0)
