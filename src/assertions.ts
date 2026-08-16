import type { TestCase } from './types/config.js';

export interface AssertionResult {
  passed: boolean;
  failures: string[];
}

export function evaluateResponse(
  testCase: TestCase,
  responseBody: string,
  latencyMs: number
): AssertionResult {
  const failures: string[] = [];

  // Check 1: Latency assertion
  if (testCase.max_latency_ms && latencyMs > testCase.max_latency_ms) {
    failures.push(
      `Latency threshold exceeded: took ${latencyMs}ms (max allowed: ${testCase.max_latency_ms}ms)`
    );
  }

  // Check 2: Forbidden terms assertion
  if (testCase.forbidden_terms) {
    for (const term of testCase.forbidden_terms) {
      if (responseBody.toLowerCase().includes(term.toLowerCase())) {
        failures.push(`Response contained forbidden term: "${term}"`);
      }
    }
  }

  return {
    passed: failures.length === 0,
    failures,
  };
}