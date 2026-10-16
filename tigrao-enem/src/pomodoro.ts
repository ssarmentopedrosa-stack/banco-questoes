import { MATERIA } from "./data";
import { POMO_CICLOS_LONGA, type PomoCfg } from "./game";

/** Relógio do Pomodoro guardado por carimbos de tempo (nunca por contagem de ticks): sobrevive a recarregar e a aba em segundo plano. */
export type Fase = "foco" | "pausa" | "longa";
export type Pomo = {
  v: 1; fase: Fase;
  inicio: number;           // quando a fase começou (ms epoch)
  duracao: number;          // ms
  pausadoEm: number | null; // pausado pelo usuário desde
  pausadoMs: number;        // total já pausado nesta fase
  ciclos: number;           // focos completos nesta sessão
  fim: boolean;             // pausa acabou e espera o usuário começar o próximo foco
};
const chave = () => MATERIA.key.replace(/-v1$/, "") + "-pomodoro-v1";
export const duracaoDe = (f: Fase, c: PomoCfg) => (f === "foco" ? c.foco : f === "pausa" ? c.pausa : c.longa) * 60000;

export const iniciarFoco = (c: PomoCfg, agora: number, ciclos = 0): Pomo => ({ v: 1, fase: "foco", inicio: agora, duracao: duracaoDe("foco", c), pausadoEm: null, pausadoMs: 0, ciclos, fim: false });
export function restante(p: Pomo, agora: number): number {
  const corrido = (p.pausadoEm ?? agora) - p.inicio - p.pausadoMs;
  return Math.max(0, p.duracao - corrido);
}
/** Instante (ms epoch) em que a fase acaba, considerando as pausas. */
export const terminoDe = (p: Pomo) => p.inicio + p.pausadoMs + p.duracao;
export const pausar = (p: Pomo, agora: number): Pomo => (p.pausadoEm || p.fim ? p : { ...p, pausadoEm: agora });
export const continuar = (p: Pomo, agora: number): Pomo => (p.pausadoEm ? { ...p, pausadoMs: p.pausadoMs + (agora - p.pausadoEm), pausadoEm: null } : p);

/** Avança o relógio até "agora". Foco que terminou vira pausa (curta, ou longa a cada 4 ciclos) começando no fim exato do foco.
 *  Pausa que terminou fica esperando o usuário começar o próximo foco (nunca começa foco sozinho). */
export function avancar(p: Pomo, agora: number, c: PomoCfg): { p: Pomo; focosConcluidos: number; mudou: boolean } {
  if (p.pausadoEm || p.fim || restante(p, agora) > 0) return { p, focosConcluidos: 0, mudou: false };
  const t = terminoDe(p);
  if (p.fase === "foco") {
    const ciclos = p.ciclos + 1;
    const fase: Fase = ciclos % POMO_CICLOS_LONGA === 0 ? "longa" : "pausa";
    let np: Pomo = { ...p, fase, inicio: t, duracao: duracaoDe(fase, c), pausadoMs: 0, ciclos };
    if (restante(np, agora) <= 0) np = { ...np, fim: true };
    return { p: np, focosConcluidos: 1, mudou: true };
  }
  return { p: { ...p, fim: true }, focosConcluidos: 0, mudou: true };
}

export function validarPomo(o: unknown, agora = Date.now()): Pomo | null {
  if (!o || typeof o !== "object") return null;
  const p = o as Pomo;
  if (p.v !== 1 || !["foco", "pausa", "longa"].includes(p.fase)) return null;
  for (const n of [p.inicio, p.duracao, p.pausadoMs, p.ciclos]) if (typeof n !== "number" || !Number.isFinite(n) || n < 0) return null;
  if (p.pausadoEm !== null && typeof p.pausadoEm !== "number") return null;
  if (p.inicio > agora + 60000 || p.duracao > 3 * 3600000 || agora - p.inicio > 24 * 3600000) return null; // relógio estranho ou sessão de ontem
  return { ...p, fim: !!p.fim };
}
export function lerPomo(): Pomo | null {
  try {
    const raw = localStorage.getItem(chave());
    const p = raw ? validarPomo(JSON.parse(raw)) : null;
    if (raw && !p) localStorage.removeItem(chave());
    return p;
  } catch { return null; }
}
export function salvarPomo(p: Pomo | null) {
  try { if (p) localStorage.setItem(chave(), JSON.stringify(p)); else localStorage.removeItem(chave()); } catch { /* */ }
}
export const mmss = (ms: number) => { const s = Math.ceil(ms / 1000); return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; };
