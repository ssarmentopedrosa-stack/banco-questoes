/**
 * Sons do Tigrão: tudo sintetizado na hora com a Web Audio API (sem arquivos de áudio, sem licença).
 * - O AudioContext só é criado/retomado no 1º toque do usuário (regras de autoplay do Chrome Android e do iOS Safari).
 * - Durante simulados, só tocam o início e o fim (nada que entregue acerto/erro antes do final).
 * - Preferências (som, volume, vibração) valem para o aparelho todo, em `tigrao-enem-som`, separadas do progresso.
 */
import { useSyncExternalStore } from "react";

export type Som =
  | "toque" | "acerto" | "erro" | "combo" | "surpresa" | "recuperou" | "meta" | "nivel" | "simInicio" | "simFim" | "abertura";
export type SomPrefs = { ligado: boolean; volume: number; vibrar: boolean };

export const SOM_KEY = "tigrao-enem-som";
export const SOM_PADRAO: SomPrefs = { ligado: true, volume: 0.4, vibrar: true };

/* ---------- preferências (store externo pro React) ---------- */
function ler(): SomPrefs {
  try {
    const o = JSON.parse(localStorage.getItem(SOM_KEY) ?? "null");
    if (!o || typeof o !== "object") return { ...SOM_PADRAO };
    const v = typeof o.volume === "number" && isFinite(o.volume) ? Math.min(1, Math.max(0, o.volume)) : SOM_PADRAO.volume;
    return { ligado: typeof o.ligado === "boolean" ? o.ligado : SOM_PADRAO.ligado, volume: v, vibrar: typeof o.vibrar === "boolean" ? o.vibrar : SOM_PADRAO.vibrar };
  } catch {
    return { ...SOM_PADRAO };
  }
}
let prefs: SomPrefs = typeof window === "undefined" ? { ...SOM_PADRAO } : ler();
const ouvintes = new Set<() => void>();
export function somPrefs() { return prefs; }
export function setSomPrefs(p: Partial<SomPrefs>) {
  prefs = { ...prefs, ...p };
  try { localStorage.setItem(SOM_KEY, JSON.stringify(prefs)); } catch { /* sem localStorage */ }
  if (master && ctx) master.gain.setTargetAtTime(ganhoMestre(), ctx.currentTime, 0.02);
  ouvintes.forEach((f) => f());
}
export function useSom(): SomPrefs {
  return useSyncExternalStore((f) => { ouvintes.add(f); return () => ouvintes.delete(f); }, () => prefs, () => prefs);
}

/* ---------- motor de áudio ---------- */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let ruido: AudioBuffer | null = null;
let modoProva = false;
let ultimoSom = 0;
let aberturaTocada = false;
const ganhoMestre = () => (prefs.ligado ? prefs.volume * 0.7 : 0);
const log = (s: string) => { const w = window as unknown as { __tigraoSons?: string[] }; (w.__tigraoSons ??= []).push(s); };

function contexto(): AudioContext | null {
  if (ctx) return ctx;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  try {
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = ganhoMestre();
    // compressor leve: evita estouro quando dois sons se sobrepõem
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12; comp.ratio.value = 4;
    master.connect(comp).connect(ctx.destination);
  } catch {
    ctx = null;
  }
  return ctx;
}

/** Chamado no 1º toque/tecla: cria e "destrava" o áudio (iOS precisa tocar algo dentro do gesto). */
function destravar() {
  const c = contexto();
  if (!c) return;
  if (c.state !== "running") c.resume().catch(() => {});
  try {
    const b = c.createBuffer(1, 1, 22050);
    const src = c.createBufferSource();
    src.buffer = b; src.connect(c.destination); src.start(0);
  } catch { /* ok */ }
  if (!aberturaTocada) {
    aberturaTocada = true;
    let ja = false;
    try { ja = sessionStorage.getItem("tigrao-som-abertura") === "1"; sessionStorage.setItem("tigrao-som-abertura", "1"); } catch { /* ok */ }
    if (!ja) { ultimoSom = performance.now() + 300; setTimeout(() => tocar("abertura"), 60); }
  }
}
let instalado = false;
export function instalarSom() {
  if (instalado || typeof window === "undefined") return;
  instalado = true;
  const h = () => destravar();
  for (const ev of ["pointerdown", "touchend", "keydown", "click"]) window.addEventListener(ev, h, { capture: true, passive: true });
  // iOS suspende o contexto ao trocar de app: retoma no próximo toque
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && ctx?.state !== "running") ctx?.resume().catch(() => {}); });
  // som de toque em botões (bolha: roda depois dos handlers do React, que já podem ter tocado algo mais importante)
  document.addEventListener("click", (e) => {
    const el = (e.target as Element | null)?.closest?.("button, [role=radio], [role=switch], label");
    if (!el || el.closest("[data-som=off]") || (el as HTMLButtonElement).disabled) return;
    tocar("toque");
  });
}

/** Simulado em andamento: silencia tudo, menos início e fim. */
export function setModoProva(v: boolean) { modoProva = v; }

function reducaoMovimento() {
  return !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}
export const vibracaoSuportada = () => typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
export function vibrar(padrao: number | number[]) {
  if (modoProva || !prefs.vibrar || reducaoMovimento() || !vibracaoSuportada()) return;
  try { navigator.vibrate(padrao); } catch { /* ok */ }
}

/* ---------- síntese ---------- */
type Onda = OscillatorType;
function nota(c: AudioContext, f: number, t: number, dur: number, o: { tipo?: Onda; vol?: number; ate?: number; ataque?: number } = {}) {
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = o.tipo ?? "sine";
  osc.frequency.setValueAtTime(f, t);
  if (o.ate) osc.frequency.exponentialRampToValueAtTime(o.ate, t + dur);
  const v = o.vol ?? 0.3;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v, t + (o.ataque ?? 0.012));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(master!);
  osc.start(t); osc.stop(t + dur + 0.05);
}
function sopro(c: AudioContext, t: number, dur: number, f0: number, f1: number, vol: number) {
  if (!ruido) {
    ruido = c.createBuffer(1, Math.floor(c.sampleRate * 0.8), c.sampleRate);
    const d = ruido.getChannelData(0);
    for (let k = 0; k < d.length; k++) d[k] = Math.random() * 2 - 1;
  }
  const src = c.createBufferSource();
  src.buffer = ruido;
  const bp = c.createBiquadFilter();
  bp.type = "bandpass"; bp.Q.value = 1.2;
  bp.frequency.setValueAtTime(f0, t); bp.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.04); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(bp).connect(g).connect(master!);
  src.start(t); src.stop(t + dur + 0.05);
}
const N = { C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880, B5: 987.77, C6: 1046.5, D6: 1174.66, E6: 1318.51, G6: 1567.98, C7: 2093 };
const arpejo = (c: AudioContext, t: number, fs: number[], passo: number, dur: number, o: { tipo?: Onda; vol?: number } = {}) =>
  fs.forEach((f, k) => nota(c, f, t + k * passo, dur, o));

const RECEITAS: Record<Som, (c: AudioContext, t: number) => void> = {
  // clique curtinho e macio
  toque: (c, t) => nota(c, 1400, t, 0.045, { vol: 0.08, ate: 1100, ataque: 0.004 }),
  // "plim-plim" alegre, subindo
  acerto: (c, t) => { arpejo(c, t, [N.C6, N.E6, N.G6], 0.065, 0.22, { tipo: "triangle", vol: 0.28 }); nota(c, N.C7, t + 0.2, 0.3, { vol: 0.08 }); },
  // gentil: duas notas graves e suaves descendo, sem buzina
  erro: (c, t) => { nota(c, 392, t, 0.2, { vol: 0.2, tipo: "sine" }); nota(c, 311.13, t + 0.13, 0.3, { vol: 0.18, tipo: "sine", ate: 293.66 }); },
  // sequência/combo: escadinha rápida com brilho
  combo: (c, t) => { arpejo(c, t, [N.C5, N.E5, N.G5, N.C6, N.E6], 0.05, 0.16, { tipo: "triangle", vol: 0.24 }); sopro(c, t + 0.2, 0.25, 3000, 8000, 0.05); },
  // bônus surpresa: brilhinhos agudos
  surpresa: (c, t) => { arpejo(c, t, [N.G6, N.C7, N.E6, N.G6, N.C7], 0.045, 0.14, { vol: 0.16 }); nota(c, N.E6, t + 0.26, 0.35, { tipo: "triangle", vol: 0.18 }); },
  // erro recuperado: "vuuup" subindo + acorde de acerto
  recuperou: (c, t) => { nota(c, 380, t, 0.22, { vol: 0.16, ate: 1200, tipo: "triangle" }); arpejo(c, t + 0.18, [N.E6, N.G6, N.C7], 0.06, 0.25, { tipo: "triangle", vol: 0.22 }); },
  // meta do dia: mini-fanfarra
  meta: (c, t) => {
    arpejo(c, t, [N.G5, N.C6, N.E6], 0.11, 0.16, { tipo: "triangle", vol: 0.26 });
    [N.C6, N.E6, N.G6].forEach((f) => nota(c, f, t + 0.36, 0.6, { tipo: "triangle", vol: 0.14 }));
    nota(c, 130.81, t + 0.36, 0.55, { tipo: "square", vol: 0.04 });
  },
  // subiu de nível / domínio: arpejo longo + acorde
  nivel: (c, t) => {
    arpejo(c, t, [N.C5, N.E5, N.G5, N.C6, N.E6, N.G6], 0.055, 0.18, { tipo: "triangle", vol: 0.2 });
    [N.C6, N.G6, N.C7].forEach((f) => nota(c, f, t + 0.33, 0.5, { vol: 0.1 }));
  },
  // simulado: "bip bip biiip" de largada
  simInicio: (c, t) => { nota(c, 660, t, 0.1, { vol: 0.18 }); nota(c, 660, t + 0.22, 0.1, { vol: 0.18 }); nota(c, 990, t + 0.44, 0.28, { vol: 0.22, tipo: "triangle" }); },
  // fim do simulado: cadência que "fecha" (sem dizer se foi bem ou mal)
  simFim: (c, t) => { arpejo(c, t, [N.G5, N.A5, N.B5], 0.1, 0.14, { tipo: "triangle", vol: 0.2 }); [N.C6, N.E6, N.G6].forEach((f) => nota(c, f, t + 0.3, 0.55, { tipo: "triangle", vol: 0.12 })); },
  // abertura: "rrrau" curtinho do Tigrão (rosnado filtrado, bem baixo) + plim
  abertura: (c, t) => {
    const osc = c.createOscillator();
    const lp = c.createBiquadFilter();
    const g = c.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(95, t); osc.frequency.linearRampToValueAtTime(170, t + 0.18); osc.frequency.exponentialRampToValueAtTime(85, t + 0.5);
    const trem = c.createOscillator(); const tg = c.createGain();
    trem.frequency.value = 28; tg.gain.value = 12; trem.connect(tg).connect(osc.frequency);
    lp.type = "lowpass"; lp.frequency.setValueAtTime(500, t); lp.frequency.linearRampToValueAtTime(1300, t + 0.18); lp.frequency.exponentialRampToValueAtTime(400, t + 0.5);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.52);
    osc.connect(lp).connect(g).connect(master!);
    osc.start(t); trem.start(t); osc.stop(t + 0.6); trem.stop(t + 0.6);
    sopro(c, t, 0.45, 700, 1500, 0.05);
    arpejo(c, t + 0.55, [N.G5, N.C6], 0.09, 0.22, { tipo: "triangle", vol: 0.16 });
  },
};

export function tocar(s: Som) {
  if (typeof window === "undefined") return;
  if (modoProva && s !== "simInicio" && s !== "simFim") return;
  if (!prefs.ligado || prefs.volume <= 0) return;
  const agora = performance.now();
  if (s === "toque" && agora - ultimoSom < 150) return; // já tocou algo mais importante neste clique
  const c = contexto();
  if (!c || !master) return;
  if (c.state === "suspended") c.resume().catch(() => {});
  ultimoSom = agora;
  try { RECEITAS[s](c, c.currentTime + 0.01); log(s); } catch { /* áudio indisponível: segue sem som */ }
}
