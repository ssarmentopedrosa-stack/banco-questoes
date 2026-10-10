"""Correções pontuais (2ª rodada da auditoria) + remanejamento de questões entre matérias.
Idempotente: cada troca só é aplicada se o texto antigo ainda existir. Rodar DEPOIS de corrige_textos.py.
Log em correcoes_extra_log.json."""
import json, os, re, shutil, collections
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MAT = ('biologia', 'quimica', 'geografia')
D = {m: json.load(open(f'{ROOT}/src/materias/{m}.json')) for m in MAT}
CONT = collections.Counter(); LOG = []; NAO = []


def ach(ano, num, area='CN'):
    for m in MAT:
        for q in D[m]['questions']:
            if q['year'] == ano and q['number'] == num and q['id'].startswith(f'ENEM-{area}-'):
                return m, q
    return None, None


# (área, ano, número): [(antigo, novo), ...] — vale para enunciado e alternativas
T = {
 # ---------- Biologia ----------
 ('CN', 2020, 103): [('maté – ria-prima', 'matéria-prima')],
 ('CN', 2021, 119): [('construção 9com', 'construção (com')],
 ('CN', 2023, 98): [('Ácidos necleicos.', 'Ácidos nucleicos.')],
 ('CN', 2022, 102): [('cDNAviral', 'cDNA viral')],
 ('CN', 2020, 125): [('frequência de 1A', 'frequência de Iᴬ'), ('frequência de IB', 'frequência de Iᴮ')],
 ('CN', 2022, 110): [('cerca de\n5 000', 'cerca de 5 000'), ('aproximadamente\n200', 'aproximadamente 200'), ('por volta de\n20', 'por volta de 20'),
                     ('para o desenvolvimento', 'para o desenvolvimento.')],
 ('CN', 2023, 127): [('reduzindo o\nFe³⁺', 'reduzindo o Fe³⁺'), ('sítio de\nFe³⁺', 'sítio de Fe³⁺')],
 ('CN', 2023, 99): [('para tentar controlar a doença.', 'para tentar controlar a doença.\n\nEm qual material biológico dos cães a presença desse protozoário representa risco de transmissão dessa zoonose?')],
 ('CN', 2025, 98): [('competitivo.\nCARLOS JR., L. A.; BARBOSA, N. P. U.; FERNANDES, G. W.\nO capim-gordura e as invasões no Cerrado brasileiro.\nJornal do Biólogo, mar.-jun. 2008 (adaptado).\nEm longo',
                     'competitivo.\n\nCARLOS JR., L. A.; BARBOSA, N. P. U.; FERNANDES, G. W. O capim-gordura e as invasões no Cerrado brasileiro. **Jornal do Biólogo**, mar.-jun. 2008 (adaptado).\n\nEm longo')],
 ('CN', 2019, 101): [('D proteínas, para', 'Proteínas, para')],
 ('CN', 2010, 66): [('O<sub>2</sub>', 'O₂')],
 ('CN', 2010, 49): [('higienizaçao', 'higienização')],
 ('CN', 2011, 76): [('família\nApocinaceae', 'família Apocinaceae')],
 ('CN', 2018, 116): [('à base de\n[[FIG 0]]\n sensibilizadas', 'à base de TiO₂ sensibilizadas'), ('adsorvido sobre o\n[[FIG 1]]\n é responsável', 'adsorvido sobre o TiO₂ é responsável'),
                     ('energia luminosa\n[[FIG 2]]\n, e o corante', 'energia luminosa (hν), e o corante'), ('elétrons para o\n[[FIG 3]]\n. Um esquema', 'elétrons para o TiO₂. Um esquema'),
                     ('[[FIG 4]]', '[[FIG 0]]')],
 # ---------- Química ----------
 ('CN', 2011, 50): [('Substância Fórmula ∆Hcº (kJ/mol) benzeno C₆H₆ (l) -3 268 etanol C₂H₅OH (l) -1 368 glicose C₆H₁₂O₆ (s) -2 808 metano CH₄ (g) -890 octano C₈H₁₈ (l) -5 471 ATKINS',
                     'Substância — Fórmula — ∆Hcº (kJ/mol)\nBenzeno — C₆H₆ (l) — −3 268\nEtanol — C₂H₅OH (l) — −1 368\nGlicose — C₆H₁₂O₆ (s) — −2 808\nMetano — CH₄ (g) — −890\nOctano — C₈H₁₈ (l) — −5 471\n\nATKINS'),
                    ('(adaptado).\nNeste contexto', '(adaptado).\n\nNeste contexto')],
 ('CN', 2011, 75): [('representa esse processo:\nGROISMAN', 'representa esse processo:\n\nCa₁₀(PO₄)₆(OH)₂(s) ⇌ 10 Ca²⁺(aq) + 6 PO₄³⁻(aq) + 2 OH⁻(aq)\n\nGROISMAN'), ('Sabese', 'Sabe-se')],
 ('CN', 2010, 82): [('PO₂-2', 'PO₂²⁻'), ('ácida.Nela', 'ácida. Nela')],
 ('CN', 2010, 67): [('CH₄(g)+ H₂O(v) + calor ↔CO(g) + 3H2(g)', 'CH₄(g) + H₂O(v) + calor ⇌ CO(g) + 3 H₂(g)'), ('uma vez que a a formação', 'uma vez que há a formação')],
 ('CN', 2010, 83): [('açúcar ma água', 'açúcar na água')],
 ('CN', 2010, 85): [('acompanha da introdução', 'acompanhada da introdução')],
 ('CN', 2010, 80): [('molácula', 'molécula')],
 ('CN', 2011, 54): [('formam um estético simples', 'formam um eutético simples')],
 ('CN', 2012, 53): [('ainda,a inscrição', 'ainda, a inscrição')],
 ('CN', 2012, 58): [('são,respectivamente', 'são, respectivamente')],
 ('CN', 2014, 56): [('S₁₈₀₀', 'S1800'), ('S₅₀₀', 'S500'), ('S₅₀ ', 'S50 '), ('S₁₀ ', 'S10 ')],
 ('CN', 2014, 88): [('2CaSO4(s)', '2 CaSO₄(s)')],
 ('CN', 2016, 64): [('2 CO₂ + 7H+ + 8e– → CH₃COO⁻ + 2H2O               E°’ = -0,3 V', '2 CO₂ + 7 H⁺ + 8 e⁻ → CH₃COO⁻ + 2 H₂O     E°’ = −0,3 V'),
                    ('O₂ + 4H+ + 4e– → 2H2O                                             E°’ = 0,8V.', 'O₂ + 4 H⁺ + 4 e⁻ → 2 H₂O     E°’ = 0,8 V')],
 ('CN', 2018, 93): [('WIlhelm Kõnlg', 'Wilhelm König'), ('coleção da Instituição', 'coleção da instituição'),
                    ('redução:\n[[FIG 0]]\n (Fe^+|Fe) = -0,4: 4 V; \n[[FIG 1]]\n (H+|H.) = 0,00 V; e  \n[[FIG 2]]\n (Cu^+|Cu) = +0,34 V.',
                     'redução: E⁰(Fe²⁺|Fe) = −0,44 V; E⁰(H⁺|H₂) = 0,00 V; e E⁰(Cu²⁺|Cu) = +0,34 V.'), ('[[FIG 3]]', '[[FIG 0]]')],
 ('CN', 2019, 129): [('192 g mol^{-1 }\u200b−1\u200b\u200b.', '192 g mol⁻¹.')],
 ('CN', 2020, 112): [('equação química:\n∆H < 0 (azul) (rosa)', 'equação química:\n\nCoCl₂(s) (azul) + 6 H₂O(g) ⇌ CoCl₂·6H₂O(s) (rosa)     ∆H < 0\n')],
 ('CN', 2019, 95): [('termoquí micas', 'termoquímicas'), ('combustão dá glicose', 'combustão da glicose')],
 ('CN', 2019, 104): [('ocorrância', 'ocorrência')],
 ('CN', 2018, 132): [('Identificaçáo', 'Identificação')],
 ('CN', 2018, 135): [('retorne ã terra', 'retorne à terra')],
 ('CN', 2017, 122): [('flnal', 'final')],
 ('CN', 2017, 119): [('NaCI', 'NaCl'), ('HCI', 'HCl')],
 ('CN', 2017, 132): [('CI⁻', 'Cl⁻'), ('NaCI', 'NaCl')],
 ('CN', 2017, 130): [('Α-caroteno', 'α-caroteno'), ('Γ-caroteno', 'γ-caroteno'), ('Α-criptoxantina', 'α-criptoxantina')],
 ('CN', 2017, 102): [('ácidos (H X com', 'ácidos (HX) com')],
 ('CN', 2020, 96): [('g mo1–1', 'g mol⁻¹')],
 ('CN', 2020, 124): [('conta - minando', 'contaminando'), ('Rio de\nJaneiro', 'Rio de Janeiro')],
 ('CN', 2018, 102): [('mercúrio(ll)', 'mercúrio(II)')],
 ('CN', 2019, 108): [('5s25p6', '5s² 5p⁶'), ('2s22p5', '2s² 2p⁵')],
 ('CN', 2022, 101): [('SP₇₉', 'SP79'), ('SP₈₀', 'SP80')],
 ('CN', 2023, 96): [('anidro, CaCI,.', 'anidro, CaCl₂.'), ('di-hidratado, CaCI, 2H,0.', 'di-hidratado, CaCl₂·2H₂O.')],
 ('CN', 2021, 111): [('Filmar parceria', 'Firmar parceria')],
 ('CN', 2022, 131): [('canela.Associações', 'canela. Associações'), ('passadoda', 'passado da'), ('químicaorgânica', 'química orgânica'), ('compostosditos', 'compostos ditos')],
 ('CN', 2023, 94): [('seauintes', 'seguintes')],
 ('CN', 2021, 103): [('da celulosa', 'da celulose')],
 ('CN', 2021, 95): [('31, 2 g', '31,2 g')],
 ('CN', 2025, 125): [('K−1', 'K⁻¹')],
 ('CN', 2022, 91): [('tricloroeteno\n(TCE)', 'tricloroeteno (TCE)'), ('contêm\nFe(III)', 'contêm Fe(III)'), ('persulfato:\nremediação', 'persulfato: remediação')],
 # ---------- Geografia ----------
 ('CH', 2011, 37): [('ambiente produtivo. D', 'ambiente produtivo.')],
 ('CH', 2018, 89): [('científlca', 'científica')],
 ('CH', 2019, 46): [('transformá-to', 'transformá-lo')],
 ('CH', 2020, 75): [('Hlstória', 'História')],
 ('CH', 2020, 82): [('Popocatepéti e  filipino', 'Popocatépetl e o filipino')],
 ('CH', 2020, 90): [('Por outros lado', 'Por outro lado')],
 ('CH', 2021, 61): [('tentativa de tomar o Rio', 'tentativa de tornar o Rio')],
 ('CH', 2021, 70): [('Disponível m:', 'Disponível em:')],
 ('CH', 2021, 72): [('Qual media promove', 'Qual medida promove')],
 ('CH', 2021, 79): [('áreas degradas.', 'áreas degradadas.')],
 ('CH', 2022, 51): [('funda – mentais', 'fundamentais'), ('capa – cidade', 'capacidade')],
 ('CH', 2022, 64): [('contoladas', 'controladas')],
 ('CH', 2022, 72): [('é maio grave', 'é mais grave'), ('mais de um hora', 'mais de uma hora')],
 ('CH', 2022, 75): [('povo da águas', 'povo das águas')],
 ('CH', 2022, 87): [('estigmatizarão de estratos sociais ,', 'estigmatização de estratos sociais,')],
 ('CH', 2023, 53): [('anos.,', 'anos,')],
 ('CH', 2023, 66): [('ТЕХТО ІІ', 'TEXTO II'), ('ТЕХТО I', 'TEXTO I'), ('ТЕХТО І', 'TEXTO I')],
 ('CH', 2023, 83): [('desordenada exporta no texto', 'desordenada exposta no texto')],
}

for (area, ano, num), trocas in T.items():
    m, q = ach(ano, num, area)
    if not q:
        NAO.append((area, ano, num, 'questão não encontrada')); continue
    for a, b in trocas:
        if a in b and (b in q['statement'] or any(b in o['text'] for o in q['options'])):
            continue  # já aplicada (o texto novo contém o antigo)
        feito = False
        if a in q['statement']:
            q['statement'] = q['statement'].replace(a, b); feito = True
        for o in q['options']:
            if a in o['text']:
                o['text'] = o['text'].replace(a, b); feito = True
        if feito:
            CONT['correções pontuais (2ª rodada)'] += 1; LOG.append((q['id'], a[:50], b[:50]))
        elif b not in q['statement'] and not any(b in o['text'] for o in q['options']):
            NAO.append((q['id'], a[:50]))

# alternativa C de 2012 Q20 (geo) duplicada; alternativa C de 2018 Q73 (geo) errada na base (PDF: "emprego de armamentos sofisticados")
_, q = ach(2012, 20, 'CH')
for o in q['options']:
    t = o['text']; h = len(t) // 2
    if len(t) % 2 == 0 and t[:h] == t[h:]:
        o['text'] = t[:h]; CONT['correções pontuais (2ª rodada)'] += 1; LOG.append((q['id'], 'alternativa duplicada', o['letter']))
_, q = ach(2018, 73, 'CH')
c = [o for o in q['options'] if o['letter'] == 'C'][0]
if c['text'] == 'Preservação do meio ambiente.':
    c['text'] = 'Emprego de armamentos sofisticados.'; CONT['correções pontuais (2ª rodada)'] += 1; LOG.append((q['id'], 'alt C', c['text']))

# figuras que eram só texto (TiO₂, hν, potenciais) viram texto; mantém só o esquema
for ano, num, manter in ((2018, 116, 4), (2018, 93, 3)):
    _, q = ach(ano, num)
    if len(q['figures']) > 1:
        q['figures'] = [q['figures'][manter]]; CONT['figuras de texto convertidas em texto'] += 1
    q['figures'][0]['label'] = 'Figura 1'
# alternativas-imagem de 2018 Q116 → texto (lidas das imagens oficiais)
_, q = ach(2018, 116)
ALT = {'A': 'Reduz íons I⁻ a I₃⁻.', 'B': 'Regenera o corante.', 'C': 'Garante que a reação 4 ocorra.', 'D': 'Promove a oxidação do corante.', 'E': 'Transfere elétrons para o eletrodo de TiO₂.'}
for o in q['options']:
    if o.get('img'):
        o.pop('img'); o['text'] = ALT[o['letter']]; CONT['alternativas-imagem convertidas em texto'] += 1

# "2,50 x 10⁻³" → "2,50 × 10⁻³" (banco todo)
for m in MAT:
    for q in D[m]['questions']:
        for campo in [q] + q['options']:
            k = 'statement' if campo is q else 'text'
            novo = re.sub(r'(\d) x 10(?=[⁰-⁹⁻])', r'\1 × 10', campo[k])
            if novo != campo[k]:
                campo[k] = novo; CONT['"x" → "×" em potências de 10'] += 1

# remanejamentos
MOVE = [((2018, 116), 'biologia', 'quimica', 'Eletroquímica'), ((2017, 113), 'biologia', 'quimica', 'Química Geral e Ambiental'),
        ((2015, 67), 'quimica', 'biologia', 'Corpo Humano e Saúde')]
MOVIDAS = []
for (ano, num), de, para, area in MOVE:
    m, q = ach(ano, num)
    if m != de:
        continue
    D[de]['questions'].remove(q); q['area'] = area
    for f in q['figures'] + [o['img'] for o in q['options'] if o.get('img')]:
        velho = f['src']; novo = velho.replace(f'/figuras/{de}/', f'/figuras/{para}/')
        pv, pn = f'{ROOT}/public/{velho[2:]}', f'{ROOT}/public/{novo[2:]}'
        if os.path.exists(pv):
            os.makedirs(os.path.dirname(pn), exist_ok=True); shutil.move(pv, pn)
        f['src'] = novo
    D[para]['questions'].append(q); MOVIDAS.append((q['id'], de, para, area))
# figuras órfãs (as que viraram texto) saem do public
for m in MAT:
    usadas = {f['src'][2:] for q in D[m]['questions'] for f in q['figures']} | {o['img']['src'][2:] for q in D[m]['questions'] for o in q['options'] if o.get('img')}
    for ano, num in ((2018, 116), (2018, 93)):
        _, q = ach(ano, num)
        if q in D[m]['questions']:
            for d in ('biologia', 'quimica'):
                pasta = f'{ROOT}/public/figuras/{d}/{ano}'
                if os.path.isdir(pasta):
                    for arq in os.listdir(pasta):
                        rel = f'figuras/{d}/{ano}/{arq}'
                        if arq.startswith(q['id'] + '-') and rel not in usadas:
                            os.remove(f'{pasta}/{arq}')

for m in MAT:
    d = D[m]; qs = sorted(d['questions'], key=lambda q: (q['year'], q['number'])); d['questions'] = qs
    d['meta']['total'] = len(qs)
    d['meta']['porAno'] = {str(a): n for a, n in sorted(collections.Counter(q['year'] for q in qs).items())}
    d['meta']['porArea'] = dict(collections.Counter(q['area'] for q in qs).most_common())
    json.dump(d, open(f'{ROOT}/src/materias/{m}.json', 'w'), ensure_ascii=False, indent=1)
json.dump({m: len(D[m]['questions']) for m in MAT}, open(f'{ROOT}/src/materias/contagem.json', 'w'), ensure_ascii=False)
json.dump({'contagem': CONT, 'movidas': MOVIDAS, 'nao_aplicadas': NAO, 'log': LOG}, open(f'{ROOT}/scripts/multi/correcoes_extra_log.json', 'w'), ensure_ascii=False, indent=1)
print(dict(CONT)); print('movidas', MOVIDAS); print('NÃO aplicadas', NAO)
