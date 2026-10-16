"""Atualiza (idempotente) scripts/multi/revisao_professor.csv e fora_do_banco.csv com o lote de Matemática
e grava scripts/multi/matematica/revisao_professor_matematica.csv (mesmas colunas + fonte_gabarito).
Uso: python3 csv_mt.py <pasta tigrao-enem>"""
import csv, json, sys, os, re
APP = sys.argv[1]; M = os.path.join(APP, 'scripts', 'multi')
Q = json.load(open(os.path.join(APP, 'src', 'materias', 'matematica.json')))['questions']
R = json.load(open(os.path.join(M, 'matematica', 'relatorio_build_matematica.json')))['fora']
def ini(s): return re.sub(r'\s+', ' ', re.sub(r'\[\[FIG \d+\]\]', ' ', s)).strip()[:120]
linhas = [['matematica', q['year'], q['number'], q['id'], q['area'], q['answer'], 'sim' if q.get('textoDoPdf') else '', len(q['figures']), ini(q['statement'])] for q in Q]
p = os.path.join(M, 'revisao_professor.csv')
rows = list(csv.reader(open(p, encoding='utf-8')))
rows = [rows[0]] + [r for r in rows[1:] if r[0] != 'matematica'] + linhas
csv.writer(open(p, 'w', encoding='utf-8', newline='')).writerows(rows)
fg = lambda y: 'Inep 2010 AZUL_Domingo_GAB.pdf (prova azul com gabarito marcado)' if y == 2010 else f'Inep {y} gabarito 2º dia caderno 7 azul'
with open(os.path.join(M, 'matematica', 'revisao_professor_matematica.csv'), 'w', encoding='utf-8', newline='') as f:
    w = csv.writer(f); w.writerow(rows[0] + ['fonte_gabarito', 'tema_correto_professor', 'ok_professor', 'observacao'])
    for l in linhas: w.writerow(l + [fg(l[1]), '', '', ''])
p = os.path.join(M, 'fora_do_banco.csv')
rows = list(csv.reader(open(p, encoding='utf-8')))
rows = [rows[0]] + [r for r in rows[1:] if r[0] != 'matematica'] + [['matematica', f['ano'], f['questao'], f['motivo']] for f in R]
csv.writer(open(p, 'w', encoding='utf-8', newline='')).writerows(rows)
print(len(linhas), 'na revisão;', len(R), 'fora')
