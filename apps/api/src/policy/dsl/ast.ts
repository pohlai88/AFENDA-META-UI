/**
 * Policy DSL — Abstract Syntax Tree
 * ==================================
 * Typed AST nodes for the policy DSL.
 *
 * Grammar (EBNF):
 *   expression  := logical ;
 *   logical     := comparison (("AND" | "OR") comparison)* ;
 *   comparison  := addition (("==" | "!=" | ">" | "<" | ">=" | "<=") addition)?
 *                | addition "IN" listLiteral ;
 *   addition    := multiplication (("+" | "-") multiplication)* ;
 *   multiplication := unary (("*" | "/") unary)* ;
 *   unary       := ("NOT" | "-")? primary ;
 *   primary     := NUMBER | STRING | BOOLEAN | identifier
 *                | functionCall | listLiteral | "(" expression ")" ;
 *   functionCall:= IDENTIFIER "(" args? ")" ;
 *   args        := expression ("," expression)* ;
 *   listLiteral := "[" args? "]" ;
 *   ifThenBlock := "IF" expression "THEN" "BLOCK" ;
 */

// ---------------------------------------------------------------------------
// AST Node Types
// ---------------------------------------------------------------------------

export interface NumberLiteral {
  kind: "NumberLiteral";
  value: number;
}

export interface StringLiteral {
  kind: "StringLiteral";
  value: string;
}

export interface BooleanLiteral {
  kind: "BooleanLiteral";
  value: boolean;
}

export interface Identifier {
  kind: "Identifier";
  /** Dotted path, e.g. "invoice.total_amount" */
  name: string;
}

export interface BinaryExpr {
  kind: "BinaryExpr";
  operator: string; // +, -, *, /, ==, !=, >, <, >=, <=
  left: AstNode;
  right: AstNode;
}

export interface LogicalExpr {
  kind: "LogicalExpr";
  operator: "and" | "or";
  left: AstNode;
  right: AstNode;
}

export interface UnaryExpr {
  kind: "UnaryExpr";
  operator: "not" | "-";
  operand: AstNode;
}

export interface FunctionCall {
  kind: "FunctionCall";
  name: string;
  args: AstNode[];
}

export interface InExpr {
  kind: "InExpr";
  value: AstNode;
  list: AstNode[];
}

export interface ListLiteral {
  kind: "ListLiteral";
  elements: AstNode[];
}

export interface IfThenBlock {
  kind: "IfThenBlock";
  condition: AstNode;
}

export type AstNode =
  | NumberLiteral
  | StringLiteral
  | BooleanLiteral
  | Identifier
  | BinaryExpr
  | LogicalExpr
  | UnaryExpr
  | FunctionCall
  | InExpr
  | ListLiteral
  | IfThenBlock;
