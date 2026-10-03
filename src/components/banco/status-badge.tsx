const TONE: Record<string, string> = {
  CONFIRMED: "border-teal text-teal",
  CANDIDATE: "border-amber text-amber",
  UNCERTAIN: "border-rose text-rose",
  PARTIAL: "border-amber text-amber",
  DETERMINED: "border-teal text-teal",
  PROBABLE: "border-amber text-amber",
  INFERRED: "border-amber text-amber",
  REVIEWED: "border-sky-400 text-sky-300",
};

const MARK: Record<string, string> = {
  CONFIRMED: "✓",
  CANDIDATE: "◐",
  UNCERTAIN: "?",
  PARTIAL: "◐",
  DETERMINED: "✓",
  INFERRED: "◐",
  REVIEWED: "◉",
};

const LABEL: Record<string, string> = {
  REVIEWED: "REVISADO: CHICO",
};

export function StatusBadge({ status }: { status: string | null | undefined }) {
  const key = status || "UNCERTAIN";
  const tone = TONE[key] ?? "border-line text-mute";
  const mark = MARK[key] ?? "·";
  return (
    <span className={`inline-flex min-h-7 items-center gap-1 rounded-full border px-2 text-xs font-medium ${tone}`}>
      <span aria-hidden>{mark}</span>
      <span>{LABEL[key] ?? key.replaceAll("_", " ")}</span>
    </span>
  );
}
