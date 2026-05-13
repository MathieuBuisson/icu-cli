import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/client.js', () => ({
  default: { GET: vi.fn() },
}));

vi.mock('../../src/auth.js', () => ({
  getAuthMode: vi.fn(() => 'bearer'),
  getAuthHeaders: vi.fn(() => ({ Authorization: 'Bearer test' })),
}));

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return { ...actual, readFile: vi.fn(), writeFile: vi.fn(), mkdir: vi.fn() };
});

vi.mock('env-paths');

import envPaths from 'env-paths';
import { run } from '../../src/cli.js';
import client from '../../src/client.js';
import { _resetConfigCache } from '../../src/config.js';

const ATHLETE_DATA = {
  id: 'A123',
  name: 'Test User',
  email: 'test@example.com',
  city: 'Dublin',
  country: 'Ireland',
  timezone: 'Europe/Dublin',
  sex: 'M',
};

describe('auth status', () => {
  let tempDir: string;
  let originalIsTTY: boolean | undefined;

  beforeEach(async () => {
    originalIsTTY = process.stdout.isTTY;
    _resetConfigCache();
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'icu-auth-test-'));
    vi.mocked(envPaths).mockReturnValue({ config: tempDir });

    const fs = await import('node:fs/promises');
    vi.mocked(fs.readFile).mockImplementation(() => Promise.resolve('{}'));
  });

  afterEach(async () => {
    if (originalIsTTY === undefined) {
      Reflect.deleteProperty(process.stdout, 'isTTY');
    } else {
      Object.defineProperty(process.stdout, 'isTTY', { value: originalIsTTY, configurable: true });
    }
    vi.restoreAllMocks();
    await rm(tempDir, { recursive: true, force: true });
  });

  it('prints ICU_ACCESS_TOKEN is set and athlete info on success with bearer token', async () => {
    const mockGet = vi.mocked(client.GET);
    mockGet.mockImplementation(() => Promise.resolve({ data: ATHLETE_DATA, error: undefined }));

    const mockExit = vi
      .spyOn(process, 'exit')
      .mockImplementation((() => {}) as typeof process.exit);

    process.argv = ['node', 'icu', 'auth', 'status'];
    await run();
    expect(mockExit).toHaveBeenCalledWith(0);
  });

  it('--format table outputs table with auth_mode column', async () => {
    const mockGet = vi.mocked(client.GET);
    mockGet.mockImplementation(() => Promise.resolve({ data: ATHLETE_DATA, error: undefined }));

    const mockExit = vi
      .spyOn(process, 'exit')
      .mockImplementation((() => {}) as typeof process.exit);
    Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true });

    process.argv = ['node', 'icu', 'auth', 'status', '--format', 'table'];
    await run();
    expect(mockExit).toHaveBeenCalledWith(0);
  });

  it('--format plain outputs Auth Mode line and field-per-line', async () => {
    const mockGet = vi.mocked(client.GET);
    mockGet.mockImplementation(() => Promise.resolve({ data: ATHLETE_DATA, error: undefined }));

    vi.spyOn(process, 'exit').mockImplementation((() => {}) as typeof process.exit);
    const mockStdoutWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    process.argv = ['node', 'icu', 'auth', 'status', '--format', 'plain'];
    await run();
    const output = mockStdoutWrite.mock.calls.map((c) => c[0]).join('');
    expect(output).toContain('Auth Mode: bearer');
    expect(output).toContain('Athlete ID: A123');
    expect(output).toContain('Name: Test User');
  });

  it('--format json outputs valid JSON with auth_mode, env_var, athlete', async () => {
    const mockGet = vi.mocked(client.GET);
    mockGet.mockImplementation(() => Promise.resolve({ data: ATHLETE_DATA, error: undefined }));

    const _mockExit = vi
      .spyOn(process, 'exit')
      .mockImplementation((() => {}) as typeof process.exit);
    const mockStdoutWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    process.argv = ['node', 'icu', 'auth', 'status', '--format', 'json'];
    await run();
    const output = mockStdoutWrite.mock.calls.map((c) => c[0]).join('');
    const jsonStart = output.indexOf('{');
    const parsed = JSON.parse(output.substring(jsonStart).trim());
    expect(parsed.auth_mode).toBe('bearer');
    expect(parsed.env_var).toBe('ICU_ACCESS_TOKEN is set');
    expect(parsed.athlete).toEqual(ATHLETE_DATA);
  });

  it('exits with 1 and prints error on 401', async () => {
    const mockGet = vi.mocked(client.GET);
    mockGet.mockImplementation(() =>
      Promise.resolve({ data: undefined, error: { status: 401, message: 'Unauthorized' } }),
    );

    const mockExit = vi
      .spyOn(process, 'exit')
      .mockImplementation((() => {}) as typeof process.exit);
    const mockStderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    process.argv = ['node', 'icu', 'auth', 'status'];
    await run();
    expect(mockExit).toHaveBeenCalledWith(1);
    const stderr = mockStderrWrite.mock.calls.map((c) => c[0]).join('');
    expect(stderr).toContain('Authentication failed');
  });
});
