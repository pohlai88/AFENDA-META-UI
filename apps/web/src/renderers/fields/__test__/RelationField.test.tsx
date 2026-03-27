/**
 * RelationField Tests
 * ====================
 * Covers: ARIA attributes, debounce behaviour, listbox display,
 *         keyboard navigation (↑ ↓ Enter Esc) and mouse selection.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, waitFor } from "@testing-library/react";
import { screen, renderWithProviders } from "~/test/utils";
import { RelationField } from "../RelationField";
import type { MetaField } from "@afenda/meta-types";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOCK_RECORDS = [
  { id: 1, name: "Alpha Corp" },
  { id: 2, name: "Beta Ltd" },
  { id: 3, name: "Gamma Inc" },
];

const RELATION_FIELD: MetaField = {
  name: "customer_id",
  label: "Customer",
  type: "many2one",
  required: false,
  relation: {
    model: "customers",
    value_field: "id",
    display_field: "name",
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Spy on global fetch and return mock records wrapped in { data: [] }. */
function setupFetch(records: Record<string, unknown>[] = MOCK_RECORDS) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    json: async () => ({ data: records }),
  } as Response);
}

function renderField(field: MetaField = RELATION_FIELD, value: unknown = null, readonly = false) {
  const onChange = vi.fn();
  return {
    onChange,
    ...renderWithProviders(
      <RelationField field={field} value={value} onChange={onChange} readonly={readonly} />
    ),
  };
}

/**
 * Type a search term, advance past the 300 ms debounce, restore real timers,
 * then wait for option elements to appear (implies listbox is present and
 * the fetch has fully resolved).
 */
async function searchAndWait(input: HTMLElement, text: string) {
  fireEvent.change(input, { target: { value: text } });
  act(() => {
    vi.advanceTimersByTime(300);
  });
  vi.useRealTimers();
  await waitFor(() => expect(screen.getAllByRole("option").length).toBeGreaterThan(0));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("RelationField", () => {
  // -------------------------------------------------------------------------
  describe("missing relation config", () => {
    it("renders an error message when relation config is absent", () => {
      const noRelField: MetaField = { name: "x", label: "X", type: "many2one" };
      renderField(noRelField);
      expect(screen.getByText(/missing relation config/i)).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  describe("read-only mode", () => {
    it("renders an em-dash when no value is selected", () => {
      renderField(RELATION_FIELD, null, true);
      expect(screen.getByText("—")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  describe("ARIA attributes on the input", () => {
    it('has role="combobox" with aria-autocomplete="list" and aria-haspopup="listbox"', () => {
      renderField();
      const input = screen.getByPlaceholderText(/search customers/i);
      expect(input).toHaveAttribute("role", "combobox");
      expect(input).toHaveAttribute("aria-autocomplete", "list");
      expect(input).toHaveAttribute("aria-haspopup", "listbox");
    });

    it("aria-expanded becomes true as soon as the user types", () => {
      setupFetch();
      renderField();
      const input = screen.getByPlaceholderText(/search customers/i);
      expect(input).toHaveAttribute("aria-expanded", "false");
      fireEvent.change(input, { target: { value: "x" } });
      expect(input).toHaveAttribute("aria-expanded", "true");
    });

    it("aria-controls references the listbox id", () => {
      renderField();
      const input = screen.getByPlaceholderText(/search customers/i);
      expect(input.getAttribute("aria-controls")).toMatch(/relation-listbox-customer_id/);
    });
  });

  // -------------------------------------------------------------------------
  describe("debounce behaviour", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => {
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    it("does not call fetch with the search term immediately after typing", () => {
      const fetchSpy = setupFetch();
      renderField();
      fireEvent.change(screen.getByPlaceholderText(/search customers/i), {
        target: { value: "al" },
      });
      // The initial (empty) query may fire on mount, but the debounced
      // search term must NOT have been sent yet.
      expect(fetchSpy).not.toHaveBeenCalledWith(expect.stringContaining("search=al"));
    });

    it("calls fetch with the search term after 300 ms", async () => {
      const fetchSpy = setupFetch();
      renderField();
      fireEvent.change(screen.getByPlaceholderText(/search customers/i), {
        target: { value: "al" },
      });
      act(() => {
        vi.advanceTimersByTime(300);
      });
      vi.useRealTimers();
      await waitFor(() =>
        expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining("search=al"))
      );
    });
  });

  // -------------------------------------------------------------------------
  describe("listbox and options display", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => {
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    it("renders the listbox after the debounced search resolves", async () => {
      setupFetch();
      renderField();
      await searchAndWait(screen.getByPlaceholderText(/search customers/i), "al");
      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });

    it("renders one option per returned record", async () => {
      setupFetch();
      renderField();
      await searchAndWait(screen.getByPlaceholderText(/search customers/i), "al");
      expect(screen.getAllByRole("option")).toHaveLength(MOCK_RECORDS.length);
    });

    it("aria-expanded becomes true once the list is open", async () => {
      setupFetch();
      renderField();
      const input = screen.getByPlaceholderText(/search customers/i);
      await searchAndWait(input, "al");
      expect(input).toHaveAttribute("aria-expanded", "true");
    });

    it('marks the currently-selected record and keyboard-highlighted option with aria-selected="true"', async () => {
      setupFetch();
      renderField(RELATION_FIELD, 1); // id=1 → Alpha Corp selected
      await searchAndWait(screen.getByPlaceholderText(/search customers/i), "al");
      const options = screen.getAllByRole("option");
      // selected value
      expect(options[0]).toHaveAttribute("aria-selected", "true");
      expect(options[1]).toHaveAttribute("aria-selected", "false");
      // keyboard-highlight also sets aria-selected
      fireEvent.keyDown(screen.getByPlaceholderText(/search customers/i), { key: "ArrowDown" });
      fireEvent.keyDown(screen.getByPlaceholderText(/search customers/i), { key: "ArrowDown" });
      await waitFor(() => expect(options[1]).toHaveAttribute("aria-selected", "true"));
    });
  });

  // -------------------------------------------------------------------------
  describe("empty state", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => {
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    it('shows "No results found" when the query returns an empty array', async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      } as Response);
      renderField();
      const input = screen.getByPlaceholderText(/search customers/i);
      fireEvent.change(input, { target: { value: "zzz" } });
      act(() => {
        vi.advanceTimersByTime(300);
      });
      vi.useRealTimers();
      await waitFor(() => expect(screen.getByText(/no results found/i)).toBeInTheDocument());
    });
  });

  // -------------------------------------------------------------------------
  describe("error state", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => {
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    it('shows "Failed to load options" when the fetch returns a non-ok response', async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({}),
      } as Response);
      renderField();
      const input = screen.getByPlaceholderText(/search customers/i);
      fireEvent.change(input, { target: { value: "err" } });
      act(() => {
        vi.advanceTimersByTime(300);
      });
      vi.useRealTimers();
      await waitFor(() => expect(screen.getByText(/failed to load options/i)).toBeInTheDocument());
    });
  });

  // -------------------------------------------------------------------------
  describe("keyboard navigation", () => {
    /** Renders the component and waits for the list to be open. */
    async function setup() {
      vi.useFakeTimers();
      setupFetch();
      const result = renderField();
      const input = screen.getByPlaceholderText(/search customers/i);
      await searchAndWait(input, "co"); // opens list (3 options)
      return { input, onChange: result.onChange };
    }

    afterEach(() => {
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    it("ArrowDown sets aria-activedescendant to the first option", async () => {
      const { input } = await setup();
      fireEvent.keyDown(input, { key: "ArrowDown" });
      const options = screen.getAllByRole("option");
      await waitFor(() => expect(input).toHaveAttribute("aria-activedescendant", options[0].id));
    });

    it("ArrowDown wraps from the last option back to the first", async () => {
      const { input } = await setup();
      // 3 options: 3 presses land on index 2, one more wraps to index 0
      fireEvent.keyDown(input, { key: "ArrowDown" });
      fireEvent.keyDown(input, { key: "ArrowDown" });
      fireEvent.keyDown(input, { key: "ArrowDown" });
      fireEvent.keyDown(input, { key: "ArrowDown" }); // wrap → index 0
      const options = screen.getAllByRole("option");
      await waitFor(() => expect(input).toHaveAttribute("aria-activedescendant", options[0].id));
    });

    it("ArrowUp wraps from the first option to the last", async () => {
      const { input } = await setup();
      fireEvent.keyDown(input, { key: "ArrowDown" }); // → index 0
      fireEvent.keyDown(input, { key: "ArrowUp" }); // → wraps to index 2
      const options = screen.getAllByRole("option");
      await waitFor(() => expect(input).toHaveAttribute("aria-activedescendant", options[2].id));
    });

    it("Enter selects the highlighted option and calls onChange", async () => {
      const { input, onChange } = await setup();
      fireEvent.keyDown(input, { key: "ArrowDown" }); // highlight index 0 → Alpha Corp
      await waitFor(() => expect(input).toHaveAttribute("aria-activedescendant"));
      fireEvent.keyDown(input, { key: "Enter" });
      expect(onChange).toHaveBeenCalledWith(MOCK_RECORDS[0].id);
    });

    it("Escape clears the search input and closes the listbox", async () => {
      const { input } = await setup();
      expect(screen.getByRole("listbox")).toBeInTheDocument();
      fireEvent.keyDown(input, { key: "Escape" });
      await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
      expect(input).toHaveValue("");
    });
  });

  // -------------------------------------------------------------------------
  describe("highlight reset on new search", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => {
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    it("resets aria-activedescendant when the search text changes", async () => {
      setupFetch();
      renderField();
      const input = screen.getByPlaceholderText(/search customers/i);
      await searchAndWait(input, "co");
      // Highlight the first option
      fireEvent.keyDown(input, { key: "ArrowDown" });
      await waitFor(() => expect(input).toHaveAttribute("aria-activedescendant"));
      // Now type more — highlight must be cleared
      vi.useFakeTimers();
      fireEvent.change(input, { target: { value: "corp" } });
      // activedescendant should be removed synchronously (useEffect flush)
      act(() => {
        vi.advanceTimersByTime(0);
      });
      vi.useRealTimers();
      await waitFor(() => expect(input).not.toHaveAttribute("aria-activedescendant"));
    });
  });

  // -------------------------------------------------------------------------
  describe("mouse selection", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => {
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    it("clicking an option calls onChange with the record value", async () => {
      setupFetch();
      const { onChange } = renderField();
      await searchAndWait(screen.getByPlaceholderText(/search customers/i), "be");
      const options = screen.getAllByRole("option");
      fireEvent.click(options[1]); // Beta Ltd → id:2
      expect(onChange).toHaveBeenCalledWith(MOCK_RECORDS[1].id);
    });
  });
});
