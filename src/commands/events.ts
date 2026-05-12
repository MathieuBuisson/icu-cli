import type { Command } from 'commander';

export function register(program: Command): void {
  const cmd = program.command('events').description('Manage events');
  cmd
    .command('list')
    .description('List events')
    .action(() => console.log('Not implemented yet'));
  cmd
    .command('get <eventId>')
    .description('Get event')
    .action(() => console.log('Not implemented yet'));
  cmd
    .command('create')
    .description('Create event')
    .action(() => console.log('Not implemented yet'));
  cmd
    .command('update <eventId>')
    .description('Update event')
    .action(() => console.log('Not implemented yet'));
  cmd
    .command('delete <eventId>')
    .description('Delete event')
    .action(() => console.log('Not implemented yet'));
  cmd
    .command('download <eventId>')
    .description('Download event')
    .action(() => console.log('Not implemented yet'));
}
