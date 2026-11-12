// This file was generated with the assistance of an AI coding tool.
// SPDX-License-Identifier: AGPL-3.0-or-later

// Rules that hold for the files themselves: no way for schema text to become markup or code, no inline script or
// style, the AI and licence headers, and the vendored files as recorded.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

function files(dir, ext) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...files(path, ext));
    else if (name.endsWith(ext)) out.push(path);
  }
  return out;
}

const own = [...files(join(ROOT, "src"), ".js"), ...files(join(ROOT, "tests"), ".js"), ...files(join(ROOT, "css"), ".css").filter((f) => !f.endsWith("tokens.css"))];

test("no source file can turn text into markup or code", () => {
  const banned = /\b(?:innerHTML|outerHTML|insertAdjacentHTML|srcdoc|createContextualFragment)\b|document\.write|\beval\s*\(|new Function\s*\(/;
  for (const f of files(join(ROOT, "src"), ".js")) {
    const text = readFileSync(f, "utf8");
    assert.doesNotMatch(text, banned, relative(ROOT, f));
  }
});

test("every own file says it was written with an AI tool and carries the licence", () => {
  for (const f of [...own, join(ROOT, "index.html"), join(ROOT, "tools", "fetch_vendor.py")]) {
    const head = readFileSync(f, "utf8").split("\n").slice(0, 4).join("\n");
    assert.match(head, /generated with the assistance of an AI coding tool/, relative(ROOT, f));
    assert.match(head, /SPDX-License-Identifier: AGPL-3\.0-or-later/, relative(ROOT, f));
  }
});

test("index.html has no inline script or style and a strict content security policy", () => {
  const html = readFileSync(join(ROOT, "index.html"), "utf8");
  for (const tag of html.match(/<script\b[^>]*>/g)) assert.match(tag, /\bsrc="/, tag);
  assert.doesNotMatch(html, /<style\b/);
  assert.doesNotMatch(html, /\sstyle="/);
  assert.doesNotMatch(html, /\son[a-z]+="/);
  const csp = /http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(html)[1];
  assert.match(csp, /default-src 'none'/);
  assert.match(csp, /script-src 'self';/);
  assert.match(csp, /style-src 'self';/);
  assert.doesNotMatch(csp, /unsafe/);
  assert.match(html, /<noscript>/);
});

test("the vendored files are those recorded in vendor/README.md", () => {
  const readme = readFileSync(join(ROOT, "vendor", "README.md"), "utf8");
  const rows = [...readme.matchAll(/\| `(vendor\/[^`]+)` \| `([0-9a-f]{64})` \|/g)];
  assert.ok(rows.length >= 12);
  for (const [, path, sha] of rows) {
    const digest = createHash("sha256").update(readFileSync(join(ROOT, path))).digest("hex");
    assert.equal(digest, sha, path);
  }
  const listed = new Set(rows.map((r) => r[1]));
  for (const f of files(join(ROOT, "vendor"), "")) {
    const rel = relative(ROOT, f).split("\\").join("/");
    if (rel === "vendor/README.md" || rel === "vendor/vendor.json") continue;
    assert.ok(listed.has(rel), `${rel} is not recorded`);
  }
});

test("every script the page loads exists", () => {
  const html = readFileSync(join(ROOT, "index.html"), "utf8");
  for (const [, src] of html.matchAll(/(?:src|href)="((?:vendor|src|css)\/[^"]+|favicon\.svg)"/g)) {
    assert.ok(statSync(join(ROOT, src)).isFile(), src);
  }
});
