import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const banco = JSON.parse(readFileSync(new URL("../public/banco.json", import.meta.url), "utf8"));

test("33 questões únicas", () => {
  const ids = banco.questions.map((q) => q.id);
  assert.equal(ids.length, 33);
  assert.equal(new Set(ids).size, 33);
});

test("relações de aprendizagem intactas", () => {
  assert.equal(banco.learningEdges.length, 177);
  assert.equal(banco.learningEdges.filter((e) => e.status === "CONFIRMED").length, 39);
  assert.equal(banco.learningEdges.filter((e) => e.status === "CANDIDATE").length, 138);
  assert.equal(banco.cycles.length, 0);
});

test("interface e probable", () => {
  const iface = ["ENEM-CN-2024-D2-CAN-083", "ENEM-CN-2024-REG-D2-C6-Q92", "ENEM-CN-2025-D2-CAN-004", "ENEM-CN-2025-D2-CAN-010", "ENEM-CN-2025-REG-D2-C5-Q101"];
  for (const id of iface) {
    const q = banco.questions.find((x) => x.id === id);
    assert.ok(q, id);
    assert.equal(q.domain, "INTERFACE_FISICA");
    assert.equal(q.review_required, true);
  }
  const p = banco.questions.find((x) => x.id === "ENEM-CN-2025-D2-CAN-010");
  assert.equal(p.matching_status, "probable");
});

test("busca case-insensitive não inventa campos", () => {
  const hit = banco.questions.filter((q) => (q.content || "").toLowerCase().includes("circuitos"));
  assert.ok(hit.length >= 1);
  assert.equal(banco.questions.some((q) => q.id === "NAO-EXISTE"), false);
});

const oficial = JSON.parse(readFileSync(new URL("../public/oficial-view.json", import.meta.url), "utf8"));

test("figuras: cada questão tem status e os arquivos existem", async () => {
  const { existsSync, readdirSync } = await import("node:fs");
  const ids = Object.keys(oficial);
  assert.equal(ids.length, 33);
  assert.deepEqual(new Set(ids), new Set(banco.questions.map((q) => q.id)));
  const referenced = new Set();
  let withFig = 0;
  for (const [id, v] of Object.entries(oficial)) {
    assert.ok(Array.isArray(v.figures), id);
    assert.ok(["associada_caderno_azul", "sem_figura_na_prova", "nao_associada_variante_sem_caderno_azul"].includes(v.figures_status), id);
    assert.equal(v.figures.length > 0, v.figures_status === "associada_caderno_azul", id);
    if (v.figures.length) withFig++;
    for (const f of v.figures) {
      const year = v.variants[0].year;
      assert.match(f.src, new RegExp(`^/figuras/${year}/${id}-\\d+\\.webp$`), id);
      assert.ok(existsSync(new URL(`../public${f.src}`, import.meta.url)), f.src);
      assert.ok(["enunciado", "alternativas", "expressao"].includes(f.kind), f.src);
      assert.ok(f.width > 0 && f.height > 0, f.src);
      const azul = v.variants.find((x) => x.booklet === f.source.booklet);
      assert.ok(azul, `${id}: variante do caderno ${f.source.booklet}`);
      assert.equal(azul.number, f.source.number, id);
      assert.equal(azul.start_page, f.source.page, id);
      assert.ok(f.source.text_match >= 0.9, `${id}: texto confere com o PDF`);
      referenced.add(f.src);
    }
  }
  assert.equal(withFig, 24);
  for (const year of ["2024", "2025"]) {
    for (const file of readdirSync(new URL(`../public/figuras/${year}/`, import.meta.url))) {
      assert.ok(referenced.has(`/figuras/${year}/${file}`), `arquivo órfão ${file}`);
    }
  }
});
