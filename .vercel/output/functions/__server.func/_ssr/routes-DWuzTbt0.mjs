import { v as Link, x as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { c as kpis, i as domainLabel, n as DOMAIN_LABEL, u as useBanco } from "./use-banco-Gyc9PMRw.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-DWuzTbt0.js
var import_jsx_runtime = require_jsx_runtime();
function KpiCard({ label, value }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		className: "rounded-2xl border border-line bg-panel p-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-sm text-mute",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "font-serif text-3xl text-amber",
			children: value
		})]
	});
}
function Home() {
	const { data, error, loading } = useBanco();
	if (loading) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Carregando banco auditado…" });
	if (error || !data) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		role: "alert",
		children: error ?? "Dados indisponíveis."
	});
	const k = kpis(data);
	const cards = [
		["Questões de Física", k.questions],
		["Relações pedagógicas", k.relations],
		["Confirmadas", k.confirmed],
		["Candidatas", k.candidate],
		["Questões em revisão", k.review],
		["Clusters / domínios", k.domains]
	];
	const groups = Object.keys(DOMAIN_LABEL).map((d) => {
		const qs = data.questions.filter((q) => q.domain === d);
		const contents = [...new Set(qs.map((q) => q.content).filter((c) => c && c !== "INDETERMINADO"))].slice(0, 4);
		return {
			d,
			n: qs.length,
			contents
		};
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm tracking-widest text-teal",
					children: "CIÊNCIAS DA NATUREZA · 2024–2025"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "mt-2 font-serif text-4xl text-fg",
					children: "Banco Inteligente de Física do ENEM"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 max-w-2xl text-mute",
					children: "Base pedagógica verificável para análise, estudo e construção de avaliações."
				})
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				className: "grid gap-3 sm:grid-cols-2 lg:grid-cols-3",
				children: cards.map(([label, value]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(KpiCard, {
					label,
					value
				}, label))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "mb-3 font-serif text-2xl",
				children: "Domínios"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid gap-3 sm:grid-cols-2 lg:grid-cols-3",
				children: groups.map((g) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
					to: "/questoes",
					search: { dominio: g.d },
					className: "rounded-2xl border border-line bg-panel-2 p-4 hover:border-amber",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "font-serif text-xl",
							children: domainLabel(g.d)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-sm text-mute",
							children: [g.n, " questões"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-sm",
							children: g.contents.length ? g.contents.map((c) => c.replaceAll("_", " ")).join(" · ") : "Em revisão"
						})
					]
				}, g.d))
			})] })
		]
	});
}
//#endregion
export { Home as component };
