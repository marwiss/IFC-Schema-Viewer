// This file was generated with the assistance of an AI coding tool.
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * Tokens of an EXPRESS schema (ISO 10303-11). Remarks `(* … *)` (which may nest) and tail remarks `-- …` are skipped.
 * Each token is `{t, v, s, e}`: its kind (`id`, `num`, `str`, `op`), its text, and its start and end offset in the
 * source, so that the parser can quote the source of a declaration exactly.
 */

const OPERATORS = [":<>:", ":=:", ":=", "<=", ">=", "<>", "<*", "||", "**"];
const SINGLE = new Set(";:,()[]{}.=<>+-*/\\|?#$&@^!%~`'\"");

function isIdStart(c) {
  return (c >= "A" && c <= "Z") || (c >= "a" && c <= "z") || c === "_";
}

function isIdPart(c) {
  return isIdStart(c) || (c >= "0" && c <= "9");
}

function isDigit(c) {
  return c >= "0" && c <= "9";
}

/** Split EXPRESS source text into tokens; throws only on an unterminated remark or string. */
export function tokenize(text) {
  const tokens = [];
  const n = text.length;
  let i = 0;
  while (i < n) {
    const c = text[i];
    if (c === " " || c === "\t" || c === "\n" || c === "\r" || c === "\f" || c === "\v") {
      i++;
      continue;
    }
    if (c === "(" && text[i + 1] === "*") {
      let depth = 1;
      const start = i;
      i += 2;
      while (i < n && depth > 0) {
        if (text[i] === "(" && text[i + 1] === "*") {
          depth++;
          i += 2;
        } else if (text[i] === "*" && text[i + 1] === ")") {
          depth--;
          i += 2;
        } else {
          i++;
        }
      }
      if (depth > 0) throw new SyntaxError(`unterminated remark at offset ${start}`);
      continue;
    }
    if (c === "-" && text[i + 1] === "-") {
      while (i < n && text[i] !== "\n") i++;
      continue;
    }
    if (c === "'") {
      const start = i;
      i++;
      for (;;) {
        if (i >= n) throw new SyntaxError(`unterminated string at offset ${start}`);
        if (text[i] === "'") {
          if (text[i + 1] === "'") {
            i += 2;
            continue;
          }
          i++;
          break;
        }
        i++;
      }
      tokens.push({ t: "str", v: text.slice(start, i), s: start, e: i });
      continue;
    }
    if (c === '"') {
      const start = i;
      const end = text.indexOf('"', i + 1);
      if (end < 0) throw new SyntaxError(`unterminated encoded string at offset ${start}`);
      i = end + 1;
      tokens.push({ t: "str", v: text.slice(start, i), s: start, e: i });
      continue;
    }
    if (isDigit(c)) {
      const start = i;
      while (i < n && isDigit(text[i])) i++;
      if (text[i] === "." && isDigit(text[i + 1] ?? "")) {
        i++;
        while (i < n && isDigit(text[i])) i++;
      }
      if ((text[i] === "E" || text[i] === "e") && /[+\-0-9]/.test(text[i + 1] ?? "")) {
        i++;
        if (text[i] === "+" || text[i] === "-") i++;
        while (i < n && isDigit(text[i])) i++;
      }
      tokens.push({ t: "num", v: text.slice(start, i), s: start, e: i });
      continue;
    }
    if (isIdStart(c)) {
      const start = i;
      while (i < n && isIdPart(text[i])) i++;
      tokens.push({ t: "id", v: text.slice(start, i), s: start, e: i });
      continue;
    }
    const op = OPERATORS.find((o) => text.startsWith(o, i));
    if (op) {
      tokens.push({ t: "op", v: op, s: i, e: i + op.length });
      i += op.length;
      continue;
    }
    if (SINGLE.has(c)) {
      tokens.push({ t: "op", v: c, s: i, e: i + 1 });
      i++;
      continue;
    }
    // Any other character (outside ASCII, for instance) is kept as an operator so that the parser can report it.
    tokens.push({ t: "op", v: c, s: i, e: i + 1 });
    i++;
  }
  return tokens;
}
