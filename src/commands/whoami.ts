import type { Command } from 'commander';

export function register(program: Command): void {
  program
    .command('whoami')
    .description('Show authenticated athlete info')
    .action(() => {
      console.log('Not implemented yet');
    });
}
