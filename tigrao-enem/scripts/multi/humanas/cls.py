import json,re,sys
src=open('/workspace/wt-hum/tigrao-enem/scripts/multi/classify.py').read().replace("sys.path.insert(0,'/workspace/enem_multi'); from load import *","")
ns={};exec(src,ns);L=ns['L'];score=ns['score'];norm=ns['norm'];LEX=ns['LEX']
LEX['SOC']=L("sociedade social sociais sociolog durkheim weber marx bourdieu bauman cidadania movimento_social movimentos_sociais desigualdade trabalhador trabalho_ industria_cultural cultura_de_massa consumo consumismo midia meios_de_comunicacao redes_sociais internet tecnologia identidade genero racismo preconceito discriminac etnia etnico violencia mulher mulheres feminis direitos_humanos democracia participac estado_de_bem-estar globalizac urbaniz periferi juventude familia religiao alienac ideologia classe_social classes_sociais estratificac mobilidade_social capitalismo precarizac terceirizac flexibiliz informalidade")
c=json.load(open('cand.json'))
for r in c:
    t=norm(r.get('texto',''))
    s={k:score(t,LEX[k]) for k in ('HIS','FIL','SOC','GEO')}
    r['sc']=s
json.dump(c,open('cand.json','w'),ensure_ascii=False,indent=0)
for r in c:
    s=r['sc'];print(f"{r['ano']}-{r['n']}|{'X' if 'fora' in r else ''}|H{s['HIS']} F{s['FIL']} S{s['SOC']} G{s['GEO']}|{re.sub(r'\s+',' ',r.get('texto',''))[:150]}")
