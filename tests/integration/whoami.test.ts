import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, type SpyInstance, vi } from 'vitest';

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

describe('whoami', () => {
  let tempDir: string;
  let mockExit: SpyInstance<typeof process.exit>;
  let mockStderrWrite: SpyInstance<typeof process.stderr.write>;
  let mockStdoutWrite: SpyInstance<typeof process.stdout.write>;
  let mockReadFile: ReturnType<typeof vi.fn>;
  let mockWriteFile: ReturnType<typeof vi.fn>;
  let mockMkdir: ReturnType<typeof vi.fn>;
  let originalIsTTY: boolean | undefined;
  let originalArgv: string[];

  const getStderr = () => mockStderrWrite?.mock.calls.map((c) => String(c[0])).join('') ?? '';
  const _getStdout = () => mockStdoutWrite?.mock.calls.map((c) => String(c[0])).join('') ?? '';

  beforeEach(async () => {
    originalIsTTY = process.stdout.isTTY;
    originalArgv = [...process.argv];
    _resetConfigCache();
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'icu-whoami-test-'));
    vi.mocked(envPaths).mockReturnValue({ config: tempDir });

    const fs = await import('node:fs/promises');
    mockReadFile = vi.mocked(fs.readFile);
    mockWriteFile = vi.mocked(fs.writeFile);
    mockMkdir = vi.mocked(fs.mkdir);
    mockReadFile.mockReset();
    mockReadFile.mockResolvedValue('{}');
    mockWriteFile.mockReset();
    mockMkdir.mockReset();

    const mockGet = vi.mocked(client.GET);
    mockGet.mockReset();
  });

  afterEach(async () => {
    process.argv = originalArgv;
    if (originalIsTTY === undefined) {
      Reflect.deleteProperty(process.stdout, 'isTTY');
    } else {
      Object.defineProperty(process.stdout, 'isTTY', { value: originalIsTTY, configurable: true });
    }
    vi.restoreAllMocks();
    mockExit?.mockRestore();
    mockStderrWrite?.mockRestore();
    mockStdoutWrite?.mockRestore();
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('success', () => {
    it('exits with 0 on success', async () => {
      const mockGet = vi.mocked(client.GET);
      mockGet.mockResolvedValueOnce({ data: ATHLETE_DATA, error: undefined });

      mockExit = vi.spyOn(process, 'exit').mockImplementation((() => {}) as typeof process.exit);
      mockStderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
      mockStdoutWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
      Object.defineProperty(process.stdout, 'isTTY', { value: undefined, configurable: true });

      process.argv = ['node', 'icu', 'whoami'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(0);
    });

    it('outputs athlete info to stdout', async () => {
      const mockGet = vi.mocked(client.GET);
      mockGet.mockResolvedValueOnce({ data: ATHLETE_DATA, error: undefined });

      mockExit = vi.spyOn(process, 'exit').mockImplementation((() => {}) as typeof process.exit);
      mockStderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
      mockStdoutWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
      Object.defineProperty(process.stdout, 'isTTY', { value: undefined, configurable: true });

      process.argv = ['node', 'icu', 'whoami'];
      await run();
      expect(mockStdoutWrite).toHaveBeenCalled();
      const output = mockStdoutWrite.mock.calls.map((c) => c[0]).join('');
      expect(output).toContain('A123');
      expect(output).toContain('Test User');
    });

    it('--format table outputs table with headers', async () => {
      const mockGet = vi.mocked(client.GET);
      mockGet.mockResolvedValueOnce({ data: ATHLETE_DATA, error: undefined });

      mockExit = vi.spyOn(process, 'exit').mockImplementation((() => {}) as typeof process.exit);
      mockStderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
      mockStdoutWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
      Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true });

      process.argv = ['node', 'icu', 'whoami', '--format', 'table'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(0);
    });

    it('--format plain outputs field-per-line', async () => {
      const mockGet = vi.mocked(client.GET);
      mockGet.mockResolvedValueOnce({ data: ATHLETE_DATA, error: undefined });

      mockExit = vi.spyOn(process, 'exit').mockImplementation((() => {}) as typeof process.exit);
      mockStderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
      mockStdoutWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
      Object.defineProperty(process.stdout, 'isTTY', { value: undefined, configurable: true });

      process.argv = ['node', 'icu', 'whoami', '--format', 'plain'];
      await run();
      const output = mockStdoutWrite.mock.calls.map((c) => c[0]).join('');
      expect(output).toContain('Athlete ID: A123');
      expect(output).toContain('Name: Test User');
      expect(output).toContain('Email: test@example.com');
      expect(output).toContain('City: Dublin');
      expect(output).toContain('Country: Ireland');
      expect(output).toContain('Timezone: Europe/Dublin');
      expect(output).toContain('Sex: M');
    });

    it('--format json outputs valid JSON', async () => {
      const mockGet = vi.mocked(client.GET);
      mockGet.mockResolvedValueOnce({ data: ATHLETE_DATA, error: undefined });

      mockExit = vi.spyOn(process, 'exit').mockImplementation((() => {}) as typeof process.exit);
      mockStderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
      mockStdoutWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
      Object.defineProperty(process.stdout, 'isTTY', { value: undefined, configurable: true });

      process.argv = ['node', 'icu', 'whoami', '--format', 'json'];
      await run();
      const output = mockStdoutWrite.mock.calls.map((c) => c[0]).join('');
      expect(() => JSON.parse(output.trim())).not.toThrow();
    });

    it('--save writes athleteId to config', async () => {
      const mockGet = vi.mocked(client.GET);
      mockGet.mockResolvedValueOnce({ data: ATHLETE_DATA, error: undefined });

      mockExit = vi.spyOn(process, 'exit').mockImplementation((() => {}) as typeof process.exit);
      mockStderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
      mockStdoutWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
      Object.defineProperty(process.stdout, 'isTTY', { value: undefined, configurable: true });

      mockMkdir.mockResolvedValueOnce(undefined as never);
      mockWriteFile.mockResolvedValueOnce(undefined as never);

      process.argv = ['node', 'icu', 'whoami', '--save'];
      await run();
      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      const writtenData = JSON.parse(writeCall[1] as string);
      expect(writtenData.athleteId).toBe('A123');
    });
  });

  describe('error handling', () => {
    it('exits with 1 and prints error on 401', async () => {
      const mockGet = vi.mocked(client.GET);
      mockGet.mockResolvedValueOnce({
        data: undefined,
        error: { status: 401, message: 'Unauthorized' },
        response: { status: 401 } as Response,
      });

      mockExit = vi.spyOn(process, 'exit').mockImplementation((() => {}) as typeof process.exit);
      mockStderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
      mockStdoutWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
      Object.defineProperty(process.stdout, 'isTTY', { value: undefined, configurable: true });

      process.argv = ['node', 'icu', 'whoami'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(getStderr()).toContain('Authentication failed');
    });

    it('exits with 1 and prints error on 403', async () => {
      const mockGet = vi.mocked(client.GET);
      mockGet.mockResolvedValueOnce({
        data: undefined,
        error: { status: 403, message: 'Forbidden' },
        response: { status: 403 } as Response,
      });

      mockExit = vi.spyOn(process, 'exit').mockImplementation((() => {}) as typeof process.exit);
      mockStderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
      mockStdoutWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
      Object.defineProperty(process.stdout, 'isTTY', { value: undefined, configurable: true });

      process.argv = ['node', 'icu', 'whoami'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(getStderr()).toContain('Access denied');
    });

    it('exits with 1 and prints error on 404', async () => {
      const mockGet = vi.mocked(client.GET);
      mockGet.mockResolvedValueOnce({
        data: undefined,
        error: { status: 404, message: 'Not found' },
        response: { status: 404 } as Response,
      });

      mockExit = vi.spyOn(process, 'exit').mockImplementation((() => {}) as typeof process.exit);
      mockStderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
      mockStdoutWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
      Object.defineProperty(process.stdout, 'isTTY', { value: undefined, configurable: true });

      process.argv = ['node', 'icu', 'whoami'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(getStderr()).toContain('Resource not found');
    });

    it('exits with 1 on network error', async () => {
      const mockGet = vi.mocked(client.GET);
      mockGet.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      mockExit = vi.spyOn(process, 'exit').mockImplementation((() => {}) as typeof process.exit);
      mockStderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
      mockStdoutWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
      Object.defineProperty(process.stdout, 'isTTY', { value: undefined, configurable: true });

      process.argv = ['node', 'icu', 'whoami'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(getStderr()).toContain('ECONNREFUSED');
    });
  });
});
