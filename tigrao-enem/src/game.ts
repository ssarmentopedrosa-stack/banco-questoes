import { QUESTIONS, TOPICS, byTopic, type Question } from "./data";

export const LEVELS = [
  { title: "Calouro do Cursinho", min: 0, emoji: "🎒" },
  { title: "Vestibulando", min: 100, emoji: "📖" },
  { title: "Cientista da Natureza", min: 300, emoji: "🔬" },
  { title: "Nota 700", min: 650, emoji: "🎯" },
  { title: "Nota 800", min: 1100, emoji: "🚀" },
  { title: "Aprovado em Medicina", min: 1700, emoji: "🩺" },
];

/** Erro não dá XP (só acerto). */
export const XP = { acerto: 10, bonusSimulado: 5, gabaritou: 50, metaDiaria: 20 };
export const META_DIARIA = 10;
export const BADGE_MIN_ACERTOS = 5;
export const SIMULADO_N = 15;
export const SIMULADO_SEGUNDOS = 45 * 60; // ritmo ENEM: 3 min por questão
/** Intervalos (dias) da revisão espaçada depois de cada acerto na revisão. */
export const INTERVALOS = [1, 3, 7];

export type Answer = { correct: boolean; attempts: number; everCorrect: boolean; lastAt: string };
export type ReviewItem = { box: number; due: string };
export type SimuladoResult = { date: string; score: number; total: number; seconds: number };
export type Week = { id: string; answered: number; days: string[]; simulados: number; revisaoAcertos: number; paid: string[] };
export type State = {
  xp: number;
  answers: Record<string, Answer>;
  streak: { count: number; best: number; lastDate: string | null };
  daily: { date: string; count: number; goalPaid: boolean };
  badges: string[];
  simulados: SimuladoResult[];
  review: Record<string, ReviewItem>;
  revisaoAcertosTotal: number;
  recent: string[];
  week: Week;
};

const KEY = "tigrao-enem-fisica-v1";
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
const emptyWeek = (): Week => ({ id: weekId(), answered: 0, days: [], simulados: 0, revisaoAcertos: 0, paid: [] });

export const emptyState = (): State => ({
  xp: 0,
  answers: {},
  streak: { count: 0, best: 0, lastDate: null },
  daily: { date: today(), count: 0, goalPaid: false },
  badges: [],
  simulados: [],
  review: {},
  revisaoAcertosTotal: 0,
  recent: [],
  week: emptyWeek(),
});

export function normalize(st: State): State {
  const s = { ...emptyState(), ...st };
  if (s.daily.date !== today()) s.daily = { date: today(), count: 0, goalPaid: false };
  if (s.streak.lastDate && s.streak.lastDate !== today() && s.streak.lastDate !== yesterday()) s.streak = { ...s.streak, count: 0 };
  if (!s.week || s.week.id !== weekId()) s.week = emptyWeek();
  return s;
}

export function load(): State {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || "null");
    return s ? normalize(s as State) : emptyState();
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

/* ---------- missões da semana ---------- */
export const MISSIONS = [
  { id: "m-questoes", titulo: "Responder 40 questões", meta: 40, xp: 40, emoji: "📝", val: (w: Week) => w.answered },
  { id: "m-dias", titulo: "Estudar em 4 dias diferentes", meta: 4, xp: 30, emoji: "📅", val: (w: Week) => w.days.length },
  { id: "m-simulado", titulo: "Terminar 1 Simulado ENEM", meta: 1, xp: 30, emoji: "⏱️", val: (w: Week) => w.simulados },
  { id: "m-revisao", titulo: "Acertar 5 questões na revisão", meta: 5, xp: 30, emoji: "🔁", val: (w: Week) => w.revisaoAcertos },
];

function payMissions(s: State): string[] {
  const done: string[] = [];
  for (const m of MISSIONS) {
    if (!s.week.paid.includes(m.id) && m.val(s.week) >= m.meta) {
      s.week.paid.push(m.id);
      s.xp += m.xp;
      done.push(m.titulo);
    }
  }
  return done;
}

export type Gain = { xp: number; newBadges: string[]; levelUp: string | null; metaBatida: boolean; missoes: string[] };
export type Origem = "pratica" | "simulado" | "revisao";

/** Registra uma resposta e devolve o novo estado + o que foi ganho. */
export function registerAnswer(prev: State, q: Question, correct: boolean, origem: Origem): [State, Gain] {
  const s: State = normalize(structuredClone(prev));
  const xpBefore = s.xp;
  const lvlBefore = levelOf(s.xp).index;
  const a = s.answers[q.id];
  s.answers[q.id] = { correct, attempts: (a?.attempts ?? 0) + 1, everCorrect: Boolean(a?.everCorrect) || correct, lastAt: new Date().toISOString() };
  s.recent = [q.id, ...s.recent.filter((x) => x !== q.id)].slice(0, 40);

  // revisão espaçada dos erros
  const t = today();
  const r = s.review[q.id];
  if (!correct) {
    s.review[q.id] = { box: 0, due: origem === "revisao" ? addDays(1) : t };
  } else if (r && r.due <= t) {
    if (origem === "revisao") {
      s.revisaoAcertosTotal += 1;
      s.week.revisaoAcertos += 1;
    }
    const box = r.box + 1;
    if (box > INTERVALOS.length) delete s.review[q.id];
    else s.review[q.id] = { box, due: addDays(INTERVALOS[box - 1]) };
  }

  let gained = correct ? XP.acerto + (origem === "simulado" ? XP.bonusSimulado : 0) : 0;
  if (s.streak.lastDate !== t) {
    s.streak.count = s.streak.lastDate === yesterday() ? s.streak.count + 1 : 1;
    s.streak.lastDate = t;
    s.streak.best = Math.max(s.streak.best, s.streak.count);
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
  const missoes = payMissions(s);
  const newBadges = checkBadges(s);
  const lvlAfter = levelOf(s.xp).index;
  return [s, { xp: s.xp - xpBefore, newBadges, levelUp: lvlAfter > lvlBefore ? levelOf(s.xp).cur.title : null, metaBatida, missoes }];
}

export function registerSimulado(prev: State, score: number, total: number, seconds: number): [State, Gain] {
  const s: State = normalize(structuredClone(prev));
  const xpBefore = s.xp;
  const lvlBefore = levelOf(s.xp).index;
  s.simulados.push({ date: new Date().toISOString(), score, total, seconds });
  s.week.simulados += 1;
  if (score === total) s.xp += XP.gabaritou;
  const missoes = payMissions(s);
  const newBadges = checkBadges(s);
  const lvlAfter = levelOf(s.xp).index;
  return [s, { xp: s.xp - xpBefore, newBadges, levelUp: lvlAfter > lvlBefore ? levelOf(s.xp).cur.title : null, metaBatida: false, missoes }];
}

/** Progresso honesto: vistas, acertadas pelo menos uma vez e acertadas na última tentativa. */
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
  { id: "simulado", nome: "Encarou o Simulado", emoji: "⏱️", desc: "Terminou um Simulado ENEM" },
  { id: "nota70", nome: "Acima da Média", emoji: "📈", desc: "70% ou mais num Simulado ENEM" },
  { id: "gabaritou", nome: "Gabaritou!", emoji: "💯", desc: "Acertou todas num Simulado ENEM" },
  { id: "revisor", nome: "Aprendeu com o Erro", emoji: "🔁", desc: "Acertou 5 questões na revisão" },
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
  if (s.week.paid.length >= MISSIONS.length) give("missoes");
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
export function practiceSet(s: State, topic: string | null, n = 10): Question[] {
  const pool = topic ? byTopic(topic) : QUESTIONS;
  const recent = new Set(s.recent);
  const ineditas = shuffle(pool.filter((q) => !s.answers[q.id] && !recent.has(q.id)));
  const erradas = shuffle(pool.filter((q) => s.answers[q.id] && !s.answers[q.id].correct && !recent.has(q.id)));
  const certas = pool
    .filter((q) => s.answers[q.id]?.correct && !recent.has(q.id))
    .sort((a, b) => s.answers[a.id].lastAt.localeCompare(s.answers[b.id].lastAt));
  const recentes = shuffle(pool.filter((q) => recent.has(q.id)));
  return [...ineditas, ...erradas, ...certas, ...recentes].slice(0, n);
}

/** Revisão espaçada: erros com revisão vencida (até 10). */
export const dueReviews = (s: State) => {
  const t = today();
  return QUESTIONS.filter((q) => s.review[q.id] && s.review[q.id].due <= t);
};
export const scheduledReviews = (s: State) => {
  const t = today();
  return Object.values(s.review).filter((r) => r.due > t);
};
export const reviewSet = (s: State) => shuffle(dueReviews(s)).slice(0, 10);

/** Proporção por tema no Simulado ENEM (15 questões), parecida com a prova. */
const PESO: Record<string, number> = { "Mecânica": 4, "Eletricidade e Magnetismo": 3, "Ondulatória": 3, "Termologia": 3, "Óptica": 1, "Física Moderna": 1 };

/** Simulado ENEM: prefere questões nunca respondidas e fora das últimas vistas na prática. */
export function simuladoSet(s: State): Question[] {
  const recent = new Set(s.recent);
  const rank = (q: Question) => (!s.answers[q.id] && !recent.has(q.id) ? 0 : !recent.has(q.id) ? 1 : 2);
  const ordena = (qs: Question[]) => shuffle(qs).sort((a, b) => rank(a) - rank(b));
  const escolhidas: Question[] = [];
  for (const t of TOPICS) escolhidas.push(...ordena(byTopic(t.name)).slice(0, PESO[t.name] ?? 1));
  const resto = ordena(QUESTIONS.filter((q) => !escolhidas.includes(q)));
  while (escolhidas.length < SIMULADO_N && resto.length) escolhidas.push(resto.shift()!);
  return shuffle(escolhidas.slice(0, SIMULADO_N));
}
