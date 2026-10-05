#!/usr/bin/env python3
"""Gera src/questoes.json a partir do export oficial do banco (export/desafio-enem).

Uso:
  python3 scripts/sync_questoes.py                       # lê ../export/desafio-enem (branch atual)
  python3 scripts/sync_questoes.py --ref origin/amplia-2009-2014 --explicacoes-ref origin/explicacoes-chico
      # questões/gabaritos/figuras do branch do PR #9 (2009–2025) + explicações do branch do PR #10

Regras (nunca inventa questão):
  - só entram questões com gabarito oficial (o export já descarta anuladas/sem gabarito);
  - questões marcadas "em revisão" (reviewRequired) ficam FORA do app;
  - também ficam fora as que o app não consegue mostrar com segurança:
      alternativas possivelmente truncadas, ou alternativas ausentes sem figura de alternativas;
  - a resolução é a explicação escrita por IA (Chico), sempre exibida como
    "aguardando revisão do professor".
Copia para public/figuras apenas as figuras das questões usadas.
"""
import json, os, re, shutil, subprocess, sys
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.dirname(HERE)
REPO = os.path.dirname(APP)

def load(name, ref):
    if ref:
        out = subprocess.check_output(["git", "-C", REPO, "show", f"{ref}:export/desafio-enem/{name}"])
        return json.loads(out)
    with open(os.path.join(REPO, "export", "desafio-enem", name), encoding="utf-8") as f:
        return json.load(f)

def figura(ref, src):
    rel = "public" + src
    if ref:
        return subprocess.check_output(["git", "-C", REPO, "show", f"{ref}:{rel}"])
    with open(os.path.join(REPO, rel), "rb") as f:
        return f.read()

def lixo(linha):
    s = linha.strip()
    if len(s) >= 8 and len(s) % 2 == 0 and all(s[i] == s[i + 1] for i in range(0, len(s), 2)):
        return True  # cabeçalho de PDF duplicado (ex.: "2244//0077//22002255")
    return False

STOP = set("a o e é de do da dos das em no na nos nas um uma que se ao aos à às por com sem sua seu os as ou para pela pelo mais não são foi ser há já".split())

UNIDADES = set("cm mm m km s h min kg g Hz kHz nm dB W kW V A J K mA".split())

def rotulo_de_figura(linha):
    """Linha com pedaços de palavras vindos do texto DENTRO da figura (ex.: "Tró Cír p ico c ulo").
    Só é removida quando a questão tem figura (o conteúdo continua visível na imagem)."""
    if re.search(r"[0-9=]", linha):
        return False
    um = re.findall(r"\S+", linha)
    if len(linha) > 20 and sum(len(t) == 1 for t in um) / max(1, len(um)) >= 0.6:
        return False  # texto com letras espaçadas ("t e n s ã o ..."): é conteúdo, fica
    toks = [t for t in re.findall(r"[A-Za-zÀ-ú]+", linha) if t not in UNIDADES]
    if len(toks) < 3:
        return False
    curtos = [t for t in toks if len(t) <= 3 and t.lower() not in STOP]
    return len(curtos) / len(toks) >= 0.5

def limpa(texto, tem_figura=False):
    texto = re.sub(r"(4202MENE|ENEM2024|5202MENE)+\S*", "", texto)
    texto = re.sub(r"\s*\d*\s*CIÊNCIAS DA NATUREZA E SUAS TECNOLOGIAS", "", texto)
    texto = re.sub(r"\s*\d+\s*CIÊNCIAS DA NATUREZA\b", "", texto)
    texto = "\n".join(l for l in texto.split("\n") if not re.search(r"\.iinndddd|\.indd\b|_Azul\.|\*\w{6,}\*", l))
    linhas = [l for l in texto.split("\n") if not lixo(l) and not (tem_figura and rotulo_de_figura(l))]
    while linhas and re.fullmatch(r"\s*(QUESTÃO|Questão)\s*\d+\s*", linhas[0]):
        linhas.pop(0)
    t = "\n".join(linhas)
    # junta quebras de linha do PDF dentro de um mesmo parágrafo
    t = re.sub(r"(?<![.:?!;)\n])\n(?=[a-zà-ú0-9(])", " ", t)
    if tem_figura:
        t = "\n".join(l for l in t.split("\n") if not rotulo_de_figura(l))
    return re.sub(r"[ \t]{2,}", " ", t).strip()

AREAS = {
    "MECANICA": "Mecânica",
    "TERMODINAMICA": "Termologia",
    "ONDAS": "Ondulatória",
    "OPTICA": "Óptica",
    "ELETROMAGNETISMO": "Eletricidade e Magnetismo",
    "FISICA_MODERNA": "Física Moderna",
}

def main():
    ref = None
    if "--ref" in sys.argv:
        ref = sys.argv[sys.argv.index("--ref") + 1]
    pub = load("publico.json", ref)
    gab = load("gabarito.json", ref)
    if "--explicacoes-ref" in sys.argv:
        eref = sys.argv[sys.argv.index("--explicacoes-ref") + 1]
        egab = load("gabarito.json", eref)
        for qid, ea in egab["answers"].items():
            a = gab["answers"].get(qid)
            # só aproveita a explicação se o gabarito oficial for o mesmo nos dois branches
            if a and ea.get("explanation") and not a.get("explanation") and ea.get("answer") == a.get("answer"):
                a["explanation"] = ea["explanation"]
    usadas, fora, fora_ano = [], Counter(), Counter()
    for q in pub["questions"]:
        a = gab["answers"].get(q["id"])
        if not a or a.get("answer") not in list("ABCDE"):
            fora["sem gabarito oficial"] += 1
            fora_ano[int(q["year"])] += 1
            continue
        if q["reviewRequired"]:
            fora["em revisão (flag)"] += 1
            fora_ano[int(q["year"])] += 1
            continue
        alts = q["alternatives"]
        fig_alts = any(f["kind"] == "alternativas" for f in q["figures"])
        if alts is not None and (q["alternativesMaybeTruncated"] or len(alts) != 5):
            fora["alternativas truncadas"] += 1
            fora_ano[int(q["year"])] += 1
            continue
        if alts is None and not fig_alts:
            fora["alternativas ausentes"] += 1
            fora_ano[int(q["year"])] += 1
            continue
        ex = a.get("explanation")
        usadas.append({
            "id": q["id"],
            "year": int(q["year"]),
            "area": AREAS.get(q["domain"], q["domain"]),
            "content": q["content"],
            "demand": q["demand"],
            "statement": limpa(q["statement"], bool(q["figures"])),
            "options": [{"letter": o["letter"], "text": re.sub(r"\s*\n\s*", " ", o["text"]).strip()} for o in alts] if alts else None,
            "figures": q["figures"],
            "number": q["source"]["number"],
            "booklet": q["source"]["booklet"],
            "answer": a["answer"],
            "explanation": None if not ex else {
                "markdown": ex["markdown"],
                "keyConcept": ex["keyConcept"],
                "commonMistake": ex["commonMistake"],
                "lowConfidence": bool(ex["needsReview"]),
                "author": ex["author"],
            },
        })
    dst = os.path.join(APP, "public", "figuras")
    shutil.rmtree(dst, ignore_errors=True)
    for q in usadas:
        for f in q["figures"]:
            p = os.path.join(APP, "public" + f["src"])
            os.makedirs(os.path.dirname(p), exist_ok=True)
            with open(p, "wb") as fh:
                fh.write(figura(ref, f["src"]))
            f["src"] = "." + f["src"]  # caminho relativo (base "./" do Vite)
    meta = {
        "exportVersion": pub["version"],
        "fonte": ref or "working tree",
        "porAno": dict(sorted(Counter(q["year"] for q in usadas).items())),
        "foraPorAno": dict(sorted(fora_ano.items())),
        "total": len(usadas),
        "fora": dict(fora),
        "porArea": dict(Counter(q["area"] for q in usadas)),
        "comExplicacao": sum(1 for q in usadas if q["explanation"]),
    }
    with open(os.path.join(APP, "src", "questoes.json"), "w", encoding="utf-8") as f:
        json.dump({"meta": meta, "questions": usadas}, f, ensure_ascii=False, indent=1)
    print(json.dumps(meta, ensure_ascii=False, indent=1))

if __name__ == "__main__":
    main()
