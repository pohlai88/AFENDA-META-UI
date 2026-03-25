/**
 * Shared Diagnostic Utilities
 * ============================
 * Common utilities for formatting and displaying diagnostic information
 * across all CI gate checkers.
 */

/**
 * ANSI color codes
 */
export const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
};

/**
 * Format a file location reference
 */
export function formatLocation(file, line = null, column = null) {
  let location = colors.cyan + file + colors.reset;
  if (line !== null) {
    location += colors.dim + ':' + colors.reset + colors.yellow + line + colors.reset;
  }
  if (column !== null) {
    location += colors.dim + ':' + colors.reset + colors.yellow + column + colors.reset;
  }
  return location;
}

/**
 * Format an error with indentation and icons
 */
export function formatError(error) {
  const lines = [];
  
  // Location
  lines.push(formatLocation(error.file, error.line, error.column));
  
  // Message with icon
  const icon = error.severity === 'error' ? '❌' : '⚠️ ';
  lines.push(`  ${icon} ${colors.bright}${error.message}${colors.reset}`);
  
  // Additional context
  if (error.explanation) {
    lines.push(`     ${colors.dim}${error.explanation}${colors.reset}`);
  }
  
  // Code snippet if available
  if (error.code) {
    lines.push(`     ${colors.dim}${error.code}${colors.reset}`);
  }
  
  // Fix suggestions
  if (error.fixes && error.fixes.length > 0) {
    lines.push(`  ${colors.cyan}💡 Fix:${colors.reset}`);
    for (const fix of error.fixes) {
      lines.push(`     ${fix}`);
    }
  }
  
  return lines.join('\n');
}

/**
 * Format a box header
 */
export function formatBoxHeader(title, width = 60) {
  const padding = Math.max(0, width - title.length - 2);
  const leftPad = Math.floor(padding / 2);
  const rightPad = padding - leftPad;
  
  return [
    colors.bright + colors.blue + '╔' + '═'.repeat(width - 2) + '╗' + colors.reset,
    colors.bright + colors.blue + '║' + colors.reset + 
      ' '.repeat(leftPad) + colors.bright + title + colors.reset + 
      ' '.repeat(rightPad) + colors.bright + colors.blue + '║' + colors.reset,
    colors.bright + colors.blue + '╚' + '═'.repeat(width - 2) + '╝' + colors.reset,
  ].join('\n');
}

/**
 * Format a divider line
 */
export function formatDivider(width = 60, char = '─') {
  return colors.dim + char.repeat(width) + colors.reset;
}

/**
 * Format a section header
 */
export function formatSection(title) {
  return `\n${colors.bright}${colors.blue}${title}${colors.reset}\n${formatDivider()}`;
}

/**
 * Format a success message
 */
export function formatSuccess(message) {
  return `${colors.green}✓${colors.reset} ${message}`;
}

/**
 * Format a failure message
 */
export function formatFailure(message) {
  return `${colors.red}✗${colors.reset} ${message}`;
}

/**
 * Format a warning message
 */
export function formatWarning(message) {
  return `${colors.yellow}⚠${colors.reset} ${message}`;
}

/**
 * Format an info message
 */
export function formatInfo(message) {
  return `${colors.cyan}ℹ${colors.reset} ${message}`;
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
  return `${minutes}m ${seconds}s`;
}

/**
 * Format a summary table
 */
export function formatSummaryTable(rows, headers = null) {
  if (rows.length === 0) return '';
  
  // Calculate column widths
  const colWidths = [];
  const allRows = headers ? [headers, ...rows] : rows;
  
  for (const row of allRows) {
    row.forEach((cell, i) => {
      const cellStr = String(cell || '');
      colWidths[i] = Math.max(colWidths[i] || 0, cellStr.length);
    });
  }
  
  const lines = [];
  
  // Headers
  if (headers) {
    const headerRow = headers
      .map((h, i) => h.padEnd(colWidths[i]))
      .join('  ');
    lines.push(colors.bright + headerRow + colors.reset);
    lines.push('─'.repeat(headerRow.length));
  }
  
  // Data rows
  for (const row of rows) {
    const rowStr = row
      .map((cell, i) => String(cell || '').padEnd(colWidths[i]))
      .join('  ');
    lines.push(rowStr);
  }
  
  return lines.join('\n');
}

/**
 * Create a progress indicator
 */
export function createProgressIndicator(total) {
  let current = 0;
  
  return {
    increment(message = '') {
      current++;
      const percent = Math.round((current / total) * 100);
      const bar = '█'.repeat(Math.floor(percent / 5)) + '░'.repeat(20 - Math.floor(percent / 5));
      process.stdout.write(`\r[${bar}] ${percent}% ${message}`.padEnd(80));
      
      if (current >= total) {
        process.stdout.write('\n');
      }
    },
    
    complete(message = 'Done') {
      current = total;
      const bar = '█'.repeat(20);
      process.stdout.write(`\r[${bar}] 100% ${message}`.padEnd(80) + '\n');
    },
    
    clear() {
      process.stdout.write('\r'.padEnd(80) + '\r');
    },
  };
}

/**
 * Format a list with bullets
 */
export function formatList(items, bullet = '•') {
  return items.map(item => `  ${colors.dim}${bullet}${colors.reset} ${item}`).join('\n');
}

/**
 * Format a numbered list
 */
export function formatNumberedList(items) {
  return items.map((item, i) => `  ${colors.cyan}${i + 1}.${colors.reset} ${item}`).join('\n');
}

/**
 * Format a key-value pair
 */
export function formatKeyValue(key, value, indent = 2) {
  const padding = ' '.repeat(indent);
  return `${padding}${colors.dim}${key}:${colors.reset} ${value}`;
}

/**
 * Format a code block
 */
export function formatCodeBlock(code, language = '') {
  const lines = code.split('\n');
  const formatted = lines.map(line => 
    `  ${colors.dim}│${colors.reset} ${colors.cyan}${line}${colors.reset}`
  );
  return [
    `  ${colors.dim}┌─${language ? ` ${language} ` : ''}${'─'.repeat(Math.max(0, 50 - language.length))}${colors.reset}`,
    ...formatted,
    `  ${colors.dim}└${'─'.repeat(52)}${colors.reset}`,
  ].join('\n');
}

/**
 * Wrap text to specified width
 */
export function wrapText(text, width = 80, indent = 0) {
  const words = text.split(/\s+/);
  const lines = [];
  let currentLine = '';
  const indentStr = ' '.repeat(indent);
  
  for (const word of words) {
    if (currentLine.length + word.length + 1 > width - indent) {
      lines.push(indentStr + currentLine.trim());
      currentLine = word + ' ';
    } else {
      currentLine += word + ' ';
    }
  }
  
  if (currentLine.trim()) {
    lines.push(indentStr + currentLine.trim());
  }
  
  return lines.join('\n');
}

/**
 * Create a diagnostic context builder
 */
export class DiagnosticContext {
  constructor(title) {
    this.title = title;
    this.errors = [];
    this.warnings = [];
    this.info = [];
  }
  
  addError(error) {
    this.errors.push(error);
  }
  
  addWarning(warning) {
    this.warnings.push(warning);
  }
  
  addInfo(info) {
    this.info.push(info);
  }
  
  hasIssues() {
    return this.errors.length > 0 || this.warnings.length > 0;
  }
  
  format() {
    const lines = [];
    
    lines.push(formatSection(this.title));
    
    if (this.errors.length > 0) {
      lines.push(formatFailure(`${this.errors.length} error(s) found`));
      lines.push('');
      for (const error of this.errors) {
        lines.push(formatError(error));
        lines.push('');
      }
    }
    
    if (this.warnings.length > 0) {
      lines.push(formatWarning(`${this.warnings.length} warning(s) found`));
      lines.push('');
      for (const warning of this.warnings) {
        lines.push(formatError({ ...warning, severity: 'warning' }));
        lines.push('');
      }
    }
    
    if (this.info.length > 0) {
      for (const info of this.info) {
        lines.push(formatInfo(info));
      }
    }
    
    if (!this.hasIssues()) {
      lines.push(formatSuccess('No issues found'));
    }
    
    return lines.join('\n');
  }
}
