import type { Request } from "express";

function parsePositiveActorId(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isInteger(value) && value > 0 ? value : null;
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }

  return null;
}

export function resolveActorId(req: Request): string | undefined {
  const uid = (req.session as { uid?: string | number } | undefined)?.uid;
  if (typeof uid === "number") {
    return String(uid);
  }

  return typeof uid === "string" && uid.length > 0 ? uid : undefined;
}

export function resolveNumericActorId(req: Request, bodyActor?: unknown): number | null {
  const actorFromBody = parsePositiveActorId(bodyActor);
  if (actorFromBody) {
    return actorFromBody;
  }

  const sessionWithUserId = req.session as { userId?: string | number } | undefined;
  const actorFromUserId = parsePositiveActorId(sessionWithUserId?.userId);
  if (actorFromUserId) {
    return actorFromUserId;
  }

  return parsePositiveActorId((req.session as { uid?: string | number } | undefined)?.uid);
}
