import fs from 'node:fs';
import yaml from 'yaml';
import { EvalConfigSchema } from './types/config.js';
import type { EvalConfig } from './types/config.js';

export function parseConfig(filePath: string): EvalConfig {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Configuration file not found at path: ${filePath}`);
  }

  const fileContent = fs.readFileSync(filePath, 'utf8');
  const parsedYaml = yaml.parse(fileContent) as Record<string, any>;

  const normalizedYaml = {
    ...parsedYaml,
    test_cases: Array.isArray(parsedYaml.test_cases)
      ? parsedYaml.test_cases.map((testCase: Record<string, any>) => {
          const normalizedCase: Record<string, any> = { ...testCase };

          if (!normalizedCase.input) {
            normalizedCase.input = {};
          }

          if (!normalizedCase.assertions) {
            normalizedCase.assertions = [];
          }

          if (normalizedCase.expected_schema && !normalizedCase.json_schema) {
            normalizedCase.json_schema = normalizedCase.expected_schema;
          }

          if (normalizedCase.prompt && !normalizedCase.llm_judge) {
            normalizedCase.llm_judge = {
              criteria: normalizedCase.prompt,
              ...(normalizedCase.model ? { model: normalizedCase.model } : {}),
            };
          }

          if (normalizedCase.security_suite == null && normalizedCase.suite === 'security') {
            normalizedCase.security_suite = 'owasp-top-10';
          }

          return normalizedCase;
        })
      : [],
  };

  return EvalConfigSchema.parse(normalizedYaml);
}