import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { parse } from 'csv-parse/sync';
import { z } from 'zod';

const MenstrualPhaseSchema = z.enum(['PERIOD', 'FOLLICULAR', 'OVULATING', 'LUTEAL', 'NONE']);

export const WellnessSchema = z.object({
  id: z.string().optional(),
  ctl: z.number().optional(),
  atl: z.number().optional(),
  rampRate: z.number().optional(),
  ctlLoad: z.number().optional(),
  atlLoad: z.number().optional(),
  sportInfo: z.array(z.unknown()).optional(),
  updated: z.string().optional(),
  weight: z.number().optional(),
  restingHR: z.number().int().optional(),
  hrv: z.number().optional(),
  hrvSDNN: z.number().optional(),
  menstrualPhase: MenstrualPhaseSchema.optional(),
  menstrualPhasePredicted: MenstrualPhaseSchema.optional(),
  kcalConsumed: z.number().int().optional(),
  sleepSecs: z.number().int().optional(),
  sleepScore: z.number().optional(),
  sleepQuality: z.number().int().optional(),
  avgSleepingHR: z.number().optional(),
  soreness: z.number().int().optional(),
  fatigue: z.number().int().optional(),
  stress: z.number().int().optional(),
  mood: z.number().int().optional(),
  motivation: z.number().int().optional(),
  injury: z.number().int().optional(),
  spO2: z.number().optional(),
  systolic: z.number().int().optional(),
  diastolic: z.number().int().optional(),
  hydration: z.number().int().optional(),
  hydrationVolume: z.number().optional(),
  readiness: z.number().optional(),
  baevskySI: z.number().optional(),
  bloodGlucose: z.number().optional(),
  lactate: z.number().optional(),
  bodyFat: z.number().optional(),
  abdomen: z.number().optional(),
  vo2max: z.number().optional(),
  comments: z.string().optional(),
  steps: z.number().int().optional(),
  respiration: z.number().optional(),
  carbohydrates: z.number().optional(),
  protein: z.number().optional(),
  fatTotal: z.number().optional(),
  locked: z.boolean().optional(),
  tempWeight: z.boolean().optional(),
  tempRestingHR: z.boolean().optional(),
});

export type Wellness = z.infer<typeof WellnessSchema>;

const EventCategorySchema = z.enum([
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
]);

const EventTargetSchema = z.enum(['AUTO', 'POWER', 'HR', 'PACE']);

export const EventSchema = z.object({
  id: z.number().int().optional(),
  start_date_local: z.string().optional(),
  type: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  indoor: z.boolean().optional(),
  color: z.string().optional(),
  category: EventCategorySchema.optional(),
  target: EventTargetSchema.optional(),
  end_date_local: z.string().optional(),
  hide_from_athlete: z.boolean().optional(),
  athlete_cannot_edit: z.boolean().optional(),
});

export type Event = z.infer<typeof EventSchema>;

const SubTypeSchema = z.enum(['NONE', 'COMMUTE', 'WARMUP', 'COOLDOWN', 'RACE']);

export const ActivitySchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  type: z.string().optional(),
  start_date_local: z.string().optional(),
  start_date: z.string().optional(),
  timezone: z.string().optional(),
  trainer: z.boolean().optional(),
  commute: z.boolean().optional(),
  race: z.boolean().optional(),
  sub_type: SubTypeSchema.optional(),
  distance: z.number().optional(),
  moving_time: z.number().int().optional(),
  elapsed_time: z.number().int().optional(),
  total_elevation_gain: z.number().optional(),
  total_elevation_loss: z.number().optional(),
  average_speed: z.number().optional(),
  max_speed: z.number().optional(),
  average_heartrate: z.number().int().optional(),
  max_heartrate: z.number().int().optional(),
  average_cadence: z.number().optional(),
  calories: z.number().int().optional(),
  average_temp: z.number().optional(),
  icu_ignore_time: z.boolean().optional(),
  icu_ignore_power: z.boolean().optional(),
  external_id: z.string().optional(),
  device_name: z.string().optional(),
  gear: z.string().optional(),
});

export type Activity = z.infer<typeof EventSchema>;

const WindSpeedSchema = z.enum(['MPS', 'KNOTS', 'KMH', 'MPH', 'BFT']);
const RainSchema = z.enum(['MM', 'INCHES']);
const VisibilitySchema = z.enum(['PRIVATE', 'PUBLIC', 'HIDDEN']);
const StatusSchema = z.enum(['ACTIVE', 'DORMANT', 'ARCHIVED']);
const WeightSyncSchema = z.enum(['NONE', 'STRAVA']);

export const AthleteSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  firstname: z.string().optional(),
  lastname: z.string().optional(),
  measurement_preference: z.string().optional(),
  weight_pref_lb: z.boolean().optional(),
  fahrenheit: z.boolean().optional(),
  wind_speed: WindSpeedSchema.optional(),
  rain: RainSchema.optional(),
  weight: z.number().optional(),
  email: z.string().optional(),
  sex: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  timezone: z.string().optional(),
  locale: z.string().optional(),
  date_format: z.string().optional(),
  time_format: z.string().optional(),
  visibility: VisibilitySchema.optional(),
  status: StatusSchema.optional(),
  bio: z.string().optional(),
  website: z.string().optional(),
  icu_resting_hr: z.number().int().optional(),
  icu_weight: z.number().optional(),
  icu_weight_sync: WeightSyncSchema.optional(),
  icu_form_as_percent: z.boolean().optional(),
});

export type Athlete = z.infer<typeof AthleteSchema>;

export function validateWellness(data: Record<string, unknown>): string[] {
  const result = WellnessSchema.safeParse(data);
  if (result.success) {
    return [];
  }
  return result.error.issues.map((issue) => {
    const path = issue.path.join('.');
    return `${path ? `${path}: ` : ''}${issue.message}`;
  });
}

export function validateEvent(data: Record<string, unknown>): string[] {
  const result = EventSchema.safeParse(data);
  if (result.success) {
    return [];
  }
  return result.error.issues.map((issue) => {
    const path = issue.path.join('.');
    return `${path ? `${path}: ` : ''}${issue.message}`;
  });
}

export function validateActivity(data: Record<string, unknown>): string[] {
  const result = ActivitySchema.safeParse(data);
  if (result.success) {
    return [];
  }
  return result.error.issues.map((issue) => {
    const path = issue.path.join('.');
    return `${path ? `${path}: ` : ''}${issue.message}`;
  });
}

export function validateAthlete(data: Record<string, unknown>): string[] {
  const result = AthleteSchema.safeParse(data);
  if (result.success) {
    return [];
  }
  return result.error.issues.map((issue) => {
    const path = issue.path.join('.');
    return `${path ? `${path}: ` : ''}${issue.message}`;
  });
}

export function validateDate(dateStr: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) {
    return false;
  }
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function validateDateNotFuture(dateStr: string): boolean {
  if (!validateDate(dateStr)) {
    return false;
  }
  const date = new Date(dateStr);
  const today = new Date();
  today.setUTCHours(23, 59, 59, 999);
  return date <= today;
}

export async function readJsonFile<T>(filePath: string): Promise<T> {
  try {
    const content = await readFile(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`File not found: ${filePath}`);
    }
    throw error;
  }
}

export async function readCsvFile(filePath: string): Promise<string> {
  try {
    const content = await readFile(filePath, 'utf-8');
    return validateCsvContent(content);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`File not found: ${filePath}`);
    }
    throw error;
  }
}

export function readStdin(): string {
  return readFileSync(0, 'utf-8');
}

export async function readCsvFromStdin(): Promise<string> {
  const content = readStdin();
  return validateCsvContent(content);
}

function validateCsvContent(content: string): string {
  const records = parse(content, { relax_column_count: true });
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error('CSV file is empty');
  }
  const firstRecordLength = records[0].length;
  for (let i = 1; i < records.length; i++) {
    if (records[i].length !== firstRecordLength) {
      throw new Error(`CSV file has inconsistent number of columns on line ${i + 1}`);
    }
  }
  return content;
}
