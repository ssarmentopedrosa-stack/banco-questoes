import raw from "./questoes.json";

export type Option = { letter: string; text: string };
export type Figure = { src: string; kind: string; label: string; width: number; height: number };
export type Explanation = { markdown: string; keyConcept: string; commonMistake: string; lowConfidence: boolean; author: string; reviewed?: boolean };
export type Question = {
  id: string;
  year: number;
  area: string;
  content: string | null;
  demand: string | null;
  statement: string;
  options: Option[] | null; // null → alternativas só na figura
  figures: Figure[];
  number: number;
  booklet: number;
  answer: string;
  explanation: Explanation | null;
};

type Raw = { meta: { total: number; exportVersion: string; porAno: Record<string, number> }; questions: Question[] };
const data = raw as unknown as Raw;
export const META = data.meta;
export const QUESTIONS = data.questions;
export const LETTERS = ["A", "B", "C", "D", "E"];

export type TopicInfo = { name: string; emoji: string; badge: string; cor: string; corClara: string; texto: string };

const ALL_TOPICS: TopicInfo[] = [
  { name: "Mecânica", emoji: "🚀", badge: "Mestre de Newton", cor: "bg-azul", corClara: "bg-azul-claro", texto: "text-azul" },
  { name: "Eletricidade e Magnetismo", emoji: "⚡", badge: "Fera dos Circuitos", cor: "bg-laranja", corClara: "bg-laranja-claro", texto: "text-laranja-escuro" },
  { name: "Ondulatória", emoji: "🌊", badge: "Surfista de Ondas", cor: "bg-teal", corClara: "bg-teal-claro", texto: "text-teal" },
  { name: "Termologia", emoji: "🔥", badge: "Senhor do Calor", cor: "bg-vermelho", corClara: "bg-vermelho-claro", texto: "text-vermelho" },
  { name: "Óptica", emoji: "🔭", badge: "Olhar de Lente", cor: "bg-roxo", corClara: "bg-roxo-claro", texto: "text-roxo" },
  { name: "Física Moderna", emoji: "⚛️", badge: "Amigo de Einstein", cor: "bg-noite", corClara: "bg-ceu", texto: "text-noite" },
];

export const TOPICS = ALL_TOPICS.filter((t) => QUESTIONS.some((q) => q.area === t.name));
export const topicInfo = (name: string) => TOPICS.find((t) => t.name === name) ?? TOPICS[0];
export const byTopic = (name: string) => QUESTIONS.filter((q) => q.area === name);
export const YEARS = [...new Set(QUESTIONS.map((q) => q.year))].sort((a, b) => a - b);

/** "1 medalha" / "2 medalhas" */
export const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

export const optionText = (q: Question, letter: string | null) => {
  if (!letter) return "sem resposta";
  const o = q.options?.find((x) => x.letter === letter);
  return o ? o.text : "alternativa na figura";
};

/** Subtemas (campo "content" do banco) com nome legível. */
const SUBTEMAS: Record<string, string> = {
  CINEMATICA: "Cinemática", DINAMICA: "Dinâmica", ENERGIA: "Energia", ESTATICA: "Estática", HIDROSTATICA: "Hidrostática",
  GRAVITACAO: "Gravitação", IMPULSO_QUANTIDADE_MOVIMENTO: "Impulso e quantidade de movimento", OSCILACOES: "Oscilações",
  CIRCUITOS: "Circuitos", ENERGIA_ELETRICA: "Energia elétrica", INDUCAO_ELETROMAGNETICA: "Indução eletromagnética",
  ELETROSTATICA: "Eletrostática", CARGA_ELETRICA: "Carga elétrica", MAGNETISMO: "Magnetismo",
  SOM: "Som", FENOMENOS_ONDULATORIOS: "Fenômenos ondulatórios", ONDAS_ELETROMAGNETICAS: "Ondas eletromagnéticas",
  ESPECTRO_ELETROMAGNETICO: "Espectro eletromagnético", CARACTERISTICAS_ONDAS: "Características das ondas",
  CALORIMETRIA: "Calorimetria", MAQUINAS_TERMICAS: "Máquinas térmicas", TRANSFERENCIA_CALOR: "Transferência de calor",
  MUDANCA_DE_FASE: "Mudança de fase", GASES: "Gases", DILATACAO_TERMICA: "Dilatação térmica",
  REFRACAO: "Refração", ESPELHOS: "Espelhos", REFLEXAO: "Reflexão", NATUREZA_DA_LUZ: "Natureza da luz", PROPAGACAO_RETILINEA: "Propagação retilínea",
  RADIOATIVIDADE: "Radioatividade", QUANTIZACAO: "Quantização",
};
export const subtemaNome = (c: string | null) => (c ? SUBTEMAS[c] ?? c.charAt(0) + c.slice(1).toLowerCase().replace(/_/g, " ") : "Outros");

/** Texto alternativo das figuras (descreve de onde é a imagem; o enunciado vem logo acima). */
export const figuraAlt = (q: Question, f: Figure, i: number) =>
  f.kind === "alternativas"
    ? `Imagem com as alternativas A a E da questão ${q.number} do ENEM ${q.year}`
    : `Figura ${i + 1} do enunciado da questão ${q.number} do ENEM ${q.year} (${q.area}${q.content ? ", " + subtemaNome(q.content) : ""}). O texto do enunciado está acima.`;

/** Dicas do Tigrão: só trechos da resolução existente (conceito-chave e ideia central). Sem resolução, sem dica. */
export function dicas(q: Question): string[] {
  const ex = q.explanation;
  if (!ex) return [];
  const out: string[] = [];
  if (ex.keyConcept) out.push(`Conceito-chave: ${ex.keyConcept}.`);
  const m = ex.markdown.match(/\*\*Ideia central:\*\*\s*([^\n]+)/);
  if (m) out.push(m[1].trim());
  return out;
}
