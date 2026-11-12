// This file was generated with the assistance of an AI coding tool.
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * The graph's nodes and edges, as plain Cytoscape element definitions, built from a model. No Cytoscape here, so the
 * graphs can be tested without a browser. An EXPRESS node's id is its declared name; IFC5 nodes are `c:<key>`
 * (component), `ns:<namespace>` and `m:<key>/<member path>`; enumeration values are `v:<type>.<value>`.
 *
 * Relation kinds: subtype, attribute, derive, inverse, select, underlying, value, uses, reverse (who refers to a type
 * or entity), member (IFC5 structure) and ifc5 (EXPRESS ↔ IFC5 by name).
 */

import { namedRefs, aggregateText } from "../express/model.js";
import { specRows, localName } from "../ifcx/schema.js";

export const RELATIONS = ["subtype", "attribute", "derive", "inverse", "select", "underlying", "value", "uses", "reverse", "ifc5"];

/** Limits that keep a graph readable. */
export const CAPS = { reverse: 40, nodes: 500 };

class Elements {
  constructor() {
    this.nodes = new Map();
    this.edges = new Map();
  }

  node(id, data) {
    if (!this.nodes.has(id)) this.nodes.set(id, { group: "nodes", data: { id, ...data } });
    return this.nodes.get(id);
  }

  edge(id, source, target, data) {
    if (source === target && data.kind !== "attribute") return;
    if (!this.edges.has(id)) this.edges.set(id, { group: "edges", data: { id, source, target, ...data } });
  }

  list() {
    return [...this.nodes.values(), ...this.edges.values()];
  }
}

/** A node for an EXPRESS name, labelled as EXPRESS-G does: `(ABS) IfcRoot` for an abstract supertype. */
export function expressNode(model, name) {
  const kind = model.kindOf(name) ?? "unknown";
  const id = model.canonical(name);
  const entity = kind === "entity" ? model.entity(name) : null;
  const abstract = Boolean(entity?.abstract);
  const label = abstract ? `(ABS) ${id}` : id;
  return { id, data: { label, kind, abstract, w: width(label) } };
}

/** An approximate width for a label in the graph's font. */
export function width(label) {
  return Math.max(48, Math.round(String(label).length * 6.6 + 22));
}

function addExpress(el, model, name) {
  const n = expressNode(model, name);
  el.node(n.id, n.data);
  return n.id;
}

/** Add the direct relations of `name` to `el`; returns the ids of the neighbours. */
function expand(el, model, name, relations) {
  const id = addExpress(el, model, name);
  const around = [];
  const link = (target, edgeId, data) => {
    const t = addExpress(el, model, target);
    el.edge(edgeId, data.reverse ? t : id, data.reverse ? id : t, data);
    around.push(t);
  };
  const entity = model.entity(name);
  const type = model.type(name);
  if (entity) {
    if (relations.has("subtype")) {
      for (const s of entity.supertypes) {
        const t = addExpress(el, model, s);
        el.edge(`sub:${t}>${id}`, t, id, { kind: "subtype" });
        around.push(t);
      }
      for (const s of entity.subtypes) {
        const t = addExpress(el, model, s);
        el.edge(`sub:${id}>${t}`, id, t, { kind: "subtype", oneof: Boolean(entity.supertypeOf && /ONEOF/i.test(entity.supertypeOf)) });
        around.push(t);
      }
    }
    if (relations.has("attribute")) {
      for (const a of entity.explicit) {
        const agg = aggregateText(a.type);
        const label = `${a.redeclares ? "*" : ""}${a.name}${agg ? ` ${agg}` : ""}`;
        for (const r of namedRefs(a.type).length ? namedRefs(a.type) : [simpleName(a.type)]) {
          if (r) link(r, `attr:${id}.${a.name}>${r}`, { kind: "attribute", label, optional: a.optional, redeclared: Boolean(a.redeclares) });
        }
      }
    }
    if (relations.has("derive")) {
      for (const a of entity.derive) {
        const label = `(DER) ${a.redeclares ? "*" : ""}${a.name}`;
        for (const r of namedRefs(a.type).length ? namedRefs(a.type) : [simpleName(a.type)]) {
          if (r) link(r, `der:${id}.${a.name}>${r}`, { kind: "derive", label });
        }
      }
    }
    if (relations.has("inverse")) {
      for (const a of entity.inverse) {
        const agg = a.agg ? ` ${a.agg} [${a.lower}:${a.upper}]` : "";
        link(a.entity, `inv:${id}.${a.name}>${a.entity}`, { kind: "inverse", label: `(INV) ${a.name}${agg}` });
      }
    }
  }
  if (type) {
    const u = type.underlying;
    if (type.kind === "select" && relations.has("select")) {
      for (const item of u.items) link(item, `sel:${id}>${item}`, { kind: "select" });
    } else if (type.kind === "enum" && relations.has("value")) {
      for (const v of u.items) {
        const vid = `v:${id}.${v}`;
        el.node(vid, { label: v, kind: "value", w: width(v) });
        el.edge(`val:${id}>${v}`, id, vid, { kind: "value" });
      }
    } else if (type.kind === "defined" && relations.has("underlying")) {
      const agg = aggregateText(u);
      for (const r of namedRefs(u).length ? namedRefs(u) : [simpleName(u)]) {
        if (r) link(r, `und:${id}>${r}`, { kind: "underlying", label: agg });
      }
    }
  }
  if (relations.has("uses") && (entity || type)) {
    for (const m of model.mentions(name)) link(m, `use:${id}>${m}`, { kind: "uses" });
  }
  if (relations.has("reverse") && (entity || type)) {
    const refs = model.usedBy(name);
    for (const r of refs.slice(0, CAPS.reverse)) {
      const label = r.via ? `${r.kind === "inverse" ? "(INV) " : r.kind === "derive" ? "(DER) " : ""}${r.via}` : "";
      link(r.from, `rev:${r.from}.${r.via ?? ""}>${id}`, { kind: "reverse", label, reverse: true });
    }
    if (refs.length > CAPS.reverse) el.nodes.get(id).data.more = refs.length - CAPS.reverse;
  }
  return around;
}

function simpleName(type) {
  let t = type;
  while (t && t.kind === "aggregate") t = t.of;
  return t && t.kind === "simple" ? t.name : null;
}

/** The neighbourhood of an EXPRESS name: its relations, and with depth 2 those of its neighbours. */
export function neighbourhood(model, name, { depth = 1, relations = new Set(RELATIONS) } = {}) {
  const el = new Elements();
  if (!model.kindOf(name)) return [];
  let ring = [model.canonical(name)];
  const seen = new Set();
  for (let d = 0; d < depth && ring.length; d++) {
    const next = [];
    for (const n of ring) {
      if (seen.has(n) || el.nodes.size > CAPS.nodes) continue;
      seen.add(n);
      if (model.kindOf(n) === "simple") continue;
      next.push(...expand(el, model, n, relations));
    }
    ring = next;
  }
  el.nodes.get(model.canonical(name)).data.focus = true;
  return el.list();
}

/** The relations of one more node, to add to a graph already shown. */
export function expansion(model, name, relations = new Set(RELATIONS)) {
  const el = new Elements();
  if (model.kindOf(name) && model.kindOf(name) !== "simple") expand(el, model, name, relations);
  return el.list();
}

/**
 * The inheritance tree around an entity: its supertypes up to the root and every subtype below it. With `whole`, every
 * entity of the schema.
 */
export function inheritanceTree(model, name, { whole = false } = {}) {
  const el = new Elements();
  const names = whole
    ? [...model.entities.values()].map((e) => e.name)
    : model.entity(name)
      ? [...model.ancestors(name), model.entity(name).name, ...model.descendants(name)]
      : [];
  const inTree = new Set(names.map((n) => n.toUpperCase()));
  for (const n of names) addExpress(el, model, n);
  for (const n of names) {
    const e = model.entity(n);
    for (const s of e.supertypes) {
      if (!inTree.has(s.toUpperCase())) continue;
      const parent = model.canonical(s);
      const oneof = Boolean(model.entity(s)?.supertypeOf && /ONEOF/i.test(model.entity(s).supertypeOf));
      el.edge(`sub:${parent}>${e.name}`, parent, e.name, { kind: "subtype", oneof });
    }
  }
  const focus = model.entity(name) ? el.nodes.get(model.canonical(name)) : null;
  if (focus) focus.data.focus = true;
  return el.list();
}

// IFC's structures

const ROOT_ATTRIBUTES = new Set(["GLOBALID", "OWNERHISTORY", "NAME", "DESCRIPTION"]);

/**
 * A structure (structures.js) in a schema: its classes, the subtypes it asks for, its relationships as their own nodes
 * (`rel`), each relationship's attributes to the classes they point at (kind `relates`, labelled with the attribute and
 * the inverse attributes that point back), the attributes between the classes shown, and the subtype lines between
 * them. Returns the elements and which of the structure's names the schema has and lacks.
 */
export function structureGraph(model, structure) {
  const el = new Elements();
  const shown = new Set();
  const present = [];
  const missing = [];
  const show = (name) => {
    const kind = model.kindOf(name);
    if (!kind || kind === "simple" || kind === "function" || kind === "rule" || kind === "procedure") return null;
    const id = addExpress(el, model, name);
    const data = el.nodes.get(id).data;
    if (model.isRelationship(id) && !data.rel) {
      data.rel = true;
      data.w = Math.round(data.w * 1.4); // a diamond needs more width for the same label
    }
    shown.add(id.toUpperCase());
    return id;
  };
  for (const name of structure.names) {
    if (show(name)) present.push(model.canonical(name));
    else missing.push(name);
  }
  for (const s of structure.subtypes ?? []) {
    if (!model.entity(s.of)) continue;
    let level = [model.canonical(s.of)];
    for (let d = 0; d < s.depth; d++) {
      level = level.flatMap((n) => model.entity(n)?.subtypes ?? []);
      for (const n of level) show(n);
    }
  }
  const isShown = (name) => shown.has(String(name).toUpperCase());

  // The relationships' attributes, with the entities (or SELECT types) they point at. An attribute that a shown
  // relationship declares is drawn from it alone, not again from its shown subtypes; values such as enumerations are
  // left to the relationship's own details.
  const structural = (r) => {
    const kind = model.kindOf(r);
    return kind === "entity" || kind === "select";
  };
  for (const id of [...el.nodes.keys()]) {
    if (!model.isRelationship(id)) continue;
    for (const a of model.allAttributes(id)) {
      if (a.kind !== "explicit" || (ROOT_ATTRIBUTES.has(a.name.toUpperCase()) && a.declaredIn.toUpperCase() === "IFCROOT")) continue;
      if (a.declaredIn.toUpperCase() !== id.toUpperCase() && isShown(a.declaredIn)) continue;
      const agg = aggregateText(a.attr.type);
      const inverses = model.inversesOf(id, a.name).map((i) => i.name);
      const label = `${a.name}${agg ? ` ${agg}` : ""}${inverses.length ? ` · ${[...new Set(inverses)].join(", ")}` : ""}`;
      for (const r of namedRefs(a.attr.type).filter(structural)) {
        const t = show(r);
        if (t) el.edge(`rel:${id}.${a.name}>${t}`, id, t, { kind: "relates", label, optional: a.attr.optional });
      }
    }
  }

  // Attributes between the classes shown, also through a SELECT whose members are shown.
  const selectMembers = (name, seen = new Set()) => {
    const t = model.type(name);
    if (!t || t.kind !== "select" || seen.has(t.name)) return [];
    seen.add(t.name);
    return t.underlying.items.flatMap((i) => (model.type(i)?.kind === "select" ? selectMembers(i, seen) : [i]));
  };
  for (const id of [...el.nodes.keys()]) {
    const e = model.entity(id);
    if (!e || model.isRelationship(id)) continue;
    for (const a of e.explicit) {
      for (const r of namedRefs(a.type)) {
        const targets = isShown(r) ? [r] : selectMembers(r).filter(isShown);
        const agg = aggregateText(a.type);
        for (const t of targets) {
          const target = model.canonical(t);
          el.edge(`attr:${id}.${a.name}>${target}`, id, target, { kind: "attribute", label: `${a.name}${agg ? ` ${agg}` : ""}`, optional: a.optional });
        }
      }
    }
  }

  // A SELECT shown is joined to those of its members that are shown.
  for (const id of [...el.nodes.keys()]) {
    if (model.type(id)?.kind !== "select") continue;
    for (const item of selectMembers(id).filter(isShown)) {
      const target = model.canonical(item);
      el.edge(`sel:${id}>${target}`, id, target, { kind: "select" });
    }
  }

  // Subtype lines to the nearest supertype shown; when classes between them are left out, the line says which.
  for (const id of [...el.nodes.keys()]) {
    if (!model.entity(id)) continue;
    const chain = model.ancestors(id);
    const at = chain.findIndex(isShown);
    if (at < 0) continue;
    const parent = chain[at];
    const via = chain.slice(0, at);
    el.edge(`sub:${parent}>${id}`, parent, id, via.length ? { kind: "subtype", via: true, label: `via ${via.join(", ")}` } : { kind: "subtype" });
  }
  return { elements: el.list(), present, missing };
}

// IFC5

const nsId = (ns) => `ns:${ns || "(none)"}`;
const compId = (key) => `c:${key}`;

function addNamespace(el, model, ns) {
  const entry = model.namespaces.get(ns);
  const data = { label: ns || "(no namespace)", kind: "namespace" };
  if (entry && entry.parent !== null && entry.parent !== "") {
    addNamespace(el, model, entry.parent);
    data.parent = nsId(entry.parent);
  }
  el.node(nsId(ns), data);
}

function addComponent(el, model, key) {
  const c = model.component(key);
  if (!c) return null;
  addNamespace(el, model, c.namespace);
  const label = c.name;
  el.node(compId(key), { label, kind: "component", parent: nsId(c.namespace), key, w: width(label) });
  return compId(key);
}

/** Every IFC5 component, grouped in nested boxes per namespace. */
export function ifcxOverview(model) {
  const el = new Elements();
  for (const key of [...model.components.keys()].sort()) addComponent(el, model, key);
  return el.list();
}

/** One IFC5 component with its structure: Object members, Array elements and Enum options as nodes. */
export function ifcxComponent(model, key) {
  const el = new Elements();
  const id = addComponent(el, model, key);
  if (!id) return [];
  el.nodes.get(id).data.focus = true;
  const rows = specRows(model.component(key).spec, localName(key));
  const ids = new Map([[rows[0]?.path, id]]);
  for (const row of rows.slice(1)) {
    const mid = `m:${key}/${row.path}`;
    const label = `${row.name}${row.optional ? "?" : ""}: ${row.dataType}${row.quantityKind ? ` (${row.quantityKind})` : ""}`;
    el.node(mid, { label, kind: "member", w: width(label) });
    const parentPath = row.path.endsWith("[]") ? row.path.slice(0, -2) : row.path.slice(0, row.path.lastIndexOf("."));
    el.edge(`mem:${mid}`, ids.get(parentPath) ?? id, mid, { kind: "member", optional: row.optional });
    ids.set(row.path, mid);
    for (const option of row.options ?? []) {
      const vid = `${mid}=${option}`;
      el.node(vid, { label: option, kind: "value", w: width(option) });
      el.edge(`val:${vid}`, mid, vid, { kind: "value" });
    }
  }
  if (rows[0]?.options) {
    for (const option of rows[0].options) {
      const vid = `${id}=${option}`;
      el.node(vid, { label: option, kind: "value", w: width(option) });
      el.edge(`val:${vid}`, id, vid, { kind: "value" });
    }
  }
  return el.list();
}

/**
 * The comparison of an EXPRESS entity with IFC5 as a graph: the entity, the class component, and the components that
 * have the names of its attributes, joined by dashed "same name" edges.
 */
export function comparisonGraph(model, comparison, ifc5) {
  const el = new Elements();
  const id = addExpress(el, model, comparison.code);
  el.nodes.get(id).data.focus = true;
  if (comparison.classComponent) {
    const c = addComponent(el, ifc5, comparison.classComponent);
    el.edge(`ifc5:${id}>class`, id, c, { kind: "ifc5", label: `code "${comparison.code}"` });
  }
  for (const a of comparison.attributes) {
    for (const key of a.components) {
      const c = addComponent(el, ifc5, key);
      el.edge(`ifc5:${id}.${a.name}>${key}`, id, c, { kind: "ifc5", label: a.name });
    }
  }
  for (const n of comparison.named) {
    const c = addComponent(el, ifc5, n.key);
    el.edge(`ifc5:${id}>${n.key}`, id, c, { kind: "ifc5", label: "same name" });
  }
  return el.list();
}
