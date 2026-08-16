import Groq from 'groq-sdk';

export interface JudgeResult {
  passed: boolean;
  reason: string;
}

export async function evaluateWithLLM(
  prompt: string,
  response: string,
  criteria: string,
  modelName: string = 'llama-3.3-70b-versatile'
): Promise<JudgeResult> {
  const apiKey = process.env.GROQ_API_KEY;

  // DEBUG PRINT (Remove after fixing)
//   console.log('Detected Key Prefix:', apiKey ? apiKey.substring(0, 8) : 'UNDEFINED');
//   console.log('Key Total Length:', apiKey ? apiKey.length : 0);

  if (!apiKey) {
    return {
      passed: false,
      reason: 'GROQ_API_KEY is missing from environment variables (.env).',
    };
  }

  const groq = new Groq({ apiKey });

  const systemPrompt = `You are a strict automated CI/CD software judge evaluating an AI agent's performance.
Your job is to determine if the agent's actual output meets the specified pass criteria.

Respond ONLY in valid JSON with this exact structure:
{
  "passed": boolean,
  "reason": "Short explanation of why it passed or failed"
}`;

  const userPrompt = `
[USER INPUT TO AGENT]:
"${prompt}"

[AGENT ACTUAL RESPONSE]:
"${response}"

[EVALUATION CRITERIA]:
"${criteria}"
`;

  try {
    const completion = await groq.chat.completions.create({
      model: modelName,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);

    return {
      passed: Boolean(parsed.passed),
      reason: parsed.reason || 'No reasoning provided by LLM judge.',
    };
  } catch (err: any) {
    return {
      passed: false,
      reason: `LLM Judge Execution Error: ${err.message}`,
    };
  }
}