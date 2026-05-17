import { afterEach, beforeEach, describe, expect, it, type SpyInstance, vi } from 'vitest';

vi.mock('../../src/client.js', () => ({
  default: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() },
}));

vi.mock('../../src/auth.js', () => ({
  getAuthMode: vi.fn(() => 'bearer'),
  getAuthHeaders: vi.fn(() => ({ Authorization: 'Bearer test' })),
}));

vi.mock('../../src/config.js', () => ({
  readConfig: vi.fn(() => Promise.resolve({})),
  resolveAthleteId: vi.fn(() => Promise.resolve('athlete123')),
  _resetConfigCache: vi.fn(),
}));

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return { ...actual, access: vi.fn(), readFile: vi.fn(), writeFile: vi.fn(), mkdir: vi.fn() };
});

vi.mock('env-paths');

import { run } from '../../src/cli.js';
import client from '../../src/client.js';
import { _resetConfigCache, resolveAthleteId } from '../../src/config.js';

const _WELLNESS_DATA = [
  {
    id: '2024-01-15',
    date: '2024-01-15',
    ctl: 50,
    atl: 45,
    weight: 78.5,
    restingHR: 48,
    hrv: 55,
    updated: '2024-01-15T10:00:00Z',
  },
  {
    id: '2024-01-16',
    date: '2024-01-16',
    ctl: 51,
    atl: 46,
    weight: 78.3,
    restingHR: 47,
    hrv: 58,
    updated: '2024-01-16T10:00:00Z',
  },
];

describe('wellness', () => {
  let mockExit: SpyInstance<typeof process.exit>;
  let mockStderrWrite: SpyInstance<typeof process.stderr.write>;
  let mockStdoutWrite: SpyInstance<typeof process.stdout.write>;
  let originalIsTTY: boolean | undefined;
  let originalArgv: string[];

  const getStderr = () => mockStderrWrite.mock.calls.map((c) => String(c[0])).join('');
  const getStdout = () => mockStdoutWrite.mock.calls.map((c) => String(c[0])).join('');

  beforeEach(() => {
    _resetConfigCache();
    originalIsTTY = process.stdout.isTTY;
    originalArgv = [...process.argv];
    mockExit = vi.spyOn(process, 'exit').mockImplementation((() => {}) as typeof process.exit);
    mockStderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    mockStdoutWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    Object.defineProperty(process.stdout, 'isTTY', { value: undefined, configurable: true });
  });

  afterEach(() => {
    process.argv = originalArgv;
    Object.defineProperty(process.stdout, 'isTTY', { value: originalIsTTY, configurable: true });
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe('list', () => {
    it('exits with 1 when athlete ID is not configured', async () => {
      vi.mocked(resolveAthleteId).mockResolvedValueOnce(undefined);
      process.argv = ['node', 'icu', 'wellness', 'list'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(getStderr()).toContain('athlete ID is required');
    });

    it('exits with 1 and prints auth error on 401', async () => {
      const mockGet = vi.mocked(client.GET);
      mockGet.mockResolvedValueOnce({
        data: undefined,
        error: { status: 401, message: 'Unauthorized' },
        response: { status: 401 } as Response,
      });

      process.argv = ['node', 'icu', 'wellness', 'list'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(getStderr()).toContain('Authentication failed');
    });

    it('exits with 1 and prints access denied on 403', async () => {
      const mockGet = vi.mocked(client.GET);
      mockGet.mockResolvedValueOnce({
        data: undefined,
        error: { status: 403, message: 'Forbidden' },
        response: { status: 403 } as Response,
      });

      process.argv = ['node', 'icu', 'wellness', 'list'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(getStderr()).toContain('Access denied');
    });

    it('exits with 1 when --oldest is a future date', async () => {
      process.argv = ['node', 'icu', 'wellness', 'list', '--oldest', '2099-01-01'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(getStderr()).toContain('not in the future');
    });

    it('exits with 1 when --newest is invalid', async () => {
      process.argv = ['node', 'icu', 'wellness', 'list', '--newest', 'invalid-date'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(getStderr()).toContain('--newest must be a valid date');
    });

    it('exits with 0 and outputs wellness records as JSON', async () => {
      const mockGet = vi.mocked(client.GET);
      mockGet.mockResolvedValueOnce({
        data: _WELLNESS_DATA,
        error: undefined,
        response: { status: 200 } as Response,
      });

      process.argv = ['node', 'icu', 'wellness', 'list'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(0);
      expect(getStdout()).toContain('2024-01-15');
      expect(getStdout()).toContain('2024-01-16');
    });

    it('exits with 0 and outputs wellness records as table', async () => {
      const mockGet = vi.mocked(client.GET);
      mockGet.mockResolvedValueOnce({
        data: _WELLNESS_DATA,
        error: undefined,
        response: { status: 200 } as Response,
      });

      process.argv = ['node', 'icu', 'wellness', 'list', '--format', 'table'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(0);
      expect(getStdout()).toContain('ID');
      expect(getStdout()).toContain('Fitness');
    });

    it('exits with 0 with --fields option', async () => {
      const mockGet = vi.mocked(client.GET);
      mockGet.mockResolvedValueOnce({
        data: _WELLNESS_DATA,
        error: undefined,
        response: { status: 200 } as Response,
      });

      process.argv = ['node', 'icu', 'wellness', 'list', '--fields', 'date,weight,restingHR'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(0);
    });

    it('exits with 0 with --oldest and --newest options', async () => {
      const mockGet = vi.mocked(client.GET);
      mockGet.mockResolvedValueOnce({
        data: _WELLNESS_DATA,
        error: undefined,
        response: { status: 200 } as Response,
      });

      process.argv = [
        'node',
        'icu',
        'wellness',
        'list',
        '--oldest',
        '2024-01-15',
        '--newest',
        '2024-01-16',
      ];
      await run();
      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });

  describe('get', () => {
    it('exits with 1 when date is invalid', async () => {
      process.argv = ['node', 'icu', 'wellness', 'get', 'invalid-date'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(getStderr()).toContain('valid ISO-8601 date');
    });

    it('exits with 1 when athlete ID is not configured', async () => {
      vi.mocked(resolveAthleteId).mockResolvedValueOnce(undefined);
      process.argv = ['node', 'icu', 'wellness', 'get', '2024-01-15'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(getStderr()).toContain('athlete ID is required');
    });

    it('exits with 1 on 404', async () => {
      const mockGet = vi.mocked(client.GET);
      mockGet.mockResolvedValueOnce({
        data: undefined,
        error: { status: 404, message: 'Not found' },
        response: { status: 404 } as Response,
      });

      process.argv = ['node', 'icu', 'wellness', 'get', '2024-01-15'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(getStderr()).toContain('Resource not found');
    });

    it('exits with 1 and prints auth error on 401', async () => {
      const mockGet = vi.mocked(client.GET);
      mockGet.mockResolvedValueOnce({
        data: undefined,
        error: { status: 401, message: 'Unauthorized' },
        response: { status: 401 } as Response,
      });

      process.argv = ['node', 'icu', 'wellness', 'get', '2024-01-15'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(getStderr()).toContain('Authentication failed');
    });

    it('exits with 0 and outputs wellness record as JSON', async () => {
      const mockGet = vi.mocked(client.GET);
      mockGet.mockResolvedValueOnce({
        data: _WELLNESS_DATA[0],
        error: undefined,
        response: { status: 200 } as Response,
      });

      process.argv = ['node', 'icu', 'wellness', 'get', '2024-01-15'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(0);
      expect(getStdout()).toContain('2024-01-15');
    });

    it('exits with 0 and outputs wellness record as table', async () => {
      const mockGet = vi.mocked(client.GET);
      mockGet.mockResolvedValueOnce({
        data: _WELLNESS_DATA[0],
        error: undefined,
        response: { status: 200 } as Response,
      });

      process.argv = ['node', 'icu', 'wellness', 'get', '2024-01-15', '--format', 'table'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(0);
      expect(getStdout()).toContain('Fitness');
      expect(getStdout()).toContain('50');
    });
  });

  describe('update', () => {
    it('exits with 1 when --file is missing', async () => {
      process.argv = ['node', 'icu', 'wellness', 'update', '2024-01-15'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(getStderr()).toContain("required option '--file <path>' not specified");
    });

    it('exits with 1 when date is invalid', async () => {
      process.argv = ['node', 'icu', 'wellness', 'update', 'invalid-date', '--file', 'data.json'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(getStderr()).toContain('valid ISO-8601 date');
    });

    it('exits with 1 when file not found', async () => {
      const fs = await import('node:fs/promises');
      const error = new Error('ENOENT') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      vi.mocked(fs.readFile).mockRejectedValue(error);

      process.argv = [
        'node',
        'icu',
        'wellness',
        'update',
        '2024-01-15',
        '--file',
        'nonexistent.json',
      ];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(getStderr()).toContain('File not found');
    });

    it('exits with 1 when file contains invalid JSON', async () => {
      const fs = await import('node:fs/promises');
      vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('{invalid json}'));

      process.argv = ['node', 'icu', 'wellness', 'update', '2024-01-15', '--file', 'invalid.json'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(getStderr()).toContain('Invalid JSON in file');
    });

    it('exits with 1 when validation errors', async () => {
      const fs = await import('node:fs/promises');
      vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('{"weight": "not-a-number"}'));

      process.argv = ['node', 'icu', 'wellness', 'update', '2024-01-15', '--file', 'data.json'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(getStderr()).toContain('Invalid wellness data');
    });

    it('exits with 1 on 401', async () => {
      const mockPut = vi.mocked(client.PUT);
      mockPut.mockResolvedValueOnce({
        data: undefined,
        error: { status: 401, message: 'Unauthorized' },
        response: { status: 401 } as Response,
      });

      const fs = await import('node:fs/promises');
      vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('{"weight": 78.5}'));

      process.argv = ['node', 'icu', 'wellness', 'update', '2024-01-15', '--file', 'data.json'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(getStderr()).toContain('Authentication failed');
    });

    it('exits with 1 on 404', async () => {
      const mockPut = vi.mocked(client.PUT);
      mockPut.mockResolvedValueOnce({
        data: undefined,
        error: { status: 404, message: 'Not found' },
        response: { status: 404 } as Response,
      });

      const fs = await import('node:fs/promises');
      vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('{"weight": 78.5}'));

      process.argv = ['node', 'icu', 'wellness', 'update', '2099-01-01', '--file', 'data.json'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(getStderr()).toContain('Resource not found');
    });

    it('exits with 0 and outputs updated wellness record', async () => {
      const mockPut = vi.mocked(client.PUT);
      mockPut.mockResolvedValueOnce({
        data: { ..._WELLNESS_DATA[0], weight: 78.2 },
        error: undefined,
        response: { status: 200 } as Response,
      });

      const fs = await import('node:fs/promises');
      vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('{"weight": 78.2}'));

      process.argv = ['node', 'icu', 'wellness', 'update', '2024-01-15', '--file', 'data.json'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(0);
      expect(getStdout()).toContain('78.2');
    });

    it('exits with 0 with valid wellness data', async () => {
      const mockPut = vi.mocked(client.PUT);
      mockPut.mockResolvedValueOnce({
        data: _WELLNESS_DATA[0],
        error: undefined,
        response: { status: 200 } as Response,
      });

      const fs = await import('node:fs/promises');
      vi.mocked(fs.readFile).mockResolvedValue(
        Buffer.from('{"weight": 78.5, "restingHR": 48, "hrv": 55}'),
      );

      process.argv = ['node', 'icu', 'wellness', 'update', '2024-01-15', '--file', 'data.json'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(0);
    });

    it('exits with 1 when athlete ID is not configured', async () => {
      vi.mocked(resolveAthleteId).mockResolvedValueOnce(undefined);
      const fs = await import('node:fs/promises');
      vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('{"weight": 78.5}'));

      process.argv = ['node', 'icu', 'wellness', 'update', '2024-01-15', '--file', 'data.json'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(getStderr()).toContain('athlete ID is required');
    });
  });

  describe('upload', () => {
    it('exits with 1 when --file is missing', async () => {
      process.argv = ['node', 'icu', 'wellness', 'upload'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(getStderr()).toContain("required option '--file <path>' not specified");
    });

    it('exits with 1 when file not found', async () => {
      const fs = await import('node:fs/promises');
      const error = new Error('ENOENT') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      vi.mocked(fs.readFile).mockRejectedValue(error);

      process.argv = ['node', 'icu', 'wellness', 'upload', '--file', 'nonexistent.csv'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(getStderr()).toContain('File not found');
    });

    it('exits with 1 when file cannot be read (non-ENOENT error)', async () => {
      const fs = await import('node:fs/promises');
      vi.mocked(fs.readFile).mockRejectedValue(new Error('EACCES: permission denied'));

      process.argv = ['node', 'icu', 'wellness', 'upload', '--file', 'restricted.csv'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(getStderr()).toContain('valid CSV content');
    });

    it('exits with 1 on 401', async () => {
      const mockPost = vi.mocked(client.POST);
      mockPost.mockResolvedValueOnce({
        data: undefined,
        error: { status: 401, message: 'Unauthorized' },
        response: { status: 401 } as Response,
      });

      const fs = await import('node:fs/promises');
      vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('date,weight\n2024-01-15,78.5'));

      process.argv = ['node', 'icu', 'wellness', 'upload', '--file', 'wellness.csv'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(getStderr()).toContain('Authentication failed');
    });

    it('exits with 1 on 403', async () => {
      const mockPost = vi.mocked(client.POST);
      mockPost.mockResolvedValueOnce({
        data: undefined,
        error: { status: 403, message: 'Forbidden' },
        response: { status: 403 } as Response,
      });

      const fs = await import('node:fs/promises');
      vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('date,weight\n2024-01-15,78.5'));

      process.argv = ['node', 'icu', 'wellness', 'upload', '--file', 'wellness.csv'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(getStderr()).toContain('Access denied');
    });

    it('exits with 0 and prints upload success', async () => {
      const mockPost = vi.mocked(client.POST);
      mockPost.mockResolvedValueOnce({
        data: undefined,
        error: undefined,
        response: { status: 200 } as Response,
      });

      const fs = await import('node:fs/promises');
      vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('date,weight\n2024-01-15,78.5'));

      process.argv = ['node', 'icu', 'wellness', 'upload', '--file', 'wellness.csv'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(0);
      expect(getStdout()).toContain('Upload successful');
    });

    it('exits with 0 with --ignoreMissingFields flag', async () => {
      const mockPost = vi.mocked(client.POST);
      mockPost.mockResolvedValueOnce({
        data: undefined,
        error: undefined,
        response: { status: 200 } as Response,
      });

      const fs = await import('node:fs/promises');
      vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('date,weight\n2024-01-15,78.5'));

      process.argv = [
        'node',
        'icu',
        'wellness',
        'upload',
        '--file',
        'wellness.csv',
        '--ignoreMissingFields',
      ];
      await run();
      expect(mockExit).toHaveBeenCalledWith(0);
      expect(getStdout()).toContain('Upload successful');
    });

    it('exits with 1 when athlete ID is not configured', async () => {
      vi.mocked(resolveAthleteId).mockResolvedValueOnce(undefined);
      const fs = await import('node:fs/promises');
      vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('date,weight\n2024-01-15,78.5'));

      process.argv = ['node', 'icu', 'wellness', 'upload', '--file', 'wellness.csv'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(getStderr()).toContain('athlete ID is required');
    });

    it('exits with 1 on 400 bad request', async () => {
      const mockPost = vi.mocked(client.POST);
      mockPost.mockResolvedValueOnce({
        data: undefined,
        error: { status: 400, message: 'Bad Request' },
        response: { status: 400 } as Response,
      });

      const fs = await import('node:fs/promises');
      vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('date,weight\n2024-01-15,78.5'));

      process.argv = ['node', 'icu', 'wellness', 'upload', '--file', 'wellness.csv'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(getStderr()).toContain('Error');
    });
  });
});
