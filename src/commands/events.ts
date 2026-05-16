import { access, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { Command } from 'commander';
import client from '../client.js';
import { resolveAthleteId } from '../config.js';
import { readInput } from '../input.js';
import type { ColumnDef } from '../output.js';
import { printOutput } from '../utils/output-helpers.js';
import { validateEvent } from '../utils/validation.js';

const EVENT_COLUMNS: ColumnDef[] = [
  { key: 'id', header: 'ID' },
  { key: 'name', header: 'Name' },
  { key: 'start_date_local', header: 'Start Date' },
  { key: 'category', header: 'Category' },
  { key: 'distance', header: 'Distance' },
  { key: 'moving_time', header: 'Moving Time' },
  { key: 'icu_training_load', header: 'Training Load' },
];

const EVENT_PLAIN_FIELD_ORDER = [
  'id',
  'name',
  'start_date_local',
  'category',
  'distance',
  'moving_time',
  'icu_training_load',
] as const;
const EVENT_PLAIN_FIELD_HEADERS: Record<string, string> = {
  id: 'ID',
  name: 'Name',
  start_date_local: 'Start Date',
  category: 'Category',
  distance: 'Distance',
  moving_time: 'Moving Time',
  icu_training_load: 'Training Load',
};

const EVENT_CATEGORIES = [
  'WORKOUT',
  'RACE_A',
  'RACE_B',
  'RACE_C',
  'NOTE',
  'PLAN',
  'HOLIDAY',
  'SICK',
  'INJURED',
  'SET_EFTP',
  'FITNESS_DAYS',
  'SEASON_START',
  'TARGET',
  'SET_FITNESS',
] as const;

const ALLOWED_EXTENSIONS = ['.zwo', '.mrc', '.erg', '.fit'] as const;

function handleError(status: number, error?: unknown): never {
  if (status === 401) {
    process.stderr.write('Authentication failed. Check your credentials.\n');
  } else if (status === 403) {
    process.stderr.write('Access denied for this resource.\n');
  } else if (status === 404) {
    process.stderr.write('Resource not found.\n');
  } else if (error) {
    process.stderr.write(`Error: ${typeof error === 'string' ? error : JSON.stringify(error)}\n`);
  } else {
    process.stderr.write(`Error: HTTP ${status}\n`);
  }
  process.exit(1);
}

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

function validateDate(dateStr: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) {
    return false;
  }
  const date = new Date(dateStr);
  return !Number.isNaN(date.getTime());
}

function validateDateNotFuture(dateStr: string): boolean {
  if (!validateDate(dateStr)) {
    return false;
  }
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return date <= today;
}

function validateCategories(categoriesStr: string): boolean {
  const categories = categoriesStr.split(',').map((c) => c.trim().toUpperCase());
  for (const cat of categories) {
    if (!EVENT_CATEGORIES.includes(cat as (typeof EVENT_CATEGORIES)[number])) {
      return false;
    }
  }
  return true;
}

function validateLimit(limitStr: string): boolean {
  const num = Number(limitStr);
  return Number.isInteger(num) && num > 0;
}

function validateEventId(eventIdStr: string): boolean {
  const num = Number(eventIdStr);
  return Number.isInteger(num) && num > 0;
}

function validateExtension(ext: string): boolean {
  const normalized = ext.startsWith('.') ? ext : `.${ext}`;
  return ALLOWED_EXTENSIONS.includes(normalized as (typeof ALLOWED_EXTENSIONS)[number]);
}

async function validateOutputPath(outputPath: string): Promise<boolean> {
  try {
    const dir = dirname(outputPath);
    if (dir === '.' || dir === '') {
      return true;
    }
    await access(dir);
    return true;
  } catch {
    return false;
  }
}

export function register(program: Command): void {
  const cmd = program.command('events').description('Manage events');

  cmd
    .command('list')
    .description('List events')
    .option('--oldest <date>', 'Oldest date (ISO-8601), default is today')
    .option('--newest <date>', 'Newest date (ISO-8601), default is oldest + 6 days')
    .option('--category <categories>', 'Comma-separated categories to filter')
    .option('--limit <number>', 'Maximum number of events to return')
    .option('--csv', 'Output as CSV instead of JSON')
    .action(
      async (options: {
        oldest?: string;
        newest?: string;
        category?: string;
        limit?: string;
        csv?: boolean;
      }) => {
        if (options.oldest && !validateDateNotFuture(options.oldest)) {
          process.stderr.write('Error: --oldest must be a valid date and not in the future\n');
          process.exit(1);
        }
        if (options.newest && !validateDate(options.newest)) {
          process.stderr.write('Error: --newest must be a valid date\n');
          process.exit(1);
        }
        if (options.category && !validateCategories(options.category)) {
          const validCategories = EVENT_CATEGORIES.join(', ');
          process.stderr.write(
            `Error: --category must be a comma-separated list of valid categories: ${validCategories}\n`,
          );
          process.exit(1);
        }
        if (options.limit && !validateLimit(options.limit)) {
          process.stderr.write('Error: --limit must be a positive integer\n');
          process.exit(1);
        }

        const athleteId = await resolveId(undefined);
        const format = options.csv ? '.csv' : '';

        const { data, error, response } = await client.GET('/api/v1/athlete/{id}/events{format}', {
          params: { path: { id: athleteId, format } },
          query: {
            oldest: options.oldest,
            newest: options.newest,
            category: options.category
              ? options.category.split(',').map((c) => c.trim().toUpperCase())
              : undefined,
            limit: options.limit ? parseInt(options.limit, 10) : undefined,
          },
        });

        if (error) {
          handleError(response?.status ?? 0, error);
          return;
        }

        if (options.csv) {
          process.stdout.write(data as string);
          process.exit(0);
        }

        await printOutput(
          program,
          data,
          EVENT_COLUMNS,
          EVENT_PLAIN_FIELD_ORDER,
          EVENT_PLAIN_FIELD_HEADERS,
        );
        process.exit(0);
      },
    );

  cmd
    .command('get <eventId>')
    .description('Get event by ID')
    .action(async (eventId: string) => {
      if (!validateEventId(eventId)) {
        process.stderr.write('Error: eventId must be a valid integer\n');
        process.exit(1);
      }

      const athleteId = await resolveId(undefined);
      const { data, error, response } = await client.GET('/api/v1/athlete/{id}/events/{eventId}', {
        params: { path: { id: athleteId, eventId: parseInt(eventId, 10) } },
      });

      if (error) {
        handleError(response?.status ?? 0, error);
        return;
      }

      await printOutput(
        program,
        data,
        EVENT_COLUMNS,
        EVENT_PLAIN_FIELD_ORDER,
        EVENT_PLAIN_FIELD_HEADERS,
      );
      process.exit(0);
    });

  cmd
    .command('create')
    .description('Create an event (use --file to provide JSON)')
    .option('--file <path>', 'JSON file with event data (or - for stdin)')
    .option('--force', 'Update event with matching uid instead of creating new')
    .action(async (options: { file?: string; force?: boolean }) => {
      const athleteId = await resolveId(undefined);

      let body: unknown = null;
      if (options.file) {
        body = await readInput(options.file);
        if (body === null) {
          process.stderr.write('Error: --file requires JSON input\n');
          process.exit(1);
        }
      } else {
        process.stderr.write('Error: --file is required\n');
        process.exit(1);
      }

      const validationErrors = validateEvent(body as Record<string, unknown>);
      if (validationErrors.length > 0) {
        process.stderr.write('Error: Invalid event data:\n');
        for (const err of validationErrors) {
          process.stderr.write(`  - ${err}\n`);
        }
        process.exit(1);
      }

      const { data, error, response } = await client.POST('/api/v1/athlete/{id}/events', {
        params: { path: { id: athleteId } },
        query: { upsertOnUid: options.force ?? false },
        body: body as object,
      });

      if (error) {
        handleError(response?.status ?? 0, error);
        return;
      }

      await printOutput(
        program,
        data,
        EVENT_COLUMNS,
        EVENT_PLAIN_FIELD_ORDER,
        EVENT_PLAIN_FIELD_HEADERS,
      );
      process.exit(0);
    });

  cmd
    .command('update <eventId>')
    .description('Update an event (use --file to provide JSON)')
    .option('--file <path>', 'JSON file with event data (or - for stdin)')
    .action(async (eventId: string, options: { file?: string }) => {
      if (!validateEventId(eventId)) {
        process.stderr.write('Error: eventId must be a valid integer\n');
        process.exit(1);
      }

      const athleteId = await resolveId(undefined);

      let body: unknown = null;
      if (options.file) {
        body = await readInput(options.file);
        if (body === null) {
          process.stderr.write('Error: --file requires JSON input\n');
          process.exit(1);
        }
      } else {
        process.stderr.write('Error: --file is required\n');
        process.exit(1);
      }

      const validationErrors = validateEvent(body as Record<string, unknown>);
      if (validationErrors.length > 0) {
        process.stderr.write('Error: Invalid event data:\n');
        for (const err of validationErrors) {
          process.stderr.write(`  - ${err}\n`);
        }
        process.exit(1);
      }

      const { data, error, response } = await client.PUT('/api/v1/athlete/{id}/events/{eventId}', {
        params: { path: { id: athleteId, eventId: parseInt(eventId, 10) } },
        body: body as object,
      });

      if (error) {
        handleError(response?.status ?? 0, error);
        return;
      }

      await printOutput(
        program,
        data,
        EVENT_COLUMNS,
        EVENT_PLAIN_FIELD_ORDER,
        EVENT_PLAIN_FIELD_HEADERS,
      );
      process.exit(0);
    });

  cmd
    .command('delete <eventId>')
    .description('Delete an event')
    .option('--others', 'Also delete other events added at the same time')
    .action(async (eventId: string, options: { others?: boolean }) => {
      if (!validateEventId(eventId)) {
        process.stderr.write('Error: eventId must be a valid integer\n');
        process.exit(1);
      }

      const athleteId = await resolveId(undefined);
      const { error, response } = await client.DELETE('/api/v1/athlete/{id}/events/{eventId}', {
        params: { path: { id: athleteId, eventId: parseInt(eventId, 10) } },
        query: { others: options.others },
      });

      if (error) {
        handleError(response?.status ?? 0, error);
        return;
      }

      process.stdout.write(`Deleted event: ${eventId}\n`);
      process.exit(0);
    });

  cmd
    .command('download <eventId>')
    .description('Download event as workout file')
    .requiredOption('--ext <extension>', 'File extension (.zwo, .mrc, .erg, .fit)')
    .option('--output <path>', 'Output file path (or stdout if not specified)')
    .action(async (eventId: string, options: { ext: string; output?: string }) => {
      if (!validateEventId(eventId)) {
        process.stderr.write('Error: eventId must be a valid integer\n');
        process.exit(1);
      }

      if (!validateExtension(options.ext)) {
        const validExts = ALLOWED_EXTENSIONS.join(', ');
        process.stderr.write(`Error: --ext must be one of: ${validExts}\n`);
        process.exit(1);
      }

      if (options.output) {
        const isValidPath = await validateOutputPath(options.output);
        if (!isValidPath) {
          process.stderr.write(
            'Error: --output path is invalid or parent directory does not exist\n',
          );
          process.exit(1);
        }
      }

      const athleteId = await resolveId(undefined);
      const ext = options.ext.startsWith('.') ? options.ext : `.${options.ext}`;

      const { data, error, response } = await client.GET(
        '/api/v1/athlete/{id}/events/{eventId}/download{ext}',
        {
          params: { path: { id: athleteId, eventId: parseInt(eventId, 10), ext } },
          parseAs: 'arrayBuffer',
        },
      );

      if (error) {
        handleError(response?.status ?? 0, error);
        return;
      }

      const buffer = Buffer.from(data as ArrayBuffer);
      if (options.output) {
        await writeFile(options.output, buffer);
        process.stdout.write(`Saved workout file to: ${options.output}\n`);
      } else {
        process.stdout.write(buffer);
      }
      process.exit(0);
    });
}
