import type { Command } from 'commander';

export function register(program: Command): void {
  const cmd = program.command('chats').description('Manage chats');
  cmd
    .command('list')
    .description('List chats')
    .action(() => console.log('Not implemented yet'));
  cmd
    .command('get <chatId>')
    .description('Get chat')
    .action(() => console.log('Not implemented yet'));
  cmd
    .command('messages <chatId>')
    .description('Get chat messages')
    .action(() => console.log('Not implemented yet'));
  cmd
    .command('send')
    .description('Send a message')
    .action(() => console.log('Not implemented yet'));
}
