import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, BookOpen, Brain, CalendarCheck, Check, ChevronRight, Clock, Download, ExternalLink, Flame, Gauge, Lightbulb, RotateCcw,
  Settings, Sparkles, Target, Timer, Trophy, Upload, X, ZoomIn,
} from "lucide-react";
import { LETTERS, MATERIA, QUESTIONS, TOPICS, dicas, figuraAlt, optionText, plural, topicInfo, type Option, type Question } from "./data";
import {
  ALL_BADGES, DOMINIO, LEVELS, META_DIARIA, SIMULADOS, XP, badgeLabel, dominioSub, dominioTema, dueReviews, levelOf, load, missoes,
  practiceSet, registerAnswer, registerSimulado, reviewSet, save, scheduledReviews, simuladoDisponivel, simuladoSet, smartSet, subtemas,
  temaMaisFraco, topicStats, type Gain, type SimKind, type State,
} from "./game";
import { baixarArquivo, exportCode, importCode } from "./backup";

type Mode = "pratica" | "inteligente" | "revisao" | SimKind;
const isSim = (m: Mode): m is SimKind => m === "mini" || m === "completo";
type Quiz = { mode: Mode; topic: string | null; questions: Question[]; revisao: string[] };
type Screen =
  | { name: "home" }
  | { name: "temas" }
  | { name: "dominio" }
  | { name: "conquistas" }
  | { name: "ajustes" }
  | ({ name: "quiz" } & Quiz)
  | { name: "resultado"; mode: Mode; topic: string | null; items: Item[]; xp: number; badges: string[]; levelUp: string | null; missoes: string[]; seconds: number };
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
  const home = () => setScreen({ name: "home" });

  return (
    <div className="mx-auto min-h-screen max-w-md px-4 pb-10 pt-3">
      {screen.name === "home" && (
        <Home state={state} onTemas={() => setScreen({ name: "temas" })} onSimulado={startSimulado} onRevisao={startRevisao} onMix={() => startPratica(null)}
          onInteligente={startInteligente} onConquistas={() => setScreen({ name: "conquistas" })} onDominio={() => setScreen({ name: "dominio" })}
          onAjustes={() => setScreen({ name: "ajustes" })} onTrocar={onTrocar} />
      )}
      {screen.name === "temas" && <Temas state={state} onBack={home} onPick={startPratica} />}
      {screen.name === "dominio" && <Dominio state={state} onBack={home} onPick={startPratica} />}
      {screen.name === "conquistas" && <Conquistas state={state} onBack={home} />}
      {screen.name === "ajustes" && <Ajustes state={state} setState={setState} onBack={home} />}
      {screen.name === "quiz" && (
        <QuizView key={screen.questions.map((q) => q.id).join()} {...screen} state={state} setState={setState} onExit={home}
          onFinish={(r) => setScreen({ name: "resultado", mode: screen.mode, topic: screen.topic, ...r })} />
      )}
      {screen.name === "resultado" && (
        <Resultado {...screen} state={state} onHome={home}
          onAgain={() => (isSim(screen.mode) ? startSimulado(screen.mode) : screen.mode === "revisao" ? startRevisao() : screen.mode === "inteligente" ? startInteligente() : startPratica(screen.topic))} />
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

function Balao({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={"balao rounded-2xl bg-papel px-3 py-2 text-sm font-semibold text-tinta shadow-sm " + className}>{children}</div>;
}

function Barra({ pct, cor = "bg-azul", fundo = "bg-ceu" }: { pct: number; cor?: string; fundo?: string }) {
  return <div className={`h-2 overflow-hidden rounded-full ${fundo}`}><div className={`h-full rounded-full ${cor} transition-all`} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} /></div>;
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
  if (feitoHoje === 0 && state.streak.count > 0) return `Seu foguinho tá em ${plural(state.streak.count, "dia", "dias")}! Responda uma questão hoje pra não apagar. 🔥`;
  if (due > 0) return `Tem ${plural(due, "erro", "erros")} pra revisar. O Treino inteligente já mistura com seu ponto fraco!`;
  return `Bora! Faltam ${plural(META_DIARIA - feitoHoje, "questão", "questões")} pra meta de hoje.`;
}

function Home(p: {
  state: State; onTemas: () => void; onSimulado: (k: SimKind) => void; onRevisao: () => void; onMix: () => void; onInteligente: () => void;
  onConquistas: () => void; onDominio: () => void; onAjustes: () => void; onTrocar?: () => void;
}) {
  const { state } = p;
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

      <div className="rounded-3xl bg-papel p-4 shadow-sm ring-1 ring-borda">
        <div className="flex items-center justify-between text-sm font-bold">
          <span className="flex items-center gap-1.5 text-noite"><Target className="h-4 w-4" /> Meta do dia</span>
          <span className="text-tinta/80">{Math.min(state.daily.count, META_DIARIA)}/{META_DIARIA} questões {metaOk && "✅"}</span>
        </div>
        <div className="mt-2"><Barra pct={metaPct} cor={metaOk ? "bg-teal" : "bg-laranja"} /></div>
        <div className="mt-1 text-[0.6875rem] text-tinta/70">{metaOk ? `Meta batida hoje! +${XP.metaDiaria} XP garantidos. Volte amanhã pra manter o 🔥.` : `Bata a meta e ganhe +${XP.metaDiaria} XP. Estudar todo dia mantém o 🔥.`}</div>
      </div>

      <button onClick={p.onInteligente} className="flex w-full items-center gap-3 rounded-3xl bg-gradient-to-r from-azul to-roxo p-4 text-left text-white shadow-md active:scale-[.98]">
        <span className="rounded-2xl bg-white/20 p-2.5"><Brain className="h-7 w-7" /></span>
        <span className="flex-1">
          <span className="block font-titulo text-xl font-extrabold leading-6">Treino inteligente</span>
          <span className="text-[0.75rem] font-semibold text-white/90">10 questões: {due ? `${Math.min(due, 3)} de revisão + ` : ""}seu ponto fraco ({fraco}) + inéditas</span>
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
              return (
                <div key={t.name} className="flex items-center gap-2 text-[0.75rem]">
                  <span className="w-36 truncate font-bold">{t.emoji} {t.name}</span>
                  <span className="flex-1"><Barra pct={d.pct ?? 0} cor={t.cor} /></span>
                  <span className="w-9 text-right font-black text-tinta/80">{d.pct === null ? "—" : `${d.pct}%`}</span>
                </div>
              );
            })}
            <div className="pt-1 text-[0.75rem] font-bold text-vermelho">Seu maior gargalo agora: {fraco}</div>
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
function Dominio({ state, onBack, onPick }: { state: State; onBack: () => void; onPick: (t: string) => void }) {
  const fraco = temaMaisFraco(state);
  const [aberto, setAberto] = useState<string | null>(fraco);
  return (
    <div className="space-y-3">
      <Header title="Meu domínio" onBack={onBack} />
      <div className="rounded-3xl bg-papel p-3 text-[0.75rem] leading-4 text-tinta/85 shadow-sm ring-1 ring-borda">
        O domínio mostra quantas das suas <b>últimas {DOMINIO.janelaTema} questões diferentes</b> de cada tema você acertou (subtemas: últimas {DOMINIO.janelaSub}).
        Responder mais não aumenta o número; acertar sim. Aparece depois de {DOMINIO.minTema} questões do tema.
      </div>
      <div className="flex items-center gap-3 rounded-3xl bg-vermelho-claro p-3 ring-1 ring-vermelho/30">
        <img src={T + "busto.webp"} alt="" className="h-14 w-14 rounded-2xl object-cover" />
        <div className="flex-1 text-[0.8125rem]"><b>Seu maior gargalo:</b> {fraco}</div>
        <button onClick={() => onPick(fraco)} className="rounded-full bg-vermelho px-3 py-2 text-[0.75rem] font-bold text-white">Treinar</button>
      </div>
      {TOPICS.map((t) => {
        const d = dominioTema(state, t.name);
        const st = topicStats(state, t.name);
        const open = aberto === t.name;
        return (
          <div key={t.name} className="rounded-3xl bg-papel p-3 shadow-sm ring-1 ring-borda">
            <button className="flex w-full items-center gap-2 text-left" onClick={() => setAberto(open ? null : t.name)} aria-expanded={open}>
              <span className={`${t.corClara} grid h-10 w-10 shrink-0 place-items-center rounded-xl text-xl`}>{t.emoji}</span>
              <span className="min-w-0 flex-1">
                <span className="flex justify-between text-[0.875rem] font-bold"><span>{t.name}</span><span data-testid={"dom-" + t.name}>{d.pct === null ? "—" : `${d.pct}%`}</span></span>
                <span className="mt-1 block"><Barra pct={d.pct ?? 0} cor={t.cor} /></span>
                <span className="text-[0.6875rem] text-tinta/70">{d.pct === null ? `responda ${DOMINIO.minTema - d.n} ${DOMINIO.minTema - d.n === 1 ? "questão" : "questões"} pra medir` : `base: últimas ${d.n} questões`} · {st.vistas}/{st.total} vistas</span>
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
                      <span className="flex-1"><Barra pct={ds.pct ?? 0} cor={t.cor} /></span>
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
      ? "Gabarito oficial do Inep em todas as questões. As resoluções de Física foram escritas por IA (Chico) e aguardam revisão; Biologia e Química ainda não têm resolução comentada."
      : "Gabarito oficial do Inep em todas as questões. As resoluções comentadas desta matéria ainda não foram escritas (e, quando forem, ficam marcadas como não revisadas até o Prof. Silas revisar).";
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
  const [zoom, setZoom] = useState<{ src: string; alt: string } | null>(null);
  const list = q.figures.map((f, i) => ({ f, i, alt: figuraAlt(q, f, i) }))
    .filter(({ i }) => (indices ? indices.includes(i) : !pular?.has(i)))
    .filter(({ f }) => (only === "alternativas" ? f.kind === "alternativas" : only === "enunciado" ? f.kind !== "alternativas" : true));
  if (!list.length) return null;
  return (
    <div className="mt-3 space-y-2">
      {list.map(({ f, alt }) => (
        <button key={f.src} onClick={() => setZoom({ src: f.src, alt })} className="relative block w-full overflow-hidden rounded-2xl bg-white p-2 ring-1 ring-borda" aria-label={"Ampliar: " + alt}>
          <img src={f.src} alt={alt} width={f.width} height={f.height} loading="lazy" className="mx-auto h-auto max-h-[420px] w-auto max-w-full object-contain" />
          <span className="absolute bottom-1.5 right-1.5 flex items-center gap-1 rounded-full bg-noite/80 px-2 py-0.5 text-[0.625rem] font-bold text-white"><ZoomIn className="h-3 w-3" /> ampliar</span>
        </button>
      ))}
      {zoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-noite/90 p-3" onClick={() => setZoom(null)} role="dialog" aria-label="Figura ampliada">
          <img src={zoom.src} alt={zoom.alt} className="max-h-full max-w-full rounded-xl bg-white p-2" />
          <button className="absolute right-3 top-3 rounded-full bg-white p-2" aria-label="Fechar"><X className="h-5 w-5" /></button>
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
  onFinish: (r: { items: Item[]; xp: number; badges: string[]; levelUp: string | null; missoes: string[]; seconds: number }) => void;
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
  const acc = useRef({ xp: 0, badges: [] as string[], levelUp: null as string | null, missoes: [] as string[], state: p.state });
  const [left, setLeft] = useState(total);
  const start = useRef(Date.now());
  const finished = useRef(false);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const frase = useMemo(() => ({ ok: pick(frasesAcerto()), erro: pick(FRASES_ERRO) }), [i]);
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
    }
    p.onFinish({ items: all, xp: acc.current.xp, badges: acc.current.badges, levelUp: acc.current.levelUp, missoes: acc.current.missoes, seconds });
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
  const titulo = sim ? SIMULADOS[mode].nome : mode === "revisao" ? "Revisão de erros" : mode === "inteligente" ? "Treino inteligente" : p.topic ?? "Mistão do dia";
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
              <p className="text-[0.625rem] leading-3 text-tinta/70">Trecho da resolução escrita por IA (Chico), aguardando revisão do professor.</p>
            </div>
          )}
        </div>
      )}

      {sim && <p className="mt-3 text-center text-[0.6875rem] font-semibold text-tinta/75">Modo prova: gabarito e resolução só aparecem no final.</p>}

      <div className={`mt-3 ${q.options ? "space-y-2.5" : "grid grid-cols-5 gap-2"}`}>
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
          <div className={`relative flex items-center gap-3 overflow-hidden rounded-3xl p-3 ${correct ? "bg-teal text-white" : "bg-vermelho-claro text-tinta ring-2 ring-vermelho/40"}`}>
            {correct && <Confete />}
            <div className="relative shrink-0">
              <TigraoAnimado clip={correct ? "anim_acerto" : "anim_erro"} poster={correct ? "avatar.webp" : "busto.webp"}
                alt={correct ? "Tigrão comemorando" : "Tigrão dando força"} className={`h-24 rounded-2xl object-cover ${correct ? "w-24" : "w-28"}`}
                imgClassName={correct ? "anim-pulo" : "anim-pensa"} />
              <span className="absolute -right-2 -top-2 text-2xl">{correct ? "🎉" : "🤔"}</span>
            </div>
            <div>
              <div className="font-titulo text-xl font-extrabold leading-6">{correct ? frase.ok : frase.erro}</div>
              <div className="text-sm font-semibold opacity-90" data-testid="xp-feedback">
                {correct ? `+${gain?.xp ?? XP.acerto} XP` : `Gabarito oficial: letra ${q.answer}. Sem XP desta vez — vale pela revisão!`}
              </div>
              {correct && nDicas > 0 && <div className="text-xs font-bold">💡 Com {plural(nDicas, "dica", "dicas")}: acerto vale {XP.acertoComDica[Math.min(nDicas, 2)]} XP.</div>}
              {gain?.recuperou && <div className="text-xs font-bold">🔁 Erro recuperado! +{XP.revisao} XP de revisão.</div>}
              {!correct && <div className="text-xs font-bold">🔁 Ela volta na sua revisão de erros.</div>}
              {gain?.metaBatida && <div className="text-xs font-bold">🎯 Meta do dia batida! +{XP.metaDiaria} XP</div>}
              {gain?.missoes.map((m) => <div key={m} className="text-xs font-bold">🗓️ Missão cumprida: {m}</div>)}
              {gain?.levelUp && <div className="text-xs font-bold">⬆️ Subiu de nível: {gain.levelUp}!</div>}
              {gain?.newBadges.map((b) => <div key={b} className="text-xs font-bold">🏅 Nova medalha: {badgeLabel(b).nome}</div>)}
            </div>
          </div>
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
function Markdown({ text }: { text: string }) {
  const blocos: React.ReactNode[] = [];
  let lista: string[] = [];
  const flush = () => {
    if (lista.length) blocos.push(<ul key={blocos.length} className="ml-4 list-disc space-y-0.5">{lista.map((l, k) => <li key={k}>{inline(l)}</li>)}</ul>);
    lista = [];
  };
  for (const linha of text.split("\n")) {
    const l = linha.trim();
    if (l.startsWith("- ")) { lista.push(l.slice(2)); continue; }
    flush();
    if (l) blocos.push(<p key={blocos.length}>{inline(l)}</p>);
  }
  flush();
  return <div className="space-y-2 text-[0.875rem] leading-5">{blocos}</div>;
}

function SeloResolucao({ q }: { q: Question }) {
  const ex = q.explanation!;
  if (ex.reviewed)
    return <div data-testid="selo" className="mb-2 rounded-2xl bg-teal-claro px-3 py-2 text-[0.6875rem] font-bold leading-4 text-teal">✅ Revisada pelo Prof. Silas</div>;
  return (
    <div data-testid="selo" className="mb-2 rounded-2xl bg-laranja-claro px-3 py-2 text-[0.6875rem] font-bold leading-4 text-laranja-escuro">
      🤖 Explicação gerada por IA ({ex.author.replace(/^IA \((.*)\)$/, "$1")}) · Aguardando revisão do professor
      {ex.lowConfidence && " · ⚠️ Confiança baixa: confira com atenção."}
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
          <Markdown text={ex.markdown} />
          {ex.commonMistake && <div className="mt-2 text-[0.8125rem]"><b>Erro comum:</b> {ex.commonMistake}</div>}
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

function Confete() {
  const cores = ["#f08a24", "#ffd166", "#ffffff", "#9cc3ff", "#2453a6"];
  return (
    <>
      {Array.from({ length: 14 }).map((_, k) => (
        <span key={k} className="confete" style={{ left: `${(k * 7 + 5) % 100}%`, top: -10, background: cores[k % cores.length], animationDelay: `${(k % 5) * 0.08}s` }} />
      ))}
    </>
  );
}

/* ---------- RESULTADO ---------- */
function Resultado(p: {
  mode: Mode; topic: string | null; items: Item[]; xp: number; badges: string[]; levelUp: string | null; missoes: string[]; seconds: number;
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
  const tituloModo = sim ? `Resultado do ${SIMULADOS[p.mode as SimKind].nome}` : p.mode === "revisao" ? "Revisão concluída" : p.mode === "inteligente" ? "Treino inteligente" : p.topic ?? "Mistão do dia";
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
          {plural(score, "acerto", "acertos")} · {pct}%{sim ? ` · ${fmt(p.seconds)}` : ""}{sim && brancos ? ` · ${brancos} em branco` : ""}
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
            {porTema.map(({ t, n, ok }) => (
              <div key={t.name} className="text-[0.8125rem]">
                <div className="flex justify-between font-bold"><span>{t.emoji} {t.name}</span><span>{ok}/{n} · {Math.round((ok / n) * 100)}%</span></div>
                <div className="mt-1"><Barra pct={(ok / n) * 100} cor={t.cor} /></div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[0.6875rem] leading-4 text-tinta/70">Percentual de acertos neste simulado. Não é nota TRI do ENEM. Os erros já entraram na sua revisão.</p>
        </div>
      )}

      {(p.levelUp || p.badges.length > 0 || p.missoes.length > 0) && (
        <div className="anim-pop rounded-3xl bg-laranja-claro p-4 ring-2 ring-laranja">
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
        <p className="mt-1">Provas originais: <a className="font-bold text-azul underline" href={INEP} target="_blank" rel="noreferrer">gov.br/inep</a>.</p>
      </div>
    </div>
  );
}
