// Confere o parser de resoluções em tópicos em TODAS as questões (todas as matérias):
// nada do texto original se perde, a resposta é a do gabarito oficial e toda resolução tem ideia/passos.
// Uso: node scripts/checa_resolucoes.mjs
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const tmp = "/tmp/tigrao_resolucao_js";
mkdirSync(tmp, { recursive: true });
execSync(`npx tsc ${new URL("../src/resolucao.ts", import.meta.url).pathname} --outDir ${tmp} --module esnext --target es2022 --skipLibCheck`, { stdio: "inherit" });
writeFileSync(tmp + "/package.json", '{"type":"module"}');
const { estruturar } = await import(tmp + "/resolucao.js");
const ler = (f) => JSON.parse(readFileSync(new URL("../src/" + f, import.meta.url))).questions;
const norm = (s) => s.replace(/\*\*/g, "").replace(/^- /gm, "").replace(/[\s:]+/g, "");
let falhas = 0, total = 0;
const stats = {};
for (const [m, f] of [["fisica", "questoes.json"], ["biologia", "materias/biologia.json"], ["quimica", "materias/quimica.json"], ["geografia", "materias/geografia.json"]]) {
  stats[m] = { com: 0, comOutras: 0, passosMax: 0 };
  for (const q of ler(f)) {
    if (!q.explanation) continue;
    total++; stats[m].com++;
    const r = estruturar(q.explanation, q.answer);
    const pedacos = [...r.ideia, ...r.passos, ...r.outras, r.porQue].map(norm).filter(Boolean);
    const orig = norm(q.explanation.markdown.replace(/\*\*(Ideia central|Resolução|Distratoras|Por que [A-E]):?\*\*/g, "").replace(/\*\*Resposta:\s*[A-E]\*\*\s*$/, ""));
    const erros = [];
    if (pedacos.join("").length !== orig.length || pedacos.some((p) => !orig.includes(p))) erros.push("texto diferente do original");
    if (r.resposta !== q.answer) erros.push("resposta ≠ gabarito");
    if (!(r.ideia.length || r.conceito)) erros.push("sem ideia-chave");
    if (!r.passos.length) erros.push("sem passos");
    if (r.outras.length) stats[m].comOutras++;
    stats[m].passosMax = Math.max(stats[m].passosMax, r.passos.length);
    if (erros.length) { falhas++; console.log("FALHA", q.id, erros.join("; ")); }
  }
}
console.log(JSON.stringify(stats));
console.log((falhas ? "FALHA" : "OK   ") + ` parser de resoluções: ${total - falhas}/${total} sem perda de texto e com a resposta oficial`);
if (falhas) process.exitCode = 1;
