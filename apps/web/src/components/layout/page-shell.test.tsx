import React from "react";
import { describe, expect, it } from "vitest";
import { renderWithProviders, screen } from "~/test/utils";
import { PageContainer, PageShell } from "./page-shell";

describe("PageShell", () => {
  it("renders optional header and footer slots semantically", () => {
    renderWithProviders(
      <PageShell
        header={<div>Header Slot</div>}
        footer={<div>Footer Slot</div>}
      >
        <div>Body Content</div>
      </PageShell>
    );

    expect(screen.getByText("Header Slot").closest("header")).toBeInTheDocument();
    expect(screen.getByText("Footer Slot").closest("footer")).toBeInTheDocument();
    expect(screen.getByText("Body Content")).toBeInTheDocument();
  });
});

describe("PageContainer", () => {
  it("does not enforce a landmark by default", () => {
    renderWithProviders(
      <PageContainer>
        <div>Container Content</div>
      </PageContainer>
    );

    expect(screen.queryByRole("main")).not.toBeInTheDocument();
    expect(screen.getByText("Container Content")).toBeInTheDocument();
  });

  it("supports explicit landmark role when needed", () => {
    renderWithProviders(
      <PageContainer landmark="main">
        <div>Main Landmark Content</div>
      </PageContainer>
    );

    expect(screen.getByRole("main")).toHaveTextContent("Main Landmark Content");
  });
});
