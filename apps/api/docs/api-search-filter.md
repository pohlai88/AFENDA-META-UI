# API Search & Filter

## Overview

The API now supports **advanced filtering and sorting** for all model endpoints. Filters are expressed as JSON objects in query parameters and translated to safe SQL WHERE clauses using Drizzle ORM.

## Features

✅ **Multiple Filter Operators** - 12 operators (eq, neq, gt, gte, lt, lte, like, ilike, in, between, is_null, is_not_null)  
✅ **Logical Grouping** - Combine filters with AND/OR logic  
✅ **Sorting** - Single or multiple field sorting (asc/desc)  
✅ **Zod Validation** - All filter inputs validated before execution  
✅ **RBAC Integration** - Filters respect field visibility permissions  
✅ **SQL Injection Safe** - Uses parameterized queries via Drizzle ORM  

## Filter API

### Basic Filter (Array Format)

Simple filters can be passed as an array of conditions (implicit AND logic):

```
GET /api/partner?filters=[{"field":"type","op":"eq","value":"customer"}]
```

### Grouped Filters

For explicit AND/OR logic:

```json
{
  "logic": "and",
  "conditions": [
    {"field": "type", "op": "eq", "value": "customer"},
    {"field": "isActive", "op": "eq", "value": true}
  ]
}
```

URL encoded:
```
GET /api/partner?filters=%7B%22logic%22%3A%22and%22%2C%22conditions%22%3A%5B...
```

## Supported Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `eq` | Equals | `{"field":"status","op":"eq","value":"draft"}` |
| `neq` | Not equals | `{"field":"status","op":"neq","value":"cancelled"}` |
| `gt` | Greater than | `{"field":"price","op":"gt","value":100}` |
| `gte` | Greater than or equal | `{"field":"price","op":"gte","value":100}` |
| `lt` | Less than | `{"field":"price","op":"lt","value":50}` |
| `lte` | Less than or equal | `{"field":"price","op":"lte","value":50}` |
| `like` | SQL LIKE (case-sensitive) | `{"field":"name","op":"like","value":"%Corp%"}` |
| `ilike` | SQL ILIKE (case-insensitive) | `{"field":"email","op":"ilike","value":"%@example.com"}` |
| `in` | Value in array | `{"field":"status","op":"in","value":["draft","confirmed"]}` |
| `between` | Between two values | `{"field":"price","op":"between","value":[10,50]}` |
| `is_null` | Field is NULL | `{"field":"categoryId","op":"is_null"}` |
| `is_not_null` | Field is NOT NULL | `{"field":"email","op":"is_not_null"}` |

## Sorting

### Single Field Sort

```json
{"field": "name", "order": "asc"}
```

```
GET /api/partner?sort={"field":"name","order":"asc"}
```

### Multiple Field Sort

```json
[
  {"field": "status", "order": "desc"},
  {"field": "name", "order": "asc"}
]
```

```
GET /api/partner?sort=[{"field":"status","order":"desc"},{"field":"name","order":"asc"}]
```

## Response Format

```json
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 127,
    "filters": {
      "logic": "and",
      "conditions": [...]
    },
    "sort": [
      {"field": "name", "order": "asc"}
    ]
  }
}
```

## Usage Examples

### Example 1: Active Customers

```bash
curl -X GET "http://localhost:3001/api/partner?filters=%5B%7B%22field%22%3A%22type%22%2C%22op%22%3A%22eq%22%2C%22value%22%3A%22customer%22%7D%2C%7B%22field%22%3A%22isActive%22%2C%22op%22%3A%22eq%22%2C%22value%22%3Atrue%7D%5D" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Filter (decoded):
```json
[
  {"field":"type","op":"eq","value":"customer"},
  {"field":"isActive","op":"eq","value":true}
]
```

### Example 2: Products in Price Range

```bash
curl -X GET "http://localhost:3001/api/product?filters=%5B%7B%22field%22%3A%22unitPrice%22%2C%22op%22%3A%22between%22%2C%22value%22%3A%5B10%2C50%5D%7D%5D" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Filter (decoded):
```json
[
  {"field":"unitPrice","op":"between","value":[10,50]}
]
```

### Example 3: Search by Name (Case-Insensitive)

```bash
curl -X GET "http://localhost:3001/api/partner?filters=%5B%7B%22field%22%3A%22name%22%2C%22op%22%3A%22ilike%22%2C%22value%22%3A%22%25acme%25%22%7D%5D" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Filter (decoded):
```json
[
  {"field":"name","op":"ilike","value":"%acme%"}
]
```

### Example 4: Orders from 2024

```bash
curl -X GET "http://localhost:3001/api/sales_order?filters=%5B%7B%22field%22%3A%22orderDate%22%2C%22op%22%3A%22gte%22%2C%22value%22%3A%222024-01-01%22%7D%5D&sort=%7B%22field%22%3A%22orderDate%22%2C%22order%22%3A%22desc%22%7D" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Filter (decoded):
```json
[
  {"field":"orderDate","op":"gte","value":"2024-01-01"}
]
```

Sort (decoded):
```json
{"field":"orderDate","order":"desc"}
```

## RBAC Integration

Filters respect field visibility rules:

1. **Field-level permissions** - Only fields the user can read are returned
2. **Where clause application** - Filters can reference any field in the model
3. **Security note** - Filters on invisible fields are ignored but don't cause errors

Example: If a user cannot see the `cost` field, filtering by `cost` won't work, but the request won't fail.

## Implementation Details

### Query Builder Location

`apps/api/src/utils/queryBuilder.ts`

### Key Functions

- `parseFilters(filtersParam)` - Parse and validate filter JSON
- `parseSortParams(sortParam)` - Parse and validate sort JSON
- `buildWhereClause(table, filterGroup)` - Translate to Drizzle SQL conditions

### Modified Endpoints

- `GET /api/:model` - Now accepts `filters` and `sort` query parameters

### Zod Schemas

```typescript
FilterConditionSchema = z.object({
  field: z.string().min(1),
  op: z.enum(["eq", "neq", "gt", ...]),
  value: z.any().optional(),
});

FilterGroupSchema = z.object({
  logic: z.enum(["and", "or"]).default("and"),
  conditions: z.array(FilterConditionSchema),
});

SortParamSchema = z.object({
  field: z.string().min(1),
  order: z.enum(["asc", "desc"]).default("asc"),
});
```

## Error Handling

### Invalid Filter Format

```json
{
  "error": "Filter validation failed: Field name is required"
}
```
HTTP Status: `400 Bad Request`

### Invalid JSON

```json
{
  "error": "Invalid JSON in filters parameter"
}
```
HTTP Status: `400 Bad Request`

### Unknown Field

Filters on unknown fields are logged to console but don't cause request failure. The unknown filter is silently ignored.

## Testing

Test file with examples: `apps/api/src/utils/test-api-filters.ts`

### Quick Test (using curl)

1. Start API server:
   ```bash
   cd apps/api
   pnpm dev
   ```

2. Generate auth token:
   ```bash
   pnpm auth:token --userId admin --roles admin
   ```

3. Test filter:
   ```bash
   curl -X GET "http://localhost:3001/api/partner?filters=%5B%7B%22field%22%3A%22isActive%22%2C%22op%22%3A%22eq%22%2C%22value%22%3Atrue%7D%5D" \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

## Performance Considerations

- **Indexes**: Ensure frequently filtered fields have database indexes
- **Between Operator**: Most efficient for date ranges
- **LIKE/ILIKE**: Can be slow on large datasets without proper indexes (consider full-text search for text fields)
- **Pagination**: Always use `page` and `limit` parameters for large result sets

## Future Enhancements

- [ ] Full-text search operator (`fts`)
- [ ] Array contains operator (`array_contains`)
- [ ] JSON field querying (`json_extract`)
- [ ] Nested filter groups (e.g., `(A AND B) OR (C AND D)`)
- [ ] Filter presets/templates
- [ ] Query performance monitoring

---

**Status:** ✅ **PRODUCTION READY**  
**Security:** ✅ **SQL Injection Safe** (parameterized queries)  
**Validation:** ✅ **Zod Schemas** (input validation)  
**RBAC:** ✅ **Integrated** (respects field visibility)
