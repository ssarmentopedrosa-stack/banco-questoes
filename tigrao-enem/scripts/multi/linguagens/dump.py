import json,re,sys
c=[r for r in json.load(open('cand.json')) if 'fora' not in r]
a,b=int(sys.argv[1]),int(sys.argv[2])
B='/workspace/tmp/enem-api/public'
for r in c:
  if not a<=r['ano']<=b: continue
  q=json.load(open(f"{B}/{r['ano']}/questions/{r['n']}/details.json"))
  ctx=re.sub(r'!\[[^\]]*\]\([^)]*\)','[FIG]',q['context'] or ''); ctx=re.sub(r'\s+',' ',ctx)
  if len(ctx)>520: ctx=ctx[:260]+' … '+ctx[-260:]
  print(f"@{r['ano']}-{r['n']} [{q['correctAlternative']}] {ctx} || {re.sub(r'\s+',' ',q['alternativesIntroduction'] or '')}")
  for x in q['alternatives']: print(f" {x['letter']}) {(x['text'] or '[FIG]')[:95]}")
