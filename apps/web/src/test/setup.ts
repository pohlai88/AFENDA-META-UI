/**
 * Vitest Test Setup
 * ==================
 * Global test configuration and DOM matchers
 */

import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { enableMapSet } from "immer";
import { afterEach } from "vitest";

enableMapSet();

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock scrollIntoView (not available in jsdom)
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

// Mock IntersectionObserver (not available in jsdom)
global.IntersectionObserver = class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | null = null;
  readonly rootMargin: string = "";
  readonly thresholds: ReadonlyArray<number> = [];
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
  unobserve() {}
};

// Mock ResizeObserver (not available in jsdom)
global.ResizeObserver = class MockResizeObserver implements ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock matchMedia (used by shadcn components)
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {}, // deprecated
    removeListener: () => {}, // deprecated
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
