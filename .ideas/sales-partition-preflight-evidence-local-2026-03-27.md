# Sales Orders Partition Preflight Evidence Log

Date: 2026-03-27
Environment: local-docker-postgres (`afenda-postgres`)
Operator: Copilot session
Approver: N/A
Window ID / Change Ticket: N/A (local preflight evidence capture)

---

## 1) Dry-Run Plan

- Command:
  - `pnpm --filter @afenda/db ops:partition:plan -- --years-ahead=3`
- Executed at (UTC): 2026-03-26T20:46:04.633Z
- Output location (file/link): `.reports/db-maintenance/partition-plan-manual-preflight.txt`
- Result summary:
  - [x] includes `preflight-parent-partitioned`
  - [x] includes yearly partition actions
  - [x] dry-run completed without errors

Notes:

- Planned years in output: 2026, 2027, 2028, 2029
- Planned actions include default partition creation step.

---

## 2) Preflight SQL Checks (Before Apply)

### 2.1 Parent partitioned state

- Query result (`is_partitioned`): `false`
- Evidence location: `.reports/db-maintenance/partition-preflight-local-db-proof.txt`

### 2.2 Existing partitions

- Partition list captured: [x] yes [ ] no
- Rows returned: `0`
- Evidence location: `.reports/db-maintenance/partition-preflight-local-db-proof.txt`

### 2.3 Default partition

- Query result (`has_default_partition`): `false`
- Evidence location: `.reports/db-maintenance/partition-preflight-local-db-proof.txt`

Decision:

- [ ] Parent already partitioned; apply skipped
- [x] Parent not partitioned/partitions missing; apply required

---

## 3) Apply Execution (Only If Required)

- Command:
  - `pnpm --filter @afenda/db ops:partition:apply -- --years-ahead=3`
- Executed at (UTC): 2026-03-26T20:53:38.146Z
- Output location (file/link): `.reports/db-maintenance/partition-preflight-local-db-proof.txt`
- Result:
  - [x] completed successfully
  - [ ] failed
  - [ ] not executed (preflight SQL not completed)

Observed behavior:

- Actions executed without SQL errors.
- Parent remained non-partitioned after apply.
- Current apply logic is a no-op when parent is not already declared partitioned.

---

## 4) Post-Execution Verification

### 4.1 Parent partitioned state

- Query result (`is_partitioned`): `false`

### 4.2 Partitions present

- Expected partitions found: [ ] yes [x] no
- Missing partitions: `sales_orders_2026`, `sales_orders_2027`, `sales_orders_2028`, `sales_orders_2029`, `sales_orders_default`

### 4.3 Default partition present

- Query result (`has_default_partition`): `false`

Evidence location for post-check outputs: `.reports/db-maintenance/partition-preflight-local-db-proof.txt`

---

## 5) Outcome

- [ ] Partition proof complete
- [x] Follow-up needed

Follow-up actions:

1. Implement controlled parent-table partition conversion migration for `sales.sales_orders`.
2. Re-run apply and verification checks after conversion.
3. Repeat in staging/preprod/prod with signed evidence logs.

Blocking facts captured in this session:

- Parent table is currently non-partitioned in tested environment.
- Existing runner only creates child partitions when parent is already partitioned.

Hardening validation (same local environment):

- Added fail-fast preflight guard in partition planner to abort apply when parent table is missing.
- Evidence file: `.reports/db-maintenance/partition-apply-hardened-check.txt`
- Verified behavior: apply now fails explicitly with `Partition apply aborted: parent table sales.sales_orders does not exist`.

Final sign-off:

- Operator: Copilot session (local preflight)
- Reviewer/DBA: Pending
- Date (UTC): 2026-03-27
