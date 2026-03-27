import { useMutation } from "@tanstack/react-query";
import type {
  BlastRadiusResult,
  PolicyDefinition,
  SimulationReport,
  SimulationScenario,
} from "@afenda/meta-types";

interface SimulatePayload {
  scenario: SimulationScenario;
  policies?: PolicyDefinition[];
}

interface BatchPayload {
  scenarios: SimulationScenario[];
  policies?: PolicyDefinition[];
}

interface BlastRadiusPayload {
  policy: PolicyDefinition;
  records: Record<string, Array<{ id: string } & Record<string, unknown>>>;
}

export function useSimulateScenario() {
  return useMutation({
    mutationFn: async (payload: SimulatePayload): Promise<SimulationReport> => {
      const res = await fetch("/api/sandbox/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw Object.assign(new Error("Simulation request failed"), {
          status: res.status,
          statusText: res.statusText,
        });
      }

      return (await res.json()) as SimulationReport;
    },
  });
}

export function useSimulateBatch() {
  return useMutation({
    mutationFn: async (payload: BatchPayload): Promise<{ data: SimulationReport[]; meta: { total: number } }> => {
      const res = await fetch("/api/sandbox/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw Object.assign(new Error("Batch simulation request failed"), {
          status: res.status,
          statusText: res.statusText,
        });
      }

      return (await res.json()) as { data: SimulationReport[]; meta: { total: number } };
    },
  });
}

export function useBlastRadius() {
  return useMutation({
    mutationFn: async (payload: BlastRadiusPayload): Promise<BlastRadiusResult> => {
      const res = await fetch("/api/sandbox/blast-radius", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw Object.assign(new Error("Blast radius request failed"), {
          status: res.status,
          statusText: res.statusText,
        });
      }

      return (await res.json()) as BlastRadiusResult;
    },
  });
}
