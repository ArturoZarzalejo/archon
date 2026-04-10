import { NextResponse } from 'next/server';
import { getRegistry } from '@/lib/registry';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const registry = await getRegistry();
  const agent = registry.get(id);

  if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });

  const { input, promptA, promptB } = await request.json();
  const provider = agent.provider;
  const model = agent.model;

  if (!model) {
    return NextResponse.json({ error: 'Agent has no model configured' }, { status: 400 });
  }

  if (!promptA || !promptB) {
    return NextResponse.json({ error: 'Both promptA and promptB are required' }, { status: 400 });
  }

  const inputStr = typeof input === 'string' ? input : JSON.stringify(input);

  // Run both prompts in parallel
  const [resA, resB] = await Promise.allSettled([
    callProvider(provider, model, promptA, inputStr),
    callProvider(provider, model, promptB, inputStr),
  ]);

  return NextResponse.json({
    outputA: resA.status === 'fulfilled' ? resA.value : `Error: ${resA.reason}`,
    outputB: resB.status === 'fulfilled' ? resB.value : `Error: ${resB.reason}`,
    tokensA: Math.round((promptA.length + inputStr.length) / 4),
    tokensB: Math.round((promptB.length + inputStr.length) / 4),
    mock: resA.status !== 'fulfilled' && resB.status !== 'fulfilled',
  });
}

async function callProvider(
  provider: string | undefined,
  model: string,
  prompt: string,
  input: string
): Promise<string> {
  if (provider === 'openai') return callOpenAI(model, prompt, input);
  if (provider === 'anthropic') return callAnthropic(model, prompt, input);
  if (provider === 'google') return callGoogle(model, prompt, input);
  throw new Error(`Unsupported provider: ${provider}`);
}

async function callOpenAI(model: string, systemPrompt: string, userInput: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userInput },
      ],
      temperature: 0.7,
    }),
  });

  if (!res.ok) throw new Error(`OpenAI API error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

async function callAnthropic(model: string, systemPrompt: string, userInput: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      system: systemPrompt,
      messages: [{ role: 'user', content: userInput }],
      max_tokens: 4096,
    }),
  });

  if (!res.ok) throw new Error(`Anthropic API error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.content?.[0]?.text ?? '';
}

async function callGoogle(model: string, systemPrompt: string, userInput: string) {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_AI_API_KEY not set');

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: userInput }] }],
    }),
  });

  if (!res.ok) throw new Error(`Google AI API error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}
