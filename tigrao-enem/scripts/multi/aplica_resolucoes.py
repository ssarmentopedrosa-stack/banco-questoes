"""Aplica as resoluções comentadas (geradas por IA, NÃO revisadas pelo professor) de scripts/multi/resolucoes/*.txt
em src/materias/{biologia,quimica,geografia}.json.

Formato de cada bloco:
  @<id da questão>
  K: <conceito-chave>
  <texto em 3–6 frases, terminando em **Resposta: X**>
Bloco sinalizado (raciocínio não chegou ao gabarito oficial com segurança → mostra só o gabarito):
  @<id>
  !
  R: <motivo>
Arquivos posteriores (ordem alfabética) sobrescrevem os anteriores. A letra final é conferida com o gabarito oficial.
"""
import glob, json, os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
R = {}
for f in sorted(glob.glob(f'{ROOT}/scripts/multi/resolucoes/*.txt')):
    for blk in re.split(r'\n(?=@ENEM)', open(f, encoding='utf-8').read().strip()):
        if blk.startswith('@'):
            R[blk.split('\n', 1)[0][1:].strip()] = blk
sinal, erros, cont = [], [], {}
for m in ('biologia', 'quimica', 'geografia'):
    p = f'{ROOT}/src/materias/{m}.json'
    d = json.load(open(p, encoding='utf-8'))
    n = 0
    for q in d['questions']:
        b = R.get(q['id'])
        q['explanation'] = None
        if not b:
            erros.append((q['id'], 'sem resolução')); continue
        linhas = b.split('\n')[1:]
        if linhas and linhas[0].strip() == '!':
            motivo = next((l[2:].strip() for l in linhas if l.startswith('R:')), '')
            sinal.append({'id': q['id'], 'materia': m, 'gabaritoOficial': q['answer'], 'motivo': motivo}); continue
        k = linhas[0][2:].strip() if linhas[0].startswith('K:') else ''
        texto = '\n'.join(l for l in linhas[1 if k else 0:]).strip()
        mm = re.search(r'\*\*Resposta: ([A-E])\*\*\s*$', texto)
        if not mm or mm.group(1) != q['answer']:
            erros.append((q['id'], 'letra final diferente do gabarito oficial')); continue
        q['explanation'] = {'markdown': texto, 'keyConcept': k, 'commonMistake': '', 'lowConfidence': False, 'author': 'IA', 'reviewed': False}
        n += 1
    d['meta']['comExplicacao'] = n
    d['meta']['revisadas'] = 0
    json.dump(d, open(p, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    cont[m] = n
json.dump(sinal, open(f'{ROOT}/scripts/multi/resolucoes_sinalizadas.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('resoluções:', cont, '| sinalizadas:', [s['id'] for s in sinal])
if erros:
    print('ERROS:', erros); sys.exit(1)
