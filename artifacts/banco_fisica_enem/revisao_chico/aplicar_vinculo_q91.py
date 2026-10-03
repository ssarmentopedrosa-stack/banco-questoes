# Liga ENEM-CN-2024-REG-D2-C6-Q91 (só caderno cinza) como variante da ENEM-CN-2024-D2-CAN-053 (azul Q131),
# como foi feito com Q92/CAN-083. Rodar depois de aplicar_revisao_2015_2019.py (não é idempotente).
import json,os,copy,re,difflib
REPO=os.path.abspath(os.path.join(os.path.dirname(__file__),'../../..'))
B=json.load(open(f'{REPO}/public/banco.json')); V=json.load(open(f'{REPO}/public/oficial-view.json'))
Q={q['id']:q for q in B['questions']}
dup,can='ENEM-CN-2024-REG-D2-C6-Q91','ENEM-CN-2024-D2-CAN-053'
ORIGIN='pedido do Silas (03/10/2026); duplicata apontada no PR #2'
d,c=Q[dup],Q[can]
assert not d.get('canonical_id') and d['matching_status']=='not_matched'
for k in ['domain','content','subcontent','skill_code','competency_code']: assert d[k]==c[k],k
var=copy.deepcopy(V[dup]['variants'][0]); azul=[x for x in V[can]['variants'] if x['booklet']==7][0]
n=lambda s: re.sub(r'[^a-z0-9à-ú]','',re.sub(r'^quest\S+\s*\d+','',s.lower()))
sim=difflib.SequenceMatcher(None,n(var['statement']),n(azul['statement']),autojunk=False).ratio()
assert sim>=0.98 and var['answer']==azul['answer'], sim
d['canonical_id']=can; d['matching_status']='confirmed'; d['matching_origin']=ORIGIN
d['review_reasons']=(d.get('review_reasons') or [])+[f'Vinculada como variante de {can} ({ORIGIN}; enunciado {sim:.3f} igual ao do caderno azul Q131 e mesmo gabarito {var["answer"]}); o registro é mantido, mas a questão aparece pela ficha canônica.']
var['matching_status']='confirmed'; var['matching_origin']=ORIGIN
V[can]['variants'].append(var); V[can]['variants'].sort(key=lambda x:x['booklet'])
V[can]['images']+=V[dup]['images']; V[dup]['canonical_id']=can
# todas as arestas da Q91 já existem na CAN-053 (mesma classificação): removidas, nada se perde
inc=lambda e: dup in (e['source'],e['target'])
rem={k:sum(map(inc,B[k])) for k in ['learningEdges','pedagogicalEdges']}
for k in ['learningEdges','pedagogicalEdges']: B[k]=[e for e in B[k] if not inc(e)]
p0=len(B['paths']); B['paths']=[p for p in B['paths'] if dup not in p['nodes']]
for cl in B['clusters']: cl['canonical_ids']=[x for x in cl['canonical_ids'] if x!=dup]
open(f'{REPO}/public/banco.json','w').write(json.dumps(B,ensure_ascii=False))
open(f'{REPO}/public/oficial-view.json','w').write(json.dumps(V,ensure_ascii=False))
print(json.dumps(dict(similaridade=round(sim,3),arestas_removidas=rem,caminhos_removidos=p0-len(B['paths']))))
