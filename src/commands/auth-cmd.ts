import { Command as Cmd, type Command } from 'commander';
import { getAuthMode } from '../auth.js';
import client from '../client.js';
import { readConfig } from '../config.js';
import { type ColumnDef, formatJson, formatTable, resolveFormat } from '../output.js';

const COLUMNS: ColumnDef[] = [
  { key: 'auth_mode', header: 'Auth Mode' },
  { key: 'id', header: 'Athlete ID' },
  { key: 'name', header: 'Name' },
  { key: 'email', header: 'Email' },
  { key: 'city', header: 'City' },
  { key: 'country', header: 'Country' },
  { key: 'timezone', header: 'Timezone' },
];

const PLAIN_FIELD_ORDER = ['id', 'name', 'email', 'city', 'country', 'timezone'] as const;

export function register(program: Command): void {
  program
    .command('auth')
    .description('Authentication commands')
    .addCommand(
      new Cmd('status').description('Verify auth credentials').action(async () => {
        const mode = getAuthMode();
        if (mode === 'none') {
          process.stderr.write(
            'No credentials found. Set the ICU_API_KEY environment variable or the ICU_ACCESS_TOKEN environment variable.\n',
          );
          process.exit(1);
        }

        const envVarLine = mode === 'bearer' ? 'ICU_ACCESS_TOKEN is set' : 'ICU_API_KEY is set';

        const { data, error, response } = await client.GET('/api/v1/athlete/{id}/profile', {
          params: { path: { id: '0' } },
        });

        if (error) {
          const status = response?.status ?? 0;
          if (status === 401) {
            process.stderr.write('Authentication failed. Check your credentials.\n');
          } else if (status === 403) {
            process.stderr.write('Access denied for this resource.\n');
          } else if (status === 404) {
            process.stderr.write('Resource not found.\n');
          } else {
            process.stderr.write(
              `Error: ${typeof error === 'string' ? error : JSON.stringify(error)}\n`,
            );
          }
          process.exit(1);
        }

        const config = await readConfig();
        const outputFormat = resolveFormat(program.opts().format, config.defaultFormat);
        const row = { auth_mode: mode, ...data };

        let output: string;
        if (outputFormat === 'table') {
          output = formatTable(row, COLUMNS);
        } else if (outputFormat === 'plain') {
          const lines = [`Auth Mode: ${mode}`];
          for (const key of PLAIN_FIELD_ORDER) {
            const value = data[key as keyof typeof data];
            if (value !== undefined && value !== null) {
              const header = COLUMNS.find((c) => c.key === key)?.header ?? key;
              lines.push(`${header}: ${value}`);
            }
          }
          output = lines.join('\n');
        } else {
          output = formatJson({ auth_mode: mode, env_var: envVarLine, athlete: data });
        }
        process.stdout.write(`${envVarLine}\n${output}\n`);
        process.exit(0);
      }),
    );
}
