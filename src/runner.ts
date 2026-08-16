import type { EvalConfig, TestCase } from './types/config.js';
import { evaluateResponse } from './assertions.js';
import { validateJSONSchema, getRedTeamPayloads } from './security.js';

export interface TestResult {
  id: string;
  name: string;
  passed: boolean;
  durationMs: number;
  failures: string[];
}

export interface TestRunReport {
  results: TestResult[];
  passedCount: number;
  failedCount: number;
  totalDurationMs: number;
}

export async function executeTestCase(
  endpoint: string,
  testCase: TestCase
): Promise<TestResult> {
  const startTime = Date.now();
  const failures: string[] = [];
  let passed = true;
  const requestEndpoint = testCase.endpoint_override || endpoint;

  try {
    // 1. Primary Request Execution
    const response = await fetch(requestEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testCase.input),
    });

    const durationMs = Date.now() - startTime;
    const responseText = await response.text();

    let responseBody: Record<string, any> | null = null;
    try {
      responseBody = JSON.parse(responseText);
    } catch {
      // Non-JSON response
    }

    // 2. HTTP Status Code Check
    if (testCase.expected_status && response.status !== testCase.expected_status) {
      passed = false;
      failures.push(
        `[Status Code Mismatch]: Expected status ${testCase.expected_status}, got ${response.status}`
      );
    }

    // 3. Standard & LLM Assertions (via assertion.ts)
    const assertionEval = await evaluateResponse(testCase, responseText, durationMs);
    if (!assertionEval.passed) {
      passed = false;
      failures.push(...assertionEval.failures);
    }

    // 4. Day 5: JSON Schema Assertion
    if (testCase.json_schema) {
      if (!responseBody) {
        passed = false;
        failures.push('[Schema Fail]: Expected valid JSON response, but received non-JSON body');
      } else {
        const schemaResult = validateJSONSchema(responseBody, testCase.json_schema);
        if (!schemaResult.valid) {
          passed = false;
          failures.push(`[Schema Fail]: ${schemaResult.error}`);
        }
      }
    }

    // 5. Day 5: Security Red-Teaming Suite Execution
    if (testCase.security_suite && testCase.security_suite !== 'none') {
      const payloads = getRedTeamPayloads(testCase.security_suite);

      for (const payload of payloads) {
        const secRes = await fetch(requestEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: payload.prompt }),
        });

        const secText = await secRes.text();

        for (const keyword of payload.prohibitedKeywords) {
          if (secText.toLowerCase().includes(keyword.toLowerCase())) {
            passed = false;
            failures.push(
              `[Security Violation - ${payload.category}]: Response leaked prohibited output keyword '${keyword}' when injected with prompt: "${payload.prompt.substring(0, 35)}..."`
            );
          }
        }
      }
    }

    return { id: testCase.id, name: testCase.name, passed, durationMs, failures };
  } catch (err: any) {
    return {
      id: testCase.id,
      name: testCase.name,
      passed: false,
      durationMs: Date.now() - startTime,
      failures: [`[Network / System Failure]: ${err.message}`],
    };
  }
}

export async function executeTestSuite(config: EvalConfig): Promise<TestRunReport> {
  const startTime = Date.now();
  const results = await Promise.all(
    config.test_cases.map((testCase) => executeTestCase(config.target_endpoint, testCase))
  );

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.length - passedCount;

  return {
    results,
    passedCount,
    failedCount,
    totalDurationMs: Date.now() - startTime,
  };
}

export const runSuite = executeTestSuite;