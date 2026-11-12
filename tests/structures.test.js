// This file was generated with the assistance of an AI coding tool.
// SPDX-License-Identifier: AGPL-3.0-or-later

import { test } from "node:test";
import assert from "node:assert/strict";
import { buildModel } from "../src/express/model.js";
import { STRUCTURES, structureById } from "../src/structures.js";
import { structureGraph } from "../src/graph/elements.js";

const SCHEMA = `SCHEMA S;
TYPE IfcLabel = STRING; END_TYPE;
TYPE IfcPlacementSelect = SELECT (IfcPlacementA, IfcPlacementB); END_TYPE;
ENTITY IfcRoot ABSTRACT SUPERTYPE OF (ONEOF (IfcObjectDefinition, IfcRelationship));
  GlobalId : IfcLabel; Name : OPTIONAL IfcLabel;
END_ENTITY;
ENTITY IfcRelationship ABSTRACT SUBTYPE OF (IfcRoot); END_ENTITY;
ENTITY IfcRelDecomposes ABSTRACT SUBTYPE OF (IfcRelationship);
  RelatingObject : IfcObjectDefinition;
  RelatedObjects : SET [1:?] OF IfcObjectDefinition;
END_ENTITY;
ENTITY IfcRelAggregates SUBTYPE OF (IfcRelDecomposes); END_ENTITY;
ENTITY IfcObjectDefinition SUBTYPE OF (IfcRoot);
  Placement : OPTIONAL IfcPlacementSelect;
 INVERSE
  IsDecomposedBy : SET [0:?] OF IfcRelDecomposes FOR RelatingObject;
  Decomposes : SET [0:1] OF IfcRelDecomposes FOR RelatedObjects;
END_ENTITY;
ENTITY IfcSpatialStructureElement SUBTYPE OF (IfcObjectDefinition); END_ENTITY;
ENTITY IfcBuilding SUBTYPE OF (IfcSpatialStructureElement); END_ENTITY;
ENTITY IfcPlacementA; END_ENTITY;
ENTITY IfcPlacementB; END_ENTITY;
END_SCHEMA;`;

const model = buildModel(SCHEMA);
const edges = (els) => els.filter((e) => e.group === "edges").map((e) => `${e.data.kind}:${e.data.source}>${e.data.target}${e.data.label ? `[${e.data.label}]` : ""}`).sort();

test("every structure has an id, names in two languages, a description and names to draw", () => {
  assert.equal(STRUCTURES.length, 50);
  assert.equal(new Set(STRUCTURES.map((s) => s.id)).size, 50);
  for (const s of STRUCTURES) {
    assert.match(s.id, /^[a-z0-9-]+$/);
    assert.ok(s.en && s.sv && s.about && s.names.length, s.id);
    for (const n of s.names) assert.match(n, /^Ifc[A-Za-z0-9]+$/, `${s.id}: ${n}`);
  }
  assert.equal(structureById("spatial-structure").sv, "Spatial struktur");
  assert.equal(structureById("nothing"), null);
});

test("a relationship is drawn with its attributes, the classes they point at and the inverse attributes", () => {
  const g = structureGraph(model, { names: ["IfcRelAggregates", "IfcProject"], subtypes: [] });
  assert.deepEqual(g.present, ["IfcRelAggregates"]);
  assert.deepEqual(g.missing, ["IfcProject"]);
  const rel = g.elements.find((e) => e.data.id === "IfcRelAggregates");
  assert.equal(rel.data.rel, true);
  assert.deepEqual(edges(g.elements), [
    "relates:IfcRelAggregates>IfcObjectDefinition[RelatedObjects SET [1:?] · Decomposes]",
    "relates:IfcRelAggregates>IfcObjectDefinition[RelatingObject · IsDecomposedBy]",
  ]);
  assert.equal(model.isRelationship("IfcRelationship"), false);
  assert.equal(model.isRelationship("IfcObjectDefinition"), false);
});

test("a SELECT shown is joined to its shown members, and a subtype line says which classes it skips", () => {
  const g = structureGraph(model, { names: ["IfcPlacementSelect", "IfcPlacementB", "IfcRoot", "IfcBuilding"] });
  assert.deepEqual(edges(g.elements), [
    "select:IfcPlacementSelect>IfcPlacementB",
    "subtype:IfcRoot>IfcBuilding[via IfcSpatialStructureElement, IfcObjectDefinition]",
  ]);
});

test("subtypes are added to the depth asked for, with subtype lines and attributes through a SELECT", () => {
  const g = structureGraph(model, { names: ["IfcObjectDefinition", "IfcPlacementA"], subtypes: [{ of: "IfcObjectDefinition", depth: 2 }] });
  const ids = g.elements.filter((e) => e.group === "nodes").map((e) => e.data.id).sort();
  assert.deepEqual(ids, ["IfcBuilding", "IfcObjectDefinition", "IfcPlacementA", "IfcSpatialStructureElement"]);
  assert.deepEqual(edges(g.elements), [
    "attribute:IfcObjectDefinition>IfcPlacementA[Placement]",
    "subtype:IfcObjectDefinition>IfcSpatialStructureElement",
    "subtype:IfcSpatialStructureElement>IfcBuilding",
  ]);
});
