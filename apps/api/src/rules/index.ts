/**
 * Rule Engine — Tenant-Aware Dynamic Logic
 * =========================================
 *
 * Extends the policy DSL into a rich rule engine for business logic:
 *   • Conditional field visibility
 *   • Computed field values
 *   • Dynamic validations
 *   • Workflow transitions
 *   • Pricing/tax calculations
 *   • Tenant-specific behavior
 *
 * Key difference from policies:
 *   Policies = assertions (pass/fail)
 *   Rules = transformations (compute values, apply logic)
 *
 * Rule evaluation pipeline:
 *   1. Load rule metadata (global)
 *   2. Resolve rule via tenant context (apply overrides)
 *   3. Build evaluation context (flatten record + tenant data)
 *   4. Execute rule expressions
 *   5. Return transformed/computed result
 */

import type { ResolutionContext } from "@afenda/meta-types";
import { evaluateExpression } from "../policy/policyDSL.js";
import { buildPolicyContext } from "../policy/policyContextBuilder.js";
import { CachedResolution, resolveMetadata } from "../tenant/index.js";
import { logDecisionAudit } from "../audit/decisionAuditLogger.js";
import { randomUUID } from "crypto";

// ---------------------------------------------------------------------------
// Rule Types
// ---------------------------------------------------------------------------

export interface RuleDefinition {
  /** Unique rule ID */
  id: string;
  /** Scoped target, e.g. "finance.invoice.line_calculation" */
  scope: string;
  /** Category: "compute", "validate", "visibility", "transform", "workflow" */
  category: "compute" | "validate" | "visibility" | "transform" | "workflow";
  /** Human-readable name */
  name: string;
  description?: string;
  /**
   * Precondition — rule only evaluates when true.
   * e.g., "status == 'draft' AND type == 'normal'"
   */
  when?: string;
  /**
   * Main rule expression — depends on category:
   *   compute:     expression that produces a value
   *   validate:    expression that produces boolean (true = valid)
   *   visibility:  expression that produces boolean (true = visible)
   *   transform:   expression that transforms input
   *   workflow:    expression that evaluates to next state
   */
  expression: string;
  /** Priority/weight (higher = evaluated first) */
  priority?: number;
  /** Allow disabling without deleting */
  enabled?: boolean;
  /** Tenant-specific scope override: "tenant:acme", "industry:retail", "dept:sales" */
  scope_override?: string;
}

export interface RuleExecutionContext {
  record: Record<string, unknown>;
  relatedRecords?: Record<string, unknown[]>;
  actor?: {
    uid: string;
    roles: string[];
    email?: string;
  };
  tenantContext: ResolutionContext;
  metadata?: Record<string, unknown>;
}

export interface RuleExecutionResult {
  ruleId: string;
  passed: boolean;
  value?: unknown;
  error?: string;
  executionTimeMs: number;
}

// ---------------------------------------------------------------------------
// Rule Registry
// ---------------------------------------------------------------------------

const ruleStore = new Map<string, RuleDefinition>();

export function registerRule(rule: RuleDefinition): void {
  ruleStore.set(rule.id, { ...rule });
}

export function registerRules(rules: RuleDefinition[]): void {
  rules.forEach(registerRule);
}

export function getRule(id: string): RuleDefinition | undefined {
  return ruleStore.get(id);
}

export function removeRule(id: string): boolean {
  return ruleStore.delete(id);
}

export function clearRules(): void {
  ruleStore.clear();
}

/**
 * Get all rules for a given scope (prefix-match like policies).
 * Results are sorted by priority (highest first).
 */
export function getRulesForScope(scope: string): RuleDefinition[] {
  const result: RuleDefinition[] = [];

  ruleStore.forEach((rule) => {
    if (rule.enabled === false) return;
    if (rule.scope === scope || scope.startsWith(`${rule.scope}.`)) {
      result.push(rule);
    }
  });

  return result.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
}

/**
 * Get all rules for a given category and scope.
 */
export function getRulesForCategory(
  scope: string,
  category: RuleDefinition["category"]
): RuleDefinition[] {
  return getRulesForScope(scope).filter((r) => r.category === category);
}

/**
 * Get rules by tags (if added to rule definition).
 */
export function getRulesByTag(tag: string): RuleDefinition[] {
  const result: RuleDefinition[] = [];
  ruleStore.forEach((rule) => {
    const tags = (rule as RuleDefinition & { tags?: string[] }).tags;
    if (tags?.includes(tag)) {
      result.push(rule);
    }
  });
  return result;
}

// ---------------------------------------------------------------------------
// Rule Evaluation
// ---------------------------------------------------------------------------

/**
 * Evaluate a single rule in the given context.
 * Respects the `when` precondition and applies the rule expression.
 */
export function evaluateRule(
  rule: RuleDefinition,
  context: RuleExecutionContext,
  globalMetadata: Record<string, unknown> = {}
): RuleExecutionResult {
  const startTime = performance.now();
  const evaluationId = randomUUID();

  try {
    // 1. Build evaluation context (flatten record + tenant data)
    const flatContext = buildPolicyContext({
      model: rule.scope.split(".")[0],
      record: context.record,
      relatedRecords: (context.relatedRecords || {}) as Record<string, Record<string, unknown>[]>,
      actor: context.actor || { uid: "system", roles: [] },
      operation: "validate",
      previousRecord: undefined,
    });

    // Add tenant data to context
    const resolvedMetadata = CachedResolution.resolveWithCache(
      resolveMetadata,
      rule.scope.split(".")[0],
      globalMetadata,
      context.tenantContext
    );
    Object.assign(flatContext, {
      tenant: context.tenantContext,
      metadata: resolvedMetadata,
    });

    // 2. Check precondition (when)
    if (rule.when) {
      const whenResult = evaluateExpression(rule.when, flatContext);
      if (whenResult.error) {
        const durationMs = performance.now() - startTime;
        logDecisionAudit({
          id: evaluationId,
          timestamp: new Date().toISOString(),
          tenantId: context.tenantContext.tenantId,
          userId: context.tenantContext.userId,
          eventType: "rule_evaluated",
          scope: rule.scope,
          context: {
            model: rule.scope.split(".")[0],
            ruleId: rule.id,
          },
          decision: {
            input: {
              ruleId: rule.id,
              category: rule.category,
              when: String(rule.when),
              record: context.record,
            },
            output: { passed: false },
            reasoning: `Rule precondition evaluation failed: ${whenResult.error}`,
          },
          durationMs,
          status: "error",
          error: {
            message: `Rule precondition error: ${whenResult.error}`,
            code: "RULE_PRECONDITION_ERROR",
          },
        });
        return {
          ruleId: rule.id,
          passed: false,
          error: `Rule precondition error: ${whenResult.error}`,
          executionTimeMs: durationMs,
        };
      }
      if (!whenResult.value) {
        // Precondition not met — rule doesn't apply
        const durationMs = performance.now() - startTime;
        logDecisionAudit({
          id: evaluationId,
          timestamp: new Date().toISOString(),
          tenantId: context.tenantContext.tenantId,
          userId: context.tenantContext.userId,
          eventType: "rule_evaluated",
          scope: rule.scope,
          context: {
            model: rule.scope.split(".")[0],
            ruleId: rule.id,
          },
          decision: {
            input: {
              ruleId: rule.id,
              category: rule.category,
              when: String(rule.when),
              record: context.record,
            },
            output: { passed: true, preconditionNotMet: true },
            reasoning: "Rule precondition not met — rule not evaluated",
          },
          durationMs,
          status: "success",
        });
        return {
          ruleId: rule.id,
          passed: true,
          value: undefined, // Not evaluated
          executionTimeMs: durationMs,
        };
      }
    }

    // 3. Evaluate main expression
    const result = evaluateExpression(rule.expression, flatContext);

    if (result.error) {
      const durationMs = performance.now() - startTime;
      logDecisionAudit({
        id: evaluationId,
        timestamp: new Date().toISOString(),
        tenantId: context.tenantContext.tenantId,
        userId: context.tenantContext.userId,
        eventType: "rule_evaluated",
        scope: rule.scope,
        context: {
          model: rule.scope.split(".")[0],
          ruleId: rule.id,
        },
        decision: {
          input: {
            ruleId: rule.id,
            category: rule.category,
            expression: String(rule.expression),
            record: context.record,
          },
          output: { passed: false },
          reasoning: `Rule expression evaluation failed: ${result.error}`,
        },
        durationMs,
        status: "error",
        error: {
          message: `Rule evaluation error: ${result.error}`,
          code: "RULE_EVALUATION_ERROR",
        },
      });
      return {
        ruleId: rule.id,
        passed: false,
        error: `Rule evaluation error: ${result.error}`,
        executionTimeMs: durationMs,
      };
    }

    // 4. Category-specific handling
    let passed = true;
    let reasoning = "";
    switch (rule.category) {
      case "compute":
        passed = true;
        reasoning = `Computed value: ${JSON.stringify(result.value)}`;
        break;
      case "validate":
        passed = Boolean(result.value);
        reasoning = `Validation ${passed ? "passed" : "failed"}: ${JSON.stringify(result.value)}`;
        break;
      case "visibility":
        passed = Boolean(result.value);
        reasoning = `Field visibility rule evaluated: ${passed ? "visible" : "hidden"}`;
        break;
      case "transform":
        passed = true;
        reasoning = `Data transformed: ${JSON.stringify(result.value)}`;
        break;
      case "workflow":
        passed = typeof result.value === "string" && result.value.length > 0;
        reasoning = `Workflow transition rule evaluated: ${passed ? `transitioned to: ${result.value}` : "no transition"}`;
        break;
    }

    const durationMs = performance.now() - startTime;
    logDecisionAudit({
      id: evaluationId,
      timestamp: new Date().toISOString(),
      tenantId: context.tenantContext.tenantId,
      userId: context.tenantContext.userId,
      eventType: "rule_evaluated",
      scope: rule.scope,
      context: {
        model: rule.scope.split(".")[0],
        ruleId: rule.id,
      },
      decision: {
        input: {
          ruleId: rule.id,
          category: rule.category,
          expression: String(rule.expression),
          record: context.record,
        },
        output: {
          passed,
          value: result.value,
          category: rule.category,
        },
        reasoning,
      },
      durationMs,
      status: "success",
    });

    return {
      ruleId: rule.id,
      passed,
      value: result.value,
      executionTimeMs: durationMs,
    };
  } catch (error) {
    const durationMs = performance.now() - startTime;
    logDecisionAudit({
      id: evaluationId,
      timestamp: new Date().toISOString(),
      tenantId: context.tenantContext.tenantId,
      userId: context.tenantContext.userId,
      eventType: "rule_evaluated",
      scope: rule.scope,
      context: {
        model: rule.scope.split(".")[0],
        ruleId: rule.id,
      },
      decision: {
        input: {
          ruleId: rule.id,
          category: rule.category,
          record: context.record,
        },
        output: { passed: false },
      },
      durationMs,
      status: "error",
      error: {
        message: error instanceof Error ? error.message : String(error),
        code: "RULE_EVALUATION_EXCEPTION",
        stack: error instanceof Error ? error.stack : undefined,
      },
    });

    throw error;
  }
}

/**
 * Evaluate all rules for a given category and scope.
 * Returns results in priority order (highest first).
 */
export function evaluateRulesForCategory(
  scope: string,
  category: RuleDefinition["category"],
  context: RuleExecutionContext,
  globalMetadata: Record<string, unknown> = {}
): RuleExecutionResult[] {
  const rules = getRulesForCategory(scope, category);
  return rules.map((rule) => evaluateRule(rule, context, globalMetadata));
}

/**
 * Compute a field value using applicable compute rules.
 * If multiple rules apply, returns the value from the highest-priority rule.
 */
export function computeFieldValue(
  fieldId: string,
  scope: string,
  context: RuleExecutionContext,
  globalMetadata: Record<string, unknown> = {}
): unknown {
  const ruleScope = `${scope}.compute.${fieldId}`;
  const rules = getRulesForScope(ruleScope);

  for (const rule of rules) {
    if (rule.category !== "compute") continue;

    const result = evaluateRule(rule, context, globalMetadata);
    if (result.passed && result.value !== undefined) {
      return result.value;
    }
  }

  return undefined;
}

/**
 * Check visibility for a field using applicable visibility rules.
 * Returns true if visible (or no rules apply), false if explicitly hidden.
 */
export function isFieldVisible(
  fieldId: string,
  scope: string,
  context: RuleExecutionContext,
  globalMetadata: Record<string, unknown> = {},
  defaultVisible: boolean = true
): boolean {
  const ruleScope = `${scope}.visibility.${fieldId}`;
  const rules = getRulesForScope(ruleScope);

  for (const rule of rules) {
    if (rule.category !== "visibility") continue;

    const result = evaluateRule(rule, context, globalMetadata);
    if (result.passed && result.value !== undefined) {
      return Boolean(result.value);
    }
  }

  return defaultVisible;
}
