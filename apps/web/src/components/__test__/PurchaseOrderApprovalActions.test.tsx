import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen, user } from "~/test/utils";
import { PurchaseOrderApprovalActions } from "~/components/PurchaseOrderApprovalActions";

const useModelWithMetaMock = vi.fn();
const usePurchaseOrderActionsMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock("~/hooks/useModelWithMeta", () => ({
  useModelWithMeta: (...args: unknown[]) => useModelWithMetaMock(...args),
}));

vi.mock("~/hooks/usePurchaseOrderActions", () => ({
  usePurchaseOrderActions: (...args: unknown[]) => usePurchaseOrderActionsMock(...args),
}));

vi.mock("@afenda/ui", async () => {
  const actual = await vi.importActual<typeof import("@afenda/ui")>("@afenda/ui");
  return {
    ...actual,
    toast: {
      ...actual.toast,
      error: (...args: unknown[]) => toastErrorMock(...args),
    },
  };
});

function mutationMock(
  overrides?: Partial<{
    isPending: boolean;
    variables: string;
    mutateAsync: (id: string) => Promise<unknown>;
  }>
) {
  return {
    isPending: false,
    variables: undefined,
    mutateAsync: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("PurchaseOrderApprovalActions", () => {
  beforeEach(() => {
    useModelWithMetaMock.mockReset();
    usePurchaseOrderActionsMock.mockReset();
    toastErrorMock.mockReset();
  });

  it("renders nothing while metadata is loading", () => {
    useModelWithMetaMock.mockReturnValue({
      permissions: undefined,
      effectiveRole: undefined,
      isReady: false,
      isMetaLoading: true,
    });

    usePurchaseOrderActionsMock.mockReturnValue({
      submit: mutationMock(),
      approve: mutationMock(),
      reject: mutationMock(),
    });

    const { container } = render(<PurchaseOrderApprovalActions orderId="PO-1" status="draft" />);

    expect(container).toBeEmptyDOMElement();
  });

  it("shows submit button for draft orders and executes submit", async () => {
    const submit = mutationMock();
    useModelWithMetaMock.mockReturnValue({
      permissions: { can_create: true, can_read: true, can_update: true, can_delete: false },
      effectiveRole: "finance_manager",
      isReady: true,
      isMetaLoading: false,
    });
    usePurchaseOrderActionsMock.mockReturnValue({
      submit,
      approve: mutationMock(),
      reject: mutationMock(),
    });

    render(<PurchaseOrderApprovalActions orderId="PO-1" status="draft" />);

    expect(screen.getByText("Acting as Finance Manager")).toBeInTheDocument();
    const submitButton = screen.getByRole("button", { name: "Submit" });
    expect(submitButton).toBeEnabled();

    await user.click(submitButton);
    expect(submit.mutateAsync).toHaveBeenCalledWith("PO-1");
  });

  it("shows approve/reject buttons for submitted orders", () => {
    useModelWithMetaMock.mockReturnValue({
      permissions: { can_create: true, can_read: true, can_update: true, can_delete: false },
      effectiveRole: "manager",
      isReady: true,
      isMetaLoading: false,
    });
    usePurchaseOrderActionsMock.mockReturnValue({
      submit: mutationMock(),
      approve: mutationMock(),
      reject: mutationMock(),
    });

    render(<PurchaseOrderApprovalActions orderId="PO-2" status="submitted" />);

    expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reject" })).toBeInTheDocument();
  });

  it("shows pending label for the matching in-flight action", () => {
    useModelWithMetaMock.mockReturnValue({
      permissions: { can_create: true, can_read: true, can_update: true, can_delete: false },
      effectiveRole: "manager",
      isReady: true,
      isMetaLoading: false,
    });
    usePurchaseOrderActionsMock.mockReturnValue({
      submit: mutationMock(),
      approve: mutationMock({ isPending: true, variables: "PO-2" }),
      reject: mutationMock(),
    });

    render(<PurchaseOrderApprovalActions orderId="PO-2" status="submitted" />);

    expect(screen.getByRole("button", { name: "Approving..." })).toBeDisabled();
  });

  it("shows permission toast and blocks mutation when role lacks update permission", async () => {
    const approve = mutationMock();
    const reject = mutationMock();
    useModelWithMetaMock.mockReturnValue({
      permissions: { can_create: false, can_read: true, can_update: false, can_delete: false },
      effectiveRole: "viewer",
      isReady: true,
      isMetaLoading: false,
    });
    usePurchaseOrderActionsMock.mockReturnValue({
      submit: mutationMock(),
      approve,
      reject,
    });

    render(<PurchaseOrderApprovalActions orderId="PO-2" status="submitted" />);

    const approveButton = screen.getByRole("button", { name: "Approve" });
    expect(approveButton).toBeEnabled();

    await user.click(approveButton);

    expect(toastErrorMock).toHaveBeenCalledWith(
      "You do not have permission to perform this action"
    );
    expect(approve.mutateAsync).not.toHaveBeenCalled();
    expect(reject.mutateAsync).not.toHaveBeenCalled();
  });
});
