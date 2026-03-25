import React from "react";
import { DynamicZodForm, generateSchema } from "./DynamicFormRHF.js";
import { parseFormConfig } from "./parseFieldConfigs.js";
import { useValidationCacheScope } from "~/bootstrap/permissions-context";

interface ServerDrivenFormProps {
  configJson: unknown[] | unknown;
  onSubmit: (values: Record<string, unknown>) => void | Promise<void>;
  initialValues?: Record<string, unknown>;
  readonly?: boolean;
  submitLabel?: string;
  className?: string;
  validationCacheScope?: string;
}

export function ServerDrivenForm({
  configJson,
  onSubmit,
  initialValues,
  readonly,
  submitLabel,
  className,
  validationCacheScope,
}: ServerDrivenFormProps) {
  const contextValidationCacheScope = useValidationCacheScope();
  const resolvedValidationCacheScope = validationCacheScope ?? contextValidationCacheScope;

  const parseResult = React.useMemo(() => {
    try {
      const formConfig = parseFormConfig(configJson);

      return {
        fields: formConfig.fields,
        schema: generateSchema(formConfig),
        error: null as string | null,
      };
    } catch (error) {
      return {
        fields: [],
        schema: null,
        error: error instanceof Error ? error.message : "Invalid form configuration.",
      };
    }
  }, [configJson]);

  if (parseResult.error) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {parseResult.error}
      </p>
    );
  }

  return (
    <DynamicZodForm
      fields={parseResult.fields}
      schema={parseResult.schema ?? undefined}
      initialValues={initialValues}
      onSubmit={onSubmit}
      readonly={readonly}
      submitLabel={submitLabel}
      className={className}
      validationCacheScope={resolvedValidationCacheScope}
    />
  );
}
