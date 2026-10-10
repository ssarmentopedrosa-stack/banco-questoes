// Testa as matérias novas (Biologia, Química, Geografia, Ciências da Natureza) e a preservação do progresso de Física.
// Uso: npm run build && node scripts/materias.mjs [pasta-de-prints]
import { chromium } from "playwright-core";
import { preview } from "vite";
import { readFileSync, mkdirSync } from "node:fs";

const OUT = (process.argv[2] ?? new URL("../prints/materias/", import.meta.url).pathname).replace(/\/?$/, "/");
mkdirSync(OUT, { recursive: true });
const ler = (f) => JSON.parse(readFileSync(new URL("../src/" + f, import.meta.url))).questions;
const BANCO = { fisica: ler("questoes.json"), biologia: ler("materias/biologia.json"), quimica: ler("materias/quimica.json"), geografia: ler("materias/geografia.json") };
BANCO.natureza = [...BANCO.fisica, ...BANCO.biologia, ...BANCO.quimica];
const PORT = 4191;
const server = await preview({ root: new URL("..", import.meta.url).pathname, preview: { port: PORT, host: "127.0.0.1" } });
const browser = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "pt-BR" });
const page = await ctx.newPage();
const erros = [];
page.on("pageerror", (e) => erros.push(String(e)));
page.on("console", (m) => m.type() === "error" && erros.push(m.text()));
page.on("response", (r) => r.status() >= 400 && erros.push(r.status() + " " + r.url()));
const wait = (ms) => page.waitForTimeout(ms);
const check = (cond, msg) => { console.log((cond ? "OK   " : "FALHA") + " " + msg); if (!cond) process.exitCode = 1; };
const URL0 = `http://127.0.0.1:${PORT}/`;
const KEY = (m) => `tigrao-enem-${m}-v1`;
const st = (m) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || "null"), KEY(m));
const atual = async (m) => {
  const chip = await page.locator("text=/^ENEM \\d{4} · Q\\d+$/").first().innerText();
  const [, ano, num] = chip.match(/ENEM (\d{4}) · Q(\d+)/);
  const qs = BANCO[m].filter((x) => x.year === +ano && x.number === +num);
  if (!qs.length) throw new Error(m + ": questão não encontrada " + chip);
  return qs[0];
};
const letra = (l) => page.getByRole("button", { name: `Alternativa ${l}`, exact: true }).click();
const imagensOk = () => page.evaluate(() => [...document.querySelectorAll("main img, img")].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src));

// 1) progresso antigo de Física (sem escolha de matéria salva) → abre direto na Física, XP intacto
await page.goto(URL0); await wait(500);
const fis = BANCO.fisica.slice(0, 3).map((q) => q.id);
await page.evaluate(([k, ids]) => {
  localStorage.clear();
  const h = new Date().toLocaleDateString("sv-SE");
  const answers = Object.fromEntries(ids.map((id) => [id, { correct: true, attempts: 1, everCorrect: true, lastAt: new Date().toISOString() }]));
  localStorage.setItem(k, JSON.stringify({ xp: 420, answers, streak: { count: 3, best: 3, lastDate: h }, daily: { date: h, count: 3, goalPaid: false }, badges: ["primeira"], simulados: [], review: {}, recent: ids, week: { id: "2020-01-06", answered: 3, days: [h], simulados: 0, paid: [] } }));
}, [KEY("fisica"), fis]);
await page.goto(URL0); await wait(1200);
check(await page.getByText("Física, questões oficiais").isVisible(), "quem já tinha progresso de Física cai direto na Física");
check(await page.getByText("420 XP").first().isVisible(), "XP de Física preservado (420)");
const xpFis = (await st("fisica")).xp;

// 2) cada matéria: escolha, home, prática com figura, mini-simulado completo
for (const m of ["biologia", "quimica", "geografia", "natureza"]) {
  await page.getByTestId("trocar-materia").click(); await wait(500);
  check(await page.getByTestId("materia-" + m).isVisible(), `${m}: tela de escolha aparece`);
  if (m === "biologia") { check((await page.getByTestId("materia-fisica").innerText()).includes("420 XP"), "card de Física mostra o XP salvo"); await page.screenshot({ path: OUT + "00_escolha.png" }); }
  await page.getByTestId("materia-" + m).click(); await wait(1500);
  check(await page.getByText("Tigrão ENEM", { exact: true }).isVisible(), `${m}: home abre`);
  const s0 = await st(m);
  check(s0 === null || s0.xp === 0, `${m}: começa com XP próprio zerado`);
  await page.screenshot({ path: OUT + `${m}_1_home.png` });
  // prática: responde 5, procurando uma com figura
  await page.getByText("Mistão do dia").first().click().catch(async () => { await page.getByText(/Mistão/).first().click(); });
  await wait(600);
  let fotoFig = false;
  for (let k = 0; k < 5; k++) {
    const q = await atual(m);
    if (!fotoFig && q.figures.length) { await wait(500); await page.screenshot({ path: OUT + `${m}_2_figura.png`, fullPage: true }); fotoFig = true; }
    await letra(k % 2 ? "A" : q.answer); await wait(250);
    if (k === 0) { await page.screenshot({ path: OUT + `${m}_3_corrigida.png`, fullPage: true }); check((await page.getByText("Revisada pelo Prof").count()) === 0, `${m}: sem selo de revisada`); }
    await page.getByText("Próxima questão").click(); await wait(350);
  }
  await page.getByRole("button", { name: "Sair" }).click(); await wait(200);
  const dlg = page.getByRole("dialog");
  if (await dlg.count()) await dlg.getByRole("button", { name: "Sair" }).click();
  await wait(400);
  await page.getByRole("button", { name: "Início" }).click(); await wait(400);
  const s1 = await st(m);
  check(s1 && s1.xp > 0 && Object.keys(s1.answers).length === 5, `${m}: prática salva no progresso próprio (${s1?.xp} XP, ${Object.keys(s1?.answers ?? {}).length} respostas)`);
  check(Object.keys(s1.answers).every((id) => BANCO[m].some((q) => q.id === id)), `${m}: respostas só de questões da matéria`);
  // mini-simulado
  await page.getByText("Mini-simulado").first().click(); await wait(700);
  check((await page.getByTestId("contador").innerText()) === "1/15", `${m}: mini-simulado tem 15 questões`);
  const ids = [], temas = new Set();
  for (let k = 0; k < 15; k++) {
    const q = await atual(m); ids.push(q.id); temas.add(q.area);
    await letra(k % 3 === 0 ? q.answer : ["A", "B", "C", "D", "E"].find((l) => l !== q.answer)); await wait(120);
    await page.getByText(k === 14 ? "Ver resultado" : "Confirmar e seguir").click(); await wait(200);
  }
  await wait(900);
  check(new Set(ids).size === 15, `${m}: simulado sem repetição (${temas.size} temas)`);
  check(await page.getByText("5/15").isVisible(), `${m}: placar 5/15`);
  await page.screenshot({ path: OUT + `${m}_4_simulado.png` });
  const s2 = await st(m);
  check(s2.simulados.length === 1 && s2.simulados[0].kind === "mini", `${m}: simulado registrado`);
  check((await imagensOk()).length === 0, `${m}: nenhuma imagem quebrada`);
  // simulado completo de 45: abre e sai
  await page.getByRole("button", { name: "Início" }).click(); await wait(400);
  const comp = page.getByText(/^Simulado (ENEM|Ciências da Natureza)$/).first();
  if (await comp.isEnabled()) {
    await comp.click(); await wait(1200);
    check((await page.getByTestId("contador").innerText()) === "1/45", `${m}: simulado completo com 45 questões`);
    await page.getByRole("button", { name: "Sair" }).click(); await wait(200);
    if (await page.getByRole("dialog").count()) await page.getByRole("dialog").getByRole("button", { name: "Sair" }).click();
    await wait(400);
  } else check(false, `${m}: simulado completo indisponível`);
}


// 4) Física continua intacta e o backup recusa matéria errada
await page.getByTestId("trocar-materia").click(); await wait(400);
await page.getByTestId("materia-fisica").click(); await wait(1200);
check((await st("fisica")).xp === xpFis, `XP de Física intacto depois de jogar as outras (${xpFis})`);
await page.getByText("Ajustes").first().click(); await wait(400);
await page.getByRole("button", { name: "Gerar código" }).click(); await wait(600);
const codigo = await page.locator("textarea").first().inputValue();
await page.getByRole("button", { name: "Voltar" }).click(); await wait(300);
await page.getByTestId("trocar-materia").click(); await wait(300);
await page.getByTestId("materia-quimica").click(); await wait(1200);
await page.getByText("Ajustes").first().click(); await wait(400);
await page.getByTestId("codigo-import").fill(codigo); await page.getByRole("button", { name: "Importar código" }).click(); await wait(400);
check(await page.getByText(/progresso de Física/).isVisible(), "backup de Física não entra na Química");
check(erros.length === 0, "sem erros no console " + erros.join(" | "));
await browser.close();
server.httpServer.close();
