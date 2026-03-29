import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { OrganizationDefinition } from "@afenda/meta-types/platform";
import {
  clearOrganizations,
  disableOrganizationPersistence,
  enableOrganizationPersistence,
  getOrganization,
  listOrganizations,
  loadOrganizationsFromPersistence,
  registerOrganization,
  removeOrganization,
  updateOrganization,
} from "../index.js";
import {
  clearOrganizationsSnapshot,
  loadOrganizationsSnapshot,
  resetOrganizationSnapshotFilePath,
  setOrganizationSnapshotFilePath,
} from "../organization-repository.js";

const baseOrganization: OrganizationDefinition = {
  id: "org-1",
  tenantId: "tenant-1",
  name: "Northwind",
  enabled: true,
  slug: "northwind",
};

describe("organization store persistence", () => {
  beforeEach(() => {
    clearOrganizations();
    disableOrganizationPersistence();

    const tempDir = mkdtempSync(join(tmpdir(), "afenda-org-store-"));
    setOrganizationSnapshotFilePath(join(tempDir, "organizations.snapshot.json"));
    clearOrganizationsSnapshot();
  });

  afterEach(() => {
    clearOrganizations();
    disableOrganizationPersistence();
    clearOrganizationsSnapshot();
    resetOrganizationSnapshotFilePath();
  });

  it("persists create, update, and delete operations when persistence is enabled", () => {
    enableOrganizationPersistence();

    registerOrganization(baseOrganization);
    expect(loadOrganizationsSnapshot()).toEqual([baseOrganization]);

    const updatedOrganization = {
      ...baseOrganization,
      name: "Northwind Trading",
      enabled: false,
    } satisfies OrganizationDefinition;

    updateOrganization(updatedOrganization);
    expect(loadOrganizationsSnapshot()).toEqual([updatedOrganization]);

    expect(removeOrganization(updatedOrganization.id)).toBe(true);
    expect(loadOrganizationsSnapshot()).toEqual([]);
  });

  it("hydrates the in-memory store from the persisted snapshot", () => {
    enableOrganizationPersistence();
    registerOrganization(baseOrganization);
    disableOrganizationPersistence();
    clearOrganizations();

    expect(listOrganizations()).toEqual([]);

    loadOrganizationsFromPersistence();

    expect(getOrganization(baseOrganization.id)).toEqual(baseOrganization);
    expect(listOrganizations("tenant-1")).toEqual([baseOrganization]);
  });
});
