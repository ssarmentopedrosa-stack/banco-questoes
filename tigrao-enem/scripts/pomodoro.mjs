// Testa o modo Pomodoro: relógio por carimbo de tempo, pausar/continuar, recarregar, pausa curta/longa, XP, conquistas, missão, ajustes, som e movimento reduzido.
// Uso: npm run build && node scripts/pomodoro.mjs [pasta-de-prints]
import { chromium } from "playwright-core";
import { preview } from "vite";
import { mkdirSync } from "node:fs";

const OUT = (process.argv[2] ?? "/workspace/tigrao-prints/").replace(/\/?$/, "/");
mkdirSync(OUT, { recursive: true });
const PORT = 4195;
const server = await preview({ root: new URL("..", import.meta.url).pathname, preview: { port: PORT, host: "127.0.0.1" } });
const browser = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"] });
const check = (c, m) => { console.log((c ? "OK   " : "FALHA") + " " + m); if (!c) process.exitCode = 1; };
const URL0 = `http://127.0.0.1:${PORT}/`;
const PK = "tigrao-enem-fisica-pomodoro-v1", SK = "tigrao-enem-fisica-v1";
const erros = [];
const MIN = 60000;
async function nova(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "pt-BR", ...opts });
  await ctx.addInitScript(() => { window.__vib = 0; Object.defineProperty(navigator, "vibrate", { value: () => { window.__vib++; return true; }, configurable: true }); });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => erros.push(String(e)));
  return page;
}
const ler = (page, k) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || "null"), k);
const tela = (page) => page.getByTestId("pomo-tempo").innerText();
const seg = (t) => { const [m, s] = t.split(":").map(Number); return m * 60 + s; };
/** O que a barra mostra tem que bater com o carimbo de tempo salvo (e não com contagem de ticks). */
const confere = async (page, msg) => {
  const [mostrado, calc] = await Promise.all([tela(page), page.evaluate((k) => { const p = JSON.parse(localStorage.getItem(k)); const r = p.duracao - ((p.pausadoEm ?? Date.now()) - p.inicio - p.pausadoMs); return Math.ceil(Math.max(0, r) / 1000); }, PK)]);
  check(Math.abs(seg(mostrado) - calc) <= 2, `${msg} (mostra ${mostrado}, carimbo dá ${calc}s)`);
  return seg(mostrado);
};
const recarregar = async (page) => { await page.reload(); await page.waitForTimeout(900); };

// ---------- 1) foco, pausar/continuar e recarregar (relógio falso só para avançar o tempo) ----------
let page = await nova();
await page.clock.install();
await page.goto(URL0); await page.waitForTimeout(400);
await page.evaluate(() => { localStorage.clear(); localStorage.setItem("tigrao-enem-materia", "fisica"); });
await recarregar(page);
await page.getByTestId("home-pomodoro").getByRole("button").click(); await page.waitForTimeout(600);
check(await page.getByTestId("pomo-barra").isVisible(), "barra do Pomodoro visível no quiz");
check(await page.getByRole("button", { name: /Alternativa A/ }).first().isVisible(), "foco abre questões da matéria escolhida");
check(seg(await tela(page)) >= 24 * 60 + 58, "foco começa com 25:00 (padrão)");
await page.screenshot({ path: OUT + "pomodoro_quiz.png" });
await page.clock.runFor(60000);
const t1 = await confere(page, "depois de 1 min o relógio bate com o carimbo");
check(t1 <= 24 * 60 + 1 && t1 >= 23 * 60 + 58, "1 minuto descontado");
await page.getByRole("button", { name: "Pausar Pomodoro" }).click();
await page.clock.runFor(120000);
check(Math.abs(seg(await tela(page)) - t1) <= 1, "pausado: 2 min depois o tempo não andou");
check((await page.getByTestId("pomo-fase").innerText()).includes("pausado"), "barra mostra 'pausado'");
await recarregar(page);
check(await page.getByRole("button", { name: "Continuar Pomodoro" }).isVisible(), "recarregar mantém pausado");
check(Math.abs(seg(await tela(page)) - t1) <= 1, "recarregar pausado mantém o tempo");
await page.getByRole("button", { name: "Continuar Pomodoro" }).click();
await page.clock.runFor(30000);
await confere(page, "continuou e o relógio segue o carimbo");
const p1 = await ler(page, PK);
check(p1.pausadoMs >= 120000 && p1.pausadoMs < 125000, `tempo pausado guardado como duração (${Math.round(p1.pausadoMs / 1000)}s), não como ticks`);
await recarregar(page);
await confere(page, "recarregar no meio do foco: tempo continua de onde estava");
check(await page.getByTestId("pomo-barra").isVisible(), "barra continua visível depois de recarregar (na home)");

// ---------- 2) foco termina → pausa curta com XP, conquista e tela de descanso ----------
const s0 = await ler(page, SK);
await page.clock.runFor((seg(await tela(page)) + 2) * 1000); // até o fim exato do foco
await page.waitForTimeout(300);
check(await page.getByTestId("descanso").isVisible(), "foco acabou: abre a tela de descanso");
check((await page.getByTestId("descanso").getAttribute("data-fase")) === "pausa", "1º ciclo → pausa curta");
const s1 = await ler(page, SK);
check(s1.xp - (s0?.xp ?? 0) >= 15 && (await page.getByTestId("pomo-ganho").innerText()).includes("+"), `XP bônus do ciclo (+${s1.xp - (s0?.xp ?? 0)})`);
check(s1.pomodoro.hoje === 1 && s1.pomodoro.total === 1, "contagem diária de pomodoros = 1");
check(s1.badges.includes("pomodoro"), "conquista 'Primeiro Pomodoro'");
const d1 = seg(await page.getByTestId("descanso-tempo").innerText());
check(d1 <= 5 * 60 && d1 >= 4 * 60 + 50, `pausa de 5 min (${d1}s)`);
await page.screenshot({ path: OUT + "pomodoro_descanso.png" });
await recarregar(page);
check(await page.getByTestId("descanso").isVisible(), "recarregar na pausa volta para o descanso");
await confere(page, "pausa segue o carimbo depois de recarregar");
await page.clock.runFor(5 * MIN);
check(await page.getByRole("button", { name: /Começar foco de 25 min/ }).isVisible(), "pausa acabou: espera o usuário começar o próximo foco");
check((await ler(page, SK)).pomodoro.hoje === 1, "pausa não conta pomodoro extra");
await page.getByRole("button", { name: /Começar foco/ }).click(); await page.waitForTimeout(400);
check((await ler(page, PK)).fase === "foco" && (await ler(page, PK)).ciclos === 1, "novo foco começa (ciclo 2)");

// ---------- 3) tempo passou com o app fechado: 4º ciclo → pausa longa, missão e 'Foco Total' ----------
await page.evaluate(([PK, SK]) => {
  const now = Date.now();
  const s = JSON.parse(localStorage.getItem(SK)); s.pomodoro.hoje = 3; s.week.pomoMaxDia = 3; localStorage.setItem(SK, JSON.stringify(s));
  localStorage.setItem(PK, JSON.stringify({ v: 1, fase: "foco", inicio: now - 26 * 60000, duracao: 25 * 60000, pausadoEm: null, pausadoMs: 0, ciclos: 3, fim: false }));
}, [PK, SK]);
await recarregar(page);
check((await page.getByTestId("descanso").getAttribute("data-fase")) === "longa", "4º ciclo → pausa longa");
const d2 = seg(await page.getByTestId("descanso-tempo").innerText());
check(d2 <= 14 * 60 + 2 && d2 >= 13 * 60 + 55, `pausa longa começa no fim exato do foco (15 min − 1 min = ${d2}s)`);
const s2 = await ler(page, SK);
check(s2.pomodoro.hoje === 4 && s2.badges.includes("foco4"), "4 pomodoros no dia → conquista 'Foco Total'");
check(s2.week.paid.includes("m-pomodoro"), "missão da semana 'Fazer 4 pomodoros num mesmo dia' paga");
await page.screenshot({ path: OUT + "pomodoro_pausa_longa.png" });
// pausa inteira passou com o app fechado → não começa foco sozinho
await page.evaluate((PK) => { const p = JSON.parse(localStorage.getItem(PK)); p.inicio = Date.now() - 20 * 60000; localStorage.setItem(PK, JSON.stringify(p)); }, PK);
await recarregar(page);
check(await page.getByRole("button", { name: /Começar foco/ }).isVisible() && (await ler(page, SK)).pomodoro.hoje === 4, "pausa expirada com app fechado: espera o usuário, sem XP extra");
// salvo inválido é descartado
await page.evaluate((PK) => localStorage.setItem(PK, JSON.stringify({ v: 1, fase: "foco", inicio: "x" })), PK);
await recarregar(page);
check(!(await page.getByTestId("pomo-barra").count()) && (await ler(page, PK)) === null, "pomodoro salvo inválido é descartado sem quebrar");

// ---------- 4) Ajustes: tempos ajustáveis ----------
await page.getByRole("button", { name: /Ajustes/ }).first().click(); await page.waitForTimeout(400);
for (const [k, v] of [["foco", "10"], ["pausa", "3"], ["longa", "99"]]) { await page.getByTestId("pomo-" + k).fill(v); await page.getByTestId("pomo-" + k).press("Enter"); }
const cfg = (await ler(page, SK)).prefs.pomo;
check(cfg.foco === 10 && cfg.pausa === 3 && cfg.longa === 45, `ajustes salvos com limites (foco ${cfg.foco}, pausa ${cfg.pausa}, longa ${cfg.longa} — 99 vira 45)`);
await recarregar(page);
await page.getByTestId("home-pomodoro").getByRole("button").click(); await page.waitForTimeout(500);
check(seg(await tela(page)) <= 600 && seg(await tela(page)) >= 598, "foco usa o tempo ajustado (10 min)");
await page.getByRole("button", { name: "Encerrar Pomodoro" }).click();
check(!(await page.getByTestId("pomo-barra").count()) && (await ler(page, PK)) === null, "encerrar apaga o pomodoro");

// ---------- 5) som e vibração respeitam ajustes; movimento reduzido ----------
const fimDeFoco = async (pg) => { await pg.evaluate((PK) => localStorage.setItem(PK, JSON.stringify({ v: 1, fase: "foco", inicio: Date.now() - 5000, duracao: 3000, pausadoEm: null, pausadoMs: 0, ciclos: 0, fim: false })), PK); await recarregar(pg); };
await page.evaluate(() => localStorage.setItem("tigrao-enem-som", JSON.stringify({ ligado: false, volume: 0.4, vibrar: false })));
await page.evaluate(() => { window.__tigraoSons = []; });
await fimDeFoco(page);
check(!((await page.evaluate(() => window.__tigraoSons)) ?? []).length && (await page.evaluate(() => window.__vib)) === 0, "som e vibração desligados nos ajustes → silêncio no fim do foco");
page = await nova({ reducedMotion: "reduce" });
await page.goto(URL0); await page.waitForTimeout(300);
await page.evaluate(() => { localStorage.clear(); localStorage.setItem("tigrao-enem-materia", "fisica"); });
await fimDeFoco(page);
check(await page.getByTestId("descanso").isVisible(), "movimento reduzido: descanso aparece");
check(!(await page.getByTestId("descanso").locator("img").getAttribute("class")).includes("animate-pulse"), "movimento reduzido: Tigrão parado (sem animação)");
check((await page.evaluate(() => window.__vib)) === 0, "movimento reduzido: sem vibração");
page = await nova();
await page.goto(URL0); await page.waitForTimeout(300);
await page.evaluate(() => { localStorage.clear(); localStorage.setItem("tigrao-enem-materia", "fisica"); });
await fimDeFoco(page);
check((await page.evaluate(() => window.__vib)) > 0, "som/vibração ligados (padrão) → vibra no fim do foco");
check(!erros.length, "sem erros de página" + (erros.length ? ": " + erros.join(" | ") : ""));
await browser.close(); server.httpServer.close();
