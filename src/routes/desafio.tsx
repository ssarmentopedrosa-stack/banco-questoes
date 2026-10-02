import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PlayerHud } from "@/components/desafio/hud";
import { ProfileGate } from "@/components/desafio/profile-gate";
import { QuestionPlay } from "@/components/desafio/question-play";
import { domainLabel } from "@/lib/banco";
import { describeAchievement } from "@/lib/gamificacao/achievements";
import { catalog, catalogById, type DesafioItem } from "@/lib/gamificacao/catalog";
import {
  dailyChallenge,
  dayKey,
  drawRound,
  eligible,
  hashString,
  levelFor,
  missionProgress,
  rng,
  ROUND_MAX,
  ROUND_MIN,
  wrongIds,
  type Demand,
  type Mission,
  type RoundResult,
} from "@/lib/gamificacao/engine";
import { allMissions, useDesafio } from "@/lib/gamificacao/use-desafio";

export const Route = createFileRoute("/desafio")({
  head: () => ({ meta: [{ title: "Desafio de Física — ENEM" }] }),
  component: DesafioPage,
});

type Mode = { kind: "menu" } | { kind: "play"; items: DesafioItem[]; label: string; daily: boolean } | { kind: "result"; result: RoundResult; label: string };

const DOMAINS = [...new Set(catalog.map((c) => c.domain))].filter((d) => d !== "INTERFACE_FISICA").sort();
const YEARS = [...new Set(catalog.map((c) => c.year))].sort();
const DEMANDS: { v: Demand; l: string }[] = [
  { v: "LOW", l: "Baixa" },
  { v: "MODERATE", l: "Média" },
  { v: "HIGH", l: "Alta" },
];

function Chip({ on, children, onClick }: { on: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className={`min-h-10 rounded-full border px-3 text-sm transition ${on ? "border-amber bg-amber text-ink" : "border-line bg-ink text-mute hover:text-fg"}`}>
      {children}
    </button>
  );
}

function toggle<T>(list: T[], v: T) {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

function DesafioPage() {
  return (
    <ProfileGate>
      <Desafio />
    </ProfileGate>
  );
}

function Desafio() {
  const d = useDesafio();
  const me = d.current!;
  const [mode, setMode] = useState<Mode>({ kind: "menu" });
  const [answers, setAnswers] = useState<{ item: DesafioItem; chosen: string }[]>([]);
  const [domains, setDomains] = useState<string[]>([]);
  const [years, setYears] = useState<string[]>([]);
  const [demands, setDemands] = useState<Demand[]>([]);
  const includeReview = d.settings.includeReview;
  const size = d.settings.roundSize;
  const today = dayKey(new Date());

  const filter = { domains, years, demands, includeReview };
  const pool = useMemo(() => eligible(catalog, { domains, years, demands, includeReview }), [domains, years, demands, includeReview]);
  const daily = useMemo(() => dailyChallenge(catalog, today), [today]);
  const dailyDone = me.dailyDone.includes(today);
  const wrong = wrongIds(me)
    .map((id) => catalogById.get(id))
    .filter((x): x is DesafioItem => !!x && !x.annulled && !!x.answer && (includeReview || !x.reviewRequired));
  const missions = useMemo(() => roundRobin(allMissions(includeReview)), [includeReview]);

  const start = (items: DesafioItem[], label: string, isDaily = false) => {
    if (!items.length) return;
    setAnswers([]);
    setMode({ kind: "play", items, label, daily: isDaily });
    window.scrollTo({ top: 0 });
  };

  if (mode.kind === "play") {
    const i = answers.length;
    const item = mode.items[i];
    let streak = 0;
    for (let k = answers.length - 1; k >= 0 && answers[k].chosen === answers[k].item.answer; k--) streak++;
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-amber">{mode.label}</p>
          <button type="button" onClick={() => setMode({ kind: "menu" })} className="min-h-10 rounded-lg border border-line px-3 text-sm text-mute">
            Sair
          </button>
        </div>
        <QuestionPlay
          key={`${item.id}-${i}`}
          item={item}
          index={i}
          total={mode.items.length}
          streak={streak}
          onDone={(chosen) => {
            const next = [...answers, { item, chosen }];
            if (next.length < mode.items.length) {
              setAnswers(next);
              window.scrollTo({ top: 0, behavior: "smooth" });
              return;
            }
            const result = d.finishRound(next.map((a) => ({ question: a.item, chosen: a.chosen })), mode.daily);
            if (result) setMode({ kind: "result", result, label: mode.label });
            window.scrollTo({ top: 0 });
          }}
        />
      </div>
    );
  }

  if (mode.kind === "result") {
    const r = mode.result;
    const lv = levelFor(r.profile.xp).level;
    return (
      <div className="mx-auto max-w-xl space-y-4 text-center">
        <div className="rounded-3xl border border-line bg-gradient-to-b from-panel-2 to-panel p-6 shadow-xl shadow-black/30">
          <p className="text-sm text-mute">{mode.label}</p>
          <p className="mt-2 text-6xl font-bold text-fg">
            {r.correct}/{r.total}
          </p>
          <p className="text-mute">acertos</p>
          <p className="mt-4 text-3xl font-bold text-amber">+{r.xpGained} XP</p>
          {r.leveledUp && (
            <p className="mt-3 animate-pulse rounded-xl bg-amber/20 p-3 font-semibold text-amber">
              Subiu de nível! Agora você é {lv.emoji} {lv.name}
            </p>
          )}
        </div>
        {r.newAchievements.length > 0 && (
          <div className="rounded-2xl border border-teal bg-teal/10 p-4 text-left">
            <p className="font-semibold text-teal">Novas medalhas</p>
            <ul className="mt-2 space-y-2">
              {r.newAchievements.map((id) => {
                const a = describeAchievement(id);
                return (
                  <li key={id} className="flex items-center gap-3">
                    <span className="text-2xl" aria-hidden>
                      {a.icon}
                    </span>
                    <span>
                      <strong>{a.title}</strong>
                      <span className="block text-sm text-mute">{a.description}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        <div className="grid gap-2 sm:grid-cols-2">
          <button type="button" onClick={() => setMode({ kind: "menu" })} className="min-h-12 rounded-xl bg-amber font-semibold text-ink">
            Jogar de novo
          </button>
          <Link to="/perfil" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-line">
            Ver perfil
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PlayerHud p={me} />

      <section className="relative overflow-hidden rounded-3xl border border-amber/60 bg-gradient-to-br from-amber/20 via-panel to-panel p-5">
        <p className="text-xs font-semibold tracking-widest text-amber">DESAFIO DO DIA · {today.split("-").reverse().join("/")}</p>
        <h2 className="mt-1 font-serif text-2xl">5 questões, as mesmas para toda a turma</h2>
        <p className="mt-1 text-sm text-mute">Compare com os colegas: hoje todo mundo recebe a mesma rodada.</p>
        <button type="button" disabled={dailyDone || !daily.length} onClick={() => start(daily, "Desafio do dia", true)} className="mt-4 min-h-12 w-full rounded-xl bg-amber px-6 font-semibold text-ink disabled:opacity-50 sm:w-auto">
          {dailyDone ? "✓ Concluído hoje — volte amanhã" : "Começar desafio do dia"}
        </button>
      </section>

      <section className="space-y-4 rounded-3xl border border-line bg-panel p-5">
        <h2 className="font-serif text-2xl">Rodada livre</h2>
        <div>
          <p className="mb-2 text-sm text-mute">Domínio</p>
          <div className="flex flex-wrap gap-2">
            {DOMAINS.map((x) => (
              <Chip key={x} on={domains.includes(x)} onClick={() => setDomains(toggle(domains, x))}>
                {domainLabel(x)}
              </Chip>
            ))}
            {includeReview && (
              <Chip on={domains.includes("INTERFACE_FISICA")} onClick={() => setDomains(toggle(domains, "INTERFACE_FISICA"))}>
                Interface
              </Chip>
            )}
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm text-mute">Ano</p>
          <div className="flex flex-wrap gap-2">
            {YEARS.map((x) => (
              <Chip key={x} on={years.includes(x)} onClick={() => setYears(toggle(years, x))}>
                {x}
              </Chip>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm text-mute">Dificuldade (demanda estrutural)</p>
          <div className="flex flex-wrap gap-2">
            {DEMANDS.map((x) => (
              <Chip key={x.v} on={demands.includes(x.v)} onClick={() => setDemands(toggle(demands, x.v))}>
                {x.l}
              </Chip>
            ))}
          </div>
        </div>
        <label className="block">
          <span className="text-sm text-mute">
            Questões por rodada: <strong className="text-fg">{size}</strong>
          </span>
          <input type="range" min={ROUND_MIN} max={ROUND_MAX} value={size} onChange={(e) => d.setSettings({ roundSize: Number(e.target.value) })} className="mt-2 w-full accent-[var(--color-amber)]" />
        </label>
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input type="checkbox" checked={includeReview} onChange={(e) => d.setSettings({ includeReview: e.target.checked })} className="h-5 w-5 accent-[var(--color-amber)]" />
          Incluir questões marcadas “precisa revisão” (ex.: 2021, texto por OCR)
        </label>
        <p className="text-sm text-mute">
          {pool.length} questões disponíveis com esses filtros{!includeReview && years.includes("2021") ? " — as de 2021 estão em revisão; marque a opção acima para incluí-las" : ""}.
        </p>
        <button
          type="button"
          disabled={pool.length === 0}
          onClick={() => start(drawRound(catalog, filter, size, rng(hashString(`${Date.now()}-${me.nickname}`))), "Rodada livre")}
          className="min-h-12 w-full rounded-xl bg-teal font-semibold text-ink disabled:opacity-40"
        >
          Sortear {Math.min(size, pool.length)} questões
        </button>
      </section>

      <section className="rounded-3xl border border-line bg-panel p-5">
        <h2 className="font-serif text-2xl">Revisar erradas</h2>
        <p className="mt-1 text-sm text-mute">{wrong.length ? `${wrong.length} questão(ões) com última resposta errada.` : "Nenhuma questão errada para revisar. 👏"}</p>
        <button type="button" disabled={!wrong.length} onClick={() => start(wrong.slice(0, ROUND_MAX), "Revisão das erradas")} className="mt-3 min-h-12 w-full rounded-xl border border-rose px-4 font-semibold text-rose disabled:opacity-40 sm:w-auto">
          Revisar {Math.min(wrong.length, ROUND_MAX)} agora
        </button>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="font-serif text-2xl">Missões</h2>
          <p className="text-sm text-mute">Caminhos de estudo do banco: acerte todas as questões da trilha para completar a missão.</p>
        </div>
        <ul className="grid gap-3 md:grid-cols-2">
          {missions.slice(0, 12).map((m) => (
            <MissionCard key={m.id} m={m} onPlay={() => start(m.nodes.map((n) => catalogById.get(n)!).filter(Boolean), `Missão · ${domainLabel(m.domain)}`)} />
          ))}
        </ul>
      </section>
    </div>
  );
}

/** Alterna domínios para a lista de missões não ficar toda num só tema. */
function roundRobin(ms: Mission[]): Mission[] {
  const by = new Map<string, Mission[]>();
  for (const m of ms) by.set(m.domain, [...(by.get(m.domain) ?? []), m]);
  const queues = [...by.values()];
  const out: Mission[] = [];
  while (queues.some((q) => q.length)) for (const q of queues) if (q.length) out.push(q.shift()!);
  return out;
}

function human(s: string) {
  return s.replaceAll("_", " ").toLowerCase().replace(/^./, (c) => c.toUpperCase());
}

function MissionCard({ m, onPlay }: { m: Mission; onPlay: () => void }) {
  const d = useDesafio();
  const pr = missionProgress(d.current!, m);
  const topics = [...new Set(m.nodes.map((n) => catalogById.get(n)?.question.content).filter((c): c is string => !!c && c !== "INDETERMINADO"))];
  return (
    <li className={`rounded-2xl border p-4 ${pr.complete ? "border-teal bg-teal/10" : "border-line bg-panel"}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-amber">{domainLabel(m.domain)}</p>
          <p className="font-semibold">{topics.length ? topics.map(human).join(" → ") : "Trilha de estudo"}</p>
        </div>
        <span className="text-sm text-mute">{pr.complete ? "✓ Completa" : `${pr.done}/${pr.total}`}</span>
      </div>
      <ol className="mt-2 flex flex-wrap items-center gap-1 text-xs text-mute">
        {m.nodes.map((n, i) => (
          <li key={n} className="flex items-center gap-1">
            {i > 0 && <span aria-hidden>→</span>}
            <span className={`rounded-full border px-2 py-0.5 ${d.current!.everCorrect.includes(n) ? "border-teal text-teal" : "border-line"}`}>{catalogById.get(n)?.year} Q{n.match(/Q(\d+)$/)?.[1] ?? n.split("-").pop()}</span>
          </li>
        ))}
      </ol>
      <button type="button" onClick={onPlay} className="mt-3 min-h-11 w-full rounded-xl border border-amber text-sm font-semibold text-amber">
        {pr.complete ? "Jogar de novo" : "Iniciar missão"}
      </button>
    </li>
  );
}
