import { z } from 'zod';

export const TestCaseSchema = z.object({
  id: z.string(),
  name: z.string(),
  input: z.string(),
  max_latency_ms: z.number().optional(),
  forbidden_terms: z.array(z.string()).optional(),
  // New Day 3 Field
  llm_judge: z.object({
    criteria: z.string(),
    model: z.string().default('llama-3.3-70b-versatile')
  }).optional(),
});

export const TestConfigSchema = z.object({
  target_endpoint: z.string().url(),
  headers: z.record(z.string(), z.string()).optional(),
  test_cases: z.array(TestCaseSchema),
});

export type TestCase = z.infer<typeof TestCaseSchema>;
export type TestConfig = z.infer<typeof TestConfigSchema>;