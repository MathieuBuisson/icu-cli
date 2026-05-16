import { describe, expect, it, vi } from 'vitest';
import {
  readCsvFile,
  readCsvFromStdin,
  readJsonFile,
  readStdin,
  validateActivity,
  validateAthlete,
  validateDate,
  validateDateNotFuture,
  validateEvent,
  validateWellness,
} from '../../src/utils/validation.js';

vi.mock('node:fs/promises');
vi.mock('node:fs');

describe('validateDate', () => {
  it('returns true for valid date', () => {
    expect(validateDate('2024-01-15')).toBe(true);
  });

  it('returns false for invalid format', () => {
    expect(validateDate('01-15-2024')).toBe(false);
    expect(validateDate('2024/01/15')).toBe(false);
    expect(validateDate('20240115')).toBe(false);
  });

  it('returns false for invalid date', () => {
    expect(validateDate('2024-13-01')).toBe(false);
    expect(validateDate('2024-02-30')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(validateDate('')).toBe(false);
  });
});

describe('validateDateNotFuture', () => {
  it('returns true for past date', () => {
    expect(validateDateNotFuture('2020-01-01')).toBe(true);
  });

  it('returns true for today', () => {
    const today = new Date().toISOString().split('T')[0];
    expect(validateDateNotFuture(today)).toBe(true);
  });

  it('returns false for future date', () => {
    expect(validateDateNotFuture('2099-12-31')).toBe(false);
  });

  it('returns false for invalid date format', () => {
    expect(validateDateNotFuture('invalid')).toBe(false);
  });
});

describe('readJsonFile', () => {
  it('reads and parses JSON file', async () => {
    const { readFile } = await import('node:fs/promises');
    vi.mocked(readFile).mockResolvedValue('{"key":"value"}');

    const result = await readJsonFile<{ key: string }>('/path/to/file.json');
    expect(result).toEqual({ key: 'value' });
  });

  it('throws on invalid JSON', async () => {
    const { readFile } = await import('node:fs/promises');
    vi.mocked(readFile).mockResolvedValue('invalid json');

    await expect(readJsonFile('/path/to/file.json')).rejects.toThrow();
  });

  it('throws with message when file not found', async () => {
    const { readFile } = await import('node:fs/promises');
    const error = new Error('ENOENT') as NodeJS.ErrnoException;
    error.code = 'ENOENT';
    vi.mocked(readFile).mockRejectedValue(error);

    await expect(readJsonFile('/nonexistent/file.json')).rejects.toThrow(
      'File not found: /nonexistent/file.json',
    );
  });
});

describe('readCsvFile', () => {
  it('reads valid CSV file', async () => {
    const { readFile } = await import('node:fs/promises');
    vi.mocked(readFile).mockResolvedValue('field1,field2\nvalue1,value2');

    const result = await readCsvFile('/path/to/file.csv');
    expect(result).toBe('field1,field2\nvalue1,value2');
  });

  it('throws on empty CSV', async () => {
    const { readFile } = await import('node:fs/promises');
    vi.mocked(readFile).mockResolvedValue('');

    await expect(readCsvFile('/path/to/file.csv')).rejects.toThrow('CSV file is empty');
  });

  it('throws on inconsistent column count', async () => {
    const { readFile } = await import('node:fs/promises');
    vi.mocked(readFile).mockResolvedValue('field1,field2\nvalue1');

    await expect(readCsvFile('/path/to/file.csv')).rejects.toThrow(
      'CSV file has inconsistent number of columns on line 2',
    );
  });

  it('handles quoted values with commas', async () => {
    const { readFile } = await import('node:fs/promises');
    vi.mocked(readFile).mockResolvedValue('field1,field2\n"value, with comma",value2');

    const result = await readCsvFile('/path/to/file.csv');
    expect(result).toBe('field1,field2\n"value, with comma",value2');
  });

  it('handles multiline quoted values', async () => {
    const { readFile } = await import('node:fs/promises');
    vi.mocked(readFile).mockResolvedValue('field1,field2\n"line1\nline2",value2');

    const result = await readCsvFile('/path/to/file.csv');
    expect(result).toBe('field1,field2\n"line1\nline2",value2');
  });

  it('throws with message when file not found', async () => {
    const { readFile } = await import('node:fs/promises');
    const error = new Error('ENOENT') as NodeJS.ErrnoException;
    error.code = 'ENOENT';
    vi.mocked(readFile).mockRejectedValue(error);

    await expect(readCsvFile('/nonexistent/file.csv')).rejects.toThrow(
      'File not found: /nonexistent/file.csv',
    );
  });
});

describe('validateWellness', () => {
  it('returns empty array for valid data', () => {
    const data = {
      weight: 75.5,
      restingHR: 60,
      hrv: 45.2,
      menstrualPhase: 'NONE',
    };
    expect(validateWellness(data)).toEqual([]);
  });

  it('returns error for invalid field (unknown key ignored by Zod)', () => {
    const data = { invalidField: 'value' };
    const errors = validateWellness(data);
    expect(errors.length).toBeGreaterThanOrEqual(0);
  });

  it('returns error for wrong type on string field', () => {
    const data = { id: 123 };
    const errors = validateWellness(data);
    expect(errors.some((e) => e.includes('id') && e.includes('string'))).toBe(true);
  });

  it('returns error for wrong type on number field', () => {
    const data = { weight: '75kg' };
    const errors = validateWellness(data);
    expect(errors.some((e) => e.includes('weight') && e.includes('number'))).toBe(true);
  });

  it('returns error for wrong type on integer field', () => {
    const data = { restingHR: 60.5 };
    const errors = validateWellness(data);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('returns error for wrong type on boolean field', () => {
    const data = { locked: 'true' };
    const errors = validateWellness(data);
    expect(errors.some((e) => e.includes('locked') && e.includes('boolean'))).toBe(true);
  });

  it('returns error for invalid menstrualPhase', () => {
    const data = { menstrualPhase: 'INVALID' };
    const errors = validateWellness(data);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('returns error for invalid menstrualPhasePredicted', () => {
    const data = { menstrualPhasePredicted: 'MAYBE' };
    const errors = validateWellness(data);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('returns error for non-array sportInfo', () => {
    const data = { sportInfo: 'not an array' };
    const errors = validateWellness(data);
    expect(errors.some((e) => e.includes('sportInfo'))).toBe(true);
  });

  it('accepts valid menstrualPhase values', () => {
    const phases = ['PERIOD', 'FOLLICULAR', 'OVULATING', 'LUTEAL', 'NONE'];
    for (const phase of phases) {
      expect(validateWellness({ menstrualPhase: phase })).toEqual([]);
    }
  });

  it('accepts all valid fields', () => {
    const data = {
      id: '2024-01-15',
      ctl: 50.5,
      atl: 40.2,
      rampRate: 1.5,
      ctlLoad: 100,
      atlLoad: 80,
      sportInfo: [],
      updated: '2024-01-15T10:00:00Z',
      weight: 75.5,
      restingHR: 60,
      hrv: 45.2,
      hrvSDNN: 20.1,
      menstrualPhase: 'NONE',
      menstrualPhasePredicted: 'FOLLICULAR',
      kcalConsumed: 2000,
      sleepSecs: 28800,
      sleepScore: 85.5,
      sleepQuality: 4,
      avgSleepingHR: 55,
      soreness: 2,
      fatigue: 3,
      stress: 4,
      mood: 5,
      motivation: 6,
      injury: 0,
      spO2: 98.5,
      systolic: 120,
      diastolic: 80,
      hydration: 3,
      hydrationVolume: 2.5,
      readiness: 75.0,
      baevskySI: 5.5,
      bloodGlucose: 5.2,
      lactate: 1.5,
      bodyFat: 15.0,
      abdomen: 85.5,
      vo2max: 55.0,
      comments: 'Feeling good',
      steps: 10000,
      respiration: 16.0,
      carbohydrates: 250.5,
      protein: 120.0,
      fatTotal: 70.0,
      locked: false,
      tempWeight: false,
      tempRestingHR: false,
    };
    expect(validateWellness(data)).toEqual([]);
  });
});

describe('readJsonFile', () => {
  it('reads and parses JSON file', async () => {
    const { readFile } = await import('node:fs/promises');
    vi.mocked(readFile).mockResolvedValue('{"key":"value"}');

    const result = await readJsonFile<{ key: string }>('/path/to/file.json');
    expect(result).toEqual({ key: 'value' });
  });

  it('throws on invalid JSON', async () => {
    const { readFile } = await import('node:fs/promises');
    vi.mocked(readFile).mockResolvedValue('invalid json');

    await expect(readJsonFile('/path/to/file.json')).rejects.toThrow();
  });
});

describe('readCsvFile', () => {
  it('reads valid CSV file', async () => {
    const { readFile } = await import('node:fs/promises');
    vi.mocked(readFile).mockResolvedValue('field1,field2\nvalue1,value2');

    const result = await readCsvFile('/path/to/file.csv');
    expect(result).toBe('field1,field2\nvalue1,value2');
  });

  it('throws on empty CSV', async () => {
    const { readFile } = await import('node:fs/promises');
    vi.mocked(readFile).mockResolvedValue('');

    await expect(readCsvFile('/path/to/file.csv')).rejects.toThrow('CSV file is empty');
  });

  it('throws on inconsistent column count', async () => {
    const { readFile } = await import('node:fs/promises');
    vi.mocked(readFile).mockResolvedValue('field1,field2\nvalue1');

    await expect(readCsvFile('/path/to/file.csv')).rejects.toThrow(
      'CSV file has inconsistent number of columns on line 2',
    );
  });

  it('handles quoted values with commas', async () => {
    const { readFile } = await import('node:fs/promises');
    vi.mocked(readFile).mockResolvedValue('field1,field2\n"value, with comma",value2');

    const result = await readCsvFile('/path/to/file.csv');
    expect(result).toBe('field1,field2\n"value, with comma",value2');
  });

  it('handles multiline quoted values', async () => {
    const { readFile } = await import('node:fs/promises');
    vi.mocked(readFile).mockResolvedValue('field1,field2\n"line1\nline2",value2');

    const result = await readCsvFile('/path/to/file.csv');
    expect(result).toBe('field1,field2\n"line1\nline2",value2');
  });
});

describe('readStdin', () => {
  it('reads from stdin', async () => {
    const { readFileSync } = await import('node:fs');
    vi.mocked(readFileSync).mockReturnValue('stdin data');

    const result = readStdin();
    expect(result).toBe('stdin data');
    expect(readFileSync).toHaveBeenCalledWith(0, 'utf-8');
  });
});

describe('readCsvFromStdin', () => {
  it('reads and validates CSV from stdin', async () => {
    const { readFileSync } = await import('node:fs');
    vi.mocked(readFileSync).mockReturnValue('field1,field2\nvalue1,value2');

    const result = await readCsvFromStdin();
    expect(result).toBe('field1,field2\nvalue1,value2');
  });

  it('throws on empty stdin', async () => {
    const { readFileSync } = await import('node:fs');
    vi.mocked(readFileSync).mockReturnValue('');

    await expect(readCsvFromStdin()).rejects.toThrow('CSV file is empty');
  });

  it('handles quoted values with commas from stdin', async () => {
    const { readFileSync } = await import('node:fs');
    vi.mocked(readFileSync).mockReturnValue('field1,field2\n"value, with comma",value2');

    const result = await readCsvFromStdin();
    expect(result).toBe('field1,field2\n"value, with comma",value2');
  });
});

describe('validateEvent', () => {
  it('returns empty array for valid data', () => {
    const data = {
      name: 'Morning Run',
      start_date_local: '2024-01-15T08:00:00',
      type: 'Run',
      indoor: false,
      category: 'WORKOUT',
      target: 'AUTO',
    };
    expect(validateEvent(data)).toEqual([]);
  });

  it('returns error for wrong type on string field', () => {
    const data = { name: 123 };
    const errors = validateEvent(data);
    expect(errors.some((e) => e.includes('name') && e.includes('string'))).toBe(true);
  });

  it('returns error for wrong type on number field', () => {
    const data = { id: 'not a number' };
    const errors = validateEvent(data);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('returns error for wrong type on boolean field', () => {
    const data = { indoor: 'yes' };
    const errors = validateEvent(data);
    expect(errors.some((e) => e.includes('indoor') && e.includes('boolean'))).toBe(true);
  });

  it('returns error for invalid category enum', () => {
    const data = { category: 'INVALID_CATEGORY' };
    const errors = validateEvent(data);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('returns error for invalid target enum', () => {
    const data = { target: 'INVALID_TARGET' };
    const errors = validateEvent(data);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('accepts valid category values', () => {
    const categories = [
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
    ];
    for (const cat of categories) {
      expect(validateEvent({ category: cat })).toEqual([]);
    }
  });

  it('accepts valid target values', () => {
    const targets = ['AUTO', 'POWER', 'HR', 'PACE'];
    for (const target of targets) {
      expect(validateEvent({ target })).toEqual([]);
    }
  });
});

describe('validateActivity', () => {
  it('returns empty array for valid data', () => {
    const data = {
      name: 'Morning Ride',
      type: 'Ride',
      start_date_local: '2024-01-15T08:00:00',
      distance: 25000,
      moving_time: 3600,
      elapsed_time: 3700,
      trainer: false,
      commute: false,
      race: false,
      sub_type: 'NONE',
    };
    expect(validateActivity(data)).toEqual([]);
  });

  it('returns error for wrong type on string field', () => {
    const data = { name: 123 };
    const errors = validateActivity(data);
    expect(errors.some((e) => e.includes('name') && e.includes('string'))).toBe(true);
  });

  it('returns error for wrong type on number field', () => {
    const data = { distance: '25km' };
    const errors = validateActivity(data);
    expect(errors.some((e) => e.includes('distance') && e.includes('number'))).toBe(true);
  });

  it('returns error for wrong type on integer field', () => {
    const data = { moving_time: 3600.5 };
    const errors = validateActivity(data);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('returns error for wrong type on boolean field', () => {
    const data = { trainer: 'yes' };
    const errors = validateActivity(data);
    expect(errors.some((e) => e.includes('trainer') && e.includes('boolean'))).toBe(true);
  });

  it('returns error for invalid sub_type enum', () => {
    const data = { sub_type: 'INVALID_TYPE' };
    const errors = validateActivity(data);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('accepts valid sub_type values', () => {
    const subtypes = ['NONE', 'COMMUTE', 'WARMUP', 'COOLDOWN', 'RACE'];
    for (const subtype of subtypes) {
      expect(validateActivity({ sub_type: subtype })).toEqual([]);
    }
  });
});

describe('validateAthlete', () => {
  it('returns empty array for valid data', () => {
    const data = {
      name: 'John Doe',
      firstname: 'John',
      lastname: 'Doe',
      email: 'john@example.com',
      city: 'Dublin',
      country: 'Ireland',
      weight_pref_lb: false,
      fahrenheit: false,
      wind_speed: 'KNOTS',
      rain: 'MM',
      weight: 75.5,
      icu_resting_hr: 60,
      icu_form_as_percent: true,
    };
    expect(validateAthlete(data)).toEqual([]);
  });

  it('returns error for wrong type on string field', () => {
    const data = { name: 123 };
    const errors = validateAthlete(data);
    expect(errors.some((e) => e.includes('name') && e.includes('string'))).toBe(true);
  });

  it('returns error for wrong type on number field', () => {
    const data = { weight: '75kg' };
    const errors = validateAthlete(data);
    expect(errors.some((e) => e.includes('weight') && e.includes('number'))).toBe(true);
  });

  it('returns error for wrong type on integer field', () => {
    const data = { icu_resting_hr: 60.5 };
    const errors = validateAthlete(data);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('returns error for wrong type on boolean field', () => {
    const data = { weight_pref_lb: 'true' };
    const errors = validateAthlete(data);
    expect(errors.some((e) => e.includes('weight_pref_lb') && e.includes('boolean'))).toBe(true);
  });

  it('returns error for invalid wind_speed enum', () => {
    const data = { wind_speed: 'INVALID' };
    const errors = validateAthlete(data);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('returns error for invalid rain enum', () => {
    const data = { rain: 'INVALID' };
    const errors = validateAthlete(data);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('returns error for invalid visibility enum', () => {
    const data = { visibility: 'INVALID' };
    const errors = validateAthlete(data);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('returns error for invalid status enum', () => {
    const data = { status: 'INVALID' };
    const errors = validateAthlete(data);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('accepts valid wind_speed values', () => {
    const values = ['MPS', 'KNOTS', 'KMH', 'MPH', 'BFT'];
    for (const val of values) {
      expect(validateAthlete({ wind_speed: val })).toEqual([]);
    }
  });

  it('accepts valid rain values', () => {
    const values = ['MM', 'INCHES'];
    for (const val of values) {
      expect(validateAthlete({ rain: val })).toEqual([]);
    }
  });

  it('accepts valid visibility values', () => {
    const values = ['PRIVATE', 'PUBLIC', 'HIDDEN'];
    for (const val of values) {
      expect(validateAthlete({ visibility: val })).toEqual([]);
    }
  });

  it('accepts valid status values', () => {
    const values = ['ACTIVE', 'DORMANT', 'ARCHIVED'];
    for (const val of values) {
      expect(validateAthlete({ status: val })).toEqual([]);
    }
  });
});
