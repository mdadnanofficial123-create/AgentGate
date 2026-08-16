import fs from 'fs';
import YAML from 'yaml';
import { TestConfigSchema } from './types/config.js';
import type { TestConfig } from './types/config.js';

export function parseConfig(filePath: string): TestConfig {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Configuration file not found at path: ${filePath}`);
  }

  const fileContent = fs.readFileSync(filePath, 'utf8');
  const rawYaml = YAML.parse(fileContent);

  // Validates structure at runtime using Zod
  return TestConfigSchema.parse(rawYaml);
}   