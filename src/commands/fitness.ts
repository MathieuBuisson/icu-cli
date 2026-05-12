import type { Command } from 'commander';

export function register(program: Command): void {
  program
    .command('fitness')
    .description('Fitness commands')
    .addCommand(
      new Command('list').description('List fitness model events').action(() => {
        console.log('Not implemented yet');
      }),
    );
}
