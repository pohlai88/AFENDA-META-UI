/**
 * Marketplace Integration
 * =======================
 * Registers existing renderers in the capability marketplace
 */

import { marketplace, registerFromRegistry } from "./marketplace";
import type { CapabilityDeclaration } from "./marketplace";
import { RendererRegistry } from "./registry";
import { logger } from '../lib/logger';
const log = logger.child({ module: 'marketplace-bootstrap' });


/**
 * Performance profiles for each renderer
 */
const performanceProfiles = {
  "meta-list-v1": {
    maxRows: 10_000,
    complexity: "low" as const,
    memory: "small" as const,
    initSpeed: "fast" as const,
    realtimeCapable: false,
  },
  "meta-list-v2": {
    maxRows: 50_000,
    complexity: "medium" as const,
    memory: "medium" as const,
    initSpeed: "medium" as const,
    realtimeCapable: false,
  },
  "meta-form-v1": {
    maxRows: 1,
    complexity: "low" as const,
    memory: "small" as const,
    initSpeed: "fast" as const,
    realtimeCapable: false,
  },
  "meta-form-v2": {
    maxRows: 1,
    complexity: "medium" as const,
    memory: "medium" as const,
    initSpeed: "medium" as const,
    realtimeCapable: true,
  },
  "meta-dashboard-v1": {
    maxRows: 100,
    complexity: "high" as const,
    memory: "large" as const,
    initSpeed: "slow" as const,
    realtimeCapable: true,
  },
};

/**
 * Cost scores for each renderer
 * Higher = more expensive (CPU, memory, complexity)
 */
const costScores = {
  "meta-list-v1": 10,
  "meta-list-v2": 30,
  "meta-form-v1": 15,
  "meta-form-v2": 35,
  "meta-dashboard-v1": 60,
};

/**
 * Bootstrap marketplace with existing registry renderers
 */
export function bootstrapMarketplace(): void {
  // List v1
  if (RendererRegistry.list?.v1) {
    const contract = RendererRegistry.list.v1.contract;
    const declaration: CapabilityDeclaration = {
      type: "list",
      supports: contract.capabilities,
      performance: performanceProfiles["meta-list-v1"],
      version: "1.0.0",
      costScore: costScores["meta-list-v1"],
    };
    registerFromRegistry("meta-list-v1", declaration);
  }

  // List v2
  if (RendererRegistry.list?.v2) {
    const contract = RendererRegistry.list.v2.contract;
    const declaration: CapabilityDeclaration = {
      type: "list",
      supports: contract.capabilities,
      performance: performanceProfiles["meta-list-v2"],
      version: "2.1.0",
      costScore: costScores["meta-list-v2"],
    };
    registerFromRegistry("meta-list-v2", declaration);
  }

  // Form v1
  if (RendererRegistry.form?.v1) {
    const contract = RendererRegistry.form.v1.contract;
    const declaration: CapabilityDeclaration = {
      type: "form",
      supports: contract.capabilities,
      performance: performanceProfiles["meta-form-v1"],
      version: "1.0.0",
      costScore: costScores["meta-form-v1"],
    };
    registerFromRegistry("meta-form-v1", declaration);
  }

  // Form v2
  if (RendererRegistry.form?.v2) {
    const contract = RendererRegistry.form.v2.contract;
    const declaration: CapabilityDeclaration = {
      type: "form",
      supports: contract.capabilities,
      performance: performanceProfiles["meta-form-v2"],
      version: "2.0.0",
      costScore: costScores["meta-form-v2"],
    };
    registerFromRegistry("meta-form-v2", declaration);
  }

  // Dashboard v1
  if (RendererRegistry.dashboard?.v1) {
    const contract = RendererRegistry.dashboard.v1.contract;
    const declaration: CapabilityDeclaration = {
      type: "dashboard",
      supports: contract.capabilities,
      performance: performanceProfiles["meta-dashboard-v1"],
      version: "1.0.0",
      costScore: costScores["meta-dashboard-v1"],
    };
    registerFromRegistry("meta-dashboard-v1", declaration);
  }

  log.info(`[Marketplace] Bootstrapped with ${marketplace.list().length} renderers`);
}

// Auto-bootstrap on module load
bootstrapMarketplace();
