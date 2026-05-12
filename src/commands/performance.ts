import type { Command } from 'commander';

export function register(program: Command): void {
  const cmd = program.command('performance').description('Performance curves');
  cmd
    .command('power')
    .description('Get power curves')
    .action(() => console.log('Not implemented yet'));
  cmd
    .command('pace')
    .description('Get pace curves')
    .action(() => console.log('Not implemented yet'));
  cmd
    .command('hr')
    .description('Get HR curves')
    .action(() => console.log('Not implemented yet'));
}
