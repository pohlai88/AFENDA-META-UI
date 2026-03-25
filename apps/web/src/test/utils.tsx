/**
 * Test Utilities
 * ===============
 * Helper functions and custom render methods for testing
 */

import { render as rtlRender, type RenderResult, RenderOptions } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReactElement, ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@afenda/ui'
import { vi } from 'vitest'

// Export userEvent for tests
export { userEvent as user }
export { screen } from '@testing-library/react'
export { vi }

// Create a custom query client for tests
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  })
}

// Custom render with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient
}

export function renderWithProviders(
  ui: ReactElement,
  options?: CustomRenderOptions
): RenderResult & { queryClient: QueryClient } {
  const { queryClient = createTestQueryClient(), ...renderOptions } = options || {}

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="light">
          {children}
        </ThemeProvider>
      </QueryClientProvider>
    )
  }

  return {
    ...rtlRender(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  }
}

// Default render with providers
export function render(ui: ReactElement, options?: CustomRenderOptions): RenderResult & { queryClient: QueryClient } {
  return renderWithProviders(ui, options)
}

// Mock fetch responses
export function mockFetch(data: unknown, status = 200) {
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(data),
      text: () => Promise.resolve(JSON.stringify(data)),
      headers: new Headers(),
    } as Response)
  )
}

// Mock API responses
export function mockApiSuccess<T>(data: T) {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
  } as Response
}

export function mockApiError(status: number, message: string) {
  return {
    ok: false,
    status,
    json: () => Promise.resolve({ error: message }),
  } as Response
}

// Wait for async operations
export const waitFor = async (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms))

// Re-export everything from testing library
export * from '@testing-library/react'
export { userEvent } from '@testing-library/user-event'
