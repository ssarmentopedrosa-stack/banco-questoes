# Aplica a revisão do Chico do lote 2015–2019 (R2.1). Rodar depois de aplicar_revisao.py (não é idempotente).
import json,csv,re,itertools,sys,copy,collections
import os
REPO=os.path.abspath(os.path.join(os.path.dirname(__file__),'../../..'))
B=json.load(open(f'{REPO}/public/banco.json')); V=json.load(open(f'{REPO}/public/oficial-view.json'))
M=json.load(open(f'{REPO}/artifacts/banco_fisica_enem/matriz_cn_oficial.json')); H=M['habilidades']; CT=M['competencias']
Q={q['id']:q for q in B['questions']}
R=list(csv.DictReader(open(f'{REPO}/artifacts/banco_fisica_enem/revisao_chico/revisao-2015-2019.csv')))
assert len(R)==76
ORIGIN='revisado: Chico'; EORIGIN='REV-CHICO'; DATE='2026-10-03'
REVIEWER='Chico Arretadim (bot de física) — revisão pedagógica automatizada'
NOTE_NOT_HUMAN='Revisão pedagógica do Chico Arretadim (bot), não é validação do professor.'
# competency texts: keep the repo's existing wording when it exists (only typography differs)
CTX={q['competency_code']:q['competency_text'] for q in B['questions'] if q['competency_code']}
def ctext(c): return CTX.get(c) or CT[c]
def stext(h):
    # existing H21/H20/... wording kept if equal ignoring spacing; H22/H24 fixed to official
    return H[h]['text']
changed={}  # id -> set of changed fields
def mark(i,f):
    changed.setdefault(i,set()).add(f)
def setf(q,k,v):
    if q.get(k)!=v: q[k]=v; mark(q['id'],k)
applied=collections.Counter(); log=[]
DEC={'Física':'FISICA','Interdisciplinar':'INTERDISCIPLINAR','Não é Física':'NAO_FISICA'}
for r in R:
    q=Q[r['id']]; i=r['id']
    assert q.get('source_batch')=='R2.1' and not q.get('pedagogical_review'), i
    dec=next(v for k,v in DEC.items() if r['decisao'].startswith(k))
    dom_raw=r['dominio']; hab=r['habilidade']
    m=re.match(r'(H\d+)\s*→\s*(H\d+)\s*\((C\d)\)',hab)
    if m: skill,comp=m[2],m[3]; assert q['skill_code']==m[1],(i,q['skill_code'],m[1])
    else:
        m=re.match(r'(H\d+)(?: \((C\d)\))?',hab); skill=m[1]; comp=m[2] or H[skill]['competency']
        if 'confirmada' in hab: assert q['skill_code']==skill,(i,q['skill_code'],skill)
    alt=re.search(r'alt\.: (H\d+)',hab)
    q['pedagogical_review']=dict(status='REVIEWED',origin=ORIGIN,reviewer=REVIEWER,date=DATE,decision=dec,decision_text=r['decisao'],domain_text=dom_raw,skill_text_review=hab,justification=r['justificativa'],skill_alternative=alt[1] if alt else None,note=NOTE_NOT_HUMAN,group=r['grupo'])
    setf(q,'discipline',dec)
    old=q.get('review_reasons') or []
    data_reasons=[x for x in old if not x.startswith('Questão de interface') and 'inferidas (R2.1)' not in x]
    if dec=='NAO_FISICA':
        setf(q,'domain','FORA_DO_ESCOPO'); setf(q,'content',None); setf(q,'subcontent',None)
        q['out_of_scope']=True; q['exclusion_reason']='Não é Física (Química — eletroquímica): '+r['justificativa']
        setf(q,'uncertainty',False); setf(q,'review_required',False)
        setf(q,'taxonomy_status','REVIEWED'); setf(q,'matrix_status','UNCERTAIN')
        q['review_reasons']=['Fora do escopo de Física ('+ORIGIN+'): '+r['decisao']+'. Mantida no banco só como registro, fora das listas, do mapa e do desafio.']+data_reasons
        applied['fora_do_escopo']+=1; continue
    dm=re.match(r'([A-Z_]+) / ([A-Z_]+)(?: → ([A-Z_]+) / ([A-Z_]+))?',dom_raw)
    domain,content=(dm[3],dm[4]) if dm[3] else (dm[1],dm[2])
    sub=re.search(r'sub (?:novo: )?([A-Z_]+)',dom_raw)
    was_iface=q['domain']=='INTERFACE_FISICA'
    if not was_iface and (q['domain'],q['content'])!=(domain,content):
        applied['dominio_conteudo_trocado']+=1; log.append(f"{i}: {q['domain']}/{q['content']}→{domain}/{content}")
    if was_iface: applied['interface_reclassificada_'+dec.lower()]+=1
    setf(q,'domain',domain); setf(q,'content',content)
    if sub: setf(q,'subcontent',sub[1])
    if skill!=q['skill_code']:
        if q['skill_code']: applied['habilidade_trocada']+=1; log.append(f"{i}: {q['skill_code']}→{skill}")
        else: applied['habilidade_atribuida']+=1
        setf(q,'skill_code',skill)
    else: applied['habilidade_confirmada']+=1
    assert H[skill]['competency']==comp,(i,skill,comp)
    setf(q,'competency_code',comp); setf(q,'competency_text',ctext(comp)); setf(q,'skill_text',stext(skill))
    setf(q,'taxonomy_status','REVIEWED'); setf(q,'matrix_status','REVIEWED'); setf(q,'uncertainty',False)
    if dec=='INTERDISCIPLINAR' and not q.get('interface_note'): q['interface_note']=r['decisao']
    reasons=['Disciplina, domínio/conteúdo e habilidade revisados ('+ORIGIN+', '+DATE+'): '+r['decisao']+'. '+NOTE_NOT_HUMAN]
    if was_iface: reasons.append('Camadas pedagógicas (matemática, raciocínio, representação, pré-requisitos, Bloom, demanda e nível de preparação) ainda não classificadas.')
    else: reasons.append('Demais camadas pedagógicas continuam inferidas (R2.1, PARTIAL).')
    q['review_reasons']=reasons+data_reasons
    if was_iface: setf(q,'review_required',True)
    applied['revisadas']+=1
# ---- arestas pedagógicas: recalcula os tipos que dependem dos campos alterados
PHYS={x['id']:x for x in B['questions'] if x['domain'] not in ('INTERFACE_FISICA','FORA_DO_ESCOPO') and not x.get('canonical_id') and not x.get('out_of_scope')}
FIELD_TYPES={'domain':{'COMPLEMENTARY'},'content':{'SAME_CONTENT','COMPLEMENTARY','PROGRESSION'},'subcontent':{'SAME_SUBCONTENT'},'skill_code':{'SHARED_ENEM_SKILL'},'competency_code':{'SHARED_ENEM_COMPETENCY'}}
RANK={'FOUNDATIONAL':0,'INTERMEDIATE':1,'INTEGRATIVE':2}
def ok(v): return v not in (None,'INDETERMINADO','UNCERTAIN')
def want(A,Bq,types):
    out=set()
    a,b=A['id'],Bq['id']
    if 'SAME_CONTENT' in types and ok(A['content']) and A['content']==Bq['content']: out.add(('SAME_CONTENT',a,b))
    if 'COMPLEMENTARY' in types and ok(A['domain']) and A['domain']==Bq['domain'] and A['content']!=Bq['content']: out.add(('COMPLEMENTARY',a,b))
    if 'SAME_SUBCONTENT' in types and ok(A['subcontent']) and A['subcontent']==Bq['subcontent']: out.add(('SAME_SUBCONTENT',a,b))
    if 'SHARED_ENEM_SKILL' in types and A['skill_code'] and A['skill_code']==Bq['skill_code']: out.add(('SHARED_ENEM_SKILL',a,b))
    if 'SHARED_ENEM_COMPETENCY' in types and A['competency_code'] and A['competency_code']==Bq['competency_code']: out.add(('SHARED_ENEM_COMPETENCY',a,b))
    if 'PROGRESSION' in types and ok(A['content']) and A['content']==Bq['content'] and A.get('preparation_level') in RANK and Bq.get('preparation_level') in RANK and RANK[A['preparation_level']]!=RANK[Bq['preparation_level']]:
        s,t=(a,b) if RANK[A['preparation_level']]<RANK[Bq['preparation_level']] else (b,a); out.add(('PROGRESSION',s,t))
    return out
STR={'SAME_CONTENT':'STRONG','COMPLEMENTARY':'MODERATE','SAME_SUBCONTENT':'STRONG','SHARED_ENEM_SKILL':'WEAK','SHARED_ENEM_COMPETENCY':'WEAK','PROGRESSION':'MODERATE'}
pair_types=collections.defaultdict(set)
for i,fs in sorted(changed.items()):
    types=set().union(*[FIELD_TYPES.get(f,set()) for f in fs])
    if not types: continue
    for j in sorted(set(PHYS)|set(Q)):
        if j==i: continue
        pair_types[frozenset((i,j))]|=types
removed_ped=collections.Counter(); added_ped=collections.Counter()
idx=collections.defaultdict(list)
for k,e in enumerate(B['pedagogicalEdges']): idx[frozenset((e['source'],e['target']))].append(k)
drop=set(); new=[]
for pair,types in sorted(pair_types.items(),key=lambda kv:sorted(kv[0])):
    a,b=sorted(pair)
    w=want(PHYS[a],PHYS[b],types) if a in PHYS and b in PHYS else set()
    have={}
    for k in idx.get(pair,[]):
        e=B['pedagogicalEdges'][k]
        if e['type'] in types: have[(e['type'],e['source'],e['target'])]=k
    # tipos simétricos: comparar sem direção
    def norm(t): return (t[0],)+((t[1],t[2]) if t[0]=='PROGRESSION' else tuple(sorted(t[1:])))
    wn={norm(t):t for t in w}; hn={norm(t):k for t,k in have.items()}
    for t,k in sorted(hn.items()):
        if t not in wn: drop.add(k); removed_ped[(B['pedagogicalEdges'][k]['type'],B['pedagogicalEdges'][k].get('origin') or 'original')]+=1
    for t,full in sorted(wn.items()):
        if t not in hn:
            ty,s,tg=full
            new.append(dict(source=s,target=tg,type=ty,direction='SOURCE_TO_TARGET' if ty=='PROGRESSION' else 'SYMMETRIC',strength=STR[ty],status='CANDIDATE',origin=EORIGIN)); added_ped[ty]+=1
B['pedagogicalEdges']=[e for k,e in enumerate(B['pedagogicalEdges']) if k not in drop]+new
# ---- arestas de aprendizagem (só questões com nível de preparação definido e conteúdo/subconteúdo alterado)
LT={'content','subcontent'}
ADJ={}
def rebuild_adj():
    ADJ.clear()
    for e in B['learningEdges']: ADJ.setdefault(e['type'],{}).setdefault(e['source'],set()).add(e['target'])
def reach(x,y,adj):
    st=[x];seen=set()
    while st:
        u=st.pop()
        if u==y: return True
        for v in adj.get(u,()):
            if v not in seen: seen.add(v); st.append(v)
    return False
le_removed=[];le_added=[]
for i,fs in sorted(changed.items()):
    if not (fs&LT) or i not in PHYS or PHYS[i].get('preparation_level') not in RANK: continue
    A=PHYS[i]
    keep=[]
    for e in B['learningEdges']:
        if i in (e['source'],e['target']) and e['type'] in ('CONSOLIDATION','APPLICATION_PREPARATION'):
            o=PHYS.get(e['target'] if e['source']==i else e['source'])
            valid=o is not None and ((e['type']=='CONSOLIDATION' and A['subcontent']==o['subcontent']) or (e['type']=='APPLICATION_PREPARATION' and A['subcontent']!=o['subcontent'] and A['content']==o['content']))
            if not valid: le_removed.append(e); continue
        keep.append(e)
    B['learningEdges']=keep
    rebuild_adj()
    key=lambda x:(RANK[PHYS[x]['preparation_level']],x)
    have={frozenset((e['source'],e['target'])) for e in B['learningEdges']}
    for j,o in sorted(PHYS.items()):
        if j==i or o.get('preparation_level') not in RANK or frozenset((i,j)) in have: continue
        s,t=sorted([i,j],key=key)
        ty='CONSOLIDATION' if A['subcontent']==o['subcontent'] else ('APPLICATION_PREPARATION' if A['content']==o['content'] and RANK[A['preparation_level']]!=RANK[o['preparation_level']] else None)
        if not ty: continue
        adj=ADJ.setdefault(ty,{})
        if reach(t,s,adj): continue
        adj.setdefault(s,set()).add(t)
        e=dict(id=f'LR-RCH2-{len(le_added)+1:06d}',source=s,target=t,type=ty,status='CANDIDATE',strength='HELPFUL',origin=EORIGIN)
        B['learningEdges'].append(e); le_added.append(e)
# caminhos: remove os que usam aresta removida; acrescenta 1 passo para as novas
gone={(e['source'],e['target']) for e in le_removed}
before=len(B['paths'])
B['paths']=[p for p in B['paths'] if not any((p['nodes'][k],p['nodes'][k+1]) in gone for k in range(len(p['nodes'])-1))]
paths_removed=before-len(B['paths'])
B['paths']+=[dict(nodes=[e['source'],e['target']],length=1,origin=EORIGIN) for e in le_added]
# ciclos
def has_cycle(adj):
    col={}
    def dfs(u):
        col[u]=1
        for v in adj.get(u,()):
            if col.get(v)==1 or (col.get(v) is None and dfs(v)): return True
        col[u]=2; return False
    return any(col.get(u) is None and dfs(u) for u in list(adj))
sys.setrecursionlimit(10000); rebuild_adj()
assert not any(has_cycle(a) for a in ADJ.values())
# ---- clusters
for cl in B['clusters']:
    cl['canonical_ids']=[x for x in cl['canonical_ids'] if x in Q and Q[x]['domain']==cl['name'] and not Q[x].get('canonical_id') and not Q[x].get('out_of_scope')]
    have=set(cl['canonical_ids'])
    cl['canonical_ids']+=[x for x in Q if Q[x]['domain']==cl['name'] and x not in have and not Q[x].get('canonical_id') and not Q[x].get('out_of_scope')]
B['meta']['revisao_chico_2015_2019_note']=('Revisão pedagógica das 76 questões do lote 2015–2019 (R2.1) por Chico Arretadim (bot de física), '+DATE+'. Campos marcados com status REVIEWED e origin "'+ORIGIN+'" (pedagogical_review). Não é validação humana do professor. Arestas recalculadas com origin '+EORIGIN+' e status CANDIDATE.')
open(f'{REPO}/public/banco.json','w').write(json.dumps(B,ensure_ascii=False))
open(f'{REPO}/public/oficial-view.json','w').write(json.dumps(V,ensure_ascii=False))
rep=dict(applied=dict(applied),skill_changes=log,changed_questions=len(changed),ped_removed={f'{a}|{b}':c for (a,b),c in removed_ped.items()},ped_added=dict(added_ped),learn_removed=[(e['id'],e['type'],e['source'],e['target']) for e in le_removed],learn_added=len(le_added),paths_removed=paths_removed)
json.dump(rep,open(os.devnull,'w'),ensure_ascii=False,indent=1); print(json.dumps(rep,ensure_ascii=False,indent=1))
