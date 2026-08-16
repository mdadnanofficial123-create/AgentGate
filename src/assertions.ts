import type { TestCase } from './types/config.js';
import { evaluateWithLLM } from './judge.js';

export interface AssertionResult {
  passed: boolean;
  failures: string[];
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

  // Check 3: LLM-as-a-Judge assertion
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