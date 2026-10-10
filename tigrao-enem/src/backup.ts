import { normalize, type State } from "./game";
import { MATERIA, materiaInfo } from "./data";

/** Código de backup do progresso: "TGR1." + base64url(deflate(JSON)) (ou "TGR0." sem compressão). */
const b64url = (bytes: Uint8Array) => {
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const fromB64url = (s: string) => {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};
const pipe = async (bytes: Uint8Array, t: CompressionStream | DecompressionStream) =>
  new Uint8Array(await new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(t)).arrayBuffer());

export async function exportCode(s: State): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify({ app: "tigrao-enem", v: 3, materia: MATERIA.id, s }));
  if (typeof CompressionStream !== "undefined") return "TGR1." + b64url(await pipe(json, new CompressionStream("deflate-raw")));
  return "TGR0." + b64url(json);
}

export async function importCode(texto: string): Promise<State> {
  const code = texto.trim();
  let json: string;
  if (code.startsWith("{")) json = code; // arquivo .json
  else if (code.startsWith("TGR1.")) {
    if (typeof DecompressionStream === "undefined") throw new Error("Este navegador não abre esse código. Use o arquivo.");
    json = new TextDecoder().decode(await pipe(fromB64url(code.slice(5)), new DecompressionStream("deflate-raw")));
  } else if (code.startsWith("TGR0.")) json = new TextDecoder().decode(fromB64url(code.slice(5)));
  else throw new Error("Código inválido.");
  const obj = JSON.parse(json);
  const s = obj?.app === "tigrao-enem" ? obj.s : obj;
  const materia = obj?.app === "tigrao-enem" && typeof obj.materia === "string" ? obj.materia : "fisica"; // códigos antigos = Física
  if (materia !== MATERIA.id) throw new Error(`Esse código é do progresso de ${materiaInfo(materia).nome}. Troque para essa matéria antes de importar.`);
  if (!s || typeof s.xp !== "number" || typeof s.answers !== "object") throw new Error("Esse código não é um progresso do Tigrão ENEM.");
  return normalize(s);
}

export function baixarArquivo(nome: string, conteudo: string) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
