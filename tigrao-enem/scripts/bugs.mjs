// Testes dos bugs: alternativa-imagem no resultado (3), Dica do Tigrão/fallback (4), layout desktop (5), retomar quiz (6).
// Uso: npm run build && node scripts/bugs.mjs [pasta-de-prints]
import { chromium } from "playwright-core";
import { preview } from "vite";
import { readFileSync, mkdirSync } from "node:fs";

const OUT = (process.argv[2] ?? "/workspace/tigrao-prints/").replace(/\/?$/, "/");
mkdirSync(OUT, { recursive: true });
const ler = (f) => JSON.parse(readFileSync(new URL("../src/" + f, import.meta.url))).questions;
const FIS = ler("questoes.json"), MAT = ler("materias/matematica.json");
const comDica = FIS.find((q) => q.explanation?.keyConcept && q.options && !q.figures.length);
const semRes = FIS.find((q) => !q.explanation && q.options);
const comImg = MAT.filter((q) => q.options?.every((o) => o.img)).slice(0, 2);
const PORT = 4193;
const server = await preview({ root: new URL("..", import.meta.url).pathname, preview: { port: PORT, host: "127.0.0.1" } });
const browser = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] });
const check = (c, m) => { console.log((c ? "OK   " : "FALHA") + " " + m); if (!c) process.exitCode = 1; };
const URL0 = `http://127.0.0.1:${PORT}/`;
const ret = (materia, ids, respostas = []) => ({ v: 1, materia, mode: "pratica", topic: null, ids, revisao: [], respostas, nDicas: 0, xp: 0, inicio: Date.now(), salvo: Date.now() });
const erros = [];
async function nova(vp, mobile) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile, locale: "pt-BR" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => erros.push(String(e)));
  await page.goto(URL0); await page.waitForTimeout(400);
  return page;
}
const semear = (page, materia, r) => page.evaluate(([m, r]) => { localStorage.clear(); localStorage.setItem("tigrao-enem-materia", m); if (r) localStorage.setItem(`tigrao-enem-${m}-quiz-v1`, JSON.stringify(r)); }, [materia, r]);
const letra = (page, l) => page.getByRole("button", { name: `Alternativa ${l}`, exact: true }).click();
const prox = (page) => page.getByRole("button", { name: /Próxima questão|Ver resultado/ }).click();

// ---- 6 + 4: retomar quiz e dica (Física, celular)
let page = await nova({ width: 390, height: 844 }, true);
await semear(page, "fisica", ret("fisica", [comDica.id, semRes.id, FIS[5].id]));
await page.reload(); await page.waitForTimeout(900);
check(await page.getByTestId("retomar-quiz").isVisible(), "6: oferece retomar quiz salvo");
await page.getByRole("button", { name: "Retomar" }).click(); await page.waitForTimeout(500);
check(await page.getByTestId("dicas").isVisible(), "4: questão com resolução mostra 'Pedir uma Dica do Tigrão'");
await page.getByText("Pedir uma Dica do Tigrão").click();
check((await page.getByTestId("dicas").innerText()).includes("Conceito-chave"), "4: dica mostra trecho da resolução");
await letra(page, comDica.answer); await page.waitForTimeout(300);
await page.reload(); await page.waitForTimeout(900);
check((await page.getByTestId("retomar-quiz").innerText()).includes("questão 2 de 3"), "6: depois de responder e recarregar, retoma na questão 2 de 3");
await page.getByRole("button", { name: "Retomar" }).click(); await page.waitForTimeout(500);
check(await page.getByTestId("sem-dica").isVisible() && !(await page.getByTestId("dicas").count()), "4: questão sem resolução mostra aviso claro em vez de sumir com o botão");
await page.reload(); await page.waitForTimeout(700);
await page.getByRole("button", { name: "Descartar" }).click();
check(!(await page.getByTestId("retomar-quiz").count()) && (await page.evaluate(() => localStorage.getItem("tigrao-enem-fisica-quiz-v1"))) === null, "6: descartar apaga o quiz salvo");
for (const [nome, r] of [["ids inexistentes", ret("fisica", ["NAO-EXISTE"])], ["matéria errada", ret("biologia", [comDica.id])], ["versão errada", { ...ret("fisica", [comDica.id]), v: 9 }], ["velho (8 dias)", { ...ret("fisica", [comDica.id]), salvo: Date.now() - 8 * 864e5 }], ["letra inválida", ret("fisica", [comDica.id, semRes.id], ["Z"])]]) {
  await semear(page, "fisica", r); await page.reload(); await page.waitForTimeout(600);
  check(!(await page.getByTestId("retomar-quiz").count()), `6: salvo inválido (${nome}) é descartado`);
}
await page.evaluate(() => { localStorage.setItem("tigrao-enem-fisica-quiz-v1", "{lixo"); }); await page.reload(); await page.waitForTimeout(600);
check(!(await page.getByTestId("retomar-quiz").count()) && !erros.length, "6: JSON corrompido não quebra o app");

// ---- 3: alternativa-imagem no resultado (Matemática)
await semear(page, "matematica", ret("matematica", comImg.map((q) => q.id)));
await page.reload(); await page.waitForTimeout(900);
await page.getByRole("button", { name: "Retomar" }).click(); await page.waitForTimeout(500);
check(await page.getByTestId("sem-dica").isVisible(), "4: Matemática (sem resoluções ainda) mostra o aviso de sem dica");
const errada = (q) => ["A", "B", "C", "D", "E"].find((l) => l !== q.answer);
await letra(page, errada(comImg[0])); await page.waitForTimeout(400); await prox(page); await page.waitForTimeout(500);
await letra(page, comImg[1].answer); await page.waitForTimeout(400); await prox(page); await page.waitForTimeout(1500);
const corpo = await page.locator("body").innerText();
check(!corpo.includes("alternativa na figura"), "3: resultado não mostra mais 'alternativa na figura'");
const imgs = await page.locator('[data-testid="opcao-resumo"] img').evaluateAll((l) => l.map((i) => i.complete && i.naturalWidth > 0));
check(imgs.length >= 3 && imgs.every(Boolean), `3: resultado mostra a imagem das alternativas (${imgs.length} imagens carregadas)`);
check((await page.evaluate(() => localStorage.getItem("tigrao-enem-matematica-quiz-v1"))) === null, "6: terminar o quiz apaga o salvo");
await page.locator('[data-testid="opcao-resumo"]').first().scrollIntoViewIfNeeded();
await page.screenshot({ path: OUT + "resultado_alternativa_imagem.png" });

// ---- 5: layout desktop e celular
const larg = (p) => p.evaluate(() => { const el = document.querySelector("#root > div > div") ?? document.querySelector("#root > div"); return [el.getBoundingClientRect().width, document.documentElement.scrollWidth, innerWidth]; });
page = await nova({ width: 1440, height: 900 }, false);
await semear(page, "fisica", ret("fisica", [comDica.id, FIS[5].id]));
await page.reload(); await page.waitForTimeout(900);
await page.getByRole("button", { name: "Retomar" }).click(); await page.waitForTimeout(600);
const [w, sw, iw] = await larg(page);
const fonte = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
check(w >= 680 && w <= 760, `5: desktop com largura de leitura ${Math.round(w)}px (680–760)`);
check(fonte >= 17, `5: desktop com fonte base maior (${fonte}px)`);
check(sw <= iw, "5: desktop sem rolagem horizontal");
await page.screenshot({ path: OUT + "desktop_quiz.png" });
page = await nova({ width: 360, height: 780 }, true);
const [w2, sw2, iw2] = await larg(page);
check(w2 <= 360 && sw2 <= iw2, `5: celular continua sem rolagem horizontal (${Math.round(w2)}px)`);
check(!erros.length, "sem erros de página" + (erros.length ? ": " + erros.join(" | ") : ""));
await browser.close(); server.httpServer.close();
