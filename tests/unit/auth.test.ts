import { afterEach, describe, expect, it, vi } from 'vitest';

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
});

import { getAuthHeaders } from '../../src/auth.js';

describe('auth', () => {
  describe('getAuthHeaders', () => {
    it('returns Bearer header when ICU_ACCESS_TOKEN is set', () => {
      process.env.ICU_ACCESS_TOKEN = 'my-access-token';
      process.env.ICU_API_KEY = '';
      const headers = getAuthHeaders();
      expect(headers).toEqual({ Authorization: 'Bearer my-access-token' });
    });

    it('returns Basic auth header when only ICU_API_KEY is set', () => {
      process.env.ICU_ACCESS_TOKEN = '';
      process.env.ICU_API_KEY = 'my-api-key';
      const headers = getAuthHeaders();
      const encoded = Buffer.from('API_KEY:my-api-key').toString('base64');
      expect(headers).toEqual({ Authorization: `Basic ${encoded}` });
    });

    it('Bearer takes precedence over API key when both are set', () => {
      process.env.ICU_ACCESS_TOKEN = 'access-token';
      process.env.ICU_API_KEY = 'api-key';
      const headers = getAuthHeaders();
      expect(headers).toEqual({ Authorization: 'Bearer access-token' });
    });

    it('throws descriptive error when no credentials are set', () => {
      process.env.ICU_ACCESS_TOKEN = '';
      process.env.ICU_API_KEY = '';
      expect(() => getAuthHeaders()).toThrow(
        'No credentials found. Set the ICU_API_KEY environment variable or the ICU_ACCESS_TOKEN environment variable.',
      );
    });

    it('Basic auth uses correct encoding format', () => {
      process.env.ICU_ACCESS_TOKEN = '';
      process.env.ICU_API_KEY = 'test-key';
      const headers = getAuthHeaders();
      const expectedEncoded = Buffer.from('API_KEY:test-key').toString('base64');
      expect(headers.Authorization).toBe(`Basic ${expectedEncoded}`);
    });
  });
});
