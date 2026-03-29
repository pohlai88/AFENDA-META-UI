/**
 * Default masking rules per sensitivity level.
 * Extracted from @afenda/meta-types (Phase 2).
 */

import type { SensitivityLevel, MaskingRule } from "@afenda/meta-types/audit";

export const DEFAULT_MASKING_RULES: Record<SensitivityLevel, MaskingRule> = {
  low: { threshold: "low", strategy: "full" },
  medium: { threshold: "medium", strategy: "partial", revealChars: 2 },
  high: { threshold: "high", strategy: "full" },
};
