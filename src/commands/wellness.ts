import type { Command } from 'commander';

export function register(program: Command): void {
  const cmd = program.command('wellness').description('Manage wellness records');
  cmd
    .command('list')
    .description('List wellness records')
    .action(() => console.log('Not implemented yet'));
  cmd
    .command('get <date>')
    .description('Get wellness record')
    .action(() => console.log('Not implemented yet'));
  cmd
    .command('update <date>')
    .description('Update wellness record')
    .action(() => console.log('Not implemented yet'));
  cmd
    .command('upload <filepath>')
    .description('Upload wellness CSV')
    .action(() => console.log('Not implemented yet'));
}
