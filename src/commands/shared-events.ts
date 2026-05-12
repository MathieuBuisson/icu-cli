import { Command as Cmd, type Command } from 'commander';

export function register(program: Command): void {
  program
    .command('shared-events')
    .description('Manage shared events')
    .addCommand(
      new Cmd('get <id>').description('Get shared event').action(() => {
        console.log('Not implemented yet');
      }),
    );
}
