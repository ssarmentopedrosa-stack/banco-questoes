import { MATERIA, QUESTIONS, TOPICS, byTopic, subtemaNome, type Question } from "./data";

/** Níveis medem dedicação no app (XP), não nota do ENEM. */
export let LEVELS = [
  { title: "Calouro", min: 0, emoji: "🎒" },
  { title: "Vestibulando", min: 100, emoji: "📖" },
  { title: "Cientista da Natureza", min: 300, emoji: "🔬" },
  { title: "Rumo aos 700", min: 650, emoji: "🎯" },
  { title: "Rumo aos 800", min: 1100, emoji: "🚀" },
  { title: "Mestre do ENEM", min: 1700, emoji: "🏆" },
];

/** Erro não dá XP. Dica reduz o XP do acerto. Recuperar um erro na revisão dá bônus. */
export const XP = { acerto: 10, acertoComDica: [10, 7, 5], bonusSimulado: 5, revisao: 8, gabaritou: 50, metaDiaria: 20, surpresa: 5 };
/** Chance do bônus surpresa num acerto (nunca em simulado). */
export const CHANCE_SURPRESA = 0.1;
/** Sorteio (os testes podem fixar com window.__tigraoSorte). */
const sorteio = () => { const f = (globalThis as { __tigraoSorte?: () => number }).__tigraoSorte; return f ? f() : Math.random(); };
export const META_DIARIA = 10;
export const BADGE_MIN_ACERTOS = 5;
export const INTERVALOS = [1, 3, 7]; // dias da revisão espaçada
export type SimKind = "mini" | "completo";
type SimCfg = { nome: string; n: number; segundos: number; peso: Record<string, number> };
/** Divide n questões entre os temas proporcionalmente ao banco (maiores restos; pelo menos 1 por tema quando cabe). */
function proporcional(n: number): Record<string, number> {
  const cont = TOPICS.map((t) => ({ t: t.name, c: byTopic(t.name).length })).filter((x) => x.c > 0);
  const tot = cont.reduce((a, x) => a + x.c, 0) || 1;
  const base = cont.map((x) => ({ ...x, k: Math.max(n >= cont.length ? 1 : 0, Math.floor((n * x.c) / tot)), r: (n * x.c) / tot - Math.floor((n * x.c) / tot) }));
  let soma = base.reduce((a, x) => a + x.k, 0);
  for (const x of [...base].sort((a, b) => b.r - a.r)) { if (soma >= n) break; if (x.k < x.c) { x.k += 1; soma += 1; } }
  for (const x of [...base].sort((a, b) => b.k - a.k)) { if (soma <= n) break; if (x.k > 1) { x.k -= 1; soma -= 1; } }
  return Object.fromEntries(base.map((x) => [x.t, Math.min(x.k, x.c)]));
}
export let SIMULADOS: Record<SimKind, SimCfg> = { mini: { nome: "Mini-simulado", n: 15, segundos: 45 * 60, peso: {} }, completo: { nome: "Simulado ENEM", n: 45, segundos: 150 * 60, peso: {} } };
export let KEY = MATERIA.key;
let qById = new Map<string, Question>();
/** Reconfigura o jogo para a matéria ativa (chamar depois de setMateria). */
export function configurarJogo() {
  KEY = MATERIA.key;
  qById = new Map(QUESTIONS.map((q) => [q.id, q]));
  LEVELS = LEVELS.map((l, i) => (i === 2 ? { ...l, title: MATERIA.nivel3 } : l));
  SIMULADOS = {
    mini: { nome: "Mini-simulado", n: 15, segundos: 45 * 60, peso: MATERIA.peso?.mini ?? proporcional(15) },
    completo: { nome: MATERIA.id === "natureza" ? "Simulado Ciências da Natureza" : "Simulado ENEM", n: 45, segundos: 150 * 60, peso: MATERIA.peso?.completo ?? proporcional(45) },
  };
  const ex = SPECIAL_BADGES.find((b) => b.id === "explorador");
  if (ex) ex.nome = MATERIA.id === "fisica" ? "Explorador da Física" : `Explorador: ${MATERIA.nome}`;
}
export type Answer = { correct: boolean; attempts: number; everCorrect: boolean; lastAt: string; hist: boolean[] };
export type ReviewItem = { box: number; due: string };
export type SimuladoResult = { date: string; score: number; total: number; seconds: number; kind: SimKind };
export type LogItem = { id: string; area: string; content: string | null; ok: boolean; t: string };
export type Week = { id: string; answered: number; days: string[]; simulados: number; revisaoAcertos: number; paid: string[]; focus: string; focusAcertos: number };
export type State = {
  schema: 2;
  xp: number;
  answers: Record<string, Answer>;
  streak: { count: number; best: number; lastDate: string | null };
  daily: { date: string; count: number; goalPaid: boolean };
  badges: string[];
  simulados: SimuladoResult[];
  review: Record<string, ReviewItem>;
  revisaoAcertosTotal: number;
  recent: string[];
  log: LogItem[];
  week: Week;
  prefs: { fonte: 0 | 1 | 2 };
  /** Dia de folga: 1 por semana, automático. Protege a sequência se você ficar UM dia sem estudar. */
  folga: { semana: string; usadaEm: string | null; avisar: boolean };
};

const iso = (d: Date) => d.toLocaleDateString("sv-SE"); // AAAA-MM-DD no fuso do aparelho
export const today = () => iso(new Date());
export const addDays = (n: number, base = new Date()) => {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return iso(d);
};
const yesterday = () => addDays(-1);
export const weekId = (d = new Date()) => {
  const x = new Date(d);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); // segunda-feira
  return iso(x);
};

export const emptyState = (): State => ({
  schema: 2,
  xp: 0,
  answers: {},
  streak: { count: 0, best: 0, lastDate: null },
  daily: { date: today(), count: 0, goalPaid: false },
  badges: [],
  simulados: [],
  review: {},
  revisaoAcertosTotal: 0,
  recent: [],
  log: [],
  week: { id: weekId(), answered: 0, days: [], simulados: 0, revisaoAcertos: 0, paid: [], focus: TOPICS[0].name, focusAcertos: 0 },
  prefs: { fonte: 0 },
  folga: { semana: weekId(), usadaEm: null, avisar: false },
});

/* ---------- domínio (honesto: últimas respostas, não volume) ---------- */
export const DOMINIO = { janelaTema: 10, minTema: 3, janelaSub: 5, minSub: 2 };
function dominio(s: State, filtro: (l: LogItem) => boolean, janela: number, min: number) {
  const vistos = new Set<string>();
  const ult: boolean[] = [];
  for (let i = s.log.length - 1; i >= 0 && ult.length < janela; i--) {
    const l = s.log[i];
    if (!filtro(l) || vistos.has(l.id)) continue;
    vistos.add(l.id);
    ult.push(l.ok);
  }
  const n = ult.length;
  return { n, pct: n >= min ? Math.round((ult.filter(Boolean).length / n) * 100) : null, ult };
}
export const dominioTema = (s: State, area: string) => dominio(s, (l) => l.area === area, DOMINIO.janelaTema, DOMINIO.minTema);
export const dominioSub = (s: State, area: string, content: string | null) =>
  dominio(s, (l) => l.area === area && l.content === content, DOMINIO.janelaSub, DOMINIO.minSub);
/* ---------- níveis de domínio por tema ---------- */
export const NIVEIS_DOMINIO = [
  { id: "iniciante", nome: "Iniciante", emoji: "🌱", min: 0, minN: DOMINIO.minTema, regra: `menos de 50% de acertos (ou menos de ${DOMINIO.minTema} questões respondidas)` },
  { id: "praticando", nome: "Praticando", emoji: "💪", min: 50, minN: DOMINIO.minTema, regra: "de 50% a 79% de acertos" },
  { id: "dominando", nome: "Dominando", emoji: "🏆", min: 80, minN: 5, regra: "80% ou mais, com pelo menos 5 questões na conta" },
] as const;
/** 0 = Iniciante, 1 = Praticando, 2 = Dominando. Sem dados suficientes conta como Iniciante. */
export function nivelDominio(d: { n: number; pct: number | null }): number {
  if (d.pct === null) return 0;
  let k = 0;
  NIVEIS_DOMINIO.forEach((nv, i) => { if (d.pct! >= nv.min && d.n >= nv.minN) k = i; });
  return k;
}
/** Quantos acertos seguidos em questões novas do tema levam ao próximo nível (null se já está no topo). */
export function acertosParaSubir(s: State, area: string): number | null {
  const d = dominioTema(s, area);
  const atual = nivelDominio(d);
  if (atual >= NIVEIS_DOMINIO.length - 1) return null;
  for (let k = 1; k <= DOMINIO.janelaTema; k++) {
    const ult = [...Array(k).fill(true), ...d.ult].slice(0, DOMINIO.janelaTema);
    const n = ult.length;
    const pct = n >= DOMINIO.minTema ? Math.round((ult.filter(Boolean).length / n) * 100) : null;
    if (nivelDominio({ n, pct }) > atual) return k;
  }
  return DOMINIO.janelaTema;
}
export type ProximoPasso = { texto: string; acao: "revisao" | "tema" | "rapido" | "simulado"; tema?: string };
export function proximoPasso(s: State): ProximoPasso {
  const due = dueReviews(s).length;
  if (due) return { texto: `Recupere ${due === 1 ? "o erro" : `os ${due} erros`} de hoje na revisão: cada acerto vale +${XP.revisao} XP extra.`, acao: "revisao" };
  const tema = temaMaisFraco(s);
  const d = dominioTema(s, tema);
  if (d.pct === null) {
    const falta = DOMINIO.minTema - d.n;
    return { texto: `Responda ${falta} ${falta === 1 ? "questão" : "questões"} de ${tema} pra eu medir seu nível nesse tema.`, acao: "tema", tema };
  }
  const k = acertosParaSubir(s, tema);
  if (k === null) return { texto: "Todos os temas medidos estão em Dominando! Faça um mini-simulado pra testar de verdade.", acao: "simulado" };
  const nv = NIVEIS_DOMINIO[nivelDominio(d)], prox = NIVEIS_DOMINIO[nivelDominio(d) + 1];
  return { texto: `${tema} está em ${nv.nome} (${d.pct}% nas últimas ${d.n}). Acerte ${k} ${k === 1 ? "questão nova" : "questões novas"} desse tema pra chegar em ${prox.nome}.`, acao: "tema", tema };
}
export const folgaDisponivel = (s: State) => !(s.folga.semana === weekId() && s.folga.usadaEm);

export function subtemas(area: string) {
  const m = new Map<string | null, number>();
  for (const q of byTopic(area)) m.set(q.content, (m.get(q.content) ?? 0) + 1);
  return [...m.entries()].map(([content, total]) => ({ content, nome: subtemaNome(content), total })).sort((a, b) => b.total - a.total);
}
/** Tema mais fraco: menor domínio entre os temas com dados; sem dados, o menos explorado (cobertura). */
export function temaMaisFraco(s: State): string {
  const comDados = TOPICS.map((t) => ({ t: t.name, d: dominioTema(s, t.name) })).filter((x) => x.d.pct !== null);
  if (comDados.length) return comDados.sort((a, b) => a.d.pct! - b.d.pct! || a.d.n - b.d.n)[0].t;
  const cob = TOPICS.filter((t) => byTopic(t.name).length >= 5).map((t) => ({ t: t.name, c: topicStats(s, t.name).vistas / byTopic(t.name).length }));
  return cob.sort((a, b) => a.c - b.c)[0]?.t ?? TOPICS[0].name;
}

const novaSemana = (s: State): Week => ({ id: weekId(), answered: 0, days: [], simulados: 0, revisaoAcertos: 0, paid: [], focus: temaMaisFraco(s), focusAcertos: 0 });

/** Normaliza e migra progresso salvo (v1 → v2) sem perder nada. */
export function normalize(raw: Partial<State> & Record<string, unknown>): State {
  const base = emptyState();
  const s = { ...base, ...raw, prefs: { ...base.prefs, ...(raw.prefs ?? {}) }, folga: { ...base.folga, ...(raw.folga ?? {}) } } as State;
  s.schema = 2;
  for (const [id, a] of Object.entries(s.answers ?? {})) {
    if (!Array.isArray(a.hist)) s.answers[id] = { ...a, everCorrect: Boolean(a.everCorrect) || a.correct, hist: [a.correct] };
  }
  if (!Array.isArray(s.log) || (s.log.length === 0 && Object.keys(s.answers).length)) {
    // v1 não tinha histórico: reconstrói com a última resposta de cada questão
    s.log = Object.entries(s.answers)
      .filter(([id]) => qById.has(id))
      .map(([id, a]) => ({ id, area: qById.get(id)!.area, content: qById.get(id)!.content, ok: a.correct, t: a.lastAt }))
      .sort((x, y) => x.t.localeCompare(y.t));
  }
  s.simulados = (s.simulados ?? []).map((r) => ({ ...r, kind: r.kind ?? "mini" }));
  s.review = s.review ?? {};
  s.recent = s.recent ?? [];
  if (s.daily?.date !== today()) s.daily = { date: today(), count: 0, goalPaid: false };
  s.streak = { ...base.streak, ...(s.streak ?? {}) };
  if (s.streak.lastDate && s.streak.lastDate !== today() && s.streak.lastDate !== yesterday()) {
    // dia de folga: ficou exatamente 1 dia sem estudar e a folga desta semana está livre → a sequência continua
    if (s.streak.lastDate === addDays(-2) && s.streak.count > 0 && folgaDisponivel(s)) {
      s.folga = { semana: weekId(), usadaEm: yesterday(), avisar: true };
      s.streak = { ...s.streak, lastDate: yesterday() };
    } else s.streak = { ...s.streak, count: 0 };
  }
  if (!s.week || s.week.id !== weekId()) s.week = novaSemana(s);
  else if (!s.week.focus) {
    const ids = new Set(missoes(s.week).map((m) => m.id));
    s.week = { ...s.week, focus: temaMaisFraco(s), focusAcertos: 0, paid: (s.week.paid ?? []).filter((p) => ids.has(p)) };
  }
  return s;
}

export function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyState();
    const obj = JSON.parse(raw);
    if (obj && obj.schema !== 2 && !localStorage.getItem(KEY + "-backup-v1")) localStorage.setItem(KEY + "-backup-v1", raw); // cópia de segurança antes de migrar
    return normalize(obj);
  } catch {
    return emptyState();
  }
}
export const save = (s: State) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* modo privado sem armazenamento */
  }
};

export function levelOf(xp: number) {
  let i = 0;
  LEVELS.forEach((l, idx) => {
    if (xp >= l.min) i = idx;
  });
  const cur = LEVELS[i];
  const next = LEVELS[i + 1];
  const pct = next ? Math.round(((xp - cur.min) / (next.min - cur.min)) * 100) : 100;
  return { index: i, cur, next, pct };
}

/* ---------- missões da semana (focadas no ponto fraco) ---------- */
export type Missao = { id: string; titulo: string; meta: number; xp: number; emoji: string; val: number };
export function missoes(w: Week): Missao[] {
  return [
    { id: "m-foco", titulo: `Acertar 5 questões de ${w.focus}`, meta: 5, xp: 40, emoji: "🎯", val: w.focusAcertos },
    { id: "m-revisao", titulo: "Recuperar 3 erros na revisão", meta: 3, xp: 30, emoji: "🔁", val: w.revisaoAcertos },
    { id: "m-simulado", titulo: "Terminar 1 simulado (mini ou completo)", meta: 1, xp: 30, emoji: "⏱️", val: w.simulados },
    { id: "m-dias", titulo: "Estudar em 4 dias diferentes", meta: 4, xp: 20, emoji: "📅", val: w.days.length },
  ];
}
function payMissions(s: State): string[] {
  const done: string[] = [];
  for (const m of missoes(s.week)) {
    if (!s.week.paid.includes(m.id) && m.val >= m.meta) {
      s.week.paid.push(m.id);
      s.xp += m.xp;
      done.push(m.titulo);
    }
  }
  return done;
}

export type Gain = {
  xp: number; newBadges: string[]; levelUp: string | null; metaBatida: boolean; missoes: string[]; recuperou: boolean;
  /** bônus surpresa (XP) */ surpresa?: number;
  /** sequência que avançou com esta resposta (1ª questão do dia) */ sequencia?: number;
  /** tema que subiu de nível de domínio */ dominioUp?: { tema: string; nivel: string } | null;
};
export type Origem = "pratica" | "simulado" | "revisao";

/** Registra uma resposta e devolve o novo estado + o que foi ganho. */
export function registerAnswer(prev: State, q: Question, correct: boolean, origem: Origem, dicasUsadas = 0): [State, Gain] {
  const s: State = normalize(structuredClone(prev));
  const xpBefore = s.xp;
  const lvlBefore = levelOf(s.xp).index;
  const domAntes = nivelDominio(dominioTema(s, q.area));
  const a = s.answers[q.id];
  const t = today();
  s.answers[q.id] = {
    correct, attempts: (a?.attempts ?? 0) + 1, everCorrect: Boolean(a?.everCorrect) || correct, lastAt: new Date().toISOString(),
    hist: [...(a?.hist ?? []), correct].slice(-3),
  };
  s.recent = [q.id, ...s.recent.filter((x) => x !== q.id)].slice(0, 40);
  s.log = [...s.log, { id: q.id, area: q.area, content: q.content, ok: correct, t: new Date().toISOString() }].slice(-400);

  // revisão espaçada dos erros
  const r = s.review[q.id];
  let recuperou = false;
  if (!correct) {
    s.review[q.id] = { box: 0, due: origem === "revisao" ? addDays(1) : t };
  } else if (r && r.due <= t) {
    recuperou = true;
    s.revisaoAcertosTotal += 1;
    s.week.revisaoAcertos += 1;
    const box = r.box + 1;
    if (box > INTERVALOS.length) delete s.review[q.id];
    else s.review[q.id] = { box, due: addDays(INTERVALOS[box - 1]) };
  }

  let gained = 0;
  if (correct) {
    gained = XP.acertoComDica[Math.min(dicasUsadas, 2)];
    if (origem === "simulado") gained += XP.bonusSimulado;
    if (recuperou && origem !== "simulado") gained += XP.revisao;
    if (q.area === s.week.focus) s.week.focusAcertos += 1;
  }
  let surpresa = 0;
  if (correct && origem !== "simulado" && sorteio() < CHANCE_SURPRESA) { surpresa = XP.surpresa; gained += surpresa; }
  let sequencia = 0;
  if (s.streak.lastDate !== t) {
    s.streak.count = s.streak.lastDate === yesterday() ? s.streak.count + 1 : 1;
    s.streak.lastDate = t;
    s.streak.best = Math.max(s.streak.best, s.streak.count);
    sequencia = s.streak.count;
  }
  s.daily.count += 1;
  s.week.answered += 1;
  if (!s.week.days.includes(t)) s.week.days.push(t);
  let metaBatida = false;
  if (s.daily.count >= META_DIARIA && !s.daily.goalPaid) {
    s.daily.goalPaid = true;
    gained += XP.metaDiaria;
    metaBatida = true;
  }
  s.xp += gained;
  const ms = payMissions(s);
  const newBadges = checkBadges(s);
  const lvlAfter = levelOf(s.xp).index;
  const domDepois = nivelDominio(dominioTema(s, q.area));
  const dominioUp = correct && origem !== "simulado" && domDepois > domAntes ? { tema: q.area, nivel: NIVEIS_DOMINIO[domDepois].nome } : null;
  return [s, { xp: s.xp - xpBefore, newBadges, levelUp: lvlAfter > lvlBefore ? levelOf(s.xp).cur.title : null, metaBatida, missoes: ms, recuperou, surpresa, sequencia, dominioUp }];
}

export function registerSimulado(prev: State, kind: SimKind, score: number, total: number, seconds: number): [State, Gain] {
  const s: State = normalize(structuredClone(prev));
  const xpBefore = s.xp;
  const lvlBefore = levelOf(s.xp).index;
  s.simulados.push({ date: new Date().toISOString(), score, total, seconds, kind });
  s.week.simulados += 1;
  if (score === total) s.xp += XP.gabaritou;
  const ms = payMissions(s);
  const newBadges = checkBadges(s);
  const lvlAfter = levelOf(s.xp).index;
  return [s, { xp: s.xp - xpBefore, newBadges, levelUp: lvlAfter > lvlBefore ? levelOf(s.xp).cur.title : null, metaBatida: false, missoes: ms, recuperou: false }];
}

/** Cobertura por tema: vistas e certas na última tentativa. */
export function topicStats(s: State, topic: string) {
  const qs = byTopic(topic);
  const vistas = qs.filter((q) => s.answers[q.id]);
  const dominadas = vistas.filter((q) => s.answers[q.id].correct);
  const acertos = vistas.filter((q) => s.answers[q.id].everCorrect);
  return { total: qs.length, vistas: vistas.length, dominadas: dominadas.length, acertos: acertos.length };
}
export const badgeMin = (total: number) => Math.min(BADGE_MIN_ACERTOS, total);

export const SPECIAL_BADGES = [
  { id: "primeira", nome: "Primeira Questão", emoji: "🌱", desc: "Respondeu a primeira questão" },
  { id: "streak3", nome: "Motor Ligado", emoji: "🔥", desc: "3 dias seguidos estudando" },
  { id: "streak7", nome: "Semana em Órbita", emoji: "🛰️", desc: "7 dias seguidos estudando" },
  { id: "explorador", nome: "Explorador da Física", emoji: "🧭", desc: "Respondeu questões de todos os temas" },
  { id: "simulado", nome: "Encarou o Simulado", emoji: "⏱️", desc: "Terminou um mini-simulado ou simulado" },
  { id: "nota70", nome: "Acima da Média", emoji: "📈", desc: "70% ou mais num simulado" },
  { id: "gabaritou", nome: "Gabaritou!", emoji: "💯", desc: "Acertou todas num simulado" },
  { id: "revisor", nome: "Aprendeu com o Erro", emoji: "🔁", desc: "Recuperou 5 erros na revisão" },
  { id: "missoes", nome: "Semana Completa", emoji: "🗓️", desc: "Cumpriu as 4 missões da semana" },
  { id: "cem", nome: "Cem Questões", emoji: "📚", desc: "Respondeu 100 questões diferentes" },
];

export function checkBadges(s: State): string[] {
  const novos: string[] = [];
  const give = (id: string) => {
    if (!s.badges.includes(id)) {
      s.badges.push(id);
      novos.push(id);
    }
  };
  const respondidas = Object.keys(s.answers).length;
  if (respondidas >= 1) give("primeira");
  if (respondidas >= 100) give("cem");
  if (s.streak.best >= 3) give("streak3");
  if (s.streak.best >= 7) give("streak7");
  if (s.simulados.length >= 1) give("simulado");
  if (s.simulados.some((r) => r.total >= 10 && r.score / r.total >= 0.7)) give("nota70");
  if (s.simulados.some((r) => r.score === r.total && r.total >= 10)) give("gabaritou");
  if (s.revisaoAcertosTotal >= 5) give("revisor");
  if (s.week.paid.length >= missoes(s.week).length) give("missoes");
  let todos = true;
  for (const t of TOPICS) {
    const st = topicStats(s, t.name);
    if (st.vistas === 0) todos = false;
    if (st.acertos >= badgeMin(st.total)) give("tema:" + t.name);
  }
  if (todos) give("explorador");
  return novos;
}

export const ALL_BADGES = () => [...SPECIAL_BADGES.map((b) => b.id), ...TOPICS.map((t) => "tema:" + t.name)];

export function badgeLabel(id: string) {
  if (id.startsWith("tema:")) {
    const t = TOPICS.find((x) => "tema:" + x.name === id);
    if (!t) return { nome: id, emoji: "🏅", desc: "" };
    const n = badgeMin(byTopic(t.name).length);
    return { nome: t.badge, emoji: t.emoji, desc: `${n} ${n === 1 ? "acerto" : "acertos"} em ${t.name}` };
  }
  return SPECIAL_BADGES.find((x) => x.id === id) ?? { nome: id, emoji: "🏅", desc: "" };
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Prática: inéditas fora das recentes primeiro, depois erradas, depois acertadas (as mais antigas antes). */
export function practiceSet(s: State, topic: string | null, n = 10, excluir: Set<string> = new Set()): Question[] {
  const pool = (topic ? byTopic(topic) : QUESTIONS).filter((q) => !excluir.has(q.id));
  const recent = new Set(s.recent);
  const ineditas = shuffle(pool.filter((q) => !s.answers[q.id] && !recent.has(q.id)));
  const erradas = shuffle(pool.filter((q) => s.answers[q.id] && !s.answers[q.id].correct && !recent.has(q.id)));
  const certas = pool
    .filter((q) => s.answers[q.id]?.correct && !recent.has(q.id))
    .sort((a, b) => s.answers[a.id].lastAt.localeCompare(s.answers[b.id].lastAt));
  const recentes = shuffle(pool.filter((q) => recent.has(q.id)));
  return [...ineditas, ...erradas, ...certas, ...recentes].slice(0, n);
}

/** Revisão espaçada. */
export const dueReviews = (s: State) => {
  const t = today();
  return QUESTIONS.filter((q) => s.review[q.id] && s.review[q.id].due <= t);
};
export const scheduledReviews = (s: State) => {
  const t = today();
  return Object.values(s.review).filter((r) => r.due > t);
};
export const reviewSet = (s: State) => shuffle(dueReviews(s)).slice(0, 10);

/** Treino inteligente (10): até 3 revisões vencidas + 4 do tema mais fraco + 3 inéditas de outros temas.
 *  Treino rápido (5): mesma mistura em escala menor (até 2 revisões + 2 do ponto fraco + 1 inédita). */
export function smartSet(s: State, n = 10): { questions: Question[]; revisao: Set<string>; foco: string } {
  const foco = temaMaisFraco(s);
  const nRev = n >= 10 ? 3 : 2, nFraco = n >= 10 ? 4 : 2, nNovas = n - nRev - nFraco;
  const rev = shuffle(dueReviews(s)).slice(0, nRev);
  const usados = new Set(rev.map((q) => q.id));
  const fracas = practiceSet(s, foco, nFraco, usados);
  fracas.forEach((q) => usados.add(q.id));
  const recent = new Set(s.recent);
  const novas = shuffle(QUESTIONS.filter((q) => q.area !== foco && !s.answers[q.id] && !recent.has(q.id) && !usados.has(q.id))).slice(0, nNovas);
  novas.forEach((q) => usados.add(q.id));
  const resto = practiceSet(s, null, n, usados);
  const questions = shuffle([...rev, ...fracas, ...novas, ...resto].slice(0, n));
  return { questions, revisao: new Set(rev.map((q) => q.id)), foco };
}

/** Simulados: proporção por tema; prefere questões nunca respondidas e fora das últimas vistas na prática. */
export function simuladoSet(s: State, kind: SimKind): Question[] {
  const cfg = SIMULADOS[kind];
  const recent = new Set(s.recent);
  const rank = (q: Question) => (!s.answers[q.id] && !recent.has(q.id) ? 0 : !recent.has(q.id) ? 1 : 2);
  const ordena = (qs: Question[]) => shuffle(qs).sort((a, b) => rank(a) - rank(b));
  const escolhidas: Question[] = [];
  for (const t of TOPICS) escolhidas.push(...ordena(byTopic(t.name)).slice(0, cfg.peso[t.name] ?? 1));
  const resto = ordena(QUESTIONS.filter((q) => !escolhidas.includes(q)));
  while (escolhidas.length < cfg.n && resto.length) escolhidas.push(resto.shift()!);
  return shuffle(escolhidas.slice(0, cfg.n));
}
export const simuladoDisponivel = (kind: SimKind) =>
  Object.entries(SIMULADOS[kind].peso).every(([area, n]) => byTopic(area).length >= n) && QUESTIONS.length >= SIMULADOS[kind].n;

configurarJogo();
