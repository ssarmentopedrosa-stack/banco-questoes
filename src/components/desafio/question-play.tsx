import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { domainLabel } from "@/lib/banco";
import { reasoningSummary, type DesafioItem } from "@/lib/gamificacao/catalog";
import { altsLookTruncated, cleanText, stemOnly } from "@/lib/gamificacao/text";

const LETTERS = ["A", "B", "C", "D", "E"] as const;
const DEMAND_LABEL: Record<string, string> = { LOW: "Demanda baixa", MODERATE: "Demanda média", HIGH: "Demanda alta" };

export function QuestionPlay({
  item,
  index,
  total,
  streak,
  onDone,
}: {
  item: DesafioItem;
  index: number;
  total: number;
  streak: number;
  onDone: (chosen: string) => void;
}) {
  const [chosen, setChosen] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const v = item.variant;
  const alts = v?.alternatives ?? [];
  const textAlts = v?.alternatives_status === "complete" && alts.length === 5;
  const stem = v ? (textAlts ? stemOnly(v.statement, alts[0].text) : cleanText(v.statement)) : null;
  const maybeCut = textAlts && altsLookTruncated(alts.map((a) => a.text));
  const correct = confirmed && chosen === item.answer;
  const summary = reasoningSummary(item.question);

  return (
    <article className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-panel" aria-hidden>
          <div className="h-full rounded-full bg-teal transition-all" style={{ width: `${((index + (confirmed ? 1 : 0)) / total) * 100}%` }} />
        </div>
        <span className="text-sm text-mute">
          {index + 1}/{total}
        </span>
        {streak >= 2 && <span className="rounded-full bg-rose/20 px-2 py-1 text-xs font-semibold text-rose">🔥 {streak} seguidas</span>}
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-full border border-line px-2 py-1">ENEM {item.year}</span>
        <span className="rounded-full border border-line px-2 py-1">{domainLabel(item.domain)}</span>
        {item.demand && <span className="rounded-full border border-line px-2 py-1">{DEMAND_LABEL[item.demand]}</span>}
        {item.reviewRequired && <span className="rounded-full border border-amber px-2 py-1 text-amber">Em revisão</span>}
      </div>
      {v?.text_source?.startsWith("ocr") && <p className="text-xs text-amber">Texto por OCR — confira na imagem da prova abaixo.</p>}
      <div className="whitespace-pre-wrap rounded-2xl border border-line bg-panel p-4 font-serif text-base leading-relaxed sm:text-lg">{stem ?? "Enunciado não disponível."}</div>
      {item.figures.length > 0 && (
        <ul className="space-y-3">
          {item.figures.map((f) => (
            <li key={f.src}>
              <figure className="rounded-xl bg-white p-2">
                <img src={f.src} alt={`${f.label} — ENEM ${item.year}, questão ${f.source.number}`} width={f.width} height={f.height} loading="lazy" className="mx-auto h-auto w-auto max-w-full" style={{ maxWidth: `min(100%, ${Math.round(f.width * 0.75)}px)` }} />
                <figcaption className="mt-1 text-center text-xs text-slate-600">{f.label}</figcaption>
              </figure>
            </li>
          ))}
        </ul>
      )}
      <fieldset className="space-y-2" disabled={confirmed}>
        <legend className="mb-1 text-sm text-mute">{textAlts ? "Escolha uma alternativa" : "Escolha a letra (alternativas na imagem acima)"}</legend>
        {LETTERS.map((L) => {
          const text = textAlts ? alts.find((a) => a.letter === L)?.text : null;
          const isAns = confirmed && L === item.answer;
          const isWrongPick = confirmed && L === chosen && L !== item.answer;
          const tone = isAns ? "border-teal bg-teal/15" : isWrongPick ? "border-rose bg-rose/15" : chosen === L ? "border-amber bg-amber/10" : "border-line bg-panel hover:border-mute";
          return (
            <button key={L} type="button" onClick={() => setChosen(L)} aria-pressed={chosen === L} className={`flex min-h-12 w-full items-start gap-3 rounded-xl border p-3 text-left transition ${tone}`}>
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full font-bold ${chosen === L || isAns ? "bg-amber text-ink" : "bg-ink text-fg"}`}>{L}</span>
              <span className="whitespace-pre-wrap pt-1">{text ?? ""}</span>
              {isAns && <span className="ml-auto pt-1" aria-label="gabarito">✓</span>}
              {isWrongPick && <span className="ml-auto pt-1" aria-label="sua resposta">✗</span>}
            </button>
          );
        })}
      </fieldset>
      {maybeCut && (
        <p className="text-xs text-amber">
          Algumas alternativas parecem cortadas na extração automática.{" "}
          <Link to="/questoes/$id" params={{ id: item.id }} target="_blank" className="underline">
            Confira na ficha completa
          </Link>
          .
        </p>
      )}
      {!confirmed ? (
        <button type="button" disabled={!chosen} onClick={() => setConfirmed(true)} className="min-h-12 w-full rounded-xl bg-amber font-semibold text-ink disabled:opacity-40">
          Confirmar resposta
        </button>
      ) : (
        <div className={`space-y-3 rounded-2xl border p-4 ${correct ? "border-teal bg-teal/10" : "border-rose bg-rose/10"}`} role="status">
          <p className="text-lg font-semibold">{correct ? "🎉 Acertou!" : "Não foi dessa vez."}</p>
          <p>
            Gabarito oficial: <strong className="text-amber">{item.answer}</strong>
            {!correct && chosen ? ` · sua resposta: ${chosen}` : ""}
          </p>
          <div className="text-sm">
            <p className="text-mute">Ideia central (resumo de raciocínio do banco)</p>
            {summary.text ? <p className="mt-1">{summary.text}</p> : <p className="mt-1 text-mute">Resumo ainda não disponível para esta questão.</p>}
            {summary.inferred && summary.text && <p className="mt-1 text-xs text-amber">Resumo inferido, ainda não validado por professor.</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => onDone(chosen!)} className="min-h-12 flex-1 rounded-xl bg-amber px-4 font-semibold text-ink">
              {index + 1 < total ? "Próxima questão" : "Ver resultado"}
            </button>
            <Link to="/questoes/$id" params={{ id: item.id }} target="_blank" className="inline-flex min-h-12 items-center rounded-xl border border-line px-4 text-sm">
              Ficha completa
            </Link>
          </div>
        </div>
      )}
    </article>
  );
}

