import { z } from "zod/v4";

import type { R2BucketEventNotificationMessage } from "./objectRepo.types.js";

const r2NotificationSchema = z.object({
  account: z.string(),
  action: z.string(),
  bucket: z.string(),
  object: z.object({
    key: z.string(),
    size: z.number().optional(),
    eTag: z.string().optional(),
  }),
  eventTime: z.string(),
  copySource: z
    .object({
      bucket: z.string(),
      object: z.string(),
    })
    .optional(),
});

/**
 * Parse R2 → Queues notification body (Worker consumer or HTTP pull).
 * @see https://developers.cloudflare.com/r2/buckets/event-notifications/
 */
export function parseR2BucketEventNotification(
  body: unknown
): R2BucketEventNotificationMessage | null {
  const parsed = r2NotificationSchema.safeParse(body);
  return parsed.success ? (parsed.data as R2BucketEventNotificationMessage) : null;
}
