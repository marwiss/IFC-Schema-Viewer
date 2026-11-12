// This file was generated with the assistance of an AI coding tool.
// SPDX-License-Identifier: AGPL-3.0-or-later

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseStep, decodeStepString } from "../src/step.js";
import { readPsetTemplates, applicableEntities, isQuantitySet } from "../src/psets.js";
import { buildModel } from "../src/express/model.js";
import { readIfcx, buildIfcxModel } from "../src/ifcx/schema.js";
import { compareEntity } from "../src/compare.js";
import { psetGraph, neighbourhood } from "../src/graph/elements.js";

const model = buildModel(readFileSync(new URL("./fixtures/mini.exp", import.meta.url), "utf8"));
const ifc5 = buildIfcxModel([readIfcx(readFileSync(new URL("./fixtures/mini.ifcx", import.meta.url), "utf8"), { id: "mini", label: "mini" })]);

const STEP = String.raw`ISO-10303-21;
HEADER;
FILE_SCHEMA(('IFC4X3_ADD2'));
ENDSEC;
DATA;
/* a comment */
#1= IFCPROJECT('x',$,'Templates',$,$,$,$,$,$);
#2=IFCPROPERTYSETTEMPLATE('g1',$,'Pset_WallCommon','Common to walls; it''s \X2\00E400F6\X0\ and \S\e.',.PSET_TYPEDRIVENOVERRIDE.,'IfcWall, IfcWall/PARAPET',(#3,#4,#5));
#3=IFCSIMPLEPROPERTYTEMPLATE('g2',$,'Height','Height.',.P_SINGLEVALUE.,'IfcPositiveLengthMeasure',$,$,$,$,$,.READWRITE.);
#4=IFCSIMPLEPROPERTYTEMPLATE('g3',$,'Status','Status.',.P_ENUMERATEDVALUE.,'IfcLabel',$,#6,$,$,$,.READWRITE.);
#5=IFCCOMPLEXPROPERTYTEMPLATE('g4',$,'Layers',$,'Usage',.P_COMPLEX.,(#3));
#6=IFCPROPERTYENUMERATION('PEnum_Status',(IFCLABEL('NEW'),IFCLABEL('EXISTING')),$);
#7=IFCPROPERTYSETTEMPLATE('g5',$,'Pset_RootThing',$,.PSET_OCCURRENCEDRIVEN.,'IFCDOMAIN/IfcRoot,IfcNothing',(#3));
#8=IFCPROPERTYSETTEMPLATE('g6',$,'Qto_WallBaseQuantities',$,.QTO_TYPEDRIVENOVERRIDE.,'IfcWall',(#3));
#9=IFCLENGTHMEASURE(-1.5E-3);
ENDSEC;
END-ISO-10303-21;`;

test("STEP strings are decoded", () => {
  assert.equal(decodeStepString("it''s"), "it's");
  assert.equal(decodeStepString("a\\\\b"), "a\\b");
  assert.equal(decodeStepString("\\X2\\00E400F6\\X0\\"), "äö");
  assert.equal(decodeStepString("\\X4\\0001F600\\X0\\"), "😀");
  assert.equal(decodeStepString("\\X\\E9"), "é");
  assert.equal(decodeStepString("\\S\\e"), "å");
});

test("the DATA section is read into instances with typed values", () => {
  const data = parseStep(STEP);
  assert.equal(data.size, 9);
  assert.equal(data.get(2).type, "IFCPROPERTYSETTEMPLATE");
  assert.deepEqual(data.get(2).args[4], { enum: "PSET_TYPEDRIVENOVERRIDE" });
  assert.deepEqual(data.get(2).args[6], [{ ref: 3 }, { ref: 4 }, { ref: 5 }]);
  assert.equal(data.get(2).args[1], null);
  assert.deepEqual(data.get(6).args[1], [{ type: "IFCLABEL", value: "NEW" }, { type: "IFCLABEL", value: "EXISTING" }]);
  assert.equal(data.get(9).args[0], -0.0015);
  assert.throws(() => parseStep("HEADER;ENDSEC;"), /no DATA/);
});

test("templates resolve what they apply to and their properties", () => {
  const psets = readPsetTemplates(STEP, model);
  const wall = psets.set("pset_wallcommon");
  assert.equal(wall.description, "Common to walls; it's äö and å.");
  assert.deepEqual(wall.applicable.map((a) => `${a.entity}/${a.predefined}`), ["IfcWall/null", "IfcWall/PARAPET"]);
  assert.deepEqual(wall.properties.map((p) => `${p.name}:${p.measure}:${p.kind}`), ["Height:IfcPositiveLengthMeasure:P_SINGLEVALUE", "Status:IfcLabel:P_ENUMERATEDVALUE", "Layers:Usage:P_COMPLEX"]);
  assert.deepEqual(wall.properties[1].enumeration, { name: "PEnum_Status", values: ["NEW", "EXISTING"] });
  assert.equal(wall.properties[2].parts[0].name, "Height");
  assert.deepEqual(applicableEntities("IFCDOMAIN/IfcRoot,IfcNothing", model), [
    { entity: "IfcRoot", predefined: null, raw: "IFCDOMAIN/IfcRoot" },
    { entity: null, predefined: null, raw: "IfcNothing" },
  ]);
  const forWall = psets.forEntity("IfcWall");
  assert.deepEqual(forWall.own.map((s) => `${s.set.name}${s.predefined ? `/${s.predefined}` : ""}`), ["Pset_WallCommon", "Pset_WallCommon/PARAPET", "Qto_WallBaseQuantities"]);
  assert.deepEqual(forWall.inherited.map((s) => `${s.set.name}<${s.from}`), ["Pset_RootThing<IfcRoot"]);
  assert.equal(isQuantitySet(psets.set("Qto_WallBaseQuantities")), true);
  assert.equal(isQuantitySet(wall), false);
});

test("property sets appear in the graph and in the comparison with IFC5", () => {
  const psets = readPsetTemplates(STEP, model);
  const els = neighbourhood(model, "IfcWall", { relations: new Set(["pset"]), psets });
  assert.deepEqual(els.filter((e) => e.group === "edges").map((e) => e.data.id).sort(), [
    "pset:IfcWall>p:Pset_WallCommon",
    "pset:IfcWall>p:Pset_WallCommon/PARAPET",
    "pset:IfcWall>p:Qto_WallBaseQuantities",
  ]);
  const g = psetGraph(model, psets.set("Pset_WallCommon"));
  assert.ok(g.some((e) => e.data.id === "pp:Pset_WallCommon.Status" && e.data.kind === "property"));
  // Height is an attribute of IfcWall and so matched by the attribute already; a property-only name would come here.
  const c = compareEntity("IfcWall", model, ifc5, null, psets);
  assert.deepEqual(c.properties, []);
  const more = buildIfcxModel([...ifc5.files, readIfcx(JSON.stringify({ schemas: { "bsi::ifc::prop::Status": { value: { dataType: "String" } } } }), { id: "x", label: "x" })]);
  assert.deepEqual(compareEntity("IfcWall", model, more, null, psets).properties, [{ key: "bsi::ifc::prop::Status", property: "Status", sets: ["Pset_WallCommon"], own: true }]);
});
