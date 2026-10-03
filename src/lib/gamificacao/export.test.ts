import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildExports, EXPORT_KIND_GABARITO, EXPORT_KIND_PUBLICO } from "./export.ts";

const read = (p: string) => JSON.parse(readFileSync(new URL(`../../../${p}`, import.meta.url), "utf8"));
const banco = read("public/banco.json");
const oficial = read("public/oficial-view.json");

function keysDeep(v: unknown, out = new Set<string>()): Set<string> {
  if (Array.isArray(v)) v.forEach((x) => keysDeep(x, out));
  else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) {
      out.add(k);
      keysDeep(x, out);
    }
  return out;
}

describe("export do Desafio ENEM", () => {
  const { publico, gabarito } = buildExports(banco, oficial);

  it("é determinístico (mesma entrada → mesma saída e mesma versão)", () => {
    const again = buildExports(structuredClone(banco), structuredClone(oficial));
    assert.equal(JSON.stringify(again.publico), JSON.stringify(publico));
    assert.equal(JSON.stringify(again.gabarito), JSON.stringify(gabarito));
    assert.match(publico.version, /^1\.[0-9a-f]{8}$/);
    assert.equal(gabarito.version, publico.version);
    assert.equal(publico.kind, EXPORT_KIND_PUBLICO);
    assert.equal(gabarito.kind, EXPORT_KIND_GABARITO);
  });

  it("arquivo público não contém gabarito nem resumo de raciocínio", () => {
    const keys = keysDeep(publico);
    for (const k of ["answer", "answer_status", "reasoning", "reasoning_core", "reasoningInferred", "gabarito"]) assert.ok(!keys.has(k), k);
    const txt = JSON.stringify(publico);
    for (const [id, a] of Object.entries(gabarito.answers)) if (a.reasoning) assert.ok(!txt.includes(a.reasoning), `resumo vazou: ${id}`);
  });

  it("explicação do Chico vai só no gabarito (servidor), nunca no público", () => {
    const keys = keysDeep(publico);
    for (const k of ["explanation", "markdown", "keyConcept", "key_concept", "commonMistake", "common_mistake", "observacoes"]) assert.ok(!keys.has(k), k);
    const txt = JSON.stringify(publico);
    const withExpl = Object.entries(gabarito.answers).filter(([, a]) => a.explanation);
    assert.ok(withExpl.length > 0);
    for (const [id, a] of withExpl) {
      assert.ok(!txt.includes(a.explanation!.markdown.slice(0, 80)), `explicação vazou: ${id}`);
      assert.equal(a.explanation!.author, "IA (Chico)");
      assert.equal(a.explanation!.status, "aguardando_revisao_professor");
      assert.equal(a.explanation!.needsReview, a.explanation!.confidence === "baixa", id);
    }
    const src = new Map((banco.questions as { id: string; explanation?: { markdown: string } }[]).map((q) => [q.id, q.explanation]));
    for (const [id, a] of Object.entries(gabarito.answers)) assert.equal(a.explanation?.markdown ?? null, src.get(id)?.markdown ?? null, id);
    assert.ok(!JSON.stringify(gabarito).includes("observacoes"));
  });

  it("exclui anuladas e sem gabarito; marca as em revisão", () => {
    const annulled = Object.entries(oficial as Record<string, { variants: { answer_status: string }[] }>)
      .filter(([, v]) => v.variants.some((x) => x.answer_status === "annulled"))
      .map(([id]) => id);
    assert.ok(annulled.length > 0);
    const ids = new Set(publico.questions.map((q) => q.id));
    for (const id of annulled) assert.ok(!ids.has(id), id);
    assert.ok(publico.questions.some((q) => q.reviewRequired) && publico.questions.some((q) => !q.reviewRequired));
    for (const q of publico.questions) if (q.domain === "INTERFACE_FISICA") assert.equal(q.reviewRequired, true);
    assert.equal(publico.counts.total, publico.questions.length);
    assert.equal(publico.counts.reviewRequired, publico.questions.filter((q) => q.reviewRequired).length);
  });

  it("exclui fora do escopo e registros de duplicata (já entram pela canônica)", () => {
    const ids = new Set(publico.questions.map((q) => q.id));
    const hidden = (banco.questions as { id: string; out_of_scope?: boolean; canonical_id?: string }[]).filter((q) => q.out_of_scope || q.canonical_id);
    assert.ok(hidden.length > 0);
    for (const q of hidden) {
      assert.ok(!ids.has(q.id), q.id);
      if (q.canonical_id) assert.ok(ids.has(q.canonical_id), `${q.id}: canônica ${q.canonical_id} exportada`);
    }
    assert.ok(!publico.questions.some((q) => q.domain === "FORA_DO_ESCOPO"));
  });

  it("gabarito cobre exatamente as questões públicas, com letra A–E", () => {
    assert.deepEqual(Object.keys(gabarito.answers).sort(), publico.questions.map((q) => q.id).sort());
    for (const a of Object.values(gabarito.answers)) assert.match(a.answer, /^[A-E]$/);
  });

  it("enunciado sem alternativas finais quando elas vêm em texto; caminhos só com ids exportados", () => {
    for (const q of publico.questions) {
      assert.ok(q.statement.length > 0, q.id);
      if (q.alternatives) assert.equal(q.alternatives.length, 5);
    }
    const ids = new Set(publico.questions.map((q) => q.id));
    for (const p of publico.paths) for (const id of p) assert.ok(ids.has(id));
  });

  it("arquivos commitados em export/desafio-enem estão em dia", () => {
    const pub = read("export/desafio-enem/publico.json");
    const gab = read("export/desafio-enem/gabarito.json");
    assert.equal(pub.version, publico.version, "rode npm run export:desafio");
    assert.deepEqual(pub, JSON.parse(JSON.stringify(publico)));
    assert.deepEqual(gab, JSON.parse(JSON.stringify(gabarito)));
  });
});
