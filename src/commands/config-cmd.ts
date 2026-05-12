import type { Command } from 'commander';

export function register(program: Command): void {
  const config = program.command('config').description('Manage configuration');
  config
    .command('set <key> <value>')
    .description('Set a config value')
    .action(() => {
      console.log('Not implemented yet');
    });
  config
    .command('get <key>')
    .description('Get a config value')
    .action(() => {
      console.log('Not implemented yet');
    });
  config
    .command('list')
    .description('List all config values')
    .action(() => {
      console.log('Not implemented yet');
    });
}
