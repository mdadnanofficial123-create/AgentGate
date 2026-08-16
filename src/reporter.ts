import * as github from '@actions/github';
import * as core from '@actions/core';
import type { TestRunReport } from './runner.js';

export async function postPRComment(
  results: TestRunReport[],
  token: string
): Promise<void> {
  const context = github.context;

  // Only run if triggered by a Pull Request
  if (!context.payload.pull_request) {
    core.info('Not a pull request execution. Skipping PR comment posting.');
    return;
  }

  const prNumber = context.payload.pull_request.number;
  const octokit = github.getOctokit(token);

  let passedCount = 0;
  let failedCount = 0;

  let tableRows = results
    .map((res) => {
      if (res.passed) {
        passedCount++;
        return `| ✅ **PASS** | \`${res.testCase.id}\` | ${res.testCase.name} | ${res.latencyMs}ms | Passed |`;
      } else {
        failedCount++;
        const failureDetails = res.failures.join('<br>');
        return `| ❌ **FAIL** | \`${res.testCase.id}\` | ${res.testCase.name} | ${res.latencyMs}ms | ${failureDetails} |`;
      }
    })
    .join('\n');

  const summaryHeader = failedCount > 0 ? '❌ **BUILD BLOCKED**' : '✅ **ALL TESTS PASSED**';

  const commentBody = `### 🛡️ AgentGate Evaluation Report

${summaryHeader}

| Status | Test ID | Name | Latency | Details |
| :---: | :--- | :--- | :---: | :--- |
${tableRows}

---
**Summary:** ${passedCount} Passed, ${failedCount} Failed
*Powered by AgentGate Zero-Trust Guardrails*`;

  try {
    await octokit.rest.issues.createComment({
      ...context.repo,
      issue_number: prNumber,
      body: commentBody,
    });
    core.info(`Successfully posted evaluation comment to PR #${prNumber}`);
  } catch (err: any) {
    core.warning(`Failed to post PR comment: ${err.message}`);
  }
}