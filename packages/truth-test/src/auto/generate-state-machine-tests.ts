/**
 * State Machine Transition Test Generator
 * =========================================
 * Consumes StateMachineDefinition[] from truth-config and generates
 * exhaustive transition graph tests. Pure logic — no DB required.
 *
 * Tests generated per state machine:
 *   - Initial state exists in the states list
 *   - Every declared transition is valid
 *   - Every non-declared (state, event) pair is rejected
 *   - Terminal states have no outbound transitions
 *   - All non-terminal states are reachable from initial state
 */

import { describe, test, expect } from "vitest";
import type { StateMachineDefinition, Transition } from "@afenda/meta-types/compiler";

/**
 * Build a lookup: state → event → toState
 */
function buildTransitionLookup(
  transitions: Transition[],
): Map<string, Map<string, string>> {
  const lookup = new Map<string, Map<string, string>>();
  for (const t of transitions) {
    if (!lookup.has(t.from)) lookup.set(t.from, new Map());
    lookup.get(t.from)!.set(t.event, t.to);
  }
  return lookup;
}

/**
 * Collect all unique event names from transitions.
 */
function allEvents(transitions: Transition[]): string[] {
  return [...new Set(transitions.map((t) => t.event))];
}

/**
 * BFS reachability from initial state.
 */
function reachableStates(
  initial: string,
  transitions: Transition[],
): Set<string> {
  const visited = new Set<string>();
  const queue = [initial];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    for (const t of transitions) {
      if (t.from === current && !visited.has(t.to)) {
        queue.push(t.to);
      }
    }
  }
  return visited;
}

/**
 * Generate exhaustive state machine tests for a set of definitions.
 * Call this inside a test file — it registers describe/test blocks via Vitest.
 */
export function generateStateMachineTests(
  machines: StateMachineDefinition[],
): void {
  describe("auto → state machine transitions", () => {
    for (const sm of machines) {
      describe(`${sm.model} (field: ${sm.stateField})`, () => {
        const lookup = buildTransitionLookup(sm.transitions);
        const events = allEvents(sm.transitions);

        // --- Basic structure ---
        test("initial state is declared in states list", () => {
          expect(sm.states).toContain(sm.initialState);
        });

        test("all terminal states are declared in states list", () => {
          for (const ts of sm.terminalStates) {
            expect(sm.states).toContain(ts);
          }
        });

        test("all transition source/target states are declared", () => {
          for (const t of sm.transitions) {
            expect(sm.states, `from "${t.from}" not in states`).toContain(t.from);
            expect(sm.states, `to "${t.to}" not in states`).toContain(t.to);
          }
        });

        // --- Valid transitions ---
        describe("valid transitions", () => {
          for (const t of sm.transitions) {
            test(`${t.from} -[${t.event}]-> ${t.to}`, () => {
              const fromEvents = lookup.get(t.from);
              expect(fromEvents).toBeDefined();
              expect(fromEvents!.get(t.event)).toBe(t.to);
            });
          }
        });

        // --- Invalid transitions (state + event combos NOT in the graph) ---
        describe("invalid transitions (must reject)", () => {
          for (const state of sm.states) {
            const validEvents = lookup.get(state);
            for (const event of events) {
              if (validEvents?.has(event)) continue;
              test(`${state} -[${event}]-> REJECTED`, () => {
                const fromEvents = lookup.get(state);
                const target = fromEvents?.get(event);
                expect(target).toBeUndefined();
              });
            }
          }
        });

        // --- Terminal state enforcement ---
        describe("terminal states have no outbound transitions", () => {
          for (const ts of sm.terminalStates) {
            test(`${ts} is terminal (no outbound)`, () => {
              const outbound = sm.transitions.filter((t) => t.from === ts);
              expect(outbound).toHaveLength(0);
            });
          }
        });

        // --- Reachability ---
        test("all non-terminal states are reachable from initial", () => {
          const reached = reachableStates(sm.initialState, sm.transitions);
          for (const state of sm.states) {
            if (sm.terminalStates.includes(state) && state !== sm.initialState) {
              // Terminal states should be reachable too (as targets)
              expect(reached, `state "${state}" unreachable`).toContain(state);
            } else {
              expect(reached, `state "${state}" unreachable`).toContain(state);
            }
          }
        });

        // --- No duplicate transitions ---
        test("no duplicate transitions (same from + event)", () => {
          const seen = new Set<string>();
          for (const t of sm.transitions) {
            const key = `${t.from}|${t.event}`;
            expect(seen.has(key), `duplicate transition: ${key}`).toBe(false);
            seen.add(key);
          }
        });
      });
    }
  });
}
