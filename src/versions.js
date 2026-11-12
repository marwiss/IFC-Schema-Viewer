// This file was generated with the assistance of an AI coding tool.
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * An entity or a type across the EXPRESS versions (IFC2X3 → IFC4 → IFC4X3), matched by name. A renamed entity
 * (IfcBuildingElement became IfcBuiltElement) is not followed: it is absent in one version and new in the next.
 */

import { typeText } from "./express/model.js";

function attributeSignature(a) {
  if (a.kind === "inverse") {
    const agg = a.attr.agg ? `${a.attr.agg} [${a.attr.lower}:${a.attr.upper}] OF ` : "";
    return `INVERSE ${agg}${a.attr.entity} FOR ${a.attr.forAttribute}`;
  }
  const type = typeText(a.attr.type);
  if (a.kind === "derive") return `DERIVE ${type}`;
  return `${a.attr.optional ? "OPTIONAL " : ""}${type}`;
}

function entityVersion(model, name) {
  const e = model.entity(name);
  if (!e) return null;
  const attributes = new Map();
  for (const a of model.allAttributes(e.name)) {
    attributes.set(a.name, { signature: attributeSignature(a), declaredIn: a.declaredIn, derived: a.derivedIn.length > 0 });
  }
  return { kind: "entity", name: e.name, abstract: e.abstract, supertype: e.supertypes[0] ?? null, subtypes: e.subtypes, attributes };
}

function typeVersion(model, name) {
  const t = model.type(name);
  if (!t) return null;
  const items = t.kind === "enum" || t.kind === "select" ? t.underlying.items : null;
  return { kind: t.kind, name: t.name, underlying: typeText(t.underlying), items };
}

/** What changed from `before` to `after` (either may be null, meaning absent). */
export function changes(before, after) {
  if (!before && !after) return null;
  if (!before) return { status: "new" };
  if (!after) return { status: "absent" };
  const out = { status: "same", notes: [] };
  if (before.kind !== after.kind) out.notes.push(`was a ${before.kind}, now a ${after.kind}`);
  if (before.kind === "entity" && after.kind === "entity") {
    if (before.supertype !== after.supertype) out.notes.push(`supertype ${before.supertype ?? "none"} → ${after.supertype ?? "none"}`);
    if (before.abstract !== after.abstract) out.notes.push(after.abstract ? "now ABSTRACT" : "no longer ABSTRACT");
    out.added = [...after.attributes.keys()].filter((k) => !before.attributes.has(k));
    out.removed = [...before.attributes.keys()].filter((k) => !after.attributes.has(k));
    out.changed = [...after.attributes.keys()]
      .filter((k) => before.attributes.has(k) && before.attributes.get(k).signature !== after.attributes.get(k).signature)
      .map((k) => ({ name: k, from: before.attributes.get(k).signature, to: after.attributes.get(k).signature }));
  } else if (before.items && after.items) {
    out.added = after.items.filter((v) => !before.items.includes(v));
    out.removed = before.items.filter((v) => !after.items.includes(v));
    out.changed = [];
  } else {
    out.added = [];
    out.removed = [];
    out.changed = before.underlying !== after.underlying ? [{ name: "underlying type", from: before.underlying, to: after.underlying }] : [];
  }
  if (out.notes.length || out.added.length || out.removed.length || out.changed.length) out.status = "changed";
  return out;
}

/**
 * A name in each of `versions` (`[{id, label, model}]`, oldest first): what it is there, and what changed from the
 * version before.
 */
export function acrossVersions(name, versions) {
  let previous = null;
  return versions.map(({ id, label, model }, i) => {
    const kind = model.kindOf(name);
    const here = kind === "entity" ? entityVersion(model, name) : kind && kind !== "simple" ? typeVersion(model, name) : null;
    const row = { id, label, here, change: i === 0 ? null : changes(previous, here) };
    previous = here;
    return row;
  });
}

/** The entities and types added and removed between two schemas. */
export function schemaChanges(before, after) {
  const names = (m) => new Set([...m.entities.values(), ...m.types.values()].map((d) => d.name.toUpperCase()));
  const a = names(before);
  const b = names(after);
  const pick = (m, set, other) =>
    [...set].filter((n) => !other.has(n)).map((n) => m.canonical(n)).sort();
  const addedNames = pick(after, b, a);
  const removedNames = pick(before, a, b);
  return {
    addedEntities: addedNames.filter((n) => after.kindOf(n) === "entity"),
    addedTypes: addedNames.filter((n) => after.kindOf(n) !== "entity"),
    removedEntities: removedNames.filter((n) => before.kindOf(n) === "entity"),
    removedTypes: removedNames.filter((n) => before.kindOf(n) !== "entity"),
  };
}
