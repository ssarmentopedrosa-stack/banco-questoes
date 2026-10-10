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
// sorteio determinístico: sem bônus surpresa, a não ser quando o teste força (window.__tigraoSorte = () => 0)
await ctx.addInitScript(() => { window.__tigraoSorte = () => 1; });
const V3 = "/workspace/enem_tigrao/screens_v3/";
mkdirSync(V3, { recursive: true });
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
check(await page.getByTestId("materia-fisica").isVisible(), "1º acesso mostra a escolha de matéria");
await page.getByTestId("materia-fisica").click(); await wait(1200);
check(await page.getByText("Tigrão ENEM", { exact: true }).isVisible(), "home abre com o Tigrão");
check(await page.getByTestId("treino-rapido").isVisible() && /Treino rápido de 5/.test(await page.getByTestId("treino-rapido").innerText()), "home: botão principal Treino rápido de 5");
{
  const [br, bi] = await Promise.all([page.getByTestId("treino-rapido").boundingBox(), page.getByText("Treino inteligente").first().boundingBox()]);
  check(br.y < bi.y && br.height >= 56, "treino rápido vem antes e é o botão mais destacado");
}
check(/Dia de folga/.test(await page.getByTestId("folga").innerText()), "card mostra o dia de folga semanal: " + (await page.getByTestId("folga").innerText()).replace(/\s+/g, " "));
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
await page.evaluate(() => window.scrollTo(0, 0)); await wait(400);
const topoAlts = await page.getByTestId("alternativas").evaluate((e) => e.getBoundingClientRect().top + window.scrollY);
// questão longa: garante que as alternativas comecem abaixo da tela (encolhe a altura se precisar)
if (topoAlts < 844) { await page.setViewportSize({ width: 390, height: Math.max(260, Math.floor(topoAlts) - 60) }); await wait(500); }
const altsAbaixo = await page.getByTestId("alternativas").evaluate((e) => e.getBoundingClientRect().top > window.innerHeight);
await page.screenshot({ path: V3 + "07_botao_ir_alternativas.png" });
{
  check(await page.getByTestId("ir-alternativas").isVisible(), "questão longa mostra botão flutuante 'Ir para as alternativas'");
  await page.getByTestId("ir-alternativas").click(); await wait(900);
  check(await page.getByTestId("alternativas").evaluate((e) => e.getBoundingClientRect().top < window.innerHeight), "botão flutuante leva às alternativas");
  check((await page.getByTestId("ir-alternativas").count()) === 0, "botão flutuante some quando as alternativas aparecem");
}
check(altsAbaixo, "alternativas abaixo da tela no teste do botão");
await page.setViewportSize({ width: 390, height: 844 }); await wait(300);
const fig0 = page.getByTestId("figura").first();
check(await fig0.locator("img").evaluate((e) => e.getBoundingClientRect().width >= window.innerWidth * 0.85), "figura ocupa a largura toda do cartão: " + Math.round((await fig0.locator("img").boundingBox()).width) + "px de 390");
await fig0.click(); await wait(400);
check(await page.getByTestId("zoom").isVisible(), "tocar na figura abre o zoom");
await page.getByTestId("zoom").locator("img").click(); await wait(300);
check(await page.getByTestId("zoom").locator("img").evaluate((i) => i.getBoundingClientRect().width > window.innerWidth), "segundo toque amplia além da tela");
await page.screenshot({ path: V3 + "06_figura_zoom.png" });
await page.getByRole("button", { name: "Fechar" }).click(); await wait(300);
check((await page.getByTestId("zoom").count()) === 0, "zoom fecha");

// erro: sem XP, Tigrão pensativo, rolagem até o feedback
const xpAntes = (await state()).xp;
const errada = ["A", "B", "C", "D", "E"].find((l) => l !== q.answer);
await clicaLetra(errada); await wait(1200);
const s1 = await state();
check(s1.xp === xpAntes, `erro não dá XP (${xpAntes} → ${s1.xp})`);
check(await page.locator('video[data-clip="anim_erro"]').isVisible(), "erro usa o clipe de apoio do Tigrão");
check((await page.evaluate(() => window.scrollY)) > 100, "rolou até o feedback");
check((await page.getByTestId("selo").first().innerText()).includes("Aguardando revisão do professor"), "selo: explicação de IA aguardando revisão do professor");
check((await page.getByTestId("reacao-tigrao").getAttribute("data-reacao")) === "erro", "reação do Tigrão no erro");
const falaErro = await page.getByTestId("fala-tigrao").innerText();
check(/Oxe|Vixe|Errar aqui é treino|Calma/.test(falaErro), "fala de treinador no erro: " + falaErro);
const res = page.getByTestId("resolucao-topicos");
const txtRes = await res.innerText();
check(await res.getByTestId("sec-ideia").isVisible() && await res.getByTestId("sec-como").isVisible(), "resolução em tópicos: Ideia-chave e Como resolver");
check((await res.locator("li").count()) >= 3 && (await res.locator("li b, li strong").count()) >= 1, "resolução em bullets com conceito em negrito");
check((await res.getByTestId("sec-resposta").innerText()).includes("Resposta: " + q.answer), "resolução termina com a resposta do gabarito");
check(!txtRes.includes("**"), "resolução sem markdown cru");
check(await page.getByTestId("selo").first().evaluate((e) => { const c = getComputedStyle(e).color.match(/\d+/g).map(Number); return c[0] + c[1] + c[2] < 200; }), "aviso de IA com texto escuro (alto contraste)");

check(await page.getByTestId("fonte-questao").isVisible() && /ENEM \d{4} \(Inep\)/.test(await page.getByTestId("fonte-questao").innerText()), "fonte/ano na questão");
check(await page.getByTestId("aviso").innerText() === "Questões oficiais do ENEM (Inep). App independente, sem vínculo com o Inep/MEC.", "aviso de independência no rodapé");
const alts = await page.locator('img[src*="figuras"]').evaluateAll((els) => els.map((e) => e.alt));
check(alts.length > 0 && alts.every((a) => /questão \d+ do ENEM \d{4}/.test(a)), "alt das figuras identifica a questão: " + alts[0]);
check(s1.review[q.id]?.box === 0, "erro entrou na revisão espaçada");
await wait(1500);
await page.locator('video[data-clip="anim_erro"]').scrollIntoViewIfNeeded(); await page.evaluate(() => window.scrollBy(0, -120)); await wait(300);
await page.screenshot({ path: OUT + "13_feedback_erro_animado.png" });
await page.getByTestId("reacao-tigrao").scrollIntoViewIfNeeded(); await page.evaluate(() => window.scrollBy(0, -70)); await wait(300);
await page.screenshot({ path: V3 + "02_reacao_tigrao_erro.png" });
await page.evaluate(() => { document.querySelector('[data-testid="selo"]').scrollIntoView({ block: "start" }); window.scrollBy(0, -150); }); await wait(300);
await page.screenshot({ path: V3 + "03_resolucao_em_topicos.png" });

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
check((await page.getByTestId("reacao-tigrao").getAttribute("data-reacao")) === "acerto" && (await page.getByTestId("fala-tigrao").innerText()).length > 10, "reação de acerto com fala do Tigrão");
{
  const fb = (await page.getByTestId("xp-feedback").innerText()).trim();
  const extra = (await page.getByText(/Missão cumprida: Acertar 5/).count()) ? 40 : 0;
  check((await page.getByTestId("bonus-surpresa").count()) === 0 && fb === `+${10 + extra} XP`, "sem sorteio, acerto vale +10 XP: " + fb + (extra ? " (inclui +40 da missão semanal)" : ""));
}
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
check((await page.getByTestId("pct-geral").getAttribute("data-faixa")) === "ambar", "53% no simulado fica âmbar (não vermelho)");
check((await page.getByTestId("legenda-faixas").count()) === 1 && /40%/.test(await page.getByTestId("legenda-faixas").innerText()), "resultado tem legenda das faixas");
const faixas = await page.getByTestId("tema-resultado").evaluateAll((els) => els.map((e) => [e.getAttribute("data-faixa"), +e.innerText.match(/(\d+)%/)[1]]));
check(faixas.length > 0 && faixas.every(([f, p]) => f === (p < 40 ? "vermelho" : p < 70 ? "ambar" : "verde")), "cores por faixa (<40 vermelho, 40–69 âmbar, ≥70 verde): " + faixas.map(([f, p]) => p + "%=" + f).join(" "));
await page.getByTestId("relatorio-tema").scrollIntoViewIfNeeded(); await page.evaluate(() => window.scrollBy(0, -330)); await wait(300);
await page.screenshot({ path: V3 + "05_resultado_simulado.png" });
await page.evaluate(() => window.scrollTo(0, 0)); await wait(200);
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
check(/Iniciante|Praticando|Dominando/.test(await page.getByTestId("nivel-Mecânica").innerText()), "nível de domínio por tema: " + (await page.getByTestId("nivel-Mecânica").innerText()));
check(/80%/.test(await page.getByTestId("regras-nivel").innerText()) && /50%/.test(await page.getByTestId("regras-nivel").innerText()), "regras dos níveis explicadas");
check(/base: (1 questão|últimas \d+ questões)/.test(await page.locator("body").innerText()), "mostra em quantas questões o nível se baseia");
check(await page.getByTestId("proximo-passo").isVisible(), "sugestão de próximo passo: " + (await page.getByTestId("proximo-passo").innerText()).replace(/\n/g, " ").slice(0, 90));
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
await page.getByTestId("materia-fisica").click(); await wait(1000);
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
{
  // a missão semanal "Acertar 5 de <tema da semana>" pode ser paga junto (+40), dependendo da semana
  const extraMissao = (await page.getByText(/Missão cumprida: Acertar 5/).count()) ? 40 : 0;
  check((await page.getByTestId("xp-feedback").innerText()).trim() === `+${7 + extraMissao} XP`, "acerto com 1 dica vale 7 XP: " + (await page.getByTestId("xp-feedback").innerText()) + (extraMissao ? " (inclui +40 da missão semanal)" : ""));
}
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
    check((await page.getByTestId("xp-feedback").innerText()).trim() === "+18 XP" && (await page.getByTestId("chip-recuperou").isVisible()) && /Erro recuperado! \+8 XP/.test(await page.getByTestId("chip-recuperou").innerText()), "recuperar erro na revisão vale 10 + 8 XP, com destaque");
    check((await page.getByTestId("reacao-tigrao").getAttribute("data-reacao")) === "recuperou", "reação especial do Tigrão no erro recuperado");
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
check(/Praticando/.test(await page.getByTestId("nivel-Mecânica").innerText()), "75% com 4 questões = Praticando (Dominando exige ≥80% em 5+)");
const migr = await state();
check(migr.folga && migr.streak.count === 2, "migração cria o dia de folga sem mexer na sequência");

// sequência com dia de folga: última atividade anteontem → a folga cobre ontem
const ANTEONTEM = await page.evaluate(() => { const d = new Date(); d.setDate(d.getDate() - 2); return d.toLocaleDateString("sv-SE"); });
const ONTEM = await page.evaluate(() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toLocaleDateString("sv-SE"); });
const base4 = Q.filter((x) => x.area === "Mecânica" && x.options).slice(0, 4);
await page.evaluate(([d, ids]) => {
  localStorage.clear();
  const answers = Object.fromEntries(ids.map((id, k) => [id, { correct: true, attempts: 1, everCorrect: true, lastAt: new Date(Date.now() - 86400000 * 2 - (4 - k) * 60000).toISOString() }]));
  localStorage.setItem("tigrao-enem-fisica-v1", JSON.stringify({ xp: 300, answers, streak: { count: 4, best: 6, lastDate: d }, daily: { date: d, count: 3, goalPaid: false }, recent: ids }));
}, [ANTEONTEM, base4.map((x) => x.id)]);
await page.goto("http://127.0.0.1:4189/"); await wait(900);
const sf = await state();
check(sf.streak.count === 4 && sf.folga.usadaEm === ONTEM, `folga automática salvou a sequência (4 dias, folga em ${sf.folga.usadaEm})`);
check(await page.getByTestId("aviso-folga").isVisible(), "aviso: dia de folga usado");
check(/usado em/.test(await page.getByTestId("folga").innerText()), "card mostra a folga já usada nesta semana");
await page.screenshot({ path: V3 + "01_home_treino_rapido.png" });
await page.screenshot({ path: OUT + "26_home_treino_rapido.png" });

// Treino rápido de 5: bônus surpresa forçado, sequência avança, resultado
await page.getByTestId("treino-rapido").click(); await wait(600);
check((await page.getByTestId("contador").innerText()) === "1/5", "treino rápido tem 5 questões");
await page.evaluate(() => { window.__tigraoSorte = () => 0; });
q = await atual();
await clicaLetra(q.answer); await wait(700);
check(await page.getByTestId("bonus-surpresa").isVisible() && (await page.getByTestId("xp-feedback").innerText()).trim() === "+15 XP", "bônus surpresa: +5 XP no acerto (" + (await page.getByTestId("xp-feedback").innerText()) + ")");
check(/5 dias seguidos/.test(await page.getByTestId("reacao-tigrao").innerText()), "1ª questão do dia avança a sequência com reação do Tigrão");
await page.evaluate(() => { window.__tigraoSorte = () => 1; });
for (let k = 1; k < 5; k++) {
  await page.getByText("Próxima questão").click(); await wait(350);
  q = await atual();
  await clicaLetra(q.answer); await wait(450);
}
await page.getByText(/Ver resultado|Próxima questão/).first().click(); await wait(800);
check(await page.getByText("Treino rápido de 5").first().isVisible(), "resultado do treino rápido");
const sr = await state();
check(sr.streak.count === 5 && sr.streak.lastDate === HOJE, "1 questão no dia já conta pra sequência");

// subir de nível de domínio (toast) numa prática por tema
await page.evaluate(([h, ids]) => {
  localStorage.clear();
  const answers = Object.fromEntries(ids.map((id, k) => [id, { correct: true, attempts: 1, everCorrect: true, lastAt: new Date(Date.now() - (4 - k) * 60000).toISOString() }]));
  localStorage.setItem("tigrao-enem-fisica-v1", JSON.stringify({ xp: 300, answers, daily: { date: h, count: 50, goalPaid: true }, streak: { count: 1, best: 1, lastDate: h }, recent: ids }));
}, [HOJE, base4.map((x) => x.id)]);
await page.goto("http://127.0.0.1:4189/"); await wait(700);
await page.getByText("Praticar por tema").click(); await wait(300);
await page.getByText("Mecânica", { exact: true }).click(); await wait(400);
q = await atual();
await clicaLetra(q.answer); await wait(700);
check(await page.getByTestId("dominio-up").isVisible() && /Mecânica.*Dominando/.test(await page.getByTestId("dominio-up").innerText()), "toast de nível: " + (await page.getByTestId("dominio-up").innerText().catch(() => "—")));
await page.getByRole("button", { name: "Sair" }).click(); await wait(200);
await page.getByRole("dialog").getByRole("button", { name: "Sair" }).click(); await wait(500);
check(await page.getByTestId("resultado-dominio-up").first().isVisible(), "resumo mostra o novo nível de domínio");
await page.getByText("Início").click(); await wait(600);
await page.getByRole("button", { name: "Meu domínio por tema" }).click(); await wait(500);
check(/Dominando/.test(await page.getByTestId("nivel-Mecânica").innerText()), "domínio: Mecânica em Dominando");
await page.screenshot({ path: V3 + "04_dominio_por_tema.png" });
await page.screenshot({ path: OUT + "27_dominio_niveis.png", fullPage: true });
const rm = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, reducedMotion: "reduce" });
const p2 = await rm.newPage();
await p2.goto("http://127.0.0.1:4189/"); await p2.waitForTimeout(800);
check((await p2.locator("video").count()) === 0 && (await p2.locator('img[src*="tigrao/acena"]').count()) === 1, "prefers-reduced-motion: sem vídeo, imagem estática");
await rm.close();
check(erros.length === 0, "sem erros no console " + erros.join(" | "));
await browser.close();
server.httpServer.close();
