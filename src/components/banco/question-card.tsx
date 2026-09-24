import { Link } from "@tanstack/react-router";
import { domainLabel, fieldText, isInterface, isProbable, type Question } from "@/lib/banco";
import { StatusBadge } from "@/components/banco/status-badge";

export function QuestionCard({ q }: { q: Question }) {
  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-line bg-panel p-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-mute">
        <span>ENEM {q.year ?? "—"}</span>
        <span>Dia {q.day ?? "—"}</span>
        {(isInterface(q) || isProbable(q)) ? <StatusBadge status="UNCERTAIN" /> : <StatusBadge status={q.taxonomy_status} />}
      </div>
      <h3 className="font-mono text-sm text-amber">{q.id}</h3>
      <dl className="grid grid-cols-2 gap-2 text-sm">
        <div><dt className="text-mute">Domínio</dt><dd>{isInterface(q) ? "Em revisão" : domainLabel(q.domain)}</dd></div>
        <div><dt className="text-mute">Conteúdo</dt><dd>{fieldText(q, q.content)}</dd></div>
        <div><dt className="text-mute">Subconteúdo</dt><dd>{fieldText(q, q.subcontent)}</dd></div>
        <div><dt className="text-mute">Fenômeno</dt><dd>{fieldText(q, q.phenomenon)}</dd></div>
        <div><dt className="text-mute">Competência</dt><dd>{q.competency_code ?? "Em revisão"}</dd></div>
        <div><dt className="text-mute">Habilidade</dt><dd>{q.skill_code ?? "Em revisão"}</dd></div>
        <div><dt className="text-mute">Bloom</dt><dd>{fieldText(q, q.bloom)}</dd></div>
        <div><dt className="text-mute">Demanda</dt><dd>{fieldText(q, q.demand)}</dd></div>
      </dl>
      {isInterface(q) && <p className="text-sm text-rose">CLASSIFICAÇÃO DISCIPLINAR EM REVISÃO</p>}
      {isProbable(q) && <p className="text-sm text-amber">EM REVISÃO</p>}
      <Link
        to="/questoes/$id"
        params={{ id: q.id }}
        className="mt-auto inline-flex min-h-11 items-center justify-center rounded-xl bg-amber px-4 text-sm font-semibold text-ink"
      >
        Explorar questão
      </Link>
    </article>
  );
}
