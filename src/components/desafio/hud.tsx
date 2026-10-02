import { Link } from "@tanstack/react-router";
import { dayKey, levelFor, visibleDayStreak, type PlayerProfile } from "@/lib/gamificacao/engine";

export function XpBar({ xp }: { xp: number }) {
  const { level, next, progress } = levelFor(xp);
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs text-mute">
        <span>
          {level.emoji} {level.name}
        </span>
        <span>{next ? `${xp - level.minXp}/${next.minXp - level.minXp} XP até ${next.name}` : "Nível máximo"}</span>
      </div>
      <div className="mt-1 h-3 overflow-hidden rounded-full bg-ink" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} aria-label="Progresso de nível">
        <div className="h-full rounded-full bg-gradient-to-r from-teal to-amber transition-all duration-700" style={{ width: `${Math.round(progress * 100)}%` }} />
      </div>
    </div>
  );
}

export function PlayerHud({ p }: { p: PlayerProfile }) {
  const { level } = levelFor(p.xp);
  const streak = visibleDayStreak(p.lastPlayedDay, p.dayStreak, dayKey(new Date()));
  return (
    <section className="rounded-2xl border border-line bg-gradient-to-br from-panel to-panel-2 p-4 shadow-lg shadow-black/20">
      <div className="flex items-center gap-3">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-ink text-3xl" aria-hidden>
          {level.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-fg">{p.nickname}</p>
          <p className="text-sm text-amber">
            Nível {level.index + 1} · {level.name}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-fg">{p.xp}</p>
          <p className="text-xs text-mute">XP</p>
        </div>
        <div className="text-right" title="Dias seguidos jogando">
          <p className="text-2xl font-bold text-rose">🔥{streak}</p>
          <p className="text-xs text-mute">dias</p>
        </div>
      </div>
      <div className="mt-3">
        <XpBar xp={p.xp} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <Link to="/perfil" className="inline-flex min-h-9 items-center rounded-full border border-line px-3 text-mute hover:text-fg">
          Meu perfil e medalhas
        </Link>
      </div>
    </section>
  );
}
