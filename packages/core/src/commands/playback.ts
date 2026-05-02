import { CommandHandler } from './types';

export const seekHandler: CommandHandler<number> = (state, command) => {
  const time = command.payload;
  const limitedTime = Math.max(0, Math.min(state.settings.duration, time));

  return [
    {
      op: 'update',
      path: '/currentTime',
      value: limitedTime,
      oldValue: state.currentTime,
    },
  ];
};

export const setIsPlayingHandler: CommandHandler<boolean> = (
  state,
  command
) => {
  const isPlaying = command.payload;

  return [
    {
      op: 'update',
      path: '/isPlaying',
      value: isPlaying,
      oldValue: state.isPlaying,
    },
  ];
};
