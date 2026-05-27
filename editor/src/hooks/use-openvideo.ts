"use client";

import { useState, useCallback, useEffect } from "react";
import { OpenVideo } from "@openvideo/sdk";
import type { Space, Asset } from "@openvideo/sdk";

// Singleton SDK instance - auto-detects browser and routes to /openvideo
let ov: OpenVideo | null = null;

function getOpenVideo() {
  if (!ov) {
    ov = new OpenVideo(); // Browser: auto-routes to /openvideo
    console.log(`[useOpenVideo] SDK mode: ${ov.getMode()}`);
  }
  return ov;
}

interface UseOpenVideoState {
  spaces: Space[];
  assets: Asset[];
  isLoading: boolean;
  error: Error | null;
}

export function useOpenVideo() {
  const [state, setState] = useState<UseOpenVideoState>({
    spaces: [],
    assets: [],
    isLoading: false,
    error: null,
  });

  // Load spaces on mount
  useEffect(() => {
    loadSpaces();
  }, []);

  const loadSpaces = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true, error: null }));

    try {
      // ✅ Uses SDK which routes to /openvideo in browser
      const ov = getOpenVideo();
      const spaces = await ov.spaces.list();
      setState((s) => ({ ...s, spaces, isLoading: false }));
    } catch (err) {
      setState((s) => ({
        ...s,
        error: err instanceof Error ? err : new Error(String(err)),
        isLoading: false,
      }));
    }
  }, []);

  const createSpace = useCallback(async (name: string) => {
    setState((s) => ({ ...s, isLoading: true, error: null }));

    try {
      // ✅ Uses SDK which routes to /openvideo in browser
      const ov = getOpenVideo();
      const space = await ov.spaces.create({ name });
      setState((s) => ({
        ...s,
        spaces: [space, ...s.spaces],
        isLoading: false,
      }));
      return space;
    } catch (err) {
      setState((s) => ({
        ...s,
        error: err instanceof Error ? err : new Error(String(err)),
        isLoading: false,
      }));
      throw err;
    }
  }, []);

  const loadAssets = useCallback(async (spaceId: string) => {
    setState((s) => ({ ...s, isLoading: true, error: null }));

    try {
      // ✅ Uses SDK which routes to /openvideo in browser
      const ov = getOpenVideo();
      const assets = await ov.assets.list(spaceId);
      setState((s) => ({ ...s, assets, isLoading: false }));
      return assets;
    } catch (err) {
      setState((s) => ({
        ...s,
        error: err instanceof Error ? err : new Error(String(err)),
        isLoading: false,
      }));
      throw err;
    }
  }, []);

  const registerAsset = useCallback(
    async (
      spaceId: string,
      id: string,
      name: string,
      type: "image" | "video" | "audio",
      src: string,
      duration?: number,
      size?: number,
    ) => {
      try {
        // ✅ Uses SDK which routes to /openvideo in browser
        const ov = getOpenVideo();
        const asset = await ov.assets.register({
          spaceId,
          id,
          name,
          type,
          src,
          duration,
          size,
        });
        setState((s) => ({ ...s, assets: [asset, ...s.assets] }));
        return asset;
      } catch (err) {
        console.error("Failed to register asset:", err);
        throw err;
      }
    },
    [],
  );

  const clearError = useCallback(() => {
    setState((s) => ({ ...s, error: null }));
  }, []);

  return {
    ...state,
    refresh: loadSpaces,
    createSpace,
    loadAssets,
    registerAsset,
    clearError,
  };
}

// Re-export types
export type { Space, Asset };
