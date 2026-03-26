/**
 * Reusable state machine framework for domain state transitions.
 *
 * Provides declarative transition rules with optional guards for
 * ERP domain entities (orders, reports, agreements, etc.).
 *
 * @example
 * ```ts
 * const reportMachine = new StateMachine([
 *   { from: "draft", to: "submitted" },
 *   { from: "submitted", to: "confirmed", guard: (ctx) => ctx.valid === true },
 * ]);
 *
 * reportMachine.assertTransition("draft", "submitted", {});
 * // passes
 *
 * reportMachine.assertTransition("draft", "confirmed", {});
 * // throws StateMachineError
 * ```
 */

export type State = string;

export interface TransitionContext {
  [key: string]: unknown;
}

export interface TransitionRule<TState extends State = State> {
  from: TState;
  to: TState;
  guard?: (ctx: TransitionContext) => boolean;
  description?: string;
}

export class StateMachineError extends Error {
  constructor(
    message: string,
    readonly from: State,
    readonly to: State,
    readonly context?: TransitionContext
  ) {
    super(message);
    this.name = "StateMachineError";
  }
}

/**
 * Generic state machine for enforcing domain state transitions.
 *
 * Validates transitions against a set of declarative rules with optional guards.
 * Prevents invalid state changes and makes lifecycle constraints explicit.
 */
export class StateMachine<TState extends State = State> {
  constructor(private readonly rules: TransitionRule<TState>[]) {}

  /**
   * Check if a transition from one state to another is allowed.
   *
   * @param from - Current state
   * @param to - Target state
   * @param ctx - Context object passed to guard functions
   * @returns true if transition is allowed, false otherwise
   */
  canTransition(from: TState, to: TState, ctx: TransitionContext = {}): boolean {
    return this.rules.some(
      (rule) =>
        rule.from === from && rule.to === to && (!rule.guard || rule.guard(ctx))
    );
  }

  /**
   * Assert that a transition is valid, throwing an error if not.
   *
   * @param from - Current state
   * @param to - Target state
   * @param ctx - Context object passed to guard functions
   * @throws {StateMachineError} if transition is not allowed
   */
  assertTransition(from: TState, to: TState, ctx: TransitionContext = {}): void {
    if (!this.canTransition(from, to, ctx)) {
      const matchingRule = this.rules.find((r) => r.from === from && r.to === to);
      const reason = matchingRule
        ? "guard condition failed"
        : "no transition rule defined";

      throw new StateMachineError(
        `Invalid state transition: '${from}' → '${to}' (${reason})`,
        from,
        to,
        ctx
      );
    }
  }

  /**
   * Get all valid transitions from a given state.
   *
   * @param from - Current state
   * @param ctx - Context object to evaluate guards
   * @returns Array of valid target states
   */
  getValidTransitions(from: TState, ctx: TransitionContext = {}): TState[] {
    return this.rules
      .filter((rule) => rule.from === from && (!rule.guard || rule.guard(ctx)))
      .map((rule) => rule.to);
  }

  /**
   * Get all transition rules.
   */
  getRules(): ReadonlyArray<TransitionRule<TState>> {
    return this.rules;
  }
}
