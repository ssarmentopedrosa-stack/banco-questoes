import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { GraphView } from "@/components/banco/graph-view";
import { StatusBadge } from "@/components/banco/status-badge";
import { domainLabel } from "@/lib/banco";
import { useBanco } from "@/lib/use-banco";

export const Route = createFileRoute("/mapa")({ component: Mapa });

function Mapa() {
  const { data, error, loading } = useBanco();
  const nav = useNavigate();
  const [domain, setDomain] = useState("");
  const [rel, setRel] = useState("");
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const domains = useMemo(() => [...new Set(data?.questions.map((q) => q.domain || "") ?? [])].filter(Boolean).sort(), [data]);
  const types = useMemo(() => [...new Set(data?.learningEdges.map((e) => e.type) ?? [])].sort(), [data]);

  const questions = useMemo(() => {
    if (!data) return [];
    return domain ? data.questions.filter((q) => q.domain === domain) : data.questions;
  }, [data, domain]);

  const allowed = useMemo(() => new Set(questions.map((q) => q.id)), [questions]);

  const edges = useMemo(() => {
    if (!data) return [];
    return data.learningEdges.filter((e) => {
      if (!allowed.has(e.source) || !allowed.has(e.target)) return false;
      if (rel && e.type !== rel) return false;
      if (status && e.status !== status) return false;
      return true;
    });
  }, [data, allowed, rel, status]);

  if (loading) return <p>Carregando mapa…</p>;
  if (error || !data) return <p role="alert">{error}</p>;

  const sel = data.questions.find((q) => q.id === selected);
  const paths = data.paths.filter((p) => !domain || p.nodes.some((n) => allowed.has(n))).slice(0, 8);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-3xl">Mapa de Aprendizagem</h1>
        <p className="max-w-2xl text-mute">Possível caminho de aprendizagem e relação estrutural entre questões. Não é sequência obrigatória nem medida de dificuldade.</p>
      </header>
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="text-sm text-mute">Domínio
          <select aria-label="Filtrar domínio" className="mt-1 min-h-11 w-full rounded-lg border border-line bg-panel px-2 text-fg" value={domain} onChange={(e) => setDomain(e.target.value)}>
            <option value="">Todos</option>
            {domains.map((d) => <option key={d} value={d}>{domainLabel(d)}</option>)}
          </select>
        </label>
        <label className="text-sm text-mute">Tipo de relação
          <select aria-label="Filtrar tipo" className="mt-1 min-h-11 w-full rounded-lg border border-line bg-panel px-2 text-fg" value={rel} onChange={(e) => setRel(e.target.value)}>
            <option value="">Todos</option>
            {types.map((t) => <option key={t} value={t}>{t.replaceAll("_", " ")}</option>)}
          </select>
        </label>
        <label className="text-sm text-mute">Confiança
          <select aria-label="Filtrar confiança" className="mt-1 min-h-11 w-full rounded-lg border border-line bg-panel px-2 text-fg" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Todos</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="CANDIDATE">CANDIDATE</option>
            <option value="UNCERTAIN">UNCERTAIN</option>
          </select>
        </label>
      </div>
      <p className="text-sm text-mute">{questions.length} questões · {edges.length} relações visíveis · ciclos registrados: {data.cycles.length}</p>
      <GraphView questions={questions} edges={edges} focusId={selected} onSelect={setSelected} onOpen={(id) => nav({ to: "/questoes/$id", params: { id } })} />
      {sel && (
        <aside className="rounded-2xl border border-line bg-panel p-4">
          <p className="font-mono text-amber">{sel.id}</p>
          <p>{domainLabel(sel.domain)} · {sel.content?.replaceAll("_", " ") ?? "Em revisão"}</p>
          <p className="text-sm text-mute">Papel: {sel.learning_role ?? "Em revisão"} · preparação: {sel.preparation_level ?? "Em revisão"}</p>
          <button type="button" className="mt-2 min-h-11 rounded-lg bg-amber px-3 text-sm font-semibold text-ink" onClick={() => nav({ to: "/questoes/$id", params: { id: sel.id } })}>Explorar questão</button>
        </aside>
      )}
      <section>
        <h2 className="mb-2 font-serif text-2xl">Clusters</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {data.clusters.map((c) => {
            const qs = data.questions.filter((q) => c.canonical_ids.includes(q.id));
            const concepts = [...new Set(qs.flatMap((q) => q.prerequisites.map((p) => p.label).filter(Boolean)))].slice(0, 6);
            const rels = data.learningEdges.filter((e) => c.canonical_ids.includes(e.source) && c.canonical_ids.includes(e.target));
            return (
              <article key={c.cluster_id} className="rounded-2xl border border-line bg-panel p-4">
                <h3 className="font-serif text-xl">{domainLabel(c.name)}</h3>
                <p className="text-sm text-mute">{c.canonical_ids.length} questões · {rels.length} relações internas</p>
                <p className="mt-2 text-sm">{concepts.length ? concepts.join(" · ") : "Em revisão"}</p>
                <ul className="mt-2 space-y-1 text-xs text-mute">
                  {c.canonical_ids.slice(0, 6).map((id) => <li key={id}>{id}</li>)}
                </ul>
              </article>
            );
          })}
        </div>
      </section>
      <section>
        <h2 className="mb-2 font-serif text-2xl">Caminhos identificados</h2>
        <p className="mb-3 text-sm text-mute">Possível progressão e relação pedagógica. Profundidade máxima registrada: {data.pathLimit}. Não é ordem obrigatória de estudo.</p>
        <ul className="space-y-2">
          {paths.map((p, i) => (
            <li key={i} className="rounded-xl border border-line p-3 text-sm">
              <StatusBadge status="CANDIDATE" />
              <span className="ml-2">{p.nodes.join(" → ")}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
