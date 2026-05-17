import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, type SpyInstance, vi } from 'vitest';

vi.mock('../../src/client.js', () => ({
  default: { GET: vi.fn(), PUT: vi.fn() },
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

const ATHLETE_PROFILE_DATA = {
  athlete: {
    id: 'A123',
    name: 'Test User',
    email: 'test@example.com',
    city: 'Dublin',
    country: 'Ireland',
    timezone: 'Europe/Dublin',
    sex: 'M',
  },
};

const TRAINING_PLAN_DATA = {
  athlete_id: 'A123',
  training_plan_id: 1,
  training_plan_start_date: '2024-01-01',
  timezone: 'Europe/Dublin',
  training_plan_last_applied: '2024-01-15',
  training_plan_alias: 'Base Training',
};

const SUMMARY_DATA = [
  {
    count: 5,
    time: 3600,
    moving_time: 3000,
    calories: 2500,
    training_load: 150,
    srpe: 120,
    distance: 50000,
  },
  {
    count: 3,
    time: 7200,
    moving_time: 6000,
    calories: 4000,
    training_load: 200,
    srpe: 180,
    distance: 80000,
  },
];

describe('athletes', () => {
  let tempDir: string;
  let originalIsTTY: boolean | undefined;
  let originalArgv: string[];
  let mockExit: SpyInstance<typeof process.exit>;
  let mockStdoutWrite: SpyInstance<typeof process.stdout.write>;
  let mockStderrWrite: SpyInstance<typeof process.stderr.write>;

  const getStderr = () => mockStderrWrite.mock.calls.map((c) => String(c[0])).join('');
  const _getStdout = () => mockStdoutWrite.mock.calls.map((c) => String(c[0])).join('');

  beforeEach(async () => {
    originalArgv = [...process.argv];
    originalIsTTY = process.stdout.isTTY;
    _resetConfigCache();
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'icu-athletes-test-'));
    vi.mocked(envPaths).mockReturnValue({ config: tempDir });

    const fs = await import('node:fs/promises');
    vi.mocked(fs.readFile).mockReset();
    vi.mocked(fs.readFile).mockResolvedValue('{}');
    vi.mocked(fs.writeFile).mockReset();
    vi.mocked(fs.mkdir).mockReset();

    vi.mocked(client.GET).mockReset();
    vi.mocked(client.PUT).mockReset();

    mockExit = vi.spyOn(process, 'exit').mockImplementation((() => {}) as typeof process.exit);
    mockStdoutWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    mockStderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(async () => {
    process.argv = originalArgv;
    if (originalIsTTY === undefined) {
      Reflect.deleteProperty(process.stdout, 'isTTY');
    } else {
      Object.defineProperty(process.stdout, 'isTTY', { value: originalIsTTY, configurable: true });
    }
    vi.clearAllMocks();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('athletes get', () => {
    it('exits with 0 on success', async () => {
      vi.mocked(client.GET).mockResolvedValueOnce({ data: ATHLETE_DATA, error: undefined });

      process.argv = ['node', 'icu', 'athletes', 'get', 'A123'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(0);
    });

    it('outputs table with headers', async () => {
      vi.mocked(client.GET).mockResolvedValueOnce({ data: ATHLETE_DATA, error: undefined });
      Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true });

      process.argv = ['node', 'icu', 'athletes', 'get', 'A123'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(0);
      const stdout = mockStdoutWrite.mock.calls.map((c) => c[0]).join('');
      expect(stdout).toContain('ID');
      expect(stdout).toContain('Name');
      expect(stdout).toContain('A123');
    });

    it('outputs plain field-per-line', async () => {
      vi.mocked(client.GET).mockResolvedValueOnce({ data: ATHLETE_DATA, error: undefined });

      process.argv = ['node', 'icu', 'athletes', 'get', 'A123', '--format', 'plain'];
      await run();
      const stdout = mockStdoutWrite.mock.calls.map((c) => c[0]).join('');
      expect(stdout).toContain('Athlete ID: A123');
      expect(stdout).toContain('Name: Test User');
      expect(stdout).toContain('Email: test@example.com');
    });

    it('outputs valid JSON', async () => {
      vi.mocked(client.GET).mockResolvedValueOnce({ data: ATHLETE_DATA, error: undefined });

      process.argv = ['node', 'icu', 'athletes', 'get', 'A123', '--format', 'json'];
      await run();
      const stdout = mockStdoutWrite.mock.calls.map((c) => c[0]).join('');
      expect(() => JSON.parse(stdout.trim())).not.toThrow();
      expect(JSON.parse(stdout.trim()).id).toBe('A123');
    });

    it('exits with 1 on 401 error', async () => {
      vi.mocked(client.GET).mockResolvedValueOnce({
        data: undefined,
        error: { status: 401, message: 'Unauthorized' },
        response: { status: 401 } as Response,
      });

      process.argv = ['node', 'icu', 'athletes', 'get', 'A123'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(getStderr()).toContain('Authentication failed');
    });

    it('exits with 1 on 403 error', async () => {
      vi.mocked(client.GET).mockResolvedValueOnce({
        data: undefined,
        error: { status: 403, message: 'Forbidden' },
        response: { status: 403 } as Response,
      });

      process.argv = ['node', 'icu', 'athletes', 'get', 'A123'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(getStderr()).toContain('Access denied');
    });

    it('exits with 1 on 404 error', async () => {
      vi.mocked(client.GET).mockResolvedValueOnce({
        data: undefined,
        error: { status: 404, message: 'Not found' },
        response: { status: 404 } as Response,
      });

      process.argv = ['node', 'icu', 'athletes', 'get', 'A123'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(getStderr()).toContain('Resource not found');
    });

    it('exits with 1 on network error', async () => {
      vi.mocked(client.GET).mockRejectedValueOnce(new Error('ECONNREFUSED'));

      process.argv = ['node', 'icu', 'athletes', 'get', 'A123'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(getStderr()).toContain('ECONNREFUSED');
    });

    it('exits with 1 when no athlete ID available', async () => {
      vi.stubEnv('ICU_ATHLETE_ID', '');
      vi.mocked(client.GET).mockResolvedValueOnce({
        data: null,
        error: { status: 404, message: 'Not found' },
      });

      process.argv = ['node', 'icu', 'athletes', 'get'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(getStderr()).toContain('athlete ID is required');
    });

    it('positional argument overrides config', async () => {
      vi.stubEnv('ICU_ATHLETE_ID', '');
      const fs = await import('node:fs/promises');
      vi.mocked(fs.readFile).mockImplementation(() =>
        Promise.resolve(JSON.stringify({ athleteId: 'CONFIG_A123' })),
      );

      vi.mocked(client.GET).mockResolvedValueOnce({ data: ATHLETE_DATA, error: undefined });

      process.argv = ['node', 'icu', 'athletes', 'get', 'POS_A123'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(0);

      const calls = vi.mocked(client.GET).mock.calls;
      expect(calls.length).toBe(1);
      const callArgs = calls[0];
      expect(callArgs[1]?.params?.path?.id).toBe('POS_A123');
    });
  });

  describe('athletes update', () => {
    it('exits with 0 and updates athlete', async () => {
      const updatedData = { ...ATHLETE_DATA, name: 'Updated Name' };
      vi.mocked(client.PUT).mockResolvedValueOnce({ data: updatedData, error: undefined });

      const fs = await import('node:fs/promises');
      vi.mocked(fs.readFile).mockImplementation(() => Promise.resolve('{"name": "Updated Name"}'));

      process.argv = ['node', 'icu', 'athletes', 'update', 'A123', '--file', 'data.json'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(0);
      expect(vi.mocked(client.PUT).mock.calls[0][1]?.body).toEqual({ name: 'Updated Name' });
    });

    it('exits with 1 on file read error', async () => {
      const fs = await import('node:fs/promises');
      vi.mocked(fs.readFile).mockRejectedValueOnce(new Error('ENOENT: no such file or directory'));

      process.argv = ['node', 'icu', 'athletes', 'update', 'A123', '--file', 'missing.json'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(getStderr()).toContain('ENOENT');
    });
    it('exits with 1 when --file is missing', async () => {
      process.argv = ['node', 'icu', 'athletes', 'update', 'A123'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(getStderr()).toContain("required option '--file <path>' not specified");
    });

    it('exits with 1 on invalid JSON input', async () => {
      const fs = await import('node:fs/promises');
      vi.mocked(fs.readFile).mockImplementation(() => Promise.resolve('not valid json'));

      process.argv = ['node', 'icu', 'athletes', 'update', 'A123', '--file', 'invalid.json'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(getStderr()).toContain('Invalid JSON');
    });

    it('exits with 1 on 401 error', async () => {
      const fs = await import('node:fs/promises');
      vi.mocked(fs.readFile).mockImplementation(() => Promise.resolve('{"name": "Test"}'));

      vi.mocked(client.PUT).mockResolvedValueOnce({
        data: undefined,
        error: { status: 401, message: 'Unauthorized' },
        response: { status: 401 } as Response,
      });

      process.argv = ['node', 'icu', 'athletes', 'update', 'A123', '--file', 'data.json'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(getStderr()).toContain('Authentication failed');
    });
  });

  describe('athletes profile', () => {
    it('outputs table with athlete data', async () => {
      vi.mocked(client.GET).mockResolvedValueOnce({ data: ATHLETE_PROFILE_DATA, error: undefined });
      Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true });

      process.argv = ['node', 'icu', 'athletes', 'profile', 'A123'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(0);
      const stdout = mockStdoutWrite.mock.calls.map((c) => c[0]).join('');
      expect(stdout).toContain('ID');
      expect(stdout).toContain('Name');
      expect(stdout).toContain('A123');
    });

    it('outputs plain field-per-line', async () => {
      vi.mocked(client.GET).mockResolvedValueOnce({ data: ATHLETE_PROFILE_DATA, error: undefined });

      process.argv = ['node', 'icu', 'athletes', 'profile', 'A123', '--format', 'plain'];
      await run();
      const stdout = mockStdoutWrite.mock.calls.map((c) => c[0]).join('');
      expect(stdout).toContain('Athlete ID: A123');
      expect(stdout).toContain('Name: Test User');
    });

    it('outputs valid JSON', async () => {
      vi.mocked(client.GET).mockResolvedValueOnce({ data: ATHLETE_PROFILE_DATA, error: undefined });

      process.argv = ['node', 'icu', 'athletes', 'profile', 'A123', '--format', 'json'];
      await run();
      const stdout = mockStdoutWrite.mock.calls.map((c) => c[0]).join('');
      expect(() => JSON.parse(stdout.trim())).not.toThrow();
    });

    it('exits with 1 on 404 error', async () => {
      vi.mocked(client.GET).mockResolvedValueOnce({
        data: undefined,
        error: { status: 404, message: 'Not found' },
        response: { status: 404 } as Response,
      });

      process.argv = ['node', 'icu', 'athletes', 'profile', 'A123'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(getStderr()).toContain('Resource not found');
    });

    it('exits with 1 when no athlete ID available', async () => {
      vi.stubEnv('ICU_ATHLETE_ID', '');
      vi.mocked(client.GET).mockResolvedValueOnce({
        data: null,
        error: { status: 404, message: 'Not found' },
      });

      process.argv = ['node', 'icu', 'athletes', 'profile'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(getStderr()).toContain('athlete ID is required');
    });
  });

  describe('athletes training-plan get', () => {
    it('outputs table with training plan columns', async () => {
      vi.mocked(client.GET).mockResolvedValueOnce({ data: TRAINING_PLAN_DATA, error: undefined });
      Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true });

      process.argv = ['node', 'icu', 'athletes', 'training-plan', 'get', 'A123'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(0);
      const stdout = mockStdoutWrite.mock.calls.map((c) => c[0]).join('');
      expect(stdout).toContain('Athlete ID');
      expect(stdout).toContain('Training Plan ID');
      expect(stdout).toContain('A123');
    });

    it('outputs plain field-per-line', async () => {
      vi.mocked(client.GET).mockResolvedValueOnce({ data: TRAINING_PLAN_DATA, error: undefined });

      process.argv = [
        'node',
        'icu',
        'athletes',
        'training-plan',
        'get',
        'A123',
        '--format',
        'plain',
      ];
      await run();
      const stdout = mockStdoutWrite.mock.calls.map((c) => c[0]).join('');
      expect(stdout).toContain('Athlete ID: A123');
      expect(stdout).toContain('Training Plan ID: 1');
      expect(stdout).toContain('Start Date: 2024-01-01');
    });

    it('outputs valid JSON', async () => {
      vi.mocked(client.GET).mockResolvedValueOnce({ data: TRAINING_PLAN_DATA, error: undefined });

      process.argv = [
        'node',
        'icu',
        'athletes',
        'training-plan',
        'get',
        'A123',
        '--format',
        'json',
      ];
      await run();
      const stdout = mockStdoutWrite.mock.calls.map((c) => c[0]).join('');
      expect(() => JSON.parse(stdout.trim())).not.toThrow();
      expect(JSON.parse(stdout.trim()).athlete_id).toBe('A123');
    });

    it('exits with 1 on 404 error', async () => {
      vi.mocked(client.GET).mockResolvedValueOnce({
        data: undefined,
        error: { status: 404, message: 'Not found' },
        response: { status: 404 } as Response,
      });

      process.argv = ['node', 'icu', 'athletes', 'training-plan', 'get', 'A123'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(getStderr()).toContain('Resource not found');
    });

    it('exits with 1 when no athlete ID available', async () => {
      vi.stubEnv('ICU_ATHLETE_ID', '');
      vi.mocked(client.GET).mockResolvedValueOnce({
        data: null,
        error: { status: 404, message: 'Not found' },
      });

      process.argv = ['node', 'icu', 'athletes', 'training-plan', 'get'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(getStderr()).toContain('athlete ID is required');
    });
  });

  describe('athletes training-plan update', () => {
    it('exits with 0 and updates training plan', async () => {
      const updatedPlan = { ...TRAINING_PLAN_DATA, training_plan_alias: 'Updated Plan' };
      vi.mocked(client.PUT).mockResolvedValueOnce({ data: updatedPlan, error: undefined });

      const fs = await import('node:fs/promises');
      vi.mocked(fs.readFile).mockImplementation(() => Promise.resolve('{"training_plan_id": 2}'));

      process.argv = [
        'node',
        'icu',
        'athletes',
        'training-plan',
        'update',
        'A123',
        '--file',
        'plan.json',
      ];
      await run();
      expect(mockExit).toHaveBeenCalledWith(0);
      expect(vi.mocked(client.PUT).mock.calls[0][1]?.body).toEqual({ training_plan_id: 2 });
    });

    it('exits with 1 when --file is missing', async () => {
      process.argv = ['node', 'icu', 'athletes', 'training-plan', 'update', 'A123'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(getStderr()).toContain("required option '--file <path>' not specified");
    });

    it('exits with 1 on invalid JSON input', async () => {
      const fs = await import('node:fs/promises');
      vi.mocked(fs.readFile).mockImplementation(() => Promise.resolve('not valid json'));

      process.argv = [
        'node',
        'icu',
        'athletes',
        'training-plan',
        'update',
        'A123',
        '--file',
        'invalid.json',
      ];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(getStderr()).toContain('Invalid JSON');
    });

    it('exits with 1 on 403 error', async () => {
      const fs = await import('node:fs/promises');
      vi.mocked(fs.readFile).mockImplementation(() => Promise.resolve('{"training_plan_id": 1}'));

      vi.mocked(client.PUT).mockResolvedValueOnce({
        data: undefined,
        error: { status: 403, message: 'Forbidden' },
        response: { status: 403 } as Response,
      });

      process.argv = [
        'node',
        'icu',
        'athletes',
        'training-plan',
        'update',
        'A123',
        '--file',
        'plan.json',
      ];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(getStderr()).toContain('Access denied');
    });
  });

  describe('athletes summary', () => {
    it('outputs table with summary columns', async () => {
      vi.mocked(client.GET).mockResolvedValueOnce({ data: SUMMARY_DATA, error: undefined });
      Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true });

      process.argv = ['node', 'icu', 'athletes', 'summary', 'A123'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(0);
      const stdout = mockStdoutWrite.mock.calls.map((c) => c[0]).join('');
      expect(stdout).toContain('Count');
      expect(stdout).toContain('Time');
      expect(stdout).toContain('Training Load');
    });

    it('outputs plain field-per-line with separators', async () => {
      vi.mocked(client.GET).mockResolvedValueOnce({ data: SUMMARY_DATA, error: undefined });

      process.argv = ['node', 'icu', 'athletes', 'summary', 'A123', '--format', 'plain'];
      await run();
      const stdout = mockStdoutWrite.mock.calls.map((c) => c[0]).join('');
      expect(stdout).toContain('Count: 5');
      expect(stdout).toContain('---');
    });

    it('outputs valid JSON array', async () => {
      vi.mocked(client.GET).mockResolvedValueOnce({ data: SUMMARY_DATA, error: undefined });

      process.argv = ['node', 'icu', 'athletes', 'summary', 'A123', '--format', 'json'];
      await run();
      const stdout = mockStdoutWrite.mock.calls.map((c) => c[0]).join('');
      expect(() => JSON.parse(stdout.trim())).not.toThrow();
      const parsed = JSON.parse(stdout.trim());
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0].count).toBe(5);
    });

    it('passes --start and --end as query params', async () => {
      vi.mocked(client.GET).mockResolvedValueOnce({ data: SUMMARY_DATA, error: undefined });

      process.argv = [
        'node',
        'icu',
        'athletes',
        'summary',
        'A123',
        '--start',
        '2024-01-01',
        '--end',
        '2024-01-31',
      ];
      await run();
      expect(mockExit).toHaveBeenCalledWith(0);

      const call = vi.mocked(client.GET).mock.calls[0];
      expect(call[1].query).toEqual({ start: '2024-01-01', end: '2024-01-31' });
    });

    it('exits with 1 on 404 error', async () => {
      vi.mocked(client.GET).mockResolvedValueOnce({
        data: undefined,
        error: { status: 404, message: 'Not found' },
        response: { status: 404 } as Response,
      });

      process.argv = ['node', 'icu', 'athletes', 'summary', 'A123'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(getStderr()).toContain('Resource not found');
    });

    it('exits with 1 when no athlete ID available', async () => {
      vi.stubEnv('ICU_ATHLETE_ID', '');
      vi.mocked(client.GET).mockResolvedValueOnce({
        data: null,
        error: { status: 404, message: 'Not found' },
      });

      process.argv = ['node', 'icu', 'athletes', 'summary'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(getStderr()).toContain('athlete ID is required');
    });
  });
});
