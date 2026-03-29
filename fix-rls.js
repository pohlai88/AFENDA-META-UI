

const fs = require('fs');
const path = require('path');

const filePath = path.join('d:', 'AFENDA-META-UI', 'packages', 'db', 'src', 'schema', 'hr', 'tables.ts');

// Read the backup if it exists, otherwise try to revert
let content;
try {
  const backupPath = filePath + '.backup';
  if (fs.existsSync(backupPath)) {
    content = fs.readFileSync(backupPath, 'utf8');
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Restored from backup');
  } else {
    console.log('No backup found, trying to fix current file');
    content = fs.readFileSync(filePath, 'utf8');
  }
} catch (err) {
  console.error('Error:', err);
  process.exit(1);
}

const lines = content.split('\n');
const result = [];
let currentTable = null;

for (const line of lines) {
  const match = line.match(/export const \w+ = hrSchema\.table\(\s*"([^"]+)"/);
  if (match) {
    currentTable = match[1];
  }

  let newLine = line;
  if (currentTable) {
    newLine = newLine.replace(/\.\.\. tenantIsolationPolicies\("hr_"\)/g, `...tenantIsolationPolicies("${currentTable}")`);
    newLine = newLine.replace(/serviceBypassPolicy\("hr_"\)/g, `serviceBypassPolicy("${current Table}")`);
  }

  result.push(newLine);
}

fs.writeFileSync(filePath, result.join('\n'), 'utf8');
console.log('Fixed!');
