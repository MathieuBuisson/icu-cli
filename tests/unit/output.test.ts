import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  Object.defineProperty(process.stdout, 'isTTY', { value: undefined, configurable: true });
  vi.restoreAllMocks();
});

import {
  type ColumnDef,
  formatJson,
  formatPlain,
  formatTable,
  resolveFormat,
} from '../../src/output.js';

const cols: ColumnDef[] = [
  { key: 'id', header: 'ID' },
  { key: 'name', header: 'Name' },
];

describe('output', () => {
  describe('resolveFormat', () => {
    it('returns cliFormat when provided', () => {
      expect(resolveFormat('json', 'table')).toBe('json');
      expect(resolveFormat('table', 'json')).toBe('table');
      expect(resolveFormat('plain', 'table')).toBe('plain');
    });

    it('returns configFormat when cliFormat is not provided', () => {
      expect(resolveFormat(undefined, 'table')).toBe('table');
      expect(resolveFormat(undefined, 'json')).toBe('json');
      expect(resolveFormat(undefined, 'plain')).toBe('plain');
    });

    it('returns table when stdout is a TTY and no format provided', () => {
      Object.defineProperty(process.stdout, 'isTTY', { value: true });
      expect(resolveFormat(undefined, undefined)).toBe('table');
    });

    it('returns json when stdout is not a TTY and no format provided', () => {
      Object.defineProperty(process.stdout, 'isTTY', { value: false });
      expect(resolveFormat(undefined, undefined)).toBe('json');
    });
  });

  describe('formatJson', () => {
    it('formats an object with indentation', () => {
      const result = formatJson({ id: '123', name: 'Test' });
      expect(result).toBe('{\n  "id": "123",\n  "name": "Test"\n}');
    });

    it('formats an array', () => {
      const result = formatJson([1, 2, 3]);
      expect(result).toBe('[\n  1,\n  2,\n  3\n]');
    });

    it('formats a string', () => {
      const result = formatJson('hello');
      expect(result).toBe('"hello"');
    });
  });

  describe('formatTable', () => {
    it('returns non-empty string for array with data', () => {
      const result = formatTable([{ id: '1', name: 'Alice' }], cols);
      expect(result.length).toBeGreaterThan(0);
    });

    it('contains column headers', () => {
      const result = formatTable([{ id: '1', name: 'Alice' }], cols);
      expect(result).toContain('ID');
      expect(result).toContain('Name');
    });

    it('returns empty string for empty array', () => {
      const result = formatTable([], cols);
      expect(result).toBe('');
    });

    it('handles single object (not array)', () => {
      const result = formatTable({ id: '1', name: 'Bob' }, cols);
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain('ID');
      expect(result).toContain('Name');
    });

    it('handles null values in data', () => {
      const result = formatTable([{ id: null, name: null }], cols);
      expect(result.length).toBeGreaterThan(0);
    });

    it('uses custom format function when provided', () => {
      const formattedCols: ColumnDef[] = [
        { key: 'id', header: 'ID', format: (v) => `ID:${v}` },
        { key: 'name', header: 'Name' },
      ];
      const result = formatTable([{ id: '1', name: 'Carol' }], formattedCols);
      expect(result).toContain('ID:1');
    });
  });

  describe('formatPlain', () => {
    it('returns non-empty string for array with data', () => {
      const result = formatPlain([{ id: '1', name: 'Alice' }], cols);
      expect(result.length).toBeGreaterThan(0);
    });

    it('does not contain headers', () => {
      const result = formatPlain([{ id: '1', name: 'Alice' }], cols);
      expect(result).not.toContain('ID');
      expect(result).not.toContain('Name');
    });

    it('returns empty string for empty array', () => {
      const result = formatPlain([], cols);
      expect(result).toBe('');
    });

    it('handles single object (not array)', () => {
      const result = formatPlain({ id: '1', name: 'Bob' }, cols);
      expect(result.length).toBeGreaterThan(0);
    });

    it('uses tab as separator', () => {
      const result = formatPlain([{ id: '1', name: 'Alice' }], cols);
      expect(result).toContain('\t');
    });

    it('uses custom format function when provided', () => {
      const formattedCols: ColumnDef[] = [
        { key: 'id', header: 'ID', format: (v) => `ID:${v}` },
        { key: 'name', header: 'Name' },
      ];
      const result = formatPlain([{ id: '1', name: 'Carol' }], formattedCols);
      expect(result).toContain('ID:1');
    });
  });
});
