import type { Command } from 'commander';
import { readConfig } from './config.js';
import { type ColumnDef, formatJson, formatTable, resolveFormat } from './output.js';

export type PlainFieldOrder = readonly string[];
export type PlainFieldHeaders = Record<string, string>;

export async function printOutput(
  program: Command,
  data: Record<string, unknown> | Record<string, unknown>[],
  columns: ColumnDef[],
  plainFieldOrder: PlainFieldOrder,
  plainFieldHeaders: PlainFieldHeaders,
): Promise<void> {
  const config = await readConfig();
  const format = resolveFormat(
    program.opts().format as 'json' | 'table' | 'plain' | undefined,
    config.defaultFormat,
  );

  const isArray = Array.isArray(data);

  if (format === 'table') {
    process.stdout.write(`${formatTable(data, columns)}\n`);
  } else if (format === 'plain') {
    if (isArray) {
      for (const row of data as Record<string, unknown>[]) {
        const lines: string[] = [];
        for (const key of plainFieldOrder) {
          const value = row[key];
          if (value !== undefined && value !== null) {
            lines.push(`${plainFieldHeaders[key]}: ${value}`);
          }
        }
        process.stdout.write(`${lines.join('\n')}\n`);
        process.stdout.write('---\n');
      }
    } else {
      const lines: string[] = [];
      for (const key of plainFieldOrder) {
        const value = (data as Record<string, unknown>)[key];
        if (value !== undefined && value !== null) {
          lines.push(`${plainFieldHeaders[key]}: ${value}`);
        }
      }
      process.stdout.write(`${lines.join('\n')}\n`);
    }
  } else {
    process.stdout.write(`${formatJson(data)}\n`);
  }
}
