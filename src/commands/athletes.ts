import type { Command } from 'commander';
import client from '../client.js';
import { resolveAthleteId } from '../config.js';
import { readInput } from '../input.js';
import type { ColumnDef } from '../output.js';
import { handleHttpError } from '../utils/api-helpers.js';
import { printOutput } from '../utils/output-helpers.js';
import { validateAthlete } from '../utils/validation.js';

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
      const { data, error, response } = await client.GET('/api/v1/athlete/{id}', {
        params: { path: { id: athleteId } },
      });

      if (error) {
        handleHttpError(response?.status ?? 0, error);
        return;
      }

      await printOutput(
        program,
        data,
        ATHLETE_COLUMNS,
        ATHLETE_PLAIN_FIELD_ORDER,
        ATHLETE_PLAIN_FIELD_HEADERS,
      );
      process.exit(0);
    });

  cmd
    .command('update [id]')
    .description('Update athlete by ID (use --file to provide JSON)')
    .requiredOption('--file <path>', 'JSON file with athlete data (or - for stdin)')
    .action(async (id: string | undefined, options: { file: string }) => {
      const athleteId = await resolveId(id);

      const body = await readInput(options.file);
      if (body === null) {
        process.stderr.write('Error: --file requires JSON input\n');
        process.exit(1);
      }

      const validationErrors = validateAthlete(body as Record<string, unknown>);
      if (validationErrors.length > 0) {
        process.stderr.write('Error: Invalid athlete data:\n');
        for (const err of validationErrors) {
          process.stderr.write(`  - ${err}\n`);
        }
        process.exit(1);
      }

      const { data, error, response } = await client.PUT('/api/v1/athlete/{id}', {
        params: { path: { id: athleteId } },
        body: body as object,
      });

      if (error) {
        handleHttpError(response?.status ?? 0, error);
        return;
      }

      await printOutput(
        program,
        data,
        ATHLETE_COLUMNS,
        ATHLETE_PLAIN_FIELD_ORDER,
        ATHLETE_PLAIN_FIELD_HEADERS,
      );
      process.exit(0);
    });

  cmd
    .command('profile [id]')
    .description('Get athlete profile')
    .action(async (id: string | undefined) => {
      const athleteId = await resolveId(id);
      const { data, error, response } = await client.GET('/api/v1/athlete/{id}/profile', {
        params: { path: { id: athleteId } },
      });

      if (error) {
        handleHttpError(response?.status ?? 0, error);
        return;
      }

      const athleteData = (data as { athlete?: Record<string, unknown> }).athlete;
      if (!athleteData) {
        process.stderr.write('Error: no profile data returned\n');
        process.exit(1);
      }

      await printOutput(
        program,
        athleteData,
        ATHLETE_COLUMNS,
        ATHLETE_PLAIN_FIELD_ORDER,
        ATHLETE_PLAIN_FIELD_HEADERS,
      );
      process.exit(0);
    });

  const trainingPlan = cmd.command('training-plan').description('Manage training plans');

  trainingPlan
    .command('get [id]')
    .description('Get athlete training plan')
    .action(async (id: string | undefined) => {
      const athleteId = await resolveId(id);
      const { data, error, response } = await client.GET('/api/v1/athlete/{id}/training-plan', {
        params: { path: { id: athleteId } },
      });

      if (error) {
        handleHttpError(response?.status ?? 0, error);
        return;
      }

      await printOutput(
        program,
        data,
        TRAINING_PLAN_COLUMNS,
        TRAINING_PLAN_PLAIN_FIELD_ORDER,
        TRAINING_PLAN_PLAIN_FIELD_HEADERS,
      );
      process.exit(0);
    });

  trainingPlan
    .command('update [id]')
    .description('Update athlete training plan (use --file to provide JSON)')
    .requiredOption('--file <path>', 'JSON file with training plan data (or - for stdin)')
    .action(async (id: string | undefined, options: { file: string }) => {
      const athleteId = await resolveId(id);

      const body = await readInput(options.file);
      if (body === null) {
        process.stderr.write('Error: --file requires JSON input\n');
        process.exit(1);
      }

      const { data, error, response } = await client.PUT('/api/v1/athlete/{id}/training-plan', {
        params: { path: { id: athleteId } },
        body: body as object,
      });

      if (error) {
        handleHttpError(response?.status ?? 0, error);
        return;
      }

      await printOutput(
        program,
        data,
        TRAINING_PLAN_COLUMNS,
        TRAINING_PLAN_PLAIN_FIELD_ORDER,
        TRAINING_PLAN_PLAIN_FIELD_HEADERS,
      );
      process.exit(0);
    });

  cmd
    .command('summary [id]')
    .description('Get athlete summary')
    .option('--start <date>', 'Start date (ISO-8601)')
    .option('--end <date>', 'End date (ISO-8601)')
    .action(async (id: string | undefined, options: { start?: string; end?: string }) => {
      const athleteId = await resolveId(id);
      const { data, error, response } = await client.GET('/api/v1/athlete/{id}/athlete-summary', {
        params: { path: { id: athleteId, ext: '' } },
        query: { start: options.start, end: options.end },
      });

      if (error) {
        handleHttpError(response?.status ?? 0, error);
        return;
      }

      await printOutput(
        program,
        data,
        SUMMARY_COLUMNS,
        SUMMARY_PLAIN_FIELD_ORDER,
        SUMMARY_PLAIN_FIELD_HEADERS,
      );
      process.exit(0);
    });
}
