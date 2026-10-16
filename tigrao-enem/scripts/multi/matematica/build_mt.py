#!/usr/bin/env python3
"""Gera src/materias/matematica.json do Tigrão ENEM (Matemática, 2º dia, caderno 7 azul, questões 136–180).
Mesmas regras do pipeline das outras matérias (scripts/multi/build.py) — nunca inventa questão nem gabarito:
  - texto/figuras 2009–2023: enem.dev (yunger7/enem-api, GPL-2.0); 2024–2025: transcrição do PDF oficial (só texto);
  - gabarito SEMPRE o oficial do Inep (gab_mt.json); dataset ≠ Inep => fora; anulada => fora;
  - texto conferido com o PDF oficial do Inep (cobertura de palavras >= 90%, contando OCR das figuras do dataset);
  - expoentes/índices: se o PDF tem sobrescritos/subscritos no trecho da questão e o texto do dataset não os traz, fica fora;
  - figura ausente / alternativa vazia / marcação quebrada (\u200b, LaTeX solto) => fora.
Uso: python build_mt.py <pasta tigrao-enem> <pasta de trabalho>
"""
import sys, os, re, json, collections, unicodedata, statistics
import pymupdf
from PIL import Image
APP, W = sys.argv[1], sys.argv[2]
G = json.load(open(f'{W}/gab_mt.json'))
SEG = {y: json.load(open(f'{W}/seg/{y}.json')) for y in range(2009, 2026)}
BASE = f'{W}/enem-api/public'
MANUAL = json.load(open(f'{W}/revisao_pdf_manual.json'))
PDF = {y: pymupdf.open(f'{W}/pdf/{y}_d2prova.pdf') for y in range(2009, 2026)}

def norm(s): return unicodedata.normalize('NFD', s.lower()).encode('ascii', 'ignore').decode()
def words(s): return set(re.findall(r'[a-z]{4,}', norm(s)))
def devtext(q): return re.sub(r'!\[[^\]]*\]\([^)]*\)', ' ', ' '.join([q['context'] or '', q['alternativesIntroduction'] or ''] + [a['text'] or '' for a in q['alternatives']]))
def imgs(q):
    return [os.path.join(q['_dir'], u.rsplit('/', 1)[1]) for u in re.findall(r'!\[[^\]]*\]\(([^)]*)\)', q['context'] or '')]
def ocrtext(q):
    t = ''
    for f in imgs(q) + [os.path.join(q['_dir'], a['file'].rsplit('/', 1)[1]) for a in q['alternatives'] if a['file']]:
        p = f'{W}/ocr/' + os.path.relpath(f, W).replace('/', '_') + '.txt'
        if os.path.exists(p): t += ' ' + open(p).read()
    return t
NOISE = set('questao adaptado caderno azul pagina rascunho matematica tecnologias suas enem dia'.split())

def dataset():
    for y in range(2009, 2024):
        for n in range(136, 181):
            f = f'{BASE}/{y}/questions/{n}/details.json'
            if os.path.exists(f):
                q = json.load(open(f)); q['_dir'] = os.path.dirname(f); yield q
DS = list(dataset())
VOC = set().union(*[words(devtext(q)) for q in DS])

def regions(y, n):
    s = SEG[y].get(str(n)); out = {}
    if not s: return out
    for pi, col, x0, y0, x1, y1 in s['regions']:
        b = out.setdefault((pi, col), [x0, y0, x1, y1]); b[0] = min(b[0], x0); b[1] = min(b[1], y0); b[2] = max(b[2], x1); b[3] = max(b[3], y1)
    return out

SUPRX = re.compile(r'^[\d−\-+–,.n ]{1,5}$')
def pdf_supsub(y, n):
    """conta spans pequenos e deslocados da linha (sobrescrito/subscrito) no trecho da questão no PDF"""
    c = 0
    for (pi, col), b in regions(y, n).items():
        page = PDF[y][pi]; R = pymupdf.Rect(b)
        d = page.get_text('dict', clip=R)
        sizes = [s['size'] for bl in d['blocks'] if bl['type'] == 0 for l in bl['lines'] for s in l['spans'] if s['text'].strip()]
        if not sizes: continue
        body = statistics.median(sizes)
        for bl in d['blocks']:
            if bl['type'] != 0: continue
            for l in bl['lines']:
                sp = [s for s in l['spans'] if s['text'].strip()]
                if len(sp) < 2: continue
                big = [s for s in sp if s['size'] >= 0.9 * body]
                if not big: continue
                base = statistics.median([s['origin'][1] for s in big])
                for s in sp:
                    if s['size'] < 0.85 * body and SUPRX.match(s['text'].strip()) and abs(s['origin'][1] - base) > 1.0:
                        c += 1
    return c
SUPCH = set('⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺ⁿ₀₁₂₃₄₅₆₇₈₉')
def ds_supsub(t): return sum(ch in SUPCH for ch in t) + t.count('^') + len(re.findall(r'_\{|_\d', t))

def quality(q):
    y, n = q['year'], q['index']
    k = G[str(y)].get(str(n))
    if k is None: return False, 'sem gabarito oficial disponível'
    if k == 'ANULADA': return False, 'anulada pelo Inep'
    if k != q['correctAlternative']: return False, f'gabarito do dataset ({q["correctAlternative"]}) diverge do oficial do Inep ({k})'
    if len(q['alternatives']) != 5: return False, 'alternativas incompletas'
    full = devtext(q) + ' ' + ' '.join(re.findall(r'!\[([^\]]*)\]', q['context'] or ''))
    if '\u200b' in full or re.search(r'\\[a-zA-Z]+|\\\[|\\\(', full) or '^' in full:
        return False, 'notação matemática com marcação quebrada/LaTeX no dataset'
    for a in q['alternatives']:
        if not (a['text'] or '').strip() and not a['file']: return False, 'alternativa vazia'
        if a['file'] and not os.path.exists(os.path.join(q['_dir'], a['file'].rsplit('/', 1)[1])): return False, 'imagem de alternativa ausente'
    for f in imgs(q):
        if not os.path.exists(f) or 'broken' in f: return False, 'figura ausente'
    if 'broken-image' in (q['context'] or ''): return False, 'figura ausente'
    s = SEG[y].get(str(n))
    if not s: return False, 'questão não localizada no PDF oficial'
    pw = set(w for w in words(s['text']) if w in VOC and w not in NOISE)
    dw = words(devtext(q) + ' ' + ocrtext(q))
    c = len(pw & dw) / max(1, len(pw))
    vis = len(re.sub(r'!\[[^\]]*\]\([^)]*\)', '', (q['context'] or '') + (q['alternativesIntroduction'] or '')).strip())
    if len(pw) >= 10:
        if c < 0.9: return False, 'texto incompleto em relação à prova oficial (cobertura %.0f%%)' % (c * 100)
    elif vis < 200: return False, 'texto não conferível com a prova oficial e curto'
    ps = pdf_supsub(y, n)
    if ps and ds_supsub(devtext(q) + ' ' + ocrtext(q)) < ps:
        return False, f'expoente/índice da prova oficial ausente no texto do dataset ({ps} no PDF)'
    return True, 'ok'

# ---------- extração do PDF (2024–2025 e fallback): SÓ questões de texto puro ----------
def has_figure(y, n):
    for (pi, col), b in regions(y, n).items():
        page = PDF[y][pi]; R = pymupdf.Rect(b)
        for im in page.get_image_info():
            r = pymupdf.Rect(im['bbox'])
            if min(r.width, r.height) < 40 or r.x0 < 20 or r.y0 > page.rect.height * 0.94: continue
            if (r & R).get_area() > 0.3 * r.get_area(): return True
        for dr in page.get_drawings():
            r = dr['rect']
            if not r.intersects(R): continue
            if r.width < 8 or r.height < 8 or r.x0 < 20 or r.y0 > page.rect.height * 0.94: continue
            if (r & R).get_area() > 0.3 * r.get_area() and r.width * r.height > 600: return True
    return False
def lixo(l):
    s = l.strip()
    if re.search(r'(ENEM20\d\d){2,}', s) or re.search(r'(\d{4}MENE){2,}', s): return True
    if len(s) > 40 and ' ' not in s: return True
    if re.fullmatch(r'\*?[A-Z0-9]{8,}\*?', s): return True
    if re.search(r'Página \d+|CADERNO \d|Caderno \d|\d+º DIA|º DIA', s) and len(s) < 80: return True
    return False
def junta(linhas):
    t = '\n'.join(linhas)
    t = re.sub(r'(\w)-\n([a-zà-ú])', r'\1\2', t)
    t = re.sub(r'(?<![.:?!;)\n])\n(?=[a-zà-ú0-9(“"])', ' ', t)
    t = re.sub(r'(?m)^([^\n]{48,}[^.:?!;\n])\n(?=[A-ZÀ-Ú])', r'\1 ', t)
    return re.sub(r'[ \t]{2,}', ' ', t).strip()
def extrai(y, n):
    s = SEG[y].get(str(n))
    if not s: return None, 'sem texto no PDF'
    k = G[str(y)].get(str(n))
    if k is None: return None, 'sem gabarito oficial disponível'
    if k == 'ANULADA': return None, 'anulada pelo Inep'
    if f'{y}-{n}' in MANUAL: return None, 'rejeitada na leitura manual da transcrição: ' + MANUAL[f'{y}-{n}']
    if has_figure(y, n): return None, 'tem figura/tabela (não transcrita nesta rodada)'
    if pdf_supsub(y, n): return None, 'tem expoente/índice (não transcrito nesta rodada)'
    brutas = [l for l in s['text'].split('\n') if l.strip()]
    for l in brutas:
        t = l.strip()
        if lixo(l) and not re.search(r'Página \d+|CADERNO \d|Caderno \d|º DIA|(ENEM20\d\d){2,}|(\d{4}MENE){2,}', t) and not re.fullmatch(r'\*?[A-Z0-9]{8,}\*?', t):
            return None, 'linha ilegível no PDF (fonte codificada)'
        if re.search(r'[A-Z]{4,}[a-zà-ú]?[A-Z]{3,}', t) and not re.fullmatch(r'[A-ZÀ-Ú0-9 ,.:;()–-]+', t):
            return None, 'linha ilegível no PDF (fonte codificada)'
        toks = t.split()
        if len(toks) >= 4 and sum(bool(re.fullmatch(r'[\d.,%°]+', x)) for x in toks) / len(toks) >= 0.6:
            return None, 'tem tabela (não transcrita nesta rodada)'
    linhas = [l for l in brutas if not lixo(l)]
    if linhas and re.match(r'\s*(QUEST[ÃA]O|Quest[ãa]o)\s*\d*\s*$', linhas[0]): linhas = linhas[1:]
    if linhas and re.fullmatch(r'\d{1,3}', linhas[0].strip()): linhas = linhas[1:]
    def parse(rx):
        starts = [i for i, l in enumerate(linhas) if re.match(rx.replace('L', 'A'), l)]
        for st in reversed(starts):
            alts = {}; cur = None
            for l in linhas[st:]:
                m = re.match(rx.replace('L', '([A-E])'), l)
                if m and cur != 'Z' and (cur is None or ord(m.group(1)) == ord(cur) + 1):
                    cur = m.group(1); alts[cur] = [l[m.end():].strip()] if l[m.end():].strip() else []; continue
                if cur and cur != 'Z':
                    if len(alts[cur]) >= 3 or (alts[cur] and re.search(r'[.?!]$', alts[cur][-1]) and re.match(r'[A-ZÀ-Ú]', l)): cur = 'Z'; continue
                    alts[cur].append(l)
            if list(alts) == list('ABCDE'): return linhas[:st], alts
        return linhas, {}
    enun, alts = parse(r'^L\t\s*')
    if not alts: enun, alts = parse(r'^L\s+(?=\S)')
    if list(alts) != list('ABCDE'): return None, 'alternativas não reconhecidas no PDF'
    opts = [{'letter': L, 'text': junta(v)} for L, v in alts.items()]
    st = junta(enun); tudo = st + ' ' + ' '.join(o['text'] for o in opts)
    if any(len(o['text']) == 0 for o in opts): return None, 'alternativa vazia'
    if re.search(r'[\uf000-\uf8ff\ufffd]', tudo): return None, 'caracteres ilegíveis no PDF'
    if any(re.fullmatch(r'[\d+\-−]{1,2}', l.strip()) for l in enun): return None, 'subscrito/sobrescrito quebrado no PDF'
    ws = re.findall(r'[a-z]{4,}', tudo.lower())
    ruins = [w for w in ws if re.search(r'[wky]|q(?!u)|[^aeiouáéíóúâêôãõ]{5,}', w) or not re.search(r'[aeiouáéíóúâêôãõ]', w)]
    if ws and len(ruins) / len(ws) > 0.06: return None, 'texto do PDF com palavras ilegíveis'
    if len(st) < 80: return None, 'enunciado curto demais'
    st = re.sub(r'\n[ \t]*\n+', '\n', re.sub(r'(?m)^[ \t]+', '', st))
    return {'statement': unicodedata.normalize('NFC', st), 'options': [{'letter': o['letter'], 'text': unicodedata.normalize('NFC', o['text'])} for o in opts], 'answer': k}, 'ok'

# ---------- temas ----------
def L(s): return [w.replace('_', ' ') for w in s.split()]
TOPICOS = [
 ('Estatística e Probabilidade', L("probabilidade media mediana moda desvio_padrao variancia estatistic grafico_de tabela frequencia sorteio sortead aleatori chance dado_honesto amostra pesquisa percentual_dos combinac permutac arranjo anagrama contagem maneiras_distintas modos_distintos possibilidades")),
 ('Geometria Espacial', L("cubo prisma piramide cilindro cone esfera volume volumes paralelepipedo poliedro vertice vertices arestas faces solido tronco capacidade litros reservatorio caixa_d'agua embalagem planificac projecao_ortogonal m3 cm3 m³ cm³ dm³")),
 ('Geometria Plana', L("triangulo quadrado retangulo circulo circunferencia raio diametro angulo angulos area areas perimetro losango trapezio hexagono poligono pitagoras hipotenusa cateto seno cosseno tangente semelhan simetria rotacao reflexao plano_cartesiano coordenadas reta retas paralel perpendicular m2 m² cm² km² escala mapa planta_baixa")),
 ('Álgebra e Funções', L("funcao funcoes grafico equacao equacoes inequac polinom parabola exponencial logaritm progressao_aritmetica progressao_geometrica sequencia termo_geral sistema linear incognita variavel crescente decrescente maximo minimo vertice_da_parabola expressao formula matriz matrizes")),
 ('Porcentagem e Matemática Financeira', L("porcentagem percentual juros juro desconto lucro prejuizo acrescimo aumento reducao reajuste parcela parcelas prestac montante capital taxa investimento poupanca financiamento imposto salario preco precos custo r$ % inflacao")),
 ('Razão, Proporção e Grandezas', L("razao proporc proporcional regra_de_tres escala velocidade km/h densidade consumo conversao unidade unidades medida medidas grandeza mdc mmc divisor multiplo fracao numero_decimal notacao_cientifica arredond tempo horas minutos")),
]
def topico(texto):
    t = norm(texto); best, bs = None, 0
    for nome, lex in TOPICOS:
        s = sum(1 for w in lex if re.search(r'(?<![a-z0-9])' + re.escape(norm(w)) + (r'(?![a-z0-9])' if len(w) <= 5 else ''), t))
        if s > bs: best, bs = nome, s
    return best or 'Razão, Proporção e Grandezas'

def limpa(s):
    s = s or ''
    s = re.sub(r'\\([\-\*_\[\]\(\)#.+!>])', r'\1', s)
    s = re.sub(r'(?<![\w*])_([^_\n]+?)_(?![\w*])', r'\1', s)
    s = s.replace('\xa0', ' ')
    s = re.sub(r'[ \t]+\n', '\n', s); s = re.sub(r'[ \t]{2,}', ' ', s)
    s = re.sub(r'\n{3,}', '\n\n', s)
    return unicodedata.normalize('NFC', s.strip())
def figura(src, rel):
    dst = os.path.join(APP, 'public', rel); os.makedirs(os.path.dirname(dst), exist_ok=True)
    im = Image.open(src)
    if im.mode not in ('RGB', 'RGBA', 'L'): im = im.convert('RGBA')
    im.save(dst, 'WEBP', quality=90, method=6); return im.size
def qid(y, n): return f'ENEM-MT-{y}-REG-D2-C7-Q{n}'

def main():
    import shutil
    shutil.rmtree(os.path.join(APP, 'public', 'figuras', 'matematica'), ignore_errors=True)
    out, fora = [], []
    dsmap = {(q['year'], q['index']): q for q in DS}
    for y in range(2009, 2026):
        for n in range(136, 181):
            q = dsmap.get((y, n)); id_ = qid(y, n)
            if q is not None:
                ok, motivo = quality(q)
            else:
                ok, motivo = False, ('ausente no enem.dev' if y <= 2023 else 'transcrição do PDF')
            if not ok:
                # fallback: transcrição do PDF oficial (só texto puro), menos para anulada/divergente
                if not motivo.startswith(('anulada', 'gabarito do dataset', 'sem gabarito')):
                    qp, mp = extrai(y, n)
                    if qp:
                        out.append({'id': id_, 'year': y, 'area': topico(qp['statement'] + ' ' + ' '.join(o['text'] for o in qp['options'])), 'content': None, 'demand': None,
                                    'statement': qp['statement'], 'options': qp['options'], 'figures': [], 'number': n, 'booklet': 7,
                                    'answer': qp['answer'], 'explanation': None, 'textoDoPdf': True})
                        continue
                    motivo = motivo + ('; PDF: ' + mp if y <= 2023 else '') if y <= 2023 else mp
                fora.append({'materia': 'matematica', 'ano': y, 'questao': n, 'motivo': motivo}); continue
            figs = []
            def repl(mm):
                u = mm.group(1); f = os.path.join(q['_dir'], u.rsplit('/', 1)[1]); k = len(figs)
                rel = f'figuras/matematica/{y}/{id_}-{k + 1}.webp'; w, h = figura(f, rel)
                figs.append({'src': './' + rel, 'kind': 'enunciado', 'label': f'Figura {k + 1}', 'width': w, 'height': h})
                return f'\n[[FIG {k}]]\n'
            ctx = re.sub(r'!\[[^\]]*\]\(([^)]*)\)', repl, q['context'] or '')
            statement = limpa(ctx + '\n\n' + (q['alternativesIntroduction'] or ''))
            opts = []
            for a in q['alternatives']:
                o = {'letter': a['letter'], 'text': limpa(a['text'])}
                if a['file']:
                    rel = f'figuras/matematica/{y}/{id_}-alt{a["letter"]}.webp'
                    w, h = figura(os.path.join(q['_dir'], a['file'].rsplit('/', 1)[1]), rel)
                    o['img'] = {'src': './' + rel, 'width': w, 'height': h}
                opts.append(o)
            ans = G[str(y)][str(n)]; assert ans == q['correctAlternative'] and ans in 'ABCDE'
            out.append({'id': id_, 'year': y, 'area': topico(devtext(q) + ' ' + ocrtext(q)), 'content': None, 'demand': None,
                        'statement': statement, 'options': opts, 'figures': figs, 'number': n, 'booklet': 7,
                        'answer': ans, 'explanation': None})
    out.sort(key=lambda x: (x['year'], x['number']))
    fc = collections.Counter(f['motivo'].split(' (')[0].split(';')[0] for f in fora)
    meta = {
        'materia': 'matematica',
        'fonteTexto': 'enem.dev (github.com/yunger7/enem-api, GPL-2.0), 2º dia, caderno 7 azul; texto conferido com o PDF oficial do Inep. 2024–2025: transcrito do PDF oficial do Inep (só questões sem figura/tabela/expoente)',
        'fonteGabarito': 'Gabaritos oficiais do Inep, 2º dia, caderno 7 azul (PDFs via Wayback Machine com SHA-1 conferido); 2010: prova azul com gabarito marcado pelo Inep (AZUL_Domingo_GAB.pdf)',
        'porAno': dict(sorted(collections.Counter(q['year'] for q in out).items())),
        'foraPorAno': dict(sorted(collections.Counter(f['ano'] for f in fora).items())),
        'total': len(out), 'fora': dict(fc),
        'porArea': dict(collections.Counter(q['area'] for q in out).most_common()),
        'doPdfOficial': sum(1 for q in out if q.get('textoDoPdf')), 'comExplicacao': 0, 'revisadas': 0,
        'classificacao': 'automática (palavras-chave); a conferir pelo professor',
    }
    json.dump({'meta': meta, 'questions': out}, open(os.path.join(APP, 'src', 'materias', 'matematica.json'), 'w'), ensure_ascii=False, indent=1)
    json.dump({'resumo': meta, 'fora': fora}, open(os.path.join(APP, 'scripts', 'multi', 'matematica', 'relatorio_build_matematica.json'), 'w'), ensure_ascii=False, indent=1)
    print(json.dumps({k: meta[k] for k in ('total', 'porAno', 'foraPorAno', 'fora', 'porArea', 'doPdfOficial')}, ensure_ascii=False, indent=0))

if __name__ == '__main__':
    main()
