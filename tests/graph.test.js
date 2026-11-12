// This file was generated with the assistance of an AI coding tool.
// SPDX-License-Identifier: AGPL-3.0-or-later

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildModel } from "../src/express/model.js";
import { readIfcx, buildIfcxModel } from "../src/ifcx/schema.js";
import { compareEntity } from "../src/compare.js";
import { RELATIONS, neighbourhood, expansion, inheritanceTree, ifcxOverview, ifcxComponent, comparisonGraph } from "../src/graph/elements.js";

const express = buildModel(readFileSync(new URL("./fixtures/mini.exp", import.meta.url), "utf8"));
const ifc5 = buildIfcxModel([readIfcx(readFileSync(new URL("./fixtures/mini.ifcx", import.meta.url), "utf8"), { id: "mini", label: "mini" })]);
const nodes = (els) => els.filter((e) => e.group === "nodes").map((e) => e.data.id).sort();
const edges = (els) => els.filter((e) => e.group === "edges").map((e) => `${e.data.kind}:${e.data.source}>${e.data.target}${e.data.label ? `[${e.data.label}]` : ""}`).sort();

test("the neighbourhood of an entity has its supertype, subtypes, attributes, inverses and derivations", () => {
  const els = neighbourhood(express, "IfcObject", { depth: 1, relations: new Set(RELATIONS) });
  assert.deepEqual(edges(els), [
    "attribute:IfcObject>IfcLengthMeasure[Points LIST [1:?] OF LIST [2:3]]",
    "inverse:IfcObject>IfcRelSpaceBoundary[(INV) BoundedBy SET [0:?]]",
    "reverse:IfcRelSpaceBoundary>IfcObject[RelatingSpace]",
    "subtype:IfcObject>IfcWall",
    "subtype:IfcRoot>IfcObject",
  ]);
  const root = els.find((e) => e.data.id === "IfcRoot");
  assert.equal(root.data.label, "(ABS) IfcRoot");
  assert.equal(els.find((e) => e.data.id === "IfcObject").data.focus, true);
});

test("relations can be left out, and depth 2 reaches the neighbours' relations", () => {
  const only = neighbourhood(express, "IfcWall", { depth: 1, relations: new Set(["subtype"]) });
  assert.deepEqual(nodes(only), ["IfcObject", "IfcWall"]);
  const deep = neighbourhood(express, "IfcWall", { depth: 2, relations: new Set(["subtype"]) });
  assert.deepEqual(nodes(deep), ["IfcObject", "IfcRoot", "IfcWall"]);
  const uses = neighbourhood(express, "IfcWall", { depth: 1, relations: new Set(["uses"]) });
  assert.deepEqual(edges(uses), ["uses:IfcWall>IfcCheck", "uses:IfcWall>IfcWallTypeEnum"]);
  assert.deepEqual(neighbourhood(express, "Nothing"), []);
});

test("types show their members, values and underlying types", () => {
  assert.deepEqual(edges(expansion(express, "IfcValue", new Set(["select"]))), ["select:IfcValue>IfcLabel", "select:IfcValue>IfcLengthMeasure"]);
  assert.deepEqual(nodes(expansion(express, "IfcWallTypeEnum", new Set(["value"]))), ["IfcWallTypeEnum", "v:IfcWallTypeEnum.MOVABLE", "v:IfcWallTypeEnum.PARAPET", "v:IfcWallTypeEnum.USERDEFINED"]);
  assert.deepEqual(edges(expansion(express, "IfcLineIndex", new Set(["underlying"]))), ["underlying:IfcLineIndex>INTEGER[LIST [2:?]]"]);
  const optional = expansion(express, "IfcWall", new Set(["attribute"])).find((e) => e.data.id === "attr:IfcWall.PredefinedType>IfcWallTypeEnum");
  assert.equal(optional.data.optional, true);
});

test("the inheritance tree runs from the root to every subtype; the whole tree has every entity", () => {
  const tree = inheritanceTree(express, "IfcObject");
  assert.deepEqual(nodes(tree), ["IfcObject", "IfcRoot", "IfcWall"]);
  assert.deepEqual(edges(tree), ["subtype:IfcObject>IfcWall", "subtype:IfcRoot>IfcObject"]);
  assert.equal(tree.find((e) => e.data.id === "sub:IfcRoot>IfcObject").data.oneof, true);
  assert.equal(nodes(inheritanceTree(express, "IfcObject", { whole: true })).length, 5);
});

test("IFC5 namespaces are nested boxes, and a component shows its structure", () => {
  const overview = ifcxOverview(ifc5);
  const prop = overview.find((e) => e.data.id === "ns:bsi::ifc::prop");
  assert.equal(prop.data.parent, "ns:bsi::ifc");
  assert.equal(overview.find((e) => e.data.id === "ns:bsi::ifc").data.parent, "ns:bsi");
  assert.equal(overview.find((e) => e.data.id === "c:bsi::ifc::prop::Name").data.parent, "ns:bsi::ifc::prop");
  const wall = ifcxComponent(ifc5, "bsi::ifc::wall");
  assert.ok(nodes(wall).includes("m:bsi::ifc::wall/wall.PredefinedType=SOLIDWALL"));
  assert.ok(edges(wall).includes("member:m:bsi::ifc::wall/wall.Extra>m:bsi::ifc::wall/wall.Extra[]"));
});

test("the comparison graph joins the entity to its class code and to components of the same names", () => {
  const els = comparisonGraph(express, compareEntity("IfcWall", express, ifc5, express), ifc5);
  assert.deepEqual(edges(els), [
    "ifc5:IfcWall>c:bsi::ifc::class[code \"IfcWall\"]",
    "ifc5:IfcWall>c:bsi::ifc::prop::Height[Height]",
    "ifc5:IfcWall>c:bsi::ifc::prop::Name[Name]",
    "ifc5:IfcWall>c:bsi::ifc::wall[same name]",
  ]);
});
