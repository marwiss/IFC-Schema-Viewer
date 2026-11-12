// This file was generated with the assistance of an AI coding tool.
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * The page: picking a schema, loading it, the route in the address (`#/<schema>/<name>/<view>`), the graph, the list and
 * the panel. Nothing is fetched until the user picks a schema or opens a link to one.
 */

import { SCHEMAS, schemaById, LIMITS, CLASS_SCHEMA } from "./sources.js";
import { fetchPinned, decode, readLocalFile } from "./load.js";
import { buildModel } from "./express/model.js";
import { readIfcx, buildIfcxModel } from "./ifcx/schema.js";
import { loadDocs, docEntry, safeUrl } from "./docs.js";
import { compareEntity } from "./compare.js";
import { RELATIONS, neighbourhood, expansion, inheritanceTree, ifcxOverview, ifcxComponent, comparisonGraph, structureGraph, psetGraph } from "./graph/elements.js";
import { structureById } from "./structures.js";
import { readPsetTemplates } from "./psets.js";
import { createGraph, treeLayout, nearLayout } from "./graph/view.js";
import { el, replace } from "./ui/dom.js";
import { renderExpressList, renderIfcxList } from "./ui/sidebar.js";
import * as panels from "./ui/panel.js";

const $ = (id) => document.getElementById(id);
const VIEWS = ["near", "tree", "all", "compare"];
const DEFAULT_RELATIONS = new Set(RELATIONS.filter((r) => r !== "uses" && r !== "ifc5"));
const DOCS_BY_SCHEMA = { IFC2X3: "IFC2X3", IFC4: "IFC4", IFC4X3_ADD2: "IFC4X3", IFC4X3: "IFC4X3" };

const state = { schemaId: null, focus: null, view: "near", depth: 1, relations: new Set(DEFAULT_RELATIONS), query: "" };
const local = new Map(); // id → {label, model} for EXPRESS files the user opened
const localIfcx = []; // IFCX files the user opened, composed after the pinned ones
const models = new Map(); // id → Promise<model>
let graph = null;
let current = null; // the model on show
let renderToken = 0;

// Loading

function loadModel(id) {
  if (local.has(id)) return Promise.resolve(local.get(id).model);
  if (!models.has(id)) {
    const schema = schemaById(id);
    if (!schema) return Promise.reject(new Error(`no schema ${id}`));
    const job =
      schema.format === "express"
        ? fetchPinned(schema.files[0], LIMITS.expressBytes).then((bytes) => buildModel(decode(bytes), { id, label: schema.label }))
        : Promise.all(
            schema.files.map((f) =>
              fetchPinned(f, LIMITS.jsonBytes).then((bytes) => readIfcx(decode(bytes), { id: f.url, label: f.origin, url: f.url }, LIMITS.jsonDepth)),
            ),
          ).then((files) => buildIfcxModel([...files, ...localIfcx], { id, label: schema.label }));
    models.set(id, job);
    job.catch(() => models.delete(id));
  }
  return models.get(id);
}

const app = {
  navigate(focus, view, schemaId = state.schemaId) {
    location.hash = route(schemaId, focus, view ?? (schemaId === state.schemaId ? state.view : "near"));
  },
  /** The documentation data of a model: its own for a pinned schema, by schema name for a file the user opened. */
  docs(model, part) {
    const id = schemaById(model.id) ? model.id : DOCS_BY_SCHEMA[model.schema];
    return id ? loadDocs(id, part).catch(() => null) : Promise.resolve(null);
  },
  async compare(name) {
    const express = current?.format === "express" ? current : await loadModel(CLASS_SCHEMA);
    const [ifc5, classSchema, psets] = await Promise.all([loadModel("IFC5"), loadModel(CLASS_SCHEMA), app.psets(express)]);
    return { comparison: compareEntity(name, express, ifc5, classSchema, psets), ifc5 };
  },
  /** The property and quantity set templates of an EXPRESS model's version, or null when it has none. */
  psets(model) {
    const id = schemaById(model.id) ? model.id : DOCS_BY_SCHEMA[model.schema];
    const source = schemaById(id)?.docs?.psets;
    if (!source) return Promise.resolve(null);
    const cacheKey = `psets:${model.id}`;
    if (!models.has(cacheKey)) {
      const job = fetchPinned(source, LIMITS.jsonBytes).then((bytes) => readPsetTemplates(decode(bytes), model));
      models.set(cacheKey, job);
      job.catch(() => models.delete(cacheKey));
    }
    return models.get(cacheKey).catch(() => null);
  },
  /** The three pinned EXPRESS schemas, oldest first. */
  async versions() {
    const ids = SCHEMAS.filter((s) => s.format === "express").map((s) => s.id);
    const loaded = await Promise.all(ids.map(loadModel));
    return ids.map((id, i) => ({ id, label: schemaById(id).label, model: loaded[i] }));
  },
  ifc5: () => loadModel("IFC5"),
  classSchema: () => loadModel(CLASS_SCHEMA),
};

// The route

function route(schemaId, focus, view) {
  const parts = [schemaId ?? ""];
  if (focus) parts.push(encodeURIComponent(focus));
  if (focus && view && view !== "near") parts.push(view);
  return `#/${parts.join("/")}`;
}

function parseRoute() {
  const [schemaId = "", focus = "", view = "near"] = location.hash.replace(/^#\/?/, "").split("/");
  let name = null;
  try {
    name = focus ? decodeURIComponent(focus) : null;
  } catch {
    name = null;
  }
  const known = schemaById(schemaId) || local.has(schemaId);
  return { schemaId: known ? schemaId : null, focus: name, view: VIEWS.includes(view) ? view : "near" };
}

// Status and controls

function status(text, kind = "") {
  const s = $("status");
  s.className = `status ${kind}`;
  s.textContent = text;
}

function schemaButtons() {
  const holder = $("schemas");
  const all = [...SCHEMAS.map((s) => ({ id: s.id, label: s.label })), ...[...local].map(([id, l]) => ({ id, label: l.label }))];
  replace(
    holder,
    all.map((s) =>
      el("button", { type: "button", class: "seg", "aria-pressed": s.id === state.schemaId ? "true" : "false", onclick: () => app.navigate(null, "near", s.id) }, s.label),
    ),
  );
}

function viewButtons() {
  for (const b of document.querySelectorAll("[data-view]")) {
    b.setAttribute("aria-pressed", b.dataset.view === state.view ? "true" : "false");
    const express = current?.format === "express";
    const entity = express && current.kindOf(state.focus ?? "") === "entity";
    b.disabled = !current || (b.dataset.view === "tree" && !entity) || (b.dataset.view === "compare" && !entity) || (!express && b.dataset.view === "tree");
  }
  $("depth").disabled = !current || current.format !== "express" || state.view !== "near";
}

function renderList() {
  const node = $("list");
  if (!current) return replace(node);
  const go = (name) => app.navigate(name, current.format === "ifcx" ? "near" : state.view === "compare" ? "near" : state.view);
  if (current.format === "express") renderExpressList(node, current, state.query, state.focus, go, currentPsets);
  else renderIfcxList(node, current, state.query, state.focus, go);
}

// The panel for a name

/** The structure a focus `s:<id>` names, or null. */
const structureOf = (focus) => (typeof focus === "string" && focus.startsWith("s:") ? structureById(focus.slice(2)) : null);

/** The property set a focus `p:<name>` names in the loaded templates, or null. */
const setOf = (focus) => (typeof focus === "string" && focus.startsWith("p:") && currentPsets ? currentPsets.set(focus.slice(2)) : null);

let currentPsets = null; // the templates of the model on show, when loaded

function showPanel(model, name) {
  const panel = $("panel");
  const structure = model.format === "express" ? structureOf(name) : null;
  if (structure) return panels.renderStructure(panel, model, structure, structureGraph(model, structure), app);
  const set = model.format === "express" ? setOf(name) : null;
  if (set) return panels.renderPset(panel, model, set, app);
  if (model.format === "express") {
    const kind = name ? model.kindOf(name) : null;
    if (kind === "entity") return panels.renderEntity(panel, model, name, app);
    if (kind === "select" || kind === "enum" || kind === "defined") return panels.renderType(panel, model, name, app);
    if (kind === "function" || kind === "rule" || kind === "procedure") return panels.renderAlgorithm(panel, model, name, app);
    if (kind === "simple") return panels.renderSimple(panel, model, name);
    return panels.renderExpressStart(panel, model, app);
  }
  if (name?.startsWith("ns:") && model.namespaces.has(name.slice(3))) return panels.renderNamespace(panel, model, name.slice(3), app);
  if (name && model.component(name)) return panels.renderComponent(panel, model, name, app);
  return panels.renderIfcxStart(panel, model, app);
}

/** The name a graph node stands for: an EXPRESS name, an IFC5 key or `ns:<namespace>`. */
function nameOfNode(node) {
  let id = node.id();
  if (node.data("kind") === "value") {
    if (id.startsWith("v:")) return id.slice(2, id.lastIndexOf("."));
    id = id.slice(0, id.indexOf("="));
  }
  if (id.startsWith("c:")) return id.slice(2);
  if (id.startsWith("ns:")) return id === "ns:(none)" ? "ns:" : id;
  if (id.startsWith("m:")) return id.slice(2, id.indexOf("/"));
  if (id.startsWith("pp:")) return `p:${id.slice(3, id.indexOf("."))}`;
  return id;
}

async function docUrl(model, name) {
  if (model.format === "express" && name.startsWith("p:")) {
    return safeUrl(docEntry(await app.docs(model, "properties"), name.slice(2))?.spec_url);
  }
  if (model.format === "express") {
    const kind = model.kindOf(name);
    const part = kind === "entity" ? "entities" : ["select", "enum", "defined"].includes(kind) ? "types" : null;
    if (!part) return null;
    return safeUrl(docEntry(await app.docs(model, part), name)?.spec_url);
  }
  return safeUrl(model.component(name)?.source?.url);
}

// The graph

function ensureGraph() {
  if (graph) return graph;
  graph = createGraph($("graph"), {
    async select(node, event) {
      if (!current) return;
      const name = nameOfNode(node);
      if (event && (event.ctrlKey || event.metaKey)) {
        const url = await docUrl(current, name);
        if (url) window.open(url, "_blank", "noopener,noreferrer");
        return;
      }
      state.focus = name;
      history.replaceState(null, "", route(state.schemaId, name, state.view));
      showPanel(current, name);
      renderList();
      viewButtons();
    },
    expand(node) {
      if (!current) return;
      const name = nameOfNode(node);
      if (current.format === "express" && name.startsWith("p:")) {
        app.navigate(name, "near");
      } else if (current.format === "express" && (state.view === "near" || state.view === "compare")) {
        graph.add(expansion(current, name, state.relations, currentPsets), nearLayout(true));
      } else if (current.format === "ifcx" && current.component(name)) {
        app.navigate(name, "near");
      } else if (current.format === "express") {
        app.navigate(name, "near");
      }
    },
    background() {},
  });
  return graph;
}

/** The most entities on one level of the subtree below `name` (the supertypes above it are one per level). */
function widestLevel(model, name) {
  let level = [name];
  let widest = 1;
  while (level.length) {
    level = level.flatMap((n) => model.entity(n)?.subtypes ?? []);
    widest = Math.max(widest, level.length);
  }
  return widest;
}

async function drawGraph(model, focus, token) {
  const g = ensureGraph();
  $("graph").setAttribute("aria-label", `Graph of ${focus ?? model.label}`);
  let elements;
  let layout;
  let classes = "";
  const structure = model.format === "express" ? structureOf(focus) : null;
  if (structure) {
    elements = structureGraph(model, structure).elements;
    await g.show(elements, { ...treeLayout("DOWN", 90), elk: { ...treeLayout("DOWN", 90).elk, "elk.spacing.nodeNode": 40 } });
    if (token !== renderToken) return;
    status(`${model.label}: ${structure.en}, ${elements.filter((e) => e.group === "nodes").length} nodes. Click a name for its details, double-click to expand.`);
    return;
  }
  const set = model.format === "express" ? setOf(focus) : null;
  if (set) {
    elements = psetGraph(model, set);
    await g.show(elements, nearLayout());
    if (token !== renderToken) return;
    status(`${model.label}: ${set.name}, ${set.properties.length} properties, applies to ${set.applicable.length}. Click for details, Ctrl+click to open the standard.`);
    return;
  }
  if (model.format === "express") {
    const name = focus && model.kindOf(focus) ? focus : model.entity("IfcRoot") ? "IfcRoot" : model.roots()[0];
    const isEntity = model.kindOf(name) === "entity";
    if (state.view === "all") {
      elements = inheritanceTree(model, name, { whole: true });
      layout = treeLayout();
      classes = "tree";
    } else if (state.view === "tree" && isEntity) {
      elements = inheritanceTree(model, name);
      const down = widestLevel(model, name) * 150 <= g.cy.width();
      layout = treeLayout(down ? "DOWN" : "RIGHT");
      classes = down ? "tree down" : "tree";
    } else if (state.view === "compare" && isEntity) {
      status("Loading IFC5 for the comparison…");
      const { comparison, ifc5 } = await app.compare(name);
      if (token !== renderToken) return;
      elements = comparisonGraph(model, comparison, ifc5);
      layout = nearLayout();
    } else {
      elements = neighbourhood(model, name, { depth: state.depth, relations: state.relations, psets: currentPsets });
      layout = nearLayout();
    }
    await g.show(elements, layout, classes);
    // A large tree fits the view at a zoom where labels cannot be read; then go to the focus instead.
    const large = elements.length > 120 && g.cy.zoom() < 0.6;
    if (token === renderToken) g.focus(model.canonical(name), classes.startsWith("tree") && large);
  } else {
    const component = focus && model.component(focus);
    elements = component && state.view !== "all" ? ifcxComponent(model, focus) : ifcxOverview(model);
    await g.show(elements, nearLayout());
    if (token !== renderToken) return;
    if (component) g.focus(`c:${focus}`);
    else if (focus?.startsWith("ns:")) g.focus(`ns:${focus.slice(3) || "(none)"}`);
  }
  const nodes = elements.filter((e) => e.group === "nodes").length;
  status(`${model.label}: ${nodes} nodes in the graph. Click for details, double-click to expand, Ctrl+click to open the standard.`);
}

// Rendering a route

async function render() {
  const token = ++renderToken;
  const r = parseRoute();
  if (r.schemaId !== state.schemaId && state.query) {
    // A search belongs to the schema it was typed in.
    state.query = "";
    $("search").value = "";
  }
  state.schemaId = r.schemaId;
  state.focus = r.focus;
  state.view = r.view;
  schemaButtons();
  if (!state.schemaId) {
    current = null;
    document.body.classList.add("start");
    viewButtons();
    renderList();
    status("Pick a schema, or open your own .exp or .ifcx file.");
    return;
  }
  document.body.classList.remove("start");
  const info = schemaById(state.schemaId);
  status(`Loading ${info?.label ?? state.schemaId}…`);
  let model;
  try {
    model = await loadModel(state.schemaId);
  } catch (error) {
    if (token === renderToken) status(`Could not load ${info?.label ?? state.schemaId}: ${error.message}`, "error");
    return;
  }
  if (token !== renderToken) return;
  current = model;
  // The property set templates are needed for a set, and for the neighbourhood's `pset` relation.
  const wantSets = model.format === "express" && (state.focus?.startsWith("p:") || state.relations.has("pset"));
  if (wantSets && state.focus?.startsWith("p:")) status(`Loading the property set templates of ${model.label}…`);
  currentPsets = wantSets ? await app.psets(model) : null;
  if (token !== renderToken) return;
  if (model.format === "ifcx" && state.view !== "all") state.view = "near";
  let missing = null;
  const known =
    model.format === "express"
      ? model.kindOf(state.focus ?? "") || structureOf(state.focus) || setOf(state.focus)
      : model.component(state.focus ?? "") || state.focus?.startsWith("ns:");
  if (state.focus && !known) {
    missing = `${state.focus} is not in ${model.label}.`;
    state.focus = null;
  }
  const special = structureOf(state.focus) || setOf(state.focus);
  if (state.focus && model.format === "express" && !special) state.focus = model.canonical(state.focus);
  if (special) state.view = "near";
  $("source").textContent = info ? info.notice : `${local.get(state.schemaId)?.label} (opened from your computer)`;
  viewButtons();
  renderList();
  showPanel(model, state.focus);
  try {
    await drawGraph(model, state.focus, token);
  } catch (error) {
    if (token === renderToken) status(`The graph could not be drawn: ${error.message}`, "error");
    return;
  }
  if (missing && token === renderToken) status(missing, "error");
}

// Files the user opens

async function openFiles(files) {
  for (const file of files) {
    const isExpress = /\.exp$/i.test(file.name);
    try {
      const read = await readLocalFile(file, isExpress ? LIMITS.expressBytes : LIMITS.jsonBytes);
      if (isExpress) {
        const id = `local${local.size + 1}`;
        const model = buildModel(read.text, { id, label: file.name });
        local.set(id, { label: file.name, model });
        status(`${file.name}: ${model.counts().entities} entities, ${model.counts().types} types.`);
        app.navigate(null, "near", id);
      } else {
        localIfcx.push(readIfcx(read.text, { id: `file:${file.name}`, label: `${file.name} (your file)` }, LIMITS.jsonDepth));
        models.delete("IFC5");
        app.navigate(null, "near", "IFC5");
        if (state.schemaId === "IFC5") render();
      }
    } catch (error) {
      status(`${file.name} could not be read: ${error.message}`, "error");
    }
  }
}

// Theme

const THEMES = ["system", "light", "dark"];

function applyTheme(theme) {
  if (theme === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
  $("theme").textContent = `Theme: ${theme}`;
  graph?.restyle();
}

function storedTheme() {
  try {
    const t = localStorage.getItem("ifc-schema-viewer.theme");
    return THEMES.includes(t) ? t : "system";
  } catch {
    return "system";
  }
}

// Wiring

function wire() {
  for (const b of document.querySelectorAll("[data-view]")) {
    b.addEventListener("click", () => app.navigate(state.focus, b.dataset.view));
  }
  $("depth").addEventListener("change", (event) => {
    state.depth = Number(event.target.value) === 2 ? 2 : 1;
    render();
  });
  const relations = $("relations");
  for (const r of RELATIONS.filter((x) => x !== "ifc5")) {
    const box = el("input", { type: "checkbox", value: r, checked: state.relations.has(r) });
    box.addEventListener("change", () => {
      if (box.checked) state.relations.add(r);
      else state.relations.delete(r);
      render();
    });
    relations.append(el("label", { class: "check" }, box, ` ${r}`));
  }
  $("search").addEventListener("input", (event) => {
    state.query = event.target.value;
    renderList();
  });
  $("search").addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    const first = $("list").querySelector("button.item");
    first?.click();
  });
  $("fit").addEventListener("click", () => graph?.fit());
  $("path").addEventListener("click", () => {
    if (!graph || !current || current.format !== "express" || !state.focus) return;
    graph.highlight(current.kindOf(state.focus) === "entity" ? [state.focus, ...current.ancestors(state.focus)] : []);
  });
  $("clear").addEventListener("click", () => graph?.highlight([]));
  $("png").addEventListener("click", async () => {
    if (!graph) return;
    const blob = await graph.png();
    const url = URL.createObjectURL(blob);
    const a = el("a", { href: url, download: `${state.schemaId ?? "graph"}-${state.focus ?? "overview"}.png`.replace(/[^A-Za-z0-9_.-]+/g, "_") });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  });
  $("file").addEventListener("change", (event) => {
    openFiles([...event.target.files]);
    event.target.value = "";
  });
  $("theme").addEventListener("click", () => {
    const next = THEMES[(THEMES.indexOf(storedTheme()) + 1) % THEMES.length];
    try {
      localStorage.setItem("ifc-schema-viewer.theme", next);
    } catch {
      // The choice then lasts only for this page.
    }
    applyTheme(next);
  });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => graph?.restyle());
  for (const b of document.querySelectorAll("[data-start]")) {
    b.addEventListener("click", () => app.navigate(null, "near", b.dataset.start));
  }
  window.addEventListener("hashchange", render);
}

$("boot").remove();
applyTheme(storedTheme());
wire();
render();
