/**
 * Zod Schema Validation Test Generator
 * =====================================
 * Auto-generates validation tests from Zod schemas using Zod 4 introspection.
 *
 * Strategy:
 * - Introspect schema._zod.def to determine type (object, enum, string, etc.)
 * - Generate valid input that passes validation
 * - Generate invalid inputs that correctly trigger validation errors
 * - 3+ tests per schema: valid acceptance, invalid type rejection, boundary checks
 */

import { describe, test, expect } from "vitest";
import { z, type ZodSchema } from "zod";

// ---------------------------------------------------------------------------
// Zod 4 Introspection Helpers
// ---------------------------------------------------------------------------

/** Get the Zod 4 type name from a schema */
function getZodType(schema: ZodSchema): string {
  const s = schema as any;
  return s._zod?.def?.type ?? s._def?.typeName ?? "unknown";
}

/** Get the def object from a Zod 4 schema */
function getDef(schema: ZodSchema): any {
  return (schema as any)._zod?.def ?? (schema as any)._def ?? {};
}

// ---------------------------------------------------------------------------
// Valid Input Generation (Zod 4)
// ---------------------------------------------------------------------------

/** Common candidate values for regex-constrained strings, ordered by specificity */
const STRING_CANDIDATES = [
  "12.50",       // money: /^\d+(\.\d{1,2})?$/
  "42",          // integer: /^\d+$/
  "AB",          // 2-char alpha: /^[A-Z]{2}$/i
  "ABC",         // 3-char alpha: /^[A-Z]{3}$/i
  "ABCD",        // 4-char alpha
  "/test",       // path: /^\/[a-z-]+$/
  "2024-01-01",  // date: /^\d{4}-\d{2}-\d{2}$/
  "2024-01-01T00:00:00.000Z", // ISO datetime
  "res.act",     // permission: /^[a-z]+\.[a-z]+$/
  "a",           // ultra-short fallback for maxLength
];

/**
 * Extract regex pattern from Zod 4 checks array.
 * Zod 4 stores regex checks as { _zod: { def: { pattern: RegExp } } }
 */
function extractRegexFromChecks(checks: unknown[]): RegExp | null {
  for (const check of checks) {
    const cDef = (check as any)?._zod?.def;
    if (cDef?.pattern instanceof RegExp) return cDef.pattern;
  }
  return null;
}

/** Extract maxLength from Zod 4 checks */
function extractMaxLength(checks: unknown[]): number | null {
  for (const check of checks) {
    const cDef = (check as any)?._zod?.def;
    if (cDef?.check === "max_length" && typeof cDef.maximum === "number") {
      return cDef.maximum;
    }
  }
  return null;
}

function generateValidInput(schema: ZodSchema): unknown {
  const def = getDef(schema);
  const type = def.type;

  switch (type) {
    case "string": {
      // 1. Handle built-in format constraints (uuid, email, url, etc.)
      if (def.format === "uuid") return "550e8400-e29b-41d4-a716-446655440000";
      if (def.format === "email") return "test@example.com";
      if (def.format === "url") return "https://example.com";
      if (def.format === "datetime") return "2024-01-01T00:00:00.000Z";
      if (def.format === "date") return "2024-01-01";
      if (def.format === "time") return "12:00:00";
      if (def.format === "ipv4") return "127.0.0.1";
      if (def.format === "ipv6") return "::1";

      // 2. Handle checks (regex patterns, maxLength, etc.)
      const checks = def.checks as unknown[] | undefined;
      if (checks?.length) {
        const regex = extractRegexFromChecks(checks);
        const maxLen = extractMaxLength(checks);

        if (regex) {
          // Try candidate values against the actual regex
          for (const candidate of STRING_CANDIDATES) {
            if (regex.test(candidate)) return candidate;
          }
        }

        if (maxLen !== null && maxLen < 11) {
          // Short maxLength — return truncated string
          return "test-str".slice(0, maxLen);
        }
      }

      return "test-string";
    }
    case "number":
      return 1;
    case "boolean":
      return true;
    case "enum": {
      // Zod 4: entries is { a: "a", b: "b" }, options is ["a","b"]
      const options = (schema as any).options ?? Object.values(def.entries ?? {});
      return options[0] ?? "unknown";
    }
    case "object": {
      const shape = typeof def.shape === "function" ? def.shape() : def.shape;
      if (!shape) return {};
      const obj: Record<string, unknown> = {};
      for (const [key, fieldSchema] of Object.entries(shape)) {
        const fieldDef = getDef(fieldSchema as ZodSchema);
        const fieldType = fieldDef.type;

        // Skip optional/nullable fields that aren't required
        if (fieldType === "optional" || fieldType === "nullable" || fieldType === "nullish") {
          // Generate value for the inner type anyway to be thorough
          if (fieldDef.innerType) {
            obj[key] = generateValidInput(fieldDef.innerType);
          }
          continue;
        }
        obj[key] = generateValidInput(fieldSchema as ZodSchema);
      }
      return obj;
    }
    case "array": {
      const element = def.element;
      if (element) {
        return [generateValidInput(element)];
      }
      return [];
    }
    case "record": {
      // Introspect the value type of record(keyType, valueType)
      const valueSchema = def.valueType ?? def.element;
      const sampleValue = valueSchema ? generateValidInput(valueSchema) : "value1";
      return { key1: sampleValue };
    }
    case "union": {
      // Use the first option
      const options = def.options ?? [];
      if (options.length > 0) {
        return generateValidInput(options[0]);
      }
      return "fallback";
    }
    case "lazy": {
      // z.lazy(() => innerSchema) — call the getter to materialize the inner schema
      const inner = def.getter?.();
      if (inner) return generateValidInput(inner);
      return {};
    }
    case "optional":
    case "nullable":
    case "nullish": {
      if (def.innerType) {
        return generateValidInput(def.innerType);
      }
      return undefined;
    }
    case "literal": {
      return def.value;
    }
    case "date":
      return new Date("2099-01-01T00:00:00.000Z"); // Far-future for "must be in the future" refinements
    case "bigint":
      return BigInt(1);
    case "undefined":
      return undefined;
    case "void":
      return undefined;
    case "any":
    case "unknown":
      return "test-value";
    case "never":
      return undefined; // will always fail, but we still generate it
    case "nan":
      return NaN;
    case "set": {
      const valueType = def.valueType;
      return new Set(valueType ? [generateValidInput(valueType)] : []);
    }
    case "map": {
      const keyType = def.keyType;
      const valType = def.valueType;
      return new Map([
        [
          keyType ? generateValidInput(keyType) : "key",
          valType ? generateValidInput(valType) : "value",
        ],
      ]);
    }
    case "tuple": {
      const items = def.items ?? [];
      return items.map((item: ZodSchema) => generateValidInput(item));
    }
    case "intersection": {
      // Merge both sides (best effort for two object types)
      const left = def.left ? generateValidInput(def.left) : {};
      const right = def.right ? generateValidInput(def.right) : {};
      if (typeof left === "object" && typeof right === "object" && left && right) {
        return { ...left, ...right };
      }
      return left;
    }
    case "default":
    case "prefault":
    case "catch": {
      // Wrapper types — introspect the inner type
      if (def.innerType) return generateValidInput(def.innerType);
      return undefined;
    }
    case "pipe": {
      // Pipeline: validate against the input schema (first in chain)
      if (def.in) return generateValidInput(def.in);
      return "test-value";
    }
    case "transform": {
      if (def.innerType) return generateValidInput(def.innerType);
      return "test-value";
    }
    case "readonly": {
      if (def.innerType) return generateValidInput(def.innerType);
      return "test-value";
    }
    case "promise": {
      if (def.innerType) return Promise.resolve(generateValidInput(def.innerType));
      return Promise.resolve(undefined);
    }
    case "custom":
      return "test-value";
    default:
      return "test-value";
  }
}

// ---------------------------------------------------------------------------
// Invalid Input Generation
// ---------------------------------------------------------------------------

/** Generate an input that's the wrong type entirely */
function generateWrongTypeInput(schema: ZodSchema): unknown {
  const type = getZodType(schema);
  switch (type) {
    case "string":
      return 12345;
    case "number":
      return "not-a-number";
    case "boolean":
      return "not-a-boolean";
    case "enum":
      return "__INVALID_ENUM_VALUE__";
    case "object":
      return "not-an-object";
    case "array":
      return "not-an-array";
    case "record":
      return "not-a-record";
    case "date":
      return "not-a-date";
    case "bigint":
      return "not-a-bigint";
    default:
      return Symbol("wrong-type"); // Symbols fail almost all Zod types
  }
}

// ---------------------------------------------------------------------------
// Test Case Generation
// ---------------------------------------------------------------------------

interface SchemaTestCase {
  name: string;
  input: unknown;
  shouldPass: boolean;
}

function extractSchemaTestCases(
  schemaName: string,
  schema: ZodSchema,
  validValueOverride?: unknown,
): SchemaTestCase[] {
  const type = getZodType(schema);
  const cases: SchemaTestCase[] = [];

  // Test 1: Valid input acceptance (use override if provided)
  cases.push({
    name: `${schemaName}: accepts valid input`,
    input: validValueOverride ?? generateValidInput(schema),
    shouldPass: true,
  });

  // Test 2: Wrong-type rejection
  cases.push({
    name: `${schemaName}: rejects wrong type input`,
    input: generateWrongTypeInput(schema),
    shouldPass: false,
  });

  // Test 3: null rejection
  cases.push({
    name: `${schemaName}: rejects null`,
    input: null,
    shouldPass: false,
  });

  // Test 4: Type-specific edge cases
  if (type === "object") {
    // Empty object should fail only if there are required (non-optional) fields
    const objDef = getDef(schema);
    const objShape = typeof objDef.shape === "function" ? objDef.shape() : objDef.shape;
    const hasRequiredFields = objShape && Object.values(objShape).some(
      (f: any) => {
        const ft = getDef(f as ZodSchema).type;
        return ft !== "optional" && ft !== "nullable" && ft !== "nullish";
      }
    );
    if (hasRequiredFields) {
      cases.push({
        name: `${schemaName}: rejects empty object (missing required fields)`,
        input: {},
        shouldPass: false,
      });
    }

    // Object with wrong field types
    const def = getDef(schema);
    const shape = typeof def.shape === "function" ? def.shape() : def.shape;
    if (shape && Object.keys(shape).length > 0) {
      const wrongFields: Record<string, unknown> = {};
      for (const key of Object.keys(shape)) {
        wrongFields[key] = Symbol("wrong");
      }
      cases.push({
        name: `${schemaName}: rejects object with wrong field types`,
        input: wrongFields,
        shouldPass: false,
      });
    }
  }

  if (type === "enum") {
    cases.push({
      name: `${schemaName}: rejects undefined`,
      input: undefined,
      shouldPass: false,
    });
  }

  if (type === "array") {
    // Array with wrong element types
    cases.push({
      name: `${schemaName}: rejects array with wrong element types`,
      input: [Symbol("wrong"), Symbol("wrong")],
      shouldPass: false,
    });
  }

  return cases;
}

// ---------------------------------------------------------------------------
// Test Runner
// ---------------------------------------------------------------------------

function generateValidationTest(testCase: SchemaTestCase, schema: ZodSchema): void {
  test(testCase.name, () => {
    const result = schema.safeParse(testCase.input);

    if (testCase.shouldPass) {
      if (!result.success) {
        // Better error message on unexpected failure
        const issues = result.error.issues.map(
          (i) => `  ${i.path.join(".")}: ${i.message}`
        );
        expect.fail(
          `Expected valid input to pass, but got errors:\n${issues.join("\n")}\nInput: ${JSON.stringify(testCase.input, null, 2)}`
        );
      }
      expect(result.data).toBeDefined();
    } else {
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(z.ZodError);
        expect(result.error.issues.length).toBeGreaterThan(0);
      }
    }
  });
}

/**
 * Schema registry for centralized schema definitions
 */
export interface SchemaRegistry {
  [schemaName: string]: ZodSchema;
}

/**
 * Main generator: Create validation tests for all schemas
 */
export function generateZodValidationTests(
  registry: SchemaRegistry,
  validValueOverrides?: Record<string, unknown>,
): void {
  describe("Zod Schema Validation Tests (Auto-Generated)", () => {
    for (const [schemaName, schema] of Object.entries(registry)) {
      describe(schemaName, () => {
        const override = validValueOverrides?.[schemaName];
        const testCases = extractSchemaTestCases(schemaName, schema, override);
        for (const testCase of testCases) {
          generateValidationTest(testCase, schema);
        }
      });
    }
  });
}
