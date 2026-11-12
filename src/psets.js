// This file was generated with the assistance of an AI coding tool.
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * Property and quantity set templates (IfcPropertySetTemplate) from IfcOpenShell's `Pset_IFC*.ifc`: each set with its
 * description, template type, the entities it applies to (ApplicableEntity, such as "IfcWall,IfcWallType",
 * "IfcWall/SOLIDWALL" or, in the IFC2X3 file, "IFCHVACDOMAIN/IfcFanType") and its properties with their measure types
 * and enumerations. An entity has the sets that apply to it and, inherited, those that apply to its supertypes.
 */

import { parseStep } from "./step.js";

const key = (s) => String(s).toUpperCase();
const text = (v) => (typeof v === "string" ? v : "");

/** The entities in an ApplicableEntity string, resolved against the EXPRESS model: `[{entity, predefined, raw}]`. */
export function applicableEntities(value, model) {
  const out = [];
  for (const raw of text(value).split(",").map((s) => s.trim()).filter(Boolean)) {
    const [first, second] = raw.split("/").map((s) => s.trim());
    if (model.entity(first)) out.push({ entity: model.entity(first).name, predefined: second ?? null, raw });
    else if (second && model.entity(second)) out.push({ entity: model.entity(second).name, predefined: null, raw });
    else out.push({ entity: null, predefined: null, raw });
  }
  return out;
}

function propertyOf(instances, ref, depth = 0) {
  const p = instances.get(ref?.ref);
  if (!p || depth > 4) return null;
  const [, , name, description] = p.args;
  if (p.type === "IFCSIMPLEPROPERTYTEMPLATE") {
    const [, , , , templateType, primary, secondary, enumerators] = p.args;
    const e = enumerators?.ref ? instances.get(enumerators.ref) : null;
    const values = e?.type === "IFCPROPERTYENUMERATION" && Array.isArray(e.args[1]) ? e.args[1].map((v) => String(v?.value ?? v)) : null;
    return {
      name: text(name),
      description: text(description),
      kind: templateType?.enum ?? null,
      measure: text(primary) || null,
      secondary: text(secondary) || null,
      enumeration: values ? { name: text(e.args[0]), values } : null,
    };
  }
  if (p.type === "IFCCOMPLEXPROPERTYTEMPLATE") {
    const [, , , , usage, templateType, parts] = p.args;
    return {
      name: text(name),
      description: text(description),
      kind: templateType?.enum ?? "COMPLEX",
      measure: text(usage) || null,
      parts: Array.isArray(parts) ? parts.map((r) => propertyOf(instances, r, depth + 1)).filter(Boolean) : [],
    };
  }
  return null;
}

/** Read a template file against the EXPRESS model of the same version. */
export function readPsetTemplates(stepText, model) {
  const instances = parseStep(stepText);
  const sets = new Map();
  const byEntity = new Map();
  for (const inst of instances.values()) {
    if (inst.type !== "IFCPROPERTYSETTEMPLATE") continue;
    const [, , name, description, templateType, applicable, templates] = inst.args;
    const set = {
      name: text(name),
      description: text(description),
      templateType: templateType?.enum ?? null,
      applicable: applicableEntities(applicable, model),
      properties: Array.isArray(templates) ? templates.map((r) => propertyOf(instances, r)).filter(Boolean) : [],
    };
    if (!set.name) continue;
    sets.set(key(set.name), set);
    for (const a of set.applicable) {
      if (!a.entity) continue;
      if (!byEntity.has(key(a.entity))) byEntity.set(key(a.entity), []);
      byEntity.get(key(a.entity)).push({ set, predefined: a.predefined });
    }
  }
  return {
    sets,
    set: (name) => sets.get(key(name)) ?? null,
    /** The sets for an entity: `own` apply to it, `inherited` to a supertype (`from`). */
    forEntity(name) {
      const own = byEntity.get(key(name)) ?? [];
      const inherited = [];
      for (const a of model.ancestors(name)) for (const s of byEntity.get(key(a)) ?? []) inherited.push({ ...s, from: a });
      return { own, inherited };
    },
  };
}

/** Whether a set is a quantity set (Qto_…). */
export const isQuantitySet = (set) => /^QTO_/i.test(set.templateType ?? "") || /^Qto_/.test(set.name);
