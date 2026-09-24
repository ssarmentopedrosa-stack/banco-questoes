export function KpiCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-2xl border border-line bg-panel p-4">
      <p className="text-sm text-mute">{label}</p>
      <p className="font-serif text-3xl text-amber">{value}</p>
    </article>
  );
}
