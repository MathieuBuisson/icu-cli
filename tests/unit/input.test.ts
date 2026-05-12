import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readInput } from '../../src/input.js';

vi.mock('node:fs/promises');

describe('readInput', () => {
  beforeEach(() => {
    process.stdin.setEncoding = vi.fn() as unknown as typeof process.stdin.setEncoding;
  });

  it('returns null when source is null', async () => {
    const result = await readInput(null);
    expect(result).toBeNull();
  });

  it('reads JSON from a file path', async () => {
    const { readFile } = await import('node:fs/promises');
    vi.mocked(readFile).mockResolvedValue('{"name":"test"}');

    const result = await readInput('/path/to/file.json');

    expect(readFile).toHaveBeenCalledWith('/path/to/file.json', 'utf8');
    expect(result).toEqual({ name: 'test' });
  });

  it('throws when file not found', async () => {
    const { readFile } = await import('node:fs/promises');
    const error = new Error('ENOENT') as NodeJS.ErrnoException;
    error.code = 'ENOENT';
    vi.mocked(readFile).mockRejectedValue(error);

    await expect(readInput('/path/to/missing.json')).rejects.toThrow(
      'File not found: /path/to/missing.json',
    );
  });

  it('rethrows non-ENOENT file errors', async () => {
    const { readFile } = await import('node:fs/promises');
    vi.mocked(readFile).mockRejectedValue(new Error('Permission denied'));

    await expect(readInput('/path/to/file.json')).rejects.toThrow('Permission denied');
  });

  it('throws when JSON is invalid', async () => {
    const { readFile } = await import('node:fs/promises');
    vi.mocked(readFile).mockResolvedValue('{invalid json}');

    await expect(readInput('/path/to/file.json')).rejects.toThrow(/Invalid JSON in input/);
  });
});
