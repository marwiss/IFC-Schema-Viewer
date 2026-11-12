// This file was generated with the assistance of an AI coding tool.
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * IFC5 (IFCX, `ifcx_alpha`) read as JSON. A file has `header`, `imports`, `schemas` and `data`. `schemas` maps a key
 * such as `bsi::ifc::prop::IsExternal` to `{value: spec}`, where a spec has a `dataType` (String, Real, Integer,
 * Boolean, DateTime, Enum, Array, Object, Reference). The namespace is the key without its last `::` part. There is no
 * inheritance between keys. The data of the files that have it is composed per path (a later file wins, `null` removes
 * a value) and indexed by the code of `bsi::ifc::class`.
 */

import { parseJson } from "../load.js";

export const CLASS_KEY = "bsi::ifc::class";

const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

/** The namespace of a key: `bsi::ifc::prop` for `bsi::ifc::prop::Name`, "" for a key without one. */
export function namespaceOf(key) {
  const i = key.lastIndexOf("::");
  return i < 0 ? "" : key.slice(0, i);
}

/** The last part of a key: `Name` for `bsi::ifc::prop::Name`. */
export function localName(key) {
  const i = key.lastIndexOf("::");
  return i < 0 ? key : key.slice(i + 2);
}

/** Read one IFCX file; `source` is `{id, label, url?}`. */
export function readIfcx(text, source, maxDepth = 64) {
  let doc;
  try {
    doc = parseJson(text, maxDepth);
  } catch (error) {
    throw new Error(`${source.label} is not IFCX: ${error.message}`);
  }
  if (!isObject(doc)) throw new Error(`${source.label} is not IFCX: not a JSON object`);
  return {
    source,
    header: isObject(doc.header) ? doc.header : {},
    imports: Array.isArray(doc.imports) ? doc.imports.filter((i) => isObject(i) && typeof i.uri === "string") : [],
    schemas: isObject(doc.schemas) ? doc.schemas : {},
    data: Array.isArray(doc.data) ? doc.data.filter((d) => isObject(d) && typeof d.path === "string") : [],
  };
}

/** A spec in one line: `Object {code: String, uri: String}`, `Array of Real`, `Enum (A, B)`, `Real (Length)`. */
export function specText(spec, depth = 0) {
  if (!isObject(spec)) return "?";
  const t = String(spec.dataType ?? "?");
  if (depth > 3) return t;
  if (t === "Array") return `Array of ${specText(spec.arrayRestrictions?.value, depth + 1)}`;
  if (t === "Enum") return `Enum (${(spec.enumRestrictions?.options ?? []).map(String).join(", ")})`;
  if (t === "Object") {
    const values = spec.objectRestrictions?.values;
    if (!isObject(values)) return "Object";
    const parts = Object.entries(values).map(([k, v]) => `${k}${v?.optional ? "?" : ""}: ${specText(v, depth + 1)}`);
    return `Object {${parts.join(", ")}}`;
  }
  return spec.quantityKind ? `${t} (${spec.quantityKind})` : t;
}

/** A spec as rows for a tree: `{path, name, depth, dataType, optional, quantityKind, options}`. */
export function specRows(spec, name = "value", depth = 0, path = name, rows = []) {
  if (!isObject(spec) || depth > 8) return rows;
  const row = {
    path,
    name,
    depth,
    dataType: String(spec.dataType ?? "?"),
    optional: Boolean(spec.optional),
    quantityKind: spec.quantityKind ? String(spec.quantityKind) : null,
    options: Array.isArray(spec.enumRestrictions?.options) ? spec.enumRestrictions.options.map(String) : null,
  };
  rows.push(row);
  if (row.dataType === "Object" && isObject(spec.objectRestrictions?.values)) {
    for (const [k, v] of Object.entries(spec.objectRestrictions.values)) specRows(v, k, depth + 1, `${path}.${k}`, rows);
  } else if (row.dataType === "Array") {
    specRows(spec.arrayRestrictions?.value, "[ ]", depth + 1, `${path}[]`, rows);
  }
  return rows;
}

/** The members of an Object spec, by name. */
export function objectMembers(spec) {
  return isObject(spec?.objectRestrictions?.values) ? spec.objectRestrictions.values : {};
}

/** Build the IFC5 model of several read files, the later over the earlier. */
export function buildIfcxModel(files, meta = {}) {
  const components = new Map();
  const conflicts = [];
  const invalid = [];
  for (const file of files) {
    for (const [key, value] of Object.entries(file.schemas)) {
      if (!isObject(value) || !isObject(value.value)) {
        invalid.push({ key, source: file.source.label });
        continue;
      }
      const before = components.get(key);
      if (before && JSON.stringify(before.spec) !== JSON.stringify(value.value)) {
        conflicts.push({ key, sources: [before.source.label, file.source.label] });
      }
      components.set(key, {
        key,
        namespace: namespaceOf(key),
        name: localName(key),
        spec: value.value,
        source: file.source,
        sources: [...(before?.sources ?? []), file.source],
      });
    }
  }

  // Namespaces and their parents: bsi ⊃ bsi::ifc ⊃ bsi::ifc::prop.
  const namespaces = new Map();
  const ensure = (ns) => {
    if (namespaces.has(ns)) return namespaces.get(ns);
    const parent = ns.includes("::") ? namespaceOf(ns) : ns === "" ? null : "";
    const entry = { name: ns, parent, components: [], children: [] };
    namespaces.set(ns, entry);
    if (parent !== null) {
      const p = ensure(parent);
      if (!p.children.includes(ns)) p.children.push(ns);
    }
    return entry;
  };
  for (const c of components.values()) ensure(c.namespace).components.push(c.key);
  for (const ns of namespaces.values()) {
    ns.components.sort();
    ns.children.sort();
  }

  // The data, composed per path, and the paths of each class code.
  const paths = new Map();
  for (const file of files) {
    for (const entry of file.data) {
      const p = paths.get(entry.path) ?? { path: entry.path, attributes: {}, children: {}, inherits: {}, files: [] };
      for (const part of ["attributes", "children", "inherits"]) {
        if (!isObject(entry[part])) continue;
        for (const [k, v] of Object.entries(entry[part])) {
          if (v === null) delete p[part][k];
          else p[part][k] = v;
        }
      }
      if (!p.files.includes(file.source.label)) p.files.push(file.source.label);
      paths.set(entry.path, p);
    }
  }
  const classIndex = new Map();
  for (const p of paths.values()) {
    const value = p.attributes[CLASS_KEY];
    if (!isObject(value) || typeof value.code !== "string") continue;
    const entry = classIndex.get(value.code) ?? { code: value.code, uris: [], paths: [], components: new Map() };
    if (typeof value.uri === "string" && !entry.uris.includes(value.uri)) entry.uris.push(value.uri);
    entry.paths.push(p.path);
    for (const k of Object.keys(p.attributes)) entry.components.set(k, (entry.components.get(k) ?? 0) + 1);
    classIndex.set(value.code, entry);
  }

  return {
    format: "ifcx",
    id: meta.id ?? "IFC5",
    label: meta.label ?? "IFC5",
    files,
    components,
    namespaces,
    conflicts,
    invalid,
    paths,
    classIndex,
    component: (key) => components.get(key) ?? null,
    /** The components whose last part is `name`, in any namespace (case-sensitive unless `loose`). */
    byLocalName(name, loose = false) {
      const n = loose ? name.toLowerCase() : name;
      return [...components.values()].filter((c) => (loose ? c.name.toLowerCase() : c.name) === n);
    },
    counts: () => ({ components: components.size, namespaces: namespaces.size, paths: paths.size, classes: classIndex.size }),
  };
}
