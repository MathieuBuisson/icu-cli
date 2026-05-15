import { access, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { Command } from 'commander';
import client from '../client.js';
import { resolveAthleteId } from '../config.js';
import { readInput } from '../input.js';
import { type ColumnDef, formatJson } from '../output.js';
import { printOutput } from '../output-helpers.js';

const ACTIVITY_COLUMNS: ColumnDef[] = [
  { key: 'id', header: 'ID' },
  { key: 'name', header: 'Name' },
  { key: 'start_date_local', header: 'Start Date' },
  { key: 'distance', header: 'Distance' },
  { key: 'elapsed_time', header: 'Elapsed Time' },
  { key: 'icu_training_load', header: 'Training Load' },
  { key: 'icu_joules', header: 'Work (kJ)' },
];

const ACTIVITY_PLAIN_FIELD_ORDER = [
  'id',
  'name',
  'start_date_local',
  'distance',
  'elapsed_time',
  'icu_training_load',
  'icu_joules',
] as const;
const ACTIVITY_PLAIN_FIELD_HEADERS: Record<string, string> = {
  id: 'ID',
  name: 'Name',
  start_date_local: 'Start Date',
  distance: 'Distance',
  elapsed_time: 'Elapsed Time',
  icu_training_load: 'Training Load',
  icu_joules: 'Work (kJ)',
};

const HIDDEN_COLUMNS: ColumnDef[] = [
  { key: 'id', header: 'ID' },
  { key: 'icu_athlete_id', header: 'Athlete ID' },
  { key: 'start_date_local', header: 'Start Date' },
  { key: 'source', header: 'Source' },
];

const HIDDEN_PLAIN_FIELD_ORDER = ['id', 'icu_athlete_id', 'start_date_local', 'source'] as const;
const HIDDEN_PLAIN_FIELD_HEADERS: Record<string, string> = {
  id: 'ID',
  icu_athlete_id: 'Athlete ID',
  start_date_local: 'Start Date',
  source: 'Source',
};

const SEARCH_COLUMNS: ColumnDef[] = [
  { key: 'id', header: 'ID' },
  { key: 'name', header: 'Name' },
  { key: 'start_date_local', header: 'Start Date' },
  { key: 'distance', header: 'Distance' },
  { key: 'type', header: 'Type' },
  { key: 'race', header: 'Race' },
  { key: 'moving_time', header: 'Moving Time' },
];

const SEARCH_PLAIN_FIELD_ORDER = [
  'id',
  'name',
  'start_date_local',
  'distance',
  'type',
  'race',
  'moving_time',
] as const;
const SEARCH_PLAIN_FIELD_HEADERS: Record<string, string> = {
  id: 'ID',
  name: 'Name',
  start_date_local: 'Start Date',
  distance: 'Distance',
  type: 'Type',
  race: 'Race',
  moving_time: 'Moving Time',
};

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

function isHidden(data: unknown): boolean {
  return (
    data !== null &&
    typeof data === 'object' &&
    'source' in data &&
    !Object.hasOwn(data as Record<string, unknown>, 'name')
  );
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

function validateLimit(limitStr: string): boolean {
  const num = Number(limitStr);
  return Number.isInteger(num) && num > 0;
}

export function register(program: Command): void {
  const cmd = program.command('activities').description('Manage activities');

  cmd
    .command('list')
    .description('List activities')
    .requiredOption('--oldest <date>', 'Oldest date (ISO-8601)')
    .option('--newest <date>', 'Newest date (ISO-8601)')
    .option('--limit <number>', 'Limit number of activities')
    .option('--fields <fields>', 'Comma-separated fields to include')
    .action(
      async (options: { oldest: string; newest?: string; limit?: string; fields?: string }) => {
        if (options.limit && !validateLimit(options.limit)) {
          process.stderr.write('Error: --limit must be a positive integer\n');
          process.exit(1);
        }

        const athleteId = await resolveId(undefined);

        const { data, error, response } = await client.GET('/api/v1/athlete/{id}/activities', {
          params: { path: { id: athleteId } },
          query: {
            oldest: options.oldest,
            newest: options.newest,
            limit: options.limit ? Number(options.limit) : undefined,
            fields: options.fields ? options.fields.split(',') : undefined,
          },
        });

        if (error) {
          handleError(response?.status ?? 0, error);
          return;
        }

        await printOutput(
          program,
          data,
          ACTIVITY_COLUMNS,
          ACTIVITY_PLAIN_FIELD_ORDER,
          ACTIVITY_PLAIN_FIELD_HEADERS,
        );
        process.exit(0);
      },
    );

  cmd
    .command('get <activityId>')
    .description('Get activity by ID')
    .option('--intervals', 'Include interval data')
    .action(async (activityId: string, options: { intervals?: boolean }) => {
      const { data, error, response } = await client.GET('/api/v1/activity/{id}', {
        params: { path: { id: activityId } },
        query: { intervals: options.intervals },
      });

      if (error) {
        handleError(response?.status ?? 0, error);
        return;
      }

      const columns = isHidden(data) ? HIDDEN_COLUMNS : ACTIVITY_COLUMNS;
      const plainOrder = isHidden(data) ? HIDDEN_PLAIN_FIELD_ORDER : ACTIVITY_PLAIN_FIELD_ORDER;
      const plainHeaders = isHidden(data)
        ? HIDDEN_PLAIN_FIELD_HEADERS
        : ACTIVITY_PLAIN_FIELD_HEADERS;

      await printOutput(program, data, columns, plainOrder, plainHeaders);
      process.exit(0);
    });

  cmd
    .command('create')
    .description('Create a manual activity (use --file to provide JSON)')
    .option('--file <path>', 'JSON file with activity data (or - for stdin)')
    .action(async (options: { file?: string }) => {
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

      const { data, error, response } = await client.POST(
        '/api/v1/athlete/{id}/activities/manual',
        {
          params: { path: { id: athleteId } },
          body: body as object,
        },
      );

      if (error) {
        handleError(response?.status ?? 0, error);
        return;
      }

      await printOutput(
        program,
        data,
        ACTIVITY_COLUMNS,
        ACTIVITY_PLAIN_FIELD_ORDER,
        ACTIVITY_PLAIN_FIELD_HEADERS,
      );
      process.exit(0);
    });

  cmd
    .command('upload <filepath>')
    .description('Upload an activity file')
    .option('--name <name>', 'Activity name')
    .option('--description <desc>', 'Activity description')
    .action(async (filepath: string, options: { name?: string; description?: string }) => {
      const athleteId = await resolveId(undefined);

      const fileBuffer = await readFile(filepath);
      const fileBlob = new Blob([fileBuffer]);
      const formData = new FormData();
      formData.append('file', fileBlob, filepath);

      const { data, error, response } = await client.POST('/api/v1/athlete/{id}/activities', {
        params: { path: { id: athleteId } },
        query: { name: options.name, description: options.description },
        body: formData as unknown as object,
      });

      if (error) {
        handleError(response?.status ?? 0, error);
        return;
      }

      await printOutput(
        program,
        data,
        ACTIVITY_COLUMNS,
        ACTIVITY_PLAIN_FIELD_ORDER,
        ACTIVITY_PLAIN_FIELD_HEADERS,
      );
      process.exit(0);
    });

  cmd
    .command('update <activityId>')
    .description('Update an activity (use --file to provide JSON)')
    .option('--file <path>', 'JSON file with activity data (or - for stdin)')
    .action(async (activityId: string, options: { file?: string }) => {
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

      const { data, error, response } = await client.PUT('/api/v1/activity/{id}', {
        params: { path: { id: activityId } },
        body: body as object,
      });

      if (error) {
        handleError(response?.status ?? 0, error);
        return;
      }

      const columns = isHidden(data) ? HIDDEN_COLUMNS : ACTIVITY_COLUMNS;
      const plainOrder = isHidden(data) ? HIDDEN_PLAIN_FIELD_ORDER : ACTIVITY_PLAIN_FIELD_ORDER;
      const plainHeaders = isHidden(data)
        ? HIDDEN_PLAIN_FIELD_HEADERS
        : ACTIVITY_PLAIN_FIELD_HEADERS;

      await printOutput(program, data, columns, plainOrder, plainHeaders);
      process.exit(0);
    });

  cmd
    .command('delete <activityId>')
    .description('Delete an activity')
    .action(async (activityId: string) => {
      const { data, error, response } = await client.DELETE('/api/v1/activity/{id}', {
        params: { path: { id: activityId } },
      });

      if (error) {
        handleError(response?.status ?? 0, error);
        return;
      }

      process.stdout.write(`Deleted activity: ${data.id}\n`);
      process.exit(0);
    });

  cmd
    .command('search')
    .description('Search activities')
    .requiredOption('--query <query>', 'Search query')
    .option('--limit <number>', 'Limit number of results')
    .action(async (options: { query: string; limit?: string }) => {
      if (options.limit && !validateLimit(options.limit)) {
        process.stderr.write('Error: --limit must be a positive integer\n');
        process.exit(1);
      }

      const athleteId = await resolveId(undefined);

      const { data, error, response } = await client.GET('/api/v1/athlete/{id}/activities/search', {
        params: { path: { id: athleteId } },
        query: {
          query: options.query,
          limit: options.limit ? Number(options.limit) : undefined,
        },
      });

      if (error) {
        handleError(response?.status ?? 0, error);
        return;
      }

      await printOutput(
        program,
        data,
        SEARCH_COLUMNS,
        SEARCH_PLAIN_FIELD_ORDER,
        SEARCH_PLAIN_FIELD_HEADERS,
      );
      process.exit(0);
    });

  cmd
    .command('streams <activityId>')
    .description('Get activity streams')
    .option(
      '--types <types>',
      'Comma-separated stream types (e.g. watts,heartrate,cadence,run_cadence,altitude)',
    )
    .action(async (activityId: string, options: { types?: string }) => {
      const { data, error, response } = await client.GET('/api/v1/activity/{id}/streams', {
        params: { path: { id: activityId } },
        query: { types: options.types ? options.types.split(',') : undefined },
      });

      if (error) {
        handleError(response?.status ?? 0, error);
        return;
      }

      process.stdout.write(`${formatJson(data)}\n`);
      process.exit(0);
    });

  cmd
    .command('intervals <activityId>')
    .description('Get activity intervals')
    .action(async (activityId: string) => {
      const { data, error, response } = await client.GET('/api/v1/activity/{id}/intervals', {
        params: { path: { id: activityId } },
      });

      if (error) {
        handleError(response?.status ?? 0, error);
        return;
      }

      process.stdout.write(`${formatJson(data)}\n`);
      process.exit(0);
    });

  cmd
    .command('download-fit <activityId>')
    .description('Download activity as FIT file')
    .option('--output <path>', 'Output file path (or stdout if not specified)')
    .action(async (activityId: string, options: { output?: string }) => {
      if (options.output) {
        const isValidPath = await validateOutputPath(options.output);
        if (!isValidPath) {
          process.stderr.write(
            'Error: --output path is invalid or parent directory does not exist\n',
          );
          process.exit(1);
        }
      }

      const { data, error, response } = await client.GET('/api/v1/activity/{id}/fit-file', {
        params: { path: { id: activityId } },
        parseAs: 'arrayBuffer',
      });

      if (error) {
        handleError(response?.status ?? 0, error);
        return;
      }

      const buffer = Buffer.from(data as ArrayBuffer);
      if (options.output) {
        await writeFile(options.output, buffer);
        process.stdout.write(`Saved FIT file to: ${options.output}\n`);
      } else {
        process.stdout.write(buffer);
      }
      process.exit(0);
    });

  cmd
    .command('download-gpx <activityId>')
    .description('Download activity as GPX file')
    .option('--output <path>', 'Output file path (or stdout if not specified)')
    .action(async (activityId: string, options: { output?: string }) => {
      if (options.output) {
        const isValidPath = await validateOutputPath(options.output);
        if (!isValidPath) {
          process.stderr.write(
            'Error: --output path is invalid or parent directory does not exist\n',
          );
          process.exit(1);
        }
      }

      const { data, error, response } = await client.GET('/api/v1/activity/{id}/gpx-file', {
        params: { path: { id: activityId } },
        parseAs: 'arrayBuffer',
      });

      if (error) {
        handleError(response?.status ?? 0, error);
        return;
      }

      const buffer = Buffer.from(data as ArrayBuffer);
      if (options.output) {
        await writeFile(options.output, buffer);
        process.stdout.write(`Saved GPX file to: ${options.output}\n`);
      } else {
        process.stdout.write(buffer);
      }
      process.exit(0);
    });
}
