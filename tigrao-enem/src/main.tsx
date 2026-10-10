import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { FISICA_RAW, MATERIAS, juntarNatureza, materiaInfo, setMateria, type MateriaId, type Raw } from "./data";
import { configurarJogo } from "./game";
import { instalarSom } from "./som";

instalarSom();
import contagem from "./materias/contagem.json";

const ESCOLHA = "tigrao-enem-materia";
const carregar: Record<Exclude<MateriaId, "fisica" | "natureza">, () => Promise<Raw>> = {
  biologia: () => import("./materias/biologia.json").then((m) => m.default as unknown as Raw),
  quimica: () => import("./materias/quimica.json").then((m) => m.default as unknown as Raw),
  geografia: () => import("./materias/geografia.json").then((m) => m.default as unknown as Raw),
};
const CONTAGEM: Record<MateriaId, number> = { fisica: FISICA_RAW.questions.length, ...contagem, natureza: 0 };
CONTAGEM.natureza = CONTAGEM.fisica + CONTAGEM.biologia + CONTAGEM.quimica;

async function dados(id: MateriaId): Promise<Raw> {
  if (id === "fisica") return FISICA_RAW;
  if (id === "natureza") {
    const [b, q] = await Promise.all([carregar.biologia(), carregar.quimica()]);
    return juntarNatureza([{ nome: "Física", raw: FISICA_RAW }, { nome: "Biologia", raw: b }, { nome: "Química", raw: q }]);
  }
  return carregar[id]();
}

function xpSalvo(key: string): number | null {
  try {
    const o = JSON.parse(localStorage.getItem(key) ?? "null");
    return o && typeof o.xp === "number" ? o.xp : null;
  } catch {
    return null;
  }
}

/** Matéria inicial: a última escolhida; se nunca escolheu mas já tem progresso de Física (versão antiga), abre direto na Física. */
function inicial(): MateriaId | null {
  try {
    const e = localStorage.getItem(ESCOLHA);
    if (e && MATERIAS.some((m) => m.id === e)) return e as MateriaId;
    if (localStorage.getItem(materiaInfo("fisica").key)) return "fisica";
  } catch { /* sem localStorage */ }
  return null;
}

function Escolha({ onPick }: { onPick: (id: MateriaId) => void }) {
  return (
    <div className="mx-auto min-h-screen max-w-md px-4 pb-10 pt-5">
      <div className="relative overflow-hidden rounded-[28px] bg-noite p-4 text-white shadow-md">
        <div className="estrelas absolute inset-0" />
        <div className="relative flex items-center gap-3">
          <img src="./tigrao/acena.webp" alt="Tigrão, o cão astronauta, acenando" className="h-24 w-24 shrink-0 rounded-3xl object-cover ring-4 ring-white/70" />
          <div>
            <div className="font-titulo text-[1.625rem] font-extrabold leading-7">Tigrão ENEM</div>
            <div className="mt-1 text-sm font-semibold text-white/90">Au-au! Qual matéria vamos treinar hoje?</div>
          </div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {MATERIAS.map((m) => {
          const xp = xpSalvo(m.key);
          return (
            <button key={m.id} onClick={() => onPick(m.id)} data-testid={"materia-" + m.id}
              className={`${m.id === "natureza" ? "col-span-2 bg-gradient-to-r from-azul to-teal text-white" : "bg-papel text-noite ring-1 ring-borda"} flex flex-col items-start rounded-3xl p-4 text-left shadow-sm active:scale-95`}>
              <span className="text-3xl">{m.emoji}</span>
              <span className="mt-1 font-titulo text-lg font-extrabold leading-5">{m.nome}</span>
              <span className={`mt-1 text-[0.6875rem] ${m.id === "natureza" ? "text-white/90" : "text-tinta/75"}`}>
                {CONTAGEM[m.id]} questões{m.id === "natureza" ? " · simulado misto Fís + Bio + Quí" : ""}{xp !== null ? ` · ${xp} XP` : ""}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-4 px-2 text-center text-[0.6875rem] leading-4 text-tinta/70">
        Cada matéria tem seu próprio XP, domínio, revisões e simulados. Questões oficiais do ENEM (Inep) com gabarito oficial. App independente, sem vínculo com o Inep/MEC.
      </p>
    </div>
  );
}

function Root() {
  const [materia, setMat] = useState<MateriaId | null>(inicial);
  const [pronta, setPronta] = useState<MateriaId | null>(null);
  const [erro, setErro] = useState(false);
  useEffect(() => {
    if (!materia) return;
    let vivo = true;
    setErro(false);
    dados(materia)
      .then((raw) => {
        if (!vivo) return;
        setMateria(materia, raw);
        configurarJogo();
        document.title = `Tigrão ENEM · ${materiaInfo(materia).nome}`;
        try { localStorage.setItem(ESCOLHA, materia); } catch { /* ok */ }
        setPronta(materia);
      })
      .catch(() => vivo && setErro(true));
    return () => { vivo = false; };
  }, [materia]);
  const trocar = () => {
    try { localStorage.removeItem(ESCOLHA); } catch { /* ok */ }
    setPronta(null);
    setMat(null);
  };
  if (!materia) return <Escolha onPick={setMat} />;
  if (erro) return <div className="p-6 text-center">Não consegui carregar as questões. <button className="font-bold text-azul underline" onClick={trocar}>Voltar</button></div>;
  if (pronta !== materia) return <div className="grid min-h-screen place-items-center text-sm font-bold text-noite">Carregando {materiaInfo(materia).nome}… 🐾</div>;
  return <App key={materia} onTrocar={trocar} />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
