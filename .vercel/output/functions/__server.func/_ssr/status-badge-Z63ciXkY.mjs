import { x as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/status-badge-Z63ciXkY.js
var import_jsx_runtime = require_jsx_runtime();
var TONE = {
	CONFIRMED: "border-teal text-teal",
	CANDIDATE: "border-amber text-amber",
	UNCERTAIN: "border-rose text-rose",
	PARTIAL: "border-amber text-amber",
	DETERMINED: "border-teal text-teal",
	PROBABLE: "border-amber text-amber"
};
var MARK = {
	CONFIRMED: "✓",
	CANDIDATE: "◐",
	UNCERTAIN: "?",
	PARTIAL: "◐",
	DETERMINED: "✓"
};
function StatusBadge({ status }) {
	const key = status || "UNCERTAIN";
	const tone = TONE[key] ?? "border-line text-mute";
	const mark = MARK[key] ?? "·";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
		className: `inline-flex min-h-7 items-center gap-1 rounded-full border px-2 text-xs font-medium ${tone}`,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			"aria-hidden": true,
			children: mark
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: key.replaceAll("_", " ") })]
	});
}
//#endregion
export { StatusBadge as t };
