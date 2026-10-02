import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { XpBar } from "@/components/desafio/hud";
import { ProfileGate } from "@/components/desafio/profile-gate";
import { domainLabel } from "@/lib/banco";
import { describeAchievement } from "@/lib/gamificacao/achievements";
import { catalog } from "@/lib/gamificacao/catalog";
import { DOMAIN_TIERS, GENERAL_ACHIEVEMENTS, dayKey, domainStats, levelFor, LEVELS, ranking, visibleDayStreak } from "@/lib/gamificacao/engine";
import { useDesafio } from "@/lib/gamificacao/use-desafio";

export const Route = createFileRoute("/perfil")({
  head: () => ({ meta: [{ title: "Meu perfil — Desafio de Física" }] }),
  component: () => (
    <ProfileGate>
      <Perfil />
    </ProfileGate>
  ),
});

function Medal({ id, owned }: { id: string; owned: boolean }) {
  const a = describeAchievement(id);
  return (
    <li title={a.description} className={`flex items-center gap-3 rounded-xl border p-3 ${owned ? "border-amber/60 bg-amber/10" : "border-line bg-ink opacity-50 grayscale"}`}>
      <span className="text-2xl" aria-hidden>
        {owned ? a.icon : "🔒"}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{a.title}</span>
        <span className="block text-xs text-mute">{a.description}</span>
      </span>
      <span className="sr-only">{owned ? "conquistada" : "bloqueada"}</span>
    </li>
  );
}

/** Mostra as conquistadas e as próximas bloqueadas; o restante fica recolhido (lista longa no celular). */
function MedalGroup({ ids, owned }: { ids: string[]; owned: Set<string> }) {
  const got = ids.filter((id) => owned.has(id));
  const locked = ids.filter((id) => !owned.has(id));
  const shown = locked.slice(0, Math.max(2, 4 - got.length));
  const rest = locked.slice(shown.length);
  return (
    <>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {[...got, ...shown].map((id) => (
          <Medal key={id} id={id} owned={owned.has(id)} />
        ))}
      </ul>
      {rest.length > 0 && (
        <details className="mt-2">
          <summary className="min-h-10 cursor-pointer py-2 text-sm text-mute">Ver mais {rest.length} medalhas bloqueadas</summary>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((id) => (
              <Medal key={id} id={id} owned={false} />
            ))}
          </ul>
        </details>
      )}
    </>
  );
}

function Perfil() {
  const d = useDesafio();
  const me = d.current!;
  const today = dayKey(new Date());
  const { level } = levelFor(me.xp);
  const stats = useMemo(() => domainStats(me, catalog, d.settings.includeReview), [me, d.settings.includeReview]);
  const rows = ranking(d.profiles, today);
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const owned = new Set(me.achievements);
  const correctTotal = me.everCorrect.length;
  const answered = Object.keys(me.last).length;

  const domainIds = stats.map((s) => s.domain).flatMap((dom) => DOMAIN_TIERS.map((t) => `dominio:${dom}:${t.tier}`));
  const years = [...new Set(catalog.filter((c) => !c.annulled && c.answer && !c.reviewRequired).map((c) => c.year))].sort();
  const yearIds = years.flatMap((y) => [`ano:${y}:explorador`, `ano:${y}:completo`]);

  const download = () => {
    const blob = new Blob([d.exportJson()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `desafio-fisica-${today}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-line bg-gradient-to-br from-panel-2 via-panel to-panel p-5 shadow-xl shadow-black/30">
        <div className="flex flex-wrap items-center gap-4">
          <div className="grid h-20 w-20 place-items-center rounded-3xl bg-ink text-5xl" aria-hidden>
            {level.emoji}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-serif text-3xl">{me.nickname}</h1>
            <p className="text-amber">
              Nível {level.index + 1} de {LEVELS.length} · {level.name}
            </p>
            <p className="text-sm text-mute">{level.blurb}</p>
          </div>
        </div>
        <div className="mt-4">
          <XpBar xp={me.xp} />
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["XP total", me.xp],
            ["🔥 Dias seguidos", visibleDayStreak(me.lastPlayedDay, me.dayStreak, today)],
            ["Melhor sequência", me.bestAnswerStreak],
            ["Questões acertadas", `${correctTotal}/${answered}`],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl bg-ink p-3">
              <dt className="text-xs text-mute">{k}</dt>
              <dd className="text-2xl font-bold">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to="/desafio" className="inline-flex min-h-11 items-center rounded-xl bg-amber px-4 font-semibold text-ink">
            Jogar agora
          </Link>
          <button type="button" onClick={() => d.selectProfile(null)} className="min-h-11 rounded-xl border border-line px-4 text-sm">
            Trocar de aluno
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-2xl">Desempenho por domínio</h2>
        <ul className="space-y-3 rounded-3xl border border-line bg-panel p-4">
          {stats.map((s) => {
            const pct = s.answered ? Math.round((s.correct / s.answered) * 100) : 0;
            const mastery = s.total ? Math.round((s.mastered / s.total) * 100) : 0;
            return (
              <li key={s.domain}>
                <div className="flex justify-between gap-2 text-sm">
                  <span className="font-medium">{domainLabel(s.domain)}</span>
                  <span className="text-mute">{s.answered ? `${pct}% de acerto · ${s.mastered}/${s.total} dominadas` : `0/${s.total} — ainda não jogou`}</span>
                </div>
                <div className="mt-1 h-3 overflow-hidden rounded-full bg-ink" aria-hidden>
                  <div className="h-full rounded-full bg-gradient-to-r from-teal to-amber" style={{ width: `${mastery}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-2xl">
          Medalhas <span className="text-base text-mute">({me.achievements.length} de {GENERAL_ACHIEVEMENTS.length + domainIds.length + yearIds.length})</span>
        </h2>
        {[
          ["Gerais", GENERAL_ACHIEVEMENTS.map((a) => a.id)],
          ["Por domínio", domainIds],
          ["Por ano do ENEM", yearIds],
        ].map(([title, ids]) => (
          <div key={title as string}>
            <h3 className="mb-2 text-sm text-mute">{title as string}</h3>
            <MedalGroup ids={ids as string[]} owned={owned} />
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-2xl">Ranking deste aparelho</h2>
        <ol className="space-y-2 rounded-3xl border border-line bg-panel p-4">
          {rows.map((r, i) => (
            <li key={r.nickname} className={`flex items-center gap-3 rounded-xl p-2 ${r.nickname === me.nickname ? "bg-amber/10" : ""}`}>
              <span className="w-8 text-center text-xl">{["🥇", "🥈", "🥉"][i] ?? i + 1}</span>
              <span className="min-w-0 flex-1 truncate font-medium">{r.nickname}</span>
              <span className="hidden text-sm text-mute sm:inline">{r.level}</span>
              <span className="text-sm text-rose">🔥{r.dayStreak}</span>
              <span className="w-20 text-right font-bold text-amber">{r.xp} XP</span>
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={download} className="min-h-11 rounded-xl border border-teal px-4 text-sm text-teal">
            Exportar progresso (JSON)
          </button>
          <button type="button" onClick={() => fileRef.current?.click()} className="min-h-11 rounded-xl border border-line px-4 text-sm">
            Importar progresso
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              try {
                const r = d.importJson(await f.text());
                setMsg(`Importado: ${r.added} novo(s), ${r.updated} atualizado(s).`);
              } catch (err) {
                setMsg(`Arquivo inválido: ${err instanceof Error ? err.message : "erro desconhecido"}`);
              }
            }}
          />
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Apagar o perfil “${me.nickname}” deste aparelho? Exporte antes se quiser guardar.`)) d.removeProfile(me.nickname);
            }}
            className="min-h-11 rounded-xl border border-rose px-4 text-sm text-rose"
          >
            Remover perfil
          </button>
        </div>
        {msg && (
          <p role="status" className="text-sm text-mute">
            {msg}
          </p>
        )}
        <p className="text-xs text-mute">O progresso fica só neste navegador. Para juntar a turma, exporte em cada aparelho e importe em um só (o maior XP de cada apelido é mantido).</p>
      </section>
    </div>
  );
}
