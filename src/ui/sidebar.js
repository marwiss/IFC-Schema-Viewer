// This file was generated with the assistance of an AI coding tool.
// SPDX-License-Identifier: AGPL-3.0-or-later

/** The list beside the graph: the schema's names, filtered by the search box; IFC5 components per namespace. */

import { el, replace } from "./dom.js";
import { STRUCTURES } from "../structures.js";

const SHOWN = 400;

function item(text, current, onclick, title) {
  return el("li", {}, el("button", { type: "button", class: "item", "aria-current": current ? "true" : null, onclick, title }, text));
}

function group(title, names, current, go, more = 0, open = true) {
  if (!names.length) return null;
  return el(
    "details",
    { class: "group", open },
    el("summary", {}, `${title} (${names.length + more})`),
    el("ul", { class: "list" }, names.map((n) => item(n.label ?? n, (n.id ?? n) === current, () => go(n.id ?? n), n.title))),
    more ? el("p", { class: "muted" }, `${more} more; narrow the search.`) : null,
  );
}

function filtered(names, query) {
  const q = query.trim().toLowerCase();
  const found = q ? names.filter((n) => n.toLowerCase().includes(q)) : names;
  return { shown: found.slice(0, SHOWN), more: Math.max(0, found.length - SHOWN) };
}

/** Fill `node` with the names of an EXPRESS model, IFC's structures first and the property sets when loaded. */
export function renderExpressList(node, model, query, current, go, psets = null) {
  const entities = filtered([...model.entities.values()].map((e) => e.name).sort(), query);
  const types = filtered([...model.types.values()].map((t) => t.name).sort(), query);
  const algorithms = filtered([...model.algorithms.values()].map((a) => a.name).sort(), query);
  const q = query.trim().toLowerCase();
  const structures = STRUCTURES.filter((s) => !q || `${s.en} ${s.sv} ${s.names.join(" ")}`.toLowerCase().includes(q)).map((s) => ({
    id: `s:${s.id}`,
    label: s.en,
    title: `${s.sv}: ${s.about}`,
  }));
  const sets = psets ? filtered([...psets.sets.values()].map((s) => s.name).sort(), query) : { shown: [], more: 0 };
  const setItems = sets.shown.map((n) => ({ id: `p:${n}`, label: n }));
  const groups = [
    group("Structures", structures, current, go, 0, Boolean(q) || String(current ?? "").startsWith("s:")),
    group("Entities", entities.shown, current, go, entities.more),
    group("Types", types.shown, current, go, types.more),
    group("Property and quantity sets", setItems, current, go, sets.more, Boolean(q) || String(current ?? "").startsWith("p:")),
    group("Functions and rules", algorithms.shown, current, go, algorithms.more),
  ].filter(Boolean);
  replace(node, groups.length ? groups : el("p", { class: "muted" }, "Nothing matches."));
}

/** Fill `node` with the IFC5 components, grouped per namespace. */
export function renderIfcxList(node, model, query, current, go) {
  const q = query.trim().toLowerCase();
  const groups = [];
  for (const ns of [...model.namespaces.keys()].sort()) {
    const keys = model.namespaces.get(ns).components.filter((k) => !q || k.toLowerCase().includes(q));
    if (!keys.length) continue;
    const names = keys.map((k) => ({ id: k, label: k.slice(ns ? ns.length + 2 : 0), title: k }));
    groups.push(group(ns || "(no namespace)", names, current, go));
  }
  replace(node, groups.length ? groups : el("p", { class: "muted" }, "Nothing matches."));
}
