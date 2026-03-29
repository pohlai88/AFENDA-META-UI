import re

file_path = r'd:\AFENDA-META-UI\packages\db\src\schema\hr\tables.ts'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

lines = content.split('\n')
result_lines = []
current_table = None

for line in lines:
    # Detect table name
    match = re.search(r'export const \w+ = hrSchema\.table\(\s*"([^"]+)"', line)
    if match:
        current_table = match.group(1)

    # Replace RLS policy calls
    newline = line
    if current_table:
        newline = newline.replace('...tenantIsolationPolicies("hr_")', f'...tenantIsolationPolicies("{current_table}")')
        newline = newline.replace('serviceBypassPolicy("hr_")', f'serviceBypassPolicy("{current_table}")')

    result_lines.append(newline)

with open(file_path, 'w', encoding='utf-8', newline='\n') as f:
    f.write('\n'.join(result_lines))

print("Fixed RLS policies")
