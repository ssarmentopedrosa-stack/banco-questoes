/**
 * Lógica pura do modo Desafio (gamificação). Sem React, sem DOM, sem rede:
 * tudo aqui é determinístico e testável com `node --test`.
 *
 * O estado do aluno (`PlayerProfile`) é um objeto JSON simples. Hoje ele vive
 * em localStorage (ver `storage.ts`); para ligar ao login/DB existente basta
 * implementar outro `ProgressRepository` que leia/grave o mesmo JSON por
 * `userId` — esta lógica não muda.
 */

export type Demand = "LOW" | "MODERATE" | "HIGH";

/** Questão jogável: só o que o desafio precisa, derivado de banco.json + oficial-view.json. */
export type PlayableQuestion = {
  id: string;
  year: string;
  domain: string;
  demand: Demand | null;
  answer: string | null;
  annulled: boolean;
  reviewRequired: boolean;
};

export type AnswerRecord = {
  questionId: string;
  correct: boolean;
  chosen: string;
  at: string; // ISO
};

export type PlayerProfile = {
  version: 1;
  nickname: string;
  xp: number;
  /** Último dia (AAAA-MM-DD, fuso local) em que jogou. */
  lastPlayedDay: string | null;
  dayStreak: number;
  bestDayStreak: number;
  bestAnswerStreak: number;
  roundsPlayed: number;
  /** Dias (AAAA-MM-DD) em que o desafio do dia foi concluído. */
  dailyDone: string[];
  /** Última resposta por questão. */
  last: Record<string, { correct: boolean; chosen: string; at: string }>;
  /** Questões já acertadas ao menos uma vez. */
  everCorrect: string[];
  achievements: string[];
  createdAt: string;
};

// ---------------------------------------------------------------- XP

export const XP_BASE = 10;
export const XP_DEMAND_BONUS: Record<Demand, number> = { LOW: 0, MODERATE: 5, HIGH: 10 };
export const STREAK_BONUS_STEP = 2;
export const STREAK_BONUS_CAP = 10;

/**
 * XP de uma resposta. `streakBefore` = acertos seguidos ANTES desta resposta.
 * Erro vale 0. Acerto vale base + bônus de demanda + bônus de sequência
 * (2 XP por acerto seguido anterior a partir do 2º, limitado a 10).
 */
export function xpForAnswer(correct: boolean, demand: Demand | null, streakBefore: number): number {
  if (!correct) return 0;
  const d = demand ? XP_DEMAND_BONUS[demand] : 0;
  const streak = Math.min(STREAK_BONUS_CAP, Math.max(0, streakBefore) * STREAK_BONUS_STEP);
  return XP_BASE + d + streak;
}

// ---------------------------------------------------------------- níveis

export type Level = { index: number; name: string; minXp: number; emoji: string; blurb: string };

export const LEVELS: readonly Level[] = [
  { index: 0, name: "Partícula", minXp: 0, emoji: "⚬", blurb: "Todo começo é quântico." },
  { index: 1, name: "Átomo", minXp: 100, emoji: "⚛", blurb: "Núcleo firme, elétrons curiosos." },
  { index: 2, name: "Molécula", minXp: 250, emoji: "⌬", blurb: "Ligações começam a se formar." },
  { index: 3, name: "Cristal", minXp: 500, emoji: "◆", blurb: "Estrutura organizada." },
  { index: 4, name: "Planeta", minXp: 900, emoji: "◍", blurb: "Órbita estável de estudos." },
  { index: 5, name: "Estrela", minXp: 1500, emoji: "✦", blurb: "Brilho próprio." },
  { index: 6, name: "Supernova", minXp: 2300, emoji: "✺", blurb: "Energia de sobra." },
  { index: 7, name: "Galáxia", minXp: 3300, emoji: "🌌", blurb: "Bilhões de ideias em rotação." },
];

export function levelFor(xp: number): { level: Level; next: Level | null; progress: number } {
  let level = LEVELS[0];
  for (const l of LEVELS) if (xp >= l.minXp) level = l;
  const next = LEVELS[level.index + 1] ?? null;
  const progress = next ? (xp - level.minXp) / (next.minXp - level.minXp) : 1;
  return { level, next, progress: Math.max(0, Math.min(1, progress)) };
}

// ---------------------------------------------------------------- datas e streak diário

/** AAAA-MM-DD no fuso local do aparelho. */
export function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function dayNumber(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
}

/** Novo streak diário ao jogar em `today`. Mesmo dia: mantém; dia seguinte: +1; lacuna: volta a 1. */
export function nextDayStreak(lastPlayedDay: string | null, current: number, today: string): number {
  if (!lastPlayedDay) return 1;
  const diff = dayNumber(today) - dayNumber(lastPlayedDay);
  if (diff <= 0) return Math.max(1, current);
  if (diff === 1) return current + 1;
  return 1;
}

/** Streak exibido hoje (sem jogar): zera se a última partida foi antes de ontem. */
export function visibleDayStreak(lastPlayedDay: string | null, current: number, today: string): number {
  if (!lastPlayedDay) return 0;
  return dayNumber(today) - dayNumber(lastPlayedDay) <= 1 ? current : 0;
}

// ---------------------------------------------------------------- sorteio

/** Hash FNV-1a 32 bits. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** PRNG mulberry32 — determinístico a partir da semente. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(list: readonly T[], random: () => number): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export type PoolFilter = {
  domains?: string[];
  years?: string[];
  demands?: Demand[];
  /** Incluir questões marcadas "precisa revisão" (padrão: não). */
  includeReview?: boolean;
};

/** Questões elegíveis: nunca anuladas nem sem gabarito; "precisa revisão" só com toggle. */
export function eligible<T extends PlayableQuestion>(questions: readonly T[], f: PoolFilter = {}): T[] {
  return questions.filter((q) => {
    if (q.annulled || !q.answer) return false;
    if (q.reviewRequired && !f.includeReview) return false;
    if (f.domains?.length && !f.domains.includes(q.domain)) return false;
    if (f.years?.length && !f.years.includes(q.year)) return false;
    if (f.demands?.length && (!q.demand || !f.demands.includes(q.demand))) return false;
    return true;
  });
}

export const ROUND_MIN = 5;
export const ROUND_MAX = 10;

export function clampRoundSize(n: number): number {
  return Math.max(ROUND_MIN, Math.min(ROUND_MAX, Math.round(n)));
}

/** Sorteia uma rodada (5–10) sem repetição a partir do pool filtrado. */
export function drawRound<T extends PlayableQuestion>(
  questions: readonly T[],
  f: PoolFilter,
  size: number,
  random: () => number,
): T[] {
  return shuffle(eligible(questions, f), random).slice(0, clampRoundSize(size));
}

export const DAILY_SIZE = 5;

/** Desafio do dia: mesmas 5 questões para todos os alunos na mesma data (sem revisão). */
export function dailyChallenge<T extends PlayableQuestion>(questions: readonly T[], day: string): T[] {
  const pool = eligible(questions, { includeReview: false }).sort((a, b) => a.id.localeCompare(b.id));
  return shuffle(pool, rng(hashString(`desafio-do-dia:${day}`))).slice(0, DAILY_SIZE);
}

// ---------------------------------------------------------------- perfil

export function newProfile(nickname: string, now: Date): PlayerProfile {
  return {
    version: 1,
    nickname: normalizeNickname(nickname),
    xp: 0,
    lastPlayedDay: null,
    dayStreak: 0,
    bestDayStreak: 0,
    bestAnswerStreak: 0,
    roundsPlayed: 0,
    dailyDone: [],
    last: {},
    everCorrect: [],
    achievements: [],
    createdAt: now.toISOString(),
  };
}

export function normalizeNickname(s: string): string {
  return s.replace(/\s+/g, " ").trim().slice(0, 24);
}

export type RoundAnswer = { question: PlayableQuestion; chosen: string };

export type RoundResult = {
  profile: PlayerProfile;
  xpGained: number;
  correct: number;
  total: number;
  perAnswerXp: number[];
  newAchievements: string[];
  leveledUp: boolean;
};

/** Aplica uma rodada concluída ao perfil (função pura: devolve um novo perfil). */
export function applyRound(
  profile: PlayerProfile,
  answers: readonly RoundAnswer[],
  ctx: { now: Date; isDaily: boolean; allQuestions: readonly PlayableQuestion[]; missions?: readonly Mission[] },
): RoundResult {
  const today = dayKey(ctx.now);
  const at = ctx.now.toISOString();
  const p: PlayerProfile = structuredClone(profile);
  let streak = 0;
  let best = p.bestAnswerStreak;
  let gained = 0;
  let correct = 0;
  const perAnswerXp: number[] = [];
  const ever = new Set(p.everCorrect);
  for (const a of answers) {
    const ok = !!a.question.answer && a.chosen === a.question.answer;
    const xp = xpForAnswer(ok, a.question.demand, streak);
    perAnswerXp.push(xp);
    gained += xp;
    if (ok) {
      correct++;
      streak++;
      ever.add(a.question.id);
    } else streak = 0;
    best = Math.max(best, streak);
    p.last[a.question.id] = { correct: ok, chosen: a.chosen, at };
  }
  const before = levelFor(p.xp).level.index;
  p.xp += gained;
  p.everCorrect = [...ever].sort();
  p.bestAnswerStreak = best;
  p.roundsPlayed += 1;
  if (answers.length) {
    p.dayStreak = nextDayStreak(p.lastPlayedDay, p.dayStreak, today);
    p.lastPlayedDay = today;
    p.bestDayStreak = Math.max(p.bestDayStreak, p.dayStreak);
  }
  if (ctx.isDaily && !p.dailyDone.includes(today)) p.dailyDone = [...p.dailyDone, today].sort();
  const had = new Set(p.achievements);
  const now = computeAchievements(p, ctx.allQuestions, ctx.missions ?? [], { perfectRound: answers.length >= ROUND_MIN && correct === answers.length });
  const newAchievements = now.filter((id) => !had.has(id));
  p.achievements = [...new Set([...p.achievements, ...now])].sort();
  return {
    profile: p,
    xpGained: gained,
    correct,
    total: answers.length,
    perAnswerXp,
    newAchievements,
    leveledUp: levelFor(p.xp).level.index > before,
  };
}

/** Questões cuja última resposta foi errada (para a revisão). */
export function wrongIds(p: PlayerProfile): string[] {
  return Object.entries(p.last)
    .filter(([, v]) => !v.correct)
    .sort((a, b) => b[1].at.localeCompare(a[1].at))
    .map(([id]) => id);
}

export type DomainStats = { domain: string; answered: number; correct: number; total: number; mastered: number };

/** Desempenho por domínio (última resposta de cada questão). */
export function domainStats(p: PlayerProfile, questions: readonly PlayableQuestion[], includeReview = false): DomainStats[] {
  const pool = eligible(questions, { includeReview });
  const ever = new Set(p.everCorrect);
  const map = new Map<string, DomainStats>();
  for (const q of pool) {
    const s = map.get(q.domain) ?? { domain: q.domain, answered: 0, correct: 0, total: 0, mastered: 0 };
    s.total++;
    const l = p.last[q.id];
    if (l) {
      s.answered++;
      if (l.correct) s.correct++;
    }
    if (ever.has(q.id)) s.mastered++;
    map.set(q.domain, s);
  }
  return [...map.values()].sort((a, b) => b.total - a.total || a.domain.localeCompare(b.domain));
}

// ---------------------------------------------------------------- missões (caminhos de estudo)

export type Mission = { id: string; nodes: string[]; domain: string };

/**
 * Missões a partir de `banco.paths`: cada caminho com ≥ 2 questões jogáveis vira
 * uma missão (ordem dos nós preservada). Sem duplicatas de sequência.
 */
export function missionsFromPaths(
  paths: readonly { nodes: string[] }[],
  questions: readonly PlayableQuestion[],
  f: PoolFilter = {},
  limit = 24,
): Mission[] {
  const ok = new Map(eligible(questions, f).map((q) => [q.id, q]));
  const seen = new Set<string>();
  const out: Mission[] = [];
  const sorted = [...paths].sort((a, b) => b.nodes.length - a.nodes.length || a.nodes.join().localeCompare(b.nodes.join()));
  for (const path of sorted) {
    if (path.nodes.length < 2 || !path.nodes.every((n) => ok.has(n))) continue;
    const key = path.nodes.join(">");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ id: `M-${hashString(key).toString(36)}`, nodes: [...path.nodes], domain: ok.get(path.nodes[0])!.domain });
    if (out.length >= limit) break;
  }
  return out;
}

export function missionProgress(p: PlayerProfile, m: Mission): { done: number; total: number; complete: boolean } {
  const ever = new Set(p.everCorrect);
  const done = m.nodes.filter((n) => ever.has(n)).length;
  return { done, total: m.nodes.length, complete: done === m.nodes.length };
}

// ---------------------------------------------------------------- conquistas

export type AchievementDef = { id: string; title: string; description: string; icon: string; group: "geral" | "dominio" | "ano" };

export const GENERAL_ACHIEVEMENTS: readonly AchievementDef[] = [
  { id: "primeira-rodada", title: "Big Bang", description: "Concluir a primeira rodada.", icon: "💥", group: "geral" },
  { id: "rodada-perfeita", title: "Ressonância", description: "Acertar todas as questões de uma rodada (mín. 5).", icon: "🎯", group: "geral" },
  { id: "sequencia-5", title: "Reação em cadeia", description: "5 acertos seguidos.", icon: "⛓", group: "geral" },
  { id: "sequencia-10", title: "Fissão controlada", description: "10 acertos seguidos.", icon: "☢", group: "geral" },
  { id: "streak-3", title: "Órbita estável", description: "Jogar 3 dias seguidos.", icon: "🛰", group: "geral" },
  { id: "streak-7", title: "Translação", description: "Jogar 7 dias seguidos.", icon: "🌍", group: "geral" },
  { id: "desafio-do-dia", title: "Relógio atômico", description: "Concluir um desafio do dia.", icon: "⏱", group: "geral" },
  { id: "missao", title: "Trajetória", description: "Completar uma missão (caminho de estudo).", icon: "🧭", group: "geral" },
  { id: "acertos-25", title: "Massa crítica", description: "Acertar 25 questões diferentes.", icon: "🔥", group: "geral" },
];

export const DOMAIN_TIERS = [
  { tier: "bronze", icon: "🥉", rule: "3 questões diferentes acertadas" },
  { tier: "prata", icon: "🥈", rule: "metade das questões do domínio acertadas" },
  { tier: "ouro", icon: "🥇", rule: "todas as questões do domínio acertadas" },
] as const;

export function computeAchievements(
  p: PlayerProfile,
  questions: readonly PlayableQuestion[],
  missions: readonly Mission[],
  extra: { perfectRound?: boolean } = {},
): string[] {
  const out: string[] = [];
  if (p.roundsPlayed >= 1) out.push("primeira-rodada");
  if (extra.perfectRound) out.push("rodada-perfeita");
  if (p.bestAnswerStreak >= 5) out.push("sequencia-5");
  if (p.bestAnswerStreak >= 10) out.push("sequencia-10");
  if (p.bestDayStreak >= 3) out.push("streak-3");
  if (p.bestDayStreak >= 7) out.push("streak-7");
  if (p.dailyDone.length >= 1) out.push("desafio-do-dia");
  if (p.everCorrect.length >= 25) out.push("acertos-25");
  if (missions.some((m) => missionProgress(p, m).complete)) out.push("missao");
  // medalhas por domínio (pool padrão, sem revisão)
  for (const s of domainStats(p, questions)) {
    if (s.mastered >= 3) out.push(`dominio:${s.domain}:bronze`);
    if (s.total >= 2 && s.mastered >= Math.ceil(s.total / 2)) out.push(`dominio:${s.domain}:prata`);
    if (s.total >= 1 && s.mastered === s.total) out.push(`dominio:${s.domain}:ouro`);
  }
  // medalhas por ano
  const pool = eligible(questions);
  const ever = new Set(p.everCorrect);
  const years = [...new Set(pool.map((q) => q.year))];
  for (const y of years) {
    const qs = pool.filter((q) => q.year === y);
    const answered = qs.filter((q) => p.last[q.id]).length;
    const got = qs.filter((q) => ever.has(q.id)).length;
    if (answered >= Math.min(5, qs.length)) out.push(`ano:${y}:explorador`);
    if (qs.length && got === qs.length) out.push(`ano:${y}:completo`);
  }
  return out;
}

// ---------------------------------------------------------------- ranking local + exportação

export type RankingRow = { nickname: string; xp: number; level: string; correct: number; dayStreak: number };

export function ranking(profiles: readonly PlayerProfile[], today: string): RankingRow[] {
  return profiles
    .map((p) => ({
      nickname: p.nickname,
      xp: p.xp,
      level: levelFor(p.xp).level.name,
      correct: p.everCorrect.length,
      dayStreak: visibleDayStreak(p.lastPlayedDay, p.dayStreak, today),
    }))
    .sort((a, b) => b.xp - a.xp || b.correct - a.correct || a.nickname.localeCompare(b.nickname, "pt"));
}

export const EXPORT_KIND = "banco-fisica-enem/desafio";

export type ExportFile = { kind: typeof EXPORT_KIND; version: 1; exportedAt: string; profiles: PlayerProfile[] };

export function exportProfiles(profiles: readonly PlayerProfile[], now: Date): ExportFile {
  return { kind: EXPORT_KIND, version: 1, exportedAt: now.toISOString(), profiles: structuredClone([...profiles]) };
}

function isProfile(x: unknown): x is PlayerProfile {
  if (!x || typeof x !== "object") return false;
  const p = x as Record<string, unknown>;
  return (
    p.version === 1 &&
    typeof p.nickname === "string" &&
    normalizeNickname(p.nickname).length > 0 &&
    typeof p.xp === "number" &&
    Number.isFinite(p.xp) &&
    p.xp >= 0 &&
    typeof p.last === "object" &&
    p.last !== null &&
    Array.isArray(p.everCorrect) &&
    Array.isArray(p.achievements) &&
    Array.isArray(p.dailyDone)
  );
}

/**
 * Importa um arquivo exportado. Perfis com o mesmo apelido (sem diferenciar
 * maiúsculas) são unidos ficando o de maior XP. Lança erro em arquivo inválido.
 */
export function importProfiles(current: readonly PlayerProfile[], raw: unknown): { profiles: PlayerProfile[]; added: number; updated: number } {
  if (!raw || typeof raw !== "object" || (raw as ExportFile).kind !== EXPORT_KIND || !Array.isArray((raw as ExportFile).profiles)) {
    throw new Error("Arquivo não é uma exportação do Desafio de Física.");
  }
  const incoming = (raw as ExportFile).profiles.filter(isProfile);
  if (!incoming.length) throw new Error("Nenhum perfil válido no arquivo.");
  const byKey = new Map(current.map((p) => [p.nickname.toLowerCase(), structuredClone(p)]));
  let added = 0;
  let updated = 0;
  for (const p of incoming) {
    const clean = { ...structuredClone(p), nickname: normalizeNickname(p.nickname) };
    const k = clean.nickname.toLowerCase();
    const have = byKey.get(k);
    if (!have) {
      byKey.set(k, clean);
      added++;
    } else if (clean.xp > have.xp) {
      byKey.set(k, clean);
      updated++;
    }
  }
  return { profiles: [...byKey.values()], added, updated };
}
