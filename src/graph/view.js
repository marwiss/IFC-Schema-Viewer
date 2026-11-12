// This file was generated with the assistance of an AI coding tool.
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * The Cytoscape surface: one instance for the page, filled with the elements from elements.js and laid out with ELK
 * (the inheritance tree) or fCoSE (neighbourhoods, IFC5). Cytoscape, its layouts and ELK are the vendored UMD files,
 * loaded as classic scripts before this module, so they are globals here.
 */

import { graphStyle, readTokens } from "./style.js";

const g = globalThis;
let registered = false;

function register() {
  if (registered) return;
  if (!g.cytoscape) throw new Error("Cytoscape did not load");
  if (g.cytoscapeFcose) g.cytoscape.use(g.cytoscapeFcose);
  if (g.cytoscapeElk) g.cytoscape.use(g.cytoscapeElk);
  registered = true;
}

/** ELK's layered (Sugiyama) layout for trees, supertypes to the left (RIGHT) or at the top (DOWN). */
export function treeLayout(direction = "RIGHT") {
  const algorithm = "layered";
  return {
    name: "elk",
    fit: true,
    padding: 24,
    animate: false,
    nodeDimensionsIncludeLabels: false,
    elk: {
      algorithm,
      "elk.direction": direction,
      "elk.spacing.nodeNode": 10,
      "elk.layered.spacing.nodeNodeBetweenLayers": 32,
      "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",
    },
  };
}

/** fCoSE for neighbourhoods and the IFC5 namespaces; `keep` lays out new nodes around those already placed. */
export function nearLayout(keep = false) {
  return {
    name: "fcose",
    quality: "default",
    randomize: !keep,
    animate: keep,
    animationDuration: 300,
    fit: !keep,
    padding: 24,
    nodeDimensionsIncludeLabels: true,
    idealEdgeLength: (edge) => (edge.data("kind") === "value" ? 40 : 110),
    nodeRepulsion: 9000,
    nodeSeparation: 70,
    edgeElasticity: 0.3,
    nestingFactor: 0.15,
    gravity: 0.2,
    tile: true,
  };
}

/** Create the graph in `container`; `on` has `select(node, event)`, `expand(node)` and `background()`. */
export function createGraph(container, on) {
  register();
  const cy = g.cytoscape({
    container,
    style: graphStyle(readTokens()),
    minZoom: 0.05,
    maxZoom: 3,
    boxSelectionEnabled: false,
    selectionType: "single",
  });
  cy.on("tap", "node", (event) => on.select(event.target, event.originalEvent));
  cy.on("dbltap", "node", (event) => on.expand(event.target));
  cy.on("tap", (event) => {
    if (event.target === cy) on.background();
  });

  let running = null;
  const view = {
    cy,

    /** Replace the graph with `elements` and lay it out. */
    show(elements, layout, classes = "") {
      running?.stop();
      cy.resize();
      cy.batch(() => {
        cy.elements().remove();
        cy.add(elements);
        if (classes) cy.edges().addClass(classes);
      });
      running = cy.layout(layout);
      return new Promise((resolve) => {
        running.one("layoutstop", () => {
          // A small graph is not blown up beyond a readable size.
          if (cy.zoom() > 1.25) {
            cy.zoom(1.25);
            cy.center();
          }
          resolve();
        });
        running.run();
      });
    },

    /** Add `elements` around those shown and lay out again, keeping positions. */
    add(elements, layout) {
      const before = new Set(cy.nodes().map((n) => n.id()));
      const added = cy.add(elements.filter((e) => cy.getElementById(e.data.id).empty()));
      const fresh = added.nodes().filter((n) => !before.has(n.id()));
      const anchor = cy.nodes(":selected").first();
      if (anchor.nonempty()) fresh.positions(() => ({ x: anchor.position("x") + (Math.random() - 0.5) * 60, y: anchor.position("y") + (Math.random() - 0.5) * 60 }));
      running?.stop();
      running = cy.layout(layout);
      running.run();
      return added;
    },

    /** Remove the neighbours of `node` that hang on it alone. */
    collapse(node) {
      const leaves = node.neighborhood("node").filter((n) => n.degree(false) === 1 && !n.data("focus"));
      cy.remove(leaves);
    },

    /** Mark `ids` (a path) and fade the rest; an empty list clears it. */
    highlight(ids) {
      cy.batch(() => {
        cy.elements().removeClass("faded path");
        if (!ids.length) return;
        const set = new Set(ids);
        const nodes = cy.nodes().filter((n) => set.has(n.id()));
        const edges = nodes.edgesWith(nodes);
        cy.elements().difference(nodes.union(edges)).addClass("faded");
        nodes.addClass("path");
      });
    },

    /** Select a node; with `center`, also move it into the middle (when the graph is larger than the view). */
    focus(id, center = false) {
      const n = cy.getElementById(id);
      if (n.empty()) return false;
      cy.elements().unselect();
      n.select();
      if (center) cy.animate({ zoom: Math.max(cy.zoom(), 0.75), center: { eles: n }, duration: 250 });
      return true;
    },

    fit: () => cy.fit(undefined, 24),
    restyle: () => cy.style(graphStyle(readTokens())),
    png: () => cy.png({ output: "blob", full: true, scale: 2, bg: readTokens().bg }),
  };
  return view;
}
