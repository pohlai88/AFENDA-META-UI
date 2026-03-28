import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import type { OrganizationDefinition } from "@afenda/meta-types";

const DEFAULT_SNAPSHOT_PATH = resolve(process.cwd(), ".data", "organizations.snapshot.json");

let snapshotFilePath = DEFAULT_SNAPSHOT_PATH;

interface OrganizationSnapshot {
  organizations: OrganizationDefinition[];
}

export function getOrganizationSnapshotFilePath(): string {
  return snapshotFilePath;
}

export function setOrganizationSnapshotFilePath(filePath: string): void {
  snapshotFilePath = resolve(filePath);
}

export function resetOrganizationSnapshotFilePath(): void {
  snapshotFilePath = DEFAULT_SNAPSHOT_PATH;
}

export function loadOrganizationsSnapshot(): OrganizationDefinition[] {
  if (!existsSync(snapshotFilePath)) {
    return [];
  }

  const raw = readFileSync(snapshotFilePath, "utf8");
  const parsed = JSON.parse(raw) as Partial<OrganizationSnapshot>;

  return Array.isArray(parsed.organizations) ? parsed.organizations : [];
}

export function saveOrganizationsSnapshot(organizations: OrganizationDefinition[]): void {
  mkdirSync(dirname(snapshotFilePath), { recursive: true });
  writeFileSync(
    snapshotFilePath,
    JSON.stringify({ organizations } satisfies OrganizationSnapshot, null, 2),
    "utf8"
  );
}

export function clearOrganizationsSnapshot(): void {
  if (existsSync(snapshotFilePath)) {
    rmSync(snapshotFilePath);
  }
}
