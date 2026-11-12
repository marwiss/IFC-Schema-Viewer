// This file was generated with the assistance of an AI coding tool.
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * Links to the standards' web pages and short descriptions, from IfcOpenShell's documentation data (`spec_url` and
 * `description` for each entity, type and property set, scraped from buildingSMART's pages). A link is only made when
 * the address is https, starts with one of DOC_PREFIXES and, where a name is put into it, the name is a plain EXPRESS
 * name; anything else gives no link.
 */

import { fetchPinned, decode, parseJson } from "./load.js";
import { schemaById, LIMITS } from "./sources.js";

export const DOC_PREFIXES = [
  "https://standards.buildingsmart.org/IFC/RELEASE/",
  "https://ifc43-docs.standards.buildingsmart.org/IFC/RELEASE/IFC4x3/HTML/",
  "https://identifier.buildingsmart.org/uri/buildingsmart/",
  "https://ifcx.dev/",
];

const IFC43 = "https://ifc43-docs.standards.buildingsmart.org/IFC/RELEASE/IFC4x3/HTML/";
const BSDD_IFC43 = "https://identifier.buildingsmart.org/uri/buildingsmart/ifc/4.3/";
const NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** The address if it may be linked, else null. */
export function safeUrl(value) {
  if (typeof value !== "string" || value.length > 2000) return null;
  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password) return null;
  return DOC_PREFIXES.some((p) => url.href.startsWith(p)) ? url.href : null;
}

export const isName = (name) => typeof name === "string" && NAME.test(name);

/** The IFC 4.3 page of an entity, type, property set or quantity set by name. */
export const ifc43PageUrl = (name) => (isName(name) ? safeUrl(`${IFC43}lexical/${name}.htm`) : null);

/** The IFC 4.3 page of a property by name. */
export const ifc43PropertyUrl = (name) => (isName(name) ? safeUrl(`${IFC43}property/${name}.htm`) : null);

/** The bSDD URI of an IFC 4.3 class, as IFC5 data writes it in `bsi::ifc::class`. */
export const bsddClassUri = (code) => (isName(code) ? safeUrl(`${BSDD_IFC43}class/${code}`) : null);

const loaded = new Map();

/** The documentation data `part` (`entities`, `types`, `properties`) of a schema, by upper-case name, or null. */
export function loadDocs(schemaId, part) {
  const source = schemaById(schemaId)?.docs?.[part];
  if (!source) return Promise.resolve(null);
  const id = `${schemaId}/${part}`;
  if (!loaded.has(id)) {
    const job = fetchPinned(source, LIMITS.jsonBytes).then((bytes) => {
      const json = parseJson(decode(bytes), LIMITS.jsonDepth);
      const map = new Map();
      if (json && typeof json === "object") {
        for (const [name, entry] of Object.entries(json)) {
          if (entry && typeof entry === "object") map.set(name.toUpperCase(), { name, ...entry });
        }
      }
      return map;
    });
    loaded.set(id, job);
    job.catch(() => loaded.delete(id));
  }
  return loaded.get(id);
}

/** The entry of a name in loaded documentation data. */
export const docEntry = (docs, name) => (docs && typeof name === "string" ? docs.get(name.toUpperCase()) ?? null : null);

/** The first paragraph of a description, whitespace collapsed and shortened. */
export function summary(text, max = 600) {
  if (typeof text !== "string") return "";
  const first = text.split(/\n\s*\n/)[0].replace(/\s+/g, " ").trim();
  return first.length > max ? `${first.slice(0, max - 1).trimEnd()}…` : first;
}

/** The property sets (and quantity sets) that have a property `name`: `[{name, url, description}]`. */
export function setsWithProperty(properties, name) {
  if (!properties || !isName(name)) return [];
  const found = [];
  for (const entry of properties.values()) {
    const props = entry.properties && typeof entry.properties === "object" ? entry.properties : {};
    if (Object.prototype.hasOwnProperty.call(props, name)) {
      found.push({ name: entry.name, url: safeUrl(entry.spec_url), description: summary(props[name]?.description, 300) });
    }
  }
  return found.sort((a, b) => a.name.localeCompare(b.name));
}
