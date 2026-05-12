import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return {
    ...actual,
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
  };
});

vi.mock('env-paths');

import envPaths from 'env-paths';
import {
  _resetConfigCache,
  getConfigDir,
  getConfigPath,
  readConfig,
  resolveAthleteId,
  writeConfig,
} from '../../src/config.js';

describe('config', () => {
  let tempDir: string;
  let mockReadFile: ReturnType<typeof vi.fn>;
  let mockWriteFile: ReturnType<typeof vi.fn>;
  let mockMkdir: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    _resetConfigCache();
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'icu-test-'));
    vi.mocked(envPaths).mockReturnValue({ config: tempDir });
    const fsModule = await import('node:fs/promises');
    mockReadFile = vi.mocked(fsModule.readFile);
    mockWriteFile = vi.mocked(fsModule.writeFile);
    mockMkdir = vi.mocked(fsModule.mkdir);
    mockReadFile.mockReset();
    mockWriteFile.mockReset();
    mockMkdir.mockReset();
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('getConfigDir', () => {
    it('returns the configured directory', () => {
      expect(getConfigDir()).toBe(tempDir);
    });
  });

  describe('getConfigPath', () => {
    it('returns config.json within the config directory', () => {
      expect(getConfigPath()).toBe(path.join(tempDir, 'config.json'));
    });
  });

  describe('readConfig', () => {
    it('returns empty object when config file does not exist', async () => {
      mockReadFile.mockRejectedValueOnce(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
      await expect(readConfig()).resolves.toEqual({});
    });

    it('reads and parses existing config file', async () => {
      mockReadFile.mockResolvedValueOnce('{"athleteId":"A123","defaultFormat":"json"}');
      await expect(readConfig()).resolves.toEqual({ athleteId: 'A123', defaultFormat: 'json' });
    });

    it('throws descriptive error when config file is corrupted', async () => {
      mockReadFile.mockResolvedValueOnce('{invalid json');
      await expect(readConfig()).rejects.toThrow('Config file is corrupted');
    });

    it('rethrows non-ENOENT, non-SyntaxError errors', async () => {
      mockReadFile.mockRejectedValueOnce(new Error('EACCES'));
      await expect(readConfig()).rejects.toThrow('EACCES');
    });
  });

  describe('writeConfig', () => {
    it('writes config as formatted JSON', async () => {
      mockMkdir.mockResolvedValueOnce(undefined as never);
      mockWriteFile.mockResolvedValueOnce(undefined as never);
      await writeConfig({ athleteId: 'B456', defaultFormat: 'table' });
      const call = mockWriteFile.mock.calls[0];
      if (!call) throw new Error('writeFile was not called');
      const [writtenPath, writtenData] = call;
      expect(writtenPath).toBe(path.join(tempDir, 'config.json'));
      expect(JSON.parse(writtenData as string)).toEqual({
        athleteId: 'B456',
        defaultFormat: 'table',
      });
    });

    it('creates config directory with recursive flag', async () => {
      mockMkdir.mockResolvedValueOnce(undefined as never);
      mockWriteFile.mockResolvedValueOnce(undefined as never);
      await writeConfig({});
      expect(mockMkdir).toHaveBeenCalledWith(tempDir, { recursive: true });
    });
  });

  describe('resolveAthleteId', () => {
    it('returns cliId when provided', async () => {
      mockReadFile.mockRejectedValueOnce(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
      await expect(resolveAthleteId('cli-id')).resolves.toBe('cli-id');
    });

    it('returns ICU_ATHLETE_ID env var when cliId is null', async () => {
      process.env.ICU_ATHLETE_ID = 'env-id';
      mockReadFile.mockRejectedValueOnce(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
      await expect(resolveAthleteId(null)).resolves.toBe('env-id');
      delete process.env.ICU_ATHLETE_ID;
    });

    it('returns config athleteId when cliId and env are not set', async () => {
      delete process.env.ICU_ATHLETE_ID;
      mockReadFile.mockResolvedValueOnce('{"athleteId":"config-id"}');
      await expect(resolveAthleteId(null)).resolves.toBe('config-id');
    });

    it('returns null when no source provides an athleteId', async () => {
      delete process.env.ICU_ATHLETE_ID;
      mockReadFile.mockRejectedValueOnce(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
      await expect(resolveAthleteId(null)).resolves.toBeNull();
    });

    it('prefers cliId over env var', async () => {
      process.env.ICU_ATHLETE_ID = 'env-id';
      mockReadFile.mockRejectedValueOnce(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
      await expect(resolveAthleteId('cli-id')).resolves.toBe('cli-id');
      delete process.env.ICU_ATHLETE_ID;
    });

    it('prefers env var over config athleteId', async () => {
      process.env.ICU_ATHLETE_ID = 'env-id';
      mockReadFile.mockResolvedValueOnce('{"athleteId":"config-id"}');
      await expect(resolveAthleteId(null)).resolves.toBe('env-id');
      delete process.env.ICU_ATHLETE_ID;
    });
  });
});
