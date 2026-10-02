import type { PlayerProfile } from "./engine";

/**
 * Persistência do Desafio. Hoje: localStorage (vários alunos no mesmo aparelho).
 *
 * Para plugar no login/DB existente depois: implemente `ProgressRepository`
 * com chamadas ao servidor usando o `userId` de `useCurrentUserState()` e
 * troque `defaultRepository`. O formato (`DesafioState`) é JSON puro, pronto
 * para uma coluna JSONB por usuário — nenhuma migração é feita agora.
 */
export type DesafioSettings = { includeReview: boolean; roundSize: number };

export type DesafioState = {
  version: 1;
  profiles: PlayerProfile[];
  current: string | null; // apelido ativo
  settings: DesafioSettings;
};

export interface ProgressRepository {
  load(): DesafioState;
  save(state: DesafioState): void;
}

export const STORAGE_KEY = "banco-fisica-enem:desafio:v1";

export function emptyState(): DesafioState {
  return { version: 1, profiles: [], current: null, settings: { includeReview: false, roundSize: 5 } };
}

export function parseState(raw: string | null): DesafioState {
  if (!raw) return emptyState();
  try {
    const s = JSON.parse(raw) as Partial<DesafioState>;
    if (s.version !== 1 || !Array.isArray(s.profiles)) return emptyState();
    return {
      version: 1,
      profiles: s.profiles,
      current: typeof s.current === "string" ? s.current : null,
      settings: { ...emptyState().settings, ...(s.settings ?? {}) },
    };
  } catch {
    return emptyState();
  }
}

export class LocalStorageRepository implements ProgressRepository {
  private readonly key: string;
  constructor(key: string = STORAGE_KEY) {
    this.key = key;
  }
  load(): DesafioState {
    if (typeof window === "undefined") return emptyState();
    try {
      return parseState(window.localStorage.getItem(this.key));
    } catch {
      return emptyState();
    }
  }
  save(state: DesafioState): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(this.key, JSON.stringify(state));
    } catch {
      // armazenamento cheio ou bloqueado (modo privado): o jogo segue em memória
    }
  }
}

export const defaultRepository: ProgressRepository = new LocalStorageRepository();
