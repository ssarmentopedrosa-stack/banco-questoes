import { DOMAIN_LABEL } from "@/lib/banco";
import { DOMAIN_TIERS, GENERAL_ACHIEVEMENTS } from "./engine";

export type AchievementView = { id: string; title: string; description: string; icon: string; group: string };

export function describeAchievement(id: string): AchievementView {
  const g = GENERAL_ACHIEVEMENTS.find((a) => a.id === id);
  if (g) return g;
  const [kind, key, tier] = id.split(":");
  if (kind === "dominio") {
    const t = DOMAIN_TIERS.find((x) => x.tier === tier);
    const name = DOMAIN_LABEL[key] ?? key;
    return { id, title: `${name} · ${tier}`, description: `Medalha de ${tier} em ${name}: ${t?.rule ?? ""}.`, icon: t?.icon ?? "🏅", group: "dominio" };
  }
  if (kind === "ano") {
    return tier === "completo"
      ? { id, title: `ENEM ${key} completo`, description: `Acertou todas as questões jogáveis de ${key}.`, icon: "🏆", group: "ano" }
      : { id, title: `Explorador ${key}`, description: `Respondeu pelo menos 5 questões de ${key}.`, icon: "🔭", group: "ano" };
  }
  return { id, title: id, description: "", icon: "🏅", group: "geral" };
}
