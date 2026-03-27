# Sales Orders Partition Preflight Evidence Log

Date: ____________________
Environment: ____________________
Operator: ____________________
Approver: ____________________
Window ID / Change Ticket: ____________________

---

## 1) Dry-Run Plan

- Command:
  - `pnpm --filter @afenda/db ops:partition:plan -- --years-ahead=3`
- Executed at (UTC): ____________________
- Output location (file/link): ____________________
- Result summary:
  - [ ] includes `preflight-parent-partitioned`
  - [ ] includes yearly partition actions
  - [ ] dry-run completed without errors

Notes:

____________________________________________________________________

---

## 2) Preflight SQL Checks (Before Apply)

### 2.1 Parent partitioned state

- Query result (`is_partitioned`): ____________________
- Evidence location: ____________________

### 2.2 Existing partitions

- Partition list captured: [ ] yes [ ] no
- Evidence location: ____________________

### 2.3 Default partition

- Query result (`has_default_partition`): ____________________
- Evidence location: ____________________

Decision:

- [ ] Parent already partitioned; apply skipped
- [ ] Parent not partitioned/partitions missing; apply required

---

## 3) Apply Execution (Only If Required)

- Command:
  - `pnpm --filter @afenda/db ops:partition:apply -- --years-ahead=3`
- Executed at (UTC): ____________________
- Output location (file/link): ____________________
- Result:
  - [ ] completed successfully
  - [ ] failed

If failed, include error summary:

____________________________________________________________________

---

## 4) Post-Execution Verification

### 4.1 Parent partitioned state

- Query result (`is_partitioned`): ____________________

### 4.2 Partitions present

- Expected partitions found: [ ] yes [ ] no
- Missing partitions: ____________________

### 4.3 Default partition present

- Query result (`has_default_partition`): ____________________

Evidence location for post-check outputs: ____________________

---

## 5) Outcome

- [ ] Partition proof complete
- [ ] Follow-up needed

Follow-up actions:

____________________________________________________________________

Final sign-off:

- Operator: ____________________
- Reviewer/DBA: ____________________
- Date (UTC): ____________________
