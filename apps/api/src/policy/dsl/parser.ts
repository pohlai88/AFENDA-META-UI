/**
 * Policy DSL — Recursive Descent Parser
 * ======================================
 * Transforms token stream into a typed AST.
 *
 * Grammar precedence (low → high):
 *   1. IF/THEN/BLOCK
 *   2. Logical (AND, OR)
 *   3. Comparison (==, !=, >, <, >=, <=, IN)
 *   4. Addition (+, -)
 *   5. Multiplication (*, /)
 *   6. Unary (NOT, -)
 *   7. Primary (literals, identifiers, function calls, groups)
 */

import type { Token, TokenType } from "./tokenizer.js";
import type {
  AstNode,
  BinaryExpr,
  LogicalExpr,
  InExpr,
  UnaryExpr,
  FunctionCall,
  ListLiteral,
  IfThenBlock,
} from "./ast.js";

// ---------------------------------------------------------------------------
// Parser Error
// ---------------------------------------------------------------------------

export class ParseError extends Error {
  constructor(
    message: string,
    public position: number,
  ) {
    super(`Parse error at position ${position}: ${message}`);
    this.name = "ParseError";
  }
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

export class Parser {
  private pos = 0;

  constructor(private tokens: Token[]) {}

  parse(): AstNode {
    const node = this.parseIfThenBlock();
    if (this.peek().type !== "EOF") {
      throw new ParseError(
        `Unexpected token '${this.peek().value}'`,
        this.peek().position,
      );
    }
    return node;
  }

  // ── Helpers ─────────────────────────────────────────────────────────

  private peek(): Token {
    return this.tokens[this.pos] ?? { type: "EOF", value: "", position: -1 };
  }

  private advance(): Token {
    const token = this.tokens[this.pos];
    this.pos++;
    return token;
  }

  private expect(type: TokenType, hint?: string): Token {
    const token = this.peek();
    if (token.type !== type) {
      throw new ParseError(
        `Expected ${hint ?? type} but got '${token.value}'`,
        token.position,
      );
    }
    return this.advance();
  }

  private match(...types: TokenType[]): Token | null {
    if (types.includes(this.peek().type)) {
      return this.advance();
    }
    return null;
  }

  // ── IF expression THEN BLOCK ────────────────────────────────────────

  private parseIfThenBlock(): AstNode {
    if (this.peek().type === "KEYWORD_IF") {
      this.advance(); // consume IF
      const condition = this.parseLogical();
      this.expect("KEYWORD_THEN", "THEN");
      this.expect("KEYWORD_BLOCK", "BLOCK");
      return { kind: "IfThenBlock", condition } satisfies IfThenBlock;
    }
    return this.parseLogical();
  }

  // ── Logical: comparison ((AND | OR) comparison)* ────────────────────

  private parseLogical(): AstNode {
    let left = this.parseComparison();

    while (
      this.peek().type === "KEYWORD_AND" ||
      this.peek().type === "KEYWORD_OR"
    ) {
      const op = this.advance();
      const right = this.parseComparison();
      left = {
        kind: "LogicalExpr",
        operator: op.value as "and" | "or",
        left,
        right,
      } satisfies LogicalExpr;
    }

    return left;
  }

  // ── Comparison: addition ((CMP) addition)? | addition IN list ───────

  private parseComparison(): AstNode {
    const left = this.parseAddition();

    if (this.peek().type === "KEYWORD_IN") {
      this.advance(); // consume IN
      const list = this.parseListLiteral();
      return { kind: "InExpr", value: left, list: list.elements } satisfies InExpr;
    }

    if (this.peek().type === "COMPARATOR") {
      const op = this.advance();
      const right = this.parseAddition();
      return {
        kind: "BinaryExpr",
        operator: op.value,
        left,
        right,
      } satisfies BinaryExpr;
    }

    return left;
  }

  // ── Addition: multiplication ((+ | -) multiplication)* ──────────────

  private parseAddition(): AstNode {
    let left = this.parseMultiplication();

    while (this.peek().type === "OPERATOR" && (this.peek().value === "+" || this.peek().value === "-")) {
      const op = this.advance();
      const right = this.parseMultiplication();
      left = { kind: "BinaryExpr", operator: op.value, left, right } satisfies BinaryExpr;
    }

    return left;
  }

  // ── Multiplication: unary ((* | /) unary)* ──────────────────────────

  private parseMultiplication(): AstNode {
    let left = this.parseUnary();

    while (this.peek().type === "OPERATOR" && (this.peek().value === "*" || this.peek().value === "/")) {
      const op = this.advance();
      const right = this.parseUnary();
      left = { kind: "BinaryExpr", operator: op.value, left, right } satisfies BinaryExpr;
    }

    return left;
  }

  // ── Unary: (NOT | -) primary ────────────────────────────────────────

  private parseUnary(): AstNode {
    if (this.peek().type === "KEYWORD_NOT") {
      this.advance();
      const operand = this.parseUnary();
      return { kind: "UnaryExpr", operator: "not", operand } satisfies UnaryExpr;
    }

    if (this.peek().type === "OPERATOR" && this.peek().value === "-") {
      this.advance();
      const operand = this.parseUnary();
      return { kind: "UnaryExpr", operator: "-", operand } satisfies UnaryExpr;
    }

    return this.parsePrimary();
  }

  // ── Primary ─────────────────────────────────────────────────────────

  private parsePrimary(): AstNode {
    const token = this.peek();

    // Number
    if (token.type === "NUMBER") {
      this.advance();
      return { kind: "NumberLiteral", value: parseFloat(token.value) };
    }

    // String
    if (token.type === "STRING") {
      this.advance();
      return { kind: "StringLiteral", value: token.value };
    }

    // Boolean
    if (token.type === "BOOLEAN") {
      this.advance();
      return { kind: "BooleanLiteral", value: token.value === "true" };
    }

    // List literal
    if (token.type === "BRACKET_OPEN") {
      return this.parseListLiteral();
    }

    // Identifier or function call
    if (token.type === "IDENTIFIER") {
      this.advance();
      // Check for function call
      if (this.peek().type === "PAREN_OPEN") {
        return this.parseFunctionCall(token.value);
      }
      return { kind: "Identifier", name: token.value };
    }

    // Grouped expression
    if (token.type === "PAREN_OPEN") {
      this.advance(); // consume (
      const expr = this.parseLogical();
      this.expect("PAREN_CLOSE", ")");
      return expr;
    }

    throw new ParseError(`Unexpected token '${token.value}'`, token.position);
  }

  // ── Function call ───────────────────────────────────────────────────

  private parseFunctionCall(name: string): FunctionCall {
    this.advance(); // consume (
    const args: AstNode[] = [];

    if (this.peek().type !== "PAREN_CLOSE") {
      args.push(this.parseLogical());
      while (this.match("COMMA")) {
        args.push(this.parseLogical());
      }
    }

    this.expect("PAREN_CLOSE", ")");
    return { kind: "FunctionCall", name, args };
  }

  // ── List literal ────────────────────────────────────────────────────

  private parseListLiteral(): ListLiteral {
    this.expect("BRACKET_OPEN", "[");
    const elements: AstNode[] = [];

    if (this.peek().type !== "BRACKET_CLOSE") {
      elements.push(this.parseLogical());
      while (this.match("COMMA")) {
        elements.push(this.parseLogical());
      }
    }

    this.expect("BRACKET_CLOSE", "]");
    return { kind: "ListLiteral", elements };
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function parse(tokens: Token[]): AstNode {
  return new Parser(tokens).parse();
}
