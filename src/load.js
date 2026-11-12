// This file was generated with the assistance of an AI coding tool.
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * Fetching pinned files and reading the user's own. A pinned file is refused unless its SHA-256 is the pinned one; a
 * file is refused when it is larger than its limit. The bytes are kept per address, so a file is fetched once.
 */

const cache = new Map();

/** The SHA-256 of bytes, as lowercase hex. */
export async function sha256Hex(bytes) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Fetch `url` and return its bytes, or throw when it fails, is too large or does not match `sha256`. */
export function fetchPinned({ url, sha256 }, maxBytes) {
  if (!cache.has(url)) {
    const job = (async () => {
      const response = await fetch(url, { credentials: "omit", referrerPolicy: "no-referrer", redirect: "error" });
      if (!response.ok) throw new Error(`${url} answered ${response.status}`);
      const declared = Number(response.headers.get("content-length"));
      if (declared > maxBytes) throw new Error(`${url} is larger than ${maxBytes} bytes`);
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.byteLength > maxBytes) throw new Error(`${url} is larger than ${maxBytes} bytes`);
      const found = await sha256Hex(bytes);
      if (found !== sha256) throw new Error(`${url} is not the pinned file (SHA-256 ${found.slice(0, 12)}…)`);
      return bytes;
    })();
    cache.set(url, job);
    job.catch(() => cache.delete(url));
  }
  return cache.get(url);
}

/** Bytes as text; EXPRESS and JSON are ASCII or UTF-8. */
export function decode(bytes) {
  return new TextDecoder("utf-8").decode(bytes);
}

/** A file the user picked, as text, with its SHA-256. */
export async function readLocalFile(file, maxBytes) {
  if (file.size > maxBytes) throw new Error(`${file.name} is larger than ${maxBytes} bytes`);
  const bytes = new Uint8Array(await file.arrayBuffer());
  return { name: file.name, text: decode(bytes), sha256: await sha256Hex(bytes) };
}

/** Parse JSON and refuse nesting deeper than `maxDepth`. */
export function parseJson(text, maxDepth) {
  const value = JSON.parse(text);
  const stack = [[value, 1]];
  while (stack.length) {
    const [v, depth] = stack.pop();
    if (v && typeof v === "object") {
      if (depth > maxDepth) throw new Error(`the JSON is nested deeper than ${maxDepth}`);
      for (const child of Object.values(v)) if (child && typeof child === "object") stack.push([child, depth + 1]);
    }
  }
  return value;
}
