/**
 * Property-Based Tests
 * ====================
 * All generic and domain-specific property checks are generated from the
 * registry in ../auto/property-registry.ts.
 */

import { generatePropertyBasedTests } from "../auto/generate-property-tests.js";
import { discoverPropertyFunctions } from "../auto/property-registry.js";

// ---------------------------------------------------------------------------
// Dynamic generic properties (auto-discovered function registry)
// ---------------------------------------------------------------------------
generatePropertyBasedTests(discoverPropertyFunctions(), {
  fastCheck: {
    numRuns: 100,
  },
});
