/**
 * Export versionado das questões jogáveis do Desafio ENEM (para o SilasLab Games Portal).
 *
 * PURO (sem imports de runtime, sem relógio): mesma entrada → mesma saída, byte a byte.
 * Gera dois arquivos:
 *  - público: enunciado, alternativas, figuras, domínio/ano/demanda, flags — SEM gabarito e SEM resumo de
 *    raciocínio (o resumo é revelado pelo servidor só depois da resposta);
 *  - gabarito: só para o servidor (alternativa oficial + resumo de raciocínio existente).
 * Regras: anuladas e sem gabarito oficial ficam FORA; "precisa revisão" entram com `reviewRequired: true`
 * (o consumidor as exclui por padrão).
 */
import { altsLookTruncated, cleanText, stemOnly } from "./text.ts";

export const EXPORT_SCHEMA = 1;
export const EXPORT_KIND_PUBLICO = "banco-fisica-enem/desafio-publico";
export const EXPORT_KIND_GABARITO = "banco-fisica-enem/desafio-gabarito";

type Alt = { letter: string; text: string };
type Variant = {
  id: string;
  booklet: number;
  number: number;
  statement: string;
  alternatives: Alt[];
  alternatives_status: string;
  answer: string | null;
  answer_status: string;
  text_source?: string;
};
type Figure = { src: string; kind: string; label: string; width: number; height: number; source: { booklet: number } };
type View = { variants: Variant[]; figures?: Figure[] };
type Q = {
  id: string;
  year: string | number | null;
  domain: string | null;
  content: string | null;
  demand: string | null;
  review_required?: boolean;
  uncertainty?: boolean;
  reasoning_core?: string | null;
  reasoning_status?: string | null;
};
export type BancoInput = { questions: Q[]; paths?: { nodes: string[] }[] };
export type OficialInput = Record<string, View>;

export type QuestaoPublica = {
  id: string;
  year: string;
  domain: string;
  content: string | null;
  demand: "LOW" | "MODERATE" | "HIGH" | null;
  reviewRequired: boolean;
  statement: string;
  alternatives: Alt[] | null; // null → alternativas só na figura
  alternativesMaybeTruncated: boolean;
  textSource: string | null;
  figures: { src: string; kind: string; label: string; width: number; height: number }[];
  source: { variantId: string; booklet: number; number: number };
};

export type ExportPublico = {
  kind: typeof EXPORT_KIND_PUBLICO;
  schema: number;
  version: string;
  counts: { total: number; reviewRequired: number; byDomain: Record<string, number> };
  questions: QuestaoPublica[];
  paths: string[][];
};

export type ExportGabarito = {
  kind: typeof EXPORT_KIND_GABARITO;
  schema: number;
  version: string;
  answers: Record<string, { answer: string; reasoning: string | null; reasoningInferred: boolean }>;
};

const DEMANDS = new Set(["LOW", "MODERATE", "HIGH"]);

/** FNV-1a 32 bits em hex (versão de conteúdo determinística). */
function fnv(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

function pick(view: View | undefined) {
  const variants = view?.variants ?? [];
  const figures = view?.figures ?? [];
  const annulled = variants.some((v) => v.answer_status === "annulled");
  const fromFig = figures.length ? variants.find((v) => v.booklet === figures[0].source.booklet) : undefined;
  const variant = fromFig ?? variants.find((v) => v.answer_status === "official" && v.answer) ?? variants[0] ?? null;
  const figs = variant && figures.length && figures[0].source.booklet === variant.booklet ? figures : [];
  return { variant, figures: figs, annulled };
}

export function buildExports(banco: BancoInput, oficial: OficialInput): { publico: ExportPublico; gabarito: ExportGabarito } {
  const questions: QuestaoPublica[] = [];
  const answers: ExportGabarito["answers"] = {};
  const sorted = [...banco.questions].sort((a, b) => a.id.localeCompare(b.id));
  for (const q of sorted) {
    const { variant: v, figures, annulled } = pick(oficial[q.id]);
    if (annulled || !v || v.answer_status !== "official" || !v.answer) continue;
    const isInterface = q.domain === "INTERFACE_FISICA" || Boolean(q.uncertainty);
    const textAlts = v.alternatives_status === "complete" && v.alternatives.length === 5;
    const statement = textAlts ? stemOnly(v.statement, v.alternatives[0].text) : cleanText(v.statement).trim();
    questions.push({
      id: q.id,
      year: String(q.year ?? ""),
      domain: q.domain ?? "INTERFACE_FISICA",
      content: q.content && q.content !== "INDETERMINADO" ? q.content : null,
      demand: q.demand && DEMANDS.has(q.demand) ? (q.demand as QuestaoPublica["demand"]) : null,
      reviewRequired: Boolean(q.review_required || isInterface),
      statement,
      alternatives: textAlts ? v.alternatives.map((a) => ({ letter: a.letter, text: a.text })) : null,
      alternativesMaybeTruncated: textAlts && altsLookTruncated(v.alternatives.map((a) => a.text)),
      textSource: v.text_source ?? null,
      figures: figures.map((f) => ({ src: f.src, kind: f.kind, label: f.label, width: f.width, height: f.height })),
      source: { variantId: v.id, booklet: v.booklet, number: v.number },
    });
    const usable = !isInterface && q.reasoning_status !== "UNCERTAIN" && q.reasoning_core;
    answers[q.id] = {
      answer: v.answer,
      reasoning: usable ? String(q.reasoning_core) : null,
      reasoningInferred: Boolean(usable) && q.reasoning_status !== "DETERMINED",
    };
  }
  const ids = new Set(questions.map((q) => q.id));
  const paths = (banco.paths ?? [])
    .map((p) => p.nodes)
    .filter((n) => n.length >= 2 && n.every((id) => ids.has(id)))
    .map((n) => [...n])
    .sort((a, b) => a.join().localeCompare(b.join()));
  const byDomain: Record<string, number> = {};
  for (const q of questions) byDomain[q.domain] = (byDomain[q.domain] ?? 0) + 1;
  // Versão = hash do conteúdo público + gabarito (muda só se os dados mudarem).
  const version = `${EXPORT_SCHEMA}.${fnv(JSON.stringify({ questions, paths, answers }))}`;
  return {
    publico: {
      kind: EXPORT_KIND_PUBLICO,
      schema: EXPORT_SCHEMA,
      version,
      counts: { total: questions.length, reviewRequired: questions.filter((q) => q.reviewRequired).length, byDomain },
      questions,
      paths,
    },
    gabarito: { kind: EXPORT_KIND_GABARITO, schema: EXPORT_SCHEMA, version, answers },
  };
}
