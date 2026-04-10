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

  const { input } = await request.json();
  const provider = agent.provider;
  const model = agent.model;
  const prompt = agent.prompt;

  if (!model || !prompt) {
    return NextResponse.json({ error: 'Agent has no model or prompt configured' }, { status: 400 });
  }

  try {
    let result: unknown;

    // Route to the right provider
    if (provider === 'openai') {
      result = await callOpenAI(model, prompt, JSON.stringify(input));
    } else if (provider === 'anthropic') {
      result = await callAnthropic(model, prompt, JSON.stringify(input));
    } else if (provider === 'google') {
      result = await callGoogle(model, prompt, JSON.stringify(input));
    } else {
      return NextResponse.json({
        error: `Unsupported provider: ${provider}. Set OPENAI_API_KEY, ANTHROPIC_API_KEY, or GOOGLE_AI_API_KEY.`,
        mock: true,
        output: agent.output?.example ?? null,
      });
    }

    return NextResponse.json({ output: result, mock: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    // Fall back to mock
    return NextResponse.json({
      error: message,
      mock: true,
      output: agent.output?.example ?? null,
    });
  }
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
  return data.choices?.[0]?.message?.content;
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
  return data.content?.[0]?.text;
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
  return data.candidates?.[0]?.content?.parts?.[0]?.text;
}
