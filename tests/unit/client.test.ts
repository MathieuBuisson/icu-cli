import createClient from 'openapi-fetch';
import { describe, expect, it, vi } from 'vitest';
import * as auth from '../../src/auth.js';
import type { paths } from '../../src/generated/api.js';

vi.mock('../../src/auth.js', () => ({
  getAuthHeaders: vi.fn(() => ({ Authorization: 'Bearer test-token' })),
}));

describe('client', () => {
  it('creates a client with the correct base URL', async () => {
    const client = createClient<paths>({
      baseUrl: 'https://intervals.icu',
      headers: { Authorization: 'Bearer test-token' },
    });
    expect(client).toBeDefined();
  });

  it('passes auth headers to the client', async () => {
    vi.mocked(auth.getAuthHeaders).mockReturnValue({
      Authorization: 'Bearer custom-token',
    });
    const headers = auth.getAuthHeaders();
    expect(headers).toEqual({ Authorization: 'Bearer custom-token' });
  });
});
