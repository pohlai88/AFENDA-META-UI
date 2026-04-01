export function stableJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function tsFile(header: string, body: string): string {
  return `// AUTO-GENERATED FILE. DO NOT EDIT.\n// ${header}\n\n${body.trim()}\n`;
}
