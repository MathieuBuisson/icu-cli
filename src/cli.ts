import { Command } from 'commander';
import { registerCommands } from './commands/index.js';

export function buildProgram(): Command {
  const program = new Command();
  program
    .name('icu')
    .version('0.1.0')
    .description('A cross-platform CLI to interact with Intervals.icu')
    .option('-a, --athlete <id>', 'Override athlete ID')
    .option('-f, --format <fmt>', 'Output format: json, table, plain')
    .configureOutput({
      writeErr: (str) => process.stderr.write(str),
    })
    .exitOverride();

  registerCommands(program);
  return program;
}

export async function run(): Promise<void> {
  const program = buildProgram();
  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    if (error instanceof Error) {
      process.stderr.write(`${error.message}\n`);
    }
    process.exit(1);
  }
}
