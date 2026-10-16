import { MATERIA, QUESTIONS, type Question } from "./data";

/** Quiz em andamento salvo no aparelho, para retomar depois de recarregar a página. */
export type Retomada = {
  v: 1; materia: string; mode: string; topic: string | null; ids: string[]; revisao: string[];
  respostas: (string | null)[]; // uma por questão já respondida/avançada
  nDicas: number; xp: number; inicio: number; salvo: number;
};
const MODOS = ["pratica", "revisao", "inteligente", "rapido", "mini", "completo"];
const MAX_IDADE = 7 * 24 * 3600 * 1000;
const chave = () => MATERIA.key.replace(/-v1$/, "") + "-quiz-v1";

/** Valida o objeto salvo; qualquer coisa estranha (versão, matéria, ids inexistentes, tamanhos) descarta. */
export function validarRetomada(o: unknown, agora = Date.now(), qs: Question[] = QUESTIONS, materia = MATERIA.id, limiteSim?: (mode: string) => number): Retomada | null {
  if (!o || typeof o !== "object") return null;
  const r = o as Retomada;
  if (r.v !== 1 || r.materia !== materia || !MODOS.includes(r.mode)) return null;
  if (!Array.isArray(r.ids) || !r.ids.length || !Array.isArray(r.respostas) || !Array.isArray(r.revisao)) return null;
  if (r.respostas.length >= r.ids.length) return null; // terminado
  if (r.respostas.some((x) => x !== null && !/^[A-E]$/.test(String(x)))) return null;
  const ids = new Set(qs.map((q) => q.id));
  if (!r.ids.every((id) => typeof id === "string" && ids.has(id))) return null;
  if (typeof r.inicio !== "number" || typeof r.salvo !== "number" || agora - r.salvo > MAX_IDADE || r.inicio > agora + 60000) return null;
  if (limiteSim && (r.mode === "mini" || r.mode === "completo") && agora - r.inicio >= limiteSim(r.mode) * 1000) return null; // tempo do simulado acabou
  if (typeof r.nDicas !== "number" || typeof r.xp !== "number") return null;
  return r;
}
export function lerRetomada(limiteSim?: (mode: string) => number): Retomada | null {
  try {
    const raw = localStorage.getItem(chave());
    if (!raw) return null;
    const r = validarRetomada(JSON.parse(raw), Date.now(), QUESTIONS, MATERIA.id, limiteSim);
    if (!r) localStorage.removeItem(chave());
    return r;
  } catch {
    return null;
  }
}
export function salvarRetomada(r: Omit<Retomada, "v" | "materia" | "salvo">) {
  try { localStorage.setItem(chave(), JSON.stringify({ v: 1, materia: MATERIA.id, salvo: Date.now(), ...r })); } catch { /* cheio/privado */ }
}
export function limparRetomada() {
  try { localStorage.removeItem(chave()); } catch { /* */ }
}
export const questoesDe = (ids: string[]) => ids.map((id) => QUESTIONS.find((q) => q.id === id)!);
