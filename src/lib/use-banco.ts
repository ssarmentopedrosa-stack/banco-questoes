import { banco } from "@/lib/banco";

export function useBanco() {
  return { data: banco, error: null as string | null, loading: false };
}
