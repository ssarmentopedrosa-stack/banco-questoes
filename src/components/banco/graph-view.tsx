import { useMemo, useState } from "react";
import { domainLabel, type LearnEdge, type Question } from "@/lib/banco";

type Props = {
  questions: Question[];
  edges: { source: string; target: string; status: string; type: string }[];
  focusId?: string | null;
  onSelect: (id: string) => void;
  onOpen?: (id: string) => void;
};

export function GraphView({ questions, edges, focusId, onSelect, onOpen }: Props) {
  const [pan, setPan] = useState({ x: 0, y: 0, k: 1 });
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const byId = useMemo(() => new Map(questions.map((q) => [q.id, q])), [questions]);

  const pos = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    const list = questions;
    if (focusId && byId.has(focusId)) {
      map.set(focusId, { x: 320, y: 210 });
      const others = list.filter((q) => q.id !== focusId);
      others.forEach((q, i) => {
        const a = (i / Math.max(others.length, 1)) * Math.PI * 2;
        map.set(q.id, { x: 320 + Math.cos(a) * 150, y: 210 + Math.sin(a) * 120 });
      });
      return map;
    }
    const domains = [...new Set(list.map((q) => q.domain || "?"))];
    list.forEach((q) => {
      const di = Math.max(0, domains.indexOf(q.domain || "?"));
      const group = list.filter((x) => x.domain === q.domain);
      const gi = group.findIndex((x) => x.id === q.id);
      const base = (di / Math.max(domains.length, 1)) * Math.PI * 2 - Math.PI / 2;
      const spread = Math.min(0.45, 0.12 * group.length);
      const a = base + (gi - (group.length - 1) / 2) * (spread / Math.max(group.length, 1));
      const r = 150 + (gi % 3) * 18;
      map.set(q.id, { x: 340 + Math.cos(a) * r, y: 230 + Math.sin(a) * r * 0.82 });
    });
    return map;
  }, [questions, focusId, byId]);

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-ink">
      <div className="flex gap-2 p-2">
        <button type="button" className="min-h-11 rounded-lg border border-line px-3 text-sm" onClick={() => setPan((p) => ({ ...p, k: Math.min(2.2, p.k + 0.15) }))} aria-label="Ampliar">Ampliar</button>
        <button type="button" className="min-h-11 rounded-lg border border-line px-3 text-sm" onClick={() => setPan((p) => ({ ...p, k: Math.max(0.5, p.k - 0.15) }))} aria-label="Reduzir">Reduzir</button>
        <button type="button" className="min-h-11 rounded-lg border border-line px-3 text-sm" onClick={() => setPan({ x: 0, y: 0, k: 1 })}>Recentrar</button>
      </div>
      <svg
        role="img"
        aria-label="Grafo de questões"
        viewBox="0 0 680 460"
        className="h-[420px] w-full touch-none"
        onPointerDown={(e) => setDrag({ x: e.clientX - pan.x, y: e.clientY - pan.y })}
        onPointerMove={(e) => {
          if (!drag) return;
          setPan((p) => ({ ...p, x: e.clientX - drag.x, y: e.clientY - drag.y }));
        }}
        onPointerUp={() => setDrag(null)}
        onPointerLeave={() => setDrag(null)}
      >
        <g transform={`translate(${pan.x / 4} ${pan.y / 4}) scale(${pan.k})`}>
          {edges.map((e, i) => {
            const a = pos.get(e.source);
            const b = pos.get(e.target);
            if (!a || !b) return null;
            const stroke = e.status === "CONFIRMED" ? "var(--color-teal)" : e.status === "CANDIDATE" ? "var(--color-amber)" : "var(--color-rose)";
            return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={stroke} strokeWidth={e.status === "CONFIRMED" ? 1.6 : 1} opacity={0.55} />;
          })}
          {questions.map((q) => {
            const p = pos.get(q.id);
            if (!p) return null;
            const active = q.id === focusId;
            return (
              <g key={q.id} transform={`translate(${p.x} ${p.y})`} className="cursor-pointer" onClick={() => onSelect(q.id)} onDoubleClick={() => onOpen?.(q.id)}>
                <circle r={active ? 16 : 11} fill={active ? "var(--color-amber)" : "var(--color-panel)"} stroke="var(--color-fg)" strokeWidth={1} />
                <text y={28} textAnchor="middle" fill="var(--color-mute)" fontSize="8">
                  {domainLabel(q.domain).slice(0, 12)}
                </text>
                <title>{q.id}</title>
              </g>
            );
          })}
        </g>
      </svg>
      <p className="px-3 pb-3 text-xs text-mute">Arraste para mover. Clique seleciona. Duplo clique abre a questão. A cor não é o único indicador: a lista ao lado mostra o status por extenso.</p>
    </div>
  );
}

export function edgeIncident<T extends LearnEdge>(edges: T[], id: string) {
  return edges.filter((e) => e.source === id || e.target === id);
}
