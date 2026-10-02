import { useState, type ReactNode } from "react";
import { levelFor } from "@/lib/gamificacao/engine";
import { useDesafio } from "@/lib/gamificacao/use-desafio";

/** Escolha/criação de apelido local. Vários alunos podem usar o mesmo aparelho. */
export function ProfileGate({ children }: { children: ReactNode }) {
  const d = useDesafio();
  const [nick, setNick] = useState("");
  const [err, setErr] = useState<string | null>(null);
  if (!d.hydrated) return <p className="text-mute">Carregando seu progresso…</p>;
  if (d.current) return <>{children}</>;
  return (
    <section className="mx-auto max-w-md space-y-4 rounded-3xl border border-line bg-gradient-to-b from-panel-2 to-panel p-6 text-center shadow-xl shadow-black/30">
      <p className="text-5xl" aria-hidden>
        ⚛
      </p>
      <h1 className="font-serif text-3xl">Desafio de Física</h1>
      <p className="text-mute">Questões oficiais do ENEM. Ganhe XP, suba de nível e colecione medalhas.</p>
      {d.profiles.length > 0 && (
        <div className="space-y-2 text-left">
          <p className="text-sm text-mute">Quem vai jogar?</p>
          <ul className="grid gap-2">
            {d.profiles.map((p) => (
              <li key={p.nickname}>
                <button type="button" onClick={() => d.selectProfile(p.nickname)} className="flex min-h-12 w-full items-center justify-between rounded-xl border border-line bg-ink px-4 text-left hover:border-amber">
                  <span className="font-medium">{p.nickname}</span>
                  <span className="text-sm text-amber">
                    {levelFor(p.xp).level.emoji} {levelFor(p.xp).level.name} · {p.xp} XP
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <form
        className="space-y-2 text-left"
        onSubmit={(e) => {
          e.preventDefault();
          setErr(d.createProfile(nick));
        }}
      >
        <label className="block text-sm text-mute" htmlFor="apelido">
          {d.profiles.length ? "Ou crie um novo apelido" : "Escolha um apelido"}
        </label>
        <div className="flex gap-2">
          <input id="apelido" value={nick} onChange={(e) => setNick(e.target.value)} maxLength={24} placeholder="Ex.: Newton da 3ª A" className="min-h-12 min-w-0 flex-1 rounded-xl border border-line bg-ink px-3 text-fg" autoComplete="off" />
          <button type="submit" className="min-h-12 rounded-xl bg-amber px-4 font-semibold text-ink">
            Entrar
          </button>
        </div>
        {err && <p role="alert" className="text-sm text-rose">{err}</p>}
        <p className="text-xs text-mute">Use só um apelido (sem nome completo). O progresso fica salvo neste aparelho.</p>
      </form>
    </section>
  );
}
