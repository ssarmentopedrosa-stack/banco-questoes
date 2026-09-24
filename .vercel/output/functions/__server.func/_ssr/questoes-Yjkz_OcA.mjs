import { i as __toESM } from "../_runtime.mjs";
import { B as require_react, v as Link, x as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { r as Route$1 } from "./router-BDwPdPKe.mjs";
import { a as fieldText, i as domainLabel, l as searchQuestions, o as isInterface, s as isProbable, u as useBanco } from "./use-banco-Gyc9PMRw.mjs";
import { t as StatusBadge } from "./status-badge-Z63ciXkY.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/questoes-Yjkz_OcA.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function QuestionCard({ q }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		className: "flex flex-col gap-3 rounded-2xl border border-line bg-panel p-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center gap-2 text-xs text-mute",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["ENEM ", q.year ?? "—"] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["Dia ", q.day ?? "—"] }),
					isInterface(q) || isProbable(q) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBadge, { status: "UNCERTAIN" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBadge, { status: q.taxonomy_status })
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: "font-mono text-sm text-amber",
				children: q.id
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
				className: "grid grid-cols-2 gap-2 text-sm",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
						className: "text-mute",
						children: "Domínio"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: isInterface(q) ? "Em revisão" : domainLabel(q.domain) })] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
						className: "text-mute",
						children: "Conteúdo"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: fieldText(q, q.content) })] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
						className: "text-mute",
						children: "Subconteúdo"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: fieldText(q, q.subcontent) })] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
						className: "text-mute",
						children: "Fenômeno"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: fieldText(q, q.phenomenon) })] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
						className: "text-mute",
						children: "Competência"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: q.competency_code ?? "Em revisão" })] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
						className: "text-mute",
						children: "Habilidade"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: q.skill_code ?? "Em revisão" })] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
						className: "text-mute",
						children: "Bloom"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: fieldText(q, q.bloom) })] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
						className: "text-mute",
						children: "Demanda"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: fieldText(q, q.demand) })] })
				]
			}),
			isInterface(q) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-rose",
				children: "CLASSIFICAÇÃO DISCIPLINAR EM REVISÃO"
			}),
			isProbable(q) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-amber",
				children: "EM REVISÃO"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: "/questoes/$id",
				params: { id: q.id },
				className: "mt-auto inline-flex min-h-11 items-center justify-center rounded-xl bg-amber px-4 text-sm font-semibold text-ink",
				children: "Explorar questão"
			})
		]
	});
}
var FILTERS = [
	{
		key: "year",
		label: "Ano"
	},
	{
		key: "day",
		label: "Dia"
	},
	{
		key: "domain",
		label: "Domínio"
	},
	{
		key: "content",
		label: "Conteúdo"
	},
	{
		key: "subcontent",
		label: "Subconteúdo"
	},
	{
		key: "phenomenon",
		label: "Fenômeno"
	},
	{
		key: "competency_code",
		label: "Competência"
	},
	{
		key: "skill_code",
		label: "Habilidade"
	},
	{
		key: "bloom",
		label: "Bloom"
	},
	{
		key: "math_category",
		label: "Matemática"
	},
	{
		key: "reasoning",
		label: "Raciocínio"
	},
	{
		key: "representation",
		label: "Representação"
	},
	{
		key: "learning_role",
		label: "Papel pedagógico"
	},
	{
		key: "taxonomy_status",
		label: "Status"
	},
	{
		key: "demand",
		label: "Demanda"
	}
];
function QuestoesPage() {
	const search = Route$1.useSearch();
	const { data, error, loading } = useBanco();
	const [text, setText] = (0, import_react.useState)(search.q ?? "");
	const [filters, setFilters] = (0, import_react.useState)({ domain: search.dominio ?? "" });
	const [sort, setSort] = (0, import_react.useState)("id");
	const [page, setPage] = (0, import_react.useState)(0);
	const pageSize = 9;
	const options = (0, import_react.useMemo)(() => {
		const map = {};
		if (!data) return map;
		for (const f of FILTERS) map[f.key] = [...new Set(data.questions.map((q) => String(q[f.key] ?? "")).filter(Boolean))].sort();
		return map;
	}, [data]);
	const shown = (0, import_react.useMemo)(() => {
		if (!data) return [];
		let list = searchQuestions(data.questions, text);
		for (const [k, v] of Object.entries(filters)) {
			if (!v) continue;
			list = list.filter((q) => String(q[k] ?? "") === v);
		}
		return list;
	}, [
		data,
		text,
		filters
	]);
	const ordered = (0, import_react.useMemo)(() => {
		const copy = [...shown];
		copy.sort((a, b) => String(a[sort] ?? "").localeCompare(String(b[sort] ?? ""), "pt"));
		return copy;
	}, [shown, sort]);
	const pages = Math.max(1, Math.ceil(ordered.length / pageSize));
	const safePage = Math.min(page, pages - 1);
	const slice = ordered.slice(safePage * pageSize, safePage * pageSize + pageSize);
	if (loading) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Carregando questões…" });
	if (error || !data) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		role: "alert",
		children: error
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-serif text-3xl",
				children: "Banco de questões"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-mute",
				children: [
					shown.length,
					" de ",
					data.questions.length,
					" questões oficiais de Física 2024–2025."
				]
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "block",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-sm text-mute",
					children: "Busca"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					value: text,
					onChange: (e) => setText(e.target.value),
					placeholder: "ID, conteúdo, fenômeno, lei, habilidade…",
					className: "mt-1 min-h-11 w-full rounded-xl border border-line bg-panel px-3 text-fg"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid gap-2 sm:grid-cols-2 lg:grid-cols-4",
				children: FILTERS.map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "text-xs text-mute",
					children: [f.label, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
						"aria-label": f.label,
						value: filters[f.key] ?? "",
						onChange: (e) => setFilters((s) => ({
							...s,
							[f.key]: e.target.value
						})),
						className: "mt-1 min-h-11 w-full rounded-lg border border-line bg-ink px-2 text-sm text-fg",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "",
							children: "Todos"
						}), (options[f.key] ?? []).map((o) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: o,
							children: o.replaceAll("_", " ")
						}, o))]
					})]
				}, f.key))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "text-sm text-mute",
				children: ["Ordenar", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
					"aria-label": "Ordenação",
					className: "ml-2 min-h-11 rounded-lg border border-line bg-ink px-2 text-fg",
					value: sort,
					onChange: (e) => {
						setSort(e.target.value);
						setPage(0);
					},
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "id",
							children: "ID"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "year",
							children: "Ano"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "domain",
							children: "Domínio"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "content",
							children: "Conteúdo"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "demand",
							children: "Demanda"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "bloom",
							children: "Bloom"
						})
					]
				})]
			}),
			ordered.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "rounded-xl border border-line p-6 text-mute",
				children: "Nenhuma questão com esses filtros. Os dados não foram alterados."
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid gap-3 md:grid-cols-2 xl:grid-cols-3",
				children: slice.map((q) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(QuestionCard, { q }, q.id))
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "min-h-11 rounded-lg border border-line px-3",
						disabled: safePage === 0,
						onClick: () => setPage(safePage - 1),
						children: "Anterior"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "text-sm text-mute",
						children: [
							"Página ",
							safePage + 1,
							" de ",
							pages
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "min-h-11 rounded-lg border border-line px-3",
						disabled: safePage >= pages - 1,
						onClick: () => setPage(safePage + 1),
						children: "Próxima"
					})
				]
			})] })
		]
	});
}
//#endregion
export { QuestoesPage as component };
