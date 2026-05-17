import type { Command } from 'commander';
import client from '../client.js';
import { resolveAthleteId } from '../config.js';
import type { ColumnDef } from '../output.js';
import { handleHttpError } from '../utils/api-helpers.js';
import { printOutput } from '../utils/output-helpers.js';
import {
  readCsvFile,
  readCsvFromStdin,
  readJsonFile,
  validateDate,
  validateDateNotFuture,
  validateWellness,
} from '../utils/validation.js';

const WELLNESS_COLUMNS: ColumnDef[] = [
  { key: 'id', header: 'ID' },
  { key: 'updated', header: 'Last Updated' },
  { key: 'ctl', header: 'Fitness' },
  { key: 'atl', header: 'Fatigue' },
  { key: 'weight', header: 'Weight' },
  { key: 'restingHR', header: 'Resting HR' },
  { key: 'hrv', header: 'HRV' },
];

const WELLNESS_PLAIN_FIELD_ORDER = [
  'id',
  'updated',
  'ctl',
  'atl',
  'weight',
  'restingHR',
  'hrv',
] as const;

const WELLNESS_PLAIN_FIELD_HEADERS: Record<string, string> = {
  id: 'ID',
  updated: 'Last Updated',
  ctl: 'Fitness',
  atl: 'Fatigue',
  weight: 'Weight',
  restingHR: 'Resting HR',
  hrv: 'HRV',
};

async function resolveId(id: string | undefined): Promise<string> {
  const resolved = await resolveAthleteId(id);
  if (!resolved) {
    process.stderr.write(
      'Error: athlete ID is required. Provide it as an argument, set ICU_ATHLETE_ID env var, or run "icu whoami --save".\n',
    );
    process.exit(1);
  }
  return resolved;
}

export function register(program: Command): void {
  const cmd = program.command('wellness').description('Manage wellness records');

  cmd
    .command('list')
    .description('List wellness records')
    .option('--oldest <date>', 'Oldest date (ISO-8601), default is today')
    .option('--newest <date>', 'Newest date (ISO-8601), default is oldest + 6 days')
    .option('--fields <fields>', 'Comma-separated list of field names to include')
    .action(async (options: { oldest?: string; newest?: string; fields?: string }) => {
      if (options.oldest && !validateDateNotFuture(options.oldest)) {
        process.stderr.write('Error: --oldest must be a valid date and not in the future\n');
        process.exit(1);
      }
      if (options.newest && !validateDate(options.newest)) {
        process.stderr.write('Error: --newest must be a valid date\n');
        process.exit(1);
      }

      const athleteId = await resolveId(undefined);

      const { data, error, response } = await client.GET('/api/v1/athlete/{id}/wellness', {
        params: { path: { id: athleteId } },
        query: {
          oldest: options.oldest,
          newest: options.newest,
          fields: options.fields,
        },
      });

      if (error) {
        handleHttpError(response?.status ?? 0, error);
        return;
      }

      await printOutput(
        program,
        data,
        WELLNESS_COLUMNS,
        WELLNESS_PLAIN_FIELD_ORDER,
        WELLNESS_PLAIN_FIELD_HEADERS,
      );
      process.exit(0);
    });

  cmd
    .command('get <date>')
    .description('Get wellness record by date (ISO-8601 format)')
    .action(async (date: string) => {
      if (!validateDate(date)) {
        process.stderr.write('Error: date must be a valid ISO-8601 date (YYYY-MM-DD)\n');
        process.exit(1);
      }

      const athleteId = await resolveId(undefined);
      const { data, error, response } = await client.GET('/api/v1/athlete/{id}/wellness/{date}', {
        params: { path: { id: athleteId, date } },
      });

      if (error) {
        handleHttpError(response?.status ?? 0, error);
        return;
      }

      await printOutput(
        program,
        data,
        WELLNESS_COLUMNS,
        WELLNESS_PLAIN_FIELD_ORDER,
        WELLNESS_PLAIN_FIELD_HEADERS,
      );
      process.exit(0);
    });

  cmd
    .command('update <date>')
    .description('Update wellness record by date (ISO-8601 format, use --file to provide JSON)')
    .requiredOption('--file <path>', 'JSON file with wellness data')
    .action(async (date: string, options: { file: string }) => {
      if (!validateDate(date)) {
        process.stderr.write('Error: date must be a valid ISO-8601 date (YYYY-MM-DD)\n');
        process.exit(1);
      }

      const athleteId = await resolveId(undefined);

      let body: Record<string, unknown>;
      try {
        body = await readJsonFile<Record<string, unknown>>(options.file);
      } catch (err) {
        const error = err as Error;
        if (error.message.startsWith('File not found:')) {
          process.stderr.write(`Error: ${error.message}\n`);
        } else {
          process.stderr.write(`Invalid JSON in file: ${error.message}\n`);
        }
        process.exit(1);
      }

      const validationErrors = validateWellness(body);
      if (validationErrors.length > 0) {
        process.stderr.write('Error: Invalid wellness data:\n');
        for (const err of validationErrors) {
          process.stderr.write(`  - ${err}\n`);
        }
        process.exit(1);
      }

      const { data, error, response } = await client.PUT('/api/v1/athlete/{id}/wellness/{date}', {
        params: { path: { id: athleteId, date } },
        body,
      });

      if (error) {
        handleHttpError(response?.status ?? 0, error);
        return;
      }

      await printOutput(
        program,
        data,
        WELLNESS_COLUMNS,
        WELLNESS_PLAIN_FIELD_ORDER,
        WELLNESS_PLAIN_FIELD_HEADERS,
      );
      process.exit(0);
    });

  cmd
    .command('upload')
    .description('Upload wellness records from CSV file')
    .requiredOption('--file <path>', 'CSV file with wellness data (or - for stdin)')
    .option('--ignoreMissingFields', 'Ignore missing fields in CSV', false)
    .action(async (options: { file: string; ignoreMissingFields?: boolean }) => {
      const isStdin = options.file === '-';

      const athleteId = await resolveId(undefined);

      let csvContent: string;
      try {
        csvContent = isStdin ? await readCsvFromStdin() : await readCsvFile(options.file);
      } catch (err) {
        const error = err as Error;
        if (error.message.startsWith('File not found:')) {
          process.stderr.write(`Error: ${error.message}\n`);
        } else {
          process.stderr.write('Error: --file must contain valid CSV content\n');
        }
        process.exit(1);
      }

      const {
        data: _data,
        error,
        response,
      } = await client.POST('/api/v1/athlete/{id}/wellness{ext}', {
        params: { path: { id: athleteId, ext: '' } },
        query: { ignoreMissingFields: options.ignoreMissingFields ?? false },
        body: csvContent,
        headers: { 'Content-Type': 'text/csv' },
      });

      if (error) {
        handleHttpError(response?.status ?? 0, error);
        return;
      }

      process.stdout.write('Upload successful.\n');
      process.exit(0);
    });
}
