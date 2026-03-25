/**
 * Rule Engine Router
 * ==================
 * Express router for rule/expression evaluation endpoints.
 */

import { Router } from "express";
import {
  evaluateRuleHandler,
  computeFieldHandler,
  visibilityCheckHandler,
  validateRulesHandler,
  testExpressionHandler,
} from "./rules.js";

const router = Router();

/**
 * POST /api/rules/evaluate
 * Evaluate a specific rule in context
 */
router.post("/evaluate", evaluateRuleHandler);

/**
 * POST /api/rules/compute
 * Compute a field value using compute rules
 */
router.post("/compute", computeFieldHandler);

/**
 * POST /api/rules/visibility
 * Check field visibility using visibility rules
 */
router.post("/visibility", visibilityCheckHandler);

/**
 * POST /api/rules/validate
 * Run all validation rules for a scope
 */
router.post("/validate", validateRulesHandler);

/**
 * POST /api/expressions/test
 * Test a DSL expression against a context
 */
router.post("/test", testExpressionHandler);

export default router;
