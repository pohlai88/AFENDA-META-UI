/**
 * Safe Lazy Loader Tests
 * =======================
 * Validates that the safe lazy loader handles all failure modes correctly.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React, { Suspense } from "react";
import { safeLazy } from "./safeLazy";
import type { RendererModule } from "./types/contracts";

describe("safeLazy", () => {
  describe("Successful Loading", () => {
    it("loads module with default export", async () => {
      const TestComponent = () => <div>Test Component</div>;
      const LazyComponent = safeLazy(async () => ({ default: TestComponent }), {
        rendererId: "test",
      });

      render(
        <Suspense fallback={<div>Loading...</div>}>
          <LazyComponent />
        </Suspense>
      );

      expect(await screen.findByText("Test Component")).toBeInTheDocument();
    });

    it("loads module with named export", async () => {
      const TestComponent = () => <div>Named Export Component</div>;
      const LazyComponent = safeLazy(async () => ({ TestComponent }), {
        exportName: "TestComponent",
        rendererId: "test",
      });

      render(
        <Suspense fallback={<div>Loading...</div>}>
          <LazyComponent />
        </Suspense>
      );

      expect(await screen.findByText("Named Export Component")).toBeInTheDocument();
    });
  });

  describe("Failure Handling", () => {
    it("shows fallback when module is null", async () => {
      const LazyComponent = safeLazy(async () => null as unknown as RendererModule, {
        rendererId: "test-null",
      });

      render(
        <Suspense fallback={<div>Loading...</div>}>
          <LazyComponent />
        </Suspense>
      );

      expect(await screen.findByText(/Renderer Loading Failed/i)).toBeInTheDocument();
      expect(screen.getByText(/Module loaded but is null or undefined/i)).toBeInTheDocument();
    });

    it("shows fallback when named export missing", async () => {
      const LazyComponent = safeLazy(async () => ({ SomeOtherExport: () => <div>Wrong</div> }), {
        exportName: "TestComponent",
        rendererId: "test-missing",
      });

      render(
        <Suspense fallback={<div>Loading...</div>}>
          <LazyComponent />
        </Suspense>
      );

      expect(await screen.findByText(/Renderer Loading Failed/i)).toBeInTheDocument();
      expect(screen.getByText(/Named export 'TestComponent' not found/i)).toBeInTheDocument();
    });

    it("shows fallback when default export missing", async () => {
      const LazyComponent = safeLazy(async () => ({ namedExport: () => <div>Named</div> }), {
        rendererId: "test-no-default",
      });

      render(
        <Suspense fallback={<div>Loading...</div>}>
          <LazyComponent />
        </Suspense>
      );

      expect(await screen.findByText(/Renderer Loading Failed/i)).toBeInTheDocument();
      expect(screen.getByText(/Default export not found/i)).toBeInTheDocument();
    });

    it("shows fallback when export is not a function", async () => {
      const LazyComponent = safeLazy(
        async () => ({ default: "not a function" }) as unknown as RendererModule,
        {
          rendererId: "test-not-function",
        }
      );

      render(
        <Suspense fallback={<div>Loading...</div>}>
          <LazyComponent />
        </Suspense>
      );

      expect(await screen.findByText(/Renderer Loading Failed/i)).toBeInTheDocument();
      expect(screen.getByText(/Export is not a function/i)).toBeInTheDocument();
    });

    it("shows fallback when import throws error", async () => {
      const LazyComponent = safeLazy(
        async () => {
          throw new Error("Import failed");
        },
        { rendererId: "test-import-error" }
      );

      render(
        <Suspense fallback={<div>Loading...</div>}>
          <LazyComponent />
        </Suspense>
      );

      expect(await screen.findByText(/Renderer Loading Failed/i)).toBeInTheDocument();
      expect(screen.getByText(/Import failed/i)).toBeInTheDocument();
    });
  });

  describe("Fallback UI", () => {
    it("displays renderer ID in fallback", async () => {
      const LazyComponent = safeLazy(async () => null as unknown as RendererModule, {
        rendererId: "my-test-renderer",
      });

      render(
        <Suspense fallback={<div>Loading...</div>}>
          <LazyComponent />
        </Suspense>
      );

      expect(await screen.findByText(/my-test-renderer/i)).toBeInTheDocument();
    });

    it("displays export name in fallback", async () => {
      const LazyComponent = safeLazy(async () => ({}), {
        exportName: "MyComponent",
        rendererId: "test",
      });

      render(
        <Suspense fallback={<div>Loading...</div>}>
          <LazyComponent />
        </Suspense>
      );

      expect(await screen.findByText(/Renderer Loading Failed/i)).toBeInTheDocument();
      expect(screen.getByText(/Expected export:/i)).toBeInTheDocument();
      expect(screen.getByText("MyComponent")).toBeInTheDocument();
    });

    it("shows common causes and fix suggestions", async () => {
      const LazyComponent = safeLazy(async () => null as unknown as RendererModule, {
        rendererId: "test",
      });

      render(
        <Suspense fallback={<div>Loading...</div>}>
          <LazyComponent />
        </Suspense>
      );

      expect(await screen.findByText(/Common causes:/i)).toBeInTheDocument();
      expect(screen.getByText(/pnpm ci:contracts/i)).toBeInTheDocument();
    });
  });

  describe("Custom Fallback", () => {
    it("uses custom fallback component when provided", async () => {
      const CustomFallback = () => <div>Custom Error UI</div>;

      const LazyComponent = safeLazy(async () => null as unknown as RendererModule, {
        fallback: CustomFallback,
        rendererId: "test",
      });

      render(
        <Suspense fallback={<div>Loading...</div>}>
          <LazyComponent />
        </Suspense>
      );

      expect(await screen.findByText("Custom Error UI")).toBeInTheDocument();
    });
  });
});
