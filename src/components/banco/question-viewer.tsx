import { useState } from "react";
import { Link } from "@tanstack/react-router";
import type { OfficialView } from "@/lib/oficial";
import { StatusBadge } from "@/components/banco/status-badge";

export function QuestionViewer({ id, view, probable }: { id: string; view: OfficialView | undefined; probable: boolean }) {
  const variants = view?.variants ?? [];
  const [idx, setIdx] = useState(0);
  const v = variants[Math.min(idx, Math.max(variants.length - 1, 0))];
  const images = v ? (view?.images ?? []).filter((im) => im.variant_id === v.id) : [];
  const partial = v?.extraction_status === "partial" || v?.alternatives_status !== "complete";
  const essential = Boolean(view?.essential_image_unavailable || view?.image_required);
  const figures = view?.figures ?? [];

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2">
          <Link to="/questoes" className="inline-flex min-h-11 items-center rounded-lg border border-line px-3 text-sm">Voltar para questões</Link>
          <a href="#relacoes" className="inline-flex min-h-11 items-center rounded-lg border border-line px-3 text-sm">Ver relações</a>
          <Link to="/mapa" className="inline-flex min-h-11 items-center rounded-lg border border-line px-3 text-sm">Ver no mapa</Link>
          {variants.length > 1 && <a href="#variantes" className="inline-flex min-h-11 items-center rounded-lg border border-line px-3 text-sm">Ver variantes</a>}
        </div>
        <div>
          <h2 className="font-serif text-2xl">Questão original</h2>
          {!v && <p>Não disponível na extração atual.</p>}
          {v && partial && <p className="mt-2 text-sm text-amber">Texto parcialmente disponível na extração oficial.</p>}
          {v?.reconstruction_status && <p className="mt-1 text-sm text-mute">Reconstrução registrada: {v.reconstruction_status}</p>}
          {v && (
            <div className="mt-3 max-w-3xl whitespace-pre-wrap font-serif text-lg leading-relaxed text-fg">
              {v.statement || "Não disponível na extração atual."}
            </div>
          )}
        </div>
        <div>
          <h3 className="font-serif text-xl">{figures.length > 1 ? "Figuras" : "Figura"}</h3>
          {figures.length > 0 ? (
            <>
              <ul className="mt-2 space-y-4">
                {figures.map((f) => (
                  <li key={f.src}>
                    <figure className="max-w-3xl rounded-xl border border-line bg-white p-2">
                      <img
                        src={f.src}
                        alt={`${f.label} — ENEM ${v?.year ?? ""}, caderno ${f.source.booklet} (${f.source.color}), questão ${f.source.number}`}
                        width={f.width}
                        height={f.height}
                        loading="lazy"
                        className="mx-auto h-auto max-h-[80vh] w-auto max-w-full"
                        style={{ maxWidth: `min(100%, ${Math.round(f.width * 0.75)}px)` }}
                      />
                      <figcaption className="mt-2 text-xs text-slate-600">
                        {f.label} · recorte do caderno {f.source.booklet} ({f.source.color}), questão {f.source.number}, página {f.source.page}
                      </figcaption>
                    </figure>
                  </li>
                ))}
              </ul>
              {v && v.booklet !== figures[0].source.booklet && (
                <p className="mt-2 text-sm text-mute">
                  Recorte feito a partir do caderno {figures[0].source.booklet} (Q{figures[0].source.number}), mesma questão desta variante (caderno {v.booklet}, Q{v.number}).
                </p>
              )}
            </>
          ) : view?.figures_status === "sem_figura_na_prova" ? (
            <p className="text-sm text-mute">Esta questão não tem figura na prova oficial.</p>
          ) : (
            <>
              {essential && <p className="text-sm text-amber">Imagem essencial para interpretação.</p>}
              <p className="text-sm">Imagem oficial ainda não disponível.</p>
              {images.length > 0 && (
                <p className="text-sm text-mute">{images.length} imagem(ns) detectada(s) na página {images[0].page}; recorte não associado a esta variante.</p>
              )}
            </>
          )}
        </div>
        <div>
          <h3 className="font-serif text-xl">Alternativas</h3>
          {!v || v.alternatives.length === 0 ? (
            <p>Não disponível na extração atual.</p>
          ) : (
            <ol className="mt-2 max-w-3xl space-y-2">
              {v.alternatives.map((a) => (
                <li key={a.letter} className="rounded-xl border border-line bg-panel p-3">
                  <span className="font-semibold text-amber">{a.letter})</span>{" "}
                  <span className="whitespace-pre-wrap">{a.text}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
        <div className="rounded-2xl border border-line bg-panel p-4">
          <h3 className="font-serif text-xl">Gabarito</h3>
          {!v && <p>Não disponível na extração atual.</p>}
          {v?.answer_status === "annulled" && <p className="mt-2 text-lg font-semibold">QUESTÃO ANULADA</p>}
          {v && v.answer_status !== "annulled" && (
            <p className="mt-2 text-lg">Gabarito oficial: {v.answer ?? "Não disponível na extração atual."}</p>
          )}
          {v && <p className="text-sm text-mute">Fonte: {v.document_id} · status {v.answer_status}</p>}
        </div>
      </div>
      <aside className="space-y-3 text-sm">
        <h2 className="font-serif text-xl">Verificação da fonte</h2>
        {probable && <p className="rounded-xl border border-amber p-3">Esta identificação permanece PROBABLE na base de matching.</p>}
        {!v && <p>Não disponível na extração atual.</p>}
        {v && (
          <dl className="space-y-2">
            <div><dt className="text-mute">Documento</dt><dd>{v.document_id}</dd></div>
            <div><dt className="text-mute">Caderno</dt><dd>{v.booklet}{v.color ? ` · ${v.color}` : ""}</dd></div>
            <div><dt className="text-mute">Questão</dt><dd>{v.number}</dd></div>
            <div><dt className="text-mute">Páginas</dt><dd>{v.start_page}–{v.end_page}</dd></div>
            <div><dt className="text-mute">Extração</dt><dd><StatusBadge status={v.extraction_status === "extracted" ? "CONFIRMED" : "CANDIDATE"} /> {v.extraction_status}</dd></div>
            <div><dt className="text-mute">Hash SHA-256</dt><dd className="break-all font-mono text-xs">{v.sha256}</dd></div>
          </dl>
        )}
        <div id="variantes">
          <h3 className="font-serif text-lg">Variantes oficiais</h3>
          {variants.length === 0 && <p>Não disponível na extração atual.</p>}
          <ul className="mt-2 space-y-1">
            {variants.map((item, i) => (
              <li key={item.id}>
                <button type="button" className={`min-h-11 w-full rounded-lg border px-2 text-left ${i === idx ? "border-amber text-amber" : "border-line"}`} onClick={() => setIdx(i)}>
                  Caderno {item.booklet} · Q{item.number}
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-mute">Canônica {id}. A troca de caderno não cria outra questão pedagógica.</p>
        </div>
      </aside>
    </section>
  );
}
