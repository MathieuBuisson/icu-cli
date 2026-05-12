import type { Command } from 'commander';

export function register(program: Command): void {
  program
    .command('auth')
    .description('Authentication commands')
    .addCommand(
      new Command('status').description('Verify auth credentials').action(() => {
        console.log('Not implemented yet');
      }),
    );
}
