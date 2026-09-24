import { i as __toESM } from "../_runtime.mjs";
import { B as require_react, x as require_jsx_runtime, y as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { i as domainLabel, u as useBanco } from "./use-banco-Gyc9PMRw.mjs";
import { t as GraphView } from "./graph-view-CoeUyd4m.mjs";
import { t as StatusBadge } from "./status-badge-Z63ciXkY.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/mapa-BpH48isX.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function Mapa() {
	const { data, error, loading } = useBanco();
	const nav = useNavigate();
	const [domain, setDomain] = (0, import_react.useState)("");
	const [rel, setRel] = (0, import_react.useState)("");
	const [status, setStatus] = (0, import_react.useState)("");
	const [selected, setSelected] = (0, import_react.useState)(null);
	const domains = (0, import_react.useMemo)(() => [...new Set(data?.questions.map((q) => q.domain || "") ?? [])].filter(Boolean).sort(), [data]);
	const types = (0, import_react.useMemo)(() => [...new Set(data?.learningEdges.map((e) => e.type) ?? [])].sort(), [data]);
	const questions = (0, import_react.useMemo)(() => {
		if (!data) return [];
		return domain ? data.questions.filter((q) => q.domain === domain) : data.questions;
	}, [data, domain]);
	const allowed = (0, import_react.useMemo)(() => new Set(questions.map((q) => q.id)), [questions]);
	const edges = (0, import_react.useMemo)(() => {
		if (!data) return [];
		return data.learningEdges.filter((e) => {
			if (!allowed.has(e.source) || !allowed.has(e.target)) return false;
			if (rel && e.type !== rel) return false;
			if (status && e.status !== status) return false;
			return true;
		});
	}, [
		data,
		allowed,
		rel,
		status
	]);
	if (loading) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Carregando mapa…" });
	if (error || !data) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		role: "alert",
		children: error
	});
	const sel = data.questions.find((q) => q.id === selected);
	const paths = data.paths.filter((p) => !domain || p.nodes.some((n) => allowed.has(n))).slice(0, 8);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-serif text-3xl",
				children: "Mapa de Aprendizagem"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "max-w-2xl text-mute",
				children: "Possível caminho de aprendizagem e relação estrutural entre questões. Não é sequência obrigatória nem medida de dificuldade."
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-2 sm:grid-cols-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "text-sm text-mute",
						children: ["Domínio", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
							"aria-label": "Filtrar domínio",
							className: "mt-1 min-h-11 w-full rounded-lg border border-line bg-panel px-2 text-fg",
							value: domain,
							onChange: (e) => setDomain(e.target.value),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "",
								children: "Todos"
							}), domains.map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: d,
								children: domainLabel(d)
							}, d))]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "text-sm text-mute",
						children: ["Tipo de relação", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
							"aria-label": "Filtrar tipo",
							className: "mt-1 min-h-11 w-full rounded-lg border border-line bg-panel px-2 text-fg",
							value: rel,
							onChange: (e) => setRel(e.target.value),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "",
								children: "Todos"
							}), types.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: t,
								children: t.replaceAll("_", " ")
							}, t))]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "text-sm text-mute",
						children: ["Confiança", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
							"aria-label": "Filtrar confiança",
							className: "mt-1 min-h-11 w-full rounded-lg border border-line bg-panel px-2 text-fg",
							value: status,
							onChange: (e) => setStatus(e.target.value),
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "",
									children: "Todos"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "CONFIRMED",
									children: "CONFIRMED"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "CANDIDATE",
									children: "CANDIDATE"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "UNCERTAIN",
									children: "UNCERTAIN"
								})
							]
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-sm text-mute",
				children: [
					questions.length,
					" questões · ",
					edges.length,
					" relações visíveis · ciclos registrados: ",
					data.cycles.length
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(GraphView, {
				questions,
				edges,
				focusId: selected,
				onSelect: setSelected,
				onOpen: (id) => nav({
					to: "/questoes/$id",
					params: { id }
				})
			}),
			sel && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
				className: "rounded-2xl border border-line bg-panel p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-mono text-amber",
						children: sel.id
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
						domainLabel(sel.domain),
						" · ",
						sel.content?.replaceAll("_", " ") ?? "Em revisão"
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-sm text-mute",
						children: [
							"Papel: ",
							sel.learning_role ?? "Em revisão",
							" · preparação: ",
							sel.preparation_level ?? "Em revisão"
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "mt-2 min-h-11 rounded-lg bg-amber px-3 text-sm font-semibold text-ink",
						onClick: () => nav({
							to: "/questoes/$id",
							params: { id: sel.id }
						}),
						children: "Explorar questão"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "mb-2 font-serif text-2xl",
				children: "Clusters"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid gap-3 md:grid-cols-2",
				children: data.clusters.map((c) => {
					const qs = data.questions.filter((q) => c.canonical_ids.includes(q.id));
					const concepts = [...new Set(qs.flatMap((q) => q.prerequisites.map((p) => p.label).filter(Boolean)))].slice(0, 6);
					const rels = data.learningEdges.filter((e) => c.canonical_ids.includes(e.source) && c.canonical_ids.includes(e.target));
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
						className: "rounded-2xl border border-line bg-panel p-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
								className: "font-serif text-xl",
								children: domainLabel(c.name)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-sm text-mute",
								children: [
									c.canonical_ids.length,
									" questões · ",
									rels.length,
									" relações internas"
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 text-sm",
								children: concepts.length ? concepts.join(" · ") : "Em revisão"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
								className: "mt-2 space-y-1 text-xs text-mute",
								children: c.canonical_ids.slice(0, 6).map((id) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: id }, id))
							})
						]
					}, c.cluster_id);
				})
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "mb-2 font-serif text-2xl",
					children: "Caminhos identificados"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mb-3 text-sm text-mute",
					children: [
						"Possível progressão e relação pedagógica. Profundidade máxima registrada: ",
						data.pathLimit,
						". Não é ordem obrigatória de estudo."
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "space-y-2",
					children: paths.map((p, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "rounded-xl border border-line p-3 text-sm",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBadge, { status: "CANDIDATE" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "ml-2",
							children: p.nodes.join(" → ")
						})]
					}, i))
				})
			] })
		]
	});
}
//#endregion
export { Mapa as component };
