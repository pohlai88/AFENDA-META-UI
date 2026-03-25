# Testing Strategy - Enterprise Configuration

**AFENDA Meta UI - Comprehensive Testing Setup**

## 📋 Overview

This repository implements **enterprise-grade testing** with two complementary frameworks:

- **Vitest**: Fast unit and component tests
- **Playwright**: Reliable E2E browser automation

## 🎯 Testing Philosophy

### Deterministic Testing

- Tests run reliably in any environment
- Controlled parallelism prevents race conditions
- Retry strategies handle transient failures in CI
- Isolated test environments prevent cross-contamination

### Scalability

- Multi-project configuration for test organization
- Sharding support for distributed execution
- Optimized worker pools for CI/CD pipelines
- Incremental coverage tracking

### Maintainability

- Clear test organization with tags
- Comprehensive reporting for debugging
- Reusable fixtures and utilities
- Self-documenting configuration

---

## 🧪 Vitest Configuration

### Multi-Project Setup

```bash
# Run all tests
pnpm test

# Run specific project
pnpm test:unit          # Pure logic tests (Node environment)
pnpm test:component     # UI component tests (jsdom)
pnpm test:integration   # Integration tests with mocks
```

### Project Structure

```
apps/web/
├── src/
│   ├── lib/                    # Unit tests (#unit)
│   │   └── utils.test.ts
│   ├── components/             # Component tests (#component)
│   │   └── ui/
│   │       └── button.test.tsx
│   ├── renderers/              # Component tests (#component)
│   │   └── fields/
│   │       └── FormFieldRenderer.test.tsx
│   └── **/*.integration.test.tsx  # Integration tests (#integration)
```

### Test Tags

Organize tests with tags for flexible execution:

```typescript
// Fast unit test
test('calculates correctly', { tags: ['@unit'] }, () => {
  expect(add(2, 3)).toBe(5)
})

// Component test with longer timeout
test('renders button', { tags: ['@component'] }, async () => {
  render(<Button>Click</Button>)
  // ...
})

// Known flaky test with retries
test('flaky api call', { tags: ['@flaky'] }, async () => {
  // Will retry 3x on CI, 1x locally
})

// Skip in CI
test('visual regression', { tags: ['@skip-ci'] }, () => {
  // Skipped in CI pipeline
})
```

### Coverage Strategy

**Global Thresholds:**

- Lines: 75%
- Functions: 75%
- Branches: 70%
- Statements: 75%

**Critical Path Requirements:**

- `src/lib/utils.ts`: 100% coverage
- `src/lib/**`: 90% functions, 85% branches
- `src/hooks/**`: 85% functions, 80% branches

**Auto-update:** Coverage thresholds automatically round down to whole numbers.

### CI/CD Optimization

**On CI (detected via `process.env.CI`):**

- Limit workers to 2 for stability
- Enable 2 retries for flaky tests
- Bail after 10 failures to save resources
- Mark flaky tests as failures
- Use JSON/JUnit reporters for integration
- Log heap usage for profiling

**Locally:**

- Use all available CPU cores
- No retries (fail fast for debugging)
- HTML coverage report
- Watch mode enabled

---

## 🎭 Playwright Configuration

### Multi-Browser Testing

```bash
# Run all E2E tests across all browsers
pnpm e2e

# Run specific browser
pnpm e2e:chromium
pnpm e2e:firefox
pnpm e2e:webkit

# Debug mode
pnpm e2e:debug

# UI mode (interactive)
pnpm e2e:ui

# View report
pnpm e2e:report
```

### Test Structure

```
apps/web/
├── e2e/
│   ├── global.setup.ts        # Global setup (auth, seeding)
│   ├── global.teardown.ts     # Global cleanup
│   ├── example.e2e.ts         # Example E2E test
│   └── auth.json              # Saved auth state
├── playwright.config.ts       # Playwright configuration
└── playwright-report/         # Test reports
```

### Parallel Execution

**Fully Parallel:** All tests run concurrently across browser instances.

**Worker Configuration:**

- CI: 50% of available CPU cores
- Local: Unlimited workers

### Retry Strategy

**CI Environment:**

- Retry failed tests 2 times
- Fail on flaky tests
- Bail after 10 failures

**Local Environment:**

- No retries (fail fast for debugging)

### Trace Collection

**On CI:**

- Collect trace on first retry
- Screenshots on failure only
- Videos on failure only

**Locally:**

- Trace on failure
- Screenshots on failure
- Videos on first retry

### Global Setup/Teardown

**Global Setup (`e2e/global.setup.ts`):**

1. **Authentication**: Login once, save state to `e2e/auth.json`
2. **Database Seeding**: Create test data via API
3. **Service Health Checks**: Verify services are running

**Global Teardown (`e2e/global.teardown.ts`):**

1. **Cleanup Auth**: Delete auth state file
2. **Cleanup Data**: Remove test data via API
3. **Generate Summary**: Custom reporting

### Project Dependencies

```typescript
projects: [
  { name: "setup", testMatch: /global\.setup\.ts/, teardown: "cleanup" },
  { name: "cleanup", testMatch: /global\.teardown\.ts/ },
  { name: "chromium", dependencies: ["setup"] }, // Runs after setup
  { name: "firefox", dependencies: ["setup"] },
  { name: "webkit", dependencies: ["setup"] },
];
```

Tests run only after setup completes, cleanup runs after all tests finish.

---

## 🚀 CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
      - run: pnpm install
      - run: pnpm test:run
      - run: pnpm test:coverage
      - uses: codecov/codecov-action@v4
        with:
          files: ./apps/web/coverage/lcov.info

  e2e-tests:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        shard: [1/3, 2/3, 3/3]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
      - run: pnpm install
      - run: npx playwright install --with-deps
      - run: pnpm e2e --shard=${{ matrix.shard }}
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report-${{ matrix.shard }}
          path: apps/web/playwright-report
```

### Test Sharding

Distribute E2E tests across multiple machines:

```bash
# Machine 1
pnpm e2e --shard=1/3

# Machine 2
pnpm e2e --shard=2/3

# Machine 3
pnpm e2e --shard=3/3
```

---

## 📊 Reporting

### Vitest Reports

**Local Development:**

- `test-results/index.html`: Interactive HTML report
- `coverage/html/index.html`: Coverage report

**CI Pipeline:**

- `test-results/junit.xml`: JUnit format for CI integration
- `test-results/results.json`: JSON format for custom processing

### Playwright Reports

**Local Development:**

- `playwright-report/index.html`: HTML report (opens on failure)

**CI Pipeline:**

- `test-results/e2e-junit.xml`: JUnit format
- `test-results/e2e-results.json`: JSON format
- `test-results/playwright-output/`: Screenshots, videos, traces

---

## 🔧 Best Practices

### Test Organization

1. **Unit Tests**: Pure functions, no side effects
2. **Component Tests**: UI rendering, user interactions
3. **Integration Tests**: Multiple components, API mocks
4. **E2E Tests**: Full user flows, real backend

### Test Isolation

✅ **DO:**

- Create fresh fixtures for each test
- Use `beforeEach` for setup
- Clean up after tests with `afterEach`
- Use unique data for parallel tests

❌ **DON'T:**

- Share mutable state between tests
- Depend on test execution order
- Leave side effects after tests
- Use hardcoded IDs that conflict

### Flaky Test Handling

**Identify:**

- Tests that pass/fail inconsistently
- Race conditions in async code
- Timing-dependent assertions

**Fix:**

- Use proper waiters (`waitFor`, `waitForLoadState`)
- Avoid `sleep()` or fixed timeouts
- Use retry strategies as last resort
- Tag with `@flaky` and track

### Performance

**Vitest:**

- Use `test.concurrent` for independent tests
- Avoid heavy setup in `describe` blocks
- Mock external dependencies
- Use coverage thresholds to prevent bloat

**Playwright:**

- Reuse authentication state
- Run tests in parallel when possible
- Use selective test execution (`--grep`)
- Shard tests across machines for large suites

---

## 📈 Metrics & Monitoring

### Key Metrics

1. **Test Coverage**: Track coverage trends over time
2. **Test Duration**: Monitor slow tests
3. **Flaky Tests**: Identify and fix unstable tests
4. **Test Distribution**: Balance across projects

### Monitoring Tools

- **Vitest UI**: `pnpm test:ui` - Interactive test explorer
- **Playwright UI**: `pnpm e2e:ui` - Visual test debugging
- **Coverage Reports**: Track code coverage evolution
- **CI Dashboards**: Integrate with your CI platform

---

## 🎓 Learning Resources

### Vitest

- [Official Documentation](https://vitest.dev)
- [API Reference](https://vitest.dev/api/)
- [Configuration](https://vitest.dev/config/)

### Playwright

- [Official Documentation](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [API Reference](https://playwright.dev/docs/api/class-playwright)

### Testing Library

- [React Testing Library](https://testing-library.com/react)
- [User Event](https://testing-library.com/docs/user-event/intro/)
- [Jest-DOM Matchers](https://github.com/testing-library/jest-dom)

---

## 🐛 Troubleshooting

### Vitest Issues

**"Cannot find module"**

```bash
# Check path aliases in vitest.config.ts
# Ensure tsconfig.json paths match
```

**"Segmentation fault"**

```bash
# Reduce worker count
# Disable file parallelism
maxWorkers: 1
fileParallelism: false
```

### Playwright Issues

**"Browser not installed"**

```bash
npx playwright install
npx playwright install --with-deps  # Install system dependencies
```

**"Timeout waiting for page"**

```typescript
// Increase timeout in config
timeout: 60000; // 60 seconds
```

**"Test failed on CI but passes locally"**

```bash
# Enable trace collection
trace: 'on'

# Run with same workers as CI
pnpm e2e --workers=2
```

---

## 📞 Support

For questions or issues:

1. Check this documentation
2. Review example tests in `src/` and `e2e/`
3. Consult official framework documentation
4. Open an issue in the repository

---

**Last Updated:** March 23, 2026  
**Configuration Version:** 1.0.0
