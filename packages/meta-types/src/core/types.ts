/**
 * @module core/types
 * @description Nominal typing helpers, deep recursive utilities, and async primitives.
 * @layer truth-contract
 */

// ---------------------------------------------------------------------------
// Nominal typing helpers
// ---------------------------------------------------------------------------

/**
 * Brands a base type `T` with a phantom string tag `B`.
 * Prevents mixing structurally identical values that carry different semantics.
 *
 * @example
 * type UserId  = Brand<string, "UserId">;
 * type OrderId = Brand<string, "OrderId">;
 *
 * declare const uid: UserId;
 * declare function processOrder(id: OrderId): void;
 * processOrder(uid); // ← TS error — UserId is not assignable to OrderId
 */
export type Brand<T, B extends string> = T & { readonly __brand: B };

/**
 * Alias for {@link Brand} with a more explicit "opaque" framing.
 * Useful when the phantom tag name should convey module ownership.
 *
 * @example
 * type TenantId = Opaque<string, "TenantId">;
 */
export type Opaque<T, B extends string> = Brand<T, B>;

// ---------------------------------------------------------------------------
// Deep recursive utilities
// ---------------------------------------------------------------------------

/**
 * Recursively makes every property optional.
 * Use for patch / merge payloads where most fields may be absent.
 *
 * @example
 * type FormDraft = DeepPartial<ModelMeta>;
 */
export type DeepPartial<T> = T extends object ? { [P in keyof T]?: DeepPartial<T[P]> } : T;

/**
 * Recursively makes every property `readonly`.
 * Use to freeze configuration objects or computed state.
 *
 * @example
 * const config: DeepReadonly<AppConfig> = loadConfig();
 */
export type DeepReadonly<T> = T extends (infer U)[]
  ? ReadonlyArray<DeepReadonly<U>>
  : T extends object
    ? { readonly [P in keyof T]: DeepReadonly<T[P]> }
    : T;

// ---------------------------------------------------------------------------
// Array utilities
// ---------------------------------------------------------------------------

/**
 * An array that is guaranteed to have at least one element.
 * Useful for APIs that require non-empty input.
 *
 * @example
 * function join<T>(items: NonEmptyArray<T>, sep: string): string { ... }
 */
export type NonEmptyArray<T> = [T, ...T[]];

// ---------------------------------------------------------------------------
// Async utilities
// ---------------------------------------------------------------------------

/**
 * A value that may be returned directly or wrapped in a `Promise`.
 *
 * @example
 * type Loader<T> = () => MaybePromise<T>;
 */
export type MaybePromise<T> = T | Promise<T>;

/**
 * Extracts the resolved type of a `Promise`, or passes `T` through unchanged.
 * Safe alias for the built-in `Awaited<T>` (TypeScript ≥ 4.5).
 */
export type Resolved<T> = Awaited<T>;
