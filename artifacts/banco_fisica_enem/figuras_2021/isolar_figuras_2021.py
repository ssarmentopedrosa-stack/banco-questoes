#!/usr/bin/env python3
"""Separa as figuras das 16 questões de Física de 2021 (caderno 7 azul).

Substitui o recorte da questão inteira (kind = questao_integral) por figuras
isoladas (enunciado / expressão / alternativas em imagem), conforme as caixas
de `plano_figuras_2021.json` (300 dpi). O recorte integral não é apagado: o
arquivo passa a se chamar `{id}-integral-{k}.webp` e fica em `full_crops`,
exibido na ficha como referência recolhida ("Ver a questão inteira").

Uso (a partir da raiz do repositório):
    python3 artifacts/banco_fisica_enem/figuras_2021/isolar_figuras_2021.py --pdf /caminho/azul.pdf

Idempotente: rodar de novo não muda nada além de regravar os mesmos recortes
(pdftoppm pode variar ±1 nível de cinza entre versões).
"""
import argparse, hashlib, json, os, subprocess, sys, tempfile
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
HERE = Path(__file__).resolve().parent
VIEW = ROOT / "public" / "oficial-view.json"
FIG = ROOT / "public" / "figuras" / "2021"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pdf", required=True)
    a = ap.parse_args()
    plano = json.loads((HERE / "plano_figuras_2021.json").read_text())
    sha = hashlib.sha256(Path(a.pdf).read_bytes()).hexdigest()
    if sha != plano["pdf_sha256"]:
        sys.exit(f"PDF diferente do esperado: {sha}")
    view = json.loads(VIEW.read_text())
    pages = sorted({f["page"] for figs in plano["questoes"].values() for f in figs})
    with tempfile.TemporaryDirectory() as tmp:
        imgs = {}
        for p in pages:
            subprocess.run(["pdftoppm", "-r", str(plano["dpi"]), "-f", str(p), "-l", str(p), "-png", a.pdf, f"{tmp}/p"], check=True)
            (png,) = [x for x in os.listdir(tmp) if x.startswith("p-") and int(x[2:-4]) == p]
            imgs[p] = Image.open(f"{tmp}/{png}").convert("RGB")
        for qid, figs in plano["questoes"].items():
            v = view[qid]
            var = v["variants"][0]
            # 1) recortes integrais -> full_crops (renomeia o arquivo, não apaga)
            if v.get("full_crops") is None:
                full = []
                for k, f in enumerate(v["figures"], 1):
                    assert f["kind"] == "questao_integral", qid
                    new = f"/figuras/2021/{qid}-integral-{k}.webp"
                    os.replace(ROOT / "public" / f["src"].lstrip("/"), ROOT / "public" / new.lstrip("/"))
                    full.append({**f, "src": new, "label": "Questão inteira (recorte do caderno)" + (f" {k}" if len(v["figures"]) > 1 else "")})
                v["full_crops"] = full
            # 2) figuras isoladas
            out = []
            for n, f in enumerate(figs, 1):
                im = imgs[f["page"]].crop(tuple(f["box_px"]))
                src = f"/figuras/2021/{qid}-{n}.webp"
                im.save(ROOT / "public" / src.lstrip("/"), "WEBP", quality=88, method=6)
                out.append({
                    "src": src, "kind": f["kind"], "label": f["label"], "width": im.width, "height": im.height,
                    "source": {"booklet": var["booklet"], "color": var["color"], "number": var["number"], "page": f["page"],
                               "pdf_sha256": plano["pdf_sha256"], "dpi": plano["dpi"], "text_match": None},
                })
            v["figures"] = out
            v["figures_status"] = "associada_caderno_azul"
    VIEW.write_text(json.dumps(view, ensure_ascii=False))
    print(f"{len(plano['questoes'])} questões, {sum(len(x) for x in plano['questoes'].values())} recortes isolados")


if __name__ == "__main__":
    main()
