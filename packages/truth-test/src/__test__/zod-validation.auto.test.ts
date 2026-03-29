/**
 * Auto-Generated: Zod Schema Validation Tests
 * ============================================
 * Dynamic discovery from @afenda/meta-types and @afenda/db.
 * DO NOT EDIT: Schemas are auto-discovered via namespace imports.
 *
 * Sources:
 *   @afenda/meta-types — workflow, schema, rbac, platform, inventory
 *   @afenda/db          — sales enums, branded UUIDs, regex strings, reference enums
 */

import { generateZodValidationTests } from "../auto/generate-zod-tests.js";
import { schemaRegistry, validValueOverrides } from "../auto/schema-registry.js";

// Generate all validation tests from registry
generateZodValidationTests(schemaRegistry, validValueOverrides);
