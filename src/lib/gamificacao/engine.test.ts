import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  applyRound,
  dailyChallenge,
  dayKey,
  drawRound,
  eligible,
  exportProfiles,
  importProfiles,
  levelFor,
  LEVELS,
  missionsFromPaths,
  newProfile,
  nextDayStreak,
  normalizeNickname,
  rng,
  visibleDayStreak,
  wrongIds,
  xpForAnswer,
  type Demand,
  type PlayableQuestion,
} from "./engine.ts";
import { emptyState, parseState } from "./storage.ts";

function q(id: string, over: Partial<PlayableQuestion> = {}): PlayableQuestion {
  return { id, year: "2024", domain: "MECANICA", demand: "LOW", answer: "A", annulled: false, reviewRequired: false, ...over };
}

const POOL: PlayableQuestion[] = [
  ...Array.from({ length: 12 }, (_, i) => q(`ok-${i}`, { domain: i % 2 ? "MECANICA" : "ELETRICIDADE", demand: (["LOW", "MODERATE", "HIGH"] as Demand[])[i % 3], year: i < 6 ? "2023" : "2024" })),
  q("anulada", { annulled: true }),
  q("sem-gabarito", { answer: null }),
  q("revisao-1", { reviewRequired: true }),
  q("revisao-2", { reviewRequired: true, year: "2021" }),
];

describe("XP", () => {
  it("erro vale 0; acerto base 10 com bônus de demanda", () => {
    assert.equal(xpForAnswer(false, "HIGH", 5), 0);
    assert.equal(xpForAnswer(true, "LOW", 0), 10);
    assert.equal(xpForAnswer(true, "MODERATE", 0), 15);
    assert.equal(xpForAnswer(true, "HIGH", 0), 20);
    assert.equal(xpForAnswer(true, null, 0), 10);
  });
  it("bônus de sequência cresce 2 por acerto anterior e trava em 10", () => {
    assert.equal(xpForAnswer(true, "LOW", 1), 12);
    assert.equal(xpForAnswer(true, "LOW", 3), 16);
    assert.equal(xpForAnswer(true, "LOW", 5), 20);
    assert.equal(xpForAnswer(true, "LOW", 50), 20);
  });
});

describe("níveis", () => {
  it("vai de Partícula a Galáxia com limites crescentes", () => {
    assert.equal(LEVELS[0].name, "Partícula");
    assert.equal(LEVELS.at(-1)!.name, "Galáxia");
    for (let i = 1; i < LEVELS.length; i++) assert.ok(LEVELS[i].minXp > LEVELS[i - 1].minXp);
  });
  it("levelFor respeita os limites e o progresso", () => {
    assert.equal(levelFor(0).level.name, "Partícula");
    assert.equal(levelFor(99).level.name, "Partícula");
    assert.equal(levelFor(100).level.name, "Átomo");
    assert.equal(levelFor(175).progress, 0.5);
    const top = levelFor(999999);
    assert.equal(top.level.name, "Galáxia");
    assert.equal(top.next, null);
    assert.equal(top.progress, 1);
  });
});

describe("streak diário", () => {
  it("dayKey usa a data local AAAA-MM-DD", () => {
    assert.equal(dayKey(new Date(2026, 0, 5, 23, 59)), "2026-01-05");
  });
  it("mesmo dia mantém, dia seguinte soma, lacuna reinicia", () => {
    assert.equal(nextDayStreak(null, 0, "2026-10-02"), 1);
    assert.equal(nextDayStreak("2026-10-02", 3, "2026-10-02"), 3);
    assert.equal(nextDayStreak("2026-10-01", 3, "2026-10-02"), 4);
    assert.equal(nextDayStreak("2026-09-30", 3, "2026-10-02"), 1);
    assert.equal(nextDayStreak("2026-02-28", 2, "2026-03-01"), 3);
    assert.equal(nextDayStreak("2025-12-31", 9, "2026-01-01"), 10);
  });
  it("streak exibido zera se passou mais de um dia", () => {
    assert.equal(visibleDayStreak("2026-10-01", 4, "2026-10-02"), 4);
    assert.equal(visibleDayStreak("2026-09-29", 4, "2026-10-02"), 0);
    assert.equal(visibleDayStreak(null, 0, "2026-10-02"), 0);
  });
});

describe("sorteio", () => {
  it("nunca inclui anuladas nem sem gabarito; revisão só com toggle", () => {
    const ids = eligible(POOL).map((x) => x.id);
    assert.ok(!ids.includes("anulada") && !ids.includes("sem-gabarito"));
    assert.ok(!ids.includes("revisao-1"));
    const withReview = eligible(POOL, { includeReview: true }).map((x) => x.id);
    assert.ok(withReview.includes("revisao-1") && withReview.includes("revisao-2"));
    assert.ok(!withReview.includes("anulada"));
  });
  it("filtra por domínio, ano e demanda", () => {
    const r = eligible(POOL, { domains: ["MECANICA"], years: ["2024"], demands: ["HIGH"] });
    assert.ok(r.length > 0);
    for (const x of r) assert.ok(x.domain === "MECANICA" && x.year === "2024" && x.demand === "HIGH");
  });
  it("rodada tem 5–10 questões sem repetição e é reproduzível pela semente", () => {
    for (let s = 0; s < 50; s++) {
      const r = drawRound(POOL, { includeReview: true }, 8, rng(s));
      assert.equal(r.length, 8);
      assert.equal(new Set(r.map((x) => x.id)).size, 8);
      assert.ok(r.every((x) => !x.annulled && x.answer));
    }
    assert.equal(drawRound(POOL, {}, 2, rng(1)).length, 5);
    assert.equal(drawRound(POOL, {}, 30, rng(1)).length, 10);
    assert.deepEqual(drawRound(POOL, {}, 6, rng(7)), drawRound(POOL, {}, 6, rng(7)));
  });
});

describe("desafio do dia", () => {
  it("é determinístico pela data e independe da ordem de entrada", () => {
    const a = dailyChallenge(POOL, "2026-10-02").map((x) => x.id);
    const b = dailyChallenge([...POOL].reverse(), "2026-10-02").map((x) => x.id);
    assert.deepEqual(a, b);
    assert.equal(a.length, 5);
  });
  it("muda entre datas e nunca usa anuladas ou em revisão", () => {
    const days = ["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"].map((d) => dailyChallenge(POOL, d).map((x) => x.id).join());
    assert.ok(new Set(days).size > 1);
    for (let i = 1; i <= 60; i++) {
      const day = `2026-${String(Math.ceil(i / 28)).padStart(2, "0")}-${String(((i - 1) % 28) + 1).padStart(2, "0")}`;
      for (const x of dailyChallenge(POOL, day)) assert.ok(!x.annulled && !x.reviewRequired && x.answer);
    }
  });
});

describe("applyRound", () => {
  const now = new Date(2026, 9, 2, 10);
  it("soma XP, atualiza streaks, registra erradas e conquistas", () => {
    const p0 = newProfile("Ana", now);
    const round = POOL.slice(0, 5).map((question, i) => ({ question, chosen: i === 4 ? "B" : "A" }));
    const r = applyRound(p0, round, { now, isDaily: true, allQuestions: POOL });
    // 4 acertos seguidos (demandas LOW, MODERATE, HIGH, LOW) e 1 erro
    assert.deepEqual(r.perAnswerXp, [10, 15 + 2, 20 + 4, 10 + 6, 0]);
    assert.equal(r.xpGained, 67);
    assert.equal(r.profile.xp, 67);
    assert.equal(r.correct, 4);
    assert.equal(r.profile.bestAnswerStreak, 4);
    assert.equal(r.profile.dayStreak, 1);
    assert.ok(r.profile.dailyDone.includes("2026-10-02"));
    assert.deepEqual(wrongIds(r.profile), ["ok-4"]);
    assert.ok(r.newAchievements.includes("primeira-rodada"));
    assert.ok(r.newAchievements.includes("desafio-do-dia"));
    assert.equal(p0.xp, 0, "perfil original não é alterado");
    const tomorrow = new Date(2026, 9, 3, 9);
    const r2 = applyRound(r.profile, [{ question: POOL[4], chosen: "A" }], { now: tomorrow, isDaily: false, allQuestions: POOL });
    assert.equal(r2.profile.dayStreak, 2);
    assert.deepEqual(wrongIds(r2.profile), []);
    assert.ok(!r2.newAchievements.includes("primeira-rodada"));
  });
  it("sobe de nível ao cruzar o limite", () => {
    const p = { ...newProfile("Bia", now), xp: 95 };
    const r = applyRound(p, [{ question: POOL[0], chosen: "A" }], { now, isDaily: false, allQuestions: POOL });
    assert.equal(r.leveledUp, true);
    assert.equal(levelFor(r.profile.xp).level.name, "Átomo");
  });
});

describe("perfis, exportação e importação", () => {
  const now = new Date(2026, 9, 2);
  it("normaliza apelido", () => {
    assert.equal(normalizeNickname("  Newton   da  3ª A "), "Newton da 3ª A");
    assert.equal(normalizeNickname("x".repeat(40)).length, 24);
  });
  it("une por apelido (sem diferenciar maiúsculas) mantendo o maior XP", () => {
    const a = { ...newProfile("Ana", now), xp: 50 };
    const b = { ...newProfile("Caio", now), xp: 10 };
    const file = JSON.parse(JSON.stringify(exportProfiles([{ ...a, nickname: "ANA", xp: 80 }, { ...newProfile("Davi", now), xp: 5 }], now)));
    const r = importProfiles([a, b], file);
    assert.equal(r.added, 1);
    assert.equal(r.updated, 1);
    assert.equal(r.profiles.find((p) => p.nickname.toLowerCase() === "ana")!.xp, 80);
    assert.equal(r.profiles.length, 3);
    const r2 = importProfiles([{ ...a, xp: 999 }], file);
    assert.equal(r2.profiles.find((p) => p.nickname.toLowerCase() === "ana")!.xp, 999);
  });
  it("rejeita arquivo inválido", () => {
    assert.throws(() => importProfiles([], { kind: "outro" }));
    assert.throws(() => importProfiles([], null));
  });
  it("parseState tolera lixo e versões desconhecidas", () => {
    assert.deepEqual(parseState(null), emptyState());
    assert.deepEqual(parseState("{não é json"), emptyState());
    assert.deepEqual(parseState(JSON.stringify({ version: 99 })), emptyState());
  });
});

describe("dados reais do banco", () => {
  type V = { answer: string | null; answer_status: string };
  const banco = JSON.parse(readFileSync(new URL("../../../public/banco.json", import.meta.url), "utf8")) as {
    questions: { id: string; year: string; domain: string; demand: string; review_required?: boolean }[];
    paths: unknown;
  };
  const oficial = JSON.parse(readFileSync(new URL("../../../public/oficial-view.json", import.meta.url), "utf8")) as Record<string, { variants: V[] }>;
  const playable: PlayableQuestion[] = banco.questions.map((x) => {
    const vs = oficial[x.id]?.variants ?? [];
    const v = vs.find((y) => y.answer_status === "official" && y.answer);
    return {
      id: x.id,
      year: String(x.year),
      domain: x.domain ?? "INTERFACE_FISICA",
      demand: (["LOW", "MODERATE", "HIGH"].includes(x.demand) ? x.demand : null) as Demand | null,
      answer: v?.answer ?? null,
      annulled: vs.some((y) => y.answer_status === "annulled"),
      reviewRequired: Boolean(x.review_required) || x.domain === "INTERFACE_FISICA",
    };
  });
  const annulled = new Set(playable.filter((x) => x.annulled).map((x) => x.id));

  it("o banco tem anuladas, e nenhuma é elegível nem sai no desafio do dia", () => {
    assert.ok(annulled.size > 0);
    for (const inc of [false, true]) for (const x of eligible(playable, { includeReview: inc })) assert.ok(!annulled.has(x.id));
    for (let d = 1; d <= 31; d++) {
      const day = dailyChallenge(playable, `2026-10-${String(d).padStart(2, "0")}`);
      assert.equal(day.length, 5);
      for (const x of day) assert.ok(!annulled.has(x.id) && !x.reviewRequired);
    }
  });
  it("há questões suficientes para rodadas e missões", () => {
    assert.ok(eligible(playable).length >= 10);
    const ms = missionsFromPaths(banco.paths as Parameters<typeof missionsFromPaths>[0], playable, { includeReview: false });
    for (const m of ms) for (const id of m.nodes) assert.ok(!annulled.has(id));
  });
});

describe("texto do enunciado no jogo", async () => {
  const { altsLookTruncated, cleanText, stemOnly } = await import("./text.ts");
  it("remove cabeçalho, alternativas finais e marca d'água", () => {
    const st = "QUESTÃO 91\nUm carro anda.\nMENE4202MENE4202MENE4202MENE4202\nQual a velocidade?\nA 3,0 m/s.\nB 4,5 m/s.\nC 6 m/s.\nD 8 m/s.\nE 9 m/s.";
    assert.equal(stemOnly(st, "3,0 m/s."), "Um carro anda.\nQual a velocidade?");
    assert.equal(cleanText("a\nMENE4202MENE4202MENE4202\nb"), "a\nb");
  });
  it("sinaliza alternativas possivelmente cortadas", () => {
    assert.equal(altsLookTruncated(["a temperatura é maior que a de", "ok."]), true);
    assert.equal(altsLookTruncated(["3,0 m.", "4,5 m."]), false);
  });
});
