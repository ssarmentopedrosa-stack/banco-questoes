"""Correções de texto (idempotente) nos bancos do Tigrão ENEM. Não mexe em gabarito.
Uso: python3 scripts/multi/corrige_textos.py   (rodar da pasta tigrao-enem; usa /workspace/enem_multi/seg p/ acentos)
"""
import json, re, os, sys, unicodedata, collections

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SEG = '/workspace/enem_multi/seg'
CONT = collections.Counter()
LOG = []

EL = set('H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pt Au Hg Tl Pb Bi Po Rn Ra U Pu'.split())
NAO_FORMULA = {'B12', 'H1N1', 'H5N1', 'C3', 'C4', 'P1', 'P2', 'P3', 'S1', 'S2', 'K1', 'K2', 'K3', 'I1', 'B1', 'B2', 'B6', 'Co2', 'S1800', 'S500', 'S50', 'S10', 'SP79', 'SP80', 'SP81'}
SUB = str.maketrans('0123456789', '₀₁₂₃₄₅₆₇₈₉')
SUP = str.maketrans('0123456789+-', '⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻')
TOK = re.compile(r'(?<![A-Za-z0-9])((?:[A-Z][a-z]?\d*)+)(?:\s?(\d?)([+\-−–])(?=[\s,.;:)]|$))?')


def eh_formula(t):
    partes = re.findall(r'[A-Z][a-z]?\d*', t)
    return ''.join(partes) == t and all(re.sub(r'\d', '', p) in EL for p in partes)


def _sub(f):
    partes = re.findall(r'[A-Z][a-z]?\d*', f)
    if not re.search(r'\d', f) or f in NAO_FORMULA:
        return f
    if len(partes) == 1 and partes[0][0] in 'CPSKI' and len(partes[0]) <= 3 and partes[0] not in ('O2', 'N2', 'H2', 'O3', 'Cl2'):
        return f
    return f.translate(SUB)


def formulas(txt):
    def rep(m):
        f, carga_d, sinal = m.group(1), m.group(2), m.group(3)
        if not eh_formula(f):
            return m.group(0)
        resto = m.group(0)[len(f):]
        if not sinal:
            return _sub(f)
        partes = re.findall(r'[A-Z][a-z]?\d*', f)
        if resto.startswith(' ') and not carga_d:
            return _sub(f) + resto  # "H2O + CO2": é o sinal de soma
        s = '⁺' if sinal == '+' else '⁻'
        if len(partes) == 1 and not carga_d and re.search(r'\d$', f):
            el = re.sub(r'\d+$', '', f); q = re.search(r'\d+$', f).group(0)
            return el + q.translate(SUP) + s  # Ca2+ → Ca²⁺
        return _sub(f) + ('' if carga_d in ('', '1') else carga_d.translate(SUP)) + s
    return TOK.sub(rep, txt)


def potencias(t):
    t = re.sub(r'(\((?:[A-Z][a-z]?[\d₀-₉]*)+\))(\d+)', lambda m: m.group(1) + m.group(2).translate(SUB), t)
    t = re.sub(r'(\d\s?[×x]\s?10)(\d{2})\b', lambda m: m.group(1) + m.group(2).translate(SUP), t)
    t = re.sub(r'\b(mol|L|g|s|h)\s?[–−-]1\b', lambda m: m.group(1) + '⁻¹', t)
    return re.sub(r'([×x·]\s?10)\s?[-−–]\s?(\d+)\b', lambda m: m.group(1) + ('-' + m.group(2)).translate(SUP), t)


def junta_linhas(t):
    # quebra de linha "de layout" no meio da frase: linha anterior sem pontuação final e próxima começando em minúscula
    return re.sub(r'(?<=[^\s.:;?!\n])\n(?=[a-zà-ú])', ' ', t)


def estrelas(t):
    t2 = re.sub(r'\b([A-ZÀ-Ú])\*\*([a-zà-ú])', r'**\1\2', t)            # I**ntrodução → **Introdução
    t2 = re.sub(r'([a-zà-ú])\*\*([a-zà-ú])', r'\1\2**', t2)            # cabeç**a → cabeça**
    linhas = []
    for ln in t2.split('\n'):
        if ln.count('**') % 2:
            ln = ln.replace('**', '')
        linhas.append(ln)
    return '\n'.join(linhas)


def tira_acento(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn')


_seg = {}
def pdf_palavras(y, n):
    if y not in _seg:
        p = f'{SEG}/{y}.json'
        _seg[y] = json.load(open(p)) if os.path.exists(p) else {}
    s = _seg[y].get(str(n))
    if not s:
        return None
    return re.findall(r'[A-Za-zÀ-ÿ]+', unicodedata.normalize('NFC', s['text']))


AMBIGUAS = {'tem', 'vem', 'esta', 'estas', 'esta', 'pais', 'por', 'pode', 'sede', 'pratica', 'publico', 'critica', 'secretaria', 'valido', 'sabia', 'domino', 'ate', 'nos', 'para', 'pelo', 'pela', 'pelos', 'pelas', 'porque', 'porem', 'ja', 'so', 'ha', 'e', 'a', 'da', 'de', 'do', 'que', 'se'}


def acentos(t, pal):
    if not pal:
        return t
    exatas = {w.lower() for w in pal}
    mapa = collections.defaultdict(set)
    for w in pal:
        if tira_acento(w) != w and len(w) >= 3:
            mapa[tira_acento(w).lower()].add(w.lower())
    def rep(m):
        w = m.group(0)
        if tira_acento(w) != w or w.lower() in exatas or w.lower() in AMBIGUAS:
            return w
        c = mapa.get(w.lower())
        if not c or len(c) != 1:
            return w
        novo = next(iter(c))
        if w[0].isupper():
            novo = novo[0].upper() + novo[1:]
        if w.isupper():
            novo = novo.upper()
        return novo
    return re.sub(r'(?<![A-Za-zÀ-ÿ])[A-Za-z]{3,}(?![A-Za-zÀ-ÿ])', rep, t)


ESPECIFICAS = {
    'ENEM-CN-2019-REG-D2-C7-Q99': [('D eleva o pH', 'Eleva o pH')],
    'ENEM-CN-2023-REG-D2-C7-Q106': [('genoma do hospedeiro. gerando', 'genoma do hospedeiro, gerando')],
    'ENEM-CN-2010-REG-D1-C1-Q53': [('PO4−3', 'PO₄³⁻')],
    'ENEM-CN-2010-REG-D1-C1-Q72': [('miligramas necessárias', 'miligramas necessária'), ('massa molar a 30', 'massa molar igual a 30'),
                                   ('**BAIRD, C. **Química Ambiental**. Ed. Bookmam, 2005 (adaptado).**', 'BAIRD, C. **Química Ambiental**. Ed. Bookmam, 2005 (adaptado).'),
                                   ('9,0 mg/l a 20', '9,0 mg/L a 20')],
    'ENEM-CH-2023-REG-D1-C1-Q67': [('SCHIAVETTI, A. MORAES M. E. B.', 'SCHIAVETTI, A.; MORAES, M. E. B.'), ('2014 (adaptado)\n', '2014 (adaptado).\n\n'),
                                   ('cafe), agricultura ou pastagens.\nSOLLBERG', 'café), agricultura ou pastagens.\n\nSOLLBERG'), ('pastagens.\nSOLLBERG', 'pastagens.\n\nSOLLBERG')],
    'ENEM-CH-2012-REG-D1-C1-Q32': [('I**ntrodução a climatologia para os trópicos**', '**Introdução à climatologia para os trópicos**'),
                                   ('**Introdução a climatologia para os trópicos**', '**Introdução à climatologia para os trópicos**')],
    'ENEM-CH-2015-REG-D1-C1-Q32': [('Acesso em: 1 nov. 2014\n', 'Acesso em: 1 nov. 2014.\n')],
    'ENEM-CN-2015-REG-D1-C1-Q62': [('**Química na cabeç**a.', '**Química na cabeça**.')],
    'ENEM-CN-2017-REG-D2-C7-Q102': [('F**atores ambientais', '**Fatores ambientais'), ('(NH4X , de acordo', '(NH₄X), de acordo')],
    'ENEM-CN-2010-REG-D1-C1-Q65': [('I – NaHCO3 → NA+ + HCO3\n', 'I – NaHCO₃ → Na⁺ + HCO₃⁻\n'), ('III – HCO3 + H+', 'III – HCO₃⁻ + H⁺'),
                                   ('↔H2O', '↔ H₂O'), ('IV – H3A ↔ 3H+ + A−', 'IV – H₃A ↔ 3 H⁺ + A⁻')],
    'ENEM-CN-2016-REG-D1-C1-Q58': [('definido como nproduto R = × 100 nreagente limitante em que', 'definido como R = (n produto ÷ n reagente limitante) × 100, em que')],
    'ENEM-CN-2015-REG-D1-C1-Q71': [('(I) CaCO3 (s) + CO2 (g) + H2O (l) Ca2+ (aq) + 2 HCO3 - (aq)\n(II) HCO3 - (aq) H+ (aq) + CO3 2- (aq) K1 = 3,0×10-11 (III) CaCO3 (s) Ca2+ (aq) + CO3 2- (aq) K2 = 6,0×10-9 (IV) CO2 (g) + H2O (l) H+ (aq) + HCO3 - (aq) K3 = 2,5×10-7 Com base',
                                    '(I) CaCO₃ (s) + CO₂ (g) + H₂O (l) ⇌ Ca²⁺ (aq) + 2 HCO₃⁻ (aq)\n(II) HCO₃⁻ (aq) ⇌ H⁺ (aq) + CO₃²⁻ (aq)   K₁ = 3,0 × 10⁻¹¹\n(III) CaCO₃ (s) ⇌ Ca²⁺ (aq) + CO₃²⁻ (aq)   K₂ = 6,0 × 10⁻⁹\n(IV) CO₂ (g) + H₂O (l) ⇌ H⁺ (aq) + HCO₃⁻ (aq)   K₃ = 2,5 × 10⁻⁷\n\nCom base')],
    '*': [('NO3 −)', 'NO₃⁻)'), ('M2+ =', 'M²⁺ =')],
    'ENEM-CN-2022-REG-D2-C7-Q91': [('(S2\nO8\n2−)', '(S₂O₈²⁻)'), ('•SO4\n−', '•SO₄⁻')],
    'ENEM-CN-2021-REG-D2-C7-Q132': [('Na+ e CI-', 'Na⁺ e Cl⁻')],
}


POS = {
    'ENEM-CN-2009-REG-D1-C1-Q12': [('COO⁻ + H₂O CH₃', 'COO⁻ + H₂O ⇌ CH₃')],
    'ENEM-CN-2017-REG-D2-C7-Q102': [('(g) –> NH4X (s)', '(g) → NH₄X (s)'), ('(g) –> NH₄X (s)', '(g) → NH₄X (s)')],
    'ENEM-CN-2024-REG-D2-C7-Q116': [('Ca²⁺ (aq) O método', 'Ca²⁺ (aq)\n\nO método')],
    'ENEM-CN-2025-REG-D2-C7-Q117': [('Cl₂ (g) TiCl₄ (g)', 'Cl₂ (g) → TiCl₄ (g)')],
    'ENEM-CN-2016-REG-D1-C1-Q58': [('definido como nproduto R = × 100 nreagente limitante em que', 'definido como R = (n produto ÷ n reagente limitante) × 100, em que')],
    'ENEM-CN-2015-REG-D1-C1-Q71': [('0,2×105', '0,2×10⁵'), ('2,2×1026', '2,2×10²⁶')],
}


def corrige_texto(t, q, pal, quimica):
    o = t
    t = unicodedata.normalize('NFC', t)
    if t != o: CONT['NFC (acentos decompostos)'] += 1
    t = t.replace('\xa0', ' ')
    for a, b in ESPECIFICAS.get(q['id'], []) + ESPECIFICAS['*']:
        if a in t:
            t = t.replace(a, b); CONT['correções da auditoria/pontuais'] += 1; LOG.append((q['id'], a[:40], b[:40]))
    x = estrelas(t)
    if x != t: CONT["marcadores ** quebrados"] += 1; LOG.append((q['id'], '**', '')); t = x
    x = re.sub(r'C[ℓ]', 'Cl', t).replace('mℓ', 'mL').replace('/ℓ', '/L')
    if x != t: CONT['ℓ → l/L'] += 1; t = x
    x = junta_linhas(t)
    if x != t: CONT['quebra de linha no meio da frase'] += 1; t = x
    if quimica:
        x = potencias(formulas(t))
        if x != t: CONT['fórmulas/íons/potências (sub/sobrescrito)'] += 1; t = x
    for a, b in POS.get(q['id'], []):
        if a in t:
            t = t.replace(a, b); CONT['correções da auditoria/pontuais'] += 1; LOG.append((q['id'], a[:40], b[:40]))
    if pal is not None and not q.get('textoDoPdf'):
        x = acentos(t, pal)
        if x != t:
            dif = [(a, b) for a, b in zip(re.findall(r'\S+', t), re.findall(r'\S+', x)) if a != b]
            CONT['palavras sem acento (conferidas com o PDF oficial)'] += len(dif); LOG.append((q['id'], 'acento', dif)); t = x
    return t


def maiuscula(t):
    return t[:1].upper() + t[1:] if t and t[0].islower() and t[0] < '\u0370' else t  # não mexe em α-, γ- (letras gregas)


def processa_materia(nome):
    p = f'{ROOT}/src/materias/{nome}.json'
    d = json.load(open(p))
    for q in d['questions']:
        pal = pdf_palavras(q['year'], q['number'])
        qui = nome in ('quimica', 'biologia')
        q['statement'] = corrige_texto(q['statement'], q, pal, qui)
        for op in q['options']:
            novo = corrige_texto(op['text'], q, pal, qui)
            m = maiuscula(novo)
            if m != novo: CONT['alternativa padronizada com inicial maiúscula'] += 1
            op['text'] = m
        for f in q['figures']:
            f['label'] = unicodedata.normalize('NFC', f['label'])
    json.dump(d, open(p, 'w'), ensure_ascii=False, indent=1)
    return d


def nfc_obj(o):
    if isinstance(o, str):
        n = unicodedata.normalize('NFC', o)
        if n != o: CONT['NFC Física'] += 1
        return n
    if isinstance(o, list): return [nfc_obj(x) for x in o]
    if isinstance(o, dict): return {k: nfc_obj(v) for k, v in o.items()}
    return o


if __name__ == '__main__':
    total = collections.Counter()
    for passada in range(4):
        CONT.clear()
        for m in ('biologia', 'quimica', 'geografia'):
            processa_materia(m)
        pf = f'{ROOT}/src/questoes.json'
        fis = nfc_obj(json.load(open(pf)))
        json.dump(fis, open(pf, 'w'), ensure_ascii=False, indent=1)
        if not CONT:
            break
        total.update(CONT)
    estr = [q['id'] for q in fis['questions'] if q['statement'].count('**') % 2 or re.search(r'\w\*\*\w', q['statement'])]
    print(json.dumps(total, ensure_ascii=False, indent=1))
    print('Física: ** suspeitos:', estr)
    json.dump({'contagem': total, 'log': LOG}, open(f'{ROOT}/scripts/multi/correcoes_log.json', 'w'), ensure_ascii=False, indent=1)
