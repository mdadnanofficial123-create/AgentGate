import type { TestCase } from './types/config.js';
import { evaluateWithLLM } from './judge.js';

export interface AssertionResult {
  passed: boolean;
  failures: string[];
}

function getFieldValue(responseText: string, fieldPath?: string): unknown {
  if (!fieldPath) {
    return responseText;
  }

  try {
    const parsed = JSON.parse(responseText);
    return fieldPath.split('.').reduce((current, segment) => current?.[segment], parsed as any);
  } catch {
    return undefined;
  }
}

export async function evaluateResponse(
  testCase: TestCase,
  responseBody: string,
  latencyMs: number
): Promise<AssertionResult> {
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

  // Check 3: Structured assertions from YAML objects
  if (testCase.assertions && testCase.assertions.length > 0) {
    for (const assertion of testCase.assertions) {
      if (typeof assertion === 'string') {
        if (!responseBody.includes(assertion)) {
          failures.push(`[String Assertion Failed]: Output missing '${assertion}'`);
        }
        continue;
      }

      const kind = String(assertion.type ?? 'contains').toLowerCase();
      const fieldValue = getFieldValue(responseBody, assertion.field);

      if (kind === 'max-latency') {
        const threshold = assertion.threshold ?? testCase.max_latency_ms ?? 0;
        if (threshold > 0 && latencyMs > threshold) {
          failures.push(`Latency threshold exceeded: took ${latencyMs}ms (max allowed: ${threshold}ms)`);
        }
        continue;
      }

      const expectedValue = assertion.value;

      if (kind === 'contains') {
        const actualText = typeof fieldValue === 'string' ? fieldValue : String(fieldValue ?? '');
        if (typeof expectedValue === 'string' && !actualText.includes(expectedValue)) {
          failures.push(`[Contains Assertion Failed]: Expected '${expectedValue}' in ${assertion.field ?? 'response'}`);
        }
        continue;
      }

      if (kind === 'exact') {
        if (JSON.stringify(fieldValue) !== JSON.stringify(expectedValue)) {
          failures.push(
            `[Exact Assertion Failed]: Expected ${assertion.field ?? 'response'} to equal ${JSON.stringify(expectedValue)}`
          );
        }
        continue;
      }

      if (typeof expectedValue === 'string' && !responseBody.includes(expectedValue)) {
        failures.push(`[Assertion Failed]: Output missing '${expectedValue}'`);
      }
    }
  }

  // Check 4: Structured LLM-as-a-Judge assertion
  if (testCase.llm_judge) {
    const judgeEval = await evaluateWithLLM(
      testCase.input,
      responseBody,
      testCase.llm_judge.criteria,
      testCase.llm_judge.model
    );

    if (!judgeEval.passed) {
      failures.push(`[LLM Judge Failed]: ${judgeEval.reason}`);
    }
  }

  return {
    passed: failures.length === 0,
    failures,
  };
}