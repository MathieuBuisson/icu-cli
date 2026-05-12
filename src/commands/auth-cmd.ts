import { Command as Cmd, type Command } from 'commander';

export function register(program: Command): void {
  program
    .command('auth')
    .description('Authentication commands')
    .addCommand(
      new Cmd('status').description('Verify auth credentials').action(() => {
        console.log('Not implemented yet');
      }),
    );
}
