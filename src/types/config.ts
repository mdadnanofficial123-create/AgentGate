import { z } from 'zod';

export const TestCaseSchema = z.object({
  id: z.string(),
  name: z.string(),
  input: z.string(),
  expected_output: z.string().optional(),
  forbidden_terms: z.array(z.string()).optional(),
  max_latency_ms: z.number().optional(),
});

export const TestConfigSchema = z.object({
  target_endpoint: z.string().url(),
  headers: z.record(z.string(), z.string()).optional(),
  test_cases: z.array(TestCaseSchema),
});

export type TestCase = z.infer<typeof TestCaseSchema>;
export type TestConfig = z.infer<typeof TestConfigSchema>;