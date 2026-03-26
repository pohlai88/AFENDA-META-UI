/**
 * DynamicFormRHF — React Hook Form Adapter
 * =========================================
 * Thin React layer that wires the framework-agnostic form engine
 * (schema, validation, visibility, path toolkit) to React Hook Form.
 *
 * All pure business logic lives in ./engine/.
 */

import React from "react";
import {
  useFieldArray,
  useForm,
  type Control,
  type FieldErrors,
  type Resolver,
  type UseFormSetValue,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ZodTypeAny } from "zod";
import type {
  DiscriminatedFieldProps,
  AsyncFormValidationRule,
  FieldArrayConfig,
  FieldConfig,
  FormLevelValidationRule,
  LeafFieldConfig,
} from "./index.js";
import { isFieldArrayConfig, isFieldGroupConfig } from "./index.js";
import { FieldRenderer } from "./FieldRenderer.js";

// Engine imports — framework-agnostic core
import {
  type DynamicFormValues,
  type AsyncFieldRule,
  joinPath,
  getValueByPath,
  hasValidationErrorAtPath,
  setValidationErrorAtPath,
  resolveWildcardPaths,
  matchPathPattern,
  isConditionSatisfied,
  buildZodSchemaFromFormConfig,
  asyncFieldValidationCache,
  asyncFormValidationCache,
  buildAsyncFieldCacheKey,
  buildAsyncFormCacheKey,
  DEFAULT_ASYNC_VALIDATION_CACHE_TTL_MS,
  runAsyncValidation,
  collectAsyncFieldRules,
  runAsyncFormLevelValidation,
  collectHiddenFieldPaths,
  invalidateAsyncFieldValidationValue,
} from "./engine/index.js";

// Re-export public API for backward compatibility
export type { DynamicFormValues } from "./engine/index.js";
export {
  buildZodSchemaFromFieldConfig,
  buildZodSchemaFromFormConfig,
  generateSchema,
  invalidateAsyncValidationCacheByScope,
  invalidateAsyncFieldValidationValue,
  invalidateAllAsyncValidationCaches,
} from "./engine/index.js";

// ---------------------------------------------------------------------------
// React-specific interfaces
// ---------------------------------------------------------------------------

interface DynamicFormRHFProps {
  fields: FieldConfig[];
  formLevelValidate?: FormLevelValidationRule[];
  initialValues?: DynamicFormValues;
  onSubmit: (values: DynamicFormValues) => void | Promise<void>;
  readonly?: boolean;
  submitLabel?: string;
  className?: string;
  schema?: ZodTypeAny;
  validationCacheScope?: string;
}

interface PendingAsyncValidationState {
  timer: ReturnType<typeof setTimeout>;
  resolve: (message: string | null) => void;
  abortController: AbortController;
}

interface PendingAsyncFormValidationState {
  timer: ReturnType<typeof setTimeout>;
  resolve: (result: { message: string | null; path: string }) => void;
  abortController: AbortController;
}

interface RenderContext {
  values: DynamicFormValues;
  errors: FieldErrors<DynamicFormValues>;
  setValue: UseFormSetValue<DynamicFormValues>;
  control: Control<DynamicFormValues>;
  readonly: boolean;
}

// ---------------------------------------------------------------------------
// Field Renderer Props Adapter
// ---------------------------------------------------------------------------

function createFieldRendererProps(
  field: LeafFieldConfig,
  rawValue: unknown,
  onValueChange: (value: unknown) => void,
  readonly: boolean
): DiscriminatedFieldProps {
  switch (field.type) {
    case "boolean":
      return {
        field,
        value: typeof rawValue === "boolean" ? rawValue : Boolean(rawValue),
        onChange: (value: boolean) => onValueChange(value),
        readonly,
      };

    case "integer":
    case "float":
    case "currency":
    case "decimal":
      return {
        field,
        value: typeof rawValue === "number" || rawValue == null ? rawValue : Number(rawValue),
        onChange: (value: number | null) => onValueChange(value),
        readonly,
      } as DiscriminatedFieldProps;

    case "date":
    case "datetime":
    case "time":
      return {
        field,
        value:
          rawValue == null || typeof rawValue === "string" || rawValue instanceof Date
            ? rawValue
            : String(rawValue),
        onChange: (value: string | Date | null) => onValueChange(value),
        readonly,
      } as DiscriminatedFieldProps;

    case "many2one":
      return {
        field,
        value:
          rawValue == null || typeof rawValue === "string" || typeof rawValue === "number"
            ? rawValue
            : String(rawValue),
        onChange: (value: string | number | null) => onValueChange(value),
        readonly,
      };

    case "one2many":
      return {
        field,
        value: Array.isArray(rawValue) ? rawValue : [],
        onChange: (value: Record<string, unknown>[]) => onValueChange(value),
        readonly,
      };

    default:
      return {
        field,
        value: rawValue,
        onChange: (value: unknown) => onValueChange(value),
        readonly,
      } as DiscriminatedFieldProps;
  }
}

function ArrayFieldSection({
  field,
  scopePath,
  context,
  renderNodes,
}: {
  field: FieldArrayConfig;
  scopePath: string;
  context: RenderContext;
  renderNodes: (nodes: FieldConfig[], nextScopePath: string, path: string[]) => React.ReactNode[];
}) {
  const arrayPath = joinPath(scopePath, field.name);
  const {
    fields: items,
    append,
    remove,
  } = useFieldArray({
    control: context.control,
    name: arrayPath as never,
  });

  const canAdd = field.maxItems === undefined || items.length < field.maxItems;
  const canRemove = field.minItems === undefined || items.length > field.minItems;

  return (
    <div className="space-y-3">
      {field.label && <label className="text-sm font-semibold">{field.label}</label>}

      {items.map((item, index) => {
        const itemScope = joinPath(arrayPath, String(index));

        return (
          <fieldset key={item.id} className="rounded-md border p-3">
            {field.itemLabel && (
              <legend className="px-1 text-sm font-medium">
                {field.itemLabel} {index + 1}
              </legend>
            )}
            <div className="space-y-3">
              {renderNodes(field.fields, itemScope, [field.name, String(index)])}
            </div>

            {!context.readonly && (
              <button
                type="button"
                disabled={!canRemove}
                onClick={() => remove(index)}
                className="mt-3 text-sm text-destructive disabled:opacity-50"
              >
                Remove
              </button>
            )}
          </fieldset>
        );
      })}

      {!context.readonly && (
        <button
          type="button"
          disabled={!canAdd}
          onClick={() => append({})}
          className="rounded bg-secondary px-3 py-1 text-secondary-foreground hover:bg-secondary/90 disabled:opacity-50"
        >
          Add {field.itemLabel ?? "Item"}
        </button>
      )}
    </div>
  );
}

export function DynamicFormRHF({
  fields,
  formLevelValidate,
  initialValues = {},
  onSubmit,
  readonly = false,
  submitLabel = "Submit",
  className,
  schema,
  validationCacheScope,
}: DynamicFormRHFProps) {
  const resolvedValidationCacheScope = React.useMemo(() => {
    const trimmedScope = validationCacheScope?.trim();
    return trimmedScope && trimmedScope.length > 0 ? trimmedScope : "global";
  }, [validationCacheScope]);

  const resolvedSchema = React.useMemo(
    () => schema ?? buildZodSchemaFromFormConfig({ fields, formLevelValidate }),
    [fields, formLevelValidate, schema]
  );

  const asyncFieldRules = React.useMemo(() => collectAsyncFieldRules(fields), [fields]);
  const asyncFormRules = React.useMemo(
    () =>
      (formLevelValidate ?? []).filter(
        (rule): rule is AsyncFormValidationRule => rule.rule === "async"
      ),
    [formLevelValidate]
  );

  const pendingAsyncValidationRef = React.useRef<Map<string, PendingAsyncValidationState>>(
    new Map()
  );
  const pendingAsyncFormValidationRef = React.useRef<Map<string, PendingAsyncFormValidationState>>(
    new Map()
  );

  const cancelPendingAsyncWork = React.useCallback(() => {
    pendingAsyncValidationRef.current.forEach((state) => {
      clearTimeout(state.timer);
      state.abortController.abort();
      state.resolve(null);
    });

    pendingAsyncFormValidationRef.current.forEach((state) => {
      clearTimeout(state.timer);
      state.abortController.abort();
      state.resolve({ message: null, path: "" });
    });

    pendingAsyncValidationRef.current.clear();
    pendingAsyncFormValidationRef.current.clear();
  }, []);

  React.useEffect(() => {
    return () => {
      cancelPendingAsyncWork();
    };
  }, [cancelPendingAsyncWork]);

  const baseResolver = React.useMemo(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- react-hook-form v5 compatibility
    () => zodResolver(resolvedSchema as any),
    [resolvedSchema]
  );

  const runDebouncedAsyncValidation = React.useCallback(
    (path: string, rule: AsyncFieldRule, value: unknown): Promise<string | null> => {
      const cacheKey = buildAsyncFieldCacheKey(resolvedValidationCacheScope, path, rule, value);
      const cacheTtlMs = rule.asyncValidate.cacheTtlMs ?? DEFAULT_ASYNC_VALIDATION_CACHE_TTL_MS;
      const cached = asyncFieldValidationCache.get(cacheKey, cacheTtlMs);

      if (cached !== undefined) {
        return Promise.resolve(cached);
      }

      const delayMs = rule.asyncValidate.debounceMs ?? 500;

      return new Promise((resolve) => {
        const existing = pendingAsyncValidationRef.current.get(path);

        if (existing) {
          clearTimeout(existing.timer);
          existing.abortController.abort();
          existing.resolve(null);
        }

        const abortController = new AbortController();
        const timer = setTimeout(() => {
          void runAsyncValidation(
            rule,
            path,
            resolvedValidationCacheScope,
            value,
            abortController.signal
          )
            .then((outcome) => {
              if (outcome.cacheable) {
                asyncFieldValidationCache.set(cacheKey, outcome.message);
              }

              resolve(outcome.message);
            })
            .finally(() => {
              const current = pendingAsyncValidationRef.current.get(path);

              if (current?.timer === timer) {
                pendingAsyncValidationRef.current.delete(path);
              }
            });
        }, delayMs);

        pendingAsyncValidationRef.current.set(path, {
          timer,
          resolve,
          abortController,
        });
      });
    },
    [resolvedValidationCacheScope]
  );

  const runDebouncedAsyncFormValidation = React.useCallback(
    (
      rule: AsyncFormValidationRule,
      values: DynamicFormValues
    ): Promise<{ message: string | null; path: string }> => {
      const cacheKey = buildAsyncFormCacheKey(resolvedValidationCacheScope, rule, values);
      const cacheTtlMs = rule.asyncValidate.cacheTtlMs ?? DEFAULT_ASYNC_VALIDATION_CACHE_TTL_MS;
      const cached = asyncFormValidationCache.get(cacheKey, cacheTtlMs);

      if (cached) {
        return Promise.resolve(cached);
      }

      const ruleKey =
        rule.asyncValidate.url +
        `::${rule.startField ?? ""}` +
        `::${rule.endField ?? ""}` +
        `::${rule.targetField ?? ""}`;
      const delayMs = rule.asyncValidate.debounceMs ?? 500;

      return new Promise((resolve) => {
        const existing = pendingAsyncFormValidationRef.current.get(ruleKey);

        if (existing) {
          clearTimeout(existing.timer);
          existing.abortController.abort();
          existing.resolve({ message: null, path: "" });
        }

        const abortController = new AbortController();
        const timer = setTimeout(() => {
          void runAsyncFormLevelValidation(
            rule,
            resolvedValidationCacheScope,
            values,
            abortController.signal
          )
            .then((result) => {
              if (result.cacheable) {
                asyncFormValidationCache.set(cacheKey, {
                  message: result.message,
                  path: result.path,
                });
              }

              resolve({ message: result.message, path: result.path });
            })
            .finally(() => {
              const current = pendingAsyncFormValidationRef.current.get(ruleKey);

              if (current?.timer === timer) {
                pendingAsyncFormValidationRef.current.delete(ruleKey);
              }
            });
        }, delayMs);

        pendingAsyncFormValidationRef.current.set(ruleKey, {
          timer,
          resolve,
          abortController,
        });
      });
    },
    [resolvedValidationCacheScope]
  );

  const resolver = React.useMemo<Resolver<DynamicFormValues>>(
    () => async (values, context, options) => {
      const baseResult = await baseResolver(values, context, options);

      if (asyncFieldRules.length === 0 && asyncFormRules.length === 0) {
        return baseResult;
      }

      const namesFromOptions = (options.names ?? []).map((name) => String(name));
      const candidatePaths =
        namesFromOptions.length > 0
          ? namesFromOptions
          : asyncFieldRules.flatMap((rule) => resolveWildcardPaths(values, rule.pathPattern));

      const mergedErrors = { ...baseResult.errors } as Record<string, unknown>;

      if (candidatePaths.length > 0) {
        for (const path of candidatePaths) {
          if (hasValidationErrorAtPath(baseResult.errors, path)) {
            continue;
          }

          const rule = asyncFieldRules.find((item) => matchPathPattern(item.pathPattern, path));
          if (!rule) {
            continue;
          }

          const value = getValueByPath(values, path);
          const asyncMessage = await runDebouncedAsyncValidation(path, rule, value);

          if (asyncMessage) {
            setValidationErrorAtPath(mergedErrors, path, asyncMessage);
          }
        }
      }

      const namesFromOptionsSet = new Set(namesFromOptions);

      for (const rule of asyncFormRules) {
        const relatedFields = [rule.startField, rule.endField, rule.targetField].filter(
          (field): field is string => Boolean(field)
        );
        const shouldRunRule =
          namesFromOptionsSet.size === 0 ||
          relatedFields.length === 0 ||
          relatedFields.some((field) => namesFromOptionsSet.has(field));

        if (!shouldRunRule) {
          continue;
        }

        const result = await runDebouncedAsyncFormValidation(rule, values);

        if (result.message) {
          setValidationErrorAtPath(mergedErrors, result.path, result.message);
        }
      }

      return {
        values: baseResult.values,
        errors: mergedErrors as FieldErrors<DynamicFormValues>,
      };
    },
    [
      asyncFieldRules,
      asyncFormRules,
      baseResolver,
      runDebouncedAsyncFormValidation,
      runDebouncedAsyncValidation,
    ]
  );

  const {
    handleSubmit,
    watch,
    setValue,
    reset,
    clearErrors,
    setError,
    control,
    formState: { errors },
  } = useForm<DynamicFormValues>({
    resolver,
    defaultValues: initialValues,
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const runFreshSubmissionChecks = React.useCallback(
    async (values: DynamicFormValues): Promise<boolean> => {
      const fieldRules = asyncFieldRules.filter(
        (rule) => rule.asyncValidate.finalCheckOnSubmit !== false
      );
      const formRules = asyncFormRules.filter(
        (rule) => rule.asyncValidate.finalCheckOnSubmit !== false
      );

      if (fieldRules.length === 0 && formRules.length === 0) {
        return true;
      }

      cancelPendingAsyncWork();
      clearErrors();

      let hasError = false;

      for (const rule of fieldRules) {
        const paths = resolveWildcardPaths(values, rule.pathPattern);

        for (const path of paths) {
          const value = getValueByPath(values, path);
          const outcome = await runAsyncValidation(rule, path, resolvedValidationCacheScope, value);

          if (outcome.cacheable) {
            const cacheKey = buildAsyncFieldCacheKey(
              resolvedValidationCacheScope,
              path,
              rule,
              value
            );
            asyncFieldValidationCache.set(cacheKey, outcome.message);
          }

          if (!outcome.message) {
            continue;
          }

          hasError = true;
          setError(path as never, {
            type: "asyncFinalCheck",
            message: outcome.message,
          });
        }
      }

      for (const rule of formRules) {
        const outcome = await runAsyncFormLevelValidation(
          rule,
          resolvedValidationCacheScope,
          values
        );

        if (outcome.cacheable) {
          const formCacheKey = buildAsyncFormCacheKey(resolvedValidationCacheScope, rule, values);
          asyncFormValidationCache.set(formCacheKey, {
            message: outcome.message,
            path: outcome.path,
          });
        }

        if (!outcome.message) {
          continue;
        }

        hasError = true;

        if (outcome.path) {
          setError(outcome.path as never, {
            type: "asyncFinalCheck",
            message: outcome.message,
          });
        } else {
          setError("root" as never, {
            type: "asyncFinalCheck",
            message: outcome.message,
          });
        }
      }

      return !hasError;
    },
    [
      asyncFieldRules,
      asyncFormRules,
      cancelPendingAsyncWork,
      clearErrors,
      resolvedValidationCacheScope,
      setError,
    ]
  );

  const handleSubmitWithInvalidation = React.useCallback(
    async (values: DynamicFormValues) => {
      const passedFreshChecks = await runFreshSubmissionChecks(values);
      if (!passedFreshChecks) {
        return;
      }

      await onSubmit(values);

      asyncFieldRules.forEach((rule) => {
        const paths = resolveWildcardPaths(values, rule.pathPattern);

        paths.forEach((path) => {
          const value = getValueByPath(values, path);
          void invalidateAsyncFieldValidationValue({
            scope: resolvedValidationCacheScope,
            fieldPath: path,
            value,
          });
        });
      });

      asyncFormRules.forEach((rule) => {
        const formCacheKey = buildAsyncFormCacheKey(resolvedValidationCacheScope, rule, values);
        asyncFormValidationCache.delete(formCacheKey);
      });
    },
    [
      asyncFieldRules,
      asyncFormRules,
      onSubmit,
      resolvedValidationCacheScope,
      runFreshSubmissionChecks,
    ]
  );

  React.useEffect(() => {
    reset(initialValues);
  }, [initialValues, reset]);

  const allValues = watch();

  const renderNodes = React.useCallback(
    (nodes: FieldConfig[], scopePath = "", path: string[] = []): React.ReactNode[] => {
      const context: RenderContext = {
        values: allValues,
        errors,
        setValue,
        control,
        readonly,
      };

      return nodes.map((field, index) => {
        const nodeKey = [...path, field.name || String(index)].join(".");

        if (field.showIf && !isConditionSatisfied(field.showIf, context.values, scopePath)) {
          return null;
        }

        if (isFieldGroupConfig(field)) {
          const groupScope = joinPath(scopePath, field.name);

          return (
            <fieldset key={nodeKey} className="rounded-md border p-4">
              {field.label && <legend className="px-1 text-sm font-semibold">{field.label}</legend>}
              <div className="space-y-4">
                {renderNodes(field.fields, groupScope, [...path, field.name])}
              </div>
            </fieldset>
          );
        }

        if (isFieldArrayConfig(field)) {
          return (
            <ArrayFieldSection
              key={nodeKey}
              field={field}
              scopePath={scopePath}
              context={context}
              renderNodes={renderNodes}
            />
          );
        }

        const fieldPath = joinPath(scopePath, field.name);

        const rendererProps = createFieldRendererProps(
          field,
          getValueByPath(context.values, fieldPath),
          (nextValue) => {
            setValue(fieldPath, nextValue, {
              shouldDirty: true,
              shouldTouch: true,
              shouldValidate: true,
            });
          },
          context.readonly || Boolean(field.readonly)
        );

        const fieldError = (getValueByPath(context.errors, `${fieldPath}.message`) ??
          getValueByPath(context.errors, fieldPath)) as { message?: unknown } | unknown;

        const errorText =
          typeof fieldError === "string"
            ? fieldError
            : typeof (fieldError as { message?: unknown })?.message === "string"
              ? (fieldError as { message: string }).message
              : undefined;

        return (
          <div key={nodeKey}>
            <FieldRenderer {...rendererProps} />
            {errorText && (
              <p className="mt-1 text-sm text-destructive" role="alert">
                {errorText}
              </p>
            )}
          </div>
        );
      });
    },
    [allValues, control, errors, readonly, setValue]
  );

  React.useEffect(() => {
    const hiddenPaths = collectHiddenFieldPaths(fields, allValues);
    hiddenPaths.forEach((path) => {
      clearErrors(path);
      setValue(path, undefined, {
        shouldDirty: true,
        shouldTouch: false,
        shouldValidate: true,
      });
    });
  }, [allValues, clearErrors, fields, setValue]);

  return (
    <form
      onSubmit={handleSubmit(handleSubmitWithInvalidation)}
      className={className ?? "space-y-4"}
    >
      {renderNodes(fields)}

      {typeof (errors as { root?: { message?: unknown } }).root?.message === "string" && (
        <p className="mt-1 text-sm text-destructive" role="alert">
          {(errors as { root?: { message?: string } }).root?.message}
        </p>
      )}

      {!readonly && (
        <button
          type="submit"
          className="rounded bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
        >
          {submitLabel}
        </button>
      )}
    </form>
  );
}

export const DynamicZodForm = DynamicFormRHF;
