import { Command } from 'commander';
import { parseConfig } from './parser.js';
import { executeTestSuite } from './runner.js';
import { postPRComment } from './reporter.js';

// ANSI escape codes for terminal coloring
const colors = {
  green: (text: string) => `\x1b[32m${text}\x1b[0m`,
  red: (text: string) => `\x1b[31m${text}\x1b[0m`,
  bold: (text: string) => `\x1b[1m${text}\x1b[0m`,
  dim: (text: string) => `\x1b[2m${text}\x1b[0m`,
};

const program = new Command();

program
  .name('agentgate')
  .description('Zero-trust evaluation and LLM-as-a-judge regression testing for AI agents.')
  .version('1.0.0');

program
  .command('run')
  .description('Run evaluation suite')
  .option('-c, --config <path>', 'Path to eval configuration file', 'eval.yaml')
  .action(async (options) => {
    try {
      console.log(`[AgentGate] Loading evaluation suite: ${options.config}`);
      const config = parseConfig(options.config);

      console.log(
        `[AgentGate] Executing ${config.test_cases.length} test(s) against ${config.target_endpoint}...\n`
      );

      const report = await executeTestSuite(config);

      for (const res of report.results) {
        if (res.passed) {
          console.log(
            ` ${colors.green('✓ PASS')} ${colors.bold(`[${res.id}]`)} ${res.name} ${colors.dim(`(${res.durationMs}ms)`)}`
          );
        } else {
          console.log(
            ` ${colors.red('✗ FAIL')} ${colors.bold(`[${res.id}]`)} ${res.name} ${colors.dim(`(${res.durationMs}ms)`)}`
          );
          for (const fail of res.failures) {
            console.log(`    └─ ${colors.red(fail)}`);
          }
        }
      }

      console.log(
        `\nTest Summary: ${colors.green(`${report.passedCount} passed`)}, ${
          report.failedCount > 0 ? colors.red(`${report.failedCount} failed`) : `${report.failedCount} failed`
        }`
      );

      // Post PR Comment if in GitHub Actions environment
      await postPRComment(report);

      if (report.failedCount > 0) {
        process.exit(1);
      }
    } catch (err: any) {
      console.error(colors.red(`Error: ${err.message}`));
      process.exit(1);
    }
  });

program.parse(process.argv);