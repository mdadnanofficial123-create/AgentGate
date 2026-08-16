import type { TestConfig, TestCase } from './types/config.js';
import { evaluateResponse } from './assertions.js';

export interface TestRunReport {
  testCase: TestCase;
  passed: boolean;
  latencyMs: number;
  failures: string[];
  error?: string;
}

async function runSingleTest(
  testCase: TestCase,
  targetEndpoint: string,
  headers?: Record<string, string>
): Promise<TestRunReport> {
  const startTime = Date.now();

  try {
    const response = await fetch(targetEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({ prompt: testCase.input }),
    });

    const latencyMs = Date.now() - startTime;
    const responseText = await response.text();

    const evaluation = await evaluateResponse(testCase, responseText, latencyMs);

    return {
      testCase,
      passed: evaluation.passed,
      latencyMs,
      failures: evaluation.failures,
    };
  } catch (err: any) {
    return {
      testCase,
      passed: false,
      latencyMs: Date.now() - startTime,
      failures: ['Network request failed'],
      error: err.message,
    };
  }
}

export async function executeTestSuite(config: TestConfig): Promise<TestRunReport[]> {
  // Executes all tests concurrently using Node async event loop
  const testPromises = config.test_cases.map((tc) =>
    runSingleTest(tc, config.target_endpoint, config.headers)
  );

  return Promise.all(testPromises);
}