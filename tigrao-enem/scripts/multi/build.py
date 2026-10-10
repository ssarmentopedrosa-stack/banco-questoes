#!/usr/bin/env python3
"""Gera src/materias/{biologia,quimica,geografia}.json do Tigrão ENEM.

Fonte do texto/figuras: dataset aberto enem.dev (yunger7/enem-api, GPL-2.0), que reproduz as provas do Inep (caderno azul).
Gabarito: SEMPRE o oficial do Inep (PDFs baixados de cópias do Wayback Machine com SHA-1 conferido no CDX).
Regras (nunca inventa questão nem gabarito):
  - entra só questão cujo gabarito do dataset == gabarito oficial do Inep (divergência => fora);
  - anuladas => fora; sem gabarito oficial disponível (CH 2010) => fora;
  - texto conferido contra o texto da prova oficial (PDF do Inep): se < 90% das palavras do PDF aparecem no
    dataset (+ OCR das figuras do dataset), a questão fica fora ("texto incompleto");
  - figura ausente / alternativa vazia => fora.
"""
import sys, os, re, json, shutil, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from quality import quality, items, G
from classify import LEX, score, tokens, norm
from topics import TOPICOS
from PIL import Image
from pdf_extract import extrai
PDFL = json.load(open('/workspace/enem_multi/labels/pdf_labels.json'))

APP = sys.argv[1]  # .../tigrao-enem
FIS = json.load(open('/workspace/enem_multi/fisica_publico.json'))['questions']
fis = {(int(q['year']), q['source']['number']): q['domain'] for q in FIS}
OVR = json.load(open('/workspace/enem_multi/labels/cn_overrides.json'))
GEO = set(json.load(open('/workspace/enem_multi/labels/ch_geografia.json'))['ids'])
NOME = {'B': 'biologia', 'Q': 'quimica', 'G': 'geografia'}

def materia(q):
    k = f"{q['year']}-{q['index']}"
    if q['_area'] == 'CN':
        d = fis.get((q['year'], q['index']))
        if d and d != 'INTERFACE_FISICA': return 'F'
        if k in OVR: return OVR[k]
        t = tokens(q); b = score(t, LEX['BIO']); c = score(t, LEX['QUI'])
        return 'B' if b > c else 'Q' if c > b else 'X'
    return 'G' if k in GEO else 'H'

def topico(mat, q):
    t = tokens(q)
    best, bs = None, 0
    for nome, lex in TOPICOS[mat]:
        s = score(t, lex)
        if s > bs: best, bs = nome, s
    return best or TOPICOS[mat][-1][0]

def limpa(s):
    s = s or ''
    s = re.sub(r'\\([\-\*_\[\]\(\)#.+!>])', r'\1', s)
    s = re.sub(r'(?<![\w*])_([^_\n]+?)_(?![\w*])', r'\1', s)
    s = re.sub(r'[ \t]+\n', '\n', s)
    s = re.sub(r'\n{3,}', '\n\n', s)
    return s.strip()

def figura(src, dst_rel):
    dst = os.path.join(APP, 'public', dst_rel)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    im = Image.open(src)
    if im.mode not in ('RGB', 'RGBA', 'L'): im = im.convert('RGBA')
    im.save(dst, 'WEBP', quality=90, method=6)
    return im.size

def qid(q):
    y, n = q['year'], q['index']
    if q['_area'] == 'CN':
        return f"ENEM-CN-{y}-REG-D2-C7-Q{n}" if y >= 2017 else f"ENEM-CN-{y}-REG-D1-C1-Q{n}", (7 if y >= 2017 else 1)
    return f"ENEM-CH-{y}-REG-D1-C1-Q{n}", 1

def main():
    out = {m: [] for m in NOME.values()}
    fora = {m: collections.Counter() for m in list(NOME.values()) + ['CH-nao-classificada']}
    fora_ano = {m: collections.Counter() for m in fora}
    lista_fora = []
    pdf_items = []
    for y in (2024, 2025):
        for n in range(46, 136):
            qp, mp = extrai(y, n)
            area_ = 'CH' if n <= 90 else 'CN'
            if (y, n) in fis and fis[(y, n)] != 'INTERFACE_FISICA': continue
            lab = PDFL.get(f'{y}-{n}')
            if qp and lab in ('B', 'Q', 'G'): pdf_items.append((lab, qp)); continue
            if qp and lab is None and area_ == 'CN':
                print('AVISO sem rótulo', y, n)
            if not qp:
                key = 'CN-2024-2025-nao-extraida' if area_ == 'CN' else 'CH-nao-classificada'
                fora.setdefault(key, collections.Counter())[mp] += 1
                fora_ano.setdefault(key, collections.Counter())[y] += 1
                lista_fora.append({'materia': key, 'ano': y, 'questao': n, 'motivo': mp})
    for m in NOME.values():
        shutil.rmtree(os.path.join(APP, 'public', 'figuras', m), ignore_errors=True)
    for q in items():
        mat = materia(q)
        ok, motivo = quality(q)
        if mat in ('F', 'X', 'H') and ok: continue
        key = NOME.get(mat) or ('CH-nao-classificada' if q['_area'] == 'CH' else None)
        k_ = f"{q['year']}-{q['index']}"
        if not ok and motivo.startswith('texto incompleto') and PDFL.get(k_) in ('B', 'Q', 'G'):
            qp, mp = extrai(q['year'], q['index'])
            if qp:
                pdf_items.append((PDFL[k_], qp)); continue
        if not ok:
            if mat == 'H': key = 'CH-nao-classificada'
            if key is None: continue
            r = motivo.split(' (')[0]
            fora[key][r] += 1; fora_ano[key][q['year']] += 1
            lista_fora.append({'materia': key, 'ano': q['year'], 'questao': q['index'], 'motivo': motivo})
            continue
        m = NOME[mat]
        id_, booklet = qid(q)
        figs = []
        def repl(mm):
            u = mm.group(1); f = os.path.join(q['_dir'], u.rsplit('/', 1)[1])
            k = len(figs)
            rel = f"figuras/{m}/{q['year']}/{id_}-{k + 1}.webp"
            w, h = figura(f, rel)
            figs.append({'src': './' + rel, 'kind': 'enunciado', 'label': f'Figura {k + 1}', 'width': w, 'height': h})
            return f'\n[[FIG {k}]]\n'
        ctx = re.sub(r'!\[[^\]]*\]\(([^)]*)\)', repl, q['context'] or '')
        statement = limpa(ctx + '\n\n' + (q['alternativesIntroduction'] or ''))
        opts = []
        for a in q['alternatives']:
            o = {'letter': a['letter'], 'text': limpa(a['text'])}
            if a['file']:
                rel = f"figuras/{m}/{q['year']}/{id_}-alt{a['letter']}.webp"
                w, h = figura(os.path.join(q['_dir'], a['file'].rsplit('/', 1)[1]), rel)
                o['img'] = {'src': './' + rel, 'width': w, 'height': h}
            opts.append(o)
        ans = G[str(q['year'])][str(q['index'])]
        assert ans == q['correctAlternative'] and ans in 'ABCDE'
        out[m].append({
            'id': id_, 'year': q['year'], 'area': topico(m, q), 'content': None, 'demand': None,
            'statement': statement, 'options': opts, 'figures': figs, 'number': q['index'], 'booklet': booklet,
            'answer': ans, 'explanation': None,
        })
    for lab, q in pdf_items:
        m = NOME[lab]
        id_, booklet = qid(q)
        out[m].append({
            'id': id_, 'year': q['year'], 'area': topico(m, q), 'content': None, 'demand': None,
            'statement': q['context'], 'options': [{'letter': a['letter'], 'text': a['text']} for a in q['alternatives']],
            'figures': [], 'number': q['index'], 'booklet': booklet, 'answer': q['correctAlternative'], 'explanation': None,
            'textoDoPdf': True,
        })
    os.makedirs(os.path.join(APP, 'src', 'materias'), exist_ok=True)
    resumo = {}
    for m, qs in out.items():
        qs.sort(key=lambda x: (x['year'], x['number']))
        meta = {
            'materia': m,
            'fonteTexto': 'enem.dev (github.com/yunger7/enem-api, GPL-2.0), caderno azul; texto conferido com o PDF oficial do Inep',
            'fonteGabarito': 'Gabaritos oficiais do Inep (caderno azul); 2010 CN: leitura do gabarito oficial (círculos verdes) feita no pipeline de Física',
            'porAno': dict(sorted(collections.Counter(q['year'] for q in qs).items())),
            'foraPorAno': dict(sorted(fora_ano[m].items())),
            'total': len(qs), 'fora': dict(fora[m]),
            'porArea': dict(collections.Counter(q['area'] for q in qs).most_common()),
            'doPdfOficial': sum(1 for q in qs if q.get('textoDoPdf')),
            'comExplicacao': 0, 'revisadas': 0,
            'classificacao': 'automática (palavras-chave) + revisão manual dos casos ambíguos pelo agente; a conferir pelo professor',
        }
        json.dump({'meta': meta, 'questions': qs}, open(os.path.join(APP, 'src', 'materias', m + '.json'), 'w'), ensure_ascii=False, indent=1)
        resumo[m] = meta
    resumo['CN-2024-2025-nao-extraida'] = {'fora': dict(fora.get('CN-2024-2025-nao-extraida', {})), 'foraPorAno': dict(sorted(fora_ano.get('CN-2024-2025-nao-extraida', {}).items()))}
    resumo['CH-nao-classificada'] = {'fora': dict(fora['CH-nao-classificada']), 'foraPorAno': dict(sorted(fora_ano['CH-nao-classificada'].items()))}
    json.dump({'resumo': resumo, 'fora': lista_fora}, open('/workspace/enem_multi/relatorio_build.json', 'w'), ensure_ascii=False, indent=1)
    for m, r in resumo.items(): print(m, json.dumps({k: r.get(k) for k in ('total', 'porAno', 'fora', 'porArea')}, ensure_ascii=False))

if __name__ == '__main__':
    main()
