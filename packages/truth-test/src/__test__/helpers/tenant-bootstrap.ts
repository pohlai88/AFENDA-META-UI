import { sql } from "drizzle-orm";
import { db } from "@afenda/db";

function readTenantId(row: Record<string, unknown> | undefined): number | null {
  if (!row) return null;

  const tenantId = row.tenantId;
  if (typeof tenantId === "number") return tenantId;

  const tenantIdSnake = row.tenant_id;
  if (typeof tenantIdSnake === "number") return tenantIdSnake;

  return null;
}

export async function ensureTenant(tenantCode: string, name: string): Promise<number> {
  const existing = await db.execute(sql`
    select *
    from core.tenants
    where "tenantCode" = ${tenantCode}
    limit 1
  `);

  const existingId = readTenantId(existing.rows[0] as Record<string, unknown> | undefined);
  if (existingId !== null) return existingId;

  const inserted = await db.execute(sql`
    insert into core.tenants ("tenantCode", "name", "status")
    values (${tenantCode}, ${name}, 'ACTIVE')
    on conflict do nothing
    returning *
  `);

  const insertedId = readTenantId(inserted.rows[0] as Record<string, unknown> | undefined);
  if (insertedId !== null) return insertedId;

  const reloaded = await db.execute(sql`
    select *
    from core.tenants
    where "tenantCode" = ${tenantCode}
    limit 1
  `);

  const reloadedId = readTenantId(reloaded.rows[0] as Record<string, unknown> | undefined);
  if (reloadedId !== null) return reloadedId;

  throw new Error(`Failed to bootstrap tenant: ${tenantCode}`);
}
