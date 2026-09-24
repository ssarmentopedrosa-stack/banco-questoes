import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { QuestionCard } from "@/components/banco/question-card";
import { searchQuestions, type Question } from "@/lib/banco";
import { useBanco } from "@/lib/use-banco";

type Search = { dominio?: string; q?: string };

export const Route = createFileRoute("/questoes/")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    dominio: typeof s.dominio === "string" ? s.dominio : undefined,
    q: typeof s.q === "string" ? s.q : undefined,
  }),
  component: QuestoesPage,
});

const FILTERS: { key: keyof Question; label: string }[] = [
  { key: "year", label: "Ano" },
  { key: "day", label: "Dia" },
  { key: "domain", label: "Domínio" },
  { key: "content", label: "Conteúdo" },
  { key: "subcontent", label: "Subconteúdo" },
  { key: "phenomenon", label: "Fenômeno" },
  { key: "competency_code", label: "Competência" },
  { key: "skill_code", label: "Habilidade" },
  { key: "bloom", label: "Bloom" },
  { key: "math_category", label: "Matemática" },
  { key: "reasoning", label: "Raciocínio" },
  { key: "representation", label: "Representação" },
  { key: "learning_role", label: "Papel pedagógico" },
  { key: "taxonomy_status", label: "Status" },
  { key: "demand", label: "Demanda" },
];

function QuestoesPage() {
  const search = Route.useSearch();
  const { data, error, loading } = useBanco();
  const [text, setText] = useState(search.q ?? "");
  const [filters, setFilters] = useState<Record<string, string>>({ domain: search.dominio ?? "" });
  const [sort, setSort] = useState("id");
  const [page, setPage] = useState(0);
  const pageSize = 9;

  const options = useMemo(() => {
    const map: Record<string, string[]> = {};
    if (!data) return map;
    for (const f of FILTERS) {
      map[f.key] = [...new Set(data.questions.map((q) => String(q[f.key] ?? "")).filter(Boolean))].sort();
    }
    return map;
  }, [data]);

  const shown = useMemo(() => {
    if (!data) return [];
    let list = searchQuestions(data.questions, text);
    for (const [k, v] of Object.entries(filters)) {
      if (!v) continue;
      list = list.filter((q) => String(q[k as keyof Question] ?? "") === v);
    }
    return list;
  }, [data, text, filters]);

  const ordered = useMemo(() => {
    const copy = [...shown];
    copy.sort((a, b) => String(a[sort as keyof Question] ?? "").localeCompare(String(b[sort as keyof Question] ?? ""), "pt"));
    return copy;
  }, [shown, sort]);

  const pages = Math.max(1, Math.ceil(ordered.length / pageSize));
  const safePage = Math.min(page, pages - 1);
  const slice = ordered.slice(safePage * pageSize, safePage * pageSize + pageSize);

  if (loading) return <p>Carregando questões…</p>;
  if (error || !data) return <p role="alert">{error}</p>;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-serif text-3xl">Banco de questões</h1>
        <p className="text-mute">{shown.length} de {data.questions.length} questões oficiais de Física 2024–2025.</p>
      </header>
      <label className="block">
        <span className="text-sm text-mute">Busca</span>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="ID, conteúdo, fenômeno, lei, habilidade…"
          className="mt-1 min-h-11 w-full rounded-xl border border-line bg-panel px-3 text-fg"
        />
      </label>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {FILTERS.map((f) => (
          <label key={f.key} className="text-xs text-mute">
            {f.label}
            <select
              aria-label={f.label}
              value={filters[f.key] ?? ""}
              onChange={(e) => setFilters((s) => ({ ...s, [f.key]: e.target.value }))}
              className="mt-1 min-h-11 w-full rounded-lg border border-line bg-ink px-2 text-sm text-fg"
            >
              <option value="">Todos</option>
              {(options[f.key] ?? []).map((o) => (
                <option key={o} value={o}>{o.replaceAll("_", " ")}</option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <label className="text-sm text-mute">Ordenar
        <select aria-label="Ordenação" className="ml-2 min-h-11 rounded-lg border border-line bg-ink px-2 text-fg" value={sort} onChange={(e) => { setSort(e.target.value); setPage(0); }}>
          <option value="id">ID</option>
          <option value="year">Ano</option>
          <option value="domain">Domínio</option>
          <option value="content">Conteúdo</option>
          <option value="demand">Demanda</option>
          <option value="bloom">Bloom</option>
        </select>
      </label>
      {ordered.length === 0 ? (
        <p className="rounded-xl border border-line p-6 text-mute">Nenhuma questão com esses filtros. Os dados não foram alterados.</p>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {slice.map((q) => <QuestionCard key={q.id} q={q} />)}
          </div>
          <div className="flex items-center gap-3">
            <button type="button" className="min-h-11 rounded-lg border border-line px-3" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>Anterior</button>
            <span className="text-sm text-mute">Página {safePage + 1} de {pages}</span>
            <button type="button" className="min-h-11 rounded-lg border border-line px-3" disabled={safePage >= pages - 1} onClick={() => setPage(safePage + 1)}>Próxima</button>
          </div>
        </>
      )}
    </div>
  );
}
