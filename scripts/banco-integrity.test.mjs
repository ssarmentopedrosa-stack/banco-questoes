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
    if (q.pedagogical_review) continue; // revisadas pelo Chico: teste próprio abaixo
    assert.equal(q.is_tri, false, q.id);
    assert.equal(q.is_empirical, false, q.id);
    assert.ok(Array.isArray(q.review_reasons) && q.review_reasons.length > 0, q.id);
    if (q.domain !== "INTERFACE_FISICA") {
      assert.ok(["CANDIDATE"].includes(q.taxonomy_status), q.id);
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
  const isRev = (e) => e.origin === "REV-CHICO";
  const orig = banco.learningEdges.filter((e) => !isNew(e) && !isRev(e));
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
    if (isRev(e)) assert.equal(e.status, "CANDIDATE");
    for (const end of [e.source, e.target]) {
      const q = banco.questions.find((x) => x.id === end);
      assert.ok(!q.out_of_scope && !q.canonical_id && q.domain !== "INTERFACE_FISICA", `aresta com registro fora do conjunto: ${end}`);
    }
  }
  assert.equal(banco.pedagogicalEdges.filter((e) => !isNew(e) && !isRev(e)).length, 761);
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
  for (const q of NOVAS.filter((x) => !x.out_of_scope && !x.canonical_id)) {
    const cl = banco.clusters.find((c) => c.name === q.domain);
    assert.ok(cl && cl.canonical_ids.includes(q.id), q.id);
  }
});

test("interface e probable", () => {
  // 2020–2025: a interface foi resolvida na revisão do Chico (ver teste abaixo); restam as de 2015–2019
  // a interface de 2015–2019 também foi resolvida (revisão do Chico do lote R2.1): não resta nenhuma
  const iface = [];
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
      assert.equal(q.review_required, !q.out_of_scope, q.id);
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
      assert.equal(q.review_required, !q.out_of_scope, `${q.id}: alternativas incompletas exigem revisão`);
      assert.ok(v.figures.some((f) => ["alternativas", "expressao"].includes(f.kind)), `${q.id}: alternativas incompletas sem recorte`);
    }
  }
  // nenhuma questão de CN anulada em 2015–2019 (a Q163 de 2018 anulada é de Matemática)
  for (const y of ["2015", "2016", "2017", "2018", "2019"]) {
    assert.equal(Object.keys(gab21[y]).length, 45, y);
    assert.equal(Object.values(gab21[y]).includes("ANULADA"), false, y);
  }
});

// ---------- Revisão pedagógica do Chico (2020–2025) ----------
const matriz = JSON.parse(readFileSync(new URL("../artifacts/banco_fisica_enem/matriz_cn_oficial.json", import.meta.url), "utf8"));
const vocab = JSON.parse(readFileSync(new URL("../artifacts/banco_fisica_enem/vocabulario_taxonomia.json", import.meta.url), "utf8"));
function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((x) => x !== "")) rows.push(row);
      row = [];
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows;
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}
const revisao = parseCsv(readFileSync(new URL("../artifacts/banco_fisica_enem/revisao_chico/revisao.csv", import.meta.url), "utf8"));
const byId = Object.fromEntries(banco.questions.map((q) => [q.id, q]));
const norm = (t) => (t ?? "").replace(/[\s-]+/g, "");

const revisao1519 = parseCsv(readFileSync(new URL("../artifacts/banco_fisica_enem/revisao_chico/revisao-2015-2019.csv", import.meta.url), "utf8"));

function checkRevisao(rows) {
  for (const r of rows) {
    const q = byId[r.id];
    assert.ok(q, r.id);
    const rv = q.pedagogical_review;
    assert.ok(rv, r.id);
    assert.equal(rv.status, "REVIEWED", r.id);
    assert.equal(rv.origin, "revisado: Chico", r.id);
    assert.equal(rv.justification, r.justificativa, r.id);
    assert.doesNotMatch(JSON.stringify(rv), /Silas|validad[oa] pelo professor/i, r.id);
    assert.notEqual(q.taxonomy_status, "CONFIRMED", r.id);
    assert.notEqual(q.matrix_status, "CONFIRMED", r.id);
    assert.equal(q.uncertainty, false, r.id);
    const dec = r.decisao.startsWith("Não é Física") ? "NAO_FISICA" : r.decisao.startsWith("Interdisciplinar") ? "INTERDISCIPLINAR" : "FISICA";
    assert.equal(q.discipline, dec, r.id);
    if (dec === "NAO_FISICA") continue;
    const m = r.dominio.match(/^([A-Z_]+) \/ ([A-Z_]+)(?: → ([A-Z_]+) \/ ([A-Z_]+))?/);
    assert.equal(q.domain, m[3] ?? m[1], r.id);
    assert.equal(q.content, m[4] ?? m[2], r.id);
    const sub = r.dominio.match(/sub (?:novo: )?([A-Z_]+)/);
    if (sub) assert.equal(q.subcontent, sub[1], r.id);
    const h = r.habilidade.match(/^(?:H\d+ → )?(H\d+)(?: \((C\d)\))?/);
    assert.equal(q.skill_code, h[1], r.id);
    assert.equal(q.competency_code, h[2] ?? matriz.habilidades[h[1]].competency, r.id);
    assert.equal(q.taxonomy_status, "REVIEWED", r.id);
    assert.equal(q.matrix_status, "REVIEWED", r.id);
    assert.ok(q.review_reasons.some((x) => x.includes("revisado: Chico")), r.id);
  }
}

test("revisão do Chico: 42 decisões aplicadas como revisão pedagógica (não validação humana)", () => {
  assert.equal(revisao.length, 42);
  checkRevisao(revisao);
});

test("revisão do Chico 2015–2019: 76 decisões, interface resolvida, Q121 fora do escopo", () => {
  assert.equal(revisao1519.length, 76);
  assert.deepEqual(new Set(revisao1519.map((r) => r.id)), new Set(novas21.map((q) => q.id)));
  checkRevisao(revisao1519);
  const g = (id) => byId[id];
  const out = g("ENEM-CN-2017-REG-D2-C7-Q121");
  assert.ok(out && oficial[out.id], "registro mantido");
  assert.equal(out.out_of_scope, true);
  assert.equal(out.domain, "FORA_DO_ESCOPO");
  assert.equal(out.review_required, false);
  for (const c of banco.clusters) assert.ok(!c.canonical_ids.includes(out.id), c.name);
  const q118 = g("ENEM-CN-2018-REG-D2-C7-Q118");
  assert.equal(q118.discipline, "FISICA");
  assert.deepEqual([q118.domain, q118.content], ["TERMODINAMICA", "DILATACAO_TERMICA"]);
  const inter = revisao1519.filter((r) => r.decisao.startsWith("Interdisciplinar")).map((r) => r.id);
  assert.equal(inter.length, 9);
  for (const id of inter) assert.ok(g(id).interface_note && g(id).discipline === "INTERDISCIPLINAR", id);
  for (const [id, h, c] of [["ENEM-CN-2017-REG-D2-C7-Q127", "H6", "C2"], ["ENEM-CN-2015-REG-D1-C1-Q79", "H18", "C5"], ["ENEM-CN-2019-REG-D2-C7-Q94", "H3", "C1"]]) {
    assert.deepEqual([g(id).skill_code, g(id).competency_code], [h, c], id);
  }
  // ex-interface sem camadas avaliadas: não se inventam camadas, seguem em revisão
  for (const r of revisao1519.filter((x) => x.grupo === "A" && !x.decisao.startsWith("Não é Física"))) {
    const q = g(r.id);
    assert.equal(q.review_required, true, r.id);
    assert.equal(q.bloom ?? null, null, r.id);
    assert.equal(q.prerequisites.length, 0, r.id);
  }
  // não sinalizadas continuam sem review_required; as de alternativas/expressões continuam
  for (const r of revisao1519.filter((x) => x.grupo === "C")) assert.equal(g(r.id).review_required, false, r.id);
  for (const r of revisao1519.filter((x) => x.grupo === "B")) assert.equal(g(r.id).review_required, true, r.id);
  assert.equal(novas21.filter((q) => q.review_required).length, 27);
});

test("regra: sem marca de revisão = classificação inferida/pipeline, nunca validação humana", () => {
  const visiveis = banco.questions.filter((q) => !q.out_of_scope && !q.canonical_id);
  assert.equal(visiveis.length, 174);
  assert.equal(visiveis.filter((q) => q.review_required).length, 66);
  const semRevisao = visiveis.filter((q) => !q.pedagogical_review);
  assert.equal(semRevisao.length, 60);
  for (const q of semRevisao) {
    assert.ok(!["REVIEWED"].includes(q.taxonomy_status) && !["REVIEWED"].includes(q.matrix_status), q.id);
    if (q.source_batch) assert.ok(q.review_reasons.some((x) => /inferid/i.test(x)), q.id);
  }
  for (const q of banco.questions) assert.equal(q.validado ?? false, false, q.id);
  assert.match(vocab.regra_status, /inferida e não validada/);
});

test("revisão do Chico: 2021-Q133 fora do escopo (mantida), duplicatas como variantes", () => {
  const q = byId["ENEM-CN-2021-REG-D2-C7-Q133"];
  assert.ok(q && oficial[q.id], "registro mantido");
  assert.equal(q.out_of_scope, true);
  assert.equal(q.domain, "FORA_DO_ESCOPO");
  assert.equal(q.review_required, false);
  assert.ok(q.exclusion_reason);
  for (const c of banco.clusters) assert.ok(!c.canonical_ids.includes(q.id), c.name);
  for (const [dup, can, ms] of [["ENEM-CN-2024-REG-D2-C6-Q92", "ENEM-CN-2024-D2-CAN-083", "confirmed"], ["ENEM-CN-2025-REG-D2-C5-Q101", "ENEM-CN-2025-D2-CAN-010", "probable"]]) {
    const d = byId[dup];
    assert.equal(d.canonical_id, can);
    assert.equal(d.matching_status, ms);
    const v = oficial[can].variants.find((x) => x.id === dup);
    assert.ok(v, `${dup} listada nas variantes de ${can}`);
    assert.equal(v.answer, oficial[can].variants[0].answer);
    assert.equal(new Set(oficial[can].variants.map((x) => x.booklet)).size, oficial[can].variants.length, can);
    assert.equal(d.domain, byId[can].domain);
    assert.equal(d.skill_code, byId[can].skill_code);
    for (const c of banco.clusters) assert.ok(!c.canonical_ids.includes(dup));
  }
  // 2024–2025: motivos e nota preenchidos
  for (const id of ["ENEM-CN-2024-D2-CAN-083", "ENEM-CN-2024-REG-D2-C6-Q92", "ENEM-CN-2025-D2-CAN-004", "ENEM-CN-2025-D2-CAN-010", "ENEM-CN-2025-REG-D2-C5-Q101"]) {
    assert.ok(byId[id].review_reasons.length >= 2 && byId[id].interface_note, id);
    assert.equal(byId[id].review_required, true, id);
  }
  // OCR ruim continua marcado
  for (const q of banco.questions.filter((x) => x.year === "2021" && x.source_batch === "R2.0" && !x.out_of_scope)) {
    assert.equal(q.review_required, true, q.id);
    assert.ok(q.review_reasons.some((x) => /OCR/.test(x)), q.id);
  }
  const emRevisao = revisao.filter((r) => byId[r.id].review_required).length;
  assert.equal(emRevisao, 41);
});

test("Matriz oficial: código, competência e texto de habilidade coerentes", () => {
  for (const q of banco.questions) {
    if (!q.skill_code) continue;
    const h = matriz.habilidades[q.skill_code];
    assert.ok(h, `${q.id} ${q.skill_code}`);
    assert.equal(q.competency_code, h.competency, `${q.id}: ${q.skill_code} é da ${h.competency}`);
    assert.equal(norm(q.skill_text), norm(h.text), `${q.id}: texto oficial de ${q.skill_code}`);
    assert.equal(norm(q.competency_text), norm(matriz.competencias[q.competency_code]), `${q.id}: texto oficial de ${q.competency_code}`);
  }
  const c = byId["ENEM-CN-2024-D2-CAN-025"];
  assert.equal(c.skill_code, "H21");
  assert.equal(c.competency_code, "C6");
});

test("vocabulário: cada conteúdo em um único domínio e valores novos incluídos", () => {
  const where = {};
  for (const [d, cs] of Object.entries(vocab.dominios)) for (const c of Object.keys(cs)) (where[c] ??= []).push(d);
  for (const [c, ds] of Object.entries(where)) assert.equal(ds.length, 1, `${c} em ${ds}`);
  assert.deepEqual(where.FENOMENOS_ONDULATORIOS, ["ONDAS"]);
  assert.ok(vocab.dominios.TERMODINAMICA.DILATACAO_TERMICA);
  for (const s of ["FISSAO_NUCLEAR", "ENERGIA_NUCLEAR"]) assert.ok(vocab.dominios.FISICA_MODERNA.RADIOATIVIDADE.includes(s), s);
  assert.ok(vocab.dominios.OPTICA.PROPAGACAO_RETILINEA && vocab.dominios.OPTICA.NATUREZA_DA_LUZ);
  assert.ok(vocab.dominios.OPTICA.ESPECTRO_ELETROMAGNETICO.includes("COR_ADITIVA"));
  assert.ok(vocab.decisoes.NATUREZA_DA_LUZ);
  for (const q of banco.questions) {
    if (["INTERFACE_FISICA", "FORA_DO_ESCOPO"].includes(q.domain)) continue;
    assert.ok(vocab.dominios[q.domain]?.[q.content], `${q.id}: ${q.domain}/${q.content}`);
    if (q.subcontent && q.subcontent !== "INDETERMINADO") assert.ok(vocab.dominios[q.domain][q.content].includes(q.subcontent), `${q.id}: ${q.subcontent}`);
  }
});
