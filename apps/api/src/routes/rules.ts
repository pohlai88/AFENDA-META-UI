/**
 * Expression Engine API
 * =====================
 *
 * Expose rule/expression evaluation as HTTP endpoints for:
 *   • Field visibility resolution
 *   • Computed field calculation
 *   • Rule validation
 *   • Expression testing
 *
 * Routes:
 *   POST /api/rules/evaluate       — Evaluate a rule in context
 *   POST /api/rules/compute        — Compute a field value
 *   POST /api/rules/visibility     — Check field visibility
 *   POST /api/rules/validate       — Run validation rules
 *   POST /api/expressions/test     — Test a DSL expression
 */

import type { Request, Response } from "express";
import {
  evaluateRule,
  evaluateRulesForCategory,
  computeFieldValue,
  isFieldVisible,
  getRule,
} from "../rules/index.js";
import type { RuleExecutionContext } from "../rules/index.js";
import { evaluateExpression } from "../policy/policyDSL.js";
import type { ResolutionContext } from "@afenda/meta-types";

// ---------------------------------------------------------------------------
// POST /api/rules/evaluate
// ---------------------------------------------------------------------------

interface EvaluateRuleRequest {
  ruleId: string;
  record: Record<string, unknown>;
  relatedRecords?: Record<string, unknown[]>;
  actor?: {
    uid: string;
    roles: string[];
  };
  tenantContext: ResolutionContext;
  globalMetadata?: Record<string, unknown>;
}

export async function evaluateRuleHandler(req: Request, res: Response): Promise<void> {
  const { ruleId, record, relatedRecords, actor, tenantContext, globalMetadata } =
    req.body as EvaluateRuleRequest;

  const rule = getRule(ruleId);
  if (!rule) {
    res.status(404).json({ error: `Rule not found: ${ruleId}` });
    return;
  }

  const context: RuleExecutionContext = {
    record,
    relatedRecords,
    actor,
    tenantContext,
  };

  const result = evaluateRule(rule, context, globalMetadata);
  res.json(result);
}

// ---------------------------------------------------------------------------
// POST /api/rules/compute
// ---------------------------------------------------------------------------

interface ComputeFieldRequest {
  fieldId: string;
  scope: string;
  record: Record<string, unknown>;
  relatedRecords?: Record<string, unknown[]>;
  actor?: {
    uid: string;
    roles: string[];
  };
  tenantContext: ResolutionContext;
  globalMetadata?: Record<string, unknown>;
}

export async function computeFieldHandler(req: Request, res: Response): Promise<void> {
  const { fieldId, scope, record, relatedRecords, actor, tenantContext, globalMetadata } =
    req.body as ComputeFieldRequest;

  const context: RuleExecutionContext = {
    record,
    relatedRecords,
    actor,
    tenantContext,
  };

  const value = computeFieldValue(fieldId, scope, context, globalMetadata);
  res.json({ fieldId, value });
}

// ---------------------------------------------------------------------------
// POST /api/rules/visibility
// ---------------------------------------------------------------------------

interface VisibilityCheckRequest {
  fieldId: string;
  scope: string;
  record: Record<string, unknown>;
  relatedRecords?: Record<string, unknown[]>;
  actor?: {
    uid: string;
    roles: string[];
  };
  tenantContext: ResolutionContext;
  globalMetadata?: Record<string, unknown>;
  defaultVisible?: boolean;
}

export async function visibilityCheckHandler(req: Request, res: Response): Promise<void> {
  const {
    fieldId,
    scope,
    record,
    relatedRecords,
    actor,
    tenantContext,
    globalMetadata,
    defaultVisible,
  } = req.body as VisibilityCheckRequest;

  const context: RuleExecutionContext = {
    record,
    relatedRecords,
    actor,
    tenantContext,
  };

  const visible = isFieldVisible(fieldId, scope, context, globalMetadata, defaultVisible);
  res.json({ fieldId, visible });
}

// ---------------------------------------------------------------------------
// POST /api/rules/validate
// ---------------------------------------------------------------------------

interface ValidateRulesRequest {
  scope: string;
  record: Record<string, unknown>;
  relatedRecords?: Record<string, unknown[]>;
  actor?: {
    uid: string;
    roles: string[];
  };
  tenantContext: ResolutionContext;
  globalMetadata?: Record<string, unknown>;
}

export async function validateRulesHandler(req: Request, res: Response): Promise<void> {
  const { scope, record, relatedRecords, actor, tenantContext, globalMetadata } =
    req.body as ValidateRulesRequest;

  const context: RuleExecutionContext = {
    record,
    relatedRecords,
    actor,
    tenantContext,
  };

  const results = evaluateRulesForCategory(scope, "validate", context, globalMetadata);

  const passed = results.every((r) => r.passed);
  const violations = results.filter((r) => !r.passed || r.error);

  res.json({ scope, passed, results, violations });
}

// ---------------------------------------------------------------------------
// POST /api/expressions/test
// ---------------------------------------------------------------------------

interface TestExpressionRequest {
  expression: string;
  context: Record<string, unknown>;
}

export async function testExpressionHandler(req: Request, res: Response): Promise<void> {
  const { expression, context } = req.body as TestExpressionRequest;

  const result = evaluateExpression(expression, context);
  res.json({ expression, context, result });
}
