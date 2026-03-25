/**
 * Manual test script for expression evaluator
 * Run with: tsx src/meta/test-rbac-expressions.ts
 */

import { applyRbac } from "./rbac.js";
import type { ModelMeta, SessionContext } from "@afenda/meta-types";

// Sample model with expression-based action visibility
const testModel: ModelMeta = {
  model: "test_model",
  label: "Test Model",
  fields: [
    { name: "id", type: "integer", label: "ID", readonly: true },
    { name: "name", type: "string", label: "Name" },
    { name: "status", type: "string", label: "Status" },
  ],
  actions: [
    {
      id: "approve",
      label: "Approve",
      method: "POST",
      url: "/api/test_model/:id/approve",
      allowed_roles: ["admin", "manager"],
      visible_when: "hasRole(\"admin\") or hasRole(\"manager\")",
    },
    {
      id: "delete",
      label: "Delete",
      method: "DELETE",
      url: "/api/test_model/:id",
      allowed_roles: ["admin"],
      visible_when: "hasRole(\"admin\")",
    },
    {
      id: "edit",
      label: "Edit",
      method: "PATCH",
      url: "/api/test_model/:id",
      // No expression - should always be visible if allowed by roles
    },
    {
      id: "archive",
      label: "Archive",
      method: "POST",
      url: "/api/test_model/:id/archive",
      visible_when: "hasRole(\"admin\") or hasRole(\"manager\")",
    },
  ],
  views: {
    form: { type: "form", groups: [] },
    list: { type: "list", columns: [] },
  },
  permissions: {
    default_role_permissions: {
      admin: { can_create: true, can_read: true, can_update: true, can_delete: true },
      manager: { can_create: true, can_read: true, can_update: true, can_delete: false },
      viewer: { can_create: false, can_read: true, can_update: false, can_delete: false },
    },
  },
};

// Test scenarios
const scenarios = [
  {
    name: "Admin user",
    session: { uid: "user_1", roles: ["admin"], lang: "en" } as SessionContext,
    expectedActions: ["approve", "delete", "edit", "archive"],
  },
  {
    name: "Manager user",
    session: { uid: "user_2", roles: ["manager"], lang: "en" } as SessionContext,
    expectedActions: ["approve", "edit", "archive"],
  },
  {
    name: "Viewer user",
    session: { uid: "user_3", roles: ["viewer"], lang: "en" } as SessionContext,
    expectedActions: ["edit"], // Only edit has no expression restrictions
  },
  {
    name: "Multi-role user (manager + viewer)",
    session: { uid: "user_4", roles: ["manager", "viewer"], lang: "en" } as SessionContext,
    expectedActions: ["approve", "edit", "archive"],
  },
];

console.log("🧪 Testing RBAC Expression Evaluator\n");
console.log("=" .repeat(60));

let passed = 0;
let failed = 0;

for (const scenario of scenarios) {
  console.log(`\n📋 Scenario: ${scenario.name}`);
  console.log(`   Roles: ${scenario.session.roles.join(", ")}`);

  try {
    const result = applyRbac(testModel, scenario.session);
    const actualActions = result.meta.actions?.map((a) => a.id) ?? [];

    console.log(`   Expected actions: ${scenario.expectedActions.join(", ")}`);
    console.log(`   Actual actions:   ${actualActions.join(", ")}`);

    const match =
      actualActions.length === scenario.expectedActions.length &&
      scenario.expectedActions.every((name) => actualActions.includes(name));

    if (match) {
      console.log("   ✅ PASS");
      passed++;
    } else {
      console.log("   ❌ FAIL");
      failed++;
    }
  } catch (error) {
    console.log(`   ❌ ERROR: ${error}`);
    failed++;
  }
}

console.log("\n" + "=".repeat(60));
console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log("✅ All tests passed!");
  process.exit(0);
} else {
  console.log("❌ Some tests failed");
  process.exit(1);
}
