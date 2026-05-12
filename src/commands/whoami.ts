import type { Command } from 'commander';
import client from '../client.js';
import { readConfig, writeConfig } from '../config.js';
import { type ColumnDef, formatJson, formatPlain, formatTable, resolveFormat } from '../output.js';

const COLUMNS: ColumnDef[] = [
  { key: 'id', header: 'ID' },
  { key: 'name', header: 'Name' },
  { key: 'email', header: 'Email' },
  { key: 'city', header: 'City' },
  { key: 'country', header: 'Country' },
  { key: 'timezone', header: 'Timezone' },
  { key: 'sex', header: 'Sex' },
];

export function register(program: Command): void {
  program
    .command('whoami')
    .description('Show authenticated athlete info')
    .option('--save', 'Save athlete ID to config file')
    .action(async (options: { save?: boolean }) => {
      try {
        const { data, error } = await client.GET('/api/v1/athlete/{id}/profile', {
          params: { path: { id: '0' } },
        });

        if (error) {
          const status = (error as { status?: number }).status;
          if (status === 401) {
            process.stderr.write('Authentication failed. Check your credentials.\n');
          } else if (status === 403) {
            process.stderr.write('Access denied for this resource.\n');
          } else if (status === 404) {
            process.stderr.write('Resource not found.\n');
          } else {
            process.stderr.write(`Error: ${error}\n`);
          }
          process.exit(1);
        }

        if (options.save && data) {
          const config = await readConfig();
          await writeConfig({ ...config, athleteId: data.id });
        }

        const config = await readConfig();
        const format = resolveFormat(program.opts().format, config.defaultFormat);
        let output: string;
        if (format === 'table') {
          output = formatTable(data, COLUMNS);
        } else if (format === 'plain') {
          output = formatPlain(data, COLUMNS);
        } else {
          output = formatJson(data);
        }
        process.stdout.write(`${output}\n`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        process.stderr.write(`${msg}\n`);
        process.exit(1);
      }
    });
}
