import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const banco = JSON.parse(readFileSync(new URL("../public/banco.json", import.meta.url), "utf8"));

const NEW_RE = /^ENEM-CN-(2020|2021|2022|2023)-REG-D2-C7-Q(\d{2,3})$/;
const novas = banco.questions.filter((q) => q.source_batch === "R2.0");
const NEW21_RE = /^ENEM-CN-(2015|2016)-REG-D1-C1-Q(\d{2})$|^ENEM-CN-(2017|2018|2019)-REG-D2-C7-Q(\d{2,3})$/;
const novas21 = banco.questions.filter((q) => q.source_batch === "R2.1");
const NOVAS = [...novas, ...novas21];
const parseNova = (id) => {
  const m = id.match(NEW_RE) ?? id.match(NEW21_RE);
  return m ? { year: m[1] ?? m[3], num: m[2] ?? m[4] } : null;
};

test("178 questões únicas (33 de 2024–2025 + 69 de 2020–2023 + 76 de 2015–2019)", () => {
  const ids = banco.questions.map((q) => q.id);
  assert.equal(ids.length, 178);
  assert.equal(new Set(ids).size, 178);
  const porAno = {};
  for (const q of banco.questions) porAno[q.year] = (porAno[q.year] ?? 0) + 1;
  assert.deepEqual(
    { 2020: porAno["2020"], 2021: porAno["2021"], 2022: porAno["2022"], 2023: porAno["2023"] },
    { 2020: 18, 2021: 17, 2022: 17, 2023: 17 },
  );
  assert.equal((porAno["2024"] ?? 0) + (porAno["2025"] ?? 0), 33);
  assert.deepEqual(
    [2015, 2016, 2017, 2018, 2019].map((y) => porAno[String(y)]),
    [16, 15, 15, 15, 15],
  );
  assert.equal(novas.length, 69);
  assert.equal(novas21.length, 76);
  for (const q of NOVAS) {
    assert.ok(parseNova(q.id), q.id);
    if (q.source_batch === "R2.0") assert.match(q.id, NEW_RE, q.id);
    else assert.match(q.id, NEW21_RE, q.id);
    assert.equal(q.scope, "VARIANT", q.id);
    assert.equal(q.matching_status, "not_matched", q.id);
    assert.equal(q.is_tri, false, q.id);
    assert.equal(q.is_empirical, false, q.id);
    assert.ok(Array.isArray(q.review_reasons) && q.review_reasons.length > 0, q.id);
    if (q.domain !== "INTERFACE_FISICA") {
      assert.equal(q.taxonomy_status, "CANDIDATE", q.id);
      assert.equal(q.matrix_status, "INFERRED", q.id);
      assert.match(q.skill_code, /^H([1-9]|[12]\d|30)$/, q.id);
      assert.match(q.competency_code, /^C[1-8]$/, q.id);
      for (const k of ["math_status", "reasoning_status", "representation_status", "prerequisite_status", "bloom_status", "demand_status"]) {
        assert.equal(q[k], "PARTIAL", `${q.id} ${k}`);
      }
      assert.ok(q.prerequisites.length > 0 && q.prerequisites.every((p) => /^PHY-CON-[A-Z_]+$/.test(p.id)), q.id);
      if (q.source_batch === "R2.1") assert.ok(q.review_reasons.some((r) => /inferid/i.test(r) && /R2\.1/.test(r)), q.id);
    }
  }
});

test("relações de aprendizagem: originais intactas, novas CANDIDATE e sem ciclos", () => {
  const isNew = (e) => e.origin === "R2.0" || e.origin === "R2.1";
  const orig = banco.learningEdges.filter((e) => !isNew(e));
  assert.equal(orig.length, 177);
  assert.equal(orig.filter((e) => e.status === "CONFIRMED").length, 39);
  assert.equal(orig.filter((e) => e.status === "CANDIDATE").length, 138);
  assert.equal(banco.cycles.length, 0);
  const ids = new Set(banco.questions.map((q) => q.id));
  const novosIds = new Set(NOVAS.map((q) => q.id));
  for (const e of [...banco.learningEdges, ...banco.pedagogicalEdges]) {
    assert.ok(ids.has(e.source) && ids.has(e.target), `${e.source}->${e.target}`);
    if (isNew(e)) {
      assert.equal(e.status, "CANDIDATE");
      assert.ok(novosIds.has(e.source) || novosIds.has(e.target));
    }
  }
  assert.equal(banco.pedagogicalEdges.filter((e) => !isNew(e)).length, 761);
  assert.ok(banco.learningEdges.some((e) => e.origin === "R2.1") && banco.pedagogicalEdges.some((e) => e.origin === "R2.1"));
  // sem ciclos por tipo de relação
  const byType = {};
  for (const e of banco.learningEdges) ((byType[e.type] ??= {})[e.source] ??= []).push(e.target);
  for (const [type, adj] of Object.entries(byType)) {
    const color = {};
    const dfs = (u) => {
      color[u] = 1;
      for (const v of adj[u] ?? []) {
        if (color[v] === 1) return true;
        if (!color[v] && dfs(v)) return true;
      }
      color[u] = 2;
      return false;
    };
    for (const u of Object.keys(adj)) assert.equal(!color[u] && dfs(u), false, `ciclo em ${type}`);
  }
  // novas questões de Física aparecem no cluster do seu domínio
  for (const q of NOVAS) {
    const cl = banco.clusters.find((c) => c.name === q.domain);
    assert.ok(cl && cl.canonical_ids.includes(q.id), q.id);
  }
});

test("interface e probable", () => {
  const iface = [
    "ENEM-CN-2024-D2-CAN-083", "ENEM-CN-2024-REG-D2-C6-Q92", "ENEM-CN-2025-D2-CAN-004", "ENEM-CN-2025-D2-CAN-010", "ENEM-CN-2025-REG-D2-C5-Q101",
    ...[[2020, [122, 126, 134]], [2021, [102, 120, 131, 133, 134]], [2022, [109, 130]], [2023, [93, 119, 130]]].flatMap(([y, ns]) => ns.map((n) => `ENEM-CN-${y}-REG-D2-C7-Q${n}`)),
    ...[[2015, [73, 85]], [2016, [89]]].flatMap(([y, ns]) => ns.map((n) => `ENEM-CN-${y}-REG-D1-C1-Q${n}`)),
    ...[[2017, [104, 107, 115, 121]], [2018, [95, 118, 129]], [2019, [98]]].flatMap(([y, ns]) => ns.map((n) => `ENEM-CN-${y}-REG-D2-C7-Q${n}`)),
  ];
  assert.equal(banco.questions.filter((q) => q.domain === "INTERFACE_FISICA").length, iface.length);
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
  assert.equal(ids.length, 178);
  assert.deepEqual(new Set(ids), new Set(banco.questions.map((q) => q.id)));
  const referenced = new Set();
  let withFig = 0;
  for (const [id, v] of Object.entries(oficial)) {
    assert.ok(Array.isArray(v.figures), id);
    assert.ok(["associada_caderno_azul", "sem_figura_na_prova", "nao_associada_variante_sem_caderno_azul", "recorte_integral_caderno_azul"].includes(v.figures_status), id);
    assert.equal(v.figures.length > 0, ["associada_caderno_azul", "recorte_integral_caderno_azul"].includes(v.figures_status), id);
    if (v.figures.length) withFig++;
    for (const f of v.figures) {
      const year = v.variants[0].year;
      assert.match(f.src, new RegExp(`^/figuras/${year}/${id}-\\d+\\.webp$`), id);
      assert.ok(existsSync(new URL(`../public${f.src}`, import.meta.url)), f.src);
      assert.ok(["enunciado", "alternativas", "expressao", "questao_integral"].includes(f.kind), f.src);
      assert.ok(f.label, f.src);
      assert.ok(f.width > 0 && f.height > 0, f.src);
      const azul = v.variants.find((x) => x.booklet === f.source.booklet);
      assert.ok(azul, `${id}: variante do caderno ${f.source.booklet}`);
      assert.equal(azul.number, f.source.number, id);
      if (NEW_RE.test(id) || NEW21_RE.test(id)) {
        assert.ok(azul.start_page <= f.source.page && f.source.page <= azul.end_page, id);
        if (azul.text_source?.startsWith("ocr")) assert.equal(f.source.text_match, null, id);
        // recorte de alternativas em imagem tem pouco texto: limiar menor (a questão fica em revisão)
        else assert.ok(f.source.text_match >= (f.kind === "alternativas" ? 0.75 : 0.85), `${id}: texto confere com o PDF`);
      } else {
        assert.equal(azul.start_page, f.source.page, id);
        assert.ok(f.source.text_match >= 0.9, `${id}: texto confere com o PDF`);
      }
      referenced.add(f.src);
    }
  }
  assert.equal(withFig, 118);
  for (const year of ["2015", "2016", "2017", "2018", "2019", "2020", "2021", "2022", "2023", "2024", "2025"]) {
    for (const file of readdirSync(new URL(`../public/figuras/${year}/`, import.meta.url))) {
      assert.ok(referenced.has(`/figuras/${year}/${file}`), `arquivo órfão ${file}`);
    }
  }
});

const gab = JSON.parse(readFileSync(new URL("./fixtures/gabarito-cn-2020-2023-azul.json", import.meta.url), "utf8")).gabaritos;

test("2020–2023: gabarito oficial, anuladas fora, OCR de 2021 sinalizado", () => {
  for (const q of novas) {
    const [, year, num] = q.id.match(NEW_RE);
    const v = oficial[q.id];
    assert.equal(v.variants.length, 1, q.id);
    const x = v.variants[0];
    assert.equal(x.booklet, 7, q.id);
    assert.equal(x.color, "azul", q.id);
    assert.equal(x.number, Number(num), q.id);
    assert.equal(x.answer_status, "official", q.id);
    assert.notEqual(gab[year][num], "ANULADA", `${q.id} anulada não deveria entrar`);
    assert.equal(x.answer, gab[year][num], q.id);
    assert.match(x.statement, new RegExp(`^Quest(ão|ÃO) ${num}\\b`, "i"), q.id);
    if (x.alternatives_status === "complete") assert.deepEqual(x.alternatives.map((a) => a.letter), ["A", "B", "C", "D", "E"], q.id);
    else assert.ok(v.figures.length > 0 || x.alternatives.length > 0, `${q.id}: alternativas incompletas sem recorte`);
    if (year === "2021") {
      assert.match(x.text_source, /^ocr/, q.id);
      assert.equal(x.extraction_status, "partial", q.id);
      assert.equal(q.review_required, true, q.id);
      assert.equal(v.figures_status, "recorte_integral_caderno_azul", q.id);
      assert.ok(v.figures.some((f) => f.kind === "questao_integral"), q.id);
    } else {
      assert.equal(x.text_source, "pdf_text_layer", q.id);
    }
  }
  assert.equal(gab["2020"]["135"], "ANULADA");
  assert.equal(oficial["ENEM-CN-2020-REG-D2-C7-Q135"], undefined);
});

const gab21 = JSON.parse(readFileSync(new URL("./fixtures/gabarito-cn-2015-2019-azul.json", import.meta.url), "utf8")).gabaritos;

test("2015–2019: gabarito oficial, caderno azul, texto do PDF, revisões sinalizadas", () => {
  for (const q of novas21) {
    const { year, num } = parseNova(q.id);
    const v = oficial[q.id];
    assert.equal(v.variants.length, 1, q.id);
    const x = v.variants[0];
    assert.equal(x.booklet, Number(year) <= 2016 ? 1 : 7, q.id);
    assert.equal(x.day, Number(year) <= 2016 ? 1 : 2, q.id);
    assert.equal(x.color, "azul", q.id);
    assert.equal(x.number, Number(num), q.id);
    assert.ok(Number(year) <= 2016 ? x.number >= 46 && x.number <= 90 : x.number >= 91 && x.number <= 135, q.id);
    assert.equal(x.answer_status, "official", q.id);
    assert.notEqual(gab21[year][num], "ANULADA", q.id);
    assert.equal(x.answer, gab21[year][num], q.id);
    assert.equal(x.text_source, "pdf_text_layer", q.id);
    assert.match(x.statement, new RegExp(`^Quest(ão|ÃO) ${num}\\b`, "i"), q.id);
    if (x.alternatives_status === "complete") assert.deepEqual(x.alternatives.map((a) => a.letter), ["A", "B", "C", "D", "E"], q.id);
    else {
      assert.equal(q.review_required, true, `${q.id}: alternativas incompletas exigem revisão`);
      assert.ok(v.figures.some((f) => ["alternativas", "expressao"].includes(f.kind)), `${q.id}: alternativas incompletas sem recorte`);
    }
  }
  // nenhuma questão de CN anulada em 2015–2019 (a Q163 de 2018 anulada é de Matemática)
  for (const y of ["2015", "2016", "2017", "2018", "2019"]) {
    assert.equal(Object.keys(gab21[y]).length, 45, y);
    assert.equal(Object.values(gab21[y]).includes("ANULADA"), false, y);
  }
});
