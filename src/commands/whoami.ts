import type { Command } from 'commander';
import client from '../client.js';
import { readConfig, writeConfig } from '../config.js';
import type { ColumnDef } from '../output.js';
import { printOutput } from '../utils/output-helpers.js';

const COLUMNS: ColumnDef[] = [
  { key: 'id', header: 'ID' },
  { key: 'name', header: 'Name' },
  { key: 'email', header: 'Email' },
  { key: 'city', header: 'City' },
  { key: 'country', header: 'Country' },
  { key: 'timezone', header: 'Timezone' },
  { key: 'sex', header: 'Sex' },
];

const PLAIN_FIELD_ORDER = ['id', 'name', 'email', 'city', 'country', 'timezone', 'sex'] as const;

const PLAIN_FIELD_HEADERS: Record<string, string> = {
  id: 'Athlete ID',
  name: 'Name',
  email: 'Email',
  city: 'City',
  country: 'Country',
  timezone: 'Timezone',
  sex: 'Sex',
};

export function register(program: Command): void {
  program
    .command('whoami')
    .description('Show authenticated athlete info')
    .option('--save', 'Save athlete ID to config file')
    .action(async (options: { save?: boolean }) => {
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

      if (options.save && data) {
        const config = await readConfig();
        await writeConfig({ ...config, athleteId: data.id });
      }

      await printOutput(program, data, COLUMNS, PLAIN_FIELD_ORDER, PLAIN_FIELD_HEADERS);
      process.exit(0);
    });
}
