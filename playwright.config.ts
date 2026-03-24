/**
 * Playwright Configuration - Enterprise E2E Testing Setup
 * =========================================================
 * 
 * Best Practices Applied:
 * - Multi-browser testing (Chromium, Firefox, WebKit)
 * - Parallel execution with optimized worker pools
 * - Retry strategies for flaky tests in CI/CD
 * - Test sharding support for distributed execution
 * - Deterministic test isolation
 * - Trace collection on failure for debugging
 * - Multiple reporters for different environments
 * - Comprehensive timeout configuration
 * - Test fixtures for authentication and state management
 */

import { defineConfig, devices } from '@playwright/test'

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv'
// import path from 'path'
// dotenv.config({ path: path.resolve(__dirname, '.env') })

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  // ========================================
  // TEST DIRECTORY & PATTERNS
  // ========================================testDir: './e2e',
  testMatch: '**/*.e2e.{ts,tsx}',
  
  // ========================================
  // PARALLEL EXECUTION STRATEGY
  // ========================================
  
  // Run all tests in parallel across files
  fullyParallel: true,
  
  // Limit workers: 50% of CPU cores on CI, full power locally
  workers: process.env.CI ? '50%' : undefined,
  
  // ========================================
  // ERROR HANDLING & QUALITY GATES
  // ========================================
  
  // Fail the build on CI if test.only is accidentally left
  forbidOnly: !!process.env.CI,
  
  // Fail on flaky tests in CI
  failOnFlakyTests: !!process.env.CI,
  
  // Stop after N failures to save CI resources
  maxFailures: process.env.CI ? 10 : undefined,
  
  // ========================================
  // RETRY STRATEGY
  // ========================================
  
  // Retry on CI to handle transient failures
  retries: process.env.CI ? 2 : 0,
  
  // ========================================
  // REPORTERS
  // ========================================
  
  reporter: process.env.CI
    ? [
        ['html', { open: 'never', outputFolder: 'playwright-report' }],
        ['junit', { outputFile: 'test-results/e2e-junit.xml' }],
        ['json', { outputFile: 'test-results/e2e-results.json' }],
        ['list'],
      ]
    : [
        ['html', { open: 'on-failure' }],
        ['list'],
      ],
  
  // ========================================
  // OUTPUT DIRECTORIES
  // ========================================
  
  outputDir: './test-results/playwright-output',
  
  // ========================================
  // SHARED TEST OPTIONS
  // ========================================
  
  use: {
    // Base URL for all tests
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    
    // Collect trace: on first retry for debugging failures
    trace: process.env.CI ? 'on-first-retry' : 'retain-on-failure',
    
    // Screenshot on failure
    screenshot: 'only-on-failure',
    
    // Video on failure
    video: process.env.CI ? 'retain-on-failure' : 'on-first-retry',
    
    // Action timeout
    actionTimeout: 15000,
    
    // Navigation timeout
    navigationTimeout: 30000,
    
    // Ignore HTTPS errors (for local dev)
    ignoreHTTPSErrors: !process.env.CI,
    
    // Viewport
    viewport: { width: 1280, height: 720 },
    
    // User agent
    userAgent: 'Playwright E2E Tests',
    
    // Locale and timezone
    locale: 'en-US',
    timezoneId: 'America/New_York',
    
    // Permissions
    permissions: [],
    
    // Color scheme
    colorScheme: 'light',
    
    // Experimental features
    testIdAttribute: 'data-testid',
  },
  
  // ========================================
  // TIMEOUTS
  // ========================================
  
  // Timeout for each test
  timeout: 30000,
  
  // Timeout for expect() assertions
  expect: {
    timeout: 10000,
  },
  
  // ========================================
  // GLOBAL SETUP & TEARDOWN
  // ========================================
  
  // globalSetup: require.resolve('./e2e/global-setup'),
  // globalTeardown: require.resolve('./e2e/global-teardown'),
  
  // ========================================
  // PROJECTS: Multi-Browser Testing
  // ========================================
  
  projects: [
    // Setup project: authenticate, seed data, etc.
    {
      name: 'setup',
      testMatch: /global\.setup\.ts/,
      teardown: 'cleanup',
    },
    
    // Cleanup project
    {
      name: 'cleanup',
      testMatch: /global\.teardown\.ts/,
    },
    
    // ========================================
    // DESKTOP BROWSERS
    // ========================================
    
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Test against branded browsers
        channel: process.env.CI ? undefined : 'chrome',
      },
      dependencies: ['setup'],
    },
    
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
      },
      dependencies: ['setup'],
    },
    
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
      },
      dependencies: ['setup'],
    },
    
    // ========================================
    // MOBILE BROWSERS (Optional)
    // ========================================
    
    // Uncomment for mobile testing
    // {
    //   name: 'Mobile Chrome',
    //   use: {
    //     ...devices['Pixel 5'],
    //   },
    //   dependencies: ['setup'],
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: {
    //     ...devices['iPhone 13'],
    //   },
    //   dependencies: ['setup'],
    // },
    
    // ========================================
    // MICROSOFT EDGE (Optional)
    // ========================================
    
    // {
    //   name: 'Microsoft Edge',
    //   use: {
    //     ...devices['Desktop Edge'],
    //     channel: 'msedge',
    //   },
    //   dependencies: ['setup'],
    // },
    
    // ========================================
    // GOOGLE CHROME (Branded - Optional)
    // ========================================
    
    // {
    //   name: 'Google Chrome',
    //   use: {
    //     ...devices['Desktop Chrome'],
    //     channel: 'chrome',
    //   },
    //   dependencies: ['setup'],
    // },
  ],
  
  // ========================================
  // WEB SERVER CONFIGURATION
  // ========================================
  
  /**
   * Run your local dev server before starting the tests
   * https://playwright.dev/docs/test-webserver
   */
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
  
  // ========================================
  // METADATA FOR REPORTING
  // ========================================
  
  metadata: {
    'Test Suite': 'AFENDA Meta UI E2E Tests',
    'Environment': process.env.CI ? 'CI' : 'Local',
    'Node Version': process.version,
  },
})
