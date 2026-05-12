import type { Command } from 'commander';

export function register(program: Command): void {
  const cmd = program.command('activities').description('Manage activities');
  cmd
    .command('list')
    .description('List activities')
    .action(() => console.log('Not implemented yet'));
  cmd
    .command('get <activityId>')
    .description('Get activity')
    .action(() => console.log('Not implemented yet'));
  cmd
    .command('create')
    .description('Create activity')
    .action(() => console.log('Not implemented yet'));
  cmd
    .command('upload <filepath>')
    .description('Upload activity file')
    .action(() => console.log('Not implemented yet'));
  cmd
    .command('update <activityId>')
    .description('Update activity')
    .action(() => console.log('Not implemented yet'));
  cmd
    .command('delete <activityId>')
    .description('Delete activity')
    .action(() => console.log('Not implemented yet'));
  cmd
    .command('search')
    .description('Search activities')
    .action(() => console.log('Not implemented yet'));
  cmd
    .command('streams <activityId>')
    .description('Get activity streams')
    .action(() => console.log('Not implemented yet'));
  cmd
    .command('intervals <activityId>')
    .description('Get activity intervals')
    .action(() => console.log('Not implemented yet'));
  cmd
    .command('download-fit <activityId>')
    .description('Download FIT file')
    .action(() => console.log('Not implemented yet'));
  cmd
    .command('download-gpx <activityId>')
    .description('Download GPX file')
    .action(() => console.log('Not implemented yet'));
}
