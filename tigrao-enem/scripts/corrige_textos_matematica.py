"""Correções de texto de Matemática conferidas com o PDF oficial do Inep (caderno 7 azul, 2º dia).
Cada troca exige que o texto antigo esteja lá (senão, já foi aplicada). O gabarito oficial nunca é alterado. Idempotente.
Fontes: PDFs oficiais do Inep (download.inep.gov.br) obtidos pelas cópias da Wayback Machine (o servidor do Inep não envia a cadeia TLS completa):
  2012 caderno_enem2012_dom_azul.pdf, 2020/2021/2022 *_PV_impresso_D2_CD7.pdf, gabarito 2022_GB_impresso_D2_CD7.pdf.
  caderno_enem2012_dom_azul.pdf sha256 3c7822668a69ec3d
  2020_PV_impresso_D2_CD7.pdf sha256 f9970a82e0ee67a3
  2021_PV_impresso_D2_CD7.pdf sha256 887b2a10ebb163f0
  2022_PV_impresso_D2_CD7.pdf sha256 ab4cdea89504ab1b
  gab2022.pdf sha256 1b4b0cd0978bfc6c
Conferidas também (texto já igual ao PDF, sem troca): 2012 Q157 e 2022 Q145 — seguem sinalizadas, sem resolução."""
import json, os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = f'{ROOT}/src/materias/matematica.json'
C = {  # id: [(campo, antes, depois)]; campo = 'statement' ou letra da alternativa
 'ENEM-MT-2020-REG-D2-C7-Q140': [('C', '3 caixas do tipo A e 1 caixa do tipo B.', '3 caixas do tipo A e 2 caixas do tipo B.')],
 'ENEM-MT-2021-REG-D2-C7-Q147': [('statement', 'faz-se nova analise de frequência', 'faz-se nova análise de frequência'),
   ('A', 'A,E,O e S.', 'A, E, O e S.'), ('C', 'D, E, F e G.', 'D, H, R e V.'), ('D', 'D,H,R e V.', 'R, L, B e X.'), ('E', 'X, B L e P.', 'X, B, L e P.')],
 'ENEM-MT-2021-REG-D2-C7-Q165': [('statement', '0,1 L de combustível a cada 10 km percorridos', '0,1 L de combustível a cada 20 km percorridos'),
   ('A', '15,9', '15,9.'), ('B', '16,1', '16,1.'), ('C', '16,4', '16,4.'), ('D', '17,4', '17,4.'), ('E', '18,0', '18,0.')],
}
d = json.load(open(P, encoding='utf-8')); n = 0; erros = []
for q in d['questions']:
    for campo, a, b in C.get(q['id'], []):
        if campo == 'statement':
            if a in q['statement']: q['statement'] = q['statement'].replace(a, b); n += 1
            elif b not in q['statement']: erros.append((q['id'], campo))
        else:
            o = next(o for o in q['options'] if o['letter'] == campo)
            if o['text'] == a: o['text'] = b; n += 1
            elif o['text'] != b: erros.append((q['id'], campo, o['text']))
json.dump(d, open(P, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('trocas', n, '| ERROS', erros); sys.exit(1 if erros else 0)
