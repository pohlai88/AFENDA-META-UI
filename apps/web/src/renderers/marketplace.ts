/**
 * Renderer Capability Marketplace
 * ================================
 * A feature economy where renderers compete based on capabilities.
 * The platform resolves the best renderer based on metadata requirements.
 */

import type { RendererType, RendererVersion, RendererCapabilities } from "./types/contracts";

/**
 * Performance characteristics of a renderer
 */
export interface RendererPerformance {
  /** Maximum recommended rows/records */
  maxRows: number;
  /** Complexity rating: low, medium, high */
  complexity: "low" | "medium" | "high";
  /** Memory footprint: small, medium, large */
  memory: "small" | "medium" | "large";
  /** Initialization speed: fast, medium, slow */
  initSpeed: "fast" | "medium" | "slow";
  /** Update frequency capability */
  realtimeCapable: boolean;
}

/**
 * Complete capability declaration for a renderer
 */
export interface CapabilityDeclaration {
  /** Renderer type */
  type: RendererType;
  /** Feature support matrix */
  supports: RendererCapabilities;
  /** Performance characteristics */
  performance: RendererPerformance;
  /** Semantic version */
  version: string;
  /** Cost score (higher = more expensive to run) */
  costScore: number;
}

/**
 * Metadata requirements - what the UI needs
 */
export interface MetadataRequirements {
  /** Required capabilities */
  required: Partial<RendererCapabilities>;
  /** Preferred but optional capabilities */
  preferred?: Partial<RendererCapabilities>;
  /** Performance constraints */
  performance?: {
    maxRows?: number;
    maxComplexity?: "low" | "medium" | "high";
    realtimeRequired?: boolean;
  };
  /** Cost constraints */
  maxCost?: number;
}

/**
 * Renderer match score
 */
export interface RendererMatch {
  rendererId: string;
  type: RendererType;
  version: RendererVersion;
  score: number;
  satisfiesRequired: boolean;
  satisfiesPreferred: number; // 0-100%
  performanceScore: number;
  costScore: number;
  reasons: string[];
}

/**
 * Check if renderer capabilities satisfy requirements
 */
export function satisfiesRequirements(
  capabilities: RendererCapabilities,
  requirements: Partial<RendererCapabilities>
): boolean {
  for (const [key, required] of Object.entries(requirements)) {
    if (required && !capabilities[key as keyof RendererCapabilities]) {
      return false;
    }
  }
  return true;
}

/**
 * Calculate how many preferred capabilities are met
 */
export function calculatePreferredScore(
  capabilities: RendererCapabilities,
  preferred?: Partial<RendererCapabilities>
): number {
  if (!preferred) return 100;

  const preferredKeys = Object.entries(preferred).filter(([_, value]) => value);
  if (preferredKeys.length === 0) return 100;

  const metCount = preferredKeys.filter(
    ([key]) => capabilities[key as keyof RendererCapabilities]
  ).length;

  return (metCount / preferredKeys.length) * 100;
}

/**
 * Calculate performance score based on requirements
 */
export function calculatePerformanceScore(
  performance: RendererPerformance,
  requirements: MetadataRequirements
): number {
  let score = 100;

  // Check row capacity
  if (requirements.performance?.maxRows) {
    const rowRatio = performance.maxRows / requirements.performance.maxRows;
    if (rowRatio < 1) {
      score -= 50; // Major penalty for insufficient capacity
    } else if (rowRatio < 2) {
      score -= 20; // Minor penalty for tight capacity
    }
  }

  // Check complexity
  if (requirements.performance?.maxComplexity) {
    const complexityMap = { low: 1, medium: 2, high: 3 };
    const requiredComplexity = complexityMap[requirements.performance.maxComplexity];
    const rendererComplexity = complexityMap[performance.complexity];

    if (rendererComplexity > requiredComplexity) {
      score -= 30; // Penalty for using complex renderer when simple one would work
    }
  }

  // Check realtime capability
  if (requirements.performance?.realtimeRequired && !performance.realtimeCapable) {
    return 0; // Hard requirement
  }

  // Bonus for fast init
  if (performance.initSpeed === "fast") {
    score += 10;
  } else if (performance.initSpeed === "slow") {
    score -= 10;
  }

  // Bonus for small memory
  if (performance.memory === "small") {
    score += 5;
  } else if (performance.memory === "large") {
    score -= 5;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Resolve best renderer for metadata requirements
 */
export function resolveRenderer(
  candidates: Array<{
    declaration: CapabilityDeclaration;
    rendererId: string;
    version: RendererVersion;
  }>,
  requirements: MetadataRequirements
): RendererMatch | null {
  const matches: RendererMatch[] = [];

  for (const candidate of candidates) {
    const { declaration, rendererId, version } = candidate;

    // Check required capabilities
    const satisfiesRequired = satisfiesRequirements(declaration.supports, requirements.required);

    if (!satisfiesRequired) {
      continue; // Skip renderers that don't meet requirements
    }

    // Calculate scores
    const satisfiesPreferred = calculatePreferredScore(
      declaration.supports,
      requirements.preferred
    );

    const performanceScore = calculatePerformanceScore(declaration.performance, requirements);

    const costScore = 100 - declaration.costScore; // Invert cost (lower cost = higher score)

    // Check cost constraint
    if (requirements.maxCost && declaration.costScore > requirements.maxCost) {
      continue; // Skip renderers that exceed cost budget
    }

    // Weighted total score
    const score = satisfiesPreferred * 0.4 + performanceScore * 0.4 + costScore * 0.2;

    matches.push({
      rendererId,
      type: declaration.type,
      version,
      score,
      satisfiesRequired,
      satisfiesPreferred,
      performanceScore,
      costScore,
      reasons: [
        `Preferred capabilities: ${satisfiesPreferred.toFixed(0)}%`,
        `Performance score: ${performanceScore.toFixed(0)}`,
        `Cost score: ${costScore.toFixed(0)}`,
      ],
    });
  }

  // Sort by score descending
  matches.sort((a, b) => b.score - a.score);

  return matches[0] || null;
}

/**
 * Marketplace singleton
 */
class RendererMarketplace {
  private declarations = new Map<string, CapabilityDeclaration>();

  /**
   * Register a renderer in the marketplace
   */
  register(rendererId: string, declaration: CapabilityDeclaration): void {
    this.declarations.set(rendererId, declaration);
    console.log(
      `[Marketplace] Registered renderer: ${rendererId} (${declaration.type}@${declaration.version})`
    );
  }

  /**
   * Get all renderers of a specific type
   */
  getByType(type: RendererType): Array<{ rendererId: string; declaration: CapabilityDeclaration }> {
    return Array.from(this.declarations.entries())
      .filter(([_, decl]) => decl.type === type)
      .map(([rendererId, declaration]) => ({ rendererId, declaration }));
  }

  /**
   * Find best renderer for requirements
   */
  resolve(type: RendererType, requirements: MetadataRequirements): RendererMatch | null {
    const candidates = this.getByType(type).map(({ rendererId, declaration }) => ({
      rendererId,
      declaration,
      version: this.extractVersion(declaration.version),
    }));

    return resolveRenderer(candidates, requirements);
  }

  /**
   * Get capability declaration for a renderer
   */
  getDeclaration(rendererId: string): CapabilityDeclaration | undefined {
    return this.declarations.get(rendererId);
  }

  /**
   * List all registered renderers
   */
  list(): Array<{ rendererId: string; declaration: CapabilityDeclaration }> {
    return Array.from(this.declarations.entries()).map(([rendererId, declaration]) => ({
      rendererId,
      declaration,
    }));
  }

  private extractVersion(semver: string): RendererVersion {
    const major = semver.split(".")[0];
    return `v${major}` as RendererVersion;
  }
}

export const marketplace = new RendererMarketplace();

/**
 * Convenience: Register renderer from existing registry
 */
export function registerFromRegistry(rendererId: string, declaration: CapabilityDeclaration): void {
  marketplace.register(rendererId, declaration);
}

/**
 * Convenience: Resolve best renderer and return rendererId
 */
export function findBestRenderer(
  type: RendererType,
  requirements: MetadataRequirements
): string | null {
  const match = marketplace.resolve(type, requirements);
  return match?.rendererId || null;
}
