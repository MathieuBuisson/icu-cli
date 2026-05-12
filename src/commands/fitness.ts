import { Command as Cmd, type Command } from 'commander';

export function register(program: Command): void {
  program
    .command('fitness')
    .description('Fitness commands')
    .addCommand(
      new Cmd('list').description('List fitness model events').action(() => {
        console.log('Not implemented yet');
      }),
    );
}
