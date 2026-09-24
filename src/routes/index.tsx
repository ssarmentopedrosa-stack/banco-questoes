import { createFileRoute, Link } from "@tanstack/react-router";
import { KpiCard } from "@/components/banco/kpi-card";
import { DOMAIN_LABEL, domainLabel, kpis } from "@/lib/banco";
import { useBanco } from "@/lib/use-banco";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { data, error, loading } = useBanco();
  if (loading) return <p>Carregando banco auditado…</p>;
  if (error || !data) return <p role="alert">{error ?? "Dados indisponíveis."}</p>;
  const k = kpis(data);
  const cards = [
    ["Questões de Física", k.questions],
    ["Relações pedagógicas", k.relations],
    ["Confirmadas", k.confirmed],
    ["Candidatas", k.candidate],
    ["Questões em revisão", k.review],
    ["Clusters / domínios", k.domains],
  ] as const;
  const order = Object.keys(DOMAIN_LABEL);
  const groups = order.map((d) => {
    const qs = data.questions.filter((q) => q.domain === d);
    const contents = [...new Set(qs.map((q) => q.content).filter((c) => c && c !== "INDETERMINADO"))].slice(0, 4);
    return { d, n: qs.length, contents };
  });
  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm tracking-widest text-teal">CIÊNCIAS DA NATUREZA · 2024–2025</p>
        <h1 className="mt-2 font-serif text-4xl text-fg">Banco Inteligente de Física do ENEM</h1>
        <p className="mt-2 max-w-2xl text-mute">Base pedagógica verificável para análise, estudo e construção de avaliações.</p>
      </header>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(([label, value]) => (
          <KpiCard key={label} label={label} value={value} />
        ))}
      </section>
      <section>
        <h2 className="mb-3 font-serif text-2xl">Domínios</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <Link
              key={g.d}
              to="/questoes"
              search={{ dominio: g.d }}
              className="rounded-2xl border border-line bg-panel-2 p-4 hover:border-amber"
            >
              <h3 className="font-serif text-xl">{domainLabel(g.d)}</h3>
              <p className="text-sm text-mute">{g.n} questões</p>
              <p className="mt-2 text-sm">{g.contents.length ? g.contents.map((c) => c!.replaceAll("_", " ")).join(" · ") : "Em revisão"}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
