export { registerPolicy, registerPolicies, getPolicy, removePolicy, clearPolicies, getPoliciesForScope, getPoliciesByTags, getAllPolicies } from "./policyRegistry.js";
export { evaluateExpression, evaluateCondition, type DslEvaluationResult } from "./policyDSL.js";
export { buildPolicyContext } from "./policyContextBuilder.js";
export { evaluatePolicies, evaluateExplicitPolicies, evaluatePoliciesWithTenantContext } from "./policyEvaluator.js";

// DSL internals (for sandbox / admin tooling)
export { tokenize, parse, interpret, TokenizerError, ParseError, InterpreterError } from "./dsl/index.js";
export type { Token, TokenType, AstNode } from "./dsl/index.js";
