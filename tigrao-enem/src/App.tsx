import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, BookOpen, Check, ChevronRight, Clock, ExternalLink, Flame, RotateCcw, Sparkles, Target, Timer, Trophy, X, ZoomIn, CalendarCheck,
} from "lucide-react";
import { LETTERS, META, QUESTIONS, TOPICS, optionText, plural, topicInfo, type Figure, type Question } from "./data";
import {
  ALL_BADGES, LEVELS, META_DIARIA, MISSIONS, SIMULADO_N, SIMULADO_SEGUNDOS, XP, badgeLabel, dueReviews, levelOf, load,
  practiceSet, registerAnswer, registerSimulado, reviewSet, save, scheduledReviews, simuladoSet, topicStats, type Gain, type State,
} from "./game";

type Mode = "pratica" | "simulado" | "revisao";
type Screen =
  | { name: "home" }
  | { name: "temas" }
  | { name: "conquistas" }
  | { name: "quiz"; mode: Mode; topic: string | null; questions: Question[] }
  | { name: "resultado"; mode: Mode; topic: string | null; items: Item[]; xp: number; badges: string[]; levelUp: string | null; missoes: string[]; seconds: number };
type Item = { q: Question; chosen: string | null };

const T = "./tigrao/";
const INEP = "https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem/provas-e-gabaritos";
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
const FRASES_ACERTO = ["Au-au! Acertou em cheio! 🎉", "Isso! Física de quem vai passar!", "Tá em órbita, hein? 🚀", "Gabaritou essa! Bora pra próxima!"];
const FRASES_ERRO = ["Opa! Essa pegou… bora entender?", "Errar aqui é treino. Lê a resolução comigo!", "Pegadinha clássica do ENEM. Na prova você acerta!", "Calma! Vou farejar onde foi o deslize."];

export default function App() {
  const [state, setState] = useState<State>(() => load());
  const [screen, setScreen] = useState<Screen>({ name: "home" });
  useEffect(() => {
    save(state);
  }, [state]);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen.name, screen.name === "quiz" ? screen.questions : null]);

  const startPratica = (topic: string | null) => setScreen({ name: "quiz", mode: "pratica", topic, questions: practiceSet(state, topic, 10) });
  const startSimulado = () => setScreen({ name: "quiz", mode: "simulado", topic: null, questions: simuladoSet(state) });
  const startRevisao = () => setScreen({ name: "quiz", mode: "revisao", topic: null, questions: reviewSet(state) });

  return (
    <div className="mx-auto min-h-screen max-w-md px-4 pb-10 pt-3">
      {screen.name === "home" && (
        <Home state={state} onTemas={() => setScreen({ name: "temas" })} onSimulado={startSimulado} onRevisao={startRevisao}
          onMix={() => startPratica(null)} onConquistas={() => setScreen({ name: "conquistas" })} />
      )}
      {screen.name === "temas" && <Temas state={state} onBack={() => setScreen({ name: "home" })} onPick={startPratica} />}
      {screen.name === "conquistas" && <Conquistas state={state} onBack={() => setScreen({ name: "home" })} />}
      {screen.name === "quiz" && (
        <Quiz key={screen.questions.map((q) => q.id).join()} mode={screen.mode} topic={screen.topic} questions={screen.questions}
          state={state} setState={setState} onExit={() => setScreen({ name: "home" })}
          onFinish={(r) => setScreen({ name: "resultado", mode: screen.mode, topic: screen.topic, ...r })} />
      )}
      {screen.name === "resultado" && (
        <Resultado {...screen} state={state} onHome={() => setScreen({ name: "home" })}
          onAgain={() => (screen.mode === "simulado" ? startSimulado() : screen.mode === "revisao" ? startRevisao() : startPratica(screen.topic))} />
      )}
    </div>
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
        <div className="mt-0.5 text-[11px] text-tinta/70">{lv.next ? `Faltam ${lv.next.min - state.xp} XP para ${lv.next.title}` : "Nível máximo: aprovado em Medicina! 🩺"}</div>
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

/* ---------- HOME ---------- */
function falaHome(state: State, due: number) {
  const respondidas = Object.keys(state.answers).length;
  const feitoHoje = state.daily.count;
  const hoje = new Date().toLocaleDateString("sv-SE");
  const simHoje = state.simulados.some((r) => new Date(r.date).toLocaleDateString("sv-SE") === hoje);
  if (respondidas === 0) return "Au-au! Eu sou o Tigrão, cão astronauta do lab. Bora treinar Física do ENEM com questões oficiais?";
  if (feitoHoje >= META_DIARIA) {
    if (due > 0) return `Meta do dia batida! 🎯 Tem ${plural(due, "erro", "erros")} esperando revisão. Bora?`;
    if (!simHoje) return "Meta do dia batida! 🎯 Que tal um Simulado ENEM pra fechar com chave de ouro?";
    return "Meta batida e simulado feito. Hoje você foi longe! Descansa que amanhã tem mais. 🌙";
  }
  if (feitoHoje === 0 && state.streak.count > 0) return `Seu foguinho tá em ${plural(state.streak.count, "dia", "dias")}! Responda uma questão hoje pra não apagar. 🔥`;
  if (due > 0 && feitoHoje > 0) return `Faltam ${plural(META_DIARIA - feitoHoje, "questão", "questões")} pra meta. E tem ${plural(due, "erro", "erros")} pra revisar!`;
  return `Bora! Faltam ${plural(META_DIARIA - feitoHoje, "questão", "questões")} pra meta de hoje.`;
}

function Home(p: { state: State; onTemas: () => void; onSimulado: () => void; onRevisao: () => void; onMix: () => void; onConquistas: () => void }) {
  const { state } = p;
  const respondidas = Object.keys(state.answers).length;
  const due = dueReviews(state).length;
  const agendadas = scheduledReviews(state).length;
  const metaPct = Math.min(100, Math.round((state.daily.count / META_DIARIA) * 100));
  const metaOk = state.daily.count >= META_DIARIA;
  return (
    <div className="space-y-4">
      <TopBar state={state} />
      <div className="relative overflow-hidden rounded-[28px] bg-noite p-4 text-white shadow-md">
        <div className="estrelas absolute inset-0" />
        <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-laranja/30" />
        <div className="relative flex items-end gap-3">
          <img src={T + "acena.webp"} alt="Tigrão, o cão astronauta, acenando" className="anim-float h-36 w-36 shrink-0 rounded-3xl object-cover ring-4 ring-white/70" />
          <div className="pb-1">
            <div className="font-titulo text-[26px] font-extrabold leading-7">Banco do Tigrão</div>
            <div className="text-xs font-semibold text-white/85">Física do ENEM · questões oficiais {META.porAno ? `${Object.keys(META.porAno)[0]}–${Object.keys(META.porAno).slice(-1)[0]}` : ""}</div>
            <Balao className="mt-2">{falaHome(state, due)}</Balao>
          </div>
        </div>
      </div>

      <div className="rounded-3xl bg-papel p-4 shadow-sm ring-1 ring-borda">
        <div className="flex items-center justify-between text-sm font-bold">
          <span className="flex items-center gap-1.5 text-noite"><Target className="h-4 w-4" /> Meta do dia</span>
          <span className="text-tinta/80">{Math.min(state.daily.count, META_DIARIA)}/{META_DIARIA} questões {metaOk && "✅"}</span>
        </div>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-ceu">
          <div className={`h-full rounded-full transition-all ${metaOk ? "bg-teal" : "bg-laranja"}`} style={{ width: `${metaPct}%` }} />
        </div>
        <div className="mt-1 text-[11px] text-tinta/70">{metaOk ? `Meta batida hoje! +${XP.metaDiaria} XP garantidos. Volte amanhã pra manter o 🔥.` : `Bata a meta e ganhe +${XP.metaDiaria} XP. Estudar todo dia mantém o 🔥.`}</div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <BigButton onClick={p.onTemas} cor="bg-azul" icon={<BookOpen className="h-6 w-6" />} titulo="Praticar por tema" sub={plural(TOPICS.length, "tema", "temas")} />
        <BigButton onClick={p.onSimulado} cor="bg-vermelho" icon={<Timer className="h-6 w-6" />} titulo="Simulado ENEM" sub={`${SIMULADO_N} questões · ${SIMULADO_SEGUNDOS / 60} min`} />
        <BigButton onClick={p.onMix} cor="bg-teal" icon={<Sparkles className="h-6 w-6" />} titulo="Mistão do dia" sub="10 de todos os temas" />
        <BigButton onClick={p.onRevisao} cor="bg-laranja-escuro" icon={<RotateCcw className="h-6 w-6" />} titulo="Revisar erros"
          sub={due ? `${plural(due, "erro", "erros")} pra hoje` : agendadas ? `${plural(agendadas, "revisão agendada", "revisões agendadas")}` : "Nenhum erro ainda"} disabled={!due} />
      </div>

      <Missoes state={state} />

      <button onClick={p.onConquistas} className="flex w-full items-center gap-3 rounded-3xl bg-papel p-4 text-left shadow-sm ring-1 ring-borda">
        <Trophy className="h-8 w-8 text-laranja" />
        <div className="flex-1">
          <div className="font-titulo text-lg font-extrabold text-noite">Conquistas e jornada</div>
          <div className="text-xs text-tinta/75">{plural(state.badges.length, "medalha", "medalhas")} · {respondidas}/{QUESTIONS.length} questões respondidas</div>
        </div>
        <ChevronRight className="h-5 w-5 text-tinta/60" />
      </button>
      <p className="px-2 text-center text-[11px] leading-4 text-tinta/70">
        Somente questões oficiais do ENEM (INEP), com gabarito oficial. As resoluções foram escritas por IA (Chico) e aguardam revisão do professor Silas.
      </p>
    </div>
  );
}

function Missoes({ state }: { state: State }) {
  return (
    <div className="rounded-3xl bg-papel p-4 shadow-sm ring-1 ring-borda">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 font-titulo text-lg font-extrabold text-noite"><CalendarCheck className="h-5 w-5" /> Missões da semana</span>
        <span className="text-[11px] font-bold text-tinta/70">{state.week.paid.length}/{MISSIONS.length}</span>
      </div>
      <div className="space-y-2">
        {MISSIONS.map((m) => {
          const v = Math.min(m.val(state.week), m.meta);
          const ok = state.week.paid.includes(m.id);
          return (
            <div key={m.id} className="flex items-center gap-2.5">
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl text-base ${ok ? "bg-teal text-white" : "bg-ceu"}`}>{ok ? <Check className="h-4 w-4" /> : m.emoji}</span>
              <div className="min-w-0 flex-1">
                <div className="flex justify-between text-[13px] font-bold"><span className={ok ? "text-teal line-through decoration-2" : "text-tinta"}>{m.titulo}</span><span className="text-tinta/70">{v}/{m.meta}</span></div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ceu"><div className={`h-full rounded-full ${ok ? "bg-teal" : "bg-azul"}`} style={{ width: `${(v / m.meta) * 100}%` }} /></div>
              </div>
              <span className="w-12 text-right text-[11px] font-black text-laranja-escuro">+{m.xp} XP</span>
            </div>
          );
        })}
      </div>
      <div className="mt-2 text-[11px] text-tinta/70">As missões renovam toda segunda-feira.</div>
    </div>
  );
}

function BigButton(p: { onClick: () => void; cor: string; icon: React.ReactNode; titulo: string; sub: string; disabled?: boolean }) {
  return (
    <button onClick={p.onClick} disabled={p.disabled}
      className={`${p.disabled ? "bg-desligado text-tinta ring-1 ring-borda" : p.cor + " text-white shadow-md active:scale-95"} flex min-h-28 flex-col justify-between rounded-3xl p-3.5 text-left transition`}>
      <span className={`w-fit rounded-2xl p-2 ${p.disabled ? "bg-white/70" : "bg-white/20"}`}>{p.icon}</span>
      <span>
        <span className="block font-titulo text-lg font-extrabold leading-5">{p.titulo}</span>
        <span className={`text-[11px] font-semibold ${p.disabled ? "text-tinta/80" : "text-white/90"}`}>{p.sub}</span>
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
          const temBadge = state.badges.includes("tema:" + t.name);
          const pctDom = st.total ? (st.dominadas / st.total) * 100 : 0;
          const pctVis = st.total ? (st.vistas / st.total) * 100 : 0;
          return (
            <button key={t.name} onClick={() => onPick(t.name)} className="flex w-full items-center gap-3 rounded-3xl bg-papel p-3 text-left shadow-sm ring-1 ring-borda active:scale-[.98]">
              <span className={`${t.corClara} grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-2xl`}>{t.emoji}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1 font-bold text-tinta"><span className="truncate">{t.name}</span> {temBadge && <span title={t.badge}>🏅</span>}</span>
                <span className="block text-[11px] text-tinta/75">
                  {plural(st.total, "questão", "questões")} · {st.vistas} {st.vistas === 1 ? "vista" : "vistas"} · {st.dominadas} {st.dominadas === 1 ? "certa" : "certas"} na última tentativa
                </span>
                <span className="relative mt-1 block h-1.5 overflow-hidden rounded-full bg-ceu">
                  <span className={`${t.cor} absolute inset-y-0 left-0 opacity-30`} style={{ width: `${pctVis}%` }} />
                  <span className={`${t.cor} absolute inset-y-0 left-0 rounded-full`} style={{ width: `${pctDom}%` }} />
                </span>
              </span>
              <ChevronRight className="h-5 w-5 text-tinta/50" />
            </button>
          );
        })}
      </div>
      <p className="mt-3 px-2 text-[11px] text-tinta/70">Barra forte = questões que você acertou na última tentativa. Barra clara = questões já vistas.</p>
    </div>
  );
}

/* ---------- QUIZ ---------- */
function fmt(s: number) {
  const m = Math.floor(s / 60), r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

function Figuras({ figs, only }: { figs: Figure[]; only?: "alternativas" | "enunciado" }) {
  const [zoom, setZoom] = useState<Figure | null>(null);
  const list = figs.filter((f) => (only === "alternativas" ? f.kind === "alternativas" : only === "enunciado" ? f.kind !== "alternativas" : true));
  if (!list.length) return null;
  return (
    <div className="mt-3 space-y-2">
      {list.map((f) => (
        <button key={f.src} onClick={() => setZoom(f)} className="relative block w-full overflow-hidden rounded-2xl bg-white p-2 ring-1 ring-borda">
          <img src={f.src} alt={f.label} width={f.width} height={f.height} loading="lazy" className="mx-auto h-auto max-h-[420px] w-auto max-w-full object-contain" />
          <span className="absolute bottom-1.5 right-1.5 flex items-center gap-1 rounded-full bg-noite/80 px-2 py-0.5 text-[10px] font-bold text-white"><ZoomIn className="h-3 w-3" /> ampliar</span>
        </button>
      ))}
      {zoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-noite/90 p-3" onClick={() => setZoom(null)} role="dialog" aria-label="Figura ampliada">
          <img src={zoom.src} alt={zoom.label} className="max-h-full max-w-full rounded-xl bg-white p-2" />
          <button className="absolute right-3 top-3 rounded-full bg-white p-2" aria-label="Fechar"><X className="h-5 w-5" /></button>
        </div>
      )}
    </div>
  );
}

function Confirmar(p: { titulo: string; texto: string; ok: string; onOk: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-noite/60 p-4 sm:items-center" role="dialog" aria-modal="true">
      <div className="anim-pop w-full max-w-sm rounded-3xl bg-papel p-5 shadow-xl">
        <div className="flex items-center gap-3">
          <img src={T + "busto.webp"} alt="" className="h-16 w-16 rounded-2xl object-cover" />
          <div className="font-titulo text-xl font-extrabold leading-6 text-noite">{p.titulo}</div>
        </div>
        <p className="mt-3 text-sm text-tinta">{p.texto}</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button onClick={p.onCancel} className="rounded-full bg-azul py-3 font-bold text-white">Continuar</button>
          <button onClick={p.onOk} className="rounded-full bg-desligado py-3 font-bold text-tinta ring-1 ring-borda">{p.ok}</button>
        </div>
      </div>
    </div>
  );
}

function Quiz(p: {
  mode: Mode; topic: string | null; questions: Question[]; state: State; setState: (s: State) => void; onExit: () => void;
  onFinish: (r: { items: Item[]; xp: number; badges: string[]; levelUp: string | null; missoes: string[]; seconds: number }) => void;
}) {
  const { questions, mode } = p;
  const [i, setI] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [gain, setGain] = useState<Gain | null>(null);
  const [sair, setSair] = useState(false);
  const acc = useRef({ xp: 0, badges: [] as string[], levelUp: null as string | null, missoes: [] as string[], state: p.state });
  const [left, setLeft] = useState(SIMULADO_SEGUNDOS);
  const start = useRef(Date.now());
  const finished = useRef(false);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const frase = useMemo(() => ({ ok: pick(FRASES_ACERTO), erro: pick(FRASES_ERRO) }), [i]);
  const q = questions[i];
  const ultima = i === questions.length - 1;
  const emAndamento = items.length > 0 || chosen !== null;

  // confirma antes de fechar/recarregar a página no meio da sessão
  useEffect(() => {
    if (!emAndamento) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [emAndamento]);

  // rola até o feedback depois de responder
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
    if (mode === "simulado") {
      let s = acc.current.state;
      for (const it of all) {
        if (!it.chosen) continue;
        const [ns, g] = registerAnswer(s, it.q, it.chosen === it.q.answer, "simulado");
        s = ns; absorb(g);
      }
      const score = all.filter((it) => it.chosen === it.q.answer).length;
      const [ns, g] = registerSimulado(s, score, all.length, seconds);
      s = ns; absorb(g);
      p.setState(s);
    }
    p.onFinish({ items: all, xp: acc.current.xp, badges: acc.current.badges, levelUp: acc.current.levelUp, missoes: acc.current.missoes, seconds });
  };

  useEffect(() => {
    if (mode !== "simulado") return;
    const t = setInterval(() => {
      const l = SIMULADO_SEGUNDOS - Math.round((Date.now() - start.current) / 1000);
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
    if (mode !== "simulado") {
      const [ns, g] = registerAnswer(acc.current.state, q, letter === q.answer, mode === "revisao" ? "revisao" : "pratica");
      acc.current.state = ns; absorb(g);
      p.setState(ns);
      setGain(g);
      setRevealed(true);
    }
  };
  const next = () => {
    const all = [...items, { q, chosen }];
    setItems(all);
    if (ultima) return finish(all);
    setI(i + 1); setChosen(null); setRevealed(false); setGain(null);
    window.scrollTo(0, 0);
  };
  const tentarSair = () => (emAndamento ? setSair(true) : p.onExit());
  const sairAgora = () => {
    // na prática/revisão as respostas já estão salvas; mostra o resultado parcial se houver
    if (mode !== "simulado" && (items.length || revealed)) {
      const all = revealed ? [...items, { q, chosen }] : items;
      return finish(all);
    }
    p.onExit();
  };
  const correct = chosen === q.answer;
  const t = topicInfo(q.area);
  const titulo = mode === "simulado" ? "Simulado ENEM" : mode === "revisao" ? "Revisão de erros" : p.topic ?? "Mistão do dia";
  const letras = q.options ?? LETTERS.map((l) => ({ letter: l, text: "" }));

  return (
    <div>
      {sair && (
        <Confirmar titulo="Sair agora?" ok="Sair"
          texto={mode === "simulado" ? "Se sair, este simulado não vai contar (nenhuma resposta dele é salva)." : "Suas respostas até aqui já estão salvas. Você vai ver o resumo da sessão."}
          onCancel={() => setSair(false)} onOk={() => { setSair(false); sairAgora(); }} />
      )}
      <div className="mb-3 flex items-center gap-2">
        <button onClick={tentarSair} className="rounded-full bg-papel p-2 shadow-sm ring-1 ring-borda" aria-label="Sair"><X className="h-5 w-5" /></button>
        <div className="flex-1">
          <div className="flex justify-between text-xs font-bold text-noite"><span className="truncate">{titulo}</span><span>{i + 1}/{questions.length}</span></div>
          <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-ceu">
            <div className="h-full rounded-full bg-azul transition-all" style={{ width: `${((i + (revealed ? 1 : 0)) / questions.length) * 100}%` }} />
          </div>
        </div>
        {mode === "simulado" && (
          <div className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-black ${left < 300 ? "bg-vermelho text-white" : "bg-papel text-vermelho ring-1 ring-borda"}`}>
            <Clock className="h-4 w-4" /> {fmt(Math.max(0, left))}
          </div>
        )}
      </div>

      <div className="anim-pop rounded-3xl bg-papel p-4 shadow-sm ring-1 ring-borda">
        <div className="mb-2 flex flex-wrap gap-1.5 text-[11px] font-bold">
          <span className={`${t.corClara} rounded-full px-2 py-0.5 text-tinta`}>{t.emoji} {q.area}</span>
          <span className="rounded-full bg-ceu px-2 py-0.5 text-tinta/85">ENEM {q.year} · Q{q.number}</span>
          {mode === "revisao" && <span className="rounded-full bg-laranja-claro px-2 py-0.5 text-laranja-escuro">🔁 revisão</span>}
        </div>
        <p className="whitespace-pre-line text-[15px] leading-6">{q.statement}</p>
        <Figuras figs={q.figures} only="enunciado" />
      </div>

      {!q.options && (
        <div className="mt-3 rounded-3xl bg-papel p-3 shadow-sm ring-1 ring-borda">
          <div className="text-[12px] font-bold text-noite">Alternativas (na figura da prova):</div>
          <Figuras figs={q.figures} only="alternativas" />
        </div>
      )}

      <div className={`mt-3 ${q.options ? "space-y-2.5" : "grid grid-cols-5 gap-2"}`}>
        {letras.map((o) => {
          const isChosen = chosen === o.letter;
          const isAns = o.letter === q.answer;
          let cls = "bg-papel ring-borda";
          if (mode === "simulado" && isChosen) cls = "bg-azul-claro ring-azul";
          if (revealed && isAns) cls = "bg-teal-claro ring-teal";
          if (revealed && isChosen && !isAns) cls = "bg-vermelho-claro ring-vermelho anim-shake";
          return (
            <button key={o.letter} onClick={() => choose(o.letter)} disabled={revealed} aria-label={`Alternativa ${o.letter}`}
              className={`${cls} flex w-full items-start gap-3 rounded-2xl p-3 text-left ring-2 transition active:scale-[.98] ${q.options ? "" : "justify-center"}`}>
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl font-black ${revealed && isAns ? "bg-teal text-white" : revealed && isChosen ? "bg-vermelho text-white" : isChosen ? "bg-azul text-white" : "bg-ceu text-noite"}`}>
                {revealed && isAns ? <Check className="h-5 w-5" /> : revealed && isChosen ? <X className="h-5 w-5" /> : o.letter}
              </span>
              {o.text && <span className="pt-1 text-[14px] leading-5">{o.text}</span>}
            </button>
          );
        })}
      </div>

      {revealed && (
        <div ref={feedbackRef} className="anim-pop mt-4 scroll-mt-3 space-y-3">
          <div className={`relative flex items-center gap-3 overflow-hidden rounded-3xl p-3 ${correct ? "bg-teal text-white" : "bg-vermelho-claro text-tinta ring-2 ring-vermelho/40"}`}>
            {correct && <Confete />}
            <div className="relative shrink-0">
              <img src={T + (correct ? "avatar.webp" : "busto.webp")} alt={correct ? "Tigrão comemorando" : "Tigrão pensativo"}
                className={`h-24 w-24 rounded-2xl object-cover ${correct ? "anim-pulo" : "anim-pensa"}`} />
              <span className="absolute -right-2 -top-2 text-2xl">{correct ? "🎉" : "🤔"}</span>
            </div>
            <div>
              <div className="font-titulo text-xl font-extrabold leading-6">{correct ? frase.ok : frase.erro}</div>
              <div className="text-sm font-semibold opacity-90">
                {correct ? `+${gain?.xp ?? XP.acerto} XP` : `Gabarito oficial: letra ${q.answer}. Sem XP desta vez — vale pela revisão!`}
              </div>
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

      {(revealed || (mode === "simulado" && chosen)) && (
        <button onClick={next} className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-azul py-3.5 font-titulo text-lg font-extrabold text-white shadow-md active:scale-95">
          {ultima ? "Ver resultado" : mode === "simulado" ? "Confirmar e seguir" : "Próxima questão"} <ChevronRight className="h-5 w-5" />
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
  return <div className="space-y-2 text-[14px] leading-5">{blocos}</div>;
}

function Resolucao({ q }: { q: Question }) {
  const ex = q.explanation;
  return (
    <div className="rounded-3xl bg-papel p-4 shadow-sm ring-1 ring-borda">
      <div className="mb-2 flex items-center gap-2">
        <img src={T + "avatar.webp"} className="h-8 w-8 rounded-full object-cover" alt="" />
        <span className="font-titulo text-lg font-extrabold text-azul">Resolução comentada</span>
      </div>
      <div className="mb-3 rounded-2xl bg-teal-claro px-3 py-2 text-[13px] font-bold text-tinta">✅ Gabarito oficial (INEP): letra {q.answer}{q.options ? ` — ${optionText(q, q.answer)}` : ""}</div>
      {ex ? (
        <>
          <div className="mb-2 rounded-2xl bg-laranja-claro px-3 py-2 text-[11px] font-bold leading-4 text-laranja-escuro">
            🤖 Resolução escrita por IA ({ex.author.replace(/^IA \((.*)\)$/, "$1")}) · aguardando revisão do professor.
            {ex.lowConfidence && " ⚠️ Confiança baixa: confira com atenção."}
          </div>
          <Markdown text={ex.markdown} />
          {ex.commonMistake && <div className="mt-2 text-[13px]"><b>Erro comum:</b> {ex.commonMistake}</div>}
        </>
      ) : (
        <p className="text-[13px] text-tinta/85">A resolução comentada desta questão ainda não foi escrita. Confira o gabarito oficial acima.</p>
      )}
      <div className="mt-3 border-t border-borda pt-2 text-[11px] leading-4 text-tinta/75">
        Fonte: ENEM {q.year} (INEP), caderno {q.booklet}, questão {q.number}.{" "}
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
  const score = p.items.filter((it) => it.chosen === it.q.answer).length;
  const total = p.items.length;
  const pct = total ? Math.round((score / total) * 100) : 0;
  const otimo = pct >= 70;
  const baixo = pct < 40;
  const [aberta, setAberta] = useState<string | null>(null);
  const msg = pct === 100 ? "GABARITOU! Tá com cara de aprovado em Medicina! 💯"
    : otimo ? "Mandou muito bem! Física de quem vai longe no ENEM! 🚀"
      : !baixo ? "Tá no caminho! Revisa as resoluções e volta mais forte."
        : "Calma, todo astronauta começa no chão. Os erros já foram pra sua revisão — bora juntos! 🐾";
  return (
    <div className="space-y-4">
      <div className={`relative overflow-hidden rounded-[28px] p-5 text-center text-white shadow-md ${baixo ? "bg-azul" : "bg-noite"}`}>
        <div className="estrelas absolute inset-0" />
        {otimo && <Confete />}
        <div className="relative font-titulo text-sm font-extrabold uppercase tracking-wider text-white/85">
          {p.mode === "simulado" ? "Resultado do Simulado ENEM" : p.mode === "revisao" ? "Revisão concluída" : p.topic ?? "Mistão do dia"}
        </div>
        <img src={T + (otimo ? "acena.webp" : baixo ? "busto.webp" : "avatar.webp")} alt="Tigrão"
          className={`relative mx-auto mt-3 h-44 w-44 rounded-3xl object-cover ring-4 ring-white/70 ${otimo ? "anim-pulo" : baixo ? "anim-pensa" : "anim-float"}`} />
        <div className="relative mt-3 font-titulo text-5xl font-extrabold">{score}/{total}</div>
        <div className="relative text-sm font-bold text-white/90">{plural(score, "acerto", "acertos")} · {pct}%{p.mode === "simulado" ? ` · ${fmt(p.seconds)} min` : ""}</div>
        <Balao className="sem-rabo relative mx-auto mt-3 w-fit">{msg}</Balao>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat v={`+${p.xp}`} l="XP ganhos" cor="text-azul" />
        <Stat v={`${p.state.streak.count}🔥`} l={p.state.streak.count === 1 ? "dia seguido" : "dias seguidos"} cor="text-laranja-escuro" />
        <Stat v={levelOf(p.state.xp).cur.emoji} l={levelOf(p.state.xp).cur.title} cor="text-teal" />
      </div>

      {(p.levelUp || p.badges.length > 0 || p.missoes.length > 0) && (
        <div className="anim-pop rounded-3xl bg-laranja-claro p-4 ring-2 ring-laranja">
          {p.levelUp && <div className="font-titulo text-lg font-extrabold">⬆️ Subiu de nível! Agora você é {p.levelUp}</div>}
          {[...new Set(p.missoes)].map((m) => <div key={m} className="text-sm font-bold">🗓️ Missão cumprida: {m}</div>)}
          {[...new Set(p.badges)].map((b) => { const l = badgeLabel(b); return <div key={b} className="text-sm font-bold">{l.emoji} Medalha nova: {l.nome}</div>; })}
        </div>
      )}

      <div className="rounded-3xl bg-papel p-3 shadow-sm ring-1 ring-borda">
        <div className="mb-2 px-1 font-titulo text-lg font-extrabold text-noite">Revisão das questões</div>
        <div className="space-y-2">
          {p.items.map((it, k) => {
            const ok = it.chosen === it.q.answer;
            const open = aberta === it.q.id;
            return (
              <div key={it.q.id} className={`rounded-2xl p-2.5 ${ok ? "bg-teal-claro" : "bg-vermelho-claro"}`}>
                <button className="flex w-full items-center gap-2 text-left" onClick={() => setAberta(open ? null : it.q.id)}>
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-white ${ok ? "bg-teal" : "bg-vermelho"}`}>{ok ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}</span>
                  <span className="min-w-0 flex-1 text-[13px]">
                    <b>{k + 1}. {it.q.area}</b> · ENEM {it.q.year} Q{it.q.number}
                    <span className="block text-[11px] text-tinta/80">
                      Sua: {it.chosen ? `${it.chosen}) ${optionText(it.q, it.chosen)}` : "sem resposta"}
                    </span>
                    {!ok && <span className="block text-[11px] font-bold text-tinta">Gabarito: {it.q.answer}) {optionText(it.q, it.q.answer)}</span>}
                  </span>
                  <ChevronRight className={`h-4 w-4 shrink-0 transition ${open ? "rotate-90" : ""}`} />
                </button>
                {open && (
                  <div className="mt-2 space-y-2">
                    <div className="rounded-2xl bg-papel p-3">
                      <p className="whitespace-pre-line text-[13px] leading-5">{it.q.statement}</p>
                      <Figuras figs={it.q.figures} />
                      {it.q.options && (
                        <ul className="mt-2 space-y-1">
                          {it.q.options.map((o) => {
                            const ans = o.letter === it.q.answer, mine = o.letter === it.chosen;
                            return (
                              <li key={o.letter} className={`rounded-xl px-2 py-1 text-[13px] ${ans ? "bg-teal-claro font-bold" : mine ? "bg-vermelho-claro" : ""}`}>
                                <b>{o.letter})</b> {o.text} {ans && "✅"} {mine && !ans && "❌ (sua)"}
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
      <div className="truncate text-[11px] font-semibold text-tinta/75">{l}</div>
    </div>
  );
}

/* ---------- CONQUISTAS ---------- */
function Conquistas({ state, onBack }: { state: State; onBack: () => void }) {
  const lv = levelOf(state.xp);
  const melhor = state.simulados.reduce((m, r) => Math.max(m, r.score), 0);
  const todas = ALL_BADGES();
  return (
    <div className="space-y-4">
      <Header title="Conquistas" onBack={onBack} />
      <div className="flex items-center gap-3 rounded-3xl bg-noite p-4 text-white shadow-md">
        <img src={T + "busto.webp"} className="h-20 w-20 rounded-2xl object-cover ring-4 ring-white/60" alt="Tigrão" />
        <div>
          <div className="text-xs font-bold uppercase text-white/80">Jornada até a aprovação</div>
          <div className="font-titulo text-2xl font-extrabold leading-7">{lv.cur.emoji} {lv.cur.title}</div>
          <div className="text-xs text-white/90">{state.xp} XP · recorde de {plural(state.streak.best, "dia", "dias")} 🔥 · melhor simulado {melhor}/{SIMULADO_N}</div>
        </div>
      </div>

      <div className="rounded-3xl bg-papel p-4 shadow-sm ring-1 ring-borda">
        <div className="mb-2 font-titulo text-lg font-extrabold text-noite">Níveis</div>
        <ol className="space-y-1.5">
          {LEVELS.map((l, k) => {
            const done = state.xp >= l.min;
            return (
              <li key={l.title} className={`flex items-center gap-2 rounded-2xl px-3 py-2 text-sm ${k === lv.index ? "bg-azul text-white" : done ? "bg-teal-claro text-tinta" : "bg-desligado text-tinta"}`}>
                <span className="text-lg">{done ? l.emoji : "🔒"}</span><span className="flex-1 font-bold">{l.title}</span><span className="text-xs font-semibold">{l.min} XP</span>
              </li>
            );
          })}
        </ol>
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
                <div className="text-[11px] font-bold leading-3.5 text-tinta">{l.nome}</div>
                <div className="mt-0.5 text-[10px] leading-3 text-tinta/80">{l.desc}</div>
              </div>
            );
          })}
        </div>
      </div>
      <p className="px-2 text-center text-[11px] text-tinta/70">Seu progresso fica salvo só neste aparelho (sem login).</p>
    </div>
  );
}
