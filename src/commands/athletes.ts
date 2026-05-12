import type { Command } from 'commander';

export function register(program: Command): void {
  const cmd = program.command('athletes').description('Manage athletes');
  cmd
    .command('get [id]')
    .description('Get athlete')
    .action(() => console.log('Not implemented yet'));
  cmd
    .command('update [id]')
    .description('Update athlete')
    .action(() => console.log('Not implemented yet'));
  cmd
    .command('profile [id]')
    .description('Get athlete profile')
    .action(() => console.log('Not implemented yet'));
  cmd
    .command('training-plan [id]')
    .description('Get training plan')
    .action(() => console.log('Not implemented yet'));
  cmd
    .command('summary [id]')
    .description('Get athlete summary')
    .action(() => console.log('Not implemented yet'));
}
