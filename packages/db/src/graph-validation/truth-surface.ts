/**
 * Contract pattern for "verified" domain reads — documentation-first.
 * Does not replace offline graph-validation; links read models to last validation schedule.
 */

export interface TruthSurface<T> {
  /** Stable domain id, e.g. `hr.workforceStrategy.listActive`. */
  readonly entity: string;
  /** Semantic version of the query contract. */
  readonly version: string;
  /** Execute the read (Drizzle or SQL). */
  readonly query: (input: unknown) => Promise<T>;
  /** Invariant ids (graph-validation dimensions, domain rules). */
  readonly invariants: readonly string[];
  /** Last time graph-validation (or domain audit) passed for this surface. */
  readonly lastValidatedAt: string;
}
