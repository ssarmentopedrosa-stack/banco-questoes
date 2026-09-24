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
