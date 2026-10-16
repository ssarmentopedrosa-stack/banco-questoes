import json,re
c=json.load(open('cand.json'))
FILN=re.compile(r'platao|aristoteles|socrates|kant|descartes|hobbes|locke|rousseau|nietzsche|hume|espinosa|spinoza|maquiavel|montesquieu|sartre|foucault|hegel|santo agostinho|tomas de aquino|bacon|epicuro|heraclito|parmenides|tales|anaximenes|pirro|seneca|arendt|habermas|adorno|horkheimer|marcuse|schopenhauer|kierkegaard|wittgenstein|popper|bobbio|ceticismo|metafisic|filosof|beauvoir|merleau|camus|benjamin|levinas|rawls|mill|bentham|tocqueville',re.I)
SOCN=re.compile(r'durkheim|weber|bourdieu|bauman|giddens|sociolog|antropolog|levi-strauss|elias|castells|goffman|mauss|florestan|gilberto freyre|sergio buarque|darcy ribeiro',re.I)
import unicodedata
norm=lambda s: unicodedata.normalize('NFD',s.lower()).encode('ascii','ignore').decode()
for r in c:
    s=r['sc'];t=norm(r.get('texto',''))
    h,f,so,g=s['HIS'],s['FIL'],s['SOC'],s['GEO']
    if FILN.search(t) and f>=max(h,so)-2: lab='F'
    elif SOCN.search(t) and so>=h-2: lab='S'
    elif g>max(h,f,so) and g>=3: lab='G'
    elif h>=max(f,so) and h>0: lab='H'
    elif f>so: lab='F'
    elif so>f: lab='S'
    else: lab='H?'
    top=sorted([h,f,so,g],reverse=True)
    r['lab']=lab; r['duvida']= lab=='H?' or top[0]-top[1]<=1 or top[0]<3
json.dump(c,open('cand.json','w'),ensure_ascii=False,indent=0)
import collections;print(collections.Counter(r['lab'] for r in c), sum(r['duvida'] for r in c))
