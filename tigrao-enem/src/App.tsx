import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, BookOpen, Brain, CalendarCheck, Check, ChevronRight, Clock, Download, ExternalLink, Flame, Gauge, Lightbulb, RotateCcw,
  ArrowDown, Settings, Sparkles, Target, Timer, Trophy, Upload, Vibrate, Volume1, Volume2, VolumeX, X, Zap, ZoomIn,
} from "lucide-react";
import { SOM_PADRAO, setModoProva, setSomPrefs, tocar, useSom, vibracaoSuportada, vibrar, type Som } from "./som";
import { LETTERS, MATERIA, QUESTIONS, TOPICS, dicas, figuraAlt, optionText, plural, topicInfo, type Option, type Question } from "./data";
import {
  ALL_BADGES, CHANCE_SURPRESA, DOMINIO, LEVELS, META_DIARIA, NIVEIS_DOMINIO, SIMULADOS, XP, badgeLabel, dominioSub, dominioTema, dueReviews, folgaDisponivel,
  levelOf, load, missoes, nivelDominio, practiceSet, proximoPasso, registerAnswer, registerSimulado, reviewSet, save, scheduledReviews, simuladoDisponivel,
  simuladoSet, smartSet, subtemas, temaMaisFraco, topicStats, type Gain, type SimKind, type State,
} from "./game";
import { estruturar } from "./resolucao";
import { baixarArquivo, exportCode, importCode } from "./backup";

type Mode = "pratica" | "inteligente" | "rapido" | "revisao" | SimKind;
const isSim = (m: Mode): m is SimKind => m === "mini" || m === "completo";
type Quiz = { mode: Mode; topic: string | null; questions: Question[]; revisao: string[] };
type Screen =
  | { name: "home" }
  | { name: "temas" }
  | { name: "dominio" }
  | { name: "conquistas" }
  | { name: "ajustes" }
  | ({ name: "quiz" } & Quiz)
  | { name: "resultado"; mode: Mode; topic: string | null; items: Item[]; xp: number; badges: string[]; levelUp: string | null; missoes: string[]; seconds: number; dominioUps: string[] };
type Item = { q: Question; chosen: string | null };

const T = "./tigrao/";
const INEP = "https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem/provas-e-gabaritos";
const AVISO = "Questões oficiais do ENEM (Inep). App independente, sem vínculo com o Inep/MEC.";
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
const frasesAcerto = () => ["Au-au! Acertou em cheio! 🎉", MATERIA.fraseAcerto, "Tá em órbita, hein? 🚀", "Gabaritou essa! Bora pra próxima!"];
const FRASES_ERRO = ["Opa! Essa pegou… bora entender?", "Errar aqui é treino. Lê a resolução comigo!", "Pegadinha clássica do ENEM. Na prova você acerta!", "Calma! Vou farejar onde foi o deslize."];
const FONTES = ["100%", "112.5%", "125%"];

export default function App({ onTrocar }: { onTrocar?: () => void }) {
  const [state, setState] = useState<State>(() => load());
  const [screen, setScreen] = useState<Screen>({ name: "home" });
  useEffect(() => {
    save(state);
  }, [state]);
  useEffect(() => {
    document.documentElement.style.fontSize = FONTES[state.prefs.fonte] ?? "100%";
  }, [state.prefs.fonte]);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen.name, screen.name === "quiz" ? screen.questions : null]);

  const go = (q: Quiz) => setScreen({ name: "quiz", ...q });
  const startPratica = (topic: string | null) => go({ mode: "pratica", topic, questions: practiceSet(state, topic, 10), revisao: [] });
  const startSimulado = (kind: SimKind) => go({ mode: kind, topic: null, questions: simuladoSet(state, kind), revisao: [] });
  const startRevisao = () => {
    const qs = reviewSet(state);
    go({ mode: "revisao", topic: null, questions: qs, revisao: qs.map((q) => q.id) });
  };
  const startInteligente = () => {
    const r = smartSet(state);
    go({ mode: "inteligente", topic: r.foco, questions: r.questions, revisao: [...r.revisao] });
  };
  const startRapido = () => {
    const r = smartSet(state, 5);
    go({ mode: "rapido", topic: r.foco, questions: r.questions, revisao: [...r.revisao] });
  };
  const home = () => setScreen({ name: "home" });

  return (
    <div className="mx-auto min-h-screen max-w-md px-4 pb-10 pt-3">
      {screen.name === "home" && (
        <Home state={state} onTemas={() => setScreen({ name: "temas" })} onSimulado={startSimulado} onRevisao={startRevisao} onMix={() => startPratica(null)}
          onInteligente={startInteligente} onRapido={startRapido} setState={setState} onConquistas={() => setScreen({ name: "conquistas" })} onDominio={() => setScreen({ name: "dominio" })}
          onAjustes={() => setScreen({ name: "ajustes" })} onTrocar={onTrocar} />
      )}
      {screen.name === "temas" && <Temas state={state} onBack={home} onPick={startPratica} />}
      {screen.name === "dominio" && <Dominio state={state} onBack={home} onPick={startPratica} onRevisao={startRevisao} onSimulado={() => startSimulado("mini")} />}
      {screen.name === "conquistas" && <Conquistas state={state} onBack={home} />}
      {screen.name === "ajustes" && <Ajustes state={state} setState={setState} onBack={home} />}
      {screen.name === "quiz" && (
        <QuizView key={screen.questions.map((q) => q.id).join()} {...screen} state={state} setState={setState} onExit={home}
          onFinish={(r) => setScreen({ name: "resultado", mode: screen.mode, topic: screen.topic, ...r })} />
      )}
      {screen.name === "resultado" && (
        <Resultado {...screen} state={state} onHome={home}
          onAgain={() => (isSim(screen.mode) ? startSimulado(screen.mode) : screen.mode === "revisao" ? startRevisao() : screen.mode === "inteligente" ? startInteligente() : screen.mode === "rapido" ? startRapido() : startPratica(screen.topic))} />
      )}
      <p className="mt-6 px-2 text-center text-[0.6875rem] leading-4 text-tinta/70" data-testid="aviso">{AVISO}</p>
    </div>
  );
}

/* ---------- Tigrão animado (clipes curtos, mudos, em loop; imagem estática como pôster/fallback) ---------- */
type Clip = "anim_abertura" | "anim_acerto" | "anim_erro";
function useReducedMotion() {
  const q = "(prefers-reduced-motion: reduce)";
  const [r, setR] = useState(() => typeof window !== "undefined" && !!window.matchMedia && window.matchMedia(q).matches);
  useEffect(() => {
    if (!window.matchMedia) return;
    const m = window.matchMedia(q);
    const h = () => setR(m.matches);
    m.addEventListener?.("change", h);
    return () => m.removeEventListener?.("change", h);
  }, []);
  return r;
}
function TigraoAnimado({ clip, poster, alt, className, imgClassName = "" }: { clip: Clip; poster: string; alt: string; className: string; imgClassName?: string }) {
  const reduced = useReducedMotion();
  const [falhou, setFalhou] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true; // iOS só faz autoplay com muted
    v.play().catch(() => { /* autoplay bloqueado: fica o pôster */ });
  }, [clip, reduced, falhou]);
  if (reduced || falhou) return <img src={T + poster} alt={alt} className={className + " " + imgClassName} />;
  return (
    <video ref={ref} key={clip} className={className + " bg-[#c9cacc]"} poster={T + poster} aria-label={alt} role="img" data-clip={clip}
      autoPlay muted loop playsInline preload="auto" disablePictureInPicture onError={() => setFalhou(true)}>
      <source src={T + clip + ".mp4"} type="video/mp4" />
      <source src={T + clip + ".webm"} type="video/webm" onError={() => setFalhou(true)} />
    </video>
  );
}

/* ---------- peças visuais ---------- */
function TopBar({ state }: { state: State }) {
  const lv = levelOf(state.xp);
  return (
    <div className="flex items-center gap-3 rounded-3xl bg-papel p-3 shadow-sm ring-1 ring-borda">
      <img src={T + "avatar.webp"} alt="Tigrão" className="h-12 w-12 rounded-full object-cover ring-2 ring-laranja" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between text-xs font-bold text-noite">
          <span className="truncate">{lv.cur.emoji} {lv.cur.title}</span>
          <span>{state.xp} XP</span>
        </div>
        <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-ceu">
          <div className="h-full rounded-full bg-gradient-to-r from-azul to-laranja transition-all" style={{ width: `${lv.pct}%` }} />
        </div>
        <div className="mt-0.5 text-[0.6875rem] text-tinta/70">{lv.next ? `Faltam ${lv.next.min - state.xp} XP para ${lv.next.title}` : "Nível máximo: Mestre do ENEM! 🏆"}</div>
      </div>
      <div className="flex flex-col items-center rounded-2xl bg-laranja-claro px-2.5 py-1 text-laranja-escuro" title={plural(state.streak.count, "dia seguido", "dias seguidos")}>
        <Flame className="h-5 w-5" fill="currentColor" />
        <span className="text-sm font-black leading-none">{state.streak.count}</span>
      </div>
      <BotaoSom />
    </div>
  );
}

function Header({ title, onBack, right }: { title: string; onBack: () => void; right?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <button onClick={onBack} className="rounded-full bg-papel p-2 shadow-sm ring-1 ring-borda" aria-label="Voltar"><ArrowLeft className="h-5 w-5" /></button>
      <h1 className="flex-1 font-titulo text-2xl font-extrabold text-noite">{title}</h1>
      {right}
    </div>
  );
}

/** Botão rápido de som (liga/desliga), no topo da home e do quiz. */
function BotaoSom({ className = "" }: { className?: string }) {
  const som = useSom();
  const ligado = som.ligado && som.volume > 0;
  return (
    <button data-testid="botao-som" data-som="off" aria-pressed={!ligado} aria-label={ligado ? "Desligar som" : "Ligar som"} title={ligado ? "Som ligado" : "Som desligado"}
      onClick={() => { setSomPrefs(ligado ? { ligado: false } : { ligado: true, volume: som.volume > 0 ? som.volume : SOM_PADRAO.volume }); if (!ligado) setTimeout(() => tocar("toque"), 0); }}
      className={`grid shrink-0 place-items-center rounded-full bg-papel p-2 text-noite shadow-sm ring-1 ring-borda ${className}`}>
      {ligado ? (som.volume < 0.5 ? <Volume1 className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />) : <VolumeX className="h-5 w-5 text-vermelho" />}
    </button>
  );
}

function Balao({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={"balao rounded-2xl bg-papel px-3 py-2 text-sm font-semibold text-tinta shadow-sm " + className}>{children}</div>;
}

function Barra({ pct, cor = "bg-azul", fundo = "bg-ceu" }: { pct: number; cor?: string; fundo?: string }) {
  return <div className={`h-2 overflow-hidden rounded-full ${fundo}`}><div className={`h-full rounded-full ${cor} transition-all`} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} /></div>;
}

const dataCurta = (iso: string) => { const [, m, d] = iso.split("-"); return `${d}/${m}`; };
/** Faixas de acerto com significado: abaixo de 40% vermelho, 40–69% âmbar, 70% ou mais verde. */
const faixaPct = (pct: number) =>
  pct < 40 ? { id: "vermelho", barra: "bg-vermelho", chip: "bg-vermelho-claro text-vermelho" }
    : pct < 70 ? { id: "ambar", barra: "bg-ambar", chip: "bg-ambar-claro text-noite" }
      : { id: "verde", barra: "bg-teal", chip: "bg-teal-claro text-teal" };
const COR_NIVEL = [
  { barra: "bg-vermelho", chip: "bg-vermelho-claro text-vermelho" },
  { barra: "bg-ambar", chip: "bg-ambar-claro text-noite" },
  { barra: "bg-teal", chip: "bg-teal-claro text-teal" },
];
function LegendaFaixas() {
  return (
    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[0.6875rem] font-bold text-tinta/85" data-testid="legenda-faixas">
      <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-vermelho" /> abaixo de 40%</span>
      <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-ambar" /> 40% a 69%</span>
      <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-teal" /> 70% ou mais</span>
    </div>
  );
}

/* ---------- HOME ---------- */
function falaHome(state: State, due: number) {
  const respondidas = Object.keys(state.answers).length;
  const feitoHoje = state.daily.count;
  const hoje = new Date().toLocaleDateString("sv-SE");
  const simHoje = state.simulados.some((r) => new Date(r.date).toLocaleDateString("sv-SE") === hoje);
  if (respondidas === 0) return `Au-au! Eu sou o Tigrão, cão astronauta do lab. Bora treinar ${MATERIA.nome} do ENEM com questões oficiais?`;
  if (feitoHoje >= META_DIARIA) {
    if (due > 0) return `Meta do dia batida! 🎯 Tem ${plural(due, "erro", "erros")} esperando revisão. Bora?`;
    if (!simHoje) return "Meta do dia batida! 🎯 Que tal um mini-simulado pra fechar com chave de ouro?";
    return "Meta batida e simulado feito. Hoje você foi longe! Descansa que amanhã tem mais. 🌙";
  }
  if (feitoHoje === 0 && state.streak.count > 0) return `Seu foguinho tá em ${plural(state.streak.count, "dia", "dias")}! Uma questão hoje já mantém aceso. Bora no treino rápido? 🔥`;
  if (due > 0) return `Tem ${plural(due, "erro", "erros")} pra revisar. O Treino inteligente já mistura com seu ponto fraco!`;
  return `Bora! Faltam ${plural(META_DIARIA - feitoHoje, "questão", "questões")} pra meta de hoje.`;
}

function Home(p: {
  state: State; onTemas: () => void; onSimulado: (k: SimKind) => void; onRevisao: () => void; onMix: () => void; onInteligente: () => void;
  onRapido: () => void; setState: (s: State) => void; onConquistas: () => void; onDominio: () => void; onAjustes: () => void; onTrocar?: () => void;
}) {
  const { state } = p;
  const [avisoFolga] = useState(state.folga.avisar ? state.folga.usadaEm : null);
  useEffect(() => {
    if (state.folga.avisar) p.setState({ ...state, folga: { ...state.folga, avisar: false } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const respondidas = Object.keys(state.answers).length;
  const due = dueReviews(state).length;
  const agendadas = scheduledReviews(state).length;
  const metaPct = Math.min(100, Math.round((state.daily.count / META_DIARIA) * 100));
  const metaOk = state.daily.count >= META_DIARIA;
  const fraco = temaMaisFraco(state);
  const temDominio = TOPICS.some((t) => dominioTema(state, t.name).pct !== null);
  return (
    <div className="space-y-4">
      <TopBar state={state} />
      <div className="relative overflow-hidden rounded-[28px] bg-noite p-4 text-white shadow-md">
        <div className="estrelas absolute inset-0" />
        <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-laranja/30" />
        <div className="relative flex items-end gap-3">
          <TigraoAnimado clip="anim_abertura" poster="acena.webp" alt="Tigrão, o cão astronauta, acenando" className="h-36 w-36 shrink-0 rounded-3xl object-cover ring-4 ring-white/70" imgClassName="anim-float" />
          <div className="pb-1">
            <div className="font-titulo text-[1.625rem] font-extrabold leading-7">Tigrão ENEM</div>
            <div className="text-xs font-semibold text-white/85">{MATERIA.emoji} {MATERIA.subtitulo}</div>
            {p.onTrocar && (
              <button onClick={p.onTrocar} data-testid="trocar-materia" className="mt-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[0.6875rem] font-bold text-white ring-1 ring-white/40 active:scale-95">
                🔄 Trocar matéria
              </button>
            )}
            <Balao className="mt-2">{falaHome(state, due)}</Balao>
          </div>
        </div>
      </div>

      <button onClick={p.onRapido} data-testid="treino-rapido"
        className="relative flex w-full items-center gap-3 overflow-hidden rounded-[28px] bg-gradient-to-r from-laranja to-laranja-escuro p-4 text-left text-white shadow-lg ring-4 ring-laranja/30 active:scale-[.98]">
        <span className="rounded-2xl bg-white/25 p-3"><Zap className="h-8 w-8" fill="currentColor" /></span>
        <span className="flex-1">
          <span className="block font-titulo text-2xl font-extrabold leading-7">Treino rápido de 5</span>
          <span className="text-[0.8125rem] font-bold text-white">5 questões · uns 5 minutos</span>
          <span className="block text-[0.6875rem] font-semibold text-white/90">{due ? "revisão + " : ""}seu ponto fraco ({fraco}) + inédita</span>
        </span>
        <ChevronRight className="h-7 w-7" />
      </button>

      <div className="rounded-3xl bg-papel p-4 shadow-sm ring-1 ring-borda" data-testid="card-sequencia">
        {avisoFolga && (
          <div className="anim-pop mb-3 rounded-2xl bg-azul-claro px-3 py-2 text-[0.8125rem] font-bold text-noite ring-1 ring-azul/40" data-testid="aviso-folga">
            🛌 Usei seu dia de folga em {dataCurta(avisoFolga)}: sua sequência de {plural(state.streak.count, "dia", "dias")} tá salva!
          </div>
        )}
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-laranja-claro text-laranja-escuro"><Flame className="h-7 w-7" fill="currentColor" /></span>
          <div className="min-w-0 flex-1">
            <div className="font-titulo text-lg font-extrabold leading-6 text-noite">{plural(state.streak.count, "dia seguido", "dias seguidos")}</div>
            <div className="text-[0.75rem] font-semibold text-tinta/80">{state.daily.count > 0 ? "✅ Hoje já conta! " : "Responda 1 questão hoje pra contar o dia. "}Recorde: {plural(state.streak.best, "dia", "dias")}.</div>
          </div>
        </div>
        <div className={`mt-2 rounded-2xl px-3 py-2 text-[0.75rem] font-bold ${folgaDisponivel(state) ? "bg-teal-claro text-noite" : "bg-desligado text-tinta"}`} data-testid="folga">
          🛌 Dia de folga: {folgaDisponivel(state) ? "disponível esta semana" : `usado em ${dataCurta(state.folga.usadaEm!)} (volta na segunda)`}
          <span className="block text-[0.6875rem] font-semibold text-tinta/80">Se você ficar 1 dia sem estudar, ele é usado sozinho e a sequência não zera. 1 por semana.</span>
        </div>
        <div className="mt-3 flex items-center justify-between text-sm font-bold">
          <span className="flex items-center gap-1.5 text-noite"><Target className="h-4 w-4" /> Meta do dia</span>
          <span className="text-tinta/80">{Math.min(state.daily.count, META_DIARIA)}/{META_DIARIA} questões {metaOk && "✅"}</span>
        </div>
        <div className="mt-2"><Barra pct={metaPct} cor={metaOk ? "bg-teal" : "bg-laranja"} /></div>
        <div className="mt-1 text-[0.6875rem] text-tinta/75">{metaOk ? `Meta batida hoje! +${XP.metaDiaria} XP garantidos.` : `Bata a meta de ${META_DIARIA} e ganhe +${XP.metaDiaria} XP de bônus.`}</div>
      </div>

      <button onClick={p.onInteligente} className="flex w-full items-center gap-3 rounded-3xl bg-gradient-to-r from-azul to-roxo p-3.5 text-left text-white shadow-md active:scale-[.98]">
        <span className="rounded-2xl bg-white/20 p-2"><Brain className="h-6 w-6" /></span>
        <span className="flex-1">
          <span className="block font-titulo text-lg font-extrabold leading-5">Treino inteligente</span>
          <span className="text-[0.6875rem] font-semibold text-white/90">10 questões: {due ? `${Math.min(due, 3)} de revisão + ` : ""}seu ponto fraco ({fraco}) + inéditas</span>
        </span>
        <ChevronRight className="h-6 w-6" />
      </button>

      <div className="grid grid-cols-2 gap-3">
        <BigButton onClick={p.onTemas} cor="bg-azul" icon={<BookOpen className="h-6 w-6" />} titulo="Praticar por tema" sub={plural(TOPICS.length, "tema", "temas")} />
        <BigButton onClick={p.onMix} cor="bg-teal" icon={<Sparkles className="h-6 w-6" />} titulo="Mistão do dia" sub="10 de todos os temas" />
        <BigButton onClick={() => p.onSimulado("mini")} cor="bg-vermelho" icon={<Timer className="h-6 w-6" />} titulo="Mini-simulado" sub={`${SIMULADOS.mini.n} questões · ${SIMULADOS.mini.segundos / 60} min`} />
        <BigButton onClick={() => p.onSimulado("completo")} cor="bg-noite" icon={<Clock className="h-6 w-6" />} titulo="Simulado ENEM"
          sub={`${SIMULADOS.completo.n} questões · 2h30`} disabled={!simuladoDisponivel("completo")} />
      </div>
      <BigButton wide onClick={p.onRevisao} cor="bg-laranja-escuro" icon={<RotateCcw className="h-6 w-6" />} titulo="Revisar erros"
        sub={due ? `${plural(due, "erro", "erros")} pra hoje · +${XP.revisao} XP extra por erro recuperado` : agendadas ? `${plural(agendadas, "revisão agendada", "revisões agendadas")} para os próximos dias` : "Nenhum erro ainda"} disabled={!due} />

      <button onClick={p.onDominio} className="w-full rounded-3xl bg-papel p-4 text-left shadow-sm ring-1 ring-borda" aria-label="Meu domínio por tema">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-titulo text-lg font-extrabold text-noite"><Gauge className="h-5 w-5" /> Meu domínio</span>
          <ChevronRight className="h-5 w-5 text-tinta/60" />
        </div>
        {temDominio ? (
          <div className="mt-2 space-y-1.5">
            {TOPICS.map((t) => {
              const d = dominioTema(state, t.name);
              const nv = NIVEIS_DOMINIO[nivelDominio(d)];
              return (
                <div key={t.name} className="flex items-center gap-2 text-[0.75rem]">
                  <span className="w-32 truncate font-bold">{t.emoji} {t.name}</span>
                  <span className="flex-1"><Barra pct={d.pct ?? 0} cor={COR_NIVEL[nivelDominio(d)].barra} /></span>
                  <span className={`w-24 shrink-0 rounded-full px-1.5 py-0.5 text-center text-[0.625rem] font-black ${d.pct === null ? "bg-desligado text-tinta/80" : COR_NIVEL[nivelDominio(d)].chip}`}>{d.pct === null ? "sem dados" : `${nv.emoji} ${nv.nome}`}</span>
                </div>
              );
            })}
            <div className="pt-1 text-[0.75rem] font-bold text-noite">👉 Próximo passo: <span className="font-semibold">{proximoPasso(state).texto}</span></div>
          </div>
        ) : (
          <div className="mt-1 text-[0.75rem] text-tinta/75">Responda pelo menos {DOMINIO.minTema} questões de um tema para ver seu domínio. Ele usa suas últimas respostas, não o volume.</div>
        )}
      </button>

      <Missoes state={state} />

      <div className="grid grid-cols-2 gap-3">
        <button onClick={p.onConquistas} className="flex items-center gap-2 rounded-3xl bg-papel p-3 text-left shadow-sm ring-1 ring-borda">
          <Trophy className="h-7 w-7 shrink-0 text-laranja" />
          <span><span className="block font-titulo text-base font-extrabold leading-5 text-noite">Conquistas</span>
            <span className="text-[0.6875rem] text-tinta/75">{plural(state.badges.length, "medalha", "medalhas")} · {respondidas}/{QUESTIONS.length}</span></span>
        </button>
        <button onClick={p.onAjustes} className="flex items-center gap-2 rounded-3xl bg-papel p-3 text-left shadow-sm ring-1 ring-borda">
          <Settings className="h-7 w-7 shrink-0 text-azul" />
          <span><span className="block font-titulo text-base font-extrabold leading-5 text-noite">Ajustes</span>
            <span className="text-[0.6875rem] text-tinta/75">fonte · backup · sobre</span></span>
        </button>
      </div>
      <p className="px-2 text-center text-[0.6875rem] leading-4 text-tinta/70">
        {notaResolucoes()}
      </p>
    </div>
  );
}

function Missoes({ state }: { state: State }) {
  const ms = missoes(state.week);
  return (
    <div className="rounded-3xl bg-papel p-4 shadow-sm ring-1 ring-borda">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 font-titulo text-lg font-extrabold text-noite"><CalendarCheck className="h-5 w-5" /> Missões da semana</span>
        <span className="text-[0.6875rem] font-bold text-tinta/70">{state.week.paid.length}/{ms.length}</span>
      </div>
      <div className="space-y-2">
        {ms.map((m) => {
          const v = Math.min(m.val, m.meta);
          const ok = state.week.paid.includes(m.id);
          return (
            <div key={m.id} className="flex items-center gap-2.5">
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl text-base ${ok ? "bg-teal text-white" : "bg-ceu"}`}>{ok ? <Check className="h-4 w-4" /> : m.emoji}</span>
              <div className="min-w-0 flex-1">
                <div className="flex justify-between gap-2 text-[0.8125rem] font-bold"><span className={ok ? "text-teal line-through decoration-2" : "text-tinta"}>{m.titulo}</span><span className="shrink-0 text-tinta/70">{v}/{m.meta}</span></div>
                <div className="mt-1"><Barra pct={(v / m.meta) * 100} cor={ok ? "bg-teal" : "bg-azul"} /></div>
              </div>
              <span className="w-12 text-right text-[0.6875rem] font-black text-laranja-escuro">+{m.xp} XP</span>
            </div>
          );
        })}
      </div>
      <div className="mt-2 text-[0.6875rem] text-tinta/70">Foco da semana escolhido pelo seu ponto fraco. Renovam toda segunda-feira.</div>
    </div>
  );
}

function BigButton(p: { onClick: () => void; cor: string; icon: React.ReactNode; titulo: string; sub: string; disabled?: boolean; wide?: boolean }) {
  return (
    <button onClick={p.onClick} disabled={p.disabled}
      className={`${p.disabled ? "bg-desligado text-tinta ring-1 ring-borda" : p.cor + " text-white shadow-md active:scale-95"} flex ${p.wide ? "w-full items-center gap-3" : "min-h-28 flex-col justify-between"} rounded-3xl p-3.5 text-left transition`}>
      <span className={`w-fit rounded-2xl p-2 ${p.disabled ? "bg-white/70" : "bg-white/20"}`}>{p.icon}</span>
      <span>
        <span className="block font-titulo text-lg font-extrabold leading-5">{p.titulo}</span>
        <span className={`text-[0.6875rem] font-semibold ${p.disabled ? "text-tinta/80" : "text-white/90"}`}>{p.sub}</span>
      </span>
    </button>
  );
}

/* ---------- TEMAS ---------- */
function Temas({ state, onBack, onPick }: { state: State; onBack: () => void; onPick: (t: string) => void }) {
  return (
    <div>
      <Header title="Praticar por tema" onBack={onBack} />
      <div className="mb-3 flex items-center gap-3">
        <img src={T + "avatar.webp"} className="h-16 w-16 rounded-2xl object-cover" alt="" />
        <Balao>Escolhe um tema! Acertando 5 questões dele (ou todas, se o tema tiver menos) você ganha a medalha. 🏅</Balao>
      </div>
      <div className="space-y-2.5">
        {TOPICS.map((t) => {
          const st = topicStats(state, t.name);
          const d = dominioTema(state, t.name);
          const temBadge = state.badges.includes("tema:" + t.name);
          return (
            <button key={t.name} onClick={() => onPick(t.name)} className="flex w-full items-center gap-3 rounded-3xl bg-papel p-3 text-left shadow-sm ring-1 ring-borda active:scale-[.98]">
              <span className={`${t.corClara} grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-2xl`}>{t.emoji}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1 font-bold text-tinta"><span className="truncate">{t.name}</span> {temBadge && <span title={t.badge}>🏅</span>}</span>
                <span className="block text-[0.6875rem] text-tinta/75">
                  {plural(st.total, "questão", "questões")} · {st.vistas} {st.vistas === 1 ? "vista" : "vistas"} · domínio {d.pct === null ? "—" : `${d.pct}%`}
                </span>
                <span className="mt-1 block"><Barra pct={(st.vistas / st.total) * 100} cor={t.cor} /></span>
              </span>
              <ChevronRight className="h-5 w-5 text-tinta/50" />
            </button>
          );
        })}
      </div>
      <p className="mt-3 px-2 text-[0.6875rem] text-tinta/70">Barra = quanto do tema você já viu. Domínio = acertos nas suas últimas {DOMINIO.janelaTema} questões diferentes do tema.</p>
    </div>
  );
}

/* ---------- DOMÍNIO ---------- */
function Dominio({ state, onBack, onPick, onRevisao, onSimulado }: { state: State; onBack: () => void; onPick: (t: string) => void; onRevisao: () => void; onSimulado: () => void }) {
  const fraco = temaMaisFraco(state);
  const [aberto, setAberto] = useState<string | null>(null);
  const passo = proximoPasso(state);
  const acao = () => (passo.acao === "revisao" ? onRevisao() : passo.acao === "simulado" ? onSimulado() : onPick(passo.tema ?? fraco));
  return (
    <div className="space-y-3">
      <Header title="Meu domínio" onBack={onBack} />
      <div className="flex items-center gap-3 rounded-3xl bg-noite p-3 text-white shadow-md" data-testid="proximo-passo">
        <img src={T + "busto.webp"} alt="" className="h-16 w-16 shrink-0 rounded-2xl object-cover ring-2 ring-white/60" />
        <div className="min-w-0 flex-1">
          <div className="text-[0.6875rem] font-black uppercase tracking-wide text-laranja-claro">👉 Próximo passo</div>
          <div className="text-[0.8125rem] font-semibold leading-5">{passo.texto}</div>
          <button onClick={acao} className="mt-1.5 rounded-full bg-laranja px-3 py-1.5 text-[0.75rem] font-extrabold text-white">
            {passo.acao === "revisao" ? "Revisar agora" : passo.acao === "simulado" ? "Fazer mini-simulado" : `Treinar ${passo.tema}`}
          </button>
        </div>
      </div>
      <div className="rounded-3xl bg-papel p-3 text-[0.75rem] leading-4 text-tinta shadow-sm ring-1 ring-borda" data-testid="regras-nivel">
        <div className="mb-1.5 font-extrabold text-noite">Como o nível de cada tema é calculado</div>
        <p className="mb-2">Conta só as suas <b>últimas {DOMINIO.janelaTema} questões diferentes</b> de cada tema: responder mais não sobe o nível, acertar sim.</p>
        <ul className="space-y-1">
          {NIVEIS_DOMINIO.map((nv, k) => (
            <li key={nv.id} className="flex items-start gap-2">
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[0.6875rem] font-black ${COR_NIVEL[k].chip}`}>{nv.emoji} {nv.nome}</span>
              <span className="pt-0.5">{nv.regra}</span>
            </li>
          ))}
        </ul>
      </div>
      {TOPICS.map((t) => {
        const d = dominioTema(state, t.name);
        const st = topicStats(state, t.name);
        const k = nivelDominio(d);
        const nv = NIVEIS_DOMINIO[k];
        const open = aberto === t.name;
        return (
          <div key={t.name} className="rounded-3xl bg-papel p-3 shadow-sm ring-1 ring-borda">
            <button className="flex w-full items-center gap-2 text-left" onClick={() => setAberto(open ? null : t.name)} aria-expanded={open}>
              <span className={`${t.corClara} grid h-10 w-10 shrink-0 place-items-center rounded-xl text-xl`}>{t.emoji}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2 text-[0.875rem] font-bold">
                  <span className="truncate">{t.name}</span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    <span data-testid={"nivel-" + t.name} className={`rounded-full px-2 py-0.5 text-[0.625rem] font-black ${d.pct === null ? "bg-desligado text-tinta/80" : COR_NIVEL[k].chip}`}>{d.pct === null ? "sem dados" : `${nv.emoji} ${nv.nome}`}</span>
                    <span data-testid={"dom-" + t.name}>{d.pct === null ? "—" : `${d.pct}%`}</span>
                  </span>
                </span>
                <span className="mt-1 block"><Barra pct={d.pct ?? 0} cor={COR_NIVEL[k].barra} /></span>
                <span className="text-[0.6875rem] text-tinta/80">
                  {d.pct === null ? `responda ${DOMINIO.minTema - d.n} ${DOMINIO.minTema - d.n === 1 ? "questão" : "questões"} pra medir` : `base: ${d.n === 1 ? "1 questão" : `últimas ${d.n} questões`}`} · {st.vistas}/{st.total} vistas
                </span>
              </span>
              <ChevronRight className={`h-4 w-4 shrink-0 transition ${open ? "rotate-90" : ""}`} />
            </button>
            {open && (
              <div className="mt-2 space-y-1.5 border-t border-borda pt-2">
                {subtemas(t.name).map((sub) => {
                  const ds = dominioSub(state, t.name, sub.content);
                  return (
                    <div key={sub.nome} className="flex items-center gap-2 text-[0.75rem]">
                      <span className="w-40 truncate">{sub.nome} <span className="text-tinta/60">({sub.total})</span></span>
                      <span className="flex-1"><Barra pct={ds.pct ?? 0} cor={ds.pct === null ? "bg-ceu" : faixaPct(ds.pct).barra} /></span>
                      <span className="w-9 text-right font-bold">{ds.pct === null ? "—" : `${ds.pct}%`}</span>
                    </div>
                  );
                })}
                <button onClick={() => onPick(t.name)} className="mt-1 w-full rounded-full bg-ceu py-2 text-[0.75rem] font-bold text-noite">Praticar {t.name}</button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---------- QUIZ ---------- */
function fmt(s: number) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}` : `${m}:${String(r).padStart(2, "0")}`;
}

function notaResolucoes() {
  return MATERIA.id === "fisica"
    ? "Gabarito oficial do Inep em todas as questões. As resoluções foram escritas por IA (Chico) e aguardam revisão do professor Silas."
    : MATERIA.id === "natureza"
      ? "Gabarito oficial do Inep em todas as questões. As resoluções comentadas foram escritas por IA e ainda não foram revisadas pelo professor Silas."
      : "Gabarito oficial do Inep em todas as questões. As resoluções comentadas desta matéria foram geradas por IA e ainda não foram revisadas pelo professor Silas.";
}

/** Enunciado com **negrito** e figuras no lugar certo ([[FIG n]] = n-ésima figura). As que não aparecem no texto vão no fim. */
function Enunciado({ q, className }: { q: Question; className: string }) {
  const partes = q.statement.split(/\[\[FIG (\d+)\]\]/g);
  const usadas = new Set<number>();
  const nodes: React.ReactNode[] = [];
  partes.forEach((parte, k) => {
    if (k % 2 === 1) {
      const n = Number(parte);
      usadas.add(n);
      nodes.push(<Figuras key={"f" + k} q={q} indices={[n]} />);
    } else if (parte.trim()) {
      nodes.push(<p key={"t" + k} className={"whitespace-pre-line " + className + (k ? " mt-3" : "")}>{inline(parte.replace(/^\n+|\n+$/g, ""))}</p>);
    }
  });
  return (
    <>
      {nodes}
      <Figuras q={q} only="enunciado" pular={usadas} />
    </>
  );
}

function Figuras({ q, only, indices, pular }: { q: Question; only?: "alternativas" | "enunciado"; indices?: number[]; pular?: Set<number> }) {
  const [zoom, setZoom] = useState<{ src: string; alt: string; w: number } | null>(null);
  const [grande, setGrande] = useState(false);
  const list = q.figures.map((f, i) => ({ f, i, alt: figuraAlt(q, f, i) }))
    .filter(({ i }) => (indices ? indices.includes(i) : !pular?.has(i)))
    .filter(({ f }) => (only === "alternativas" ? f.kind === "alternativas" : only === "enunciado" ? f.kind !== "alternativas" : true));
  useEffect(() => {
    if (!zoom) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && setZoom(null);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [zoom]);
  if (!list.length) return null;
  return (
    <div className="-mx-2 mt-3 space-y-2">
      {list.map(({ f, alt }) => (
        <button key={f.src} onClick={() => { setGrande(false); setZoom({ src: f.src, alt, w: f.width }); }} className="relative block w-full overflow-hidden rounded-xl bg-white ring-1 ring-borda" aria-label={"Ampliar: " + alt} data-testid="figura">
          <img src={f.src} alt={alt} width={f.width} height={f.height} loading="lazy" className="block h-auto max-h-[75vh] w-full object-contain" />
          <span className="absolute bottom-1.5 right-1.5 flex items-center gap-1 rounded-full bg-noite/85 px-2 py-0.5 text-[0.625rem] font-bold text-white"><ZoomIn className="h-3 w-3" /> toque pra ampliar</span>
        </button>
      ))}
      {zoom && (
        <div className="fixed inset-0 z-50 flex flex-col bg-noite/95" role="dialog" aria-label="Figura ampliada" data-testid="zoom">
          <div className="flex items-center justify-between gap-2 p-2 text-[0.75rem] font-bold text-white">
            <span>{grande ? "Arraste pra ver o resto · toque pra reduzir" : "Toque na figura pra ampliar mais"}</span>
            <button onClick={() => setZoom(null)} className="rounded-full bg-white p-2 text-noite" aria-label="Fechar"><X className="h-5 w-5" /></button>
          </div>
          <div className="flex-1 overflow-auto p-2" style={{ touchAction: "pan-x pan-y pinch-zoom" }}>
            <img src={zoom.src} alt={zoom.alt} onClick={() => setGrande(!grande)}
              className={`mx-auto rounded-lg bg-white ${grande ? "max-w-none" : "max-h-full w-full object-contain"}`}
              style={grande ? { width: `${Math.max(zoom.w, 900)}px` } : undefined} />
          </div>
        </div>
      )}
    </div>
  );
}

function Confirmar(p: { titulo: string; texto: string; ok: string; cancelar?: string; onOk: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-noite/60 p-4 sm:items-center" role="dialog" aria-modal="true">
      <div className="anim-pop w-full max-w-sm rounded-3xl bg-papel p-5 shadow-xl">
        <div className="flex items-center gap-3">
          <img src={T + "busto.webp"} alt="" className="h-16 w-16 rounded-2xl object-cover" />
          <div className="font-titulo text-xl font-extrabold leading-6 text-noite">{p.titulo}</div>
        </div>
        <p className="mt-3 text-sm text-tinta">{p.texto}</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button onClick={p.onCancel} className="rounded-full bg-azul py-3 font-bold text-white">{p.cancelar ?? "Continuar"}</button>
          <button onClick={p.onOk} className="rounded-full bg-desligado py-3 font-bold text-tinta ring-1 ring-borda">{p.ok}</button>
        </div>
      </div>
    </div>
  );
}

const fonteQuestao = (q: Question) => `Fonte: ENEM ${q.year} (Inep) · caderno ${q.booklet} · questão ${q.number}${q.textoDoPdf ? " · texto transcrito da prova oficial" : ""}`;

function QuizView(p: Quiz & {
  state: State; setState: (s: State) => void; onExit: () => void;
  onFinish: (r: { items: Item[]; xp: number; badges: string[]; levelUp: string | null; missoes: string[]; seconds: number; dominioUps: string[] }) => void;
}) {
  const { questions, mode } = p;
  const sim = isSim(mode);
  const total = sim ? SIMULADOS[mode].segundos : 0;
  const [i, setI] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [gain, setGain] = useState<Gain | null>(null);
  const [nDicas, setNDicas] = useState(0);
  const [sair, setSair] = useState(false);
  const acc = useRef({ xp: 0, badges: [] as string[], levelUp: null as string | null, missoes: [] as string[], dominioUps: [] as string[], state: p.state, combo: 0 });
  const altsRef = useRef<HTMLDivElement>(null);
  const [altsVisiveis, setAltsVisiveis] = useState(true);
  const [left, setLeft] = useState(total);
  const start = useRef(Date.now());
  const finished = useRef(false);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const frase = useMemo(() => ({ ok: pick(frasesAcerto()), erro: pick(FRASES_ERRO), sorte: Math.random() }), [i]);
  const q = questions[i];
  const ultima = i === questions.length - 1;
  const emAndamento = items.length > 0 || chosen !== null;
  const ehRevisao = (id: string) => p.revisao.includes(id);

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const links = ["anim_acerto", "anim_erro"].map((c) => {
      const l = document.createElement("link");
      l.rel = "prefetch"; l.href = T + c + ".mp4"; l.as = "video";
      document.head.appendChild(l);
      return l;
    });
    return () => links.forEach((l) => l.remove());
  }, []);

  // simulado: só som de largada e de fim; nada de som/vibração por questão (não entrega o gabarito)
  useEffect(() => {
    if (!sim) return;
    setModoProva(true);
    tocar("simInicio");
    return () => setModoProva(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!emAndamento) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [emAndamento]);

  useEffect(() => {
    if (revealed) setTimeout(() => feedbackRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
  }, [revealed]);

  const absorb = (g: Gain) => {
    acc.current.xp += g.xp; acc.current.badges.push(...g.newBadges); acc.current.missoes.push(...g.missoes);
    if (g.levelUp) acc.current.levelUp = g.levelUp;
    if (g.dominioUp) acc.current.dominioUps.push(`${g.dominioUp.tema}: ${g.dominioUp.nivel}`);
  };

  const finish = (all: Item[]) => {
    if (finished.current) return;
    finished.current = true;
    const seconds = Math.round((Date.now() - start.current) / 1000);
    if (sim) {
      let s = acc.current.state;
      for (const it of all) {
        if (!it.chosen) continue;
        const [ns, g] = registerAnswer(s, it.q, it.chosen === it.q.answer, "simulado");
        s = ns; absorb(g);
      }
      const score = all.filter((it) => it.chosen === it.q.answer).length;
      const [ns, g] = registerSimulado(s, mode, score, all.length, seconds);
      s = ns; absorb(g);
      p.setState(s);
      setModoProva(false);
      tocar("simFim");
    }
    p.onFinish({ items: all, xp: acc.current.xp, badges: acc.current.badges, levelUp: acc.current.levelUp, missoes: acc.current.missoes, seconds, dominioUps: acc.current.dominioUps });
  };

  useEffect(() => {
    if (!sim) return;
    const t = setInterval(() => {
      const l = total - Math.round((Date.now() - start.current) / 1000);
      setLeft(l);
      if (l <= 0) { clearInterval(t); finish([...items, ...questions.slice(items.length).map((qq, k) => ({ q: qq, chosen: k === 0 ? chosen : null }))]); }
    }, 500);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, chosen]);

  const longa = !!q && (q.statement.length > 650 || q.figures.length > 0);
  useEffect(() => {
    const el = altsRef.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([e]) => setAltsVisiveis(e.isIntersecting || e.boundingClientRect.top < 0), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, [i, q?.id]);
  const irParaAlternativas = () => altsRef.current?.scrollIntoView({ behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });

  if (!q) {
    return (
      <div className="pt-10 text-center">
        <img src={T + "acena.webp"} className="mx-auto h-40 w-40 rounded-3xl object-cover" alt="" />
        <p className="mt-4 font-bold">Nada pra revisar hoje. Bora praticar!</p>
        <button onClick={p.onExit} className="mt-4 rounded-full bg-azul px-6 py-3 font-bold text-white">Voltar</button>
      </div>
    );
  }

  const choose = (letter: string) => {
    if (revealed) return;
    setChosen(letter);
    if (!sim) {
      const origem = mode === "revisao" || ehRevisao(q.id) ? "revisao" : "pratica";
      const [ns, g] = registerAnswer(acc.current.state, q, letter === q.answer, origem, nDicas);
      acc.current.state = ns; absorb(g);
      p.setState(ns);
      setGain(g);
      setRevealed(true);
      const ok = letter === q.answer;
      acc.current.combo = ok ? acc.current.combo + 1 : 0;
      const somDe: Record<Reacao, Som> = { acerto: "acerto", erro: "erro", sequencia: "combo", recuperou: "recuperou", meta: "meta", surpresa: "surpresa" };
      let s1 = somDe[tipoReacao(ok, g)];
      if (s1 === "acerto" && acc.current.combo >= 3 && acc.current.combo % 3 === 0) s1 = "combo"; // 3, 6, 9 acertos seguidos na sessão
      tocar(s1);
      if (g.dominioUp || g.levelUp) setTimeout(() => tocar("nivel"), s1 === "meta" ? 900 : 520);
      vibrar(ok ? 35 : [50, 70, 50]);
    }
  };
  const avancar = (resp: string | null) => {
    const all = [...items, { q, chosen: resp }];
    setItems(all);
    if (ultima) return finish(all);
    setI(i + 1); setChosen(null); setRevealed(false); setGain(null); setNDicas(0);
    window.scrollTo(0, 0);
  };
  const tentarSair = () => (emAndamento ? setSair(true) : p.onExit());
  const sairAgora = () => {
    if (!sim && (items.length || revealed)) {
      const all = revealed ? [...items, { q, chosen }] : items;
      return finish(all);
    }
    p.onExit();
  };
  const correct = chosen === q.answer;
  const t = topicInfo(q.area);
  const titulo = sim ? SIMULADOS[mode].nome : mode === "revisao" ? "Revisão de erros" : mode === "inteligente" ? "Treino inteligente" : mode === "rapido" ? "Treino rápido de 5" : p.topic ?? "Mistão do dia";
  const letras: Option[] = q.options ?? LETTERS.map((l) => ({ letter: l, text: "" }));
  const ds = sim ? [] : dicas(q);

  return (
    <div>
      {sair && (
        <Confirmar titulo="Sair agora?" ok="Sair"
          texto={sim ? "Se sair, este simulado não vai contar (nenhuma resposta dele é salva)." : "Suas respostas até aqui já estão salvas. Você vai ver o resumo da sessão."}
          onCancel={() => setSair(false)} onOk={() => { setSair(false); sairAgora(); }} />
      )}
      <div className="mb-3 flex items-center gap-2">
        <button onClick={tentarSair} className="rounded-full bg-papel p-2 shadow-sm ring-1 ring-borda" aria-label="Sair"><X className="h-5 w-5" /></button>
        <div className="flex-1">
          <div className="flex justify-between text-xs font-bold text-noite"><span className="truncate">{titulo}</span><span data-testid="contador">{i + 1}/{questions.length}</span></div>
          <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-ceu">
            <div className="h-full rounded-full bg-azul transition-all" style={{ width: `${((i + (revealed ? 1 : 0)) / questions.length) * 100}%` }} />
          </div>
        </div>
        <BotaoSom />
        {sim && (
          <div data-testid="cronometro" className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-black ${left < 300 ? "bg-vermelho text-white" : "bg-papel text-vermelho ring-1 ring-borda"}`}>
            <Clock className="h-4 w-4" /> {fmt(Math.max(0, left))}
          </div>
        )}
      </div>

      <div className="anim-pop rounded-3xl bg-papel p-4 shadow-sm ring-1 ring-borda">
        <div className="mb-2 flex flex-wrap gap-1.5 text-[0.6875rem] font-bold">
          <span className={`${t.corClara} rounded-full px-2 py-0.5 text-tinta`}>{t.emoji} {q.area}</span>
          <span className="rounded-full bg-ceu px-2 py-0.5 text-tinta/85">ENEM {q.year} · Q{q.number}</span>
          {(mode === "revisao" || ehRevisao(q.id)) && <span className="rounded-full bg-laranja-claro px-2 py-0.5 text-laranja-escuro">🔁 revisão</span>}
        </div>
        <Enunciado q={q} className="text-[0.9375rem] leading-6" />
        <div className="mt-2 text-[0.6875rem] text-tinta/70" data-testid="fonte-questao">{fonteQuestao(q)}</div>
      </div>

      {!q.options && (
        <div className="mt-3 rounded-3xl bg-papel p-3 shadow-sm ring-1 ring-borda">
          <div className="text-[0.75rem] font-bold text-noite">Alternativas (na figura da prova):</div>
          <Figuras q={q} only="alternativas" />
        </div>
      )}

      {!revealed && ds.length > 0 && (
        <div className="mt-3 rounded-3xl bg-ouro-claro p-3 ring-1 ring-laranja/40" data-testid="dicas">
          {nDicas === 0 ? (
            <button onClick={() => setNDicas(1)} className="flex w-full items-center gap-2 text-left text-[0.8125rem] font-bold text-laranja-escuro">
              <Lightbulb className="h-5 w-5 shrink-0" /> Pedir uma Dica do Tigrão <span className="ml-auto text-[0.6875rem] font-semibold text-tinta/70">acerto vale {XP.acertoComDica[1]} XP</span>
            </button>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[0.8125rem] font-extrabold text-laranja-escuro"><Lightbulb className="h-5 w-5" /> Dica do Tigrão</div>
              {ds.slice(0, nDicas).map((d, k) => <p key={k} className="text-[0.8125rem] leading-5">{inline(d)}</p>)}
              {nDicas < ds.length && (
                <button onClick={() => setNDicas(nDicas + 1)} className="rounded-full bg-papel px-3 py-1.5 text-[0.75rem] font-bold text-laranja-escuro ring-1 ring-laranja/40">
                  Mais uma dica (acerto vale {XP.acertoComDica[Math.min(nDicas + 1, 2)]} XP)
                </button>
              )}
              <p className="text-[0.625rem] leading-3 text-tinta/70">{q.explanation?.author === "IA" ? "Trecho da resolução gerada por IA, ainda não revisada pelo professor." : "Trecho da resolução escrita por IA (Chico), aguardando revisão do professor."}</p>
            </div>
          )}
        </div>
      )}

      {sim && <p className="mt-3 text-center text-[0.6875rem] font-semibold text-tinta/75">Modo prova: gabarito e resolução só aparecem no final.</p>}

      {longa && !altsVisiveis && !revealed && !chosen && (
        <button onClick={irParaAlternativas} data-testid="ir-alternativas"
          className="anim-sobe fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-noite px-4 py-2.5 text-[0.8125rem] font-extrabold text-white shadow-xl ring-2 ring-white">
          <ArrowDown className="h-4 w-4" /> Ir para as alternativas
        </button>
      )}

      <div ref={altsRef} className={`mt-3 scroll-mt-3 ${q.options ? "space-y-2.5" : "grid grid-cols-5 gap-2"}`} data-testid="alternativas">
        {letras.map((o) => {
          const isChosen = chosen === o.letter;
          const isAns = o.letter === q.answer;
          let cls = "bg-papel ring-borda";
          if (sim && isChosen) cls = "bg-azul-claro ring-azul";
          if (revealed && isAns) cls = "bg-teal-claro ring-teal";
          if (revealed && isChosen && !isAns) cls = "bg-vermelho-claro ring-vermelho anim-shake";
          return (
            <button key={o.letter} onClick={() => choose(o.letter)} disabled={revealed} aria-label={`Alternativa ${o.letter}`}
              className={`${cls} flex w-full items-start gap-3 rounded-2xl p-3 text-left ring-2 transition active:scale-[.98] ${q.options ? "" : "justify-center"}`}>
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl font-black ${revealed && isAns ? "bg-teal text-white" : revealed && isChosen ? "bg-vermelho text-white" : isChosen ? "bg-azul text-white" : "bg-ceu text-noite"}`}>
                {revealed && isAns ? <Check className="h-5 w-5" /> : revealed && isChosen ? <X className="h-5 w-5" /> : o.letter}
              </span>
              {(o.text || o.img) && (
                <span className="pt-1 text-[0.875rem] leading-5">
                  {o.text}
                  {o.img && <img src={o.img.src} alt={`Alternativa ${o.letter}`} width={o.img.width} height={o.img.height} loading="lazy" className="mt-1 block h-auto max-h-40 w-auto max-w-full rounded-lg bg-white" />}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {revealed && (
        <div ref={feedbackRef} className="anim-pop mt-4 scroll-mt-3 space-y-3">
          <ReacaoTigrao q={q} correct={correct} gain={gain} sorte={frase.sorte} titulo={correct ? frase.ok : frase.erro} nDicas={nDicas} />
          <Resolucao q={q} />
        </div>
      )}

      {(revealed || (sim && chosen)) && (
        <button onClick={() => avancar(chosen)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-azul py-3.5 font-titulo text-lg font-extrabold text-white shadow-md active:scale-95">
          {ultima ? "Ver resultado" : sim ? "Confirmar e seguir" : "Próxima questão"} <ChevronRight className="h-5 w-5" />
        </button>
      )}
      {sim && !chosen && (
        <button onClick={() => avancar(null)} className="mt-4 w-full rounded-full bg-papel py-3 text-sm font-bold text-tinta/80 ring-1 ring-borda">
          {ultima ? "Deixar em branco e ver resultado" : "Pular (deixar em branco)"}
        </button>
      )}
    </div>
  );
}

/* Markdown simples das resoluções: **negrito**, listas "- ", parágrafos. */
function inline(s: string) {
  return s.split(/(\*\*[^*]+\*\*)/g).map((part, k) => (part.startsWith("**") && part.endsWith("**") ? <b key={k}>{part.slice(2, -2)}</b> : part));
}

function SeloResolucao({ q }: { q: Question }) {
  const ex = q.explanation!;
  const base = "mb-3 rounded-2xl px-3 py-2 text-[0.75rem] font-extrabold leading-4";
  if (ex.author === "IA")
    return <div data-testid="selo" className={`${base} bg-ouro-claro text-noite ring-2 ring-laranja`}>🤖 Resolução gerada por IA · Resolução ainda não revisada pelo professor</div>;
  if (ex.reviewed)
    return <div data-testid="selo" className={`${base} bg-teal-claro text-teal ring-1 ring-teal`}>✅ Revisada pelo Prof. Silas</div>;
  return (
    <div data-testid="selo" className={`${base} bg-ouro-claro text-noite ring-2 ring-laranja`}>
      🤖 Explicação gerada por IA ({ex.author.replace(/^IA \((.*)\)$/, "$1")}) · Aguardando revisão do professor
      {ex.lowConfidence && " · ⚠️ Confiança baixa: confira com atenção."}
    </div>
  );
}

function Secao({ titulo, children, testid }: { titulo: string; children: React.ReactNode; testid?: string }) {
  return (
    <div data-testid={testid}>
      <div className="mb-1 text-[0.75rem] font-black uppercase tracking-wide text-azul">{titulo}</div>
      {children}
    </div>
  );
}
const Lista = ({ itens }: { itens: string[] }) => (
  <ul className="ml-4 list-disc space-y-1 marker:text-laranja">{itens.map((t, k) => <li key={k}>{inline(t.replace(/^(\*\*)?([a-záéíóúâêôãõç])/, (_m, b, c) => (b ?? "") + c.toUpperCase()))}</li>)}</ul>
);

/** Resolução em tópicos: Ideia-chave / Como resolver / Por que as outras estão erradas / Resposta (mesmo texto, só reorganizado). */
function ResolucaoTopicos({ q }: { q: Question }) {
  const r = estruturar(q.explanation!, q.answer);
  const ideias = r.conceito ? [`**${r.conceito.replace(/\.$/, "")}**${r.ideia.length ? ": " + r.ideia[0] : ""}`, ...r.ideia.slice(1)] : r.ideia;
  return (
    <div className="space-y-3 text-[0.875rem] leading-5" data-testid="resolucao-topicos">
      {ideias.length > 0 && <Secao titulo="💡 Ideia-chave" testid="sec-ideia"><Lista itens={ideias} /></Secao>}
      {r.passos.length > 0 && <Secao titulo="🧭 Como resolver" testid="sec-como"><Lista itens={r.passos} /></Secao>}
      {r.outras.length > 0 && <Secao titulo="🚫 Por que as outras estão erradas" testid="sec-outras"><Lista itens={r.outras} /></Secao>}
      {q.explanation!.commonMistake && <Secao titulo="⚠️ Erro comum"><Lista itens={[q.explanation!.commonMistake]} /></Secao>}
      <div className="rounded-2xl bg-teal-claro px-3 py-2 font-bold text-noite" data-testid="sec-resposta">
        ✅ Resposta: {r.resposta}{r.porQue ? <span className="font-semibold"> · {inline(r.porQue)}</span> : null}
      </div>
    </div>
  );
}

function Resolucao({ q }: { q: Question }) {
  const ex = q.explanation;
  return (
    <div className="rounded-3xl bg-papel p-4 shadow-sm ring-1 ring-borda">
      <div className="mb-2 flex items-center gap-2">
        <img src={T + "avatar.webp"} className="h-8 w-8 rounded-full object-cover" alt="" />
        <span className="font-titulo text-lg font-extrabold text-azul">Resolução comentada</span>
      </div>
      <div className="mb-3 rounded-2xl bg-teal-claro px-3 py-2 text-[0.8125rem] font-bold text-tinta">✅ Gabarito oficial (Inep): letra {q.answer}{q.options ? ` — ${optionText(q, q.answer)}` : ""}</div>
      {ex ? (
        <>
          <SeloResolucao q={q} />
          <ResolucaoTopicos q={q} />
        </>
      ) : (
        <p className="text-[0.8125rem] text-tinta/85">A resolução comentada desta questão ainda não foi escrita. Confira o gabarito oficial acima.</p>
      )}
      <div className="mt-3 border-t border-borda pt-2 text-[0.6875rem] leading-4 text-tinta/75">
        {fonteQuestao(q)}.{" "}
        <a className="inline-flex items-center gap-0.5 font-bold text-azul underline" href={INEP} target="_blank" rel="noreferrer">provas e gabaritos <ExternalLink className="h-3 w-3" /></a>
      </div>
    </div>
  );
}

/* ---------- reações do Tigrão (acerto, erro, sequência, erro recuperado, meta do dia, bônus surpresa) ---------- */
type Reacao = "acerto" | "erro" | "sequencia" | "recuperou" | "meta" | "surpresa";
function tipoReacao(correct: boolean, g: Gain | null): Reacao {
  if (!correct) return "erro";
  if (g?.metaBatida) return "meta";
  if (g?.recuperou) return "recuperou";
  if (g?.sequencia && g.sequencia >= 2) return "sequencia";
  if (g?.surpresa) return "surpresa";
  return "acerto";
}
/** Cada reação usa uma arte/expressão diferente do Tigrão (mesmas artes de public/tigrao, variando recorte, moldura e animação). */
const VISUAL: Record<Reacao, { clip?: Clip; img: string; anim: string; emoji: string; moldura: string; fundo: string; alt: string }> = {
  acerto: { clip: "anim_acerto", img: "avatar.webp", anim: "anim-pulo", emoji: "🎉", moldura: "", fundo: "bg-teal text-white", alt: "Tigrão comemorando" },
  surpresa: { clip: "anim_acerto", img: "avatar.webp", anim: "anim-pulo", emoji: "🎁", moldura: "ring-4 ring-ouro-claro", fundo: "bg-teal text-white", alt: "Tigrão com um presente" },
  erro: { clip: "anim_erro", img: "busto.webp", anim: "anim-pensa", emoji: "🤔", moldura: "", fundo: "bg-vermelho-claro text-tinta ring-2 ring-vermelho/40", alt: "Tigrão pensativo, dando força" },
  sequencia: { img: "avatar.webp", anim: "anim-brilho", emoji: "🔥", moldura: "ring-4 ring-laranja", fundo: "bg-gradient-to-r from-laranja-escuro to-laranja text-white", alt: "Tigrão animado com a sequência" },
  recuperou: { img: "acena.webp", anim: "anim-giro", emoji: "💪", moldura: "ring-4 ring-white", fundo: "bg-gradient-to-r from-teal to-azul text-white", alt: "Tigrão vibrando com o erro recuperado" },
  meta: { img: "cena.webp", anim: "anim-brilho", emoji: "🏆", moldura: "ring-4 ring-ouro-claro", fundo: "bg-gradient-to-r from-noite to-azul text-white", alt: "Tigrão no laboratório comemorando a meta" },
};
function falaTigrao(tipo: Reacao, q: Question, g: Gain | null, sorte: number): { titulo?: string; fala: string } {
  const c = q.explanation?.keyConcept?.replace(/\.$/, "");
  const n = g?.sequencia ?? 0;
  const um = (xs: string[]) => xs[Math.floor(sorte * xs.length) % xs.length];
  switch (tipo) {
    case "erro":
      return { fala: um([
        c ? `Oxe, essa pegou! O pulo do gato aqui é: ${c}.` : "Oxe, essa pegou! Bora ver a resolução juntos.",
        `Vixe, quase! O gabarito é ${q.answer}. Lê a resolução comigo, sem aperreio.`,
        "Errar aqui é treino. Essa volta na sua revisão e aí você pega de jeito.",
        c ? `Calma! Revê só isto: ${c}. Depois a próxima vem mais fácil.` : "Calma! Respira, lê a resolução e bora pra próxima.",
      ]) };
    case "meta":
      return { titulo: "Meta do dia batida! 🎯", fala: um([`${META_DIARIA} questões hoje! Tô orgulhoso de você, visse? +${XP.metaDiaria} XP de bônus.`, `Bateu as ${META_DIARIA} de hoje. Dever cumprido! +${XP.metaDiaria} XP de bônus.`]) };
    case "recuperou":
      return { titulo: "Virou o jogo! 💪", fala: um(["O que pegou antes, agora você acertou. Isso é aprender de verdade!", "Esse erro agora é acerto. Arretado demais!"]) };
    case "sequencia":
      return { titulo: `${n} dias seguidos! 🔥`, fala: um([`Constância é o que pesa no ENEM. Bora manter o foguinho aceso!`, `Oxente, ${n} dias sem falhar! Tô orgulhoso, visse?`]) };
    case "surpresa":
      return { titulo: "Bônus surpresa! 🎁", fala: um([`Ó o presente: +${XP.surpresa} XP extra por essa resposta!`, `Hoje o Tigrão tá generoso: +${XP.surpresa} XP de bônus!`]) };
    default:
      return { fala: um([`Arretado! Mandou bem em ${q.area}.`, c ? `Isso aí! Você pegou a ideia: ${c}.` : "Isso aí! Raciocínio no ponto.", "Massa! Leu com calma e acertou. Na prova é assim."]) };
  }
}
function ReacaoTigrao({ q, correct, gain, sorte, titulo, nDicas }: { q: Question; correct: boolean; gain: Gain | null; sorte: number; titulo: string; nDicas: number }) {
  const tipo = tipoReacao(correct, gain);
  const v = VISUAL[tipo];
  const f = falaTigrao(tipo, q, gain, sorte);
  const festa = tipo === "meta" || tipo === "sequencia" || tipo === "recuperou" || !!gain?.dominioUp;
  const cls = `h-24 w-24 rounded-2xl object-cover ${v.moldura}`;
  return (
    <div className={`relative overflow-hidden rounded-3xl p-3 ${v.fundo}`} data-testid="reacao-tigrao" data-reacao={tipo}>
      {correct && <Confete n={festa ? 26 : 14} />}
      <div className="relative flex items-center gap-3">
        <div className="relative shrink-0">
          {v.clip ? (
            <TigraoAnimado clip={v.clip} poster={v.img} alt={v.alt} className={cls + (tipo === "erro" ? " w-28" : "")} imgClassName={v.anim} />
          ) : (
            <img src={T + v.img} alt={v.alt} className={`${cls} ${v.anim}`} data-expressao={tipo} />
          )}
          <span className="anim-estrela absolute -right-2 -top-2 text-2xl">{v.emoji}</span>
        </div>
        <div className="min-w-0">
          <div className="font-titulo text-xl font-extrabold leading-6">{f.titulo ?? titulo}</div>
          <div className="text-sm font-semibold opacity-90" data-testid="xp-feedback">
            {correct ? `+${gain?.xp ?? XP.acerto} XP` : `Gabarito oficial: letra ${q.answer}. Sem XP desta vez — vale pela revisão!`}
          </div>
          {correct && nDicas > 0 && <div className="text-xs font-bold">💡 Com {plural(nDicas, "dica", "dicas")}: acerto vale {XP.acertoComDica[Math.min(nDicas, 2)]} XP.</div>}
        </div>
      </div>
      <div className={`relative mt-2 rounded-2xl px-3 py-2 text-[0.8125rem] font-semibold leading-5 ${correct ? "bg-white/95 text-tinta" : "bg-papel text-tinta"}`} data-testid="fala-tigrao">
        🐾 {f.fala}
      </div>
      <div className="relative mt-2 flex flex-wrap gap-1.5 text-[0.75rem] font-extrabold">
        {gain?.recuperou && <span className="anim-sobe rounded-full bg-white px-2.5 py-1 text-teal ring-2 ring-teal" data-testid="chip-recuperou">🔁 Erro recuperado! +{XP.revisao} XP de revisão</span>}
        {!!gain?.surpresa && <span className="anim-sobe rounded-full bg-ouro-claro px-2.5 py-1 text-noite ring-2 ring-laranja" data-testid="bonus-surpresa">🎁 Bônus surpresa: +{gain.surpresa} XP</span>}
        {!!gain?.sequencia && gain.sequencia >= 2 && <span className="anim-sobe rounded-full bg-laranja-claro px-2.5 py-1 text-laranja-escuro">🔥 {gain.sequencia} dias seguidos</span>}
        {!correct && <span className="rounded-full bg-papel px-2.5 py-1 text-tinta ring-1 ring-borda">🔁 Ela volta na sua revisão de erros.</span>}
        {gain?.metaBatida && <span className="anim-sobe rounded-full bg-ouro-claro px-2.5 py-1 text-noite">🎯 Meta do dia batida! +{XP.metaDiaria} XP</span>}
        {gain?.missoes.map((m) => <span key={m} className="rounded-full bg-papel px-2.5 py-1 text-tinta">🗓️ Missão cumprida: {m}</span>)}
        {gain?.levelUp && <span className="rounded-full bg-papel px-2.5 py-1 text-tinta">⬆️ Subiu de nível: {gain.levelUp}!</span>}
        {gain?.newBadges.map((b) => <span key={b} className="rounded-full bg-papel px-2.5 py-1 text-tinta">🏅 Nova medalha: {badgeLabel(b).nome}</span>)}
      </div>
      {gain?.dominioUp && (
        <div role="status" className="anim-pop relative mt-2 rounded-2xl bg-ouro-claro px-3 py-2 text-[0.8125rem] font-extrabold text-noite ring-2 ring-laranja" data-testid="dominio-up">
          🏅 Subiu de nível em {gain.dominioUp.tema}: agora você está em <b>{gain.dominioUp.nivel}</b>!
        </div>
      )}
    </div>
  );
}

function Confete({ n = 14 }: { n?: number }) {
  const cores = ["#f08a24", "#ffd166", "#ffffff", "#9cc3ff", "#2453a6"];
  return (
    <>
      {Array.from({ length: n }).map((_, k) => (
        <span key={k} className="confete" aria-hidden="true" style={{ left: `${(k * 37 + 5) % 100}%`, top: -10, background: cores[k % cores.length], animationDelay: `${(k % 7) * 0.07}s` }} />
      ))}
    </>
  );
}

/* ---------- RESULTADO ---------- */
function Resultado(p: {
  mode: Mode; topic: string | null; items: Item[]; xp: number; badges: string[]; levelUp: string | null; missoes: string[]; seconds: number; dominioUps?: string[];
  state: State; onHome: () => void; onAgain: () => void;
}) {
  const sim = isSim(p.mode);
  const score = p.items.filter((it) => it.chosen === it.q.answer).length;
  const total = p.items.length;
  const brancos = p.items.filter((it) => !it.chosen).length;
  const pct = total ? Math.round((score / total) * 100) : 0;
  const otimo = pct >= 70;
  const baixo = pct < 40;
  const [aberta, setAberta] = useState<string | null>(null);
  const msg = pct === 100 ? "GABARITOU! Que sessão, hein? 💯"
    : otimo ? MATERIA.fraseOtimo
      : !baixo ? "Tá no caminho! Revisa as resoluções e volta mais forte."
        : "Calma, todo astronauta começa no chão. Os erros já foram pra sua revisão — bora juntos! 🐾";
  const porTema = TOPICS.map((t) => {
    const its = p.items.filter((it) => it.q.area === t.name);
    return { t, n: its.length, ok: its.filter((it) => it.chosen === it.q.answer).length };
  }).filter((x) => x.n > 0);
  const tituloModo = sim ? `Resultado do ${SIMULADOS[p.mode as SimKind].nome}` : p.mode === "revisao" ? "Revisão concluída" : p.mode === "inteligente" ? "Treino inteligente" : p.mode === "rapido" ? "Treino rápido de 5" : p.topic ?? "Mistão do dia";
  const faixa = faixaPct(pct);
  return (
    <div className="space-y-4">
      <div className={`relative overflow-hidden rounded-[28px] p-5 text-center text-white shadow-md ${baixo ? "bg-azul" : "bg-noite"}`}>
        <div className="estrelas absolute inset-0" />
        {otimo && <Confete />}
        <div className="relative font-titulo text-sm font-extrabold uppercase tracking-wider text-white/85">{tituloModo}</div>
        <TigraoAnimado clip={otimo ? "anim_acerto" : baixo ? "anim_erro" : "anim_abertura"} poster={otimo ? "acena.webp" : baixo ? "busto.webp" : "avatar.webp"}
          alt={otimo ? "Tigrão comemorando" : baixo ? "Tigrão dando força" : "Tigrão acenando"}
          className="relative mx-auto mt-3 h-44 w-44 rounded-3xl object-cover ring-4 ring-white/70" imgClassName={otimo ? "anim-pulo" : baixo ? "anim-pensa" : "anim-float"} />
        <div className="relative mt-3 font-titulo text-5xl font-extrabold">{score}/{total}</div>
        <div className="relative text-sm font-bold text-white/90">
          {plural(score, "acerto", "acertos")} · <span className={`rounded-full px-2 py-0.5 font-extrabold ${faixa.chip}`} data-testid="pct-geral" data-faixa={faixa.id}>{pct}%</span>{sim ? ` · ${fmt(p.seconds)}` : ""}{sim && brancos ? ` · ${brancos} em branco` : ""}
        </div>
        <Balao className="sem-rabo relative mx-auto mt-3 w-fit">{msg}</Balao>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat v={`+${p.xp}`} l="XP ganhos" cor="text-azul" />
        <Stat v={`${p.state.streak.count}🔥`} l={p.state.streak.count === 1 ? "dia seguido" : "dias seguidos"} cor="text-laranja-escuro" />
        <Stat v={levelOf(p.state.xp).cur.emoji} l={levelOf(p.state.xp).cur.title} cor="text-teal" />
      </div>

      {sim && (
        <div className="rounded-3xl bg-papel p-4 shadow-sm ring-1 ring-borda" data-testid="relatorio-tema">
          <div className="mb-2 font-titulo text-lg font-extrabold text-noite">Relatório por tema</div>
          <div className="space-y-2">
            {porTema.map(({ t, n, ok }) => {
              const pt = Math.round((ok / n) * 100);
              const f = faixaPct(pt);
              return (
                <div key={t.name} className="text-[0.8125rem]" data-testid="tema-resultado" data-faixa={f.id}>
                  <div className="flex justify-between font-bold"><span>{t.emoji} {t.name}</span><span>{ok}/{n} · <span className={`rounded-full px-1.5 ${f.chip}`}>{pt}%</span></span></div>
                  <div className="mt-1"><Barra pct={pt} cor={f.barra} /></div>
                </div>
              );
            })}
          </div>
          <LegendaFaixas />
          <p className="mt-2 text-[0.6875rem] leading-4 text-tinta/70">Percentual de acertos neste simulado. Não é nota TRI do ENEM. Os erros já entraram na sua revisão.</p>
        </div>
      )}

      {(p.levelUp || p.badges.length > 0 || p.missoes.length > 0 || !!p.dominioUps?.length) && (
        <div className="anim-pop rounded-3xl bg-laranja-claro p-4 ring-2 ring-laranja">
          {[...new Set(p.dominioUps ?? [])].map((d) => <div key={d} className="text-sm font-bold" data-testid="resultado-dominio-up">🏅 Novo nível de domínio · {d}</div>)}
          {p.levelUp && <div className="font-titulo text-lg font-extrabold">⬆️ Subiu de nível! Agora você é {p.levelUp}</div>}
          {[...new Set(p.missoes)].map((m) => <div key={m} className="text-sm font-bold">🗓️ Missão cumprida: {m}</div>)}
          {[...new Set(p.badges)].map((b) => { const l = badgeLabel(b); return <div key={b} className="text-sm font-bold">{l.emoji} Medalha nova: {l.nome}</div>; })}
        </div>
      )}

      <div className="rounded-3xl bg-papel p-3 shadow-sm ring-1 ring-borda">
        <div className="mb-2 px-1 font-titulo text-lg font-extrabold text-noite">{sim ? "Gabarito e resoluções" : "Revisão das questões"}</div>
        <div className="space-y-2">
          {p.items.map((it, k) => {
            const ok = it.chosen === it.q.answer;
            const open = aberta === it.q.id;
            return (
              <div key={it.q.id} className={`rounded-2xl p-2.5 ${ok ? "bg-teal-claro" : "bg-vermelho-claro"}`}>
                <button className="flex w-full items-center gap-2 text-left" onClick={() => setAberta(open ? null : it.q.id)}>
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-white ${ok ? "bg-teal" : "bg-vermelho"}`}>{ok ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}</span>
                  <span className="min-w-0 flex-1 text-[0.8125rem]">
                    <b>{k + 1}. {it.q.area}</b> · ENEM {it.q.year} Q{it.q.number}
                    <span className="block text-[0.6875rem] text-tinta/80">Sua: {it.chosen ? `${it.chosen}) ${optionText(it.q, it.chosen)}` : "em branco"}</span>
                    {!ok && <span className="block text-[0.6875rem] font-bold text-tinta">Gabarito: {it.q.answer}) {optionText(it.q, it.q.answer)}</span>}
                  </span>
                  <ChevronRight className={`h-4 w-4 shrink-0 transition ${open ? "rotate-90" : ""}`} />
                </button>
                {open && (
                  <div className="mt-2 space-y-2">
                    <div className="rounded-2xl bg-papel p-3">
                      <Enunciado q={it.q} className="text-[0.8125rem] leading-5" />
                      <Figuras q={it.q} only="alternativas" />
                      {it.q.options && (
                        <ul className="mt-2 space-y-1">
                          {it.q.options.map((o) => {
                            const ans = o.letter === it.q.answer, mine = o.letter === it.chosen;
                            return (
                              <li key={o.letter} className={`rounded-xl px-2 py-1 text-[0.8125rem] ${ans ? "bg-teal-claro font-bold" : mine ? "bg-vermelho-claro" : ""}`}>
                                <b>{o.letter})</b> {o.text} {o.img && <img src={o.img.src} alt={`Alternativa ${o.letter}`} width={o.img.width} height={o.img.height} loading="lazy" className="my-1 inline-block h-auto max-h-28 w-auto max-w-full rounded bg-white align-middle" />} {ans && "✅"} {mine && !ans && "❌ (sua)"}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                    <Resolucao q={it.q} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button onClick={p.onHome} className="rounded-full bg-papel py-3 font-bold text-noite shadow-sm ring-1 ring-borda">Início</button>
        <button onClick={p.onAgain} className="rounded-full bg-vermelho py-3 font-bold text-white shadow-md">Jogar de novo</button>
      </div>
    </div>
  );
}

function Stat({ v, l, cor }: { v: string; l: string; cor: string }) {
  return (
    <div className="rounded-2xl bg-papel p-2.5 shadow-sm ring-1 ring-borda">
      <div className={`font-titulo text-2xl font-extrabold ${cor}`}>{v}</div>
      <div className="truncate text-[0.6875rem] font-semibold text-tinta/75">{l}</div>
    </div>
  );
}

/* ---------- CONQUISTAS ---------- */
function Conquistas({ state, onBack }: { state: State; onBack: () => void }) {
  const lv = levelOf(state.xp);
  const melhor = state.simulados.reduce((m, r) => Math.max(m, r.total ? Math.round((r.score / r.total) * 100) : 0), 0);
  const todas = ALL_BADGES();
  return (
    <div className="space-y-4">
      <Header title="Conquistas" onBack={onBack} />
      <div className="flex items-center gap-3 rounded-3xl bg-noite p-4 text-white shadow-md">
        <img src={T + "busto.webp"} className="h-20 w-20 rounded-2xl object-cover ring-4 ring-white/60" alt="Tigrão" />
        <div>
          <div className="text-xs font-bold uppercase text-white/80">Sua jornada de treino</div>
          <div className="font-titulo text-2xl font-extrabold leading-7">{lv.cur.emoji} {lv.cur.title}</div>
          <div className="text-xs text-white/90">{state.xp} XP · recorde de {plural(state.streak.best, "dia", "dias")} 🔥{state.simulados.length ? ` · melhor simulado ${melhor}%` : ""}</div>
        </div>
      </div>

      <div className="rounded-3xl bg-papel p-4 shadow-sm ring-1 ring-borda">
        <div className="mb-2 font-titulo text-lg font-extrabold text-noite">Níveis</div>
        <ol className="space-y-1.5" data-testid="niveis">
          {LEVELS.map((l, k) => {
            const done = state.xp >= l.min;
            return (
              <li key={l.title} className={`flex items-center gap-2 rounded-2xl px-3 py-2 text-sm ${k === lv.index ? "bg-azul text-white" : done ? "bg-teal-claro text-tinta" : "bg-desligado text-tinta"}`}>
                <span className="text-lg">{done ? l.emoji : "🔒"}</span><span className="flex-1 font-bold">{l.title}</span><span className="text-xs font-semibold">{l.min} XP</span>
              </li>
            );
          })}
        </ol>
        <p className="mt-2 text-[0.6875rem] leading-4 text-tinta/70">Os níveis medem XP, ou seja, treino e dedicação. Não são previsão de nota do ENEM. Pra saber onde você está, veja "Meu domínio".</p>
      </div>

      <div className="rounded-3xl bg-papel p-4 shadow-sm ring-1 ring-borda">
        <div className="mb-2 font-titulo text-lg font-extrabold text-noite">Medalhas ({state.badges.length}/{todas.length})</div>
        <div className="grid grid-cols-3 gap-2">
          {todas.map((id) => {
            const l = badgeLabel(id);
            const tem = state.badges.includes(id);
            return (
              <div key={id} className={`rounded-2xl p-2 text-center ${tem ? "bg-laranja-claro ring-2 ring-laranja" : "bg-desligado ring-1 ring-borda"}`} title={l.desc}>
                <div className="text-2xl">{tem ? l.emoji : "🔒"}</div>
                <div className="text-[0.6875rem] font-bold leading-3.5 text-tinta">{l.nome}</div>
                <div className="mt-0.5 text-[0.625rem] leading-3 text-tinta/80">{l.desc}</div>
              </div>
            );
          })}
        </div>
      </div>
      <p className="px-2 text-center text-[0.6875rem] text-tinta/70">Seu progresso fica salvo só neste aparelho (sem login). Em Ajustes dá pra gerar um código de backup.</p>
    </div>
  );
}

/* ---------- AJUSTES ---------- */
function Chave({ ligado, onChange, rotulo, testid, disabled }: { ligado: boolean; onChange: (v: boolean) => void; rotulo: string; testid: string; disabled?: boolean }) {
  return (
    <button role="switch" aria-checked={ligado} aria-label={rotulo} data-testid={testid} disabled={disabled} onClick={() => onChange(!ligado)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-40 ${ligado ? "bg-teal" : "bg-desligado"}`}>
      <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${ligado ? "left-[1.375rem]" : "left-0.5"}`} />
    </button>
  );
}
function AjustesSom() {
  const som = useSom();
  const reduced = useReducedMotion();
  const vibraOk = vibracaoSuportada();
  const amostras: { s: Som; n: string }[] = [{ s: "acerto", n: "Acerto" }, { s: "erro", n: "Erro" }, { s: "combo", n: "Sequência" }, { s: "meta", n: "Meta" }, { s: "nivel", n: "Nível" }, { s: "abertura", n: "Tigrão" }];
  return (
    <div className="rounded-3xl bg-papel p-4 shadow-sm ring-1 ring-borda" data-testid="ajustes-som">
      <div className="mb-2 font-titulo text-lg font-extrabold text-noite">Som e vibração</div>
      <div className="flex items-center gap-3">
        {som.ligado ? <Volume2 className="h-5 w-5 text-azul" /> : <VolumeX className="h-5 w-5 text-vermelho" />}
        <div className="flex-1 text-sm font-bold">Efeitos sonoros<div className="text-[0.6875rem] font-semibold text-tinta/75">{som.ligado ? "Ligados" : "Desligados (modo silencioso)"}</div></div>
        <Chave ligado={som.ligado} rotulo="Som" testid="chave-som" onChange={(v) => { setSomPrefs({ ligado: v, volume: v && som.volume === 0 ? SOM_PADRAO.volume : som.volume }); if (v) setTimeout(() => tocar("acerto"), 0); }} />
      </div>
      <label className={`mt-3 flex items-center gap-3 ${som.ligado ? "" : "opacity-50"}`}>
        <Volume1 className="h-5 w-5 shrink-0 text-azul" />
        <span className="sr-only">Volume</span>
        <input type="range" min={0} max={100} step={5} value={Math.round(som.volume * 100)} disabled={!som.ligado} aria-label="Volume" data-testid="volume"
          onChange={(e) => setSomPrefs({ volume: +e.target.value / 100 })} onPointerUp={() => tocar("acerto")} onKeyUp={() => tocar("toque")}
          className="h-2 flex-1 accent-laranja" />
        <span className="w-10 text-right text-sm font-black" data-testid="volume-valor">{Math.round(som.volume * 100)}%</span>
      </label>
      {som.ligado && (
        <div className="mt-3 flex flex-wrap gap-1.5" data-som="off">
          {amostras.map((a) => (
            <button key={a.s} onClick={() => tocar(a.s)} className="rounded-full bg-ceu px-2.5 py-1 text-[0.75rem] font-bold text-noite">▶ {a.n}</button>
          ))}
        </div>
      )}
      <div className="mt-4 flex items-center gap-3 border-t border-borda pt-3">
        <Vibrate className="h-5 w-5 text-azul" />
        <div className="flex-1 text-sm font-bold">Vibrar no acerto e no erro
          <div className="text-[0.6875rem] font-semibold text-tinta/75">
            {!vibraOk ? "Este aparelho/navegador não vibra (ex.: iPhone)." : reduced ? "Desligada enquanto o sistema pede menos movimento." : som.vibrar ? "Ligada" : "Desligada"}
          </div>
        </div>
        <Chave ligado={som.vibrar} rotulo="Vibração" testid="chave-vibrar" onChange={(v) => { setSomPrefs({ vibrar: v }); if (v) vibrar(35); }} />
      </div>
      <p className="mt-3 text-[0.6875rem] leading-4 text-tinta/75">Sons gerados no próprio aparelho, sem baixar nada. Nos simulados só tocam o início e o fim, pra não entregar o gabarito. Vale para todas as matérias.</p>
    </div>
  );
}

function Ajustes({ state, setState, onBack }: { state: State; setState: (s: State) => void; onBack: () => void }) {
  const [codigo, setCodigo] = useState("");
  const [colado, setColado] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pendente, setPendente] = useState<State | null>(null);
  const gerar = async () => {
    const c = await exportCode(state);
    setCodigo(c);
    try { await navigator.clipboard?.writeText(c); setMsg({ ok: true, t: "Código gerado e copiado! Guarde num lugar seguro (WhatsApp, e-mail)." }); }
    catch { setMsg({ ok: true, t: "Código gerado. Copie o texto abaixo e guarde num lugar seguro." }); }
  };
  const baixar = async () => {
    baixarArquivo(`tigrao-enem-progresso-${new Date().toLocaleDateString("sv-SE")}.txt`, await exportCode(state));
    setMsg({ ok: true, t: "Arquivo de backup baixado." });
  };
  const preparar = async (texto: string) => {
    try { setPendente(await importCode(texto)); setMsg(null); }
    catch (e) { setMsg({ ok: false, t: e instanceof Error && !(e instanceof SyntaxError) && !(e instanceof TypeError) ? e.message : "Código inválido ou incompleto. Confira se copiou tudo." }); }
  };
  return (
    <div className="space-y-4">
      <Header title="Ajustes" onBack={onBack} />
      {pendente && (
        <Confirmar titulo="Importar progresso?" ok="Importar" cancelar="Cancelar"
          texto={`O progresso deste aparelho (${state.xp} XP) será substituído pelo do código (${pendente.xp} XP, ${plural(Object.keys(pendente.answers).length, "questão respondida", "questões respondidas")}).`}
          onCancel={() => setPendente(null)}
          onOk={() => { setState(pendente); setPendente(null); setColado(""); setMsg({ ok: true, t: `Progresso importado: ${pendente.xp} XP. Bora continuar!` }); }} />
      )}

      <AjustesSom />

      <div className="rounded-3xl bg-papel p-4 shadow-sm ring-1 ring-borda">
        <div className="mb-2 font-titulo text-lg font-extrabold text-noite">Tamanho da letra</div>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Tamanho da letra">
          {["Normal", "Grande", "Maior"].map((n, k) => (
            <button key={n} role="radio" aria-checked={state.prefs.fonte === k} onClick={() => setState({ ...state, prefs: { ...state.prefs, fonte: k as 0 | 1 | 2 } })}
              className={`rounded-2xl py-2.5 font-bold ${state.prefs.fonte === k ? "bg-azul text-white" : "bg-ceu text-noite"}`} style={{ fontSize: `${0.875 + k * 0.125}rem` }}>
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-3xl bg-papel p-4 shadow-sm ring-1 ring-borda">
        <div className="font-titulo text-lg font-extrabold text-noite">Backup do progresso</div>
        <p className="mt-1 text-[0.75rem] leading-4 text-tinta/80">Vai trocar de celular? Gere um código (ou arquivo) aqui e importe no aparelho novo. Sem login, sem servidor: o código fica com você.</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button onClick={gerar} className="flex items-center justify-center gap-1.5 rounded-full bg-azul py-2.5 text-sm font-bold text-white"><Upload className="h-4 w-4" /> Gerar código</button>
          <button onClick={baixar} className="flex items-center justify-center gap-1.5 rounded-full bg-ceu py-2.5 text-sm font-bold text-noite"><Download className="h-4 w-4" /> Baixar arquivo</button>
        </div>
        {codigo && <textarea readOnly value={codigo} data-testid="codigo-export" onFocus={(e) => e.currentTarget.select()} aria-label="Código de backup"
          className="mt-2 h-20 w-full break-all rounded-2xl bg-ceu p-2 font-mono text-[0.6875rem]" />}

        <div className="mt-4 border-t border-borda pt-3 text-sm font-bold text-noite">Importar</div>
        <textarea value={colado} onChange={(e) => setColado(e.target.value)} placeholder="Cole aqui o código TGR1..." aria-label="Colar código de backup"
          className="mt-1 h-20 w-full rounded-2xl bg-white p-2 font-mono text-[0.6875rem] ring-1 ring-borda" data-testid="codigo-import" />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button disabled={!colado.trim()} onClick={() => preparar(colado)} className="rounded-full bg-teal py-2.5 text-sm font-bold text-white disabled:opacity-50">Importar código</button>
          <label className="flex cursor-pointer items-center justify-center rounded-full bg-ceu py-2.5 text-sm font-bold text-noite">
            Abrir arquivo
            <input type="file" accept=".txt,.json,text/plain,application/json" className="sr-only"
              onChange={async (e) => { const f = e.target.files?.[0]; if (f) await preparar(await f.text()); e.target.value = ""; }} />
          </label>
        </div>
        {msg && <p role="status" className={`mt-2 rounded-2xl px-3 py-2 text-[0.75rem] font-bold ${msg.ok ? "bg-teal-claro text-teal" : "bg-vermelho-claro text-vermelho"}`}>{msg.t}</p>}
      </div>

      <div className="rounded-3xl bg-papel p-4 shadow-sm ring-1 ring-borda text-[0.75rem] leading-5 text-tinta/85">
        <div className="mb-1 font-titulo text-lg font-extrabold text-noite">Sobre</div>
        <p><b>{AVISO}</b></p>
        <p className="mt-1">{QUESTIONS.length} questões de {MATERIA.nome} com gabarito oficial. {notaResolucoes()}</p>
        {MATERIA.id !== "fisica" && <p className="mt-1">Questões de {MATERIA.nome} separadas do caderno de {MATERIA.area} por classificação automática (revisão do professor pendente). Algumas foram transcritas do PDF oficial do Inep; questões com texto incompleto ou figura não recuperada ficaram de fora.</p>}
        <p className="mt-1" data-testid="regras-jogo"><b>Como o jogo funciona:</b> acerto vale +{XP.acerto} XP; erro recuperado na revisão, +{XP.revisao} XP; meta de {META_DIARIA} questões no dia, +{XP.metaDiaria} XP. Em treinos (nunca em simulados), cerca de {Math.round(CHANCE_SURPRESA * 100)}% dos acertos ganham um bônus surpresa de +{XP.surpresa} XP. A sequência conta o dia com pelo menos 1 questão respondida, e você tem 1 dia de folga automático por semana.</p>
        <p className="mt-1">Provas originais: <a className="font-bold text-azul underline" href={INEP} target="_blank" rel="noreferrer">gov.br/inep</a>.</p>
      </div>
    </div>
  );
}
