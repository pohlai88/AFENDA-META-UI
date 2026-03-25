/**
 * Visibility Policy
 * =================
 * Determines which field paths should be cleared when their
 * visibility conditions are no longer met.
 *
 * Framework-agnostic — returns paths; UI layer applies the clearing.
 */

import type { FieldConfig } from "../../index.js";
import { isFieldArrayConfig, isFieldGroupConfig } from "../../index.js";
import type { DynamicFormValues } from "../types.js";
import { joinPath, getValueByPath } from "../path/pathToolkit.js";
import { isConditionSatisfied } from "../schema/conditionalRules.js";

/**
 * Walks the field tree and collects dot-paths of fields that are currently
 * hidden (their `showIf` condition evaluates to `false`).
 *
 * The caller is responsible for clearing values and errors at these paths.
 */
export function collectHiddenFieldPaths(
  fields: FieldConfig[],
  values: DynamicFormValues,
  scopePath = ""
): string[] {
  const hidden: string[] = [];

  fields.forEach((field) => {
    const isVisible = !field.showIf || isConditionSatisfied(field.showIf, values, scopePath);

    if (!isVisible) {
      const targetPath = joinPath(scopePath, field.name);

      if (isFieldGroupConfig(field)) {
        hidden.push(...collectHiddenFieldPaths(field.fields, values, targetPath));
        return;
      }

      hidden.push(targetPath);
      return;
    }

    if (isFieldGroupConfig(field)) {
      hidden.push(...collectHiddenFieldPaths(field.fields, values, joinPath(scopePath, field.name)));
      return;
    }

    if (isFieldArrayConfig(field)) {
      const arrayPath = joinPath(scopePath, field.name);
      const items = getValueByPath(values, arrayPath);

      if (Array.isArray(items)) {
        items.forEach((_, index) => {
          hidden.push(...collectHiddenFieldPaths(field.fields, values, joinPath(arrayPath, String(index))));
        });
      }
    }
  });

  return hidden;
}
