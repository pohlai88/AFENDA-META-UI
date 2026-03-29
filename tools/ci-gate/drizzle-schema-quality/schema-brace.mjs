/**
 * Shared structural helpers for foreignKey({ ... }) parsing.
 */

export function matchingBraceClose(source, openIdx) {
  let depth = 0;
  for (let i = openIdx; i < source.length; i++) {
    const c = source[i];
    if (c === "{") depth += 1;
    else if (c === "}") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

export function matchingBracketClose(source, openIdx) {
  let depth = 0;
  for (let i = openIdx; i < source.length; i++) {
    const c = source[i];
    if (c === "[") depth += 1;
    else if (c === "]") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * @param {string} body - inside foreignKey({ ... }) excluding outer braces
 * @param {"columns" | "foreignColumns"} key
 * @returns {string | null} inner of `[ ... ]`
 */
export function extractArrayAfterKey(body, key) {
  const re = key === "columns" ? /\bcolumns:\s*\[/g : /\bforeignColumns:\s*\[/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    const openBracket = m.index + m[0].length - 1;
    const closeBracket = matchingBracketClose(body, openBracket);
    if (closeBracket < 0) return null;
    return body.slice(openBracket + 1, closeBracket);
  }
  return null;
}

/**
 * @param {string} inner
 * @returns {string[]}
 */
export function splitTopLevelCommaList(inner) {
  const parts = [];
  let start = 0;
  let depth = 0;
  for (let i = 0; i < inner.length; i++) {
    const c = inner[i];
    if (c === "(" || c === "[" || c === "{") depth += 1;
    else if (c === ")" || c === "]" || c === "}") depth -= 1;
    else if (c === "," && depth === 0) {
      const seg = inner.slice(start, i).trim();
      if (seg) parts.push(seg);
      start = i + 1;
    }
  }
  const tail = inner.slice(start).trim();
  if (tail) parts.push(tail);
  return parts;
}
