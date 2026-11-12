// This file was generated with the assistance of an AI coding tool.
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * Building DOM without parsing HTML: every text, including all text from the schema files, goes in as a Text node, so
 * nothing from a schema can become markup or script.
 */

import { safeUrl } from "../docs.js";

/** `el("p", {class: "x"}, "text", child, …)`; attributes starting with "on" take a listener. */
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else if (k === "class") node.className = v;
    else if (k === "dataset") Object.assign(node.dataset, v);
    else node.setAttribute(k, v === true ? "" : String(v));
  }
  append(node, children);
  return node;
}

export function append(node, children) {
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

/** Replace the children of `node`. */
export function replace(node, ...children) {
  node.replaceChildren();
  return append(node, children);
}

/** A link that opens in a new tab, made only from an allowed address; null otherwise. */
export function extLink(url, text, title) {
  const href = safeUrl(url);
  if (!href) return null;
  return el("a", { href, target: "_blank", rel: "noopener noreferrer", class: "ext", title: title ?? href }, text);
}

/** A button that looks like a link and navigates inside the page. */
export function nav(text, onclick, title) {
  return el("button", { type: "button", class: "nav", onclick, title }, text);
}
