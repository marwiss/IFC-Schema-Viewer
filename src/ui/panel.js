// This file was generated with the assistance of an AI coding tool.
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * The panel beside the graph: what the selected entity, type, function, IFC5 component or namespace is. Every name in
 * it navigates the graph; links to the standards open in a new tab. `app` is the page (main.js): `navigate(name,
 * view, schemaId)`, `docs(model, part)`, `compare(name)`, `ifc5()`, `classSchema()`, `expressModels()`.
 */

import { el, replace, extLink, nav } from "./dom.js";
import { typeText, namedRefs } from "../express/model.js";
import { specText, specRows, localName, CLASS_KEY } from "../ifcx/schema.js";
import { docEntry, summary, ifc43PageUrl, ifc43PropertyUrl, setsWithProperty } from "../docs.js";
import { componentMatches } from "../compare.js";
import { acrossVersions, schemaChanges } from "../versions.js";

const badge = (text, kind = "") => el("span", { class: `badge ${kind}` }, text);
const section = (title, ...body) => el("section", { class: "block" }, el("h3", {}, title), ...body);
const muted = (text) => el("p", { class: "muted" }, text);

/** A type expression with its named parts as navigation buttons. */
function typeLinks(model, type, app) {
  const text = typeText(type);
  const names = new Set(namedRefs(type));
  if (!names.size) return el("code", {}, text);
  const parts = text.split(/([A-Za-z_][A-Za-z0-9_]*)/);
  return el(
    "code",
    {},
    parts.map((p) => (names.has(p) && model.kindOf(p) ? nav(p, () => app.navigate(p)) : p)),
  );
}

/** "Open in the standard ↗" and a short description, filled in when the documentation data has come. */
function docBlock(app, model, part, name) {
  const holder = el("div", { class: "doc" }, muted("Looking up the documentation…"));
  app
    .docs(model, part)
    .then((docs) => {
      const entry = docEntry(docs, name);
      if (!entry) {
        replace(holder, docs ? muted("No page for this name in the documentation data.") : null);
        return;
      }
      replace(
        holder,
        el("p", {}, extLink(entry.spec_url, "Open in the standard ↗")),
        summary(entry.description) ? el("p", { class: "desc" }, summary(entry.description)) : null,
      );
    })
    .catch((error) => replace(holder, muted(`The documentation data could not be read: ${error.message}`)));
  return holder;
}

function sourceBlock(model, item) {
  const text = model.source(item);
  if (!text) return null;
  return el("details", { class: "source" }, el("summary", {}, "EXPRESS source"), el("pre", {}, text));
}

function rulesBlock(item) {
  const rows = [...(item.unique ?? []).map((r) => ["UNIQUE", r]), ...(item.where ?? []).map((r) => ["WHERE", r])];
  if (!rows.length) return null;
  return section(
    "Rules",
    el(
      "dl",
      { class: "rules" },
      rows.map(([kind, r]) => [el("dt", {}, `${kind}${r.label ? ` ${r.label}` : ""}`), el("dd", {}, el("code", {}, r.expr))]),
    ),
    muted("Shown as written; the page does not evaluate rules."),
  );
}

function usedByBlock(model, name, app) {
  const refs = model.usedBy(name);
  if (!refs.length) return null;
  const items = refs.map((r) =>
    el("li", {}, nav(r.from, () => app.navigate(r.from)), r.via ? ` .${r.via}` : "", el("span", { class: "muted" }, ` (${r.kind})`)),
  );
  return el("details", { class: "block" }, el("summary", {}, `Referenced by (${refs.length})`), el("ul", { class: "plain" }, items));
}

function mentionsBlock(model, name, app) {
  const m = model.mentions(name);
  if (!m.length) return null;
  return section("Mentioned in its rules", el("p", { class: "names" }, m.map((n) => nav(n, () => app.navigate(n)))));
}

function attributesBlock(model, entity, app) {
  const attrs = model.allAttributes(entity.name);
  if (!attrs.length) return section("Attributes", muted("None."));
  const table = el("table", { class: "attrs" });
  const head = el("tr", {}, el("th", {}, "Attribute"), el("th", {}, "Type"), el("th", {}, ""));
  table.append(el("thead", {}, head));
  const body = el("tbody");
  let group = null;
  const descriptions = new Map();
  for (const a of attrs) {
    if (a.declaredIn !== group) {
      group = a.declaredIn;
      const own = group.toUpperCase() === entity.name.toUpperCase();
      body.append(
        el("tr", { class: "group" }, el("td", { colspan: 3 }, own ? "Own" : "From ", own ? "" : nav(group, () => app.navigate(group)))),
      );
    }
    const flags = [];
    if (a.kind === "explicit" && a.attr.optional) flags.push(badge("OPTIONAL"));
    if (a.kind === "derive") flags.push(badge("DER", "der"));
    if (a.kind === "inverse") flags.push(badge("INV", "inv"));
    for (const r of a.redeclaredIn) flags.push(badge(`redeclared in ${r.entity}`, "faint"));
    for (const r of a.derivedIn) flags.push(badge(`derived in ${r.entity}`, "faint"));
    let type;
    if (a.kind === "inverse") {
      const agg = a.attr.agg ? `${a.attr.agg} [${a.attr.lower}:${a.attr.upper}] OF ` : "";
      type = el("code", {}, agg, nav(a.attr.entity, () => app.navigate(a.attr.entity)), ` FOR ${a.attr.forAttribute}`);
    } else {
      type = typeLinks(model, a.attr.type, app);
    }
    const desc = el("td", { colspan: 3, class: "attr-desc" });
    descriptions.set(desc, a);
    body.append(el("tr", { class: "attr" }, el("td", {}, el("strong", {}, a.name)), el("td", {}, type), el("td", { class: "flags" }, flags)));
    body.append(el("tr", { class: "desc" }, desc));
    if (a.kind === "derive" && a.attr.expr) {
      body.append(el("tr", { class: "expr" }, el("td", { colspan: 3 }, el("code", {}, `:= ${a.attr.expr}`))));
    }
  }
  table.append(body);
  // Attribute descriptions (IFC4 and IFC4X3) and the declaring entity's page, when the documentation data has come.
  app
    .docs(model, "entities")
    .then((docs) => {
      if (!docs) return;
      for (const [node, a] of descriptions) {
        const entry = docEntry(docs, a.declaredIn);
        const text = summary(entry?.attributes?.[a.name], 300);
        replace(node, text ? el("span", {}, text) : null, " ", extLink(entry?.spec_url, "↗", `${a.declaredIn} in the standard`));
      }
    })
    .catch(() => {});
  return section("Attributes", table);
}

export function renderEntity(panel, model, name, app) {
  const e = model.entity(name);
  const ancestors = model.ancestors(e.name);
  const all = model.descendants(e.name).length;
  const compare = el("div", { class: "compare" }, el("button", { type: "button", class: "primary", onclick: () => compareBlock(compare, model, e.name, app) }, "Compare with IFC5"));
  replace(
    panel,
    el("header", { class: "head" }, el("h2", {}, e.name), badge("ENTITY", "entity"), e.abstract ? badge("ABSTRACT") : null, badge(model.label, "faint")),
    docBlock(app, model, "entities", e.name),
    section(
      "Supertypes",
      ancestors.length
        ? el("ol", { class: "chain" }, [...ancestors].reverse().map((a) => el("li", {}, nav(a, () => app.navigate(a)))), el("li", {}, el("strong", {}, e.name)))
        : muted("None: a root of the schema."),
    ),
    section(
      `Subtypes (${e.subtypes.length}${all > e.subtypes.length ? `, ${all} at any depth` : ""})`,
      e.subtypes.length ? el("p", { class: "names" }, e.subtypes.map((s) => nav(s, () => app.navigate(s)))) : muted("None."),
      e.supertypeOf ? el("p", {}, "SUPERTYPE OF ", el("code", {}, e.supertypeOf)) : null,
    ),
    attributesBlock(model, e, app),
    rulesBlock(e),
    mentionsBlock(model, e.name, app),
    usedByBlock(model, e.name, app),
    versionsSection(e.name, app),
    section("IFC5", compare),
    sourceBlock(model, e),
  );
}

/** "In other versions": a button that loads the three EXPRESS schemas and shows what changed between them. */
function versionsSection(name, app) {
  const holder = el("div", {});
  const run = async () => {
    replace(holder, muted("Loading IFC2X3, IFC4 and IFC4X3…"));
    let rows;
    try {
      rows = acrossVersions(name, await app.versions());
    } catch (error) {
      replace(holder, muted(`The versions could not be loaded: ${error.message}`));
      return;
    }
    replace(holder, el("table", { class: "attrs versions" }, el("thead", {}, el("tr", {}, el("th", {}, "Version"), el("th", {}, "Change from the version before"))), el("tbody", {}, rows.map((r) => versionRow(name, r, app)))));
  };
  replace(holder, el("button", { type: "button", class: "button", onclick: run }, "Compare versions"));
  return section("In other versions", holder, muted("Matched by name, so a renamed entity shows as gone in one version and new in the next."));
}

function versionRow(name, row, app) {
  const label = row.here ? nav(row.label, () => app.navigate(row.here.name, "near", row.id)) : el("span", { class: "muted" }, row.label);
  const c = row.change;
  let what;
  if (!row.here) what = el("span", { class: "muted" }, c?.status === "absent" ? "Removed (or renamed)" : "Not in this version");
  else if (!c) what = el("span", { class: "muted" }, row.here.kind === "entity" ? `Subtype of ${row.here.supertype ?? "nothing"}` : row.here.underlying);
  else if (c.status === "new") what = el("strong", {}, "New in this version");
  else if (c.status === "same") what = el("span", { class: "muted" }, "Unchanged");
  else {
    what = el(
      "ul",
      { class: "plain" },
      c.notes.map((n) => el("li", {}, n)),
      c.added.length ? el("li", {}, el("span", { class: "added" }, "+ "), c.added.join(", ")) : null,
      c.removed.length ? el("li", {}, el("span", { class: "removed" }, "− "), c.removed.join(", ")) : null,
      c.changed.map((x) => el("li", {}, `${x.name}: `, el("code", {}, x.from), " → ", el("code", {}, x.to))),
    );
  }
  return el("tr", {}, el("td", {}, label), el("td", {}, what));
}

/** What a schema adds and removes compared with the version before it. */
function schemaVersionSection(model, app) {
  const order = ["IFC2X3", "IFC4", "IFC4X3"];
  const i = order.indexOf(model.id);
  if (i <= 0) return null;
  const holder = el("div", {});
  const run = async () => {
    replace(holder, muted("Loading the version before…"));
    try {
      const versions = await app.versions();
      const before = versions[i - 1];
      const d = schemaChanges(before.model, model);
      const list = (title, names, id) =>
        names.length
          ? el("details", { class: "block" }, el("summary", {}, `${title} (${names.length})`), el("p", { class: "names" }, names.map((n) => nav(n, () => app.navigate(n, "near", id)))))
          : el("p", { class: "muted" }, `${title}: none.`);
      replace(
        holder,
        el("p", {}, `Compared with ${before.label}, by name:`),
        list("New entities", d.addedEntities, model.id),
        list("New types", d.addedTypes, model.id),
        list("Entities no longer here", d.removedEntities, before.id),
        list("Types no longer here", d.removedTypes, before.id),
      );
    } catch (error) {
      replace(holder, muted(`The version before could not be loaded: ${error.message}`));
    }
  };
  replace(holder, el("button", { type: "button", class: "button", onclick: run }, "Compare with the version before"));
  return section("Changes from the version before", holder);
}

async function compareBlock(holder, model, name, app) {
  replace(holder, muted("Loading IFC5 and IFC4X3 ADD2…"));
  let result;
  try {
    result = await app.compare(name);
  } catch (error) {
    replace(holder, muted(`The comparison failed: ${error.message}`));
    return;
  }
  const { comparison: c, ifc5 } = result;
  const classRow = el(
    "div",
    { class: "classcode" },
    el("code", {}, `${CLASS_KEY} = { code: "${c.code}", uri: "${c.uri ?? ""}" }`),
    el(
      "p",
      {},
      c.inClassSchema === false
        ? el("span", { class: "warn" }, `${c.code} is not a class in IFC4X3 ADD2, so the code has no IFC 4.3 class to name. `)
        : c.inClassSchema
          ? [extLink(ifc43PageUrl(c.classSchemaName), "IFC 4.3 page ↗"), " · "]
          : null,
      extLink(c.uri, "bSDD ↗", "The class URI that IFC5 data writes"),
      " · ",
      nav("Show as graph", () => app.navigate(name, "compare")),
    ),
  );
  const rows = c.attributes.map((a) =>
    el(
      "tr",
      {},
      el("td", {}, a.name),
      el("td", {}, nav(a.declaredIn, () => app.navigate(a.declaredIn))),
      el("td", {}, a.components.length ? a.components.map((k) => nav(k, () => app.navigate(k, "near", ifc5.id))) : el("span", { class: "muted" }, "—")),
    ),
  );
  const matched = c.attributes.filter((a) => a.components.length).length;
  const named = c.named.map((n) =>
    el(
      "div",
      { class: "named" },
      el("p", {}, "Named like the entity: ", nav(n.key, () => app.navigate(n.key, "near", ifc5.id))),
      el(
        "table",
        { class: "attrs" },
        el("thead", {}, el("tr", {}, el("th", {}, "IFC5 member"), el("th", {}, "Type"), el("th", {}, "EXPRESS attribute"))),
        el(
          "tbody",
          {},
          n.members.map((m) =>
            el(
              "tr",
              {},
              el("td", {}, m.member),
              el("td", {}, el("code", {}, specText(m.spec))),
              el(
                "td",
                {},
                m.attribute ?? el("span", { class: "muted" }, "—"),
                m.enums
                  ? el(
                      "div",
                      { class: "muted" },
                      `${m.enums.type}: ${m.enums.both.length} values in both`,
                      m.enums.onlyExpress.length ? `; only in EXPRESS: ${m.enums.onlyExpress.join(", ")}` : "",
                      m.enums.onlyIfc5.length ? `; only in IFC5: ${m.enums.onlyIfc5.join(", ")}` : "",
                    )
                  : null,
              ),
            ),
          ),
        ),
      ),
    ),
  );
  const usage = c.usage
    ? section(
        `In the opened IFC5 data (${c.usage.paths} paths)`,
        el("ul", { class: "plain" }, c.usage.components.map(([k, n]) => el("li", {}, ifc5.component(k) ? nav(k, () => app.navigate(k, "near", ifc5.id)) : el("code", {}, k), ` × ${n}`))),
      )
    : muted("Open an IFC5 data file (.ifcx) to see which components stand with this class code.");
  replace(
    holder,
    classRow,
    el("p", { class: "muted" }, `${matched} of ${c.attributes.length} attributes have an IFC5 component with the same name. Matched by name: an interpretation, not something the schemas state.`),
    el("table", { class: "attrs" }, el("thead", {}, el("tr", {}, el("th", {}, "Attribute"), el("th", {}, "Declared in"), el("th", {}, "IFC5 component"))), el("tbody", {}, rows)),
    named,
    usage,
  );
}

export function renderType(panel, model, name, app) {
  const t = model.type(name);
  const u = t.underlying;
  let body;
  if (t.kind === "select") {
    body = section(`Select (${u.items.length})`, el("p", { class: "names" }, u.items.map((i) => nav(i, () => app.navigate(i)))));
  } else if (t.kind === "enum") {
    const values = el("ul", { class: "values" }, u.items.map((v) => el("li", { dataset: { value: v } }, el("code", {}, v), el("span", { class: "muted" }))));
    body = section(`Enumeration (${u.items.length})`, values);
    // The values are described with the entities whose PredefinedType has this type.
    const owners = model.usedBy(t.name).filter((r) => r.via === "PredefinedType").map((r) => r.from);
    app
      .docs(model, "entities")
      .then((docs) => {
        const descs = owners.map((o) => docEntry(docs, o)?.predefined_types).find((d) => d && typeof d === "object");
        if (!descs) return;
        for (const li of values.children) {
          const d = summary(descs[li.dataset.value], 240);
          if (d) li.lastChild.textContent = ` ${d}`;
        }
      })
      .catch(() => {});
  } else {
    body = section("Underlying type", typeLinks(model, u, app));
  }
  replace(
    panel,
    el("header", { class: "head" }, el("h2", {}, t.name), badge(t.kind === "defined" ? "TYPE" : t.kind.toUpperCase(), t.kind), badge(model.label, "faint")),
    docBlock(app, model, "types", t.name),
    body,
    rulesBlock(t),
    usedByBlock(model, t.name, app),
    versionsSection(t.name, app),
    sourceBlock(model, t),
  );
}

export function renderAlgorithm(panel, model, name, app) {
  const a = model.algorithm(name);
  replace(
    panel,
    el("header", { class: "head" }, el("h2", {}, a.name), badge(a.kind.toUpperCase()), badge(model.label, "faint")),
    muted("A function or global rule: shown as written; the page does not evaluate it."),
    usedByMentions(model, a.name, app),
    sourceBlock(model, a),
  );
}

function usedByMentions(model, name, app) {
  const users = [...model.entities.values(), ...model.types.values()].filter((i) => model.mentions(i.name).includes(name)).map((i) => i.name);
  if (!users.length) return null;
  return section(`Mentioned in the rules of (${users.length})`, el("p", { class: "names" }, users.map((u) => nav(u, () => app.navigate(u)))));
}

export function renderSimple(panel, model, name) {
  replace(
    panel,
    el("header", { class: "head" }, el("h2", {}, name), badge("SIMPLE TYPE", "simple")),
    muted("A simple type of EXPRESS (ISO 10303-11)."),
  );
}

// IFC5

export function renderComponent(panel, model, key, app) {
  const c = model.component(key);
  const rows = specRows(c.spec, localName(key));
  const table = el(
    "table",
    { class: "attrs" },
    el("thead", {}, el("tr", {}, el("th", {}, "Part"), el("th", {}, "Data type"), el("th", {}, ""))),
    el(
      "tbody",
      {},
      rows.map((r) =>
        el(
          "tr",
          {},
          el("td", { class: `indent-${Math.min(r.depth, 4)}` }, r.name),
          el("td", {}, el("code", {}, r.dataType), r.quantityKind ? ` (${r.quantityKind})` : ""),
          el("td", { class: "flags" }, r.optional ? badge("optional") : null, r.options ? el("span", { class: "muted" }, r.options.join(", ")) : null),
        ),
      ),
    ),
  );
  const sources = c.sources.map((s) => el("li", {}, s.url ? extLink(s.url, s.label) ?? s.label : s.label));
  const matches = el("div", {}, muted("Looking for the same names in IFC4X3 ADD2…"));
  replace(
    panel,
    el("header", { class: "head" }, el("h2", {}, c.name), badge("COMPONENT", "component"), badge(model.label, "faint")),
    el("p", {}, el("code", {}, c.key)),
    section("Namespace", el("p", {}, nav(c.namespace || "(no namespace)", () => app.navigate(`ns:${c.namespace}`, "near", model.id)))),
    section("Value", el("p", {}, el("code", {}, specText(c.spec))), table),
    section(c.sources.length > 1 ? "Defined in (the last one counts)" : "Defined in", el("ul", { class: "plain" }, sources)),
    section("In EXPRESS", matches),
    dataUsage(model, key, app),
  );
  fillMatches(matches, key, app).catch((error) => replace(matches, muted(`IFC4X3 ADD2 could not be read: ${error.message}`)));
}

async function fillMatches(holder, key, app) {
  const express = await app.classSchema();
  const m = componentMatches(key, express);
  const parts = [];
  if (key === CLASS_KEY) {
    parts.push(muted("The code names an IFC 4.3 class; open an EXPRESS entity and choose \"Compare with IFC5\"."));
  }
  if (m.namedEntity) {
    parts.push(el("p", {}, "Entity with this name: ", nav(m.namedEntity, () => app.navigate(m.namedEntity, "near", express.id))));
  }
  if (m.declaring.length) {
    parts.push(
      el("p", {}, `Attribute ${m.local} is declared in ${m.declaring.length} ${m.declaring.length === 1 ? "entity" : "entities"} of ${express.label}:`),
      el("p", { class: "names" }, m.declaring.map((d) => nav(d.entity, () => app.navigate(d.entity, "near", express.id)))),
    );
  }
  const properties = await app.docs(express, "properties");
  const sets = setsWithProperty(properties, m.local);
  if (sets.length) {
    const same = sets.every((s) => s.description === sets[0].description);
    parts.push(
      el("p", {}, `Property ${m.local} is in ${sets.length} property ${sets.length === 1 ? "set" : "sets"} of IFC 4.3 `, extLink(ifc43PropertyUrl(m.local), "(property page ↗)")),
      same && sets[0].description ? el("p", { class: "muted" }, sets[0].description) : null,
      el("ul", { class: "plain" }, sets.map((s) => el("li", {}, s.url ? extLink(s.url, s.name) : s.name, !same && s.description ? el("span", { class: "muted" }, ` ${s.description}`) : ""))),
    );
  }
  if (!parts.length) parts.push(muted(`No entity, attribute or property in ${express.label} has the name ${m.local}.`));
  parts.push(muted("Matched by name: an interpretation, not something the schemas state."));
  replace(holder, parts);
}

function dataUsage(model, key, app) {
  if (!model.paths.size) return null;
  if (key === CLASS_KEY) {
    const codes = [...model.classIndex.values()].sort((a, b) => a.code.localeCompare(b.code));
    return section(
      `Class codes in the opened data (${codes.length})`,
      el("ul", { class: "plain" }, codes.map((c) => el("li", {}, nav(c.code, () => app.navigate(c.code, "near", "IFC4X3")), ` × ${c.paths.length}`, " ", extLink(c.uris[0], "↗")))),
    );
  }
  let n = 0;
  for (const p of model.paths.values()) if (Object.prototype.hasOwnProperty.call(p.attributes, key)) n++;
  return section("In the opened data", muted(`${n} of ${model.paths.size} paths have this component.`));
}

export function renderNamespace(panel, model, ns, app) {
  const entry = model.namespaces.get(ns);
  replace(
    panel,
    el("header", { class: "head" }, el("h2", {}, ns || "(no namespace)"), badge("NAMESPACE", "namespace"), badge(model.label, "faint")),
    entry.parent !== null && entry.parent !== "" ? section("Inside", el("p", {}, nav(entry.parent, () => app.navigate(`ns:${entry.parent}`, "near", model.id)))) : null,
    entry.children.length ? section("Namespaces", el("p", { class: "names" }, entry.children.map((c) => nav(c, () => app.navigate(`ns:${c}`, "near", model.id))))) : null,
    section(`Components (${entry.components.length})`, el("p", { class: "names" }, entry.components.map((k) => nav(localName(k), () => app.navigate(k, "near", model.id), k)))),
  );
}

export function renderIfcxStart(panel, model, app) {
  const roots = [...model.namespaces.values()].filter((n) => n.parent === "" || n.parent === null).filter((n) => n.name !== "" || n.components.length);
  replace(
    panel,
    el("header", { class: "head" }, el("h2", {}, model.label), badge("IFCX", "component")),
    el("p", {}, `${model.components.size} components in ${model.namespaces.size} namespaces, from ${model.files.length} files. IFC5 has no inheritance between components; the boxes in the graph are the namespaces.`),
    section("Namespaces", el("p", { class: "names" }, roots.map((n) => nav(n.name || "(no namespace)", () => app.navigate(`ns:${n.name}`, "near", model.id))))),
    section(
      "Files",
      el("ul", { class: "plain" }, model.files.map((f) => el("li", {}, f.source.url ? extLink(f.source.url, f.source.label) ?? f.source.label : f.source.label, el("span", { class: "muted" }, ` ${Object.keys(f.schemas).length} schemas, ${f.data.length} data entries`)))),
    ),
    model.conflicts.length ? section("Defined twice", el("ul", { class: "plain" }, model.conflicts.map((c) => el("li", {}, el("code", {}, c.key), ` ${c.sources.join(" → ")}`)))) : null,
  );
}

export function renderExpressStart(panel, model, app) {
  const c = model.counts();
  replace(
    panel,
    el("header", { class: "head" }, el("h2", {}, model.label), badge("EXPRESS", "entity")),
    el("p", {}, `Schema ${model.schema}: ${c.entities} entities, ${c.types} types, ${c.functions} functions and ${c.rules} rules.`),
    c.errors ? el("p", { class: "warn" }, `${c.errors} declarations could not be read and are left out.`) : null,
    c.skipped ? muted(`${c.skipped} declarations of kinds the IFC schemas do not use were skipped.`) : null,
    section(`Roots (${model.roots().length})`, el("p", { class: "names" }, model.roots().map((r) => nav(r, () => app.navigate(r))))),
    schemaVersionSection(model, app),
  );
}
