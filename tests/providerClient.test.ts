import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { callProvider, setActiveProviderConfig } from '../services/providerClient';
import type { ProviderTextResponse } from '../services/providerClient';
import { GENERATION_DEFAULTS } from '../config/generationConfig';

const createFetchResponse = (payload: unknown) => ({
  ok: true,
  json: () => Promise.resolve(payload),
});

describe('providerClient', () => {
  beforeEach(() => {
    setActiveProviderConfig({ providerId: 'openai', model: 'gpt-4o-mini', apiKey: 'test-key' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('passes reasoning parameters for reasoning-capable models', async () => {
    setActiveProviderConfig({ providerId: 'openai', model: 'gpt-5.1-mini', apiKey: 'test-key' });
    const fetchMock = vi.fn().mockResolvedValue(
      createFetchResponse({ choices: [{ message: { content: 'ok' } }] }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await callProvider({
      messages: [{ role: 'user', content: 'Hello' }],
      maxOutputTokens: 2048,
      temperature: 0.5,
      reasoning: { enabled: true, effort: 'high', budgetTokens: 900 },
      thinking: { enabled: true, budgetTokens: 400 },
    });

    const [, requestInit] = fetchMock.mock.calls[0];
    const payload = JSON.parse((requestInit as RequestInit).body as string);
    expect(payload.max_output_tokens).toBe(2048);
    expect(payload.temperature).toBe(0.5);
    expect(payload.reasoning).toEqual(expect.objectContaining({ effort: 'high', budget_tokens: 900 }));
    expect(payload.thinking).toEqual(expect.objectContaining({ enabled: true, budget_tokens: 400 }));
  });

  it('applies default reasoning payload when overrides are omitted', async () => {
    setActiveProviderConfig({ providerId: 'openai', model: 'gpt-5.1-mini', apiKey: 'test-key' });
    const fetchMock = vi.fn().mockResolvedValue(
      createFetchResponse({ choices: [{ message: { content: 'ack' } }] }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await callProvider({
      messages: [{ role: 'user', content: 'Ping' }],
    });

    const [, requestInit] = fetchMock.mock.calls[0];
    const payload = JSON.parse((requestInit as RequestInit).body as string);
    expect(payload.max_output_tokens).toBe(GENERATION_DEFAULTS.maxOutputTokens);
    expect(payload.temperature).toBe(GENERATION_DEFAULTS.temperature);
    expect(payload.reasoning).toEqual({ effort: GENERATION_DEFAULTS.reasoningEffort });
    expect(payload.thinking).toEqual({ enabled: false });
  });

  it('defaults to standard parameters for non-reasoning models', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createFetchResponse({ choices: [{ message: { content: 'ok' } }] }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await callProvider({
      messages: [{ role: 'user', content: 'Hello there' }],
    });

    const [, requestInit] = fetchMock.mock.calls[0];
    const payload = JSON.parse((requestInit as RequestInit).body as string);
    expect(payload.max_tokens).toBe(GENERATION_DEFAULTS.maxOutputTokens);
    expect(payload.temperature).toBe(GENERATION_DEFAULTS.temperature);
    expect(payload).not.toHaveProperty('reasoning');
    expect(payload).not.toHaveProperty('thinking');
  });

  it('returns json text when the provider responds with a json_object string payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createFetchResponse({
        choices: [
          {
            message: {
              content: [
                {
                  type: 'json_object',
                  json: '{"suggestions":["alpha","beta"]}',
                },
              ],
            },
          },
        ],
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await callProvider({
      messages: [{ role: 'user', content: 'Provide options' }],
      responseFormat: 'json',
    });

    expect(result.text).toBe('{"suggestions":["alpha","beta"]}');
    expect(result.thinking).toEqual([]);
  });

  it('stringifies structured json payloads when the provider returns an object value', async () => {
    const jsonPayload = { steps: ['draft', 'review', 'publish'] };
    const fetchMock = vi.fn().mockResolvedValue(
      createFetchResponse({
        choices: [
          {
            message: {
              content: [
                {
                  type: 'json_object',
                  json: jsonPayload,
                },
              ],
            },
          },
        ],
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await callProvider({
      messages: [{ role: 'user', content: 'Outline the workflow' }],
      responseFormat: 'json',
    });

    expect(result.text).toBe(JSON.stringify(jsonPayload));
    expect(result.thinking).toEqual([]);
  });

  it('streams partial updates when a streaming callback is provided', async () => {
    const encoder = new TextEncoder();
    const chunks = [
      'data: {"choices":[{"delta":{"content":[{"type":"text","text":"Hel"}]}}]}' + '\n\n',
      'data: {"choices":[{"delta":{"content":[{"type":"text","text":"lo"}]}}]}' + '\n\n',
      'data: {"choices":[{"delta":{"thinking":[{"type":"reasoning","text":"First"}]}}]}' + '\n\n',
      'data: [DONE]' + '\n\n',
    ];

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
        controller.close();
      },
    });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      body: stream,
      headers: new Headers(),
      text: () => Promise.resolve(''),
      json: vi.fn(),
    });
    vi.stubGlobal('fetch', fetchMock);

    const updates: ProviderTextResponse[] = [];
    const result = await callProvider({
      messages: [{ role: 'user', content: 'Stream example' }],
      onUpdate: (update) => {
        updates.push(update);
      },
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const requestInit = fetchMock.mock.calls[0][1] as RequestInit;
    const payload = JSON.parse((requestInit.body as string) ?? '{}');
    expect(payload.stream).toBe(true);
    expect(updates.length).toBeGreaterThan(0);
    expect(updates[updates.length - 1].text).toBe('Hello');
    expect(result.text).toBe('Hello');
    expect(result.thinking).toEqual([
      { label: 'Reasoning', text: 'First', type: 'reasoning' },
    ]);
  });
});
