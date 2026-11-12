// This file was generated with the assistance of an AI coding tool.
// SPDX-License-Identifier: AGPL-3.0-or-later

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildModel } from "../src/express/model.js";
import { acrossVersions, schemaChanges, changes } from "../src/versions.js";

const MINI = readFileSync(new URL("./fixtures/mini.exp", import.meta.url), "utf8");
// A "later version" of the mini schema: IfcWall gains an attribute, Height turns OPTIONAL, the enumeration gains a
// value, IfcObject is renamed and IfcValue is gone.
const LATER = MINI.replace("PredefinedType : OPTIONAL IfcWallTypeEnum;", "PredefinedType : OPTIONAL IfcWallTypeEnum;\n  Thickness : OPTIONAL IfcLengthMeasure;")
  .replace("Height : IfcPositiveLengthMeasure;", "Height : OPTIONAL IfcPositiveLengthMeasure;")
  .replace(",PARAPET", ",PARAPET\n  ,SOLIDWALL")
  .replace(/TYPE IfcValue = SELECT[\s\S]*?END_TYPE;/, "");

const v1 = buildModel(MINI, { id: "V1" });
const v2 = buildModel(LATER, { id: "V2" });
const versions = [
  { id: "V1", label: "Version 1", model: v1 },
  { id: "V2", label: "Version 2", model: v2 },
];

test("an entity's attributes are compared from one version to the next", () => {
  const [first, second] = acrossVersions("IfcWall", versions);
  assert.equal(first.change, null);
  assert.equal(first.here.supertype, "IfcObject");
  assert.equal(second.change.status, "changed");
  assert.deepEqual(second.change.added, ["Thickness"]);
  assert.deepEqual(second.change.removed, []);
  assert.deepEqual(second.change.changed, [{ name: "Height", from: "IfcPositiveLengthMeasure", to: "OPTIONAL IfcPositiveLengthMeasure" }]);
});

test("enumerations compare their values, and a gone type is reported", () => {
  const [, enumRow] = acrossVersions("IfcWallTypeEnum", versions);
  assert.deepEqual(enumRow.change.added, ["SOLIDWALL"]);
  const [kept, gone] = acrossVersions("IfcValue", versions);
  assert.equal(kept.here.kind, "select");
  assert.equal(gone.here, null);
  assert.equal(gone.change.status, "absent");
  assert.equal(acrossVersions("IfcRoot", versions)[1].change.status, "same");
  assert.equal(changes(null, null), null);
  assert.equal(changes(null, { kind: "entity" }).status, "new");
});

test("schemas compare the names they declare", () => {
  const d = schemaChanges(v1, v2);
  assert.deepEqual(d, { addedEntities: [], addedTypes: [], removedEntities: [], removedTypes: ["IfcValue"] });
  assert.deepEqual(schemaChanges(v2, v1).addedTypes, ["IfcValue"]);
});
