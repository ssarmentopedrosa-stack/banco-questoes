import type { ReactNode } from "react";
import { CONFIDENCE_LABEL, type Explanation } from "@/lib/banco";

/** Negrito `**x**` → <strong>. Sem HTML cru: o texto vira nós React (nada de innerHTML). */
function inline(text: string, key: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
      <strong key={`${key}-${i}`}>{part.slice(2, -2)}</strong>
    ) : (
      part
    )
  );
}

type Item = { text: string; children: string[] };

/** Markdown mínimo usado nas explicações: parágrafos, negrito e listas com "- " (um nível de aninhamento). */
export function MiniMarkdown({ source }: { source: string }) {
  const blocks = source.trim().split(/\n{2,}/);
  return (
    <div className="space-y-2">
      {blocks.map((block, b) => {
        const lines = block.split("\n");
        const head: string[] = [];
        const items: Item[] = [];
        for (const line of lines) {
          const sub = /^\s{2,}[-*] (.*)$/.exec(line);
          const top = /^[-*] (.*)$/.exec(line);
          if (sub && items.length) items[items.length - 1].children.push(sub[1]);
          else if (top) items.push({ text: top[1], children: [] });
          else if (items.length) items[items.length - 1].text += ` ${line.trim()}`;
          else head.push(line);
        }
        return (
          <div key={b}>
            {head.length > 0 && <p>{inline(head.join(" "), `p${b}`)}</p>}
            {items.length > 0 && (
              <ul className="list-disc space-y-1 pl-5">
                {items.map((it, i) => (
                  <li key={i}>
                    {inline(it.text, `l${b}-${i}`)}
                    {it.children.length > 0 && (
                      <ul className="list-[circle] pl-5">
                        {it.children.map((c, j) => <li key={j}>{inline(c, `l${b}-${i}-${j}`)}</li>)}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Explicação escrita por IA (Chico). Fechada por padrão porque revela a resposta. */
export function ExplanationCard({ e }: { e: Explanation }) {
  const border = e.needs_review ? "border-rose" : "border-amber";
  return (
    <section data-testid="explanation">
      <details className={`rounded-xl border ${border} bg-panel p-3 text-sm`}>
        <summary className="cursor-pointer font-serif text-lg">Explicação (revela a resposta)</summary>
        <p className="mt-2 rounded-lg border border-amber/60 bg-ink/40 px-2 py-1 text-xs font-semibold" data-testid="explanation-badge">
          {e.label}
        </p>
        <p className="mt-1 text-xs text-mute">
          Confiança da IA: <span data-testid="explanation-confidence">{CONFIDENCE_LABEL[e.confidence] ?? e.confidence}</span>
          {e.needs_review && (
            <span className="ml-2 rounded border border-rose px-1.5 py-0.5 font-semibold text-rose" data-testid="explanation-needs-review">
              precisa de revisão
            </span>
          )}
        </p>
        <div className="mt-3">
          <MiniMarkdown source={e.markdown} />
        </div>
        <dl className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg border border-line bg-ink/40 p-2">
            <dt className="text-xs uppercase tracking-wide text-mute">Conceito-chave</dt>
            <dd className="mt-1">{e.key_concept}</dd>
          </div>
          <div className="rounded-lg border border-line bg-ink/40 p-2">
            <dt className="text-xs uppercase tracking-wide text-mute">Erro comum</dt>
            <dd className="mt-1">{e.common_mistake}</dd>
          </div>
        </dl>
      </details>
    </section>
  );
}
