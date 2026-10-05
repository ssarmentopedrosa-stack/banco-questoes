import raw from "./questoes.json";

export type Option = { letter: string; text: string };
export type Figure = { src: string; kind: string; label: string; width: number; height: number };
export type Explanation = { markdown: string; keyConcept: string; commonMistake: string; lowConfidence: boolean; author: string };
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
