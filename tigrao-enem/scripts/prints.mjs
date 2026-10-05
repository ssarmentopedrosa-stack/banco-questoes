// Testa o app em largura de celular e gera prints (precisa de `npm run build` antes).
// Uso: node scripts/prints.mjs [pasta-de-saida]
import { chromium } from "playwright-core";
import { preview } from "vite";
import { readFileSync, mkdirSync } from "node:fs";

const OUT = (process.argv[2] ?? new URL("../prints/", import.meta.url).pathname).replace(/\/?$/, "/");
mkdirSync(OUT, { recursive: true });
const Q = JSON.parse(readFileSync(new URL("../src/questoes.json", import.meta.url))).questions;
const server = await preview({ root: new URL("..", import.meta.url).pathname, preview: { port: 4189, host: "127.0.0.1" } });
const browser = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "pt-BR" });
const page = await ctx.newPage();
const erros = [];
page.on("pageerror", (e) => erros.push(String(e)));
page.on("console", (m) => m.type() === "error" && erros.push(m.text()));
const wait = (ms) => page.waitForTimeout(ms);
const check = (cond, msg) => { console.log((cond ? "OK   " : "FALHA") + " " + msg); if (!cond) process.exitCode = 1; };
const state = () => page.evaluate(() => JSON.parse(localStorage.getItem("tigrao-enem-fisica-v1") || "null"));
const atual = async () => {
  const chip = await page.locator("text=/^ENEM \\d{4} · Q\\d+$/").first().innerText();
  const area = (await page.locator("text=/^\\S+ (Mecânica|Eletricidade e Magnetismo|Ondulatória|Termologia|Óptica|Física Moderna)$/").first().innerText()).replace(/^\S+ /, "");
  const [, ano, num] = chip.match(/ENEM (\d{4}) · Q(\d+)/);
  const q = Q.find((x) => x.year === +ano && x.number === +num && x.area === area);
  if (!q) throw new Error("questão não encontrada: " + chip);
  return q;
};
const clicaLetra = (l) => page.getByRole("button", { name: `Alternativa ${l}`, exact: true }).click();

await page.goto("http://127.0.0.1:4189/"); await wait(1200);
check(await page.getByText("Banco do Tigrão").isVisible(), "home abre com o Tigrão");
const vHome = page.locator('video[data-clip="anim_abertura"]');
check((await vHome.count()) === 1, "home usa o clipe de abertura");
await page.waitForFunction(() => { const v = document.querySelector('video[data-clip="anim_abertura"]'); return v && v.readyState >= 2 && !v.paused && v.currentTime > 0.3; }, null, { timeout: 8000 }).then(() => check(true, "abertura toca (autoplay mudo, em loop)"), () => check(false, "abertura toca"));
check(await vHome.evaluate((v) => v.muted && v.loop && v.playsInline && v.autoplay && !!v.poster), "vídeo muted+loop+playsinline+autoplay com pôster");
await page.screenshot({ path: OUT + "01_home_tigrao.png" });
await page.screenshot({ path: OUT + "11_home_tigrao_animado.png" });

// prática por tema até achar questão com figura
await page.getByText("Praticar por tema").click(); await wait(400);
await page.screenshot({ path: OUT + "05_temas.png" });
await page.getByText("Mecânica", { exact: true }).click(); await wait(500);
const vistosPratica = [];
let q = await atual();
for (let k = 0; k < 9 && !(q.figures.some((f) => f.kind === "enunciado") && q.options && q.explanation); k++) {
  vistosPratica.push(q.id);
  await clicaLetra(q.answer); await wait(300);
  await page.getByText("Próxima questão").click(); await wait(400);
  q = await atual();
}
vistosPratica.push(q.id);
check(q.figures.length > 0, `questão com figura: ${q.id}`);
await page.waitForFunction(() => [...document.querySelectorAll('img[src*="figuras"]')].every((i) => i.complete && i.naturalWidth > 0));
await page.screenshot({ path: OUT + "02_questao_com_figura.png" });

// erro: sem XP, Tigrão pensativo, rolagem até o feedback
const xpAntes = (await state()).xp;
const errada = ["A", "B", "C", "D", "E"].find((l) => l !== q.answer);
await clicaLetra(errada); await wait(1200);
const s1 = await state();
check(s1.xp === xpAntes, `erro não dá XP (${xpAntes} → ${s1.xp})`);
check(await page.locator('video[data-clip="anim_erro"]').isVisible(), "erro usa o clipe de apoio do Tigrão");
check((await page.evaluate(() => window.scrollY)) > 100, "rolou até o feedback");
check(await page.getByText("aguardando revisão do professor").first().isVisible(), "resolução marcada como IA aguardando revisão");
check(s1.review[q.id]?.box === 0, "erro entrou na revisão espaçada");
await wait(1500);
await page.locator('video[data-clip="anim_erro"]').scrollIntoViewIfNeeded(); await page.evaluate(() => window.scrollBy(0, -120)); await wait(300);
await page.screenshot({ path: OUT + "13_feedback_erro_animado.png" });

// confirmação ao sair
await page.getByRole("button", { name: "Sair" }).click(); await wait(300);
check(await page.getByText("Sair agora?").isVisible(), "pede confirmação antes de sair");
await page.getByRole("button", { name: "Continuar" }).click(); await wait(200);
await page.getByText("Próxima questão").click(); await wait(400);
q = await atual(); vistosPratica.push(q.id);
const xp2 = (await state()).xp;
await clicaLetra(q.answer); await wait(900);
check((await state()).xp >= xp2 + 10, "acerto dá XP");
check(await page.locator('video[data-clip="anim_acerto"]').isVisible(), "acerto usa o clipe de comemoração");
await page.waitForTimeout(1500);
await page.locator('video[data-clip="anim_acerto"]').scrollIntoViewIfNeeded(); await page.evaluate(() => window.scrollBy(0, -120)); await wait(300);
await page.screenshot({ path: OUT + "12_feedback_acerto_animado.png" });
await page.screenshot({ path: OUT + "06_feedback_acerto.png" });
await page.getByRole("button", { name: "Sair" }).click(); await wait(200);
await page.getByRole("dialog").getByRole("button", { name: "Sair" }).click(); await wait(500);
check(await page.getByText("Revisão das questões").isVisible(), "sair da prática mostra o resumo");
await page.getByText("Início").click(); await wait(500);
check(await page.getByText(/pra hoje/).isVisible(), "card de revisão mostra erros pra hoje");

// simulado: metade certa, sem repetir as da prática
await page.getByText("Simulado ENEM").first().click(); await wait(500);
const simIds = [];
for (let k = 0; k < 15; k++) {
  q = await atual(); simIds.push(q.id);
  await clicaLetra(k % 2 === 0 ? q.answer : ["A", "B", "C", "D", "E"].find((l) => l !== q.answer)); await wait(150);
  await page.getByText(k === 14 ? "Ver resultado" : "Confirmar e seguir").click(); await wait(250);
}
check(simIds.filter((id) => vistosPratica.includes(id)).length === 0, `simulado não repete a prática (${simIds.length} questões)`);
check(new Set(simIds).size === 15, "simulado sem repetição interna");
await wait(900);
check(await page.getByText("8/15").isVisible(), "placar do simulado 8/15");
check(await page.getByText("8 acertos").isVisible(), "plural de acertos");
const primeiraErrada = page.locator("text=/^Gabarito: [A-E]\\)/").first();
check(await primeiraErrada.isVisible(), "revisão do simulado mostra o texto da alternativa");
await page.evaluate(() => window.scrollTo(0, 0)); await wait(300);
await page.screenshot({ path: OUT + "04_simulado_resultado.png" });
await primeiraErrada.click(); await wait(500);
await primeiraErrada.scrollIntoViewIfNeeded(); await page.evaluate(() => window.scrollBy(0, -80)); await wait(300);
await page.screenshot({ path: OUT + "07_simulado_revisao_aberta.png" });

await page.getByText("Início").click(); await wait(400);
await page.getByText("Conquistas e jornada").click(); await wait(500);
await page.screenshot({ path: OUT + "08_conquistas.png", fullPage: true });
const st = await state();
check(st.badges.includes("simulado"), "medalha do simulado");
check(st.week.simulados === 1 && st.week.paid.includes("m-simulado"), "missão semanal do simulado paga");
const rm = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, reducedMotion: "reduce" });
const p2 = await rm.newPage();
await p2.goto("http://127.0.0.1:4189/"); await p2.waitForTimeout(800);
check((await p2.locator("video").count()) === 0 && (await p2.locator('img[src*="tigrao/acena"]').count()) === 1, "prefers-reduced-motion: sem vídeo, imagem estática");
await rm.close();
check(erros.length === 0, "sem erros no console " + erros.join(" | "));
await browser.close();
server.httpServer.close();
