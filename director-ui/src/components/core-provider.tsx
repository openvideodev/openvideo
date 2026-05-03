'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Core, createProjectStore } from '@openvideo/core';
import { useStore } from 'zustand';

// Create a singleton instance for the client
export const core = new Core();

const CoreContext = createContext<Core>(core);

export function CoreProvider({ children }: { children: React.ReactNode }) {
  return (
    <CoreContext.Provider value={core}>{children}</CoreContext.Provider>
  );
}

export function useCore() {
  return useContext(CoreContext);
}

// React hook to subscribe to the core store
export function useCoreState<T>(selector: (state: any) => T): T {
  const coreInstance = useCore();
  return useStore(coreInstance.store, selector);
}
