// This file was generated with the assistance of an AI coding tool.
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * The graph's look, after EXPRESS-G (ISO 10303-11, annex D): an entity is a solid box, an abstract one is marked
 * "(ABS)", defined types are dashed boxes, simple types have a double border; subtype lines are thick, attribute lines
 * thin with an open circle at the end they point to, optional attributes dashed, derived and inverse ones dotted. The
 * colours come from the --dm-* tokens, read when the style is built, so the graph follows the light and dark themes.
 */

const TOKENS = [
  "--dm-font-sans", "--dm-text", "--dm-text-muted", "--dm-text-faint", "--dm-surface", "--dm-surface-2", "--dm-bg",
  "--dm-border", "--dm-border-strong", "--dm-accent", "--dm-accent-soft", "--dm-selection",
  "--dm-cat-1", "--dm-cat-2", "--dm-cat-3", "--dm-cat-4", "--dm-cat-5", "--dm-cat-6", "--dm-cat-8",
];

/** The tokens' current values. */
export function readTokens(root = document.documentElement) {
  const css = getComputedStyle(root);
  const t = {};
  for (const name of TOKENS) t[name.slice(5)] = css.getPropertyValue(name).trim();
  return t;
}

/** The Cytoscape stylesheet for the current tokens. */
export function graphStyle(t) {
  const label = {
    label: "data(label)",
    "font-family": t["font-sans"],
    "font-size": 11,
    color: t.text,
    "text-valign": "center",
    "text-halign": "center",
    "min-zoomed-font-size": 3,
  };
  return [
    {
      selector: "node",
      style: {
        ...label,
        shape: "rectangle",
        height: 24,
        "background-color": t.surface,
        "border-width": 1,
        "border-color": t["text-muted"],
      },
    },
    { selector: "node[w]", style: { width: "data(w)" } },
    { selector: 'node[kind = "entity"]', style: { "border-width": 1.5, "border-color": t["cat-1"] } },
    { selector: "node[?abstract]", style: { "font-style": "italic" } },
    { selector: 'node[kind = "defined"]', style: { "border-style": "dashed", "border-color": t["cat-3"] } },
    { selector: 'node[kind = "select"]', style: { shape: "cut-rectangle", "border-style": "dashed", "border-color": t["cat-2"] } },
    { selector: 'node[kind = "enum"]', style: { shape: "round-rectangle", "border-style": "dashed", "border-color": t["cat-6"] } },
    { selector: 'node[kind = "simple"]', style: { "border-style": "double", "border-width": 3, "border-color": t["cat-8"] } },
    { selector: 'node[kind = "function"], node[kind = "rule"], node[kind = "procedure"]', style: { shape: "ellipse", "border-style": "dotted" } },
    { selector: 'node[kind = "unknown"]', style: { "border-style": "dotted", color: t["text-faint"] } },
    { selector: 'node[kind = "value"]', style: { height: 18, "font-size": 9, color: t["text-muted"], "border-color": t.border, shape: "round-rectangle" } },
    { selector: 'node[kind = "component"]', style: { shape: "round-rectangle", "border-width": 1.5, "border-color": t["cat-4"] } },
    { selector: 'node[kind = "member"]', style: { shape: "round-rectangle", "font-size": 10, "border-color": t["cat-4"], "border-style": "dashed" } },
    {
      selector: 'node[kind = "namespace"]',
      style: {
        shape: "round-rectangle",
        "background-color": t["surface-2"],
        "background-opacity": 0.6,
        "border-color": t["border-strong"],
        "border-width": 1,
        "text-valign": "top",
        "text-halign": "center",
        "font-weight": 600,
        color: t["text-muted"],
        padding: 12,
      },
    },
    { selector: "node[more]", style: { "border-width": 2.5 } },
    { selector: "node[?focus]", style: { "border-width": 3, "border-color": t.accent, "background-color": t["accent-soft"] } },
    { selector: "node:selected", style: { "overlay-color": t.accent, "overlay-opacity": 0.18, "overlay-padding": 4 } },
    { selector: "node.faded, edge.faded", style: { opacity: 0.25 } },
    { selector: "node.path", style: { "border-color": t.accent, "border-width": 2.5 } },
    {
      selector: "edge",
      style: {
        width: 1,
        "curve-style": "bezier",
        "line-color": t["text-muted"],
        "target-arrow-color": t["text-muted"],
        "target-arrow-shape": "circle",
        "target-arrow-fill": "hollow",
        "arrow-scale": 0.8,
        "font-family": t["font-sans"],
        "font-size": 9,
        color: t["text-muted"],
        "text-background-color": t.bg,
        "text-background-opacity": 0.85,
        "text-background-padding": 1,
        "text-rotation": "autorotate",
        "min-zoomed-font-size": 7,
      },
    },
    { selector: "edge[label]", style: { label: "data(label)" } },
    { selector: 'edge[kind = "subtype"]', style: { width: 3, "line-color": t["cat-1"], "target-arrow-color": t["cat-1"] } },
    { selector: 'edge[kind = "subtype"][?oneof]', style: { "source-label": "1", "source-text-offset": 14, "font-size": 10, color: t["cat-1"] } },
    { selector: "edge[?optional]", style: { "line-style": "dashed" } },
    { selector: 'edge[kind = "derive"]', style: { "line-style": "dotted", "line-color": t["cat-3"], "target-arrow-color": t["cat-3"] } },
    { selector: 'edge[kind = "inverse"]', style: { "line-style": "dotted", "line-color": t["cat-5"], "target-arrow-color": t["cat-5"] } },
    { selector: 'edge[kind = "select"]', style: { "line-color": t["cat-2"], "target-arrow-color": t["cat-2"] } },
    { selector: 'edge[kind = "underlying"]', style: { "line-color": t["cat-3"], "target-arrow-color": t["cat-3"] } },
    { selector: 'edge[kind = "value"]', style: { "line-color": t.border, "target-arrow-shape": "none" } },
    { selector: 'edge[kind = "uses"]', style: { "line-style": "dotted", "line-color": t["text-faint"], "target-arrow-color": t["text-faint"], "target-arrow-shape": "vee" } },
    { selector: 'edge[kind = "reverse"]', style: { "line-color": t["text-faint"], "target-arrow-color": t["text-faint"] } },
    { selector: 'edge[kind = "member"]', style: { "line-color": t["cat-4"], "target-arrow-color": t["cat-4"] } },
    { selector: 'edge[kind = "ifc5"]', style: { "line-style": "dashed", "line-color": t["cat-4"], "target-arrow-color": t["cat-4"], "target-arrow-shape": "vee" } },
    { selector: "edge.tree", style: { "curve-style": "taxi", "taxi-direction": "rightward", "taxi-turn": 16 } },
    { selector: "edge.down", style: { "taxi-direction": "downward" } },
    { selector: "edge:selected", style: { width: 2.5, "line-color": t.accent, "target-arrow-color": t.accent } },
  ];
}
