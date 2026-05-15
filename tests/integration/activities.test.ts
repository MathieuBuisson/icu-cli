import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/client.js', () => ({
  default: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() },
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

import { run } from '../../src/cli.js';
import client from '../../src/client.js';
import { _resetConfigCache } from '../../src/config.js';

const _ACTIVITY_DATA = {
  id: 'act123',
  name: 'Morning Run',
  start_date_local: '2024-01-15T08:00:00',
  distance: 5000,
  elapsed_time: 1800,
  icu_training_load: 45,
  icu_joules: 1500,
};

const _HIDDEN_ACTIVITY = {
  id: 'act456',
  icu_athlete_id: 'A123',
  start_date_local: '2024-01-16T09:00:00',
  source: 'strava',
};

const STREAM_DATA = {
  time: [0, 1, 2, 3, 4],
  watts: [100, 110, 120, 130, 140],
};

const INTERVAL_DATA = [
  { name: 'Interval 1', duration: 60, intensity: 8 },
  { name: 'Interval 2', duration: 120, intensity: 9 },
];

describe('activities', () => {
  let mockExit: ReturnType<typeof vi.spyOn>;
  let mockStderrWrite: ReturnType<typeof vi.spyOn>;
  let mockStdoutWrite: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    _resetConfigCache();
    mockExit = vi.spyOn(process, 'exit').mockImplementation((() => {}) as typeof process.exit);
    mockStderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    mockStdoutWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    Object.defineProperty(process.stdout, 'isTTY', { value: undefined, configurable: true });
  });

  afterEach(() => {
    mockExit.mockRestore();
    mockStderrWrite.mockRestore();
    mockStdoutWrite.mockRestore();
    vi.restoreAllMocks();
  });

  describe('list', () => {
    it('exits with 1 when athlete ID is not configured', async () => {
      process.argv = ['node', 'icu', 'activities', 'list', '--oldest', '2024-01-01'];
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

      process.argv = ['node', 'icu', 'activities', 'list', '--oldest', '2024-01-01'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      const stderr = mockStderrWrite.mock.calls.map((c) => c[0]).join('');
      expect(stderr).toContain('Authentication failed');
    });

    it('exits with 1 and prints access denied on 403', async () => {
      const mockGet = vi.mocked(client.GET);
      mockGet.mockResolvedValueOnce({
        data: undefined,
        error: { status: 403, message: 'Forbidden' },
        response: { status: 403 } as Response,
      });

      process.argv = ['node', 'icu', 'activities', 'list', '--oldest', '2024-01-01'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      const stderr = mockStderrWrite.mock.calls.map((c) => c[0]).join('');
      expect(stderr).toContain('Access denied');
    });
  });

  describe('get', () => {
    it('exits with 1 on 404', async () => {
      const mockGet = vi.mocked(client.GET);
      mockGet.mockResolvedValueOnce({
        data: undefined,
        error: { status: 404, message: 'Not found' },
        response: { status: 404 } as Response,
      });

      process.argv = ['node', 'icu', 'activities', 'get', 'invalid'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      const stderr = mockStderrWrite.mock.calls.map((c) => c[0]).join('');
      expect(stderr).toContain('Resource not found');
    });
  });

  describe('create', () => {
    it('exits with 1 when --file is missing', async () => {
      process.argv = ['node', 'icu', 'activities', 'create'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      const stderr = mockStderrWrite.mock.calls.map((c) => c[0]).join('');
      expect(stderr).toContain('--file is required');
    });
  });

  describe('update', () => {
    it('exits with 1 when --file is missing', async () => {
      process.argv = ['node', 'icu', 'activities', 'update', 'act123'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      const stderr = mockStderrWrite.mock.calls.map((c) => c[0]).join('');
      expect(stderr).toContain('--file is required');
    });
  });

  describe('delete', () => {
    it('exits with 0 and prints confirmation on success', async () => {
      const mockDelete = vi.mocked(client.DELETE);
      mockDelete.mockResolvedValueOnce({
        data: { id: 'act123' },
        error: undefined,
        response: { status: 200 } as Response,
      });

      process.argv = ['node', 'icu', 'activities', 'delete', 'act123'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(0);
      const stdout = mockStdoutWrite.mock.calls.map((c) => c[0]).join('');
      expect(stdout).toContain('Deleted activity');
    });

    it('exits with 1 and prints not found on 404', async () => {
      const mockDelete = vi.mocked(client.DELETE);
      mockDelete.mockResolvedValueOnce({
        data: undefined,
        error: { status: 404, message: 'Not found' },
        response: { status: 404 } as Response,
      });

      process.argv = ['node', 'icu', 'activities', 'delete', 'invalid'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      const stderr = mockStderrWrite.mock.calls.map((c) => c[0]).join('');
      expect(stderr).toContain('Resource not found');
    });
  });

  describe('search', () => {
    it('exits with 1 when --query is missing', async () => {
      process.argv = ['node', 'icu', 'activities', 'search'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      const stderr = mockStderrWrite.mock.calls.map((c) => c[0]).join('');
      expect(stderr).toContain('--query');
    });

    it('exits with 1 and prints auth error on 401', async () => {
      const mockGet = vi.mocked(client.GET);
      mockGet.mockResolvedValueOnce({
        data: undefined,
        error: { status: 401, message: 'Unauthorized' },
        response: { status: 401 } as Response,
      });

      process.argv = ['node', 'icu', 'activities', 'search', '--query', 'morning'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      const stderr = mockStderrWrite.mock.calls.map((c) => c[0]).join('');
      expect(stderr).toContain('Authentication failed');
    });
  });

  describe('streams', () => {
    it('exits with 0 and outputs streams as JSON', async () => {
      const mockGet = vi.mocked(client.GET);
      mockGet.mockResolvedValueOnce({
        data: STREAM_DATA,
        error: undefined,
        response: { status: 200 } as Response,
      });

      process.argv = ['node', 'icu', 'activities', 'streams', 'act123'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(0);
      const stdout = mockStdoutWrite.mock.calls.map((c) => c[0]).join('');
      expect(stdout).toContain('"time"');
      expect(stdout).toContain('"watts"');
    });

    it('exits with 1 on API error', async () => {
      const mockGet = vi.mocked(client.GET);
      mockGet.mockResolvedValueOnce({
        data: undefined,
        error: { status: 500, message: 'Server error' },
        response: { status: 500 } as Response,
      });

      process.argv = ['node', 'icu', 'activities', 'streams', 'act123'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      const stderr = mockStderrWrite.mock.calls.map((c) => c[0]).join('');
      expect(stderr).toContain('Error');
    });

    it('exits with 1 and prints access denied on 403', async () => {
      const mockGet = vi.mocked(client.GET);
      mockGet.mockResolvedValueOnce({
        data: undefined,
        error: { status: 403, message: 'Forbidden' },
        response: { status: 403 } as Response,
      });

      process.argv = ['node', 'icu', 'activities', 'streams', 'act123'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      const stderr = mockStderrWrite.mock.calls.map((c) => c[0]).join('');
      expect(stderr).toContain('Access denied');
    });
  });

  describe('intervals', () => {
    it('exits with 0 and outputs intervals as JSON', async () => {
      const mockGet = vi.mocked(client.GET);
      mockGet.mockResolvedValueOnce({
        data: INTERVAL_DATA,
        error: undefined,
        response: { status: 200 } as Response,
      });

      process.argv = ['node', 'icu', 'activities', 'intervals', 'act123'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(0);
      const stdout = mockStdoutWrite.mock.calls.map((c) => c[0]).join('');
      expect(stdout).toContain('"name"');
      expect(stdout).toContain('"Interval 1"');
    });

    it('exits with 1 on API error', async () => {
      const mockGet = vi.mocked(client.GET);
      mockGet.mockResolvedValueOnce({
        data: undefined,
        error: { status: 404, message: 'Not found' },
        response: { status: 404 } as Response,
      });

      process.argv = ['node', 'icu', 'activities', 'intervals', 'invalid'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      const stderr = mockStderrWrite.mock.calls.map((c) => c[0]).join('');
      expect(stderr).toContain('Resource not found');
    });

    it('exits with 1 and prints auth error on 401', async () => {
      const mockGet = vi.mocked(client.GET);
      mockGet.mockResolvedValueOnce({
        data: undefined,
        error: { status: 401, message: 'Unauthorized' },
        response: { status: 401 } as Response,
      });

      process.argv = ['node', 'icu', 'activities', 'intervals', 'act123'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      const stderr = mockStderrWrite.mock.calls.map((c) => c[0]).join('');
      expect(stderr).toContain('Authentication failed');
    });
  });

  describe('upload', () => {
    it('exits with 1 and prints auth error on 401', async () => {
      const mockPost = vi.mocked(client.POST);
      mockPost.mockResolvedValueOnce({
        data: undefined,
        error: { status: 401, message: 'Unauthorized' },
        response: { status: 401 } as Response,
      });

      const fs = await import('node:fs/promises');
      vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('fake fit data'));

      process.argv = ['node', 'icu', 'activities', 'upload', 'test.fit'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      const stderr = mockStderrWrite.mock.calls.map((c) => c[0]).join('');
      expect(stderr).toContain('Authentication failed');
    });
  });

  describe('download-fit', () => {
    it('exits with 0 and outputs binary data to stdout', async () => {
      const fitData = new ArrayBuffer(10);
      const mockGet = vi.mocked(client.GET);
      mockGet.mockResolvedValueOnce({
        data: fitData,
        error: undefined,
        response: { status: 200 } as Response,
      });

      process.argv = ['node', 'icu', 'activities', 'download-fit', 'act123'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(0);
    });

    it('exits with 1 on API error', async () => {
      const mockGet = vi.mocked(client.GET);
      mockGet.mockResolvedValueOnce({
        data: undefined,
        error: { status: 404, message: 'Not found' },
        response: { status: 404 } as Response,
      });

      process.argv = ['node', 'icu', 'activities', 'download-fit', 'invalid'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      const stderr = mockStderrWrite.mock.calls.map((c) => c[0]).join('');
      expect(stderr).toContain('Resource not found');
    });

    it('exits with 1 and prints auth error on 401', async () => {
      const mockGet = vi.mocked(client.GET);
      mockGet.mockResolvedValueOnce({
        data: undefined,
        error: { status: 401, message: 'Unauthorized' },
        response: { status: 401 } as Response,
      });

      process.argv = ['node', 'icu', 'activities', 'download-fit', 'act123'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      const stderr = mockStderrWrite.mock.calls.map((c) => c[0]).join('');
      expect(stderr).toContain('Authentication failed');
    });
  });

  describe('download-gpx', () => {
    it('exits with 0 and outputs binary data to stdout', async () => {
      const gpxData = new ArrayBuffer(10);
      const mockGet = vi.mocked(client.GET);
      mockGet.mockResolvedValueOnce({
        data: gpxData,
        error: undefined,
        response: { status: 200 } as Response,
      });

      process.argv = ['node', 'icu', 'activities', 'download-gpx', 'act123'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(0);
    });

    it('exits with 1 on API error', async () => {
      const mockGet = vi.mocked(client.GET);
      mockGet.mockResolvedValueOnce({
        data: undefined,
        error: { status: 404, message: 'Not found' },
        response: { status: 404 } as Response,
      });

      process.argv = ['node', 'icu', 'activities', 'download-gpx', 'invalid'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      const stderr = mockStderrWrite.mock.calls.map((c) => c[0]).join('');
      expect(stderr).toContain('Resource not found');
    });

    it('exits with 1 and prints auth error on 401', async () => {
      const mockGet = vi.mocked(client.GET);
      mockGet.mockResolvedValueOnce({
        data: undefined,
        error: { status: 401, message: 'Unauthorized' },
        response: { status: 401 } as Response,
      });

      process.argv = ['node', 'icu', 'activities', 'download-gpx', 'act123'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      const stderr = mockStderrWrite.mock.calls.map((c) => c[0]).join('');
      expect(stderr).toContain('Authentication failed');
    });
  });
});
