export function Legend() {
  return (
    <aside aria-label="Legenda de confiança" className="flex flex-wrap gap-3 text-sm text-mute">
      <span><strong className="text-teal">✓ CONFIRMED</strong> — evidência suficiente</span>
      <span><strong className="text-amber">◐ CANDIDATE</strong> — em análise</span>
      <span><strong className="text-rose">? UNCERTAIN</strong> — evidência insuficiente</span>
    </aside>
  );
}
