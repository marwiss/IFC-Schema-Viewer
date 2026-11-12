// This file was generated with the assistance of an AI coding tool.
// SPDX-License-Identifier: AGPL-3.0-or-later

/** The list beside the graph: the schema's names, filtered by the search box; IFC5 components per namespace. */

import { el, replace } from "./dom.js";

const SHOWN = 400;

function item(text, current, onclick, title) {
  return el("li", {}, el("button", { type: "button", class: "item", "aria-current": current ? "true" : null, onclick, title }, text));
}

function group(title, names, current, go, more = 0) {
  if (!names.length) return null;
  return el(
    "details",
    { class: "group", open: true },
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

/** Fill `node` with the names of an EXPRESS model. */
export function renderExpressList(node, model, query, current, go) {
  const entities = filtered([...model.entities.values()].map((e) => e.name).sort(), query);
  const types = filtered([...model.types.values()].map((t) => t.name).sort(), query);
  const algorithms = filtered([...model.algorithms.values()].map((a) => a.name).sort(), query);
  const groups = [
    group("Entities", entities.shown, current, go, entities.more),
    group("Types", types.shown, current, go, types.more),
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
