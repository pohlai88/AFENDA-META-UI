/**
 * @module state-machine
 * @description Entity lifecycle state machine contracts decoupled from workflow orchestration.
 * @layer truth-contract
 * @consumers api, db
 */

// ---------------------------------------------------------------------------
// State Machine Definitions
// ---------------------------------------------------------------------------

export type State = string;

export type TransitionEvent = string;

/** A single state transition: from + event -> to. */
export interface Transition {
  from: State;
  event: TransitionEvent;
  to: State;
  /** Invariant IDs that must pass before transition is accepted. */
  guards?: string[];
  /** Domain events emitted after a successful transition. */
  emits?: string[];
}

export interface StateMachineDefinition {
  /** Entity model identifier this state machine governs. */
  model: string;
  /** Name of the field that stores current state. */
  stateField: string;
  /** All allowable states. */
  states: State[];
  /** Initial state for new instances. */
  initialState: State;
  /** Terminal states with no outgoing transitions. */
  terminalStates: State[];
  /** All valid transitions. */
  transitions: Transition[];
  /** Whether tenant extensions may add transitions. */
  tenantExtensible: boolean;
}

export interface TransitionResult {
  success: boolean;
  from: State;
  to: State | null;
  event: TransitionEvent;
  guardViolations: string[];
  emittedEvents: string[];
}
