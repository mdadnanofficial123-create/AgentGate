export interface JudgeResult {
  passed: boolean;
  reason: string;
}

export async function evaluateWithLLM(
  input: Record<string, any>,
  actualResponse: string,
  criteria: string,
  model: string = 'grok-beta'
): Promise<JudgeResult> {
  const apiKey = process.env.XAI_API_KEY || process.env.GROQ_API_KEY;

  if (!apiKey) {
    return {
      passed: false,
      reason: 'GROQ_API_KEY / XAI_API_KEY is missing from environment variables (.env).',
    };
  }

  try {
    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content:
              'You are an AI evaluator. Respond ONLY in valid JSON with format: {"passed": boolean, "reason": "string"}.',
          },
          {
            role: 'user',
            content: `Evaluation Criteria: "${criteria}"\nInput Received: ${JSON.stringify(input)}\nActual Agent Output: "${actualResponse}"`,
          },
        ],
        temperature: 0.1,
      }),
    });

    if (!res.ok) {
      return { passed: false, reason: `LLM API call failed with status ${res.status}` };
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);

    return {
      passed: Boolean(parsed.passed),
      reason: parsed.reason || 'No detailed reason provided by judge.',
    };
  } catch (err: any) {
    return { passed: false, reason: `Judge evaluation error: ${err.message}` };
  }
}