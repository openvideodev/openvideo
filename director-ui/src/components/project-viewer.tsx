'use client';

import React from 'react';
import { useCoreState } from './core-provider';

export function ProjectViewer() {
  const state = useCoreState((state) => state);

  // We omit large noisy objects for the JSON viewer (e.g. history) if needed, 
  // but for now let's just pick the main pieces we care about for editing.
  const displayState = {
    settings: state.settings,
    tracks: state.tracks,
    clips: state.clips,
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden m-4 ml-0">
      <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
        <h2 className="text-sm font-medium text-slate-200">Project State</h2>
        <div className="flex items-center space-x-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500"></span>
          <span className="text-xs text-slate-400">Live Sync</span>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4 custom-scrollbar">
        <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap break-all">
          {JSON.stringify(displayState, null, 2)}
        </pre>
      </div>
    </div>
  );
}
