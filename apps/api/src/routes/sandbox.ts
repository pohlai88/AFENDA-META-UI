import { Router, type Request, type Response } from "express";
import { z } from "zod";
import type { PolicyDefinition, SimulationScenario } from "@afenda/meta-types";

import { requireAuth } from "../middleware/auth.js";
import { asyncHandler, ValidationError } from "../middleware/errorHandler.js";
import { analyzeBlastRadius, simulateBatch, simulateScenario } from "../sandbox/index.js";

export const sandboxRouter = Router();

const stringRecordSchema: z.ZodType<Record<string, unknown>> = z.record(z.string(), z.unknown());

const actorSchema = z.object({
  uid: z.string().min(1),
  roles: z.array(z.string().min(1)).default(["viewer"]),
});

const operationSchema = z.enum([
  "create",
  "update",
  "delete",
  "approve",
  "reject",
  "submit",
  "cancel",
  "post",
]);

const simulationScenarioSchema: z.ZodType<SimulationScenario> = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  entity: z.string().min(1),
  record: stringRecordSchema,
  relatedRecords: z.record(z.string(), z.array(stringRecordSchema)).optional(),
  actor: actorSchema,
  operation: operationSchema,
  previousRecord: stringRecordSchema.optional(),
});

const policyDefinitionSchema: z.ZodType<PolicyDefinition> = z.object({
  id: z.string().min(1),
  scope: z.string().min(1),
  name: z.string().min(1),
  when: z.string().min(1).optional(),
  validate: z.string().min(1),
  message: z.string().min(1),
  severity: z.enum(["error", "warning", "info"]),
  enabled: z.boolean().optional(),
  policyTags: z.array(z.string()).optional(),
});

const simulateRequestSchema = z.object({
  scenario: simulationScenarioSchema,
  policies: z.array(policyDefinitionSchema).optional(),
});

const batchRequestSchema = z.object({
  scenarios: z.array(simulationScenarioSchema).min(1),
  policies: z.array(policyDefinitionSchema).optional(),
});

const blastRadiusRequestSchema = z.object({
  policy: policyDefinitionSchema,
  records: z.record(
    z.string(),
    z.array(z.object({ id: z.string().min(1) }).passthrough())
  ),
});

sandboxRouter.post(
  "/simulate",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = simulateRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError("Invalid simulation payload.", parsed.error.flatten());
    }

    const report = simulateScenario(parsed.data.scenario, parsed.data.policies);
    res.json(report);
  })
);

sandboxRouter.post(
  "/batch",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = batchRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError("Invalid batch simulation payload.", parsed.error.flatten());
    }

    const reports = simulateBatch(parsed.data.scenarios, parsed.data.policies);
    res.json({ data: reports, meta: { total: reports.length } });
  })
);

sandboxRouter.post(
  "/blast-radius",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = blastRadiusRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError("Invalid blast-radius payload.", parsed.error.flatten());
    }

    const result = analyzeBlastRadius(parsed.data.policy, parsed.data.records);
    res.json(result);
  })
);

export default sandboxRouter;
