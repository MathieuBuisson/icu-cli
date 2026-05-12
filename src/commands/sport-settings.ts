import type { Command } from 'commander';

export function register(program: Command): void {
  const cmd = program.command('sport-settings').description('Manage sport settings');
  cmd
    .command('list')
    .description('List sport settings')
    .action(() => console.log('Not implemented yet'));
  cmd
    .command('get <id>')
    .description('Get sport setting')
    .action(() => console.log('Not implemented yet'));
  cmd
    .command('create')
    .description('Create sport setting')
    .action(() => console.log('Not implemented yet'));
  cmd
    .command('update <id>')
    .description('Update sport setting')
    .action(() => console.log('Not implemented yet'));
  cmd
    .command('delete <id>')
    .description('Delete sport setting')
    .action(() => console.log('Not implemented yet'));
}
