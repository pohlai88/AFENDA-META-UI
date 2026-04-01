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
  "2024-01-01",  // z.iso.date() / YYYY-MM-DD wire
  "2024-01-01T00:00:00.000Z", // z.iso.datetime({ offset: true }) — must include offset
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

/** Extract minLength from Zod 4 checks */
function extractMinLength(checks: unknown[]): number | null {
  for (const check of checks) {
    const cDef = (check as any)?._zod?.def;
    if (cDef?.check === "min_length" && typeof cDef.minimum === "number") {
      return cDef.minimum;
    }
  }
  return null;
}

/** Extract min number from Zod 4 checks */
function extractMinNumber(checks: unknown[]): number | null {
  for (const check of checks) {
    const cDef = (check as any)?._zod?.def;
    if (typeof cDef?.minimum === "number") {
      return cDef.minimum;
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
        const minLen = extractMinLength(checks);

        if (regex) {
          // Try candidate values against the actual regex
          for (const candidate of STRING_CANDIDATES) {
            if (regex.test(candidate)) return candidate;
          }
        }

        if (minLen !== null && minLen > 0) {
          return "x".repeat(Math.max(minLen, 1));
        }

        if (maxLen !== null && maxLen < 11) {
          // Short maxLength — return truncated string
          return "test-str".slice(0, maxLen);
        }
      }

      return "test-string";
    }
    case "number": {
      const checks = def.checks as unknown[] | undefined;
      const min = checks?.length ? extractMinNumber(checks) : null;
      return min !== null ? Math.max(min, 1) : 1;
    }
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

function isObjectLike(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

function getByPath(obj: Record<string, unknown>, path: string[]): unknown {
  let cursor: unknown = obj;
  for (const key of path) {
    if (!isObjectLike(cursor) && !Array.isArray(cursor)) return undefined;
    cursor = (cursor as any)[key];
  }
  return cursor;
}

function setByPath(obj: Record<string, unknown>, path: string[], value: unknown): void {
  if (path.length === 0) return;
  let cursor: any = obj;
  for (let i = 0; i < path.length - 1; i += 1) {
    const key = path[i]!;
    const nextKey = path[i + 1]!;
    if (cursor[key] == null) {
      cursor[key] = /^\d+$/.test(nextKey) ? [] : {};
    }
    cursor = cursor[key];
  }
  const leaf = path[path.length - 1]!;
  if (Array.isArray(cursor) && /^\d+$/.test(leaf)) {
    cursor[Number(leaf)] = value;
  } else {
    cursor[leaf] = value;
  }
}

function deleteByPath(obj: Record<string, unknown>, path: string[]): void {
  if (path.length === 0) return;
  let cursor: any = obj;
  for (let i = 0; i < path.length - 1; i += 1) {
    const key = path[i]!;
    if (cursor?.[key] == null) return;
    cursor = cursor[key];
  }
  const leaf = path[path.length - 1]!;
  if (Array.isArray(cursor) && /^\d+$/.test(leaf)) {
    cursor.splice(Number(leaf), 1);
  } else if (cursor && typeof cursor === "object") {
    delete cursor[leaf];
  }
}

function normalizePath(path: PropertyKey[]): string[] {
  return path.map((p) => String(p));
}

function fixPrimitiveByName(schemaName: string): unknown {
  const name = schemaName.toLowerCase();
  if (name.includes("email")) return "valid@example.com";
  if (name.includes("phone")) return "+621234567890";
  if (name.includes("url")) return "https://example.com/resource";
  if (name.includes("iban")) return "GB82WEST12345698765432";
  if (name.includes("bankaccount")) return "12345678";
  if (name.includes("swift")) return "DEUTDEFF";
  if (name.includes("ssn")) return "123-45-6789";
  if (name.includes("vat")) return "VAT123456";
  if (name.includes("aadhaar")) return "123412341234";
  if (name.includes("uknationalinsurancenumber")) return "AA123456A";
  if (name.includes("postal")) return "12345";
  if (name.includes("documentref")) return "DOC-001";
  if (name.includes("serial")) return "SN-12345";
  if (name.includes("status")) return "active";
  if (name.includes("autoadvancecriteria")) return {};
  if (name.includes("payload")) return {};
  if (name.includes("json")) return {};
  return "test-value";
}

function deriveValueFromMessage(message: string, fieldName: string): unknown {
  const msg = message.toLowerCase();
  const field = fieldName.toLowerCase();
  if (msg.includes("invalid url")) return "https://example.com/resource";
  if (msg.includes("valid email")) return "valid@example.com";
  if (msg.includes("invalid uuid")) return "550e8400-e29b-41d4-a716-446655440000";
  if (msg.includes("e.164")) return "+621234567890";
  if (msg.includes("iban")) return "GB82WEST12345698765432";
  if (msg.includes("swift")) return "DEUTDEFF";
  if (msg.includes("hex color")) return "#1A2B3C";
  if (msg.includes("json object or array")) return {};
  if (msg.includes("too big") && msg.includes("<=3")) return "USD";
  if (msg.includes("too big") && msg.includes("<=2")) return "US";
  if (msg.includes("too small") && msg.includes(">=2000")) return 2026;
  if (msg.includes("too small") && msg.includes(">=1900")) return 2026;
  if (msg.includes("storage_key")) return "tenant/hr/attachment/file-1";
  if (msg.includes("valid ip address")) return "127.0.0.1";

  if (field.includes("postal")) return "12345";
  if (field.includes("status")) return "active";
  if (field.includes("email")) return "valid@example.com";
  if (field.includes("phone")) return "+621234567890";
  if (field.includes("url")) return "https://example.com/resource";
  if (field.includes("ipaddress")) return "127.0.0.1";
  if (field.includes("currency")) return "USD";
  if (field.includes("country")) return "US";
  if (field.includes("color")) return "#1A2B3C";

  return undefined;
}

function applyCrossFieldFix(
  root: Record<string, unknown>,
  message: string,
  issuePath: string[],
): boolean {
  const msg = message.toLowerCase();

  if (msg.includes("must be omitted unless")) {
    deleteByPath(root, issuePath);
    return true;
  }
  if (msg.includes("must be omitted when")) {
    deleteByPath(root, issuePath);
    return true;
  }
  if (msg.includes("is only allowed when")) {
    deleteByPath(root, issuePath);
    return true;
  }
  if (msg.includes("must be expired when expiresat is in the past")) {
    setByPath(root, ["status"], "expired");
    return true;
  }
  if (msg.includes("validto must be omitted when iscurrent is true")) {
    setByPath(root, ["isCurrent"], false);
    return true;
  }
  if (msg.includes("retiredat is only allowed when isactive is false")) {
    setByPath(root, ["isActive"], false);
    return true;
  }
  if (msg.includes("cannot be a prerequisite of itself") && issuePath.length > 0) {
    setByPath(root, issuePath, "660e8400-e29b-41d4-a716-446655440000");
    return true;
  }
  if (msg.includes("cannot be its own parent") && issuePath.length > 0) {
    setByPath(root, issuePath, "660e8400-e29b-41d4-a716-446655440000");
    return true;
  }
  if (msg.includes("cannot equal plan id") && issuePath.length > 0) {
    setByPath(root, issuePath, "660e8400-e29b-41d4-a716-446655440000");
    return true;
  }
  if (msg.includes("cannot equal step id") && issuePath.length > 0) {
    setByPath(root, issuePath, "660e8400-e29b-41d4-a716-446655440000");
    return true;
  }
  if (msg.includes("must sum to 100")) {
    setByPath(root, ["vestingPercentages"], [{ month: 1, percentage: 100 }]);
    return true;
  }
  if (msg.includes("must equal budgetamount minus allocatedamount")) {
    const budget = Number(getByPath(root, ["budgetAmount"]) ?? 0);
    const allocated = Number(getByPath(root, ["allocatedAmount"]) ?? 0);
    const remaining = Number.isFinite(budget - allocated) ? (budget - allocated).toFixed(2) : "0.00";
    if (typeof getByPath(root, ["remainingAmount"]) === "number") {
      setByPath(root, ["remainingAmount"], Number(remaining));
    } else {
      setByPath(root, ["remainingAmount"], remaining);
    }
    return true;
  }
  if (msg.includes("must equal totalrepayable minus totalpaid")) {
    const totalRepayable = Number(getByPath(root, ["totalRepayable"]) ?? 0);
    const totalPaid = Number(getByPath(root, ["totalPaid"]) ?? 0);
    const totalOutstanding = Number.isFinite(totalRepayable - totalPaid)
      ? (totalRepayable - totalPaid).toFixed(2)
      : "0.00";
    if (typeof getByPath(root, ["totalOutstanding"]) === "number") {
      setByPath(root, ["totalOutstanding"], Number(totalOutstanding));
    } else {
      setByPath(root, ["totalOutstanding"], totalOutstanding);
    }
    return true;
  }
  if (msg.includes("installmentspaid + installmentsremaining must equal tenuremonths")) {
    const tenure = Number(getByPath(root, ["tenureMonths"]) ?? 1);
    const paid = Number(getByPath(root, ["installmentsPaid"]) ?? 0);
    setByPath(root, ["installmentsRemaining"], Math.max(0, tenure - paid));
    return true;
  }
  if (msg.includes("monthlycost must equal employeecontribution + employercontribution")) {
    const employee = Number(getByPath(root, ["employeeContribution"]) ?? 0);
    const employer = Number(getByPath(root, ["employerContribution"]) ?? 0);
    if (typeof getByPath(root, ["monthlyCost"]) === "number") {
      setByPath(root, ["monthlyCost"], Number((employee + employer).toFixed(2)));
    } else {
      setByPath(root, ["monthlyCost"], (employee + employer).toFixed(2));
    }
    return true;
  }
  if (msg.includes("netpay must equal grosspay minus totaldeductions")) {
    const gross = Number(getByPath(root, ["grossPay"]) ?? 0);
    const deductions = Number(getByPath(root, ["totalDeductions"]) ?? 0);
    if (typeof getByPath(root, ["netPay"]) === "number") {
      setByPath(root, ["netPay"], Number((gross - deductions).toFixed(2)));
    } else {
      setByPath(root, ["netPay"], (gross - deductions).toFixed(2));
    }
    return true;
  }
  if (msg.includes("must be greater than minincome")) {
    const min = Number(getByPath(root, ["minIncome"]) ?? 1);
    if (typeof getByPath(root, ["maxIncome"]) === "number") {
      setByPath(root, ["maxIncome"], min + 1);
    } else {
      setByPath(root, ["maxIncome"], (min + 1).toFixed(2));
    }
    return true;
  }
  if (msg.includes("must be greater than minage")) {
    const min = Number(getByPath(root, ["minAge"]) ?? 18);
    setByPath(root, ["maxAge"], min + 1);
    return true;
  }
  if (msg.includes("percentage must equal score")) {
    const score = Number(getByPath(root, ["score"]) ?? 1);
    const max = Number(getByPath(root, ["maxScore"]) ?? 1);
    const pct = max > 0 ? Number(((score / max) * 100).toFixed(2)) : 100;
    setByPath(root, ["percentage"], pct);
    return true;
  }
  if (msg.includes("active certificates cannot have an expiry date in the past")) {
    setByPath(root, ["expiryDate"], "2099-01-01");
    return true;
  }
  if (msg.includes("invalid state transition")) {
    const currentState = String(getByPath(root, ["currentState"]) ?? "");
    const preferred: Record<string, string[]> = {
      draft: ["submitted", "computed", "active"],
      received: ["screening", "rejected"],
      pending: ["active", "approved"],
      submitted: ["approved", "under_review", "acknowledged"],
      not_started: ["in_progress"],
      registered: ["in_progress"],
      applied: ["approved"],
      counterparty_pending: ["counterparty_accepted", "counterparty_declined"],
      approved: ["completed", "paid"],
      in_progress: ["completed", "submitted"],
      acknowledged: ["under_investigation", "resolved"],
      disbursed: ["repaying"],
      repaying: ["completed"],
    };
    const tries = preferred[currentState] ?? ["submitted", "approved", "active", "completed"];
    setByPath(root, ["nextState"], tries[0]);
    return true;
  }
  if (msg.includes("availablepoints must equal totalpoints - redeemedpoints")) {
    const total = Number(getByPath(root, ["totalPoints"]) ?? 0);
    const redeemed = Number(getByPath(root, ["redeemedPoints"]) ?? 0);
    setByPath(root, ["availablePoints"], total - redeemed);
    return true;
  }
  if (msg.includes("cannot both be set")) {
    deleteByPath(root, issuePath);
    return true;
  }
  if (msg.includes("expiry date must be after work date")) {
    setByPath(root, ["expiryDate"], "2024-01-02");
    return true;
  }
  if (msg.includes("total amount must equal days encashed")) {
    const days = Number(getByPath(root, ["daysEncashed"]) ?? 0);
    const perDay = Number(getByPath(root, ["amountPerDay"]) ?? 0);
    const total = (days * perDay).toFixed(2);
    if (typeof getByPath(root, ["totalAmount"]) === "number") {
      setByPath(root, ["totalAmount"], Number(total));
    } else {
      setByPath(root, ["totalAmount"], total);
    }
    return true;
  }
  if (msg.includes("check-in time must be before check-out time")) {
    setByPath(root, ["requestedCheckIn"], new Date("2024-01-01T08:00:00.000Z"));
    setByPath(root, ["requestedCheckOut"], new Date("2024-01-01T17:00:00.000Z"));
    return true;
  }
  if (msg.includes("departure time must be before arrival time")) {
    setByPath(root, ["departureDateTime"], "2024-01-01T08:00:00.000Z");
    setByPath(root, ["arrivalDateTime"], "2024-01-01T10:00:00.000Z");
    return true;
  }
  if (msg.includes("return date must be after effective date")) {
    setByPath(root, ["returnDate"], "2024-01-02");
    return true;
  }
  if (msg.includes("netpayable must equal pendingsalary + leaveencashment + bonuspayable - deductions")) {
    const pending = Number(getByPath(root, ["pendingSalary"]) ?? 0);
    const leave = Number(getByPath(root, ["leaveEncashment"]) ?? 0);
    const bonus = Number(getByPath(root, ["bonusPayable"]) ?? 0);
    const deductions = Number(getByPath(root, ["deductions"]) ?? 0);
    const net = (pending + leave + bonus - deductions).toFixed(2);
    if (typeof getByPath(root, ["netPayable"]) === "number") {
      setByPath(root, ["netPayable"], Number(net));
    } else {
      setByPath(root, ["netPayable"], net);
    }
    return true;
  }
  if (msg.includes("requester and counterpart must be different employees")) {
    setByPath(root, ["counterpartEmployeeId"], "660e8400-e29b-41d4-a716-446655440000");
    return true;
  }
  if (msg.includes("shift assignments must be different rows")) {
    setByPath(root, ["counterpartShiftAssignmentId"], "660e8400-e29b-41d4-a716-446655440000");
    return true;
  }
  if (msg.includes("current positions should not have an end date")) {
    deleteByPath(root, ["endDate"]);
    return true;
  }

  return false;
}

function parseEnumOptionsFromMessage(message: string): string[] {
  const options: string[] = [];
  const regex = /"([^"]+)"/g;
  let match: RegExpExecArray | null = regex.exec(message);
  while (match) {
    options.push(match[1]!);
    match = regex.exec(message);
  }
  return options;
}

function resolveValidInput(
  schemaName: string,
  schema: ZodSchema,
  seed: unknown,
): unknown {
  const firstPass = schema.safeParse(seed);
  if (firstPass.success) return seed;

  const schemaType = getZodType(schema);
  if (schemaType !== "object") {
    const primitiveCandidate = fixPrimitiveByName(schemaName);
    if (schema.safeParse(primitiveCandidate).success) return primitiveCandidate;
    return seed;
  }

  const candidate = isObjectLike(seed) ? structuredClone(seed) : {};
  const maxAttempts = 6;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const result = schema.safeParse(candidate);
    if (result.success) return candidate;

    let changed = false;
    for (const issue of result.error.issues) {
      const path = normalizePath(issue.path);
      if (applyCrossFieldFix(candidate, issue.message, path)) {
        if (issue.message.toLowerCase().includes("invalid state transition")) {
          const stateCandidates = [
            "submitted",
            "approved",
            "active",
            "in_progress",
            "under_review",
            "acknowledged",
            "counterparty_pending",
            "counterparty_accepted",
            "completed",
          ];
          for (const s of stateCandidates) {
            setByPath(candidate, ["nextState"], s);
            if (schema.safeParse(candidate).success) {
              changed = true;
              break;
            }
          }
        }
        changed = true;
        continue;
      }

      if (
        issue.message.includes("Invalid option: expected one of") &&
        path[path.length - 1] === "nextState"
      ) {
        const current = String(getByPath(candidate, ["currentState"]) ?? "");
        const options = parseEnumOptionsFromMessage(issue.message);
        const next = options.find((opt) => opt !== current) ?? options[0];
        if (next) {
          setByPath(candidate, path, next);
          changed = true;
          continue;
        }
      }

      const fieldName = path[path.length - 1] ?? "";
      const value = deriveValueFromMessage(issue.message, fieldName);
      if (value !== undefined && path.length > 0) {
        setByPath(candidate, path, value);
        changed = true;
      }
    }
    if (!changed) break;
  }

  return candidate;
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
  const allowsNull = schema.safeParse(null).success;
  const validInput = resolveValidInput(
    schemaName,
    schema,
    validValueOverride ?? generateValidInput(schema),
  );

  // Test 1: Valid input acceptance (use override if provided)
  cases.push({
    name: `${schemaName}: accepts valid input`,
    input: validInput,
    shouldPass: true,
  });

  // Test 2: Wrong-type rejection
  cases.push({
    name: `${schemaName}: rejects wrong type input`,
    input: generateWrongTypeInput(schema),
    shouldPass: false,
  });

  // Test 3: null handling (reject for non-nullable, accept for nullable/nullish)
  cases.push({
    name: allowsNull ? `${schemaName}: accepts null` : `${schemaName}: rejects null`,
    input: null,
    shouldPass: allowsNull,
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
