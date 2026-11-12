// This file was generated with the assistance of an AI coding tool.
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * The model of a parsed EXPRESS schema: lookups by name (case-insensitive, as EXPRESS is), the inheritance in both
 * directions, the attributes of an entity with those it inherits, and who refers to whom.
 */

import { parseExpress, SIMPLE_TYPES } from "./parser.js";

const key = (name) => String(name).toUpperCase();

/** The names an attribute type refers to, through aggregates. */
export function namedRefs(type, into = []) {
  if (!type) return into;
  if (type.kind === "named") into.push(type.name);
  else if (type.kind === "aggregate" || (type.kind === "generic" && type.of)) namedRefs(type.of, into);
  else if (type.kind === "select" || type.kind === "enum") {
    if (type.kind === "select") into.push(...type.items);
    if (type.basedOn) into.push(type.basedOn);
  }
  return into;
}

/** A type expression as EXPRESS writes it: `LIST [1:?] OF UNIQUE IfcCartesianPoint`. */
export function typeText(type) {
  if (!type) return "";
  switch (type.kind) {
    case "simple":
      return type.width ? `${type.name}(${type.width})${type.fixed ? " FIXED" : ""}` : type.name;
    case "named":
      return type.name;
    case "aggregate": {
      const b = type.lower !== null ? ` [${type.lower}:${type.upper}]` : "";
      return `${type.agg}${b} OF ${type.optional ? "OPTIONAL " : ""}${type.unique ? "UNIQUE " : ""}${typeText(type.of)}`;
    }
    case "select":
      return type.basedOn ? `SELECT BASED_ON ${type.basedOn}` : `SELECT (${type.items.join(", ")})`;
    case "enum":
      return `ENUMERATION OF (${type.items.join(", ")})`;
    case "generic":
      return type.of ? `${type.name} OF ${typeText(type.of)}` : type.name;
    default:
      return "";
  }
}

/** The aggregate part of a type alone, for an edge label: `LIST [1:?]`, `SET [1:?] OF LIST [2:?]`. */
export function aggregateText(type) {
  const parts = [];
  let t = type;
  while (t && t.kind === "aggregate") {
    parts.push(t.lower !== null ? `${t.agg} [${t.lower}:${t.upper}]` : t.agg);
    t = t.of;
  }
  return parts.join(" OF ");
}

/** Build the model of EXPRESS text. */
export function buildModel(text, meta = {}) {
  const parsed = parseExpress(text);
  const entities = new Map();
  const types = new Map();
  const algorithms = new Map();
  for (const e of parsed.entities) entities.set(key(e.name), { ...e, kind: "entity", subtypes: [] });
  for (const t of parsed.types) {
    const kind = t.underlying.kind === "select" ? "select" : t.underlying.kind === "enum" ? "enum" : "defined";
    types.set(key(t.name), { ...t, kind });
  }
  for (const a of parsed.algorithms) if (a.name) algorithms.set(key(a.name), { ...a, kind: a.kind.toLowerCase() });
  for (const e of entities.values()) {
    for (const s of e.supertypes) {
      const parent = entities.get(key(s));
      if (parent) parent.subtypes.push(e.name);
    }
  }
  for (const e of entities.values()) e.subtypes.sort();

  // Who refers to a name: attributes, inverse attributes, select members and underlying types.
  const usedBy = new Map();
  const use = (target, ref) => {
    const k = key(target);
    if (!usedBy.has(k)) usedBy.set(k, []);
    usedBy.get(k).push(ref);
  };
  for (const e of entities.values()) {
    for (const a of e.explicit) for (const n of namedRefs(a.type)) use(n, { from: e.name, via: a.name, kind: "attribute" });
    for (const a of e.derive) for (const n of namedRefs(a.type)) use(n, { from: e.name, via: a.name, kind: "derive" });
    for (const a of e.inverse) use(a.entity, { from: e.name, via: a.name, kind: "inverse" });
  }
  for (const t of types.values()) {
    const kind = t.kind === "select" ? "select" : "underlying";
    for (const n of namedRefs(t.underlying)) use(n, { from: t.name, via: null, kind });
  }

  const model = {
    format: "express",
    id: meta.id ?? parsed.schema ?? "EXPRESS",
    label: meta.label ?? parsed.schema ?? "EXPRESS",
    schema: parsed.schema,
    text,
    entities,
    types,
    algorithms,
    skipped: parsed.skipped,
    errors: parsed.errors,

    entity: (name) => entities.get(key(name)) ?? null,
    type: (name) => types.get(key(name)) ?? null,
    algorithm: (name) => algorithms.get(key(name)) ?? null,

    /** `entity`, `select`, `enum`, `defined`, `simple`, `function`, `rule`, `procedure` or null. */
    kindOf(name) {
      const k = key(name);
      if (entities.has(k)) return "entity";
      if (types.has(k)) return types.get(k).kind;
      if (SIMPLE_TYPES.has(k)) return "simple";
      if (algorithms.has(k)) return algorithms.get(k).kind;
      return null;
    },

    /** The declared name with its case, or the name as given when it is not declared. */
    canonical(name) {
      const k = key(name);
      return entities.get(k)?.name ?? types.get(k)?.name ?? algorithms.get(k)?.name ?? (SIMPLE_TYPES.has(k) ? k : name);
    },

    /** The supertypes from the entity up to its root, nearest first. */
    ancestors(name) {
      const chain = [];
      const seen = new Set();
      let e = entities.get(key(name));
      while (e && e.supertypes.length && !seen.has(e.name)) {
        seen.add(e.name);
        const parent = entities.get(key(e.supertypes[0]));
        if (!parent) break;
        chain.push(parent.name);
        e = parent;
      }
      return chain;
    },

    /** Every subtype at any depth, breadth first. */
    descendants(name) {
      const out = [];
      const seen = new Set();
      const queue = [...(entities.get(key(name))?.subtypes ?? [])];
      while (queue.length) {
        const n = queue.shift();
        if (seen.has(n)) continue;
        seen.add(n);
        out.push(n);
        queue.push(...(entities.get(key(n))?.subtypes ?? []));
      }
      return out;
    },

    /**
     * The attributes of an entity with those it inherits, root first: `{name, kind ('explicit', 'derive',
     * 'inverse'), declaredIn, attr, redeclaredIn, derivedIn}`. A redeclaration `SELF\X.Y` in a subtype marks the
     * inherited attribute instead of adding another.
     */
    allAttributes(name) {
      const chain = [...model.ancestors(name)].reverse();
      const own = entities.get(key(name));
      if (!own) return [];
      chain.push(own.name);
      const out = [];
      const find = (redeclares) =>
        out.find((a) => key(a.declaredIn) === key(redeclares.entity) && key(a.name) === key(redeclares.attribute));
      for (const n of chain) {
        const e = entities.get(key(n));
        for (const a of e.explicit) {
          const target = a.redeclares && find(a.redeclares);
          if (target) target.redeclaredIn.push({ entity: e.name, attr: a });
          else out.push({ name: a.name, kind: "explicit", declaredIn: e.name, attr: a, redeclaredIn: [], derivedIn: [] });
        }
        for (const a of e.derive) {
          const target = a.redeclares && find(a.redeclares);
          if (target) target.derivedIn.push({ entity: e.name, attr: a });
          else out.push({ name: a.name, kind: "derive", declaredIn: e.name, attr: a, redeclaredIn: [], derivedIn: [] });
        }
        for (const a of e.inverse) {
          const target = a.redeclares && find(a.redeclares);
          if (target) target.redeclaredIn.push({ entity: e.name, attr: a });
          else out.push({ name: a.name, kind: "inverse", declaredIn: e.name, attr: a, redeclaredIn: [], derivedIn: [] });
        }
      }
      return out;
    },

    /** Who refers to the name: `{from, via, kind}`. */
    usedBy: (name) => usedBy.get(key(name)) ?? [],

    /** The inverse attributes that point back at attribute `attr` of entity `name` or of one of its supertypes. */
    inversesOf(name, attr) {
      const owners = new Set([name, ...model.ancestors(name)].map(key));
      const found = [];
      for (const e of entities.values()) {
        for (const inv of e.inverse) {
          if (owners.has(key(inv.entity)) && key(inv.forAttribute) === key(attr)) found.push({ entity: e.name, name: inv.name });
        }
      }
      return found;
    },

    /** Whether the entity is an objectified relationship (a subtype of IfcRelationship). */
    isRelationship(name) {
      const e = entities.get(key(name));
      return Boolean(e) && key(e.name) !== "IFCRELATIONSHIP" && model.ancestors(e.name).some((a) => key(a) === "IFCRELATIONSHIP");
    },

    /** The declared names that the rules and derivations of an entity or type mention. */
    mentions(name) {
      const item = entities.get(key(name)) ?? types.get(key(name));
      if (!item) return [];
      const ids = new Set();
      const rules = [...(item.where ?? []), ...(item.unique ?? []), ...(item.derive ?? [])];
      for (const r of rules) for (const id of r.ids ?? []) ids.add(id);
      const found = new Set();
      for (const id of ids) {
        const k = key(id);
        if (k === key(item.name)) continue;
        if (entities.has(k) || types.has(k) || algorithms.has(k)) found.add(model.canonical(id));
      }
      return [...found].sort();
    },

    /** The entities without a supertype. */
    roots: () => [...entities.values()].filter((e) => !e.supertypes.length).map((e) => e.name).sort(),

    /** The source text of a declaration. */
    source: (item) => (item && Number.isInteger(item.s) ? text.slice(item.s, item.e) : ""),

    counts: () => ({
      entities: entities.size,
      types: types.size,
      functions: parsed.algorithms.filter((a) => a.kind === "FUNCTION").length,
      rules: parsed.algorithms.filter((a) => a.kind === "RULE").length,
      skipped: parsed.skipped.length,
      errors: parsed.errors.length,
    }),
  };
  return model;
}
