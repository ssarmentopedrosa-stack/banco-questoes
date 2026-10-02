import { useCallback, useSyncExternalStore } from "react";
import { banco } from "@/lib/banco";
import {
  applyRound,
  exportProfiles,
  importProfiles,
  missionsFromPaths,
  newProfile,
  normalizeNickname,
  type PlayerProfile,
  type RoundAnswer,
  type RoundResult,
} from "./engine";
import { catalog } from "./catalog";
import { defaultRepository, emptyState, type DesafioSettings, type DesafioState } from "./storage";

// Store de módulo compartilhado entre /desafio e /perfil.
let state: DesafioState = emptyState();
let hydrated = false;
const listeners = new Set<() => void>();
const SERVER_SNAPSHOT = { state: emptyState(), hydrated: false };
let snapshot = { state, hydrated };

function emit() {
  snapshot = { state, hydrated };
  listeners.forEach((l) => l());
}

function ensureHydrated() {
  if (hydrated || typeof window === "undefined") return;
  state = defaultRepository.load();
  hydrated = true;
  snapshot = { state, hydrated };
}

function commit(next: DesafioState) {
  state = next;
  defaultRepository.save(state);
  emit();
}

function subscribe(l: () => void) {
  listeners.add(l);
  if (!hydrated) {
    ensureHydrated();
    queueMicrotask(emit);
  }
  return () => listeners.delete(l);
}

export function allMissions(includeReview: boolean) {
  return missionsFromPaths(banco.paths, catalog, { includeReview });
}

export function useDesafio() {
  const snap = useSyncExternalStore(subscribe, () => snapshot, () => SERVER_SNAPSHOT);
  const s = snap.state;
  const current = s.profiles.find((p) => p.nickname === s.current) ?? null;

  const createProfile = useCallback((nick: string) => {
    const name = normalizeNickname(nick);
    if (!name) return "Digite um apelido.";
    if (state.profiles.some((p) => p.nickname.toLowerCase() === name.toLowerCase())) {
      commit({ ...state, current: state.profiles.find((p) => p.nickname.toLowerCase() === name.toLowerCase())!.nickname });
      return null;
    }
    commit({ ...state, profiles: [...state.profiles, newProfile(name, new Date())], current: name });
    return null;
  }, []);

  const selectProfile = useCallback((nick: string | null) => commit({ ...state, current: nick }), []);

  const removeProfile = useCallback((nick: string) => {
    commit({ ...state, profiles: state.profiles.filter((p) => p.nickname !== nick), current: state.current === nick ? null : state.current });
  }, []);

  const setSettings = useCallback((patch: Partial<DesafioSettings>) => commit({ ...state, settings: { ...state.settings, ...patch } }), []);

  const finishRound = useCallback((answers: RoundAnswer[], isDaily: boolean): RoundResult | null => {
    const me = state.profiles.find((p) => p.nickname === state.current);
    if (!me) return null;
    const res = applyRound(me, answers, { now: new Date(), isDaily, allQuestions: catalog, missions: allMissions(false) });
    commit({ ...state, profiles: state.profiles.map((p) => (p.nickname === me.nickname ? res.profile : p)) });
    return res;
  }, []);

  const exportJson = useCallback(() => JSON.stringify(exportProfiles(state.profiles, new Date()), null, 2), []);

  const importJson = useCallback((text: string) => {
    const parsed: unknown = JSON.parse(text);
    const r = importProfiles(state.profiles, parsed);
    commit({ ...state, profiles: r.profiles, current: state.current ?? r.profiles[0]?.nickname ?? null });
    return r;
  }, []);

  return {
    hydrated: snap.hydrated,
    profiles: s.profiles as PlayerProfile[],
    current,
    settings: s.settings,
    createProfile,
    selectProfile,
    removeProfile,
    setSettings,
    finishRound,
    exportJson,
    importJson,
  };
}
