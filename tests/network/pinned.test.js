// This file was generated with the assistance of an AI coding tool.
// SPDX-License-Identifier: AGPL-3.0-or-later

// The pinned files, fetched over the network: `node --test tests/network/`. Each must match its SHA-256, the parser
// must read every EXPRESS schema without errors and find as many declarations as the files have, and the
// documentation data must have a linkable page for every entity and type.

import { test } from "node:test";
import assert from "node:assert/strict";
import { SCHEMAS, LIMITS } from "../../src/sources.js";
import { fetchPinned, decode } from "../../src/load.js";
import { buildModel } from "../../src/express/model.js";
import { readIfcx, buildIfcxModel } from "../../src/ifcx/schema.js";
import { loadDocs, safeUrl } from "../../src/docs.js";
import { acrossVersions, schemaChanges } from "../../src/versions.js";

const count = (text, word) => (text.match(new RegExp(`^\\s*${word}\\s`, "gm")) ?? []).length;
const expected = {
  IFC2X3: { entities: 653, types: 327, functions: 38, rules: 2 },
  IFC4: { entities: 776, types: 397, functions: 47, rules: 2 },
  IFC4X3: { entities: 876, types: 436, functions: 48, rules: 2 },
};

for (const schema of SCHEMAS.filter((s) => s.format === "express")) {
  test(`${schema.label} is the pinned file and parses completely`, async () => {
    const text = decode(await fetchPinned(schema.files[0], LIMITS.expressBytes));
    const model = buildModel(text, { id: schema.id, label: schema.label });
    const c = model.counts();
    assert.deepEqual(c, { ...expected[schema.id], skipped: 0, errors: 0 });
    assert.equal(c.entities, count(text, "ENTITY"));
    assert.equal(c.types, count(text, "TYPE"));

    const chain = model.ancestors("IfcWall");
    assert.deepEqual(chain.slice(-4), ["IfcProduct", "IfcObject", "IfcObjectDefinition", "IfcRoot"]);
    assert.deepEqual(
      model.allAttributes("IfcRoot").map((a) => `${a.name}${a.attr.optional ? "?" : ""}`),
      ["GlobalId", schema.id === "IFC2X3" ? "OwnerHistory" : "OwnerHistory?", "Name?", "Description?"],
    );
    const bounded = model.allAttributes("IfcSpace").find((a) => a.name === "BoundedBy");
    assert.equal(bounded.attr.entity, "IfcRelSpaceBoundary");

    for (const part of ["entities", "types"]) {
      const docs = await loadDocs(schema.id, part);
      const declared = [...(part === "entities" ? model.entities : model.types).values()].map((d) => d.name.toUpperCase()).sort();
      assert.deepEqual([...docs.keys()].sort(), declared, `${schema.id} ${part}`);
      for (const entry of docs.values()) assert.ok(safeUrl(entry.spec_url), `${schema.id} ${entry.name}: ${entry.spec_url}`);
    }
    const properties = await loadDocs(schema.id, "properties");
    assert.ok(properties.get("PSET_WALLCOMMON")?.properties?.IsExternal, `${schema.id} Pset_WallCommon.IsExternal`);
  });
}

test("the IFC5 schemas are the pinned files, with their components in their namespaces", async () => {
  const ifc5 = SCHEMAS.find((s) => s.id === "IFC5");
  const files = await Promise.all(
    ifc5.files.map(async (f) => readIfcx(decode(await fetchPinned(f, LIMITS.jsonBytes)), { id: f.url, label: f.origin, url: f.url })),
  );
  assert.deepEqual(files.map((f) => Object.keys(f.schemas).length), [13, 19, 4, 4, 1]);
  const model = buildIfcxModel(files);
  assert.equal(model.components.size, 41);
  assert.deepEqual(model.conflicts, []);
  assert.equal(model.namespaces.get("bsi::ifc::prop").components.length, 19);
  assert.deepEqual(model.namespaces.get("usd").children, ["usd::usdgeom"]);
  assert.deepEqual(model.namespaces.get("nlsfb").components, ["nlsfb::class"]);
  assert.equal(model.component("bsi::ifc::class").spec.dataType, "Object");
});

test("IfcWall changes as IFC2X3 becomes IFC4 and IFC4X3", async () => {
  const versions = [];
  for (const schema of SCHEMAS.filter((s) => s.format === "express")) {
    const text = decode(await fetchPinned(schema.files[0], LIMITS.expressBytes));
    versions.push({ id: schema.id, label: schema.label, model: buildModel(text, { id: schema.id }) });
  }
  const [ifc2x3, ifc4, ifc4x3] = acrossVersions("IfcWall", versions);
  assert.equal(ifc2x3.here.supertype, "IfcBuildingElement");
  assert.ok(ifc4.change.added.includes("PredefinedType"));
  assert.ok(ifc4.change.changed.some((c) => c.name === "OwnerHistory" && c.to.startsWith("OPTIONAL")));
  assert.ok(ifc4x3.change.notes.includes("supertype IfcBuildingElement → IfcBuiltElement"));
  const d = schemaChanges(versions[1].model, versions[2].model);
  assert.ok(d.addedEntities.includes("IfcBuiltElement"));
  assert.ok(d.removedEntities.includes("IfcBuildingElement"));
});

test("a changed file is refused", async () => {
  const [file] = SCHEMAS.find((s) => s.id === "IFC5").files;
  await assert.rejects(fetchPinned({ url: `${file.url}?changed`, sha256: "0".repeat(64) }, LIMITS.jsonBytes), /not the pinned file/);
});
