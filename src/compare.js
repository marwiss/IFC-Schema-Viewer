// This file was generated with the assistance of an AI coding tool.
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * EXPRESS ↔ IFC5. IFC5 names the class of a path with `bsi::ifc::class` `{code, uri}`, where the code is an IFC 4.3
 * class name; the schemas say nothing more about how IFC4 maps to IFC5, so everything else here is matched by name and
 * is an interpretation: an attribute against components with the same last part (`Name` → `bsi::ifc::prop::Name`), the
 * entity against a component named like it without "Ifc" (`IfcAlignmentHorizontalSegment` →
 * `bsi::ifc::alignmenthorizontalsegment`), its attributes against that component's members, and EXPRESS enumerations
 * against IFC5 Enum options.
 */

import { CLASS_KEY, localName, objectMembers } from "./ifcx/schema.js";
import { bsddClassUri } from "./docs.js";

const bare = (name) => name.replace(/^Ifc/i, "").toLowerCase();

function enumComparison(express, attr, spec) {
  if (!attr || spec?.dataType !== "Enum") return null;
  const type = attr.attr.type?.kind === "named" ? express.type(attr.attr.type.name) : null;
  if (!type || type.kind !== "enum") return null;
  const ours = type.underlying.items.map((v) => v.toUpperCase());
  const theirs = (spec.enumRestrictions?.options ?? []).map((v) => String(v).toUpperCase());
  return {
    type: type.name,
    both: ours.filter((v) => theirs.includes(v)),
    onlyExpress: ours.filter((v) => !theirs.includes(v)),
    onlyIfc5: theirs.filter((v) => !ours.includes(v)),
  };
}

/**
 * Compare an EXPRESS entity with IFC5. `classSchema` is the model of IFC4X3 ADD2, to say whether the code names a class
 * there (null when it is not loaded).
 */
export function compareEntity(name, express, ifc5, classSchema) {
  const entity = express.entity(name);
  if (!entity) return null;
  const code = entity.name;
  const attributes = express.allAttributes(code).map((a) => ({
    ...a,
    components: ifc5 ? ifc5.byLocalName(a.name).map((c) => c.key) : [],
  }));
  const named = ifc5
    ? [...ifc5.components.values()]
        .filter((c) => c.name.toLowerCase() === bare(code))
        .map((c) => ({
          key: c.key,
          members: Object.entries(objectMembers(c.spec)).map(([member, spec]) => {
            const attr = attributes.find((a) => a.name.toLowerCase() === member.toLowerCase()) ?? null;
            return {
              member,
              spec,
              attribute: attr?.name ?? null,
              declaredIn: attr?.declaredIn ?? null,
              enums: enumComparison(express, attr, spec),
            };
          }),
        }))
    : [];
  const usage = ifc5?.classIndex.get(code) ?? null;
  return {
    code,
    uri: bsddClassUri(code),
    classComponent: ifc5?.component(CLASS_KEY) ? CLASS_KEY : null,
    inClassSchema: classSchema ? Boolean(classSchema.entity(code)) : null,
    classSchemaName: classSchema ? classSchema.entity(code)?.name ?? null : null,
    attributes,
    named,
    usage: usage
      ? {
          paths: usage.paths.length,
          uris: usage.uris,
          components: [...usage.components.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
        }
      : null,
  };
}

/** The EXPRESS entities that declare an attribute named like the component, and an entity named like it. */
export function componentMatches(key, express) {
  const local = localName(key);
  const declaring = [];
  for (const e of express.entities.values()) {
    for (const a of [...e.explicit, ...e.derive, ...e.inverse]) {
      if (a.name === local && !a.redeclares) declaring.push({ entity: e.name, kind: e.explicit.includes(a) ? "explicit" : e.derive.includes(a) ? "derive" : "inverse" });
    }
  }
  declaring.sort((a, b) => a.entity.localeCompare(b.entity));
  const namedEntity = [...express.entities.values()].find((e) => bare(e.name) === local.toLowerCase())?.name ?? null;
  return { local, declaring, namedEntity };
}
