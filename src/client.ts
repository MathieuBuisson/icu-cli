import createClient from 'openapi-fetch';
import { getAuthHeaders } from './auth.js';
import type { paths } from './generated/api.js';

const client = createClient<paths>({
  baseUrl: 'https://intervals.icu',
  headers: getAuthHeaders(),
});

export default client;
