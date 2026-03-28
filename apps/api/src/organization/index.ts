import type { OrganizationDefinition } from "@afenda/meta-types";
import * as organizationRepository from "./organization-repository.js";

const organizationStore = new Map<string, OrganizationDefinition>();
let persistenceEnabled = false;

function persistOrganizationsIfEnabled(): void {
  if (!persistenceEnabled) {
    return;
  }

  organizationRepository.saveOrganizationsSnapshot(Array.from(organizationStore.values()));
}

export function enableOrganizationPersistence(): void {
  persistenceEnabled = true;
}

export function disableOrganizationPersistence(): void {
  persistenceEnabled = false;
}

export function loadOrganizationsFromPersistence(): void {
  organizationStore.clear();

  for (const organization of organizationRepository.loadOrganizationsSnapshot()) {
    organizationStore.set(organization.id, organization);
  }
}

export function registerOrganization(organization: OrganizationDefinition): void {
  if (organizationStore.has(organization.id)) {
    throw new Error(`Organization "${organization.id}" is already registered.`);
  }

  organizationStore.set(organization.id, organization);
  persistOrganizationsIfEnabled();
}

export function updateOrganization(organization: OrganizationDefinition): void {
  organizationStore.set(organization.id, organization);
  persistOrganizationsIfEnabled();
}

export function getOrganization(id: string): OrganizationDefinition | undefined {
  return organizationStore.get(id);
}

export function listOrganizations(tenantId?: string): OrganizationDefinition[] {
  const organizations = Array.from(organizationStore.values());
  if (!tenantId) {
    return organizations;
  }

  return organizations.filter((organization) => organization.tenantId === tenantId);
}

export function removeOrganization(id: string): boolean {
  const removed = organizationStore.delete(id);

  if (removed) {
    persistOrganizationsIfEnabled();
  }

  return removed;
}

export function clearOrganizations(): void {
  organizationStore.clear();
  persistOrganizationsIfEnabled();
}
