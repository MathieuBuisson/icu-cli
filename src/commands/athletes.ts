import type { Command } from 'commander';
import client from '../client.js';
import { readConfig, resolveAthleteId } from '../config.js';
import { readInput } from '../input.js';
import { type ColumnDef, formatJson, formatTable, resolveFormat } from '../output.js';

const ATHLETE_COLUMNS: ColumnDef[] = [
  { key: 'id', header: 'ID' },
  { key: 'name', header: 'Name' },
  { key: 'email', header: 'Email' },
  { key: 'city', header: 'City' },
  { key: 'country', header: 'Country' },
  { key: 'timezone', header: 'Timezone' },
  { key: 'sex', header: 'Sex' },
];

const ATHLETE_PLAIN_FIELD_ORDER = [
  'id',
  'name',
  'email',
  'city',
  'country',
  'timezone',
  'sex',
] as const;
const ATHLETE_PLAIN_FIELD_HEADERS: Record<string, string> = {
  id: 'Athlete ID',
  name: 'Name',
  email: 'Email',
  city: 'City',
  country: 'Country',
  timezone: 'Timezone',
  sex: 'Sex',
};

const TRAINING_PLAN_COLUMNS: ColumnDef[] = [
  { key: 'athlete_id', header: 'Athlete ID' },
  { key: 'training_plan_id', header: 'Training Plan ID' },
  { key: 'training_plan_start_date', header: 'Start Date' },
  { key: 'timezone', header: 'Timezone' },
  { key: 'training_plan_last_applied', header: 'Last Applied' },
  { key: 'training_plan_alias', header: 'Training Plan Alias' },
];

const TRAINING_PLAN_PLAIN_FIELD_ORDER = [
  'athlete_id',
  'training_plan_id',
  'training_plan_start_date',
  'timezone',
  'training_plan_last_applied',
  'training_plan_alias',
] as const;
const TRAINING_PLAN_PLAIN_FIELD_HEADERS: Record<string, string> = {
  athlete_id: 'Athlete ID',
  training_plan_id: 'Training Plan ID',
  training_plan_start_date: 'Start Date',
  timezone: 'Timezone',
  training_plan_last_applied: 'Last Applied',
  training_plan_alias: 'Training Plan Alias',
};

const SUMMARY_COLUMNS: ColumnDef[] = [
  { key: 'count', header: 'Count' },
  { key: 'time', header: 'Time' },
  { key: 'moving_time', header: 'Moving Time' },
  { key: 'calories', header: 'Calories' },
  { key: 'training_load', header: 'Training Load' },
  { key: 'srpe', header: 'Session RPE' },
  { key: 'distance', header: 'Distance' },
];

const SUMMARY_PLAIN_FIELD_ORDER = [
  'count',
  'time',
  'moving_time',
  'calories',
  'training_load',
  'srpe',
  'distance',
] as const;
const SUMMARY_PLAIN_FIELD_HEADERS: Record<string, string> = {
  count: 'Count',
  time: 'Time',
  moving_time: 'Moving Time',
  calories: 'Calories',
  training_load: 'Training Load',
  srpe: 'Session RPE',
  distance: 'Distance',
};

function handleError(error: unknown, _operation: string): never {
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
  const cmd = program.command('athletes').description('Manage athletes');

  cmd
    .command('get [id]')
    .description('Get athlete by ID')
    .action(async (id: string | undefined) => {
      const athleteId = await resolveId(id);
      const { data, error } = await client.GET('/api/v1/athlete/{id}', {
        params: { path: { id: athleteId } },
      });

      if (error) {
        handleError(error, 'get');
        return;
      }

      const config = await readConfig();
      const format = resolveFormat(program.opts().format, config.defaultFormat);

      if (format === 'table') {
        process.stdout.write(`${formatTable(data, ATHLETE_COLUMNS)}\n`);
      } else if (format === 'plain') {
        const lines: string[] = [];
        for (const key of ATHLETE_PLAIN_FIELD_ORDER) {
          const value = data[key as keyof typeof data];
          if (value !== undefined && value !== null) {
            lines.push(`${ATHLETE_PLAIN_FIELD_HEADERS[key]}: ${value}`);
          }
        }
        process.stdout.write(`${lines.join('\n')}\n`);
      } else {
        process.stdout.write(`${formatJson(data)}\n`);
      }
      process.exit(0);
    });

  cmd
    .command('update [id]')
    .description('Update athlete by ID (use --file to provide JSON)')
    .option('--file <path>', 'JSON file with athlete data (or - for stdin)')
    .action(async (id: string | undefined, options: { file?: string }) => {
      const athleteId = await resolveId(id);

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

      const { data, error } = await client.PUT('/api/v1/athlete/{id}', {
        params: { path: { id: athleteId } },
        body: body as object,
      });

      if (error) {
        handleError(error, 'update');
        return;
      }

      const config = await readConfig();
      const format = resolveFormat(program.opts().format, config.defaultFormat);

      if (format === 'table') {
        process.stdout.write(`${formatTable(data, ATHLETE_COLUMNS)}\n`);
      } else if (format === 'plain') {
        const lines: string[] = [];
        for (const key of ATHLETE_PLAIN_FIELD_ORDER) {
          const value = data[key as keyof typeof data];
          if (value !== undefined && value !== null) {
            lines.push(`${ATHLETE_PLAIN_FIELD_HEADERS[key]}: ${value}`);
          }
        }
        process.stdout.write(`${lines.join('\n')}\n`);
      } else {
        process.stdout.write(`${formatJson(data)}\n`);
      }
      process.exit(0);
    });

  cmd
    .command('profile [id]')
    .description('Get athlete profile')
    .action(async (id: string | undefined) => {
      const athleteId = await resolveId(id);
      const { data, error } = await client.GET('/api/v1/athlete/{id}/profile', {
        params: { path: { id: athleteId } },
      });

      if (error) {
        handleError(error, 'profile');
        return;
      }

      const athleteData = (data as { athlete?: Record<string, unknown> }).athlete;
      if (!athleteData) {
        process.stderr.write('Error: no profile data returned\n');
        process.exit(1);
      }

      const config = await readConfig();
      const format = resolveFormat(program.opts().format, config.defaultFormat);

      if (format === 'table') {
        process.stdout.write(`${formatTable(athleteData, ATHLETE_COLUMNS)}\n`);
      } else if (format === 'plain') {
        const lines: string[] = [];
        for (const key of ATHLETE_PLAIN_FIELD_ORDER) {
          const value = athleteData[key];
          if (value !== undefined && value !== null) {
            lines.push(`${ATHLETE_PLAIN_FIELD_HEADERS[key]}: ${value}`);
          }
        }
        process.stdout.write(`${lines.join('\n')}\n`);
      } else {
        process.stdout.write(`${formatJson(data)}\n`);
      }
      process.exit(0);
    });

  const trainingPlan = cmd.command('training-plan').description('Manage training plans');

  trainingPlan
    .command('get [id]')
    .description('Get athlete training plan')
    .action(async (id: string | undefined) => {
      const athleteId = await resolveId(id);
      const { data, error } = await client.GET('/api/v1/athlete/{id}/training-plan', {
        params: { path: { id: athleteId } },
      });

      if (error) {
        handleError(error, 'training-plan get');
        return;
      }

      const config = await readConfig();
      const format = resolveFormat(program.opts().format, config.defaultFormat);

      if (format === 'table') {
        process.stdout.write(`${formatTable(data, TRAINING_PLAN_COLUMNS)}\n`);
      } else if (format === 'plain') {
        const lines: string[] = [];
        for (const key of TRAINING_PLAN_PLAIN_FIELD_ORDER) {
          const value = data[key as keyof typeof data];
          if (value !== undefined && value !== null) {
            lines.push(`${TRAINING_PLAN_PLAIN_FIELD_HEADERS[key]}: ${value}`);
          }
        }
        process.stdout.write(`${lines.join('\n')}\n`);
      } else {
        process.stdout.write(`${formatJson(data)}\n`);
      }
      process.exit(0);
    });

  trainingPlan
    .command('update [id]')
    .description('Update athlete training plan (use --file to provide JSON)')
    .option('--file <path>', 'JSON file with training plan data (or - for stdin)')
    .action(async (id: string | undefined, options: { file?: string }) => {
      const athleteId = await resolveId(id);

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

      const { data, error } = await client.PUT('/api/v1/athlete/{id}/training-plan', {
        params: { path: { id: athleteId } },
        body: body as object,
      });

      if (error) {
        handleError(error, 'training-plan update');
        return;
      }

      const config = await readConfig();
      const format = resolveFormat(program.opts().format, config.defaultFormat);

      if (format === 'table') {
        process.stdout.write(`${formatTable(data, TRAINING_PLAN_COLUMNS)}\n`);
      } else if (format === 'plain') {
        const lines: string[] = [];
        for (const key of TRAINING_PLAN_PLAIN_FIELD_ORDER) {
          const value = data[key as keyof typeof data];
          if (value !== undefined && value !== null) {
            lines.push(`${TRAINING_PLAN_PLAIN_FIELD_HEADERS[key]}: ${value}`);
          }
        }
        process.stdout.write(`${lines.join('\n')}\n`);
      } else {
        process.stdout.write(`${formatJson(data)}\n`);
      }
      process.exit(0);
    });

  cmd
    .command('summary [id]')
    .description('Get athlete summary')
    .option('--start <date>', 'Start date (ISO-8601)')
    .option('--end <date>', 'End date (ISO-8601)')
    .action(async (id: string | undefined, options: { start?: string; end?: string }) => {
      const athleteId = await resolveId(id);
      const { data, error } = await client.GET('/api/v1/athlete/{id}/athlete-summary', {
        params: { path: { id: athleteId, ext: '' } },
        query: { start: options.start, end: options.end },
      });

      if (error) {
        handleError(error, 'summary');
        return;
      }

      const config = await readConfig();
      const format = resolveFormat(program.opts().format, config.defaultFormat);

      if (format === 'table') {
        process.stdout.write(`${formatTable(data, SUMMARY_COLUMNS)}\n`);
      } else if (format === 'plain') {
        for (const row of data) {
          const lines: string[] = [];
          for (const key of SUMMARY_PLAIN_FIELD_ORDER) {
            const value = (row as Record<string, unknown>)[key];
            if (value !== undefined && value !== null) {
              lines.push(`${SUMMARY_PLAIN_FIELD_HEADERS[key]}: ${value}`);
            }
          }
          process.stdout.write(`${lines.join('\n')}\n`);
          process.stdout.write('---\n');
        }
      } else {
        process.stdout.write(`${formatJson(data)}\n`);
      }
      process.exit(0);
    });
}
