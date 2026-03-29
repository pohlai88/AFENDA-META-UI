import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  registries: [] as Array<{ model: string; invariants: Array<{ id: string; description: string; condition: unknown }> }>,
  evaluateCondition: vi.fn<(condition: unknown, record: Record<string, unknown>) => boolean>(),
}));

vi.mock("../auto/evaluate-condition.js", () => ({
  evaluateCondition: mockState.evaluateCondition,
}));

vi.mock("@afenda/db/truth-compiler", () => ({
  SALES_INVARIANT_REGISTRIES: mockState.registries,
}));

let subject: typeof import("../assert/assert-invariant.js");

describe("assert-invariant", () => {
  beforeEach(async () => {
    mockState.registries.length = 0;
    mockState.evaluateCondition.mockReset();
    vi.resetModules();
    subject = await import("../assert/assert-invariant.js");
  });

  it("assertInvariant passes sync and async assertions", async () => {
    expect(() => subject.assertInvariant("sync-pass", () => {})).not.toThrow();
    await expect(subject.assertInvariant("async-pass", async () => {})).resolves.toBeUndefined();
  });

  it("assertInvariant wraps sync and async failures", async () => {
    expect(() =>
      subject.assertInvariant("sync-fail", () => {
        throw new Error("boom");
      })
    ).toThrow(subject.InvariantViolationError);

    expect(() =>
      subject.assertInvariant("sync-string", () => {
        throw "plain-string";
      })
    ).toThrow('Invariant "sync-string" violated: plain-string');

    await expect(
      subject.assertInvariant("async-fail", async () => {
        throw new Error("async-boom");
      })
    ).rejects.toThrow('Invariant "async-fail" violated: async-boom');
  });

  it("assertEntityInvariant no-ops when registry is missing", async () => {
    const context = { db: { findOne: vi.fn() } } as any;
    await expect(subject.assertEntityInvariant("unknown_model", "1", context)).resolves.toBeUndefined();
    expect(context.db.findOne).not.toHaveBeenCalled();
  });

  it("assertEntityInvariant throws if entity record is missing", async () => {
    mockState.registries.push({
      model: "sales_order",
      invariants: [{ id: "inv.exists", description: "must exist", condition: {} }],
    });

    const context = { db: { findOne: vi.fn().mockResolvedValue(null) } } as any;

    await expect(subject.assertEntityInvariant("sales_order", "42", context)).rejects.toThrow(
      'Invariant "sales_order.exists" violated: Entity "sales_order" with id "42" not found in database'
    );
    expect(context.db.findOne).toHaveBeenCalledWith("sales_order", { id: 42 });
  });

  it("assertEntityInvariant evaluates all invariants and fails on first violation", async () => {
    mockState.registries.push({
      model: "sales_order",
      invariants: [
        { id: "inv.pass", description: "first passes", condition: { field: "a" } },
        { id: "inv.fail", description: "second fails", condition: { field: "b" } },
      ],
    });

    mockState.evaluateCondition.mockReturnValueOnce(true).mockReturnValueOnce(false);
    const context = { db: { findOne: vi.fn().mockResolvedValue({ id: 7, status: "draft" }) } } as any;

    await expect(subject.assertEntityInvariant("sales_order", "7", context)).rejects.toThrow(
      'Invariant "inv.fail" violated: second fails'
    );
    expect(mockState.evaluateCondition).toHaveBeenCalledTimes(2);
  });

  it("assertAllEntityInvariants aggregates all failing invariants", async () => {
    mockState.registries.push({
      model: "subscription",
      invariants: [
        { id: "inv.one", description: "first invariant", condition: { field: "x" } },
        { id: "inv.two", description: "second invariant", condition: { field: "y" } },
      ],
    });

    mockState.evaluateCondition.mockReturnValueOnce(false).mockReturnValueOnce(false);
    const context = { db: { findOne: vi.fn().mockResolvedValue({ id: "sub-1" }) } } as any;

    await expect(subject.assertAllEntityInvariants("subscription", "sub-1", context)).rejects.toThrow(
      subject.AggregateInvariantViolationError
    );

    await subject.assertAllEntityInvariants("subscription", "sub-1", {
      db: { findOne: vi.fn().mockResolvedValue({ id: "sub-1" }) },
    } as any).catch((err: unknown) => {
      expect(err).toBeInstanceOf(subject.AggregateInvariantViolationError);
      const aggregate = err as InstanceType<typeof subject.AggregateInvariantViolationError>;
      expect(aggregate.violations).toHaveLength(2);
      expect(aggregate.entityType).toBe("subscription");
      expect(aggregate.entityId).toBe("sub-1");
    });
  });

  it("assertAllEntityInvariants passes when all invariants hold", async () => {
    mockState.registries.push({
      model: "commission_entry",
      invariants: [{ id: "inv.ok", description: "always true", condition: { field: "ok" } }],
    });

    mockState.evaluateCondition.mockReturnValue(true);
    const context = { db: { findOne: vi.fn().mockResolvedValue({ id: "c-1" }) } } as any;

    await expect(subject.assertAllEntityInvariants("commission_entry", "c-1", context)).resolves.toBeUndefined();
  });

  it("custom error classes expose stable metadata", () => {
    const single = new subject.InvariantViolationError("inv.test", "details");
    expect(single.name).toBe("InvariantViolationError");
    expect(single.invariantName).toBe("inv.test");
    expect(single.details).toBe("details");

    const aggregate = new subject.AggregateInvariantViolationError("sales_order", "99", [
      { id: "inv.a", description: "A" },
      { id: "inv.b", description: "B" },
    ]);
    expect(aggregate.name).toBe("AggregateInvariantViolationError");
    expect(aggregate.message).toContain('2 invariant(s) violated for "sales_order"');
  });
});
