import type { Command } from 'commander';

export function register(program: Command): void {
  program
    .command('shared-events')
    .description('Manage shared events')
    .addCommand(
      new Command('get <id>').description('Get shared event').action(() => {
        console.log('Not implemented yet');
      }),
    );
}
