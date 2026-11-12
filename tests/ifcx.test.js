// This file was generated with the assistance of an AI coding tool.
// SPDX-License-Identifier: AGPL-3.0-or-later

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readIfcx, buildIfcxModel, namespaceOf, localName, specText, specRows } from "../src/ifcx/schema.js";
import { buildModel } from "../src/express/model.js";
import { compareEntity, componentMatches } from "../src/compare.js";
import { parseJson } from "../src/load.js";

const MINI_IFCX = readFileSync(new URL("./fixtures/mini.ifcx", import.meta.url), "utf8");
const MINI_EXP = readFileSync(new URL("./fixtures/mini.exp", import.meta.url), "utf8");
const read = (text, label) => readIfcx(text, { id: label, label });

test("keys split into namespace and local name", () => {
  assert.equal(namespaceOf("bsi::ifc::prop::Name"), "bsi::ifc::prop");
  assert.equal(localName("bsi::ifc::prop::Name"), "Name");
  assert.equal(namespaceOf("customdata"), "");
  assert.equal(localName("customdata"), "customdata");
});

test("a file is read leniently but must be a JSON object within the depth limit", () => {
  const f = read(MINI_IFCX, "mini");
  assert.equal(f.imports.length, 1);
  assert.equal(f.data.length, 4);
  assert.throws(() => read("[1, 2]", "array"), /not a JSON object/);
  assert.throws(() => read("{", "broken"), /not IFCX/);
  assert.throws(() => parseJson(`${"[".repeat(70)}${"]".repeat(70)}`, 64), /deeper than 64/);
});

test("the model groups components per namespace, composes data and indexes class codes", () => {
  const m = buildIfcxModel([read(MINI_IFCX, "mini")]);
  assert.deepEqual([...m.components.keys()].sort(), ["bsi::ifc::class", "bsi::ifc::prop::Height", "bsi::ifc::prop::Name", "bsi::ifc::wall", "customdata"]);
  assert.deepEqual(m.invalid, [{ key: "broken", source: "mini" }]);
  assert.deepEqual(m.namespaces.get("bsi").children, ["bsi::ifc"]);
  assert.deepEqual(m.namespaces.get("bsi::ifc").children, ["bsi::ifc::prop"]);
  assert.deepEqual(m.namespaces.get("bsi::ifc").components, ["bsi::ifc::class", "bsi::ifc::wall"]);
  assert.deepEqual(m.namespaces.get("").components, ["customdata"]);
  assert.equal(m.paths.get("w1").attributes.customdata, undefined);
  assert.equal(m.paths.get("s1").children.Wall, "w1");
  const wall = m.classIndex.get("IfcWall");
  assert.deepEqual(wall.paths, ["w1", "w2"]);
  assert.equal(wall.components.get("bsi::ifc::prop::Height"), 1);
});

test("a later file wins and a conflict is reported", () => {
  const other = JSON.stringify({ schemas: { "bsi::ifc::prop::Name": { value: { dataType: "Integer" } } } });
  const m = buildIfcxModel([read(MINI_IFCX, "mini"), read(other, "other")]);
  assert.equal(m.component("bsi::ifc::prop::Name").spec.dataType, "Integer");
  assert.deepEqual(m.conflicts, [{ key: "bsi::ifc::prop::Name", sources: ["mini", "other"] }]);
});

test("specs are described in one line and as rows", () => {
  const m = buildIfcxModel([read(MINI_IFCX, "mini")]);
  assert.equal(specText(m.component("bsi::ifc::class").spec), "Object {code: String, uri: String}");
  assert.equal(specText(m.component("bsi::ifc::prop::Height").spec), "Real (Length)");
  const rows = specRows(m.component("bsi::ifc::wall").spec, "wall");
  assert.deepEqual(rows.map((r) => `${r.depth}:${r.name}:${r.dataType}${r.optional ? "?" : ""}`), ["0:wall:Object", "1:Height:Real", "1:PredefinedType:Enum", "1:Extra:Array?", "2:[ ]:Integer"]);
  assert.deepEqual(rows[2].options, ["MOVABLE", "SOLIDWALL"]);
});

test("an EXPRESS entity is compared with IFC5 by class code and by name", () => {
  const express = buildModel(MINI_EXP);
  const ifc5 = buildIfcxModel([read(MINI_IFCX, "mini")]);
  const c = compareEntity("IfcWall", express, ifc5, express);
  assert.equal(c.code, "IfcWall");
  assert.equal(c.uri, "https://identifier.buildingsmart.org/uri/buildingsmart/ifc/4.3/class/IfcWall");
  assert.equal(c.inClassSchema, true);
  assert.deepEqual(c.attributes.filter((a) => a.components.length).map((a) => `${a.name}→${a.components}`), ["Name→bsi::ifc::prop::Name", "Height→bsi::ifc::prop::Height"]);
  assert.equal(c.named.length, 1);
  const predefined = c.named[0].members.find((m) => m.member === "PredefinedType");
  assert.deepEqual(predefined.enums, { type: "IfcWallTypeEnum", both: ["MOVABLE"], onlyExpress: ["PARAPET", "USERDEFINED"], onlyIfc5: ["SOLIDWALL"] });
  assert.equal(c.named[0].members.find((m) => m.member === "Extra").attribute, null);
  assert.equal(c.usage.paths, 2);
  assert.equal(compareEntity("IfcNothing", express, ifc5, null), null);
  assert.equal(compareEntity("IfcRoot", express, ifc5, null).inClassSchema, null);
});

test("a component finds the entities that declare an attribute of its name", () => {
  const express = buildModel(MINI_EXP);
  const m = componentMatches("bsi::ifc::prop::Name", express);
  assert.deepEqual(m.declaring, [{ entity: "IfcRoot", kind: "explicit" }]);
  assert.equal(componentMatches("bsi::ifc::wall", express).namedEntity, "IfcWall");
});
