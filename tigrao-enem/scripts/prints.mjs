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
await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: "http://127.0.0.1:4189" });
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
check(await page.getByText("Tigrão ENEM", { exact: true }).isVisible(), "home abre com o Tigrão");
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
check((await page.getByTestId("selo").first().innerText()).includes("Aguardando revisão do professor"), "selo: explicação de IA aguardando revisão do professor");
check(await page.getByTestId("fonte-questao").isVisible() && /ENEM \d{4} \(Inep\)/.test(await page.getByTestId("fonte-questao").innerText()), "fonte/ano na questão");
check(await page.getByTestId("aviso").innerText() === "Questões oficiais do ENEM (Inep). App independente, sem vínculo com o Inep/MEC.", "aviso de independência no rodapé");
const alts = await page.locator('img[src*="figuras"]').evaluateAll((els) => els.map((e) => e.alt));
check(alts.length > 0 && alts.every((a) => /questão \d+ do ENEM \d{4}/.test(a)), "alt das figuras identifica a questão: " + alts[0]);
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
await page.getByText("Mini-simulado").first().click(); await wait(500);
check((await page.getByTestId("contador").innerText()) === "1/15", "mini-simulado tem 15 questões");
check((await page.getByTestId("dicas").count()) === 0, "simulado sem dicas");
const simIds = [];
for (let k = 0; k < 15; k++) {
  q = await atual(); simIds.push(q.id);
  await clicaLetra(k % 2 === 0 ? q.answer : ["A", "B", "C", "D", "E"].find((l) => l !== q.answer)); await wait(150);
  if (k === 0) check((await page.getByText("Resolução comentada").count()) === 0 && (await page.getByText(/^Gabarito oficial/).count()) === 0, "simulado esconde gabarito e resolução até o fim");
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
check(await page.getByTestId("relatorio-tema").isVisible(), "simulado mostra relatório por tema");
await page.getByTestId("relatorio-tema").scrollIntoViewIfNeeded(); await page.evaluate(() => window.scrollBy(0, -260)); await wait(300);
await page.screenshot({ path: OUT + "24_relatorio_simulado.png" });

await page.getByText("Início").click(); await wait(900);
await page.screenshot({ path: OUT + "21_home.png" });
await page.getByRole("button", { name: "Meu domínio por tema" }).click(); await wait(500);
check(/^\d+%$/.test(await page.getByTestId("dom-Mecânica").innerText()), "domínio mostra % em Mecânica: " + (await page.getByTestId("dom-Mecânica").innerText()));
await page.screenshot({ path: OUT + "22_dominio.png" });
await page.getByRole("button", { name: "Voltar" }).click(); await wait(300);
await page.getByText("Conquistas", { exact: true }).click(); await wait(500);
const niveis = await page.getByTestId("niveis").innerText();
check(["Calouro", "Vestibulando", "Cientista da Natureza", "Rumo aos 700", "Rumo aos 800", "Mestre do ENEM"].every((n) => niveis.includes(n)) && !/Medicina|Aprovad/.test(await page.content()), "novos nomes de nível, sem 'Aprovado em Medicina'");
await page.screenshot({ path: OUT + "08_conquistas.png", fullPage: true });
const st = await state();
check(st.badges.includes("simulado"), "medalha do simulado");
check(st.week.simulados === 1 && st.week.paid.includes("m-simulado"), "missão semanal do simulado paga");
check(st.schema === 2 && st.log.length > 0 && st.simulados[0].kind === "mini", "estado v2 com log e tipo de simulado");

// Simulado ENEM completo: 45 questões, 2h30
await page.getByRole("button", { name: "Voltar" }).click(); await wait(300);
await page.getByText("Simulado ENEM", { exact: true }).click(); await wait(1200);
check((await page.getByTestId("contador").innerText()) === "1/45", "Simulado ENEM tem 45 questões");
check(/^2:(30:00|29:5\d)$/.test((await page.getByTestId("cronometro").innerText()).trim()), "cronômetro de 2h30: " + (await page.getByTestId("cronometro").innerText()));
await page.getByText("Pular (deixar em branco)").click(); await wait(200);
check((await page.getByTestId("contador").innerText()) === "2/45", "pode deixar em branco");
await page.getByRole("button", { name: "Sair" }).click(); await wait(200);
await page.getByRole("dialog").getByRole("button", { name: "Sair" }).click(); await wait(400);

// Ajustes: fonte e backup
const xpBackup = (await state()).xp;
await page.getByText("Ajustes", { exact: true }).click(); await wait(400);
await page.getByRole("radio", { name: "Grande" }).click(); await wait(200);
check((await page.evaluate(() => document.documentElement.style.fontSize)) === "112.5%", "letra grande aumenta a fonte do app");
await page.getByRole("button", { name: "Gerar código" }).click(); await wait(600);
const codigo = await page.getByTestId("codigo-export").inputValue();
check(/^TGR[01]\./.test(codigo), `código de backup gerado (${codigo.length} caracteres)`);
await page.screenshot({ path: OUT + "25_ajustes_backup.png" });
await page.evaluate(() => localStorage.clear()); await page.reload(); await wait(800);
check(((await state())?.xp ?? 0) === 0, "progresso apagado (simula celular novo)");
await page.getByText("Ajustes", { exact: true }).click(); await wait(300);
await page.getByTestId("codigo-import").fill("lixo"); await page.getByRole("button", { name: "Importar código" }).click(); await wait(300);
check(await page.getByText("Código inválido").isVisible(), "código inválido é recusado com mensagem");
await page.getByTestId("codigo-import").fill(codigo); await page.getByRole("button", { name: "Importar código" }).click(); await wait(400);
await page.getByRole("dialog").getByRole("button", { name: "Importar" }).click(); await wait(400);
const imp = await state();
check(imp.xp === xpBackup && imp.prefs.fonte === 1, `importação restaura XP (${imp.xp}) e preferências`);
await page.getByRole("radio", { name: "Normal" }).click(); await wait(200);

// cenários semeados
const HOJE = await page.evaluate(() => new Date().toLocaleDateString("sv-SE"));
const comExp = Q.filter((x) => x.area === "Mecânica" && x.explanation && x.options);
// dica reduz o XP do acerto (10 → 7)
await page.evaluate((h) => localStorage.setItem("tigrao-enem-fisica-v1", JSON.stringify({ xp: 0, answers: {}, daily: { date: h, count: 50, goalPaid: true } })), HOJE);
await page.reload(); await wait(700);
await page.getByText("Praticar por tema").click(); await wait(300);
await page.getByText("Mecânica", { exact: true }).click(); await wait(400);
q = await atual();
for (let k = 0; k < 9 && !(q.explanation && q.figures.length === 0); k++) { await clicaLetra(q.answer); await wait(200); await page.getByText("Próxima questão").click(); await wait(300); q = await atual(); }
check((await page.getByTestId("dicas").count()) === 1, "questão com resolução oferece Dica do Tigrão");
await page.getByText("Pedir uma Dica do Tigrão").click(); await wait(300);
const txtDica = await page.getByTestId("dicas").innerText();
check(q.explanation.keyConcept && txtDica.includes(q.explanation.keyConcept), "dica vem do texto da resolução (conceito-chave)");
await page.getByTestId("dicas").scrollIntoViewIfNeeded(); await page.evaluate(() => window.scrollBy(0, -200)); await wait(300);
await page.screenshot({ path: OUT + "23_dica.png" });
await clicaLetra(q.answer); await wait(700);
check((await page.getByTestId("xp-feedback").innerText()).trim() === "+7 XP", "acerto com 1 dica vale 7 XP: " + (await page.getByTestId("xp-feedback").innerText()));
const semExp = Q.filter((x) => !x.explanation).length;
check(true, `questões sem resolução (sem dica): ${semExp}`);

// Treino inteligente: revisão vencida recuperada = 10 + 5 XP
const alvo = comExp[0];
await page.evaluate(([h, id]) => localStorage.setItem("tigrao-enem-fisica-v1", JSON.stringify({
  xp: 0, daily: { date: h, count: 50, goalPaid: true },
  answers: { [id]: { correct: false, attempts: 1, everCorrect: false, lastAt: new Date().toISOString() } },
  review: { [id]: { box: 0, due: h } },
})), [HOJE, alvo.id]);
await page.goto("http://127.0.0.1:4189/"); await wait(700);
await page.getByText("Treino inteligente").click(); await wait(500);
let achou = false;
for (let k = 0; k < 10; k++) {
  q = await atual();
  if (q.id === alvo.id) {
    achou = true;
    check(await page.getByText("🔁 revisão").isVisible(), "treino inteligente marca a questão de revisão");
    await clicaLetra(q.answer); await wait(600);
    check((await page.getByTestId("xp-feedback").innerText()).trim() === "+15 XP" && (await page.getByText("Erro recuperado!").isVisible()), "recuperar erro na revisão vale 10 + 5 XP");
    break;
  }
  await clicaLetra(["A", "B", "C", "D", "E"].find((l) => l !== q.answer)); await wait(250);
  check((await page.getByTestId("xp-feedback").innerText()).startsWith("Gabarito oficial"), "erro continua valendo 0 XP");
  await page.getByText("Próxima questão").click(); await wait(300);
}
check(achou, "treino inteligente incluiu a revisão vencida");
const si = await state();
check(si.revisaoAcertosTotal === 1 && si.review[alvo.id]?.box === 1, "revisão avançou de caixa");

// migração de progresso antigo (v1)
const mec = Q.filter((x) => x.area === "Mecânica").slice(0, 4);
await page.evaluate(([h, ids]) => {
  localStorage.clear();
  const answers = Object.fromEntries(ids.map((id, k) => [id, { correct: k !== 0, attempts: 1, everCorrect: k !== 0, lastAt: new Date(Date.now() - (4 - k) * 60000).toISOString() }]));
  localStorage.setItem("tigrao-enem-fisica-v1", JSON.stringify({
    xp: 700, answers, streak: { count: 2, best: 5, lastDate: h }, daily: { date: h, count: 4, goalPaid: false }, badges: ["primeira"],
    simulados: [{ date: new Date().toISOString(), score: 9, total: 15, seconds: 900 }], review: {}, recent: ids,
    week: { id: "2020-01-06", answered: 3, days: [h], simulados: 1, paid: ["m-questoes"] },
  }));
}, [HOJE, mec.map((x) => x.id)]);
await page.goto("http://127.0.0.1:4189/"); await wait(800);
const mg = await page.evaluate(() => ({ s: JSON.parse(localStorage.getItem("tigrao-enem-fisica-v1")), bk: !!localStorage.getItem("tigrao-enem-fisica-v1-backup-v1") }));
check(mg.s.schema === 2 && mg.s.xp === 700 && mg.s.log.length === 4 && mg.s.simulados[0].kind === "mini" && mg.bk, "migração v1 → v2 preserva XP, cria log e guarda backup");
check(await page.getByText("Rumo aos 700").first().isVisible(), "nível migrado mostra o novo nome");
await page.getByRole("button", { name: "Meu domínio por tema" }).click(); await wait(400);
check((await page.getByTestId("dom-Mecânica").innerText()) === "75%", "domínio após migração: 3 de 4 = 75%");
const rm = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, reducedMotion: "reduce" });
const p2 = await rm.newPage();
await p2.goto("http://127.0.0.1:4189/"); await p2.waitForTimeout(800);
check((await p2.locator("video").count()) === 0 && (await p2.locator('img[src*="tigrao/acena"]').count()) === 1, "prefers-reduced-motion: sem vídeo, imagem estática");
await rm.close();
check(erros.length === 0, "sem erros no console " + erros.join(" | "));
await browser.close();
server.httpServer.close();
