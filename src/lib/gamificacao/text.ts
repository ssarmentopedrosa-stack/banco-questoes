/** Ajustes de exibição do texto oficial extraído (não alteram o banco). */
/** Na tela do jogo, as alternativas viram botões: tira-as do fim do enunciado (e o cabeçalho "QUESTÃO N"). */
export function stemOnly(statement: string, firstAlt: string): string {
  let s = cleanText(statement).replace(/^\s*QUEST[ÃA]O\s+\d+\s*\n/i, "");
  const probe = firstAlt.trim().slice(0, 4);
  const lines = s.split("\n");
  for (let i = lines.length - 1; i > 0; i--) {
    if (/^\s*A[\s)]/.test(lines[i]) && lines[i].includes(probe)) {
      s = lines.slice(0, i).join("\n");
      break;
    }
  }
  return s.trim();
}

/** Remove linhas de marca d'água da extração (ex.: "MENE4202MENE4202…"). */
export function cleanText(s: string): string {
  return s
    .split("\n")
    .filter((l) => !/^(?:[A-Z]{3,5}\d{3,5}){3,}/.test(l.trim()))
    .join("\n");
}

const FUNCTION_WORDS = new Set("de do da dos das o a os as que e em no na com para por ao à um uma se".split(" "));

/** Heurística: alternativa terminando em preposição/artigo ou vírgula provavelmente perdeu a continuação. */
export function altsLookTruncated(texts: string[]): boolean {
  return texts.some((t) => {
    const w = t.trim().split(/\s+/).pop()?.toLowerCase() ?? "";
    return FUNCTION_WORDS.has(w) || t.trim().endsWith(",");
  });
}
