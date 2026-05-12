import type { Command } from 'commander';
import { register as activities } from './activities.js';
import { register as athletes } from './athletes.js';
import { register as authCmd } from './auth-cmd.js';
import { register as chats } from './chats.js';
import { register as configCmd } from './config-cmd.js';
import { register as events } from './events.js';
import { register as fitness } from './fitness.js';
import { register as performance } from './performance.js';
import { register as sharedEvents } from './shared-events.js';
import { register as sportSettings } from './sport-settings.js';
import { register as weather } from './weather.js';
import { register as wellness } from './wellness.js';
import { register as whoami } from './whoami.js';
import { register as workouts } from './workouts.js';

export function registerCommands(program: Command): void {
  whoami(program);
  configCmd(program);
  authCmd(program);
  athletes(program);
  activities(program);
  events(program);
  wellness(program);
  workouts(program);
  sportSettings(program);
  chats(program);
  weather(program);
  sharedEvents(program);
  fitness(program);
  performance(program);
}
