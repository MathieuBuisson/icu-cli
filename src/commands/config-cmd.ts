import type { Command } from 'commander';
import { readConfig, writeConfig } from '../config.js';
import { type ColumnDef, formatJson, formatTable, resolveFormat } from '../output.js';

const VALID_KEYS = ['athleteId', 'defaultFormat'] as const;
type ConfigKey = (typeof VALID_KEYS)[number];

const FORMAT_VALUES = ['json', 'table', 'plain'] as const;

const COLUMNS: ColumnDef[] = [
  { key: 'key', header: 'Key' },
  { key: 'value', header: 'Value' },
];

export function register(program: Command): void {
  const config = program.command('config').description('Manage configuration');

  config
    .command('set <key> <value>')
    .description('Set a config value')
    .action(async (key: string, value: string) => {
      if (!VALID_KEYS.includes(key as ConfigKey)) {
        process.stderr.write(`Unknown config key: ${key}\n`);
        process.exit(1);
      }

      if (key === 'defaultFormat') {
        if (!FORMAT_VALUES.includes(value as (typeof FORMAT_VALUES)[number])) {
          process.stderr.write(`Invalid value for defaultFormat: must be json, table, or plain\n`);
          process.exit(1);
        }
      }

      try {
        const current = await readConfig();
        await writeConfig({ ...current, [key]: value });
        process.stdout.write(`Saved ${key} = ${value}\n`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg) process.stderr.write(`${msg}\n`);
        process.exit(1);
      }
      process.exit(0);
    });

  config
    .command('get <key>')
    .description('Get a config value')
    .action(async (key: string) => {
      if (!VALID_KEYS.includes(key as ConfigKey)) {
        process.stderr.write(`Unknown config key: ${key}\n`);
        process.exit(1);
      }

      try {
        const config = await readConfig();
        const value = config[key as ConfigKey];
        if (value !== undefined) {
          process.stdout.write(`${value}\n`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg) process.stderr.write(`${msg}\n`);
        process.exit(1);
      }
      process.exit(0);
    });

  config
    .command('list')
    .description('List all config values')
    .action(async () => {
      try {
        const config = await readConfig();
        const rows = VALID_KEYS.filter((k) => config[k as ConfigKey] !== undefined).map((k) => ({
          key: k,
          value: String(config[k as ConfigKey]),
        }));

        if (rows.length === 0) {
          return;
        }

        const outputFormat = resolveFormat(program.opts().format, config.defaultFormat);
        let output: string;
        if (outputFormat === 'table') {
          output = formatTable(rows, COLUMNS);
        } else {
          output = formatJson(rows);
        }
        process.stdout.write(`${output}\n`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg) process.stderr.write(`${msg}\n`);
        process.exit(1);
      }
    });
}
