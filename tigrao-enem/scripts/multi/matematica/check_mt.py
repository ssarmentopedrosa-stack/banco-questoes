"""Checagens do lote de Matemática: contagem por ano, ids únicos (entre todas as matérias), gabarito oficial presente
e igual ao do Inep, nenhuma anulada no jogo, imagens existentes. Uso: python3 check_mt.py <pasta tigrao-enem>"""
import json, sys, os, collections
APP = sys.argv[1]; H = os.path.dirname(os.path.abspath(__file__))
G = json.load(open(os.path.join(H, 'gab_mt.json')))
Q = json.load(open(os.path.join(APP, 'src/materias/matematica.json')))
qs = Q['questions']; erros = []
ids = collections.Counter(q['id'] for q in qs)
for f in ['src/questoes.json'] + [f'src/materias/{m}.json' for m in ('biologia', 'quimica', 'geografia')]:
    for q in json.load(open(os.path.join(APP, f)))['questions']: ids[q['id']] += 1
erros += [f'id repetido {k}' for k, v in ids.items() if v > 1]
for q in qs:
    g = G[str(q['year'])].get(str(q['number']))
    if g in (None, 'ANULADA') or q['answer'] != g or q['answer'] not in 'ABCDE': erros.append(f"gabarito {q['id']}: {q['answer']} x Inep {g}")
    if [o['letter'] for o in q['options']] != list('ABCDE'): erros.append(f"alternativas {q['id']}")
    for o in q['options']:
        if not o['text'].strip() and 'img' not in o: erros.append(f"alternativa vazia {q['id']} {o['letter']}")
    srcs = [f['src'] for f in q['figures']] + [o['img']['src'] for o in q['options'] if 'img' in o]
    for s in srcs:
        if not os.path.exists(os.path.join(APP, 'public', s[2:])): erros.append(f"imagem ausente {s}")
    nfig = q['statement'].count('[[FIG ')
    if nfig > len(q['figures']): erros.append(f"marcador de figura sem figura {q['id']}")
por = collections.Counter(q['year'] for q in qs)
if dict(sorted((str(k), v) for k, v in por.items())) != Q['meta']['porAno']: erros.append('meta.porAno não bate')
c = json.load(open(os.path.join(APP, 'src/materias/contagem.json')))
if c.get('matematica') != len(qs): erros.append('contagem.json não bate')
print('por ano:', dict(sorted(por.items())), 'total', len(qs))
print('ERROS:' if erros else 'OK: ids únicos, gabarito oficial em todas, nenhuma anulada, imagens existentes', *erros[:30], sep='\n')
sys.exit(1 if erros else 0)
