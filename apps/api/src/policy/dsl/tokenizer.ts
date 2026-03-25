/**
 * Policy DSL — Tokenizer
 * ======================
 * Converts a DSL source string into a stream of typed tokens.
 *
 * Token types:
 *   NUMBER, STRING, BOOLEAN, IDENTIFIER, OPERATOR, COMPARATOR,
 *   PAREN_OPEN, PAREN_CLOSE, COMMA, BRACKET_OPEN, BRACKET_CLOSE,
 *   KEYWORD_AND, KEYWORD_OR, KEYWORD_NOT, KEYWORD_IN, KEYWORD_IF,
 *   KEYWORD_THEN, KEYWORD_BLOCK, EOF
 */

// ---------------------------------------------------------------------------
// Token types
// ---------------------------------------------------------------------------

export type TokenType =
  | "NUMBER"
  | "STRING"
  | "BOOLEAN"
  | "IDENTIFIER"
  | "OPERATOR" // + - * /
  | "COMPARATOR" // == != > < >= <=
  | "PAREN_OPEN"
  | "PAREN_CLOSE"
  | "COMMA"
  | "BRACKET_OPEN" // [
  | "BRACKET_CLOSE" // ]
  | "KEYWORD_AND"
  | "KEYWORD_OR"
  | "KEYWORD_NOT"
  | "KEYWORD_IN"
  | "KEYWORD_IF"
  | "KEYWORD_THEN"
  | "KEYWORD_BLOCK"
  | "EOF";

export interface Token {
  type: TokenType;
  value: string;
  position: number;
}

// ---------------------------------------------------------------------------
// Keywords (case-insensitive)
// ---------------------------------------------------------------------------

const KEYWORDS: Record<string, TokenType> = {
  and: "KEYWORD_AND",
  or: "KEYWORD_OR",
  not: "KEYWORD_NOT",
  in: "KEYWORD_IN",
  if: "KEYWORD_IF",
  then: "KEYWORD_THEN",
  block: "KEYWORD_BLOCK",
  true: "BOOLEAN",
  false: "BOOLEAN",
};

// ---------------------------------------------------------------------------
// Tokenizer
// ---------------------------------------------------------------------------

export class TokenizerError extends Error {
  constructor(
    message: string,
    public position: number
  ) {
    super(`Tokenizer error at position ${position}: ${message}`);
    this.name = "TokenizerError";
  }
}

export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < source.length) {
    // skip whitespace
    if (/\s/.test(source[i])) {
      i++;
      continue;
    }

    const start = i;
    const ch = source[i];

    // ── Single-character tokens ─────────────────────────────────────────
    if (ch === "(") {
      tokens.push({ type: "PAREN_OPEN", value: "(", position: start });
      i++;
      continue;
    }
    if (ch === ")") {
      tokens.push({ type: "PAREN_CLOSE", value: ")", position: start });
      i++;
      continue;
    }
    if (ch === ",") {
      tokens.push({ type: "COMMA", value: ",", position: start });
      i++;
      continue;
    }
    if (ch === "[") {
      tokens.push({ type: "BRACKET_OPEN", value: "[", position: start });
      i++;
      continue;
    }
    if (ch === "]") {
      tokens.push({ type: "BRACKET_CLOSE", value: "]", position: start });
      i++;
      continue;
    }

    // ── Comparators (2-char then 1-char) ────────────────────────────────
    if (ch === "=" && source[i + 1] === "=") {
      tokens.push({ type: "COMPARATOR", value: "==", position: start });
      i += 2;
      continue;
    }
    if (ch === "!" && source[i + 1] === "=") {
      tokens.push({ type: "COMPARATOR", value: "!=", position: start });
      i += 2;
      continue;
    }
    if (ch === ">" && source[i + 1] === "=") {
      tokens.push({ type: "COMPARATOR", value: ">=", position: start });
      i += 2;
      continue;
    }
    if (ch === "<" && source[i + 1] === "=") {
      tokens.push({ type: "COMPARATOR", value: "<=", position: start });
      i += 2;
      continue;
    }
    if (ch === ">") {
      tokens.push({ type: "COMPARATOR", value: ">", position: start });
      i++;
      continue;
    }
    if (ch === "<") {
      tokens.push({ type: "COMPARATOR", value: "<", position: start });
      i++;
      continue;
    }

    // ── Arithmetic operators ────────────────────────────────────────────
    if (ch === "+" || ch === "-" || ch === "*" || ch === "/") {
      tokens.push({ type: "OPERATOR", value: ch, position: start });
      i++;
      continue;
    }

    // ── Numbers ─────────────────────────────────────────────────────────
    if (/\d/.test(ch) || (ch === "." && /\d/.test(source[i + 1] ?? ""))) {
      let num = "";
      let hasDot = false;
      while (i < source.length && (/\d/.test(source[i]) || (source[i] === "." && !hasDot))) {
        if (source[i] === ".") hasDot = true;
        num += source[i];
        i++;
      }
      tokens.push({ type: "NUMBER", value: num, position: start });
      continue;
    }

    // ── Strings ─────────────────────────────────────────────────────────
    if (ch === '"' || ch === "'") {
      const quote = ch;
      i++; // skip opening quote
      let str = "";
      while (i < source.length && source[i] !== quote) {
        if (source[i] === "\\" && i + 1 < source.length) {
          str += source[i + 1];
          i += 2;
        } else {
          str += source[i];
          i++;
        }
      }
      if (i >= source.length) {
        throw new TokenizerError(`Unterminated string literal`, start);
      }
      i++; // skip closing quote
      tokens.push({ type: "STRING", value: str, position: start });
      continue;
    }

    // ── Identifiers and keywords ────────────────────────────────────────
    if (/[a-zA-Z_]/.test(ch)) {
      let ident = "";
      while (i < source.length && /[a-zA-Z0-9_.]/.test(source[i])) {
        ident += source[i];
        i++;
      }
      const lower = ident.toLowerCase();
      const kwType = KEYWORDS[lower];
      if (kwType) {
        tokens.push({ type: kwType, value: lower, position: start });
      } else {
        tokens.push({ type: "IDENTIFIER", value: ident, position: start });
      }
      continue;
    }

    throw new TokenizerError(`Unexpected character '${ch}'`, start);
  }

  tokens.push({ type: "EOF", value: "", position: i });
  return tokens;
}
