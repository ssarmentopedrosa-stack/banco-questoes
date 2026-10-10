import fisicaRaw from "./questoes.json";

export type Option = { letter: string; text: string; img?: { src: string; width: number; height: number } };
export type Figure = { src: string; kind: string; label: string; width: number; height: number };
export type Explanation = { markdown: string; keyConcept: string; commonMistake: string; lowConfidence: boolean; author: string; reviewed?: boolean };
export type Question = {
  id: string;
  year: number;
  area: string;
  content: string | null;
  demand: string | null;
  statement: string; // pode conter marcadores [[FIG n]] (figura n no meio do enunciado)
  options: Option[] | null; // null → alternativas só na figura
  figures: Figure[];
  number: number;
  booklet: number;
  answer: string;
  explanation: Explanation | null;
  textoDoPdf?: boolean;
};

export type Raw = { meta: { total: number; porAno: Record<string, number>; [k: string]: unknown }; questions: Question[] };
export type TopicInfo = { name: string; emoji: string; badge: string; cor: string; corClara: string; texto: string };
export type MateriaId = "fisica" | "biologia" | "quimica" | "geografia" | "natureza";
export type MateriaInfo = {
  id: MateriaId;
  nome: string;
  emoji: string;
  /** chave do progresso no localStorage. A de Física é a MESMA da versão só-Física (ninguém perde progresso). */
  key: string;
  subtitulo: string;
  area: string;
  topicos: TopicInfo[];
  /** pesos fixos do simulado (senão: proporcional ao banco) */
  peso?: { mini: Record<string, number>; completo: Record<string, number> };
  fraseAcerto: string;
  fraseOtimo: string;
  nivel3: string;
};

const C = {
  azul: { cor: "bg-azul", corClara: "bg-azul-claro", texto: "text-azul" },
  laranja: { cor: "bg-laranja", corClara: "bg-laranja-claro", texto: "text-laranja-escuro" },
  teal: { cor: "bg-teal", corClara: "bg-teal-claro", texto: "text-teal" },
  vermelho: { cor: "bg-vermelho", corClara: "bg-vermelho-claro", texto: "text-vermelho" },
  roxo: { cor: "bg-roxo", corClara: "bg-roxo-claro", texto: "text-roxo" },
  noite: { cor: "bg-noite", corClara: "bg-ceu", texto: "text-noite" },
};
const t = (name: string, emoji: string, badge: string, c: keyof typeof C): TopicInfo => ({ name, emoji, badge, ...C[c] });

export const MATERIAS: MateriaInfo[] = [
  {
    id: "fisica", nome: "Física", emoji: "🚀", key: "tigrao-enem-fisica-v1", subtitulo: "Física, questões oficiais", area: "Ciências da Natureza",
    topicos: [
      t("Mecânica", "🚀", "Mestre de Newton", "azul"),
      t("Eletricidade e Magnetismo", "⚡", "Fera dos Circuitos", "laranja"),
      t("Ondulatória", "🌊", "Surfista de Ondas", "teal"),
      t("Termologia", "🔥", "Senhor do Calor", "vermelho"),
      t("Óptica", "🔭", "Olhar de Lente", "roxo"),
      t("Física Moderna", "⚛️", "Amigo de Einstein", "noite"),
    ],
    peso: {
      mini: { "Mecânica": 4, "Eletricidade e Magnetismo": 3, "Ondulatória": 3, "Termologia": 3, "Óptica": 1, "Física Moderna": 1 },
      completo: { "Mecânica": 13, "Eletricidade e Magnetismo": 10, "Ondulatória": 8, "Termologia": 8, "Óptica": 4, "Física Moderna": 2 },
    },
    fraseAcerto: "Isso! Física de quem vai passar!", fraseOtimo: "Mandou muito bem! Física de quem vai longe no ENEM! 🚀", nivel3: "Cientista da Natureza",
  },
  {
    id: "biologia", nome: "Biologia", emoji: "🧬", key: "tigrao-enem-biologia-v1", subtitulo: "Biologia, questões oficiais", area: "Ciências da Natureza",
    topicos: [
      t("Ecologia e Meio Ambiente", "🌳", "Guardião dos Biomas", "teal"),
      t("Genética e Biotecnologia", "🧬", "Decifrador do DNA", "roxo"),
      t("Citologia e Bioquímica", "🔬", "Olho de Microscópio", "azul"),
      t("Corpo Humano e Saúde", "🫀", "Doutor do Corpo", "vermelho"),
      t("Botânica e Zoologia", "🐸", "Amigo dos Seres Vivos", "laranja"),
      t("Evolução", "🦖", "Neto de Darwin", "noite"),
    ],
    fraseAcerto: "Isso! Biologia de quem vai passar!", fraseOtimo: "Mandou muito bem! Biologia afiada pro ENEM! 🧬", nivel3: "Cientista da Natureza",
  },
  {
    id: "quimica", nome: "Química", emoji: "⚗️", key: "tigrao-enem-quimica-v1", subtitulo: "Química, questões oficiais", area: "Ciências da Natureza",
    topicos: [
      t("Química Geral e Ambiental", "🧪", "Alquimista do Lab", "teal"),
      t("Química Orgânica", "🛢️", "Rei do Carbono", "noite"),
      t("Equilíbrio Químico e pH", "⚖️", "Mestre do pH", "roxo"),
      t("Estequiometria e Cálculos", "🧮", "Contador de Mols", "azul"),
      t("Soluções e Concentração", "💧", "Fera das Soluções", "laranja"),
      t("Eletroquímica", "🔋", "Senhor das Pilhas", "vermelho"),
      t("Termoquímica e Cinética", "🔥", "Domador da Reação", "vermelho"),
    ],
    fraseAcerto: "Isso! Química de quem vai passar!", fraseOtimo: "Mandou muito bem! Reação perfeita rumo ao ENEM! ⚗️", nivel3: "Cientista da Natureza",
  },
  {
    id: "geografia", nome: "Geografia", emoji: "🌎", key: "tigrao-enem-geografia-v1", subtitulo: "Geografia, questões oficiais", area: "Ciências Humanas",
    topicos: [
      t("Indústria, Economia e Globalização", "🏭", "Fera da Globalização", "azul"),
      t("Urbanização e População", "🏙️", "Mestre das Cidades", "laranja"),
      t("Espaço Agrário", "🌾", "Raiz do Campo", "teal"),
      t("Clima e Hidrografia", "⛈️", "Senhor do Tempo", "azul"),
      t("Relevo, Solos e Geologia", "⛰️", "Desbravador do Relevo", "vermelho"),
      t("Meio Ambiente e Recursos", "🌳", "Guardião do Planeta", "teal"),
      t("Geopolítica e Conflitos", "🌐", "Estrategista Global", "roxo"),
      t("Cartografia e Geotecnologias", "🗺️", "Olho de Satélite", "noite"),
    ],
    fraseAcerto: "Isso! Geografia de quem vai passar!", fraseOtimo: "Mandou muito bem! Você tá no mapa do ENEM! 🌎", nivel3: "Explorador do Mundo",
  },
  {
    id: "natureza", nome: "Ciências da Natureza", emoji: "🔬", key: "tigrao-enem-natureza-v1", subtitulo: "Física + Biologia + Química, questões oficiais",
    area: "Ciências da Natureza",
    topicos: [t("Física", "🚀", "Físico de Plantão", "azul"), t("Biologia", "🧬", "Biólogo de Plantão", "teal"), t("Química", "⚗️", "Químico de Plantão", "laranja")],
    peso: { mini: { "Física": 5, "Biologia": 5, "Química": 5 }, completo: { "Física": 15, "Biologia": 15, "Química": 15 } },
    fraseAcerto: "Isso! Ciências da Natureza de quem vai passar!", fraseOtimo: "Mandou muito bem! Prova de Natureza dominada! 🔬", nivel3: "Cientista da Natureza",
  },
];
export const materiaInfo = (id: string) => MATERIAS.find((m) => m.id === id) ?? MATERIAS[0];

/* ---------- matéria ativa (ligações "vivas": quem importa vê o valor atual) ---------- */
export let MATERIA: MateriaInfo = MATERIAS[0];
export let META: Raw["meta"] = (fisicaRaw as unknown as Raw).meta;
export let QUESTIONS: Question[] = (fisicaRaw as unknown as Raw).questions;
export let TOPICS: TopicInfo[] = [];
export let YEARS: number[] = [];
export const LETTERS = ["A", "B", "C", "D", "E"];
export const FISICA_RAW = fisicaRaw as unknown as Raw;

export function setMateria(id: MateriaId, raw: Raw) {
  MATERIA = materiaInfo(id);
  META = raw.meta;
  QUESTIONS = raw.questions;
  TOPICS = MATERIA.topicos.filter((tp) => QUESTIONS.some((q) => q.area === tp.name));
  YEARS = [...new Set(QUESTIONS.map((q) => q.year))].sort((a, b) => a - b);
}
setMateria("fisica", FISICA_RAW);

/** Junta Física + Biologia + Química (tema = matéria; subtema = tema original). */
export function juntarNatureza(partes: { nome: string; raw: Raw }[]): Raw {
  const vistos = new Set<string>();
  const questions: Question[] = [];
  for (const { nome, raw } of partes) {
    for (const q of raw.questions) {
      if (vistos.has(q.id)) continue;
      vistos.add(q.id);
      questions.push({ ...q, area: nome, content: q.area });
    }
  }
  const porAno: Record<string, number> = {};
  questions.forEach((q) => (porAno[q.year] = (porAno[q.year] ?? 0) + 1));
  return { meta: { total: questions.length, porAno }, questions };
}

export const topicInfo = (name: string) => TOPICS.find((tp) => tp.name === name) ?? TOPICS[0];
export const byTopic = (name: string) => QUESTIONS.filter((q) => q.area === name);

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
export const subtemaNome = (c: string | null) =>
  c ? SUBTEMAS[c] ?? (/[a-zà-ú]/.test(c) ? c : c.charAt(0) + c.slice(1).toLowerCase().replace(/_/g, " ")) : "Geral";

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
