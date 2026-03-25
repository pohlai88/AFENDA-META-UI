import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "~/test/utils";
import { RecentActivityWidget } from "~/components/RecentActivityWidget";

const useRecentActivityMock = vi.fn();

vi.mock("~/hooks/useRecentActivity", () => ({
  useRecentActivity: (...args: unknown[]) => useRecentActivityMock(...args),
}));

describe("RecentActivityWidget", () => {
  beforeEach(() => {
    useRecentActivityMock.mockReset();
  });

  it("renders loading state", () => {
    useRecentActivityMock.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });

    render(<RecentActivityWidget />);

    expect(screen.getByText("Loading recent activity...")).toBeInTheDocument();
  });

  it("renders error state", () => {
    useRecentActivityMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    });

    render(<RecentActivityWidget />);

    expect(screen.getByText("Unable to load recent activity right now.")).toBeInTheDocument();
  });

  it("renders empty state", () => {
    useRecentActivityMock.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });

    render(<RecentActivityWidget />);

    expect(screen.getByText("No recent activity yet.")).toBeInTheDocument();
  });

  it("renders activity items with type, message, and relative time", () => {
    useRecentActivityMock.mockReturnValue({
      data: [
        { type: "Sales Order", message: "SO-1001 updated", time: "5m ago" },
        { type: "Partner", message: "Acme Corp updated", time: "1h ago" },
        { type: "Product", message: "Widget X updated", time: "2d ago" },
      ],
      isLoading: false,
      isError: false,
    });

    render(<RecentActivityWidget />);

    expect(screen.getByText("Sales Order")).toBeInTheDocument();
    expect(screen.getByText("SO-1001 updated")).toBeInTheDocument();
    expect(screen.getByText("5m ago")).toBeInTheDocument();

    expect(screen.getByText("Partner")).toBeInTheDocument();
    expect(screen.getByText("Acme Corp updated")).toBeInTheDocument();
    expect(screen.getByText("1h ago")).toBeInTheDocument();

    expect(screen.getByText("Product")).toBeInTheDocument();
    expect(screen.getByText("Widget X updated")).toBeInTheDocument();
    expect(screen.getByText("2d ago")).toBeInTheDocument();
  });
});
