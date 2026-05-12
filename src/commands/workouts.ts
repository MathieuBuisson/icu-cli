import type { Command } from 'commander';

export function register(program: Command): void {
  const cmd = program.command('workouts').description('Manage workouts');
  cmd
    .command('list')
    .description('List workouts')
    .action(() => console.log('Not implemented yet'));
  cmd
    .command('get <workoutId>')
    .description('Get workout')
    .action(() => console.log('Not implemented yet'));
  cmd
    .command('create')
    .description('Create workout')
    .action(() => console.log('Not implemented yet'));
  cmd
    .command('update <workoutId>')
    .description('Update workout')
    .action(() => console.log('Not implemented yet'));
  cmd
    .command('delete <workoutId>')
    .description('Delete workout')
    .action(() => console.log('Not implemented yet'));
  cmd
    .command('download <workoutId>')
    .description('Download workout')
    .action(() => console.log('Not implemented yet'));
}
