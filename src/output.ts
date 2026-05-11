import Table from 'cli-table3';

export type OutputFormat = 'json' | 'table' | 'plain';

export interface ColumnDef {
  key: string;
  header: string;
  format?: (value: unknown) => string;
}

export function resolveFormat(cliFormat?: OutputFormat, configFormat?: OutputFormat): OutputFormat {
  if (cliFormat) return cliFormat;
  if (configFormat) return configFormat;
  return process.stdout.isTTY ? 'table' : 'json';
}

export function formatJson(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

export function formatTable(data: unknown, columns: ColumnDef[]): string {
  const rows = Array.isArray(data) ? data : [data];
  if (rows.length === 0) return '';

  const table = new Table({
    head: columns.map((col) => col.header),
  });

  for (const row of rows) {
    if (typeof row !== 'object' || row === null) {
      table.push([String(row)]);
      continue;
    }
    const values = columns.map((col) => {
      const value = (row as Record<string, unknown>)[col.key];
      return col.format ? col.format(value) : String(value ?? '');
    });
    table.push(values);
  }

  return table.toString();
}

export function formatPlain(data: unknown, columns: ColumnDef[]): string {
  const rows = Array.isArray(data) ? data : [data];
  if (rows.length === 0) return '';

  return rows
    .map((row) => {
      if (typeof row !== 'object' || row === null) return String(row);
      return columns
        .map((col) => {
          const value = (row as Record<string, unknown>)[col.key];
          return col.format ? col.format(value) : String(value ?? '');
        })
        .join('\t');
    })
    .join('\n');
}
