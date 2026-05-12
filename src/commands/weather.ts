import type { Command } from 'commander';

export function register(program: Command): void {
  const cmd = program.command('weather').description('Weather commands');
  cmd
    .command('forecast')
    .description('Get weather forecast')
    .action(() => console.log('Not implemented yet'));
  cmd
    .command('config-get')
    .description('Get weather config')
    .action(() => console.log('Not implemented yet'));
  cmd
    .command('config-update')
    .description('Update weather config')
    .action(() => console.log('Not implemented yet'));
}
