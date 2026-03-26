# Consignment Operations Runbook

**Phase**: 7 - Consignment Workflow  
**Module**: `apps/api/src/modules/sales`  
**Version**: 1.0  
**Last Updated**: March 26, 2026

---

## Overview

This runbook defines operational procedures for managing consignment agreements, stock reports, and invoice generation in the AFENDA ERP system.

**Consignment Model**: Goods held at customer location, invoiced only when sold.

---

## 1. Agreement Lifecycle Management

### 1.1 Agreement States

| State | Description | Allowed Transitions |
|-------|-------------|---------------------|
| `draft` | Agreement under negotiation | → `active` |
| `active` | Agreement in force, reports can be submitted | → `expired`, `terminated` |
| `expired` | Agreement reached end_date | (terminal state) |
| `terminated` | Agreement cancelled before end_date | (terminal state) |

### 1.2 Agreement Activation

**Trigger**: Manual activation by authorized user  
**Preconditions**:
- Agreement status = `draft`
- All required fields populated (partner, start_date, end_date, payment_term)
- At least one active agreement line
- Partner credit limit check passed

**Process**:
```typescript
// POST /api/sales/consignment/agreements/:id/activate
{
  "actorId": "user-uuid"
}
```

**Post-conditions**:
- Agreement status → `active`
- Partner can submit stock reports
- System monitors for expiry

### 1.3 Agreement Expiry

**Trigger**: Automated cron job  
**Schedule**: Daily at 00:30 UTC  
**Implementation**: `checkAgreementExpiry()` in `consignment-engine.ts`

**Process**:
1. Query all agreements with:
   - `status = 'active'`
   - `end_date < CURRENT_DATE`
2. For each matching agreement:
   - Update `status = 'expired'`
   - Set `expired_at = CURRENT_TIMESTAMP`
   - Deactivate all agreement lines (`is_active = false`)
   - Log domain event: `AGREEMENT_EXPIRED`
3. Send notification to partner and sales team

**Monitoring**:
- Job execution logs in `domain_event_logs`
- Alert if job fails 2+ consecutive runs
- Verify daily report count matches agreements due for expiry

### 1.4 Agreement Termination

**Trigger**: Manual termination by authorized user  
**Preconditions**:
- Agreement status = `active`
- All pending reports processed (no reports with status = `draft` or `confirmed`)
- Authorization level: Sales Manager or above

**Process**:
```typescript
// POST /api/sales/consignment/agreements/:id/terminate
{
  "actorId": "user-uuid",
  "reason": "Business closure",
  "terminationDate": "2024-06-30"
}
```

**Post-conditions**:
- Agreement status → `terminated`
- Partner cannot submit new reports
- Existing confirmed reports can be invoiced
- Inventory return process initiated

---

## 2. Stock Report Validation

### 2.1 Report States

| State | Description | Allowed Transitions |
|-------|-------------|---------------------|
| `draft` | Report created, not yet submitted | → `confirmed` |
| `confirmed` | Report validated and confirmed | → `invoiced` |
| `invoiced` | Invoice generated from report | (terminal state) |

### 2.2 Report Submission Cadence

**Frequency**: As defined in `consignment_agreement_lines.min_report_period`
- `weekly`: 7-day intervals
- `monthly`: Calendar month-end

**Enforcement**:
- System validates gap between reports ≥ min_report_period
- Warning if report date > 45 days in past
- Block if report date > agreement.end_date

**Partner SLA**:
- Submit report within **5 business days** of period end
- Late submission triggers escalation to Account Manager

### 2.3 Report Validation Process

**Trigger**: Partner submission or authorized user validation  
**Endpoint**: `POST /api/sales/consignment/reports/validate`

**Validation Rules** (enforced by `validateStockReport()` engine):

1. **CONSIGN-1: Stock Balance Equation**
   ```
   opening_qty + received_qty - sold_qty - returned_qty = closing_qty
   ```
   - Severity: `error` if mismatch > 0.01 units
   - Action: Block confirmation until corrected

2. **CONSIGN-2: Max Quantity Check**
   ```
   closing_qty ≤ agreement_line.max_quantity
   ```
   - Severity: `warning` if exceeded
   - Action: Allow with Manager override

3. **CONSIGN-3: Negative Quantities**
   ```
   ALL quantities ≥ 0
   ```
   - Severity: `error` if negative
   - Action: Block submission

4. **CONSIGN-4: Line Total Accuracy**
   ```
   line_total = sold_qty × unit_price (within $0.01)
   ```
   - Severity: `error` if mismatch
   - Action: Auto-correct or block

**Process Flow**:
```
1. Partner submits report via UI/API
2. System runs validateStockReport(reportId)
3. IF all validations pass:
   → Status = 'confirmed'
   → Log REPORT_VALIDATED event
   → Send confirmation email
4. ELSE (validation errors):
   → Status remains 'draft'
   → Return error details to partner
   → Partner corrects and resubmits
```

**Performance SLA**:
- Validation response time: < 2 seconds for reports with ≤ 100 lines
- Batch validation: support up to 50 reports in parallel

### 2.4 Validation Monitoring

**Audit Trail**:
- All validations logged to `domain_invariant_logs` table
- Query path: `tenant_id + entity_type='consignment_report' + entity_id`

**Reports to Monitor**:
- Daily validation success rate (target: > 95%)
- Top 5 invariant codes with `status='fail'`
- Partner validation failure trends (flag if > 3 consecutive failures)

**Dashboard Metrics**:
```sql
-- Validation pass rate (last 30 days)
SELECT 
  DATE(evaluated_at) as date,
  COUNT(*) FILTER (WHERE status = 'pass') * 100.0 / COUNT(*) as pass_rate
FROM domain_invariant_logs
WHERE entity_type = 'consignment_report'
  AND evaluated_at > CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(evaluated_at);
```

---

## 3. Invoice Generation Workflow

### 3.1 Invoice Draft Creation

**Trigger**: Manual invoice request after report confirmation  
**Endpoint**: `POST /api/sales/consignment/reports/invoice-draft`

**Preconditions** (enforced by state machine):
- Report status = `confirmed`
- Report validation_valid = `true` (all invariants passed)
- Agreement status = `active`
- No existing invoice for this report

**Process**:
```typescript
// Request
{
  "reportId": "uuid",
  "actorId": "user-uuid"
}

// Response
{
  "invoiceDraft": {
    "lines": [
      {
        "productId": "uuid",
        "description": "Monitor - Sold Qty",
        "quantity": 8,
        "unitPrice": 589.99,
        "lineTotal": 4719.92,
        "taxIds": ["tax-uuid"]
      }
    ],
    "subtotal": 5682.42,
    "taxTotal": 568.24,
    "total": 6250.66
  }
}
```

**Business Logic** (from `generateInvoiceFromReport()`):
1. Validate state transition: confirmed → invoiced
2. For each report line with `sold_qty > 0`:
   - Create invoice line
   - Apply agreement unit_price
   - Calculate line_total = sold_qty × unit_price
3. Apply partner's fiscal position tax mapping
4. Apply partner's payment terms
5. Set invoice date = report.report_date
6. Update report: status = `invoiced`, invoiced_at = NOW()
7. Log domain event: `INVOICE_GENERATED`

**Idempotency**:
- Once report.status = `invoiced`, no further invoice generation allowed
- State machine `assertTransition()` prevents duplicate invocations

### 3.2 Invoice Approval Flow

**Approval Levels**:

| Invoice Total | Approval Required |
|---------------|-------------------|
| < $5,000 | Auto-approved |
| $5,000 - $50,000 | Sales Manager |
| > $50,000 | Finance Controller + Sales Director |

**Approval Process**:
```
1. Invoice draft created → Status = 'draft'
2. System determines approval requirements
3. IF auto-approved:
   → Status = 'approved'
   → Queue for posting
4. ELSE:
   → Send approval request to designated approvers
   → Await responses (parallel approval)
   → IF all approve:
     → Status = 'approved'
     → Queue for posting
   → ELSE:
     → Status = 'rejected'
     → Return to partner for correction
```

**Approval SLA**:
- < $5,000: Immediate (automated)
- $5,000 - $50,000: 24 business hours
- \> $50,000: 48 business hours

**Escalation**:
- If approval pending > SLA, escalate to next level manager
- If rejected 2+ times, flag for executive review

### 3.3 Invoice Posting

**Trigger**: Approved invoice posting (manual or automated)  
**Schedule**: 
- Auto posting: Daily at 02:00 UTC for auto-approved invoices
- Manual posting: On-demand for manager-approved invoices

**Accounting Impact**:
```
Debit:  Accounts Receivable (from partner.property_account_receivable_id)
Credit: Revenue (from product_category.income_account_id)
Debit:  COGS (from product.cost_of_goods_sold_account_id)
Credit: Inventory (from product.inventory_account_id)
```

**Inventory Update**:
- Decrement inventory by `sold_qty` for each line
- If inventory < 0, generate stockout alert

---

## 4. Monitoring & Alerting

### 4.1 Key Performance Indicators

**Agreement Metrics**:
- Active agreements count (target: stable or growing)
- Average agreement duration (target: > 9 months)
- Termination rate (target: < 5% per quarter)

**Report Metrics**:
- Reports submitted on time (target: > 90%)
- Validation pass rate (target: > 95%)
- Average time to confirm report (target: < 24 hours)

**Invoice Metrics**:
- Average days from report → invoice (target: < 3 days)
- Invoice approval cycle time (target: < SLA)
- Disputed invoice rate (target: < 2%)

### 4.2 Alert Conditions

**Critical Alerts** (immediate escalation):
- Expiry cron job failure
- Validation service down > 5 minutes
- Invoice posting failure > 3 consecutive attempts

**Warning Alerts** (review within 4 hours):
- Validation failure rate > 20% for single partner
- Report overdue > 10 days
- Agreement expiring in < 7 days with unprocessed reports

### 4.3 Operational Reports

**Daily Report** (sent 08:00 local time):
- Yesterday's report submissions (count, validation pass rate)
- Pending invoice approvals (count, aging)
- Agreements expiring in next 7 days

**Weekly Report** (sent Monday 09:00):
- Active agreements summary (new, terminated, total)
- Top 5 partners by consignment revenue
- Validation failure analysis (top invariant codes)

**Monthly Report** (sent 1st business day):
- Revenue by partner and product category
- Agreement renewal recommendations
- Partner credit utilization trends

---

## 5. Troubleshooting

### 5.1 Common Issues

**Issue**: Report validation fails with CONSIGN-1 (stock balance)  
**Resolution**:
1. Review report line quantities with partner
2. Check for data entry errors
3. If physical count discrepancy, partner must reconcile before resubmit
4. Log discrepancy reason in report notes

**Issue**: Invoice generation fails after confirmation  
**Resolution**:
1. Check agreement status (must be `active`)
2. Verify report validation_valid = true
3. Check for existing invoice (idempotency guard)
4. Review API logs for state machine errors

**Issue**: Expiry job doesn't mark agreements as expired  
**Resolution**:
1. Verify cron job execution in logs
2. Check system date/timezone configuration
3. Query agreements manually: `SELECT * FROM consignment_agreements WHERE status = 'active' AND end_date < CURRENT_DATE`
4. Run job manually if needed: `POST /api/cron/consignment-expiry` (requires admin auth)

### 5.2 Data Correction Procedures

**Correcting Report After Confirmation** (before invoice):
1. Admin reverts status: confirmed → draft
2. Partner makes corrections
3. Re-validate and re-confirm

**Correcting Report After Invoice** (requires finance approval):
1. Create credit note for original invoice
2. Partner submits corrected report
3. Generate new invoice
4. Link credit note → new invoice in notes

---

## 6. API Reference

### 6.1 Core Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/sales/consignment/reports/validate` | POST | Validate stock report |
| `/api/sales/consignment/reports/invoice-draft` | POST | Generate invoice from report |
| `/api/sales/consignment/agreements/expire` | POST | Expire agreements (cron) |
| `/api/sales/consignment/agreements/:id/activate` | POST | Activate draft agreement |
| `/api/sales/consignment/agreements/:id/terminate` | POST | Terminate active agreement |

### 6.2 Audit Query Examples

**Find all failed validations for a partner**:
```sql
SELECT 
  l.evaluated_at,
  l.invariant_code,
  l.context
FROM domain_invariant_logs l
JOIN consignment_stock_reports r ON l.entity_id = r.id::text
JOIN consignment_agreements a ON r.agreement_id = a.id
WHERE a.partner_id = '...'
  AND l.status = 'fail'
ORDER BY l.evaluated_at DESC
LIMIT 50;
```

**Find all invoice generation events**:
```sql
SELECT 
  created_at,
  entity_id,
  payload,
  triggered_by
FROM domain_event_logs
WHERE event_type = 'INVOICE_GENERATED'
  AND tenant_id = '...'
ORDER BY created_at DESC;
```

---

## 7. Runbook Maintenance

**Review Cadence**: Quarterly  
**Owner**: Sales Operations Manager  
**Approvers**: Finance Controller, Sales Director

**Change Control**:
- Minor updates (SLA adjustments, contact changes): Sales Ops approval
- Major changes (process redesign, new workflow): Finance + Sales approval
- Version control: All changes tracked in git with dated version tags

---

**End of Runbook**
