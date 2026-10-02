/**
 * Gera export/desafio-enem/{publico.json,gabarito.json,manifest.json} a partir de public/banco.json e
 * public/oficial-view.json. Reproduzível: rodar de novo sem mudar os dados não altera nenhum byte.
 * Uso: npm run export:desafio        (ou --check: falha se os arquivos commitados estiverem desatualizados)
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { buildExports } from "../src/lib/gamificacao/export.ts";

const root = new URL("../", import.meta.url);
const read = (p: string) => JSON.parse(readFileSync(new URL(p, root), "utf8"));
const { publico, gabarito } = buildExports(read("public/banco.json"), read("public/oficial-view.json"));
const pub = JSON.stringify(publico, null, 1) + "\n";
const gab = JSON.stringify(gabarito, null, 1) + "\n";
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const figuras = [...new Set(publico.questions.flatMap((q) => q.figures.map((f) => f.src)))].sort();
const manifest =
  JSON.stringify(
    {
      version: publico.version,
      schema: publico.schema,
      counts: publico.counts,
      files: { "publico.json": sha(pub), "gabarito.json": sha(gab) },
      figuras: { base: "public", count: figuras.length, files: figuras },
      notas: "gabarito.json é SÓ para servidor. Nunca servir ao navegador.",
    },
    null,
    1
  ) + "\n";
const dir = new URL("export/desafio-enem/", root);
const files: Record<string, string> = { "publico.json": pub, "gabarito.json": gab, "manifest.json": manifest };
if (process.argv.includes("--check")) {
  const stale = Object.entries(files).filter(([n, c]) => !existsSync(new URL(n, dir)) || readFileSync(new URL(n, dir), "utf8") !== c);
  if (stale.length) {
    console.error(`Export desatualizado: ${stale.map(([n]) => n).join(", ")}. Rode npm run export:desafio.`);
    process.exit(1);
  }
  console.log(`Export em dia (versão ${publico.version}).`);
} else {
  mkdirSync(dir, { recursive: true });
  for (const [n, c] of Object.entries(files)) writeFileSync(new URL(n, dir), c);
  console.log(`Export ${publico.version}: ${publico.counts.total} questões (${publico.counts.reviewRequired} em revisão), ${figuras.length} figuras.`);
}
