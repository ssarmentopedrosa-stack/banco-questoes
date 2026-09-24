import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Legend } from "@/components/banco/legend";

const LINKS = [
  { to: "/", label: "Painel" },
  { to: "/questoes", label: "Questões" },
  { to: "/mapa", label: "Mapa" },
] as const;

export function Shell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-panel/90">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <Link to="/" className="font-serif text-lg font-semibold tracking-tight text-fg">
            Banco de Física · ENEM
          </Link>
          <nav aria-label="Principal" className="flex gap-2">
            {LINKS.map((l) => {
              const active = l.to === "/" ? path === "/" : path.startsWith(l.to);
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  className={`min-h-11 rounded-full px-4 py-2 text-sm ${active ? "bg-amber text-ink" : "text-mute hover:text-fg"}`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      <footer className="mx-auto max-w-6xl px-4 pb-8">
        <Legend />
        <p className="mt-3 text-xs text-mute">
          Demanda estrutural, não dificuldade empírica e não TRI. Caminhos são relações possíveis, não ordem obrigatória de estudo.
        </p>
      </footer>
    </div>
  );
}
