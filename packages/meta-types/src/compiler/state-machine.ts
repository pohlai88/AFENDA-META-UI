/**
 * @module compiler/state-machine
 * @description Entity lifecycle state machine contracts decoupled from workflow orchestration.
 * @layer truth-contract
 * @consumers api, db
 */

export type State = string;

export type TransitionEvent = string;

export interface Transition {
  from: State;
  event: TransitionEvent;
  to: State;
  guards?: string[];
  emits?: string[];
}

export interface StateMachineDefinition {
  model: string;
  stateField: string;
  states: State[];
  initialState: State;
  terminalStates: State[];
  transitions: Transition[];
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
