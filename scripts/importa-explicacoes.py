"""Mescla as explicações escritas por IA (Chico) em public/banco.json, no campo `explanation`.

Uso: python3 scripts/importa-explicacoes.py
Fonte: artifacts/banco_fisica_enem/explicacoes_chico/explicacoes-2015-2025.jsonl (sem o campo
`observacoes`, que é só para o professor e não fica no repositório público).
Não altera enunciado, alternativas, gabarito nem classificação: só acrescenta/substitui `explanation`.
Idempotente: rodar de novo com a mesma fonte não muda nenhum byte.
"""
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "artifacts/banco_fisica_enem/explicacoes_chico/explicacoes-2015-2025.jsonl"
BANCO = ROOT / "public/banco.json"
LABEL = "Explicação escrita por IA (Chico) — aguardando revisão do professor"
CONF = {"alta", "media", "baixa"}

rows = [json.loads(l) for l in SRC.read_text(encoding="utf-8").splitlines() if l.strip()]
by_id = {}
for r in rows:
    assert r["id"] not in by_id, f"id duplicado: {r['id']}"
    assert r["confianca"] in CONF, f"confiança inválida em {r['id']}"
    assert "observacoes" not in r, "observações não podem entrar no repositório"
    by_id[r["id"]] = r

banco = json.loads(BANCO.read_text(encoding="utf-8"))
known = {q["id"]: q for q in banco["questions"]}
missing = sorted(set(by_id) - set(known))
assert not missing, f"ids sem questão no banco: {missing}"
for qid, r in by_id.items():
    q = known[qid]
    assert not q.get("out_of_scope") and not q.get("canonical_id"), f"{qid} não é visível"
    q["explanation"] = {
        "markdown": r["explicacao_markdown"],
        "key_concept": r["conceito_chave"],
        "common_mistake": r["erro_comum"],
        "confidence": r["confianca"],
        "needs_review": r["confianca"] == "baixa",
        "author": "IA (Chico)",
        "status": "aguardando_revisao_professor",
        "label": LABEL,
        "batch": "E1",
    }
banco["meta"]["explanations_note"] = (
    "E1: explicações escritas por IA (Chico) para as questões visíveis de 2015–2025, campo `explanation`. "
    "Aguardam revisão do professor; confiança baixa = precisa de revisão. Não alteram enunciado nem gabarito."
)
BANCO.write_text(json.dumps(banco, ensure_ascii=False), encoding="utf-8")
print(f"{len(by_id)} explicações aplicadas ({sum(r['confianca'] == 'baixa' for r in rows)} com confiança baixa).")
