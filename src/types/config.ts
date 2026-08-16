import { z } from 'zod';

export const LlmJudgeConfigSchema = z.object({
  criteria: z.string(),
  model: z.string().optional(),
});

export const AssertionSchema = z
  .object({
    type: z.string().optional(),
    field: z.string().optional(),
    value: z
      .union([
        z.string(),
        z.number(),
        z.boolean(),
        z.array(z.any()),
        z.record(z.string(), z.any()),
        z.null(),
      ])
      .optional(),
    threshold: z.number().optional(),
    term: z.string().optional(),
  })
  .passthrough();

export const TestCaseSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    input: z.record(z.string(), z.any()).optional().default({}),
    expected_status: z.number().optional().default(200),
    max_latency_ms: z.number().optional(),
    forbidden_terms: z.array(z.string()).optional(),
    assertions: z.array(z.union([z.string(), AssertionSchema])).optional().default([]),
    llm_judge: LlmJudgeConfigSchema.optional(),

    // Day 5 Extensions
    json_schema: z.record(z.string(), z.any()).optional(),
    expected_schema: z.record(z.string(), z.any()).optional(),
    security_suite: z
      .enum(['none', 'prompt-injection', 'pii-leakage', 'owasp-top-10'])
      .optional()
      .default('none'),
    endpoint_override: z.string().url().optional(),

    // Compatibility with sample YAML and optional metadata
    suite: z.string().optional(),
    prompt: z.string().optional(),
    threshold: z.number().optional(),
  })
  .passthrough();

export const EvalConfigSchema = z.object({
  version: z.string(),
  target_endpoint: z.string().url(),
  test_cases: z.array(TestCaseSchema),
});

export type TestCase = z.infer<typeof TestCaseSchema>;
export type EvalConfig = z.infer<typeof EvalConfigSchema>;
export type LlmJudgeConfig = z.infer<typeof LlmJudgeConfigSchema>;
export type AssertionConfig = z.infer<typeof AssertionSchema>;