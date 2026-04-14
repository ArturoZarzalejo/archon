import { getRegistry } from '@/lib/registry';

export const runtime = 'nodejs';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const registry = await getRegistry();
  const agent = registry.get(id);

  if (!agent) {
    return new Response(JSON.stringify({ error: 'Agent not found' }), { status: 404 });
  }

  const { input } = await request.json();
  const provider = agent.provider;
  const model = agent.model;
  const prompt = agent.prompt;

  if (!model || !prompt) {
    return new Response(JSON.stringify({ error: 'No model or prompt' }), { status: 400 });
  }

  const userInput = typeof input === 'string' ? input : JSON.stringify(input);

  // Create a ReadableStream that sends SSE events
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        send('status', { phase: 'starting', model, provider });

        if (provider === 'openai') {
          await streamOpenAI(model, prompt, userInput, send);
        } else if (provider === 'anthropic') {
          await streamAnthropic(model, prompt, userInput, send);
        } else if (provider === 'google') {
          await streamGoogle(model, prompt, userInput, send);
        } else {
          // Mock fallback — simulate streaming with the example output
          send('status', { phase: 'running', note: 'Mock mode — no API key' });
          const mockOutput = agent.output?.example
            ? JSON.stringify(agent.output.example, null, 2)
            : '{"result": "mock response"}';
          // Simulate token-by-token
          const words = mockOutput.split(/(\s+)/);
          for (const word of words) {
            send('token', { content: word });
            await sleep(30);
          }
          send('done', { mock: true });
          controller.close();
          return;
        }

        send('done', { mock: false });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        send('error', { message });

        // Fallback to mock
        const mockOutput = agent.output?.example
          ? JSON.stringify(agent.output.example, null, 2)
          : '{}';
        const words = mockOutput.split(/(\s+)/);
        for (const word of words) {
          send('token', { content: word });
          await sleep(20);
        }
        send('done', { mock: true, fallback: true });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

// ── OpenAI Streaming ──────────────────────────────────────────────────

async function streamOpenAI(
  model: string, systemPrompt: string, userInput: string,
  send: (event: string, data: unknown) => void,
) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');

  send('status', { phase: 'running', provider: 'openai' });

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userInput },
      ],
      temperature: 0.7,
    }),
  });

  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop()!;

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6);
      if (payload === '[DONE]') return;

      try {
        const chunk = JSON.parse(payload);
        const delta = chunk.choices?.[0]?.delta;

        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            send('tool_call', {
              name: tc.function?.name,
              arguments: tc.function?.arguments,
              index: tc.index,
            });
          }
        }

        if (delta?.content) {
          send('token', { content: delta.content });
        }
      } catch { /* skip malformed chunks */ }
    }
  }
}

// ── Anthropic Streaming ───────────────────────────────────────────────

async function streamAnthropic(
  model: string, systemPrompt: string, userInput: string,
  send: (event: string, data: unknown) => void,
) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');

  send('status', { phase: 'running', provider: 'anthropic' });

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      stream: true,
      system: systemPrompt,
      messages: [{ role: 'user', content: userInput }],
      max_tokens: 4096,
    }),
  });

  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop()!;

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        const event = JSON.parse(line.slice(6));

        if (event.type === 'content_block_start' && event.content_block?.type === 'tool_use') {
          send('tool_call', { name: event.content_block.name, phase: 'start' });
        }

        if (event.type === 'content_block_delta') {
          if (event.delta?.type === 'text_delta') {
            send('token', { content: event.delta.text });
          }
          if (event.delta?.type === 'input_json_delta') {
            send('tool_call', { arguments: event.delta.partial_json, phase: 'streaming' });
          }
        }
      } catch { /* skip */ }
    }
  }
}

// ── Google Streaming ──────────────────────────────────────────────────

async function streamGoogle(
  model: string, systemPrompt: string, userInput: string,
  send: (event: string, data: unknown) => void,
) {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_AI_API_KEY not set');

  send('status', { phase: 'running', provider: 'google' });

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userInput }] }],
      }),
    },
  );

  if (!res.ok) throw new Error(`Google ${res.status}: ${await res.text()}`);

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop()!;

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        const chunk = JSON.parse(line.slice(6));
        const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) send('token', { content: text });
      } catch { /* skip */ }
    }
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
