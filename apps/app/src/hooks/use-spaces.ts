"use client";

import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import type { schema } from "@openvideo/db";

// Use schema type for Space
type Space = typeof schema.space.$inferSelect;

interface UseSpacesState {
  spaces: Space[];
  isLoading: boolean;
  error: Error | null;
}

export function useSpaces() {
  const [error, setError] = useState<Error | null>(null);

  // Queries
  const { data: spaces = [], isLoading, refetch } = trpc.space.list.useQuery();

  // Mutations
  const createMutation = trpc.space.create.useMutation({
    onSuccess: () => refetch(),
    onError: (err) => setError(new Error(err.message)),
  });

  const updateMutation = trpc.space.update.useMutation({
    onSuccess: () => refetch(),
    onError: (err) => setError(new Error(err.message)),
  });

  const deleteMutation = trpc.space.delete.useMutation({
    onSuccess: () => refetch(),
    onError: (err) => setError(new Error(err.message)),
  });

  const createSpace = useCallback(
    async (name: string, options?: { description?: string; width?: number; height?: number }) => {
      try {
        const space = await createMutation.mutateAsync({
          name,
          description: options?.description,
          width: options?.width,
          height: options?.height,
        });
        return space;
      } catch (err) {
        throw err instanceof Error ? err : new Error(String(err));
      }
    },
    [createMutation],
  );

  const updateSpace = useCallback(
    async (id: string, updates: Partial<Space>) => {
      try {
        const space = await updateMutation.mutateAsync({ id, ...updates });
        return space;
      } catch (err) {
        throw err instanceof Error ? err : new Error(String(err));
      }
    },
    [updateMutation],
  );

  const deleteSpace = useCallback(
    async (id: string) => {
      try {
        await deleteMutation.mutateAsync({ id });
      } catch (err) {
        throw err instanceof Error ? err : new Error(String(err));
      }
    },
    [deleteMutation],
  );

  const refresh = useCallback(() => {
    refetch();
  }, [refetch]);

  return {
    spaces,
    isLoading,
    error,
    createSpace,
    updateSpace,
    deleteSpace,
    refresh,
  };
}

// Hook for single space operations
export function useSpace(spaceId: string | null) {
  const { data: space, isLoading } = trpc.space.getById.useQuery(
    { id: spaceId! },
    { enabled: !!spaceId },
  );

  const { data: session } = trpc.space.getDirectorSession.useQuery(
    { spaceId: spaceId! },
    { enabled: !!spaceId },
  );

  return {
    space,
    session,
    isLoading,
  };
}
