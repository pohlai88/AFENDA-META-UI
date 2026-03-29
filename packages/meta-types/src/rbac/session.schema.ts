/**
 * @module rbac/session.schema
 * @description Zod schemas for RBAC session context and metadata resolution context.
 * @layer truth-contract
 */

import { z } from "zod";

export const SessionContextSchema = z.object({
  uid: z.string(),
  userId: z.string().optional(),
  roles: z.array(z.string()),
  lang: z.string(),
  timezone: z.string().optional(),
  tenantId: z.string().optional(),
  departmentId: z.string().optional(),
  industry: z.string().optional(),
});

export const ResolutionContextSchema = z.object({
  tenantId: z.string(),
  departmentId: z.string().optional(),
  userId: z.string().optional(),
  industry: z.string().optional(),
});
