/**
 * Mock Logger for Tests
 * ======================
 * Provides a mock Pino logger for unit tests.
 */

export interface MockLog {
  level: string;
  message: string;
  data?: Record<string, unknown>;
}

export class MockLogger {
  public logs: MockLog[] = [];

  private _log(level: string, dataOrMessage: unknown, message?: string) {
    if (typeof dataOrMessage === "string") {
      this.logs.push({ level, message: dataOrMessage });
    } else if (typeof dataOrMessage === "object" && message) {
      this.logs.push({ level, message, data: dataOrMessage as Record<string, unknown> });
    }
  }

  info(dataOrMessage: unknown, message?: string) {
    this._log("info", dataOrMessage, message);
  }

  error(dataOrMessage: unknown, message?: string) {
    this._log("error", dataOrMessage, message);
  }

  warn(dataOrMessage: unknown, message?: string) {
    this._log("warn", dataOrMessage, message);
  }

  debug(dataOrMessage: unknown, message?: string) {
    this._log("debug", dataOrMessage, message);
  }

  child(bindings: Record<string, unknown>) {
    return this; // Return same instance for simplicity
  }

  flush() {
    // no-op
  }

  clear() {
    this.logs = [];
  }

  findLog(level: string, messagePattern: string | RegExp): MockLog | undefined {
    return this.logs.find((log) => {
      if (log.level !== level) return false;
      if (typeof messagePattern === "string") {
        return log.message.includes(messagePattern);
      }
      return messagePattern.test(log.message);
    });
  }

  hasLog(level: string, messagePattern: string | RegExp): boolean {
    return this.findLog(level, messagePattern) !== undefined;
  }
}

// Usage in tests:
// const mockLogger = new MockLogger();
// vi.mock("../logging/index.js", () => ({ logger: mockLogger }));
// expect(mockLogger.hasLog("error", "Failed to fetch")).toBe(true);
