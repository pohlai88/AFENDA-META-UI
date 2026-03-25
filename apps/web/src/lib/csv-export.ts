/**
 * CSV Export Utilities
 * ====================
 * Utilities for exporting data to CSV format with proper escaping.
 */

import type { MetaField } from "@afenda/meta-types";

/**
 * Escape CSV cell value (handle quotes, commas, newlines)
 */
function escapeCsvCell(value: unknown): string {
  if (value == null) return "";
  
  const str = String(value);
  
  // If contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  
  return str;
}

/**
 * Format field value for CSV export
 */
function formatCsvValue(value: unknown, field: MetaField): string {
  if (value == null) return "";

  switch (field.type) {
    case "boolean":
      return value ? "Yes" : "No";
    
    case "date":
      if (typeof value === "string" || value instanceof Date) {
        return new Date(value).toLocaleDateString();
      }
      break;
    
    case "datetime":
      if (typeof value === "string" || value instanceof Date) {
        return new Date(value).toLocaleString();
      }
      break;
    
    case "currency":
      if (typeof value === "number") {
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(value);
      }
      break;
    
    case "float":
      if (typeof value === "number") {
        return value.toFixed(2);
      }
      break;
  }

  return String(value);
}

/**
 * Export records to CSV and trigger download
 */
export function exportToCsv(
  records: Record<string, unknown>[],
  fields: MetaField[],
  columns: string[],
  filename: string
): void {
  if (records.length === 0) {
    return;
  }

  // Get field metadata for columns
  const fieldMap = new Map(fields.map((f) => [f.name, f]));
  const exportFields = columns
    .map((col) => fieldMap.get(col))
    .filter((f): f is MetaField => f != null);

  // Build CSV header
  const header = exportFields.map((f) => escapeCsvCell(f.label || f.name)).join(",");

  // Build CSV rows
  const rows = records.map((record) => {
    return exportFields
      .map((field) => {
        const value = record[field.name];
        const formatted = formatCsvValue(value, field);
        return escapeCsvCell(formatted);
      })
      .join(",");
  });

  // Combine header + rows
  const csv = [header, ...rows].join("\n");

  // Trigger download
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
