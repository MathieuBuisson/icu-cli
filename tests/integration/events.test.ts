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
import { _resetConfigCache } from '../../src/config.js';

const _EVENT_DATA = [
  {
    id: 123,
    name: 'Morning Run',
    start_date_local: '2024-01-15',
    category: 'WORKOUT',
    distance: 5000,
    moving_time: 1800,
    icu_training_load: 45,
  },
  {
    id: 124,
    name: 'Race Day',
    start_date_local: '2024-01-20',
    category: 'RACE_A',
    distance: 10000,
    moving_time: 3600,
    icu_training_load: 90,
  },
];

describe('events', () => {
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
    mockExit.mockRestore();
    mockStderrWrite.mockRestore();
    mockStdoutWrite.mockRestore();
    Object.defineProperty(process.stdout, 'isTTY', { value: originalIsTTY, configurable: true });
    vi.restoreAllMocks();
  });

  describe('list', () => {
    it('exits with 1 when athlete ID is not configured', async () => {
      process.argv = ['node', 'icu', 'events', 'list'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('exits with 1 and prints auth error on 401', async () => {
      const mockGet = vi.mocked(client.GET);
      mockGet.mockResolvedValueOnce({
        data: undefined,
        error: { status: 401, message: 'Unauthorized' },
        response: { status: 401 } as Response,
      });

      process.argv = ['node', 'icu', 'events', 'list'];
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

      process.argv = ['node', 'icu', 'events', 'list'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(getStderr()).toContain('Access denied');
    });

    it('exits with 1 when --oldest is a future date', async () => {
      process.argv = ['node', 'icu', 'events', 'list', '--oldest', '2099-01-01'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(getStderr()).toContain('not in the future');
    });

    it('exits with 1 when --newest is invalid', async () => {
      process.argv = ['node', 'icu', 'events', 'list', '--newest', 'invalid-date'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(getStderr()).toContain('--newest must be a valid date');
    });

    it('exits with 1 when --category is invalid', async () => {
      process.argv = ['node', 'icu', 'events', 'list', '--category', 'INVALID_CAT'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(getStderr()).toContain('valid categories');
    });

    it('exits with 1 when --limit is not a positive integer', async () => {
      process.argv = ['node', 'icu', 'events', 'list', '--limit', '0'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(getStderr()).toContain('--limit must be a positive integer');
    });

    it('exits with 0 and outputs events as JSON', async () => {
      const mockGet = vi.mocked(client.GET);
      mockGet.mockResolvedValueOnce({
        data: _EVENT_DATA,
        error: undefined,
        response: { status: 200 } as Response,
      });

      process.argv = ['node', 'icu', 'events', 'list'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(0);
      expect(getStdout()).toContain('Morning Run');
      expect(getStdout()).toContain('Race Day');
    });

    it('exits with 0 and outputs CSV when --csv is specified', async () => {
      const mockGet = vi.mocked(client.GET);
      mockGet.mockResolvedValueOnce({
        data: 'id,name\n123,Morning Run',
        error: undefined,
        response: { status: 200 } as Response,
      });

      process.argv = ['node', 'icu', 'events', 'list', '--csv'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(0);
      expect(getStdout()).toContain('id,name');
    });
  });

  describe('get', () => {
    it('exits with 1 when eventId is invalid', async () => {
      process.argv = ['node', 'icu', 'events', 'get', 'invalid'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(getStderr()).toContain('eventId must be a valid integer');
    });

    it('exits with 1 when eventId is negative', async () => {
      process.argv = ['node', 'icu', 'events', 'get', '-5'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(getStderr()).toContain('eventId must be a valid integer');
    });

    it('exits with 1 on 404', async () => {
      const mockGet = vi.mocked(client.GET);
      mockGet.mockResolvedValueOnce({
        data: undefined,
        error: { status: 404, message: 'Not found' },
        response: { status: 404 } as Response,
      });

      process.argv = ['node', 'icu', 'events', 'get', '999'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(getStderr()).toContain('Resource not found');
    });

    it('exits with 0 and outputs event as JSON', async () => {
      const mockGet = vi.mocked(client.GET);
      mockGet.mockResolvedValueOnce({
        data: _EVENT_DATA[0],
        error: undefined,
        response: { status: 200 } as Response,
      });

      process.argv = ['node', 'icu', 'events', 'get', '123'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(0);
      expect(getStdout()).toContain('Morning Run');
    });
  });

  describe('create', () => {
    it('exits with 1 when --file is missing', async () => {
      process.argv = ['node', 'icu', 'events', 'create'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(getStderr()).toContain('--file is required');
    });

    it('exits with 1 and prints auth error on 401', async () => {
      const mockPost = vi.mocked(client.POST);
      mockPost.mockResolvedValueOnce({
        data: undefined,
        error: { status: 401, message: 'Unauthorized' },
        response: { status: 401 } as Response,
      });

      const fs = await import('node:fs/promises');
      vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('{"name": "Test"}'));

      process.argv = ['node', 'icu', 'events', 'create', '--file', 'event.json'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(getStderr()).toContain('Authentication failed');
    });

    it('exits with 0 and outputs created event', async () => {
      const mockPost = vi.mocked(client.POST);
      mockPost.mockResolvedValueOnce({
        data: _EVENT_DATA[0],
        error: undefined,
        response: { status: 200 } as Response,
      });

      const fs = await import('node:fs/promises');
      vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('{"name": "Morning Run"}'));

      process.argv = ['node', 'icu', 'events', 'create', '--file', 'event.json'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(0);
      expect(getStdout()).toContain('Morning Run');
    });

    it('exits with 0 with --force flag for upsert', async () => {
      const mockPost = vi.mocked(client.POST);
      mockPost.mockResolvedValueOnce({
        data: _EVENT_DATA[0],
        error: undefined,
        response: { status: 200 } as Response,
      });

      const fs = await import('node:fs/promises');
      vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('{"name": "Updated Run"}'));

      process.argv = ['node', 'icu', 'events', 'create', '--file', 'event.json', '--force'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });

  describe('update', () => {
    it('exits with 1 when --file is missing', async () => {
      process.argv = ['node', 'icu', 'events', 'update', '123'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(getStderr()).toContain('--file is required');
    });

    it('exits with 1 when eventId is invalid', async () => {
      process.argv = ['node', 'icu', 'events', 'update', 'invalid', '--file', 'event.json'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(getStderr()).toContain('eventId must be a valid integer');
    });

    it('exits with 1 on 404', async () => {
      const mockPut = vi.mocked(client.PUT);
      mockPut.mockResolvedValueOnce({
        data: undefined,
        error: { status: 404, message: 'Not found' },
        response: { status: 404 } as Response,
      });

      const fs = await import('node:fs/promises');
      vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('{"name": "Updated"}'));

      process.argv = ['node', 'icu', 'events', 'update', '999', '--file', 'event.json'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(getStderr()).toContain('Resource not found');
    });

    it('exits with 0 and outputs updated event', async () => {
      const mockPut = vi.mocked(client.PUT);
      mockPut.mockResolvedValueOnce({
        data: { ..._EVENT_DATA[0], name: 'Updated Run' },
        error: undefined,
        response: { status: 200 } as Response,
      });

      const fs = await import('node:fs/promises');
      vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('{"name": "Updated Run"}'));

      process.argv = ['node', 'icu', 'events', 'update', '123', '--file', 'event.json'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(0);
      expect(getStdout()).toContain('Updated Run');
    });
  });

  describe('delete', () => {
    it('exits with 1 when eventId is invalid', async () => {
      process.argv = ['node', 'icu', 'events', 'delete', 'invalid'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(getStderr()).toContain('eventId must be a valid integer');
    });

    it('exits with 0 and prints confirmation on success', async () => {
      const mockDelete = vi.mocked(client.DELETE);
      mockDelete.mockResolvedValueOnce({
        data: { id: 123 },
        error: undefined,
        response: { status: 200 } as Response,
      });

      process.argv = ['node', 'icu', 'events', 'delete', '123'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(0);
      expect(getStdout()).toContain('Deleted event: 123');
    });

    it('exits with 0 with --others flag', async () => {
      const mockDelete = vi.mocked(client.DELETE);
      mockDelete.mockResolvedValueOnce({
        data: { id: 123 },
        error: undefined,
        response: { status: 200 } as Response,
      });

      process.argv = ['node', 'icu', 'events', 'delete', '123', '--others'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(0);
    });

    it('exits with 1 on 404', async () => {
      const mockDelete = vi.mocked(client.DELETE);
      mockDelete.mockResolvedValueOnce({
        data: undefined,
        error: { status: 404, message: 'Not found' },
        response: { status: 404 } as Response,
      });

      process.argv = ['node', 'icu', 'events', 'delete', '999'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(getStderr()).toContain('Resource not found');
    });

    it('exits with 1 and prints auth error on 401', async () => {
      const mockDelete = vi.mocked(client.DELETE);
      mockDelete.mockResolvedValueOnce({
        data: undefined,
        error: { status: 401, message: 'Unauthorized' },
        response: { status: 401 } as Response,
      });

      process.argv = ['node', 'icu', 'events', 'delete', '123'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(getStderr()).toContain('Authentication failed');
    });
  });

  describe('download', () => {
    it('exits with 1 when eventId is invalid', async () => {
      process.argv = ['node', 'icu', 'events', 'download', 'invalid', '--ext', 'zwo'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(getStderr()).toContain('eventId must be a valid integer');
    });

    it('exits with 1 when --ext is invalid', async () => {
      process.argv = ['node', 'icu', 'events', 'download', '123', '--ext', 'txt'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(getStderr()).toContain('--ext must be one of');
    });

    it('exits with 1 when --output path parent does not exist', async () => {
      const fs = await import('node:fs/promises');
      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));

      process.argv = [
        'node',
        'icu',
        'events',
        'download',
        '123',
        '--ext',
        'zwo',
        '--output',
        '/nonexistent/path/file.zwo',
      ];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(getStderr()).toContain('parent directory does not exist');
    });

    it('exits with 0 and outputs binary to stdout', async () => {
      const workoutData = new ArrayBuffer(10);
      const mockGet = vi.mocked(client.GET);
      mockGet.mockResolvedValueOnce({
        data: workoutData,
        error: undefined,
        response: { status: 200 } as Response,
      });

      process.argv = ['node', 'icu', 'events', 'download', '123', '--ext', 'zwo'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(0);
    });

    it('exits with 0 and writes to file when --output specified', async () => {
      const workoutData = new ArrayBuffer(10);
      const mockGet = vi.mocked(client.GET);
      mockGet.mockResolvedValueOnce({
        data: workoutData,
        error: undefined,
        response: { status: 200 } as Response,
      });

      const fs = await import('node:fs/promises');
      vi.mocked(fs.access).mockResolvedValue();

      process.argv = [
        'node',
        'icu',
        'events',
        'download',
        '123',
        '--ext',
        'zwo',
        '--output',
        'workout.zwo',
      ];
      await run();
      expect(mockExit).toHaveBeenCalledWith(0);
      expect(getStdout()).toContain('Saved workout file to');
    });

    it('exits with 1 on 404', async () => {
      const mockGet = vi.mocked(client.GET);
      mockGet.mockResolvedValueOnce({
        data: undefined,
        error: { status: 404, message: 'Not found' },
        response: { status: 404 } as Response,
      });

      process.argv = ['node', 'icu', 'events', 'download', '999', '--ext', 'zwo'];
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

      process.argv = ['node', 'icu', 'events', 'download', '123', '--ext', 'zwo'];
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

      process.argv = ['node', 'icu', 'events', 'download', '123', '--ext', 'zwo'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(getStderr()).toContain('Access denied');
    });
  });
});
