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

export const selectClipsHandler: CommandHandler<{
  ids: string[];
  multi?: boolean;
}> = (state, command) => {
  const { ids, multi } = command.payload;
  const next = multi ? [...new Set([...state.selectedIds, ...ids])] : ids;

  return [
    {
      op: 'update',
      path: '/selectedIds',
      value: next,
      oldValue: state.selectedIds,
    },
  ];
};

export const deselectClipsHandler: CommandHandler<string[] | undefined> = (
  state,
  command
) => {
  const ids = command.payload;
  const next = ids ? state.selectedIds.filter((id) => !ids.includes(id)) : [];

  return [
    {
      op: 'update',
      path: '/selectedIds',
      value: next,
      oldValue: state.selectedIds,
    },
  ];
};
