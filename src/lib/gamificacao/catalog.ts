import { banco, isInterface, type Question } from "@/lib/banco";
import { oficial, type OfficialFigure, type OfficialVariant } from "@/lib/oficial";
import type { Demand, PlayableQuestion } from "./engine";

/** Questão pronta para a tela do desafio (texto oficial, figuras, gabarito, resumo existente). */
export type DesafioItem = PlayableQuestion & {
  question: Question;
  variant: OfficialVariant | null;
  figures: OfficialFigure[];
};

const DEMANDS: Demand[] = ["LOW", "MODERATE", "HIGH"];

function pickVariant(id: string): { variant: OfficialVariant | null; figures: OfficialFigure[]; annulled: boolean } {
  const view = oficial[id];
  const variants = view?.variants ?? [];
  const figures = view?.figures ?? [];
  // Uma questão é anulada se qualquer variante oficial estiver anulada.
  const annulled = variants.some((v) => v.answer_status === "annulled");
  const fromFig = figures.length ? variants.find((v) => v.booklet === figures[0].source.booklet) : undefined;
  const variant = fromFig ?? variants.find((v) => v.answer_status === "official" && v.answer) ?? variants[0] ?? null;
  // Figuras só se correspondem à variante mostrada (mesmo caderno).
  const figs = variant && figures.length && figures[0].source.booklet === variant.booklet ? figures : [];
  return { variant, figures: figs, annulled };
}

export function buildCatalog(questions: readonly Question[] = banco.questions): DesafioItem[] {
  return questions.map((q) => {
    const { variant, figures, annulled } = pickVariant(q.id);
    const demand = DEMANDS.includes(q.demand as Demand) ? (q.demand as Demand) : null;
    return {
      id: q.id,
      year: q.year ?? "",
      domain: q.domain ?? "INTERFACE_FISICA",
      demand,
      answer: variant && variant.answer_status === "official" ? variant.answer : null,
      annulled,
      reviewRequired: Boolean(q.review_required || isInterface(q)),
      question: q,
      variant,
      figures,
    };
  });
}

export const catalog: DesafioItem[] = buildCatalog();
export const catalogById = new Map(catalog.map((c) => [c.id, c]));

/** Resumo de raciocínio já existente no banco (não gera resolução nova). */
export function reasoningSummary(q: Question): { text: string | null; inferred: boolean } {
  if (isInterface(q) || q.reasoning_status === "UNCERTAIN") return { text: null, inferred: false };
  const text = q.reasoning_core || null;
  return { text, inferred: q.reasoning_status !== "DETERMINED" };
}
