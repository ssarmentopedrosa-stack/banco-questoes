import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { edgeIncident, GraphView } from "@/components/banco/graph-view";
import { StatusBadge } from "@/components/banco/status-badge";
import {
  CONTEXT_RELATIONS,
  DISCIPLINE_LABEL,
  HIGHLIGHT_RELATIONS,
  domainLabel,
  fieldText,
  isInterface,
  isProbable,
  type PedEdge,
  type Question,
} from "@/lib/banco";
import { oficial } from "@/lib/oficial";
import { QuestionViewer } from "@/components/banco/question-viewer";
import { useBanco } from "@/lib/use-banco";

export const Route = createFileRoute("/questoes/$id")({ component: Detail });

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-xl border border-line bg-ink/40 p-3">
      <dt className="text-xs uppercase tracking-wide text-mute">{k}</dt>
      <dd className="mt-1 text-sm">{v}</dd>
    </div>
  );
}

function other(e: { source: string; target: string }, id: string) {
  return e.source === id ? e.target : e.source;
}

function Detail() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const { data, error, loading } = useBanco();
  const [picked, setPicked] = useState<string | null>(null);

  const q = data?.questions.find((x) => x.id === id) ?? data?.hidden.find((x) => x.id === id);

  const ped = useMemo(() => {
    if (!data || !q) return [] as PedEdge[];
    return data.pedagogicalEdges.filter((e) => e.source === q.id || e.target === q.id);
  }, [data, q]);

  const highlight = ped.filter((e) => (HIGHLIGHT_RELATIONS as readonly string[]).includes(e.type));
  const context = ped.filter((e) => (CONTEXT_RELATIONS as readonly string[]).includes(e.type));
  const learn = data && q ? edgeIncident(data.learningEdges, q.id) : [];

  const neighborIds = useMemo(() => {
    const ids = new Set<string>();
    if (!q) return ids;
    ids.add(q.id);
    for (const e of highlight.slice(0, 14)) ids.add(other(e, q.id));
    for (const e of learn.slice(0, 8)) ids.add(other(e, q.id));
    return ids;
  }, [highlight, learn, q]);

  if (loading) return <p>Carregando questão…</p>;
  if (error || !data) return <p role="alert">{error}</p>;
  if (!q) {
    return (
      <div>
        <p role="alert">Questão não encontrada no banco 2015–2025.</p>
        <Link to="/questoes" className="text-amber">Voltar ao banco</Link>
      </div>
    );
  }

  const review = isInterface(q);
  const probable = isProbable(q);
  const neighbors = data.questions.filter((x) => neighborIds.has(x.id));
  const preview = data.questions.find((x) => x.id === picked);

  const graphEdges = [
    ...highlight.map((e) => ({ source: e.source, target: e.target, status: e.status, type: e.type })),
    ...learn.map((e) => ({ source: e.source, target: e.target, status: e.status, type: e.type })),
  ].filter((e) => neighborIds.has(e.source) && neighborIds.has(e.target));

  return (
    <article className="space-y-6">
      <header>
        <p className="text-sm text-mute">ENEM — {q.year ?? "ano não determinado"} · {q.day ?? "dia não determinado"}</p>
        <h1 className="font-serif text-3xl">Questão</h1>
        <p className="font-mono text-amber">{q.id}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <StatusBadge status={q.taxonomy_status} />
          <StatusBadge status={q.matrix_status} />
          {probable && <StatusBadge status="CANDIDATE" />}
        </div>
        {review && <p className="mt-3 rounded-xl border border-rose bg-panel p-3 text-sm">Questão em revisão de classificação disciplinar.</p>}
        {q.out_of_scope && (
          <p className="mt-3 rounded-xl border border-rose bg-panel p-3 text-sm">
            Fora do escopo de Física: registro mantido, mas fora das listas, do mapa e do desafio. {q.exclusion_reason}
          </p>
        )}
        {q.canonical_id && (
          <p className="mt-3 rounded-xl border border-amber bg-panel p-3 text-sm">
            Este registro é uma variante de caderno vinculada a{" "}
            <Link to="/questoes/$id" params={{ id: q.canonical_id }} className="text-amber underline">{q.canonical_id}</Link>
            {q.matching_status === "probable" ? " (casamento PROBABLE)" : ""}. A questão aparece pela ficha canônica.
          </p>
        )}
        {q.pedagogical_review && (
          <div className="mt-3 rounded-xl border border-sky-400 bg-panel p-3 text-sm">
            <p className="font-semibold">Revisão pedagógica · {q.pedagogical_review.origin} ({q.pedagogical_review.date.split("-").reverse().join("/")})</p>
            <p className="mt-1">
              Disciplina: {q.pedagogical_review.decision_text || DISCIPLINE_LABEL[q.pedagogical_review.decision] || q.pedagogical_review.decision}
            </p>
            <p>Habilidade: {q.pedagogical_review.skill_text_review}</p>
            <p className="mt-1 text-mute">{q.pedagogical_review.justification}</p>
            <p className="mt-1 text-xs text-mute">{q.pedagogical_review.note}</p>
          </div>
        )}
        {q.review_reasons && q.review_reasons.length > 0 && (
          <div className="mt-3 rounded-xl border border-amber bg-panel p-3 text-sm">
            <p className="font-semibold">{q.review_required ? "Precisa revisão" : "Observações"} (lote {q.source_batch ?? "—"})</p>
            <ul className="mt-1 list-disc pl-5">
              {q.review_reasons.map((r) => <li key={r}>{r}</li>)}
            </ul>
          </div>
        )}
        {probable && <p className="mt-3 rounded-xl border border-amber bg-panel p-3 text-sm">Classificação pedagógica ainda não definitiva. Esta identificação permanece PROBABLE na base de matching.</p>}
      </header>
      <QuestionViewer id={q.id} view={oficial[q.id]} probable={probable} />

      <section>
        <h2 className="mb-2 font-serif text-xl">Núcleo físico</h2>
        <dl className="grid gap-2 sm:grid-cols-2">
          <Row k="Domínio" v={domainLabel(q.domain)} />
          <Row k="Conteúdo" v={fieldText(q, q.content)} />
          <Row k="Subconteúdo" v={fieldText(q, q.subcontent)} />
          <Row k="Fenômeno" v={fieldText(q, q.phenomenon)} />
          <Row k="Lei / modelo" v={fieldText(q, q.model)} />
          <Row k="Leis" v={q.laws.length ? q.laws.join(", ") : fieldText(q, null)} />
        </dl>
      </section>

      <section>
        <h2 className="mb-2 font-serif text-xl">Matriz ENEM</h2>
        <dl className="grid gap-2 sm:grid-cols-2">
          <Row k="Competência" v={q.competency_code ? `${q.competency_code} — ${q.competency_text}` : "Em revisão"} />
          <Row k="Habilidade" v={q.skill_code ? `${q.skill_code} — ${q.skill_text}` : "Em revisão"} />
        </dl>
      </section>

      <section>
        <h2 className="mb-2 font-serif text-xl">Camadas pedagógicas</h2>
        <dl className="grid gap-2 sm:grid-cols-2">
          <Row k="Matemática" v={fieldText(q, q.math_core || q.math_category)} />
          <Row k="Raciocínio" v={fieldText(q, q.reasoning_core || q.reasoning)} />
          <Row k="Representação" v={fieldText(q, q.representation)} />
          <Row k="Bloom" v={fieldText(q, q.bloom)} />
          <Row k="Demanda estrutural" v={`${fieldText(q, q.demand)} (não é TRI)`} />
          <Row k="Papel pedagógico" v={fieldText(q, q.learning_role)} />
        </dl>
        <div className="mt-3">
          <h3 className="text-sm text-mute">Pré-requisitos</h3>
          {q.prerequisites.length === 0 ? <p>Em revisão</p> : (
            <ul className="mt-2 flex flex-wrap gap-2">
              {q.prerequisites.map((p) => (
                <li key={p.id ?? p.label} className="rounded-full border border-line px-3 py-1 text-sm">
                  {p.label ?? "Não determinado"} · {p.necessity ?? ""}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section id="relacoes" className="space-y-3">
        <h2 className="font-serif text-xl">Como esta questão se relaciona com outras?</h2>
        <RelationList title="Relações principais" items={highlight} self={q.id} questions={data.questions} />
        <details className="rounded-xl border border-line p-3">
          <summary className="min-h-11 cursor-pointer text-sm text-mute">Relações contextuais (Bloom, habilidade, competência, demanda) — menor destaque</summary>
          <RelationList title="" items={context.slice(0, 24)} self={q.id} questions={data.questions} />
        </details>
        <h3 className="font-serif text-lg">Relações de aprendizagem (estruturais)</h3>
        <p className="text-sm text-mute">Não são ordem obrigatória de estudo.</p>
        <ul className="space-y-2">
          {learn.length === 0 && <li className="text-mute">Nenhuma relação de aprendizagem confirmada ou candidata.</li>}
          {learn.map((e) => {
            const oid = other(e, q.id);
            return (
              <li key={`${e.type}-${oid}-${e.status}`} className="flex flex-wrap items-center gap-2 text-sm">
                <StatusBadge status={e.status} />
                <span>{e.type.replaceAll("_", " ")}</span>
                <Link to="/questoes/$id" params={{ id: oid }} className="text-amber">{oid}</Link>
              </li>
            );
          })}
        </ul>
        <h3 className="font-serif text-lg">Caminhos identificados</h3>
        <p className="text-sm text-mute">Possível progressão. Não é ordem obrigatória de estudo.</p>
        <ul className="space-y-2 text-sm">
          {data.paths.filter((p) => p.nodes.includes(q.id)).slice(0, 6).map((p, i) => (
            <li key={i} className="rounded-xl border border-line p-3">{p.nodes.join(" → ")}</li>
          ))}
          {data.paths.every((p) => !p.nodes.includes(q.id)) && <li className="text-mute">Não determinado para esta questão.</li>}
        </ul>
        <GraphView
          questions={neighbors}
          edges={graphEdges}
          focusId={q.id}
          onSelect={setPicked}
          onOpen={(nid) => nav({ to: "/questoes/$id", params: { id: nid } })}
        />
        {preview && preview.id !== q.id && (
          <aside className="rounded-xl border border-line bg-panel p-3">
            <p className="font-mono text-sm text-amber">{preview.id}</p>
            <p className="text-sm">{domainLabel(preview.domain)} · {fieldText(preview, preview.content)}</p>
            <button type="button" className="mt-2 min-h-11 rounded-lg bg-amber px-3 text-sm font-semibold text-ink" onClick={() => nav({ to: "/questoes/$id", params: { id: preview.id } })}>
              Abrir questão
            </button>
          </aside>
        )}
      </section>
    </article>
  );
}

function RelationList({ title, items, self, questions }: { title: string; items: PedEdge[]; self: string; questions: Question[] }) {
  if (!title && items.length === 0) return null;
  return (
    <div>
      {title && <h3 className="mb-2 text-sm text-mute">{title}</h3>}
      <ul className="space-y-2">
        {items.length === 0 && <li className="text-sm text-mute">Não determinado para este recorte.</li>}
        {items.slice(0, 20).map((e, i) => {
          const oid = other(e, self);
          const known = questions.some((q) => q.id === oid);
          return (
            <li key={`${e.type}-${oid}-${i}`} className="flex flex-wrap items-center gap-2 text-sm">
              <StatusBadge status={e.status} />
              <span className="text-mute">{e.strength}</span>
              <span>{e.type.replaceAll("_", " ")}</span>
              {known ? <Link to="/questoes/$id" params={{ id: oid }} className="text-amber">{oid}</Link> : <span>{oid}</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
