import { Patch } from '@openvideo/core';
import { Plan } from './plan.types';

export type WsServerMessage =
  | { type: 'init'; state: any }
  | { type: 'patch'; patch: Patch[] }
  | { type: 'chat.chunk'; sessionId: string; text: string }
  | { type: 'plan.created'; plan: Plan }
  | { type: 'plan.step'; stepId: string; status: 'running' | 'done' | 'error'; description: string }
  | { type: 'plan.complete'; planId: string }
  | { type: 'chat.response'; message: string }
  | { type: 'error'; code: string; message: string };

export type WsClientMessage =
  | { type: 'chat'; sessionId: string; message: string }
  | { type: 'plan.confirm'; planId: string }
  | { type: 'plan.reject'; planId: string };
