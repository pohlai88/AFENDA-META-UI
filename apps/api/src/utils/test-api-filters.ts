/**
 * API Filter Test Examples
 * ========================
 *
 * Manual test examples for the quer builder and filtering API.
 *
 * Prerequisites:
 * 1. Start the API server: cd apps/api && pnpm dev
 * 2. Generate an auth token: pnpm auth:token --userId admin --roles admin
 * 3. Use the token in the Authorization header
 *
 * Test with curl or a REST client like Thunder Client, Postman, or HTTPie.
 */

// ---------------------------------------------------------------------------
// Example 1: Filter partners by type
// ---------------------------------------------------------------------------

/*
GET /api/partner?filters=[{"field":"type","op":"eq","value":"customer"}]
Authorization: Bearer <your-token>

Expected: Returns only partners where type = 'customer'
*/

// ---------------------------------------------------------------------------
// Example 2: Filter sales orders by status (multiple values)
// ---------------------------------------------------------------------------

/*
GET /api/sales_order?filters=[{"field":"status","op":"in","value":["draft","confirmed"]}]
Authorization: Bearer <your-token>

Expected: Returns sales orders with status in ['draft', 'confirmed']
*/

// ---------------------------------------------------------------------------
// Example 3: Filter products by price range
// ---------------------------------------------------------------------------

/*
GET /api/product?filters=[{"field":"unitPrice","op":"between","value":[10.00,50.00]}]
Authorization: Bearer <your-token>

Expected: Returns products with unitPrice between 10.00 and 50.00
*/

// ---------------------------------------------------------------------------
// Example 4: Filter partners by name (LIKE)
// ---------------------------------------------------------------------------

/*
GET /api/partner?filters=[{"field":"name","op":"like","value":"%Corp%"}]
Authorization: Bearer <your-token>

Expected: Returns partners with 'Corp' in their name
*/

// ---------------------------------------------------------------------------
// Example 5: Filter active products
// ---------------------------------------------------------------------------

/*
GET /api/product?filters=[{"field":"isActive","op":"eq","value":true}]
Authorization: Bearer <your-token>

Expected: Returns only active products
*/

// ---------------------------------------------------------------------------
// Example 6: Multiple filters (AND logic)
// ---------------------------------------------------------------------------

/*
GET /api/partner?filters={
  "logic":"and",
  "conditions":[
    {"field":"type","op":"eq","value":"customer"},
    {"field":"isActive","op":"eq","value":true}
  ]
}
Authorization: Bearer <your-token>

Expected: Returns partners that are customers AND active
*/

// ---------------------------------------------------------------------------
// Example 7: Multiple filters (OR logic)
// ---------------------------------------------------------------------------

/*
GET /api/partner?filters={
  "logic":"or",
  "conditions":[
    {"field":"type","op":"eq","value":"customer"},
    {"field":"type","op":"eq","value":"vendor"}
  ]
}
Authorization: Bearer <your-token>

Expected: Returns partners that are customers OR vendors
*/

// ---------------------------------------------------------------------------
// Example 8: Filter with sorting
// ---------------------------------------------------------------------------

/*
GET /api/partner?filters=[{"field":"isActive","op":"eq","value":true}]&sort={"field":"name","order":"asc"}
Authorization: Bearer <your-token>

Expected: Returns active partners sorted by name ascending
*/

// ---------------------------------------------------------------------------
// Example 9: Filter products by null category
// ---------------------------------------------------------------------------

/*
GET /api/product?filters=[{"field":"categoryId","op":"is_null"}]
Authorization: Bearer <your-token>

Expected: Returns products without a category assigned
*/

// ---------------------------------------------------------------------------
// Example 10: Filter sales orders by date range (greater than)
// ---------------------------------------------------------------------------

/*
GET /api/sales_order?filters=[{"field":"orderDate","op":"gte","value":"2024-01-01"}]
Authorization: Bearer <your-token>

Expected: Returns sales orders from 2024-01-01 onwards
*/

// ---------------------------------------------------------------------------
// Filter Operators Reference
// ---------------------------------------------------------------------------

/*
Supported Operators:
- eq: equals
- neq: not equals
- gt: greater than
- gte: greater than or equal
- lt: less than
- lte: less than or equal
- like: SQL LIKE (case-sensitive, use % for wildcards)
- ilike: SQL ILIKE (case-insensitive, use % for wildcards)
- in: value in array
- between: value between two values [min, max]
- is_null: field is NULL
- is_not_null: field is NOT NULL

Filter Format (legacy array):
[
  {"field":"status","op":"eq","value":"draft"}
]

Filter Format (grouped):
{
  "logic": "and" | "or",
  "conditions": [
    {"field":"status","op":"eq","value":"draft"}
  ]
}

Sort Format (single):
{"field":"name","order":"asc"}

Sort Format (multiple):
[
  {"field":"status","order":"desc"},
  {"field":"name","order":"asc"}
]
*/

export {};
