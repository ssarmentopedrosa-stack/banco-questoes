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
await ctx.addInitScript(() => { window.__tigraoSorte = () => 1; });
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
  check(await page.getByTestId("treino-rapido").isVisible() && /Dia de folga/.test(await page.getByTestId("folga").innerText()), `${m}: home com Treino rápido de 5 e dia de folga`);
  // prática: responde 5, procurando uma com figura
  await page.getByText("Mistão do dia").first().click().catch(async () => { await page.getByText(/Mistão/).first().click(); });
  await wait(600);
  let fotoFig = false;
  for (let k = 0; k < 5; k++) {
    const q = await atual(m);
    if (!fotoFig && q.figures.length) {
      await wait(500); await page.screenshot({ path: OUT + `${m}_2_figura.png`, fullPage: true }); fotoFig = true;
      if (await page.getByTestId("figura").count()) check(await page.getByTestId("figura").first().locator("img").evaluate((e) => e.getBoundingClientRect().width >= window.innerWidth * 0.85), `${m}: figura em largura total (${q.id})`);
    }
    await letra(k % 2 ? "A" : q.answer); await wait(250);
    if (k === 0) { await page.screenshot({ path: OUT + `${m}_3_corrigida.png`, fullPage: true }); check((await page.getByText(/Revisada pelo Prof/).count()) === 0, `${m}: sem selo de revisada`); }
    if (k === 1 && q.explanation && q.answer !== "A") {
      await page.screenshot({ path: OUT + `${m}_3b_errou_resolucao.png`, fullPage: true });
      check(await page.getByText("Resolução ainda não revisada pelo professor").isVisible(), `${m}: errou → resolução com aviso de não revisada`);
      check((await page.getByTestId("reacao-tigrao").getAttribute("data-reacao")) === "erro" && (await page.getByTestId("fala-tigrao").innerText()).length > 15, `${m}: Tigrão reage ao erro com fala de treinador`);
      const rt = page.getByTestId("resolucao-topicos");
      check((await rt.getByTestId("sec-como").count()) === 1 && (await rt.locator("li").count()) >= 2 && (await rt.getByTestId("sec-resposta").innerText()).includes("Resposta: " + q.answer), `${m}: resolução em tópicos (${await rt.locator("li").count()} bullets, ${(await rt.getByTestId("sec-outras").count()) ? "com" : "sem"} 'por que as outras')`);
      const corpo = await page.locator("body").innerText();
      check(!corpo.includes("**") && !corpo.includes("Revisada pelo Prof"), `${m}: resolução formatada (sem "**") e sem selo de revisada`);
    }
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
  check((await page.getByTestId("pct-geral").getAttribute("data-faixa")) === "vermelho" && (await page.getByTestId("legenda-faixas").count()) === 1, `${m}: 33% em vermelho, com legenda das faixas`);
  const fx = await page.getByTestId("tema-resultado").evaluateAll((els) => els.map((e) => [e.getAttribute("data-faixa"), +e.innerText.match(/(\d+)%/)[1]]));
  check(fx.every(([f, p]) => f === (p < 40 ? "vermelho" : p < 70 ? "ambar" : "verde")), `${m}: cores do relatório por faixa (${fx.map(([f, p]) => p + "%=" + f).join(" ")})`);
  await page.screenshot({ path: OUT + `${m}_4_simulado.png` });
  const s2 = await st(m);
  check(s2.simulados.length === 1 && s2.simulados[0].kind === "mini", `${m}: simulado registrado`);
  check((await imagensOk()).length === 0, `${m}: nenhuma imagem quebrada`);
  // Treino rápido de 5
  await page.getByRole("button", { name: "Início" }).click(); await wait(400);
  await page.getByTestId("treino-rapido").click(); await wait(600);
  check((await page.getByTestId("contador").innerText()) === "1/5", `${m}: treino rápido tem 5 questões`);
  for (let k = 0; k < 5; k++) {
    const q = await atual(m);
    await letra(q.answer); await wait(250);
    await page.getByText(k === 4 ? "Ver resultado" : "Próxima questão").click(); await wait(300);
  }
  await wait(500);
  check(await page.getByText("Treino rápido de 5").first().isVisible() && await page.getByText("5/5").isVisible(), `${m}: resultado do treino rápido 5/5`);
  await page.getByRole("button", { name: "Início" }).click(); await wait(400);
  // domínio com níveis
  await page.getByRole("button", { name: "Meu domínio por tema" }).click(); await wait(500);
  const chips = await page.locator('[data-testid^="nivel-"]').allInnerTexts();
  check(chips.length > 0 && chips.every((c) => /Iniciante|Praticando|Dominando|sem dados/.test(c)) && chips.some((c) => /Iniciante|Praticando|Dominando/.test(c)) && await page.getByTestId("proximo-passo").isVisible() && await page.getByTestId("regras-nivel").isVisible(), `${m}: domínio com níveis (${chips.join(", ")}) e próximo passo`);
  if (m === "biologia") await page.screenshot({ path: OUT + "biologia_5_dominio.png" });
  await page.getByRole("button", { name: "Voltar" }).click(); await wait(300);
  // simulado completo de 45: abre e sai
  const comp = page.getByText(/^Simulado (ENEM|Ciências da Natureza)$/).first();
  if (await comp.isEnabled()) {
    await comp.click(); await wait(1200);
    check((await page.getByTestId("contador").innerText()) === "1/45", `${m}: simulado completo com 45 questões`);
    await page.getByRole("button", { name: "Sair" }).click(); await wait(200);
    if (await page.getByRole("dialog").count()) await page.getByRole("dialog").getByRole("button", { name: "Sair" }).click();
    await wait(400);
  } else check(false, `${m}: simulado completo indisponível`);
}


// 3) som é preferência do aparelho: vale para todas as matérias e não mexe no progresso
{
  const antes = await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).filter((k) => /-v1$/.test(k)).map((k) => { const o = JSON.parse(localStorage.getItem(k)); return [k, { xp: o.xp, answers: o.answers, simulados: o.simulados?.length }]; })));
  await page.getByTestId("botao-som").click(); await wait(200);
  await page.getByTestId("trocar-materia").click(); await wait(400);
  await page.getByTestId("materia-biologia").click(); await wait(1200);
  check((await page.getByTestId("botao-som").getAttribute("aria-pressed")) === "true", "silêncio vale em todas as matérias");
  await page.getByTestId("botao-som").click(); await wait(200);
  const depois = await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).filter((k) => /-v1$/.test(k)).map((k) => { const o = JSON.parse(localStorage.getItem(k)); return [k, { xp: o.xp, answers: o.answers, simulados: o.simulados?.length }]; })));
  const dif = Object.keys({ ...antes, ...depois }).filter((k) => JSON.stringify(antes[k]) !== JSON.stringify(depois[k]));
  check(dif.length === 0, "preferência de som não altera o progresso das matérias" + (dif.length ? " — muda: " + dif.map((k) => k + " " + JSON.stringify(antes[k])?.slice(0, 80) + " → " + JSON.stringify(depois[k])?.slice(0, 80)).join(" | ") : ""));
  check(JSON.parse(await page.evaluate(() => localStorage.getItem("tigrao-enem-som"))).ligado === true, "som religado e salvo");
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
