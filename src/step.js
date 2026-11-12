// This file was generated with the assistance of an AI coding tool.
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * A reader for the DATA section of a STEP physical file (ISO 10303-21), enough for IfcOpenShell's property set
 * templates: `#id = NAME(arguments);` with strings, numbers, enumerations, references, `$`, `*`, lists and typed values.
 * Strings are decoded (`''`, `\\`, `\X2\…\X0\`, `\X4\…\X0\`, `\X\HH`, `\S\c`). Values: a string, a number, null for `$`,
 * `{enum}`, `{ref}`, `{derived: true}` for `*`, an array for a list, `{type, value}` for a typed value.
 */

/** Decode the escapes of a STEP string (without its quotes). */
export function decodeStepString(raw) {
  let out = "";
  for (let i = 0; i < raw.length; ) {
    const c = raw[i];
    if (c === "'" && raw[i + 1] === "'") {
      out += "'";
      i += 2;
    } else if (c === "\\" && raw[i + 1] === "\\") {
      out += "\\";
      i += 2;
    } else if (raw.startsWith("\\X2\\", i) || raw.startsWith("\\X4\\", i)) {
      const width = raw[i + 2] === "2" ? 4 : 8;
      const end = raw.indexOf("\\X0\\", i + 4);
      const hex = raw.slice(i + 4, end < 0 ? raw.length : end);
      for (let j = 0; j + width <= hex.length; j += width) {
        const code = parseInt(hex.slice(j, j + width), 16);
        out += width === 4 ? String.fromCharCode(code) : String.fromCodePoint(code);
      }
      i = end < 0 ? raw.length : end + 4;
    } else if (raw.startsWith("\\X\\", i)) {
      out += String.fromCharCode(parseInt(raw.slice(i + 3, i + 5), 16));
      i += 5;
    } else if (raw.startsWith("\\S\\", i)) {
      out += String.fromCharCode(raw.charCodeAt(i + 3) + 128);
      i += 4;
    } else if (raw.startsWith("\\P", i) && raw[i + 3] === "\\") {
      i += 4; // a code page switch; the files here use ISO 8859-1 throughout
    } else {
      out += c;
      i++;
    }
  }
  return out;
}

class Reader {
  constructor(text, start) {
    this.text = text;
    this.i = start;
  }

  space() {
    const t = this.text;
    for (;;) {
      while (this.i < t.length && /\s/.test(t[this.i])) this.i++;
      if (t.startsWith("/*", this.i)) {
        const end = t.indexOf("*/", this.i + 2);
        this.i = end < 0 ? t.length : end + 2;
      } else {
        return;
      }
    }
  }

  expect(c) {
    this.space();
    if (this.text[this.i] !== c) throw new SyntaxError(`expected "${c}" at offset ${this.i}`);
    this.i++;
  }

  value() {
    this.space();
    const t = this.text;
    const c = t[this.i];
    if (c === "'") {
      const start = ++this.i;
      for (;;) {
        const q = t.indexOf("'", this.i);
        if (q < 0) throw new SyntaxError(`unterminated string at offset ${start - 1}`);
        if (t[q + 1] === "'") {
          this.i = q + 2;
          continue;
        }
        this.i = q + 1;
        return decodeStepString(t.slice(start, q));
      }
    }
    if (c === "$") {
      this.i++;
      return null;
    }
    if (c === "*") {
      this.i++;
      return { derived: true };
    }
    if (c === "#") {
      const m = /^#(\d+)/.exec(t.slice(this.i, this.i + 24));
      this.i += m[0].length;
      return { ref: Number(m[1]) };
    }
    if (c === ".") {
      const end = t.indexOf(".", this.i + 1);
      const v = t.slice(this.i + 1, end);
      this.i = end + 1;
      return { enum: v };
    }
    if (c === "(") return this.list();
    if (c === '"') {
      const end = t.indexOf('"', this.i + 1);
      const v = t.slice(this.i + 1, end);
      this.i = end + 1;
      return { binary: v };
    }
    const num = /^[-+]?(\d+\.?\d*(E[-+]?\d+)?|\.\d+)/i.exec(t.slice(this.i, this.i + 40));
    if (num) {
      this.i += num[0].length;
      return Number(num[0]);
    }
    const name = /^[A-Za-z_][A-Za-z0-9_]*/.exec(t.slice(this.i, this.i + 120));
    if (name) {
      this.i += name[0].length;
      this.expect("(");
      const inner = [];
      this.space();
      if (t[this.i] !== ")") {
        inner.push(this.value());
        this.space();
        while (t[this.i] === ",") {
          this.i++;
          inner.push(this.value());
          this.space();
        }
      }
      this.expect(")");
      return { type: name[0].toUpperCase(), value: inner.length === 1 ? inner[0] : inner };
    }
    throw new SyntaxError(`unexpected "${c}" at offset ${this.i}`);
  }

  list() {
    this.expect("(");
    const items = [];
    this.space();
    if (this.text[this.i] === ")") {
      this.i++;
      return items;
    }
    for (;;) {
      items.push(this.value());
      this.space();
      if (this.text[this.i] === ",") {
        this.i++;
        continue;
      }
      this.expect(")");
      return items;
    }
  }
}

/** The instances of a STEP file's DATA section: Map(id → {type, args}). Complex instances are kept with type null. */
export function parseStep(text) {
  const data = /\bDATA\s*;/.exec(text);
  if (!data) throw new SyntaxError("no DATA section");
  const r = new Reader(text, data.index + data[0].length);
  const instances = new Map();
  for (;;) {
    r.space();
    if (text.startsWith("ENDSEC", r.i) || r.i >= text.length) break;
    const head = /^#(\d+)\s*=\s*/.exec(text.slice(r.i, r.i + 40));
    if (!head) throw new SyntaxError(`expected an instance at offset ${r.i}`);
    r.i += head[0].length;
    const id = Number(head[1]);
    if (text[r.i] === "(") {
      // A complex instance: skip it.
      const end = text.indexOf(";", r.i);
      r.i = end + 1;
      instances.set(id, { type: null, args: [] });
      continue;
    }
    const name = /^[A-Za-z_][A-Za-z0-9_]*/.exec(text.slice(r.i, r.i + 120));
    if (!name) throw new SyntaxError(`expected an entity name at offset ${r.i}`);
    r.i += name[0].length;
    const args = r.list();
    r.expect(";");
    instances.set(id, { type: name[0].toUpperCase(), args });
  }
  return instances;
}
