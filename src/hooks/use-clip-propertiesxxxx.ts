import { useEffect, useState, useCallback, useRef } from 'react';

/**
 * Hook to manage clip properties with automatic event listeners and optional debouncing.
 * Prevents unnecessary re-renders while editing properties and keeps UI in sync with canvas.
 *
 * @param clip - The clip object to manage
 * @param debounceMs - Optional debounce time in milliseconds (default: 0 for immediate updates)
 *
 * @example
 * // Basic usage (immediate updates)
 * const { updateClip, updateStyle } = useClipProperties(clip);
 *
 * <NumberInput
 *   value={clip.left}
 *   onChange={(val) => updateClip({ left: val })}
 * />
 *
 * @example
 * // With debouncing (for expensive operations)
 * const { updateClip, updateStyle } = useClipProperties(clip, 300);
 *
 * <Textarea
 *   value={clip.text}
 *   onChange={(e) => updateClip({ text: e.target.value })}
 * />
 */
export function useClipProperties<T extends Record<string, any>>(
  clip: any,
  debounceMs: number = 0
) {
  const [localState, setLocalState] = useState<Partial<T>>({});
  const [, forceUpdate] = useState(0);
  const debounceTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const isUpdatingRef = useRef(false);

  // Automatically listen to clip events for canvas sync
  useEffect(() => {
    if (!clip) return;

    const onPropsChange = () => {
      if (!isUpdatingRef.current) {
        forceUpdate((n: number) => n + 1);
      }
    };

    // Listen to all relevant clip events
    clip.on?.('propsChange', onPropsChange);
    clip.on?.('moving', onPropsChange);
    clip.on?.('scaling', onPropsChange);
    clip.on?.('rotating', onPropsChange);

    return () => {
      clip.off?.('propsChange', onPropsChange);
      clip.off?.('moving', onPropsChange);
      clip.off?.('scaling', onPropsChange);
      clip.off?.('rotating', onPropsChange);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [clip]);

  /**
   * Update clip properties with optional debouncing
   */
  const updateClip = useCallback(
    (updates: Partial<T>) => {
      if (!clip) return;

      isUpdatingRef.current = true;

      if (debounceMs > 0) {
        // Update local state immediately for responsive UI
        setLocalState((prev) => ({ ...prev, ...updates }));

        // Debounce the actual clip update
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
          clip.update?.(updates);
          setLocalState({});
          isUpdatingRef.current = false;
        }, debounceMs);
      } else {
        // Immediate update (default behavior)
        clip.update?.(updates);
        isUpdatingRef.current = false;
      }
    },
    [clip, debounceMs]
  );

  /**
   * Update clip style properties
   */
  const updateStyle = useCallback(
    (styleUpdates: any) => {
      if (!clip) return;

      const style = clip.style || {};
      updateClip({
        style: {
          ...style,
          ...styleUpdates,
        },
      } as any);
    },
    [clip, updateClip]
  );

  /**
   * Get current value with local state override (useful with debouncing)
   */
  const getValue = useCallback(
    <K extends keyof T>(key: K): T[K] | undefined => {
      if (key in localState) {
        return localState[key] as T[K];
      }
      return clip?.[key];
    },
    [clip, localState]
  );

  return {
    /** Update clip properties */
    updateClip,
    /** Update clip style properties */
    updateStyle,
    /** Get current value (with local state override if debouncing) */
    getValue,
    /** The clip object */
    clip,
  };
}
