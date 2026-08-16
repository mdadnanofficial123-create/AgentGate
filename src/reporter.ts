import * as github from '@actions/github';
import type { TestRunReport } from './runner.js';

export async function postPRComment(report: TestRunReport): Promise<void> {
  const token = process.env.GITHUB_TOKEN || process.env.INPUT_GITHUB_TOKEN;
  if (!token) return;

  const context = github.context;
  if (context.eventName !== 'pull_request') return;

  const prNumber = context.payload.pull_request?.number;
  if (!prNumber) return;

  const octokit = github.getOctokit(token);

  let markdown = `## 🛡️ AgentGate Security & Evaluation Report\n\n`;
  markdown += `**Status**: ${report.failedCount === 0 ? '✅ PASSED' : '❌ FAILED'}\n`;
  markdown += `**Summary**: ${report.passedCount} passed, ${report.failedCount} failed (${report.totalDurationMs}ms)\n\n`;

  markdown += `| Test Case | Status | Duration | Failure Reason |\n`;
  markdown += `| :--- | :---: | :---: | :--- |\n`;

  for (const res of report.results) {
    const statusIcon = res.passed ? '✓ PASS' : '✗ FAIL';
    const reason = res.failures.length > 0 ? res.failures.join('<br>') : 'None';
    markdown += `| **${res.id}**: ${res.name} | ${statusIcon} | ${res.durationMs}ms | ${reason} |\n`;
  }

  await octokit.rest.issues.createComment({
    ...context.repo,
    issue_number: prNumber,
    body: markdown,
  });
}