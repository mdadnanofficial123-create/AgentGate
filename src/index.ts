import 'dotenv/config';
import { Command } from 'commander';
import { green, red, bold, yellow, dim } from 'colorette';
import * as core from '@actions/core';
import { parseConfig } from './parser.js';
import { executeTestSuite } from './runner.js';
import { postPRComment } from './reporter.js';

const program = new Command();

program
  .name('agentgate')
  .description('CI/CD Guardrail & Evaluator for AI Agents')
  .version('0.1.0');

program
  .command('run')
  .description('Run evaluation suite against target agent')
  .option('-c, --config <path>', 'path to config file', 'eval.yaml')
  .action(async (options) => {
    try {
      // Support inputs passed via GitHub Action environment variables or local flags
      const configPath = core.getInput('config-path') || options.config;
      const ghToken = core.getInput('github-token') || process.env.GITHUB_TOKEN;
      const xaiKey = core.getInput('xai-api-key') || process.env.XAI_API_KEY || process.env.GROQ_API_KEY;

      if (xaiKey) {
        process.env.XAI_API_KEY = xaiKey;
      }

      console.log(`\n${bold('[AgentGate]')} Loading evaluation suite: ${configPath}`);
      const config = parseConfig(configPath);

      console.log(`${bold('[AgentGate]')} Executing ${config.test_cases.length} test(s) against ${dim(config.target_endpoint)}...\n`);

      const results = await executeTestSuite(config);

      let passedCount = 0;
      let failedCount = 0;

      results.forEach((res) => {
        if (res.passed) {
          passedCount++;
          console.log(` ${green('✓ PASS')} [${res.testCase.id}] ${res.testCase.name} ${dim(`(${res.latencyMs}ms)`)}`);
        } else {
          failedCount++;
          console.log(` ${red('✗ FAIL')} [${res.testCase.id}] ${res.testCase.name} ${dim(`(${res.latencyMs}ms)`)}`);
          res.failures.forEach((failure) => {
            console.log(`    ${yellow('└─')} ${failure}`);
          });
          if (res.error) {
            console.log(`    ${yellow('└─ Error:')} ${res.error}`);
          }
        }
      });

      console.log(`\n${bold('Test Summary:')} ${green(`${passedCount} passed`)}, ${failedCount > 0 ? red(`${failedCount} failed`) : '0 failed'}\n`);

      // Post comment to PR if GitHub Token is present
      if (ghToken) {
        await postPRComment(results, ghToken);
      }

      if (failedCount > 0) {
        core.setFailed(`AgentGate evaluation failed with ${failedCount} violation(s).`);
        process.exitCode = 1;
      }
    } catch (err: any) {
      console.error(`\n${red('[AgentGate Error]:')} ${err.message}`);
      core.setFailed(err.message);
      process.exitCode = 1;
    }
  });

program.parse(process.argv);