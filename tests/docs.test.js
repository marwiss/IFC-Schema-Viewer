// This file was generated with the assistance of an AI coding tool.
// SPDX-License-Identifier: AGPL-3.0-or-later

import { test } from "node:test";
import assert from "node:assert/strict";
import { safeUrl, ifc43PageUrl, ifc43PropertyUrl, bsddClassUri, summary, setsWithProperty, isName } from "../src/docs.js";

test("only https addresses under the allowed prefixes become links", () => {
  for (const ok of [
    "https://standards.buildingsmart.org/IFC/RELEASE/IFC4/ADD2_TC1/HTML/schema/ifcsharedbldgelements/lexical/ifcwall.htm",
    "https://ifc43-docs.standards.buildingsmart.org/IFC/RELEASE/IFC4x3/HTML/lexical/IfcWall.htm",
    "https://identifier.buildingsmart.org/uri/buildingsmart/ifc/4.3/class/IfcWall",
    "https://ifcx.dev/@standards.buildingsmart.org/ifc/core/ifc@v5a.ifcx",
  ]) {
    assert.equal(safeUrl(ok), ok);
  }
  for (const bad of [
    "javascript:alert(1)",
    "http://standards.buildingsmart.org/IFC/RELEASE/x.htm",
    "https://standards.buildingsmart.org.example.com/IFC/RELEASE/x.htm",
    "https://user:pass@standards.buildingsmart.org/IFC/RELEASE/x.htm",
    "https://example.com/?https://ifcx.dev/",
    "https://standards.buildingsmart.org/other/",
    "data:text/html,x",
    "",
    null,
    42,
  ]) {
    assert.equal(safeUrl(bad), null, String(bad));
  }
});

test("names put into addresses must be plain EXPRESS names", () => {
  assert.equal(ifc43PageUrl("IfcWall"), "https://ifc43-docs.standards.buildingsmart.org/IFC/RELEASE/IFC4x3/HTML/lexical/IfcWall.htm");
  assert.equal(ifc43PropertyUrl("IsExternal"), "https://ifc43-docs.standards.buildingsmart.org/IFC/RELEASE/IFC4x3/HTML/property/IsExternal.htm");
  assert.equal(bsddClassUri("IfcWall"), "https://identifier.buildingsmart.org/uri/buildingsmart/ifc/4.3/class/IfcWall");
  for (const bad of ["../x", "a/b", "a b", "", "x?y", "1abc"]) {
    assert.equal(isName(bad), false);
    assert.equal(ifc43PageUrl(bad), null);
  }
});

test("descriptions are cut to their first paragraph", () => {
  assert.equal(summary("First  line\ncontinues.\n\nSecond paragraph."), "First line continues.");
  assert.equal(summary("x".repeat(20), 10), `${"x".repeat(9)}…`);
  assert.equal(summary(undefined), "");
});

test("property sets with a property are found by name", () => {
  const props = new Map([
    ["PSET_WALLCOMMON", { name: "Pset_WallCommon", spec_url: "https://ifc43-docs.standards.buildingsmart.org/IFC/RELEASE/IFC4x3/HTML/lexical/Pset_WallCommon.htm", properties: { IsExternal: { description: "Outside." } } }],
    ["PSET_SLABCOMMON", { name: "Pset_SlabCommon", spec_url: "javascript:alert(1)", properties: { IsExternal: {} } }],
    ["PSET_OTHER", { name: "Pset_Other", properties: { Other: {} } }],
  ]);
  assert.deepEqual(setsWithProperty(props, "IsExternal"), [
    { name: "Pset_SlabCommon", url: null, description: "" },
    { name: "Pset_WallCommon", url: "https://ifc43-docs.standards.buildingsmart.org/IFC/RELEASE/IFC4x3/HTML/lexical/Pset_WallCommon.htm", description: "Outside." },
  ]);
  assert.deepEqual(setsWithProperty(props, "constructor"), []);
  assert.deepEqual(setsWithProperty(null, "IsExternal"), []);
});
