import { CommandHandler } from './types';
import { IProject } from '../types';

export const updateSettingsHandler: CommandHandler<
  Partial<IProject['settings']>
> = (state, command) => {
  const settings = command.payload;

  return [
    {
      op: 'update',
      path: '/settings',
      value: { ...state.settings, ...settings },
      oldValue: state.settings,
    },
  ];
};
