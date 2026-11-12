// This file was generated with the assistance of an AI coding tool.
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * A parser for the parts of EXPRESS (ISO 10303-11) that the IFC schemas use: SCHEMA, TYPE (simple, aggregate, named,
 * SELECT, ENUMERATION, WHERE) and ENTITY (ABSTRACT, SUPERTYPE OF, SUBTYPE OF, explicit attributes with OPTIONAL and
 * SELF\X.Y redeclarations, DERIVE, INVERSE, UNIQUE, WHERE). FUNCTION, RULE and PROCEDURE are kept by name and source
 * span; CONSTANT, SUBTYPE_CONSTRAINT, USE and REFERENCE are skipped and counted. The text of the schema is data: it is
 * never evaluated, only split and quoted.
 */

import { tokenize } from "./lexer.js";

export const SIMPLE_TYPES = new Set(["REAL", "INTEGER", "NUMBER", "BOOLEAN", "LOGICAL", "STRING", "BINARY"]);
const AGGREGATES = new Set(["LIST", "SET", "BAG", "ARRAY"]);
const ALGORITHMS = { FUNCTION: "END_FUNCTION", RULE: "END_RULE", PROCEDURE: "END_PROCEDURE" };
const SKIPPED = { CONSTANT: "END_CONSTANT", SUBTYPE_CONSTRAINT: "END_SUBTYPE_CONSTRAINT" };
const TOP = new Set(["SCHEMA", "END_SCHEMA", "TYPE", "ENTITY", "USE", "REFERENCE", ...Object.keys(ALGORITHMS), ...Object.keys(SKIPPED)]);
const ENTITY_SECTIONS = new Set(["DERIVE", "INVERSE", "UNIQUE", "WHERE", "END_ENTITY"]);
const OPEN = { "(": ")", "[": "]", "{": "}" };
const CLOSE = new Set([")", "]", "}"]);

class Cursor {
  constructor(tokens, text) {
    this.tokens = tokens;
    this.text = text;
    this.i = 0;
    for (const token of tokens) token.u = token.t === "id" ? token.v.toUpperCase() : token.v;
  }

  done() {
    return this.i >= this.tokens.length;
  }

  peek(k = 0) {
    return this.tokens[this.i + k];
  }

  last() {
    return this.tokens[this.i - 1];
  }

  next() {
    const token = this.tokens[this.i++];
    if (!token) throw new SyntaxError("unexpected end of schema");
    return token;
  }

  word(k = 0) {
    const token = this.peek(k);
    return token && token.t === "id" ? token.u : null;
  }

  isWord(w, k = 0) {
    return this.word(k) === w;
  }

  isOp(v, k = 0) {
    const token = this.peek(k);
    return Boolean(token) && token.t === "op" && token.v === v;
  }

  optWord(w) {
    if (!this.isWord(w)) return false;
    this.i++;
    return true;
  }

  optOp(v) {
    if (!this.isOp(v)) return false;
    this.i++;
    return true;
  }

  expectWord(w) {
    if (!this.isWord(w)) throw this.error(`expected ${w}`);
    return this.next();
  }

  expectOp(v) {
    if (!this.isOp(v)) throw this.error(`expected "${v}"`);
    return this.next();
  }

  name() {
    const token = this.peek();
    if (!token || token.t !== "id") throw this.error("expected a name");
    this.i++;
    return token.v;
  }

  error(message) {
    const token = this.peek();
    const found = token ? `"${token.v.slice(0, 40)}"` : "the end";
    const error = new SyntaxError(`${message}, found ${found}`);
    error.at = token ? token.s : this.text.length;
    return error;
  }

  /** Consume tokens up to (not including) a `stop` operator at depth 0; returns the source text and the names in it. */
  until(stops) {
    const first = this.peek();
    let depth = 0;
    const ids = new Set();
    while (!this.done()) {
      const token = this.peek();
      if (token.t === "op") {
        if (depth === 0 && stops.has(token.v)) break;
        if (OPEN[token.v]) depth++;
        else if (CLOSE.has(token.v)) {
          if (depth === 0) break;
          depth--;
        }
      } else if (token.t === "id") {
        ids.add(token.v);
      } else if (token.t === "str") {
        // TYPEOF tests name types in strings: 'IFC4.IFCWALLTYPE'.
        const typed = /^'[A-Za-z0-9_]+\.([A-Za-z_][A-Za-z0-9_]*)'$/.exec(token.v);
        if (typed) ids.add(typed[1]);
      }
      this.i++;
    }
    const lastToken = this.last();
    const text = first && lastToken && lastToken.e > first.s && this.i > 0 ? this.text.slice(first.s, lastToken.e) : "";
    return { text, ids: [...ids] };
  }

  /** The text inside a balanced pair of parentheses, which must come next. */
  parenthesised() {
    this.expectOp("(");
    const inner = this.until(new Set());
    this.expectOp(")");
    return inner;
  }

  names() {
    this.expectOp("(");
    const names = [this.name()];
    while (this.optOp(",")) names.push(this.name());
    this.expectOp(")");
    return names;
  }
}

function bounds(c) {
  c.expectOp("[");
  const lower = c.until(new Set([":"])).text;
  c.expectOp(":");
  const upper = c.until(new Set()).text;
  c.expectOp("]");
  return { lower, upper };
}

/** A type expression: `{kind: 'simple' | 'named' | 'aggregate' | 'generic', …}`. */
function typeExpr(c) {
  const w = c.word();
  if (w && AGGREGATES.has(w)) {
    c.next();
    const b = c.isOp("[") ? bounds(c) : { lower: null, upper: null };
    c.expectWord("OF");
    const optional = c.optWord("OPTIONAL");
    const unique = c.optWord("UNIQUE");
    return { kind: "aggregate", agg: w, lower: b.lower, upper: b.upper, optional, unique, of: typeExpr(c) };
  }
  if (w && SIMPLE_TYPES.has(w)) {
    c.next();
    let width = null;
    let fixed = false;
    if (c.isOp("(")) {
      width = c.parenthesised().text;
      fixed = c.optWord("FIXED");
    }
    return { kind: "simple", name: w, width, fixed };
  }
  if (w === "GENERIC" || w === "GENERIC_ENTITY" || w === "AGGREGATE") {
    c.next();
    if (c.optOp(":")) c.name();
    if (w === "AGGREGATE") {
      c.expectWord("OF");
      return { kind: "generic", name: w, of: typeExpr(c) };
    }
    return { kind: "generic", name: w };
  }
  return { kind: "named", name: c.name() };
}

function underlyingType(c) {
  const extensible = c.optWord("EXTENSIBLE");
  const genericEntity = c.optWord("GENERIC_ENTITY");
  if (c.optWord("SELECT")) {
    let basedOn = null;
    let items = [];
    if (c.optWord("BASED_ON")) {
      basedOn = c.name();
      if (c.optWord("WITH")) items = c.names();
    } else if (c.isOp("(")) {
      items = c.names();
    }
    return { kind: "select", items, basedOn, extensible, genericEntity };
  }
  if (c.optWord("ENUMERATION")) {
    let basedOn = null;
    let items = [];
    if (c.optWord("OF")) items = c.names();
    else if (c.optWord("BASED_ON")) {
      basedOn = c.name();
      if (c.optWord("WITH")) items = c.names();
    }
    return { kind: "enum", items, basedOn, extensible };
  }
  return typeExpr(c);
}

/** Labelled rules (WHERE, UNIQUE) up to one of the `stops` words. */
function rules(c, stops) {
  const found = [];
  while (!c.done() && !stops.has(c.word())) {
    const start = c.peek().s;
    let label = null;
    if (c.peek().t === "id" && c.isOp(":", 1)) {
      label = c.next().v;
      c.next();
    }
    const expr = c.until(new Set([";"]));
    c.expectOp(";");
    found.push({ label, expr: expr.text, ids: expr.ids, s: start, e: c.last().e });
  }
  return found;
}

/** The names before ":" in an attribute declaration; each may be `SELF\Entity.Attribute [RENAMED name]`. */
function attributeNames(c) {
  const names = [];
  do {
    if (c.isWord("SELF") && c.isOp("\\", 1)) {
      c.next();
      c.next();
      const entity = c.name();
      c.expectOp(".");
      const attribute = c.name();
      const renamed = c.optWord("RENAMED") ? c.name() : null;
      names.push({ name: renamed ?? attribute, redeclares: { entity, attribute } });
    } else {
      names.push({ name: c.name(), redeclares: null });
    }
  } while (c.optOp(","));
  c.expectOp(":");
  return names;
}

function parseType(c) {
  const start = c.expectWord("TYPE").s;
  const name = c.name();
  c.expectOp("=");
  const underlying = underlyingType(c);
  c.expectOp(";");
  const where = c.optWord("WHERE") ? rules(c, new Set(["END_TYPE"])) : [];
  c.expectWord("END_TYPE");
  c.expectOp(";");
  return { name, underlying, where, s: start, e: c.last().e };
}

function parseEntity(c) {
  const start = c.expectWord("ENTITY").s;
  const name = c.name();
  let abstract = false;
  let supertypeOf = null;
  let supertypes = [];
  while (!c.isOp(";")) {
    if (c.optWord("ABSTRACT")) {
      abstract = true;
    } else if (c.optWord("SUPERTYPE")) {
      if (c.optWord("OF")) supertypeOf = c.parenthesised().text;
    } else if (c.optWord("SUBTYPE")) {
      c.expectWord("OF");
      supertypes = c.names();
    } else {
      throw c.error("expected ABSTRACT, SUPERTYPE, SUBTYPE or \";\"");
    }
  }
  c.expectOp(";");
  const explicit = [];
  while (!c.done() && !ENTITY_SECTIONS.has(c.word())) {
    const s = c.peek().s;
    const names = attributeNames(c);
    const optional = c.optWord("OPTIONAL");
    const type = typeExpr(c);
    c.expectOp(";");
    const e = c.last().e;
    for (const n of names) explicit.push({ ...n, optional, type, s, e });
  }
  const derive = [];
  if (c.optWord("DERIVE")) {
    while (!c.done() && !ENTITY_SECTIONS.has(c.word())) {
      const s = c.peek().s;
      const names = attributeNames(c);
      const type = typeExpr(c);
      c.expectOp(":=");
      const expr = c.until(new Set([";"]));
      c.expectOp(";");
      const e = c.last().e;
      for (const n of names) derive.push({ ...n, type, expr: expr.text, ids: expr.ids, s, e });
    }
  }
  const inverse = [];
  if (c.optWord("INVERSE")) {
    while (!c.done() && !ENTITY_SECTIONS.has(c.word())) {
      const s = c.peek().s;
      const names = attributeNames(c);
      let agg = null;
      let lower = null;
      let upper = null;
      if (c.isWord("SET") || c.isWord("BAG")) {
        agg = c.next().u;
        if (c.isOp("[")) ({ lower, upper } = bounds(c));
        c.expectWord("OF");
      }
      const entity = c.name();
      c.expectWord("FOR");
      let forEntity = null;
      let forAttribute = c.name();
      if (c.optOp(".")) {
        forEntity = forAttribute;
        forAttribute = c.name();
      }
      c.expectOp(";");
      const e = c.last().e;
      for (const n of names) inverse.push({ ...n, agg, lower, upper, entity, forEntity, forAttribute, s, e });
    }
  }
  const unique = c.optWord("UNIQUE") ? rules(c, ENTITY_SECTIONS) : [];
  const where = c.optWord("WHERE") ? rules(c, ENTITY_SECTIONS) : [];
  c.expectWord("END_ENTITY");
  c.expectOp(";");
  return { name, abstract, supertypeOf, supertypes, explicit, derive, inverse, unique, where, s: start, e: c.last().e };
}

function skipBlock(c, keyword, end) {
  const start = c.next().s;
  const name = c.peek() && c.peek().t === "id" ? c.peek().v : "";
  let depth = 1;
  while (!c.done()) {
    const w = c.word();
    c.next();
    if (w === keyword) depth++;
    else if (w === end && --depth === 0) {
      c.optOp(";");
      return { kind: keyword, name, s: start, e: c.last().e };
    }
  }
  throw new SyntaxError(`${keyword} ${name} has no ${end}`);
}

function recover(c) {
  c.i++;
  while (!c.done() && !TOP.has(c.word())) c.i++;
}

/**
 * Parse EXPRESS text into declarations: `{schema, entities, types, algorithms, skipped, errors}`. A declaration that
 * cannot be read is reported in `errors` (with its offset) and skipped; the rest of the schema is still read.
 */
export function parseExpress(text) {
  const c = new Cursor(tokenize(text), text);
  const out = { schema: null, entities: [], types: [], algorithms: [], skipped: [], errors: [] };
  while (!c.done()) {
    const w = c.word();
    const at = c.peek().s;
    try {
      if (w === "SCHEMA") {
        c.next();
        out.schema = c.name();
        c.until(new Set([";"]));
        c.expectOp(";");
      } else if (w === "END_SCHEMA") {
        c.next();
        c.optOp(";");
      } else if (w === "TYPE") {
        out.types.push(parseType(c));
      } else if (w === "ENTITY") {
        out.entities.push(parseEntity(c));
      } else if (w && ALGORITHMS[w]) {
        out.algorithms.push(skipBlock(c, w, ALGORITHMS[w]));
      } else if (w && SKIPPED[w]) {
        out.skipped.push(skipBlock(c, w, SKIPPED[w]));
      } else if (w === "USE" || w === "REFERENCE") {
        c.next();
        c.until(new Set([";"]));
        c.expectOp(";");
        out.skipped.push({ kind: w, name: "", s: at, e: c.last().e });
      } else {
        throw c.error("expected a declaration");
      }
    } catch (error) {
      out.errors.push({ at: error.at ?? at, message: String(error.message).slice(0, 200) });
      c.i = Math.max(c.i, c.tokens.findIndex((t) => t.s >= at));
      recover(c);
    }
  }
  return out;
}
