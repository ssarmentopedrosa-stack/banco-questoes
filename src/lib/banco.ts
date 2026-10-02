export type Question = {
  id: string;
  year: string | null;
  day: string | null;
  scope: string | null;
  matching_status: string | null;
  domain: string | null;
  content: string | null;
  subcontent: string | null;
  phenomenon: string | null;
  quantities: string[];
  laws: string[];
  model: string | null;
  taxonomy_status: string | null;
  taxonomy_confidence: string | null;
  competency_code: string | null;
  competency_text: string | null;
  skill_code: string | null;
  skill_text: string | null;
  matrix_status: string | null;
  math_category: string | null;
  math_level: string | null;
  math_core: string | null;
  math_required: boolean | null;
  math_ops: string[];
  math_status: string | null;
  reasoning: string | null;
  reasoning_core: string | null;
  reasoning_summary: string | null;
  reasoning_status: string | null;
  representation: string | null;
  representation_dependency: string | null;
  representation_status: string | null;
  prerequisites: { id: string | null; label: string | null; necessity: string | null; level: string | null }[];
  core_prerequisite: string | null;
  prerequisite_status: string | null;
  bloom: string | null;
  bloom_status: string | null;
  demand: string | null;
  demand_dims: Record<string, string | null>;
  demand_status: string | null;
  is_tri: boolean | null;
  is_empirical: boolean | null;
  learning_role: string | null;
  preparation_level: string | null;
  review_required: boolean;
  uncertainty: boolean;
  source_batch?: string;
  review_reasons?: string[];
  interface_note?: string;
};

export type LearnEdge = {
  id?: string;
  source: string;
  target: string;
  type: string;
  status: string;
  strength?: string | null;
};

export type PedEdge = {
  source: string;
  target: string;
  type: string;
  direction: string;
  strength: string;
  status: string;
};

export type Cluster = {
  cluster_id: string;
  name: string;
  canonical_ids: string[];
};

export type PathItem = { nodes: string[]; length: number };

export type Banco = {
  meta: { source: string; derived: boolean; note: string };
  questions: Question[];
  learningEdges: LearnEdge[];
  pedagogicalEdges: PedEdge[];
  paths: PathItem[];
  pathLimit: number;
  clusters: Cluster[];
  cycles: unknown[];
};

export const HIGHLIGHT_RELATIONS = [
  "SAME_CONTENT",
  "SAME_SUBCONTENT",
  "SAME_PHENOMENON",
  "SHARED_PREREQUISITES",
  "SHARED_MATH",
  "SHARED_REASONING",
  "SHARED_REPRESENTATION",
  "COMPLEMENTARY",
  "PROGRESSION",
  "ALTERNATIVE_APPROACH",
] as const;

export const CONTEXT_RELATIONS = [
  "SHARED_BLOOM",
  "SHARED_ENEM_SKILL",
  "SHARED_ENEM_COMPETENCY",
  "SHARED_DEMAND_PROFILE",
] as const;

export const DOMAIN_LABEL: Record<string, string> = {
  ELETROMAGNETISMO: "Eletromagnetismo",
  MECANICA: "Mecânica",
  ONDAS: "Ondas",
  TERMODINAMICA: "Termodinâmica",
  OPTICA: "Óptica",
  FISICA_MODERNA: "Física Moderna",
  INTERFACE_FISICA: "Interface",
};

export function label(value: string | null | undefined) {
  if (!value) return "Não determinado";
  if (value === "INDETERMINADO" || value === "UNCERTAIN") return "Em revisão";
  return value.replaceAll("_", " ");
}

export function domainLabel(value: string | null | undefined) {
  if (!value || value === "INTERFACE_FISICA") {
    if (value === "INTERFACE_FISICA") return "Interface";
    return "Em revisão";
  }
  return DOMAIN_LABEL[value] ?? label(value);
}

export function isInterface(q: Question) {
  return q.domain === "INTERFACE_FISICA" || q.uncertainty;
}

export function isProbable(q: Question) {
  return q.matching_status === "probable" || q.id === "ENEM-CN-2025-D2-CAN-010";
}

export function fieldText(q: Question, value: string | null | undefined) {
  if (isInterface(q) && (!value || value === "INDETERMINADO" || value === "UNCERTAIN")) {
    return "Em revisão";
  }
  if (!value) return "Não determinado";
  if (value === "INDETERMINADO") return "Em revisão";
  return value.replaceAll("_", " ");
}

import raw from "../../public/banco.json";

export const banco = raw as unknown as Banco;

export function loadBanco(): Promise<Banco> {
  return Promise.resolve(banco);
}

export function kpis(b: Banco) {
  const domains = new Set(b.questions.map((q) => q.domain).filter(Boolean));
  const learn = b.learningEdges;
  return {
    questions: b.questions.length,
    domains: domains.size,
    relations: learn.length,
    confirmed: learn.filter((e) => e.status === "CONFIRMED").length,
    candidate: learn.filter((e) => e.status === "CANDIDATE").length,
    review: b.questions.filter((q) => q.review_required || isInterface(q)).length,
    cycles: b.cycles.length,
  };
}

export function searchQuestions(list: Question[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter((item) => {
    const blob = [
      item.id,
      item.domain,
      item.content,
      item.subcontent,
      item.phenomenon,
      item.model,
      ...(item.laws || []),
      item.competency_code,
      item.competency_text,
      item.skill_code,
      item.skill_text,
      item.reasoning,
      item.reasoning_core,
      item.bloom,
      item.math_category,
      item.math_core,
      item.learning_role,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return blob.includes(q);
  });
}
