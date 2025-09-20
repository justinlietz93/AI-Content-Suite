import { afterEach, describe, expect, it } from 'vitest';
import { deepClone } from '../utils/deepClone';

const globalWithClone = globalThis as typeof globalThis & { structuredClone?: typeof globalThis.structuredClone };
const originalStructuredClone = globalWithClone.structuredClone;

afterEach(() => {
  globalWithClone.structuredClone = originalStructuredClone;
});

describe('deepClone', () => {
  it('uses the native structuredClone when available', () => {
    if (typeof originalStructuredClone !== 'function') {
      // Environment without structuredClone will still exercise the fallback in other tests
      globalWithClone.structuredClone = (value: unknown) => JSON.parse(JSON.stringify(value));
    }

    const source = { greeting: 'hello', nested: { value: 42 } };
    const result = deepClone(source);

    expect(result).toEqual(source);
    expect(result).not.toBe(source);
    expect(result.nested).not.toBe(source.nested);
  });

  it('falls back to JSON cloning when structuredClone is unavailable', () => {
    globalWithClone.structuredClone = undefined;

    const source = { items: [1, 2, 3], note: 'fallback path' };
    const result = deepClone(source);

    expect(result).toEqual(source);
    expect(result).not.toBe(source);
  });
});
