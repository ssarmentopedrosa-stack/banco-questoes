/**
 * Resolução em tópicos: Ideia-chave / Como resolver / Por que as outras estão erradas / Resposta.
 * É só um PARSER do texto que já existe (Física: seções "Ideia central/Resolução/Por que X/Distratoras";
 * matérias novas: 3–6 frases terminando em "**Resposta: X**"). Não reescreve nem muda o gabarito.
 * Sem dependências (o teste scripts/checa_resolucoes.mjs compila este arquivo com tsc e roda no Node).
 */
export type ExpMin = { markdown: string; keyConcept: string };
export type Estruturada = { ideia: string[]; conceito: string; passos: string[]; outras: string[]; resposta: string; porQue: string };

const FIM = /(?<=[.!?…])\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÀÇ(“"*])/;
const limpa = (s: string) => s.replace(/\s+/g, " ").trim();
/** Divide em frases sem quebrar números (0,8 V.), abreviações seguidas de minúscula etc. */
export function frases(t: string): string[] {
  return limpa(t).split(FIM).map((s) => s.trim()).filter(Boolean);
}
/** Frase que fala das alternativas erradas: "(A)", "(B, C)", "alternativa A", "C (10 s) sai de…". */
const DISTRATORA = /\((?:[A-E](?:\s*,\s*|\s+e\s+|\s+ou\s+))*[A-E]\)|\balternativas?\s+[A-E]\b|\bletras?\s+[A-E]\b|^(?:[A-E](?:\s*,\s*|\s+e\s+))*[A-E]\s*(?:\(|:|—|–)|\b(?:demais|outras) (?:alternativas|opções)\b|^[A-E] (?:está|estão|erra|seria|confunde|inverte|troca)\b|\b(?:descarta|elimina|exclui)\w*\s+(?:as\s+)?(?:alternativas\s+)?[A-E]\b/;
export const ehDistratora = (s: string) => DISTRATORA.test(s);

function itens(bloco: string): string[] {
  const linhas = bloco.split("\n").map((l) => l.trim()).filter(Boolean);
  if (linhas.some((l) => l.startsWith("- "))) {
    const out: string[] = [];
    for (const l of linhas) {
      if (l.startsWith("- ")) out.push(limpa(l.slice(2)));
      else out.push(...frases(l));
    }
    return out;
  }
  return frases(linhas.join(" "));
}

export function estruturar(ex: ExpMin, answer: string): Estruturada {
  // "**Resolução** (figura: …):" → "**Resolução:** (figura: …)"
  const md = ex.markdown.trim().replace(/\*\*([^*\n]{2,40}?)\*\*\s*(\([^)\n]*\)):/g, "**$1:** $2");
  const conceito = limpa(ex.keyConcept || "");
  const r: Estruturada = { ideia: [], conceito, passos: [], outras: [], resposta: answer, porQue: "" };
  // formato com seções "**Rótulo:** texto"
  const partes = md.split(/(?:^|\n)\*\*([^*\n]{2,40}?):\*\*\s*/);
  if (partes.length > 1) {
    if (partes[0].trim()) r.passos.push(...itens(partes[0]));
    for (let k = 1; k < partes.length; k += 2) {
      const rot = partes[k].trim(), txt = (partes[k + 1] ?? "").trim();
      if (/^Ideia/i.test(rot)) r.ideia.push(...itens(txt));
      else if (/^Por que [A-E]$/i.test(rot)) r.porQue = limpa(txt);
      else if (/^(Distratoras|Por que as outras|Alternativas erradas)/i.test(rot)) r.outras.push(...itens(txt));
      else if (/^Resposta/i.test(rot)) r.porQue = r.porQue || limpa(txt);
      else r.passos.push(...itens(txt));
    }
    return r;
  }
  // formato curto: frases + "**Resposta: X**" no fim
  const corpo = md.replace(/\*\*Resposta:\s*[A-E]\*\*\s*$/, "").trim();
  for (const f of itens(corpo)) (ehDistratora(f) ? r.outras : r.passos).push(f);
  return r;
}
