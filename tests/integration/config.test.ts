import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
import { _resetConfigCache } from '../../src/config.js';

const DEFAULT_CONFIG = { athleteId: 'A123', defaultFormat: 'json' as const };

describe('config', () => {
  let tempDir: string;

  beforeEach(async () => {
    _resetConfigCache();
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'icu-config-test-'));
    vi.mocked(envPaths).mockReturnValue({ config: tempDir });
    const fs = await import('node:fs/promises');
    vi.mocked(fs.readFile).mockReset();
    vi.mocked(fs.writeFile).mockReset();
    vi.mocked(fs.mkdir).mockReset();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('config set', () => {
    it('writes athleteId to config and prints confirmation', async () => {
      const fs = await import('node:fs/promises');
      vi.mocked(fs.readFile).mockImplementation(() => Promise.resolve('{}'));
      vi.mocked(fs.mkdir).mockImplementation(() => Promise.resolve());
      vi.mocked(fs.writeFile).mockImplementation(() => Promise.resolve());

      const mockExit = vi
        .spyOn(process, 'exit')
        .mockImplementation((() => {}) as typeof process.exit);
      const mockStdoutWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

      process.argv = ['node', 'icu', 'config', 'set', 'athleteId', 'foo'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(0);
      expect(vi.mocked(fs.writeFile)).toHaveBeenCalled();
      const stdout = mockStdoutWrite.mock.calls.map((c) => c[0]).join('');
      expect(stdout).toContain('Saved athleteId = foo');
    });

    it('writes defaultFormat json to config and prints confirmation', async () => {
      const fs = await import('node:fs/promises');
      vi.mocked(fs.readFile).mockImplementation(() => Promise.resolve('{}'));
      vi.mocked(fs.mkdir).mockImplementation(() => Promise.resolve());
      vi.mocked(fs.writeFile).mockImplementation(() => Promise.resolve());

      const mockExit = vi
        .spyOn(process, 'exit')
        .mockImplementation((() => {}) as typeof process.exit);
      const mockStdoutWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

      process.argv = ['node', 'icu', 'config', 'set', 'defaultFormat', 'json'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(0);
      const stdout = mockStdoutWrite.mock.calls.map((c) => c[0]).join('');
      expect(stdout).toContain('Saved defaultFormat = json');
    });

    it('writes defaultFormat table to config and prints confirmation', async () => {
      const fs = await import('node:fs/promises');
      vi.mocked(fs.readFile).mockImplementation(() => Promise.resolve('{}'));
      vi.mocked(fs.mkdir).mockImplementation(() => Promise.resolve());
      vi.mocked(fs.writeFile).mockImplementation(() => Promise.resolve());

      const mockExit = vi
        .spyOn(process, 'exit')
        .mockImplementation((() => {}) as typeof process.exit);

      process.argv = ['node', 'icu', 'config', 'set', 'defaultFormat', 'table'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(0);
    });

    it('writes defaultFormat plain to config and prints confirmation', async () => {
      const fs = await import('node:fs/promises');
      vi.mocked(fs.readFile).mockImplementation(() => Promise.resolve('{}'));
      vi.mocked(fs.mkdir).mockImplementation(() => Promise.resolve());
      vi.mocked(fs.writeFile).mockImplementation(() => Promise.resolve());

      const mockExit = vi
        .spyOn(process, 'exit')
        .mockImplementation((() => {}) as typeof process.exit);

      process.argv = ['node', 'icu', 'config', 'set', 'defaultFormat', 'plain'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(0);
    });

    it('prints error and exits 1 for invalid defaultFormat value', async () => {
      const fs = await import('node:fs/promises');
      vi.mocked(fs.readFile).mockImplementation(() => Promise.resolve('{}'));
      vi.mocked(fs.mkdir).mockImplementation(() => Promise.resolve());

      const mockExit = vi
        .spyOn(process, 'exit')
        .mockImplementation((() => {}) as typeof process.exit);
      const mockStderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

      process.argv = ['node', 'icu', 'config', 'set', 'defaultFormat', 'invalid'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      const stderr = mockStderrWrite.mock.calls.map((c) => c[0]).join('');
      expect(stderr).toContain('Invalid value for defaultFormat');
      expect(vi.mocked(fs.writeFile)).not.toHaveBeenCalled();
    });

    it('prints error and exits 1 for unknown config key', async () => {
      const mockExit = vi
        .spyOn(process, 'exit')
        .mockImplementation((() => {}) as typeof process.exit);
      const mockStderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

      process.argv = ['node', 'icu', 'config', 'set', 'unknownkey', 'value'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      const stderr = mockStderrWrite.mock.calls.map((c) => c[0]).join('');
      expect(stderr).toContain('Unknown config key: unknownkey');
    });
  });

  describe('config get', () => {
    it('prints value when key exists', async () => {
      const fs = await import('node:fs/promises');
      vi.mocked(fs.readFile).mockImplementation(() =>
        Promise.resolve(JSON.stringify(DEFAULT_CONFIG)),
      );

      const mockExit = vi
        .spyOn(process, 'exit')
        .mockImplementation((() => {}) as typeof process.exit);
      const mockStdoutWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

      process.argv = ['node', 'icu', 'config', 'get', 'athleteId'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(0);
      const stdout = mockStdoutWrite.mock.calls.map((c) => c[0]).join('');
      expect(stdout.trim()).toBe('A123');
    });

    it('prints nothing and exits 0 when key is missing from config', async () => {
      const fs = await import('node:fs/promises');
      vi.mocked(fs.readFile).mockImplementation(() =>
        Promise.resolve(JSON.stringify({ athleteId: 'A123' })),
      );

      const mockExit = vi
        .spyOn(process, 'exit')
        .mockImplementation((() => {}) as typeof process.exit);
      const mockStdoutWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

      process.argv = ['node', 'icu', 'config', 'get', 'defaultFormat'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(0);
      const stdout = mockStdoutWrite.mock.calls.map((c) => c[0]).join('');
      expect(stdout.trim()).toBe('');
    });

    it('prints error and exits 1 for unknown config key', async () => {
      const mockExit = vi
        .spyOn(process, 'exit')
        .mockImplementation((() => {}) as typeof process.exit);
      const mockStderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

      process.argv = ['node', 'icu', 'config', 'get', 'unknownkey'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(1);
      const stderr = mockStderrWrite.mock.calls.map((c) => c[0]).join('');
      expect(stderr).toContain('Unknown config key: unknownkey');
    });
  });

  describe('config list', () => {
    it('prints all set key-value pairs when config is populated', async () => {
      const fs = await import('node:fs/promises');
      vi.mocked(fs.readFile).mockImplementation(() =>
        Promise.resolve(JSON.stringify(DEFAULT_CONFIG)),
      );

      const mockExit = vi
        .spyOn(process, 'exit')
        .mockImplementation((() => {}) as typeof process.exit);
      const mockStdoutWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

      process.argv = ['node', 'icu', 'config', 'list'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(0);
      const stdout = mockStdoutWrite.mock.calls.map((c) => c[0]).join('');
      expect(stdout).toContain('athleteId');
      expect(stdout).toContain('A123');
      expect(stdout).toContain('defaultFormat');
      expect(stdout).toContain('json');
    });

    it('exits with 0 and prints nothing when config is empty', async () => {
      const fs = await import('node:fs/promises');
      vi.mocked(fs.readFile).mockImplementation(() => Promise.resolve('{}'));

      const mockExit = vi
        .spyOn(process, 'exit')
        .mockImplementation((() => {}) as typeof process.exit);
      const mockStdoutWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

      process.argv = ['node', 'icu', 'config', 'list'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(0);
      const stdout = mockStdoutWrite.mock.calls.map((c) => c[0]).join('');
      expect(stdout.trim()).toBe('');
    });

    it('exits with 0 and prints nothing when config file does not exist', async () => {
      const fs = await import('node:fs/promises');
      const enoent = new Error('ENOENT') as NodeJS.ErrnoException;
      enoent.code = 'ENOENT';
      vi.mocked(fs.readFile).mockImplementation(() => Promise.reject(enoent));

      const mockExit = vi
        .spyOn(process, 'exit')
        .mockImplementation((() => {}) as typeof process.exit);
      const mockStdoutWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

      process.argv = ['node', 'icu', 'config', 'list'];
      await run();
      expect(mockExit).toHaveBeenCalledWith(0);
      const stdout = mockStdoutWrite.mock.calls.map((c) => c[0]).join('');
      expect(stdout.trim()).toBe('');
    });
  });
});
