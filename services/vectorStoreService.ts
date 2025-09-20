import type { EmbeddingSettings, VectorStoreMatch, VectorStoreSettings } from '../types';
import { getEmbeddingProviderDefaultEndpoint } from './providerRegistry';

const DEFAULT_QDRANT_TOP_K = 5;
const MAX_QDRANT_TOP_K = 20;

const getEmbeddingEndpoint = (embedding: EmbeddingSettings): string | null => {
  const customEndpoint = embedding.baseUrl?.trim();
  if (customEndpoint) {
    return customEndpoint;
  }
  const defaultEndpoint = getEmbeddingProviderDefaultEndpoint(embedding.provider)?.trim();
  if (defaultEndpoint) {
    return defaultEndpoint;
  }
  return null;
};

const buildEmbeddingHeaders = (embedding: EmbeddingSettings): Record<string, string> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const apiKey = embedding.apiKey?.trim();
  if (embedding.provider !== 'ollama' && apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }
  if (embedding.provider === 'openrouter') {
    const referer = typeof window !== 'undefined' ? window.location.origin : 'https://local.app';
    headers['HTTP-Referer'] = referer;
    headers['X-Title'] = 'AI Content Suite';
  }
  return headers;
};

const requestEmbedding = async (text: string, embedding: EmbeddingSettings, signal?: AbortSignal): Promise<number[]> => {
  const endpoint = getEmbeddingEndpoint(embedding);
  if (!endpoint) {
    throw new Error('No embedding endpoint configured for the selected provider.');
  }

  const headers = buildEmbeddingHeaders(embedding);
  const body: Record<string, unknown> = { model: embedding.model.trim() };

  if (!body.model) {
    throw new Error('An embedding model is required to query the vector store.');
  }

  if (embedding.provider === 'ollama') {
    body.prompt = text;
  } else {
    body.input = text;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Embedding request failed (${response.status}): ${errorText || response.statusText}`);
  }

  const data = await response.json();
  if (embedding.provider === 'ollama') {
    const vector = data?.embedding;
    if (!Array.isArray(vector)) {
      throw new Error('Ollama returned an unexpected embedding payload.');
    }
    return vector.map((value: unknown) => Number(value));
  }

  const vector = data?.data?.[0]?.embedding;
  if (!Array.isArray(vector)) {
    throw new Error('Embedding provider did not return a valid vector.');
  }
  return vector.map((value: unknown) => Number(value));
};

const buildQdrantHeaders = (apiKey?: string): Record<string, string> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey && apiKey.trim() !== '') {
    headers['api-key'] = apiKey.trim();
  }
  return headers;
};

const extractPayloadText = (payload: unknown): { text: string | null; metadata?: Record<string, unknown> } => {
  if (!payload || typeof payload !== 'object') {
    if (typeof payload === 'string') {
      return { text: payload };
    }
    return { text: null };
  }

  const payloadRecord = payload as Record<string, unknown>;
  const candidateKeys = ['text', 'content', 'chunk', 'document', 'body', 'summary'];

  for (const key of candidateKeys) {
    const value = payloadRecord[key];
    if (typeof value === 'string' && value.trim() !== '') {
      const metadata = { ...payloadRecord };
      delete metadata[key];
      return { text: value, metadata: Object.keys(metadata).length > 0 ? metadata : undefined };
    }
    if (Array.isArray(value) && value.every(item => typeof item === 'string')) {
      const joined = (value as string[]).join('\n');
      const metadata = { ...payloadRecord };
      delete metadata[key];
      return { text: joined, metadata: Object.keys(metadata).length > 0 ? metadata : undefined };
    }
  }

  return { text: JSON.stringify(payloadRecord) };
};

const queryQdrant = async (
  settings: VectorStoreSettings,
  embeddingVector: number[],
  signal?: AbortSignal,
): Promise<VectorStoreMatch[]> => {
  const baseUrl = (settings.url || '').trim().replace(/\/$/, '');
  const collection = (settings.collection || '').trim();

  if (!baseUrl || !collection) {
    throw new Error('Qdrant URL and collection are required to fetch context.');
  }

  const searchUrl = `${baseUrl}/collections/${encodeURIComponent(collection)}/points/search`;
  const limit = Math.min(Math.max(Math.round(settings.topK || DEFAULT_QDRANT_TOP_K), 1), MAX_QDRANT_TOP_K);

  const response = await fetch(searchUrl, {
    method: 'POST',
    headers: buildQdrantHeaders(settings.apiKey),
    body: JSON.stringify({
      vector: embeddingVector,
      limit,
      with_payload: true,
      with_vectors: false,
    }),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Qdrant search failed (${response.status}): ${errorText || response.statusText}`);
  }

  const data = await response.json();
  const results = Array.isArray(data?.result) ? data.result : [];

  return results
    .map((item: any) => {
      const score = typeof item?.score === 'number' ? item.score : 0;
      const payload = extractPayloadText(item?.payload);
      if (!payload.text) {
        return null;
      }
      return {
        text: payload.text,
        score,
        metadata: payload.metadata,
      } as VectorStoreMatch;
    })
    .filter((match): match is VectorStoreMatch => Boolean(match));
};

export const fetchVectorStoreContext = async (
  text: string,
  settings: VectorStoreSettings,
  signal?: AbortSignal,
): Promise<VectorStoreMatch[]> => {
  if (!settings.enabled) {
    return [];
  }

  const trimmedText = text.trim();
  if (!trimmedText) {
    return [];
  }

  try {
    const vector = await requestEmbedding(trimmedText, settings.embedding, signal);
    return await queryQdrant(settings, vector, signal);
  } catch (error) {
    console.warn('Vector store lookup failed:', error);
    return [];
  }
};
