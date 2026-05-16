import type { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockReadConfig } = vi.hoisted(() => ({
  mockReadConfig: vi.fn(),
}));

vi.mock('../../src/config.js', () => ({
  readConfig: mockReadConfig,
}));

beforeEach(() => {
  Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true });
});

afterEach(() => {
  Object.defineProperty(process.stdout, 'isTTY', { value: undefined, configurable: true });
  vi.restoreAllMocks();
  mockReadConfig.mockReset();
});

import type { ColumnDef } from '../../src/output.js';
import { printOutput } from '../../src/utils/output-helpers.js';

const COLUMNS: ColumnDef[] = [
  { key: 'id', header: 'ID' },
  { key: 'name', header: 'Name' },
];

const PLAIN_FIELD_ORDER = ['id', 'name'] as const;
const PLAIN_FIELD_HEADERS: Record<string, string> = {
  id: 'ID',
  name: 'Name',
};

const mockProgram = {
  opts: () => ({}),
} as unknown as Command;

describe('printOutput', () => {
  describe('table format', () => {
    it('outputs table format for single object', async () => {
      mockReadConfig.mockResolvedValue({ defaultFormat: undefined });
      const mockWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

      const data = { id: '123', name: 'Test' };
      await printOutput(mockProgram, data, COLUMNS, PLAIN_FIELD_ORDER, PLAIN_FIELD_HEADERS);

      expect(mockWrite).toHaveBeenCalled();
      const output = mockWrite.mock.calls.map((c) => c[0]).join('');
      expect(output).toContain('ID');
      expect(output).toContain('Name');
      expect(output).toContain('123');
      expect(output).toContain('Test');
    });

    it('outputs table format for array', async () => {
      mockReadConfig.mockResolvedValue({ defaultFormat: undefined });
      const mockWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

      const data = [
        { id: '1', name: 'Alice' },
        { id: '2', name: 'Bob' },
      ];
      await printOutput(mockProgram, data, COLUMNS, PLAIN_FIELD_ORDER, PLAIN_FIELD_HEADERS);

      expect(mockWrite).toHaveBeenCalled();
      const output = mockWrite.mock.calls.map((c) => c[0]).join('');
      expect(output).toContain('1');
      expect(output).toContain('2');
    });

    it('respects cli format option', async () => {
      mockReadConfig.mockResolvedValue({ defaultFormat: 'table' });
      const mockWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

      const programWithFormat = {
        opts: () => ({ format: 'table' }),
      } as unknown as Command;

      await printOutput(
        programWithFormat,
        { id: '1', name: 'Test' },
        COLUMNS,
        PLAIN_FIELD_ORDER,
        PLAIN_FIELD_HEADERS,
      );

      expect(mockWrite).toHaveBeenCalled();
      const output = mockWrite.mock.calls.map((c) => c[0]).join('');
      expect(output).toContain('ID');
    });
  });

  describe('plain format', () => {
    it('outputs plain format for single object', async () => {
      mockReadConfig.mockResolvedValue({ defaultFormat: 'plain' });
      const mockWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

      const data = { id: '123', name: 'Test' };
      await printOutput(mockProgram, data, COLUMNS, PLAIN_FIELD_ORDER, PLAIN_FIELD_HEADERS);

      expect(mockWrite).toHaveBeenCalled();
      const output = mockWrite.mock.calls.map((c) => c[0]).join('');
      expect(output).toContain('ID: 123');
      expect(output).toContain('Name: Test');
    });

    it('outputs plain format for array with separator', async () => {
      mockReadConfig.mockResolvedValue({ defaultFormat: 'plain' });
      const mockWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

      const data = [
        { id: '1', name: 'Alice' },
        { id: '2', name: 'Bob' },
      ];
      await printOutput(mockProgram, data, COLUMNS, PLAIN_FIELD_ORDER, PLAIN_FIELD_HEADERS);

      const output = mockWrite.mock.calls.map((c) => c[0]).join('');
      expect(output).toContain('ID: 1');
      expect(output).toContain('Name: Alice');
      expect(output).toContain('---');
      expect(output).toContain('ID: 2');
      expect(output).toContain('Name: Bob');
    });

    it('skips null and undefined values in plain format', async () => {
      mockReadConfig.mockResolvedValue({ defaultFormat: 'plain' });
      const mockWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

      const data = { id: '123', name: null };
      await printOutput(mockProgram, data, COLUMNS, PLAIN_FIELD_ORDER, PLAIN_FIELD_HEADERS);

      const output = mockWrite.mock.calls.map((c) => c[0]).join('');
      expect(output).toContain('ID: 123');
      expect(output).not.toContain('Name:');
    });

    it('uses custom plain field headers', async () => {
      mockReadConfig.mockResolvedValue({ defaultFormat: 'plain' });
      const mockWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

      const customHeaders: Record<string, string> = {
        id: 'User ID',
        name: 'Full Name',
      };

      await printOutput(
        mockProgram,
        { id: '123', name: 'Test' },
        COLUMNS,
        PLAIN_FIELD_ORDER,
        customHeaders,
      );

      const output = mockWrite.mock.calls.map((c) => c[0]).join('');
      expect(output).toContain('User ID: 123');
      expect(output).toContain('Full Name: Test');
    });
  });

  describe('json format', () => {
    it('outputs json format for single object', async () => {
      mockReadConfig.mockResolvedValue({ defaultFormat: 'json' });
      const mockWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

      const data = { id: '123', name: 'Test' };
      await printOutput(mockProgram, data, COLUMNS, PLAIN_FIELD_ORDER, PLAIN_FIELD_HEADERS);

      expect(mockWrite).toHaveBeenCalled();
      const output = mockWrite.mock.calls.map((c) => c[0]).join('');
      expect(output).toContain('"id": "123"');
      expect(output).toContain('"name": "Test"');
    });

    it('outputs json format for array', async () => {
      mockReadConfig.mockResolvedValue({ defaultFormat: 'json' });
      const mockWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

      const data = [{ id: '1', name: 'Alice' }];
      await printOutput(mockProgram, data, COLUMNS, PLAIN_FIELD_ORDER, PLAIN_FIELD_HEADERS);

      const output = mockWrite.mock.calls.map((c) => c[0]).join('');
      expect(output).toContain('"id": "1"');
    });
  });

  describe('format precedence', () => {
    it('cli format takes precedence over config', async () => {
      mockReadConfig.mockResolvedValue({ defaultFormat: 'plain' });
      const mockWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

      const programWithFormat = {
        opts: () => ({ format: 'json' }),
      } as unknown as Command;

      await printOutput(
        programWithFormat,
        { id: '1', name: 'Test' },
        COLUMNS,
        PLAIN_FIELD_ORDER,
        PLAIN_FIELD_HEADERS,
      );

      const output = mockWrite.mock.calls.map((c) => c[0]).join('');
      expect(output).toContain('"id": "1"');
      expect(output).not.toContain('ID: 1');
    });

    it('uses config default when no cli format', async () => {
      mockReadConfig.mockResolvedValue({ defaultFormat: 'json' });
      const mockWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

      const programNoFormat = {
        opts: () => ({}),
      } as unknown as Command;

      await printOutput(
        programNoFormat,
        { id: '1', name: 'Test' },
        COLUMNS,
        PLAIN_FIELD_ORDER,
        PLAIN_FIELD_HEADERS,
      );

      const output = mockWrite.mock.calls.map((c) => c[0]).join('');
      expect(output).toContain('"id": "1"');
    });
  });
});
