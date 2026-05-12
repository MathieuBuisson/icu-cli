import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildProgram } from '../../src/cli.js';

describe('buildProgram', () => {
  it('creates a program with the correct name', () => {
    const program = buildProgram();
    expect(program.name()).toBe('icu');
  });

  it('creates a program with the correct version', () => {
    const program = buildProgram();
    expect(program.version()).toBe('0.1.0');
  });

  it('creates a program with the --athlete option', () => {
    const program = buildProgram();
    const athleteOption = program.options.find((opt) => opt.short === '-a');
    expect(athleteOption).toBeDefined();
    expect(athleteOption?.long).toBe('--athlete');
    expect(athleteOption?.name()).toBe('athlete');
  });

  it('creates a program with the --format option', () => {
    const program = buildProgram();
    const formatOption = program.options.find((opt) => opt.short === '-f');
    expect(formatOption).toBeDefined();
    expect(formatOption?.long).toBe('--format');
    expect(formatOption?.name()).toBe('format');
  });
});

describe('run', () => {
  let originalArgv: string[];
  let mockExit: ReturnType<typeof vi.spyOn>;
  let mockStderrWrite: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    originalArgv = process.argv;
    mockExit = vi.spyOn(process, 'exit').mockImplementation((() => {}) as typeof process.exit);
    mockStderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    process.argv = originalArgv;
    mockExit.mockRestore();
    mockStderrWrite.mockRestore();
  });

  it('exits with code 0 when --version is passed', async () => {
    const { run } = await import('../../src/cli.js');
    process.argv = ['node', 'icu', '--version'];
    await run();
    expect(mockExit).toHaveBeenCalledWith(0);
  });

  it('exits with code 0 when --help is passed', async () => {
    const { run } = await import('../../src/cli.js');
    process.argv = ['node', 'icu', '--help'];
    await run();
    expect(mockExit).toHaveBeenCalledWith(0);
  });

  it('writes to stderr and exits with code 1 for invalid command', async () => {
    const { run } = await import('../../src/cli.js');
    process.argv = ['node', 'icu', 'nonexistent-command'];
    await run();
    expect(mockStderrWrite).toHaveBeenCalled();
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});
