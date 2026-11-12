// This file was generated with the assistance of an AI coding tool.
// SPDX-License-Identifier: AGPL-3.0-or-later

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { tokenize } from "../src/express/lexer.js";
import { parseExpress } from "../src/express/parser.js";
import { buildModel, typeText, aggregateText } from "../src/express/model.js";

const MINI = readFileSync(new URL("./fixtures/mini.exp", import.meta.url), "utf8");

test("the lexer skips nested remarks and tail remarks and keeps strings whole", () => {
  const tokens = tokenize("(* a (* b *) c *) X -- tail ; Y\n 'it''s; fine' := <> 1.5E-3 \\");
  assert.deepEqual(
    tokens.map((t) => t.v),
    ["X", "'it''s; fine'", ":=", "<>", "1.5E-3", "\\"],
  );
  assert.throws(() => tokenize("(* open"), /unterminated remark/);
  assert.throws(() => tokenize("'open"), /unterminated string/);
});

test("the parser reads types, entities and algorithms, and recovers from a broken entity", () => {
  const p = parseExpress(MINI);
  assert.equal(p.schema, "MINI");
  assert.deepEqual(p.types.map((t) => t.name), ["IfcLabel", "IfcGloballyUniqueId", "IfcPositiveLengthMeasure", "IfcLengthMeasure", "IfcWallTypeEnum", "IfcValue", "IfcLineIndex"]);
  assert.deepEqual(p.entities.map((e) => e.name), ["IfcRoot", "IfcObject", "IfcWall", "IfcRelSpaceBoundary", "IfcAfterBroken"]);
  assert.deepEqual(p.algorithms.map((a) => `${a.kind} ${a.name}`), ["FUNCTION IfcCheck", "RULE IfcSingleRoot"]);
  assert.equal(p.errors.length, 1);
  assert.match(MINI.slice(p.errors[0].at, p.errors[0].at + 4), /Oops/);
});

test("type expressions keep widths, bounds and modifiers", () => {
  const m = buildModel(MINI);
  assert.equal(typeText(m.type("IfcGloballyUniqueId").underlying), "STRING(22) FIXED");
  assert.equal(typeText(m.type("IfcLineIndex").underlying), "LIST [2:?] OF INTEGER");
  const points = m.entity("IfcObject").explicit[0].type;
  assert.equal(typeText(points), "LIST [1:?] OF UNIQUE LIST [2:3] OF IfcLengthMeasure");
  assert.equal(aggregateText(points), "LIST [1:?] OF LIST [2:3]");
  assert.deepEqual(m.type("IfcWallTypeEnum").underlying.items, ["MOVABLE", "PARAPET", "USERDEFINED"]);
  assert.equal(m.type("IfcValue").kind, "select");
  assert.equal(m.type("IfcPositiveLengthMeasure").where[0].label, "WR1");
});

test("entities have their headers, sections and rules", () => {
  const m = buildModel(MINI);
  const root = m.entity("ifcroot");
  assert.equal(root.abstract, true);
  assert.match(root.supertypeOf, /^ONEOF/);
  assert.equal(root.unique[0].label, "UR1");
  const wall = m.entity("IfcWall");
  assert.deepEqual(wall.supertypes, ["IfcObject"]);
  assert.equal(wall.explicit[0].optional, true);
  assert.deepEqual(wall.derive[0].redeclares, { entity: "IfcRoot", attribute: "Name" });
  assert.equal(wall.derive[1].expr, "Height * 2.0");
  assert.equal(wall.where[1].expr, "Name <> 'a;b''c'");
  const inv = m.entity("IfcObject").inverse[0];
  assert.deepEqual([inv.name, inv.agg, inv.lower, inv.upper, inv.entity, inv.forAttribute], ["BoundedBy", "SET", "0", "?", "IfcRelSpaceBoundary", "RelatingSpace"]);
  assert.match(m.source(wall), /^ENTITY IfcWall[\s\S]*END_ENTITY;$/);
});

test("the model knows inheritance, inherited attributes, references and mentions", () => {
  const m = buildModel(MINI);
  assert.deepEqual(m.ancestors("IfcWall"), ["IfcObject", "IfcRoot"]);
  assert.deepEqual(m.descendants("IfcRoot"), ["IfcObject", "IfcRelSpaceBoundary", "IfcWall"]);
  assert.deepEqual(m.entity("IfcRoot").subtypes, ["IfcObject", "IfcRelSpaceBoundary"]);
  const attrs = m.allAttributes("IfcWall");
  assert.deepEqual(attrs.map((a) => `${a.declaredIn}.${a.name}:${a.kind}`), [
    "IfcRoot.GlobalId:explicit",
    "IfcRoot.Name:explicit",
    "IfcObject.Points:explicit",
    "IfcObject.BoundedBy:inverse",
    "IfcWall.PredefinedType:explicit",
    "IfcWall.Height:explicit",
    "IfcWall.Area:derive",
  ]);
  assert.deepEqual(attrs[1].derivedIn.map((d) => d.entity), ["IfcWall"]);
  assert.deepEqual(m.usedBy("IfcRelSpaceBoundary").map((r) => `${r.from}.${r.via}:${r.kind}`), ["IfcObject.BoundedBy:inverse"]);
  assert.deepEqual(m.usedBy("IfcLabel").map((r) => r.from).sort(), ["IfcAfterBroken", "IfcRoot", "IfcValue", "IfcWall"]);
  assert.deepEqual(m.mentions("IfcWall"), ["IfcCheck", "IfcWallTypeEnum"]);
  assert.equal(m.kindOf("REAL"), "simple");
  assert.equal(m.kindOf("IfcCheck"), "function");
  assert.equal(m.kindOf("Nothing"), null);
  assert.deepEqual(m.counts(), { entities: 5, types: 7, functions: 1, rules: 1, skipped: 0, errors: 1 });
  assert.deepEqual(m.roots(), ["IfcAfterBroken", "IfcRoot"]);
});
