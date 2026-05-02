import { CommandHandler } from './types';

class CommandRegistry {
  private handlers: Map<string, CommandHandler> = new Map();

  register(type: string, handler: CommandHandler) {
    this.handlers.set(type, handler);
  }

  get(type: string): CommandHandler | undefined {
    return this.handlers.get(type);
  }

  has(type: string): boolean {
    return this.handlers.has(type);
  }

  unregister(type: string) {
    this.handlers.delete(type);
  }
}

export const commandRegistry = new CommandRegistry();
