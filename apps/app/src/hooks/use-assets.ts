"use client";

import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import type { schema } from "@openvideo/db";

// Use schema type for Asset with relations
type Asset = typeof schema.asset.$inferSelect & {
  indexingStatus?: typeof schema.assetIndexingStatus.$inferSelect | null;
};

interface UseAssetsOptions {
  spaceId: string;
}

export function useAssets({ spaceId }: UseAssetsOptions) {
  const [error, setError] = useState<Error | null>(null);

  // Queries
  const {
    data: assets = [],
    isLoading,
    refetch,
  } = trpc.asset.list.useQuery({ spaceId }, { enabled: !!spaceId });

  // Mutations
  const createMutation = trpc.asset.create.useMutation({
    onSuccess: () => refetch(),
    onError: (err) => setError(new Error(err.message)),
  });

  const deleteMutation = trpc.asset.delete.useMutation({
    onSuccess: () => refetch(),
    onError: (err) => setError(new Error(err.message)),
  });

  const triggerIndexMutation = trpc.asset.triggerIndex.useMutation({
    onError: (err) => setError(new Error(err.message)),
  });

  const createAsset = useCallback(
    async (params: {
      name: string;
      type: "image" | "video" | "audio" | "other";
      src: string;
      duration?: number;
      size?: number;
      id?: string;
      autoIndex?: boolean;
    }) => {
      try {
        const asset = await createMutation.mutateAsync({
          spaceId,
          ...params,
        });
        return asset;
      } catch (err) {
        throw err instanceof Error ? err : new Error(String(err));
      }
    },
    [createMutation, spaceId],
  );

  const deleteAsset = useCallback(
    async (id: string) => {
      try {
        await deleteMutation.mutateAsync({ id, spaceId });
      } catch (err) {
        throw err instanceof Error ? err : new Error(String(err));
      }
    },
    [deleteMutation, spaceId],
  );

  const triggerIndex = useCallback(
    async (id: string) => {
      try {
        await triggerIndexMutation.mutateAsync({ id, spaceId });
      } catch (err) {
        throw err instanceof Error ? err : new Error(String(err));
      }
    },
    [triggerIndexMutation, spaceId],
  );

  const refresh = useCallback(() => {
    refetch();
  }, [refetch]);

  return {
    assets,
    isLoading,
    error,
    createAsset,
    deleteAsset,
    triggerIndex,
    refresh,
  };
}

// Hook for single asset
export function useAsset(assetId: string | null, spaceId: string | null) {
  const { data: asset, isLoading } = trpc.asset.getById.useQuery(
    { id: assetId!, spaceId: spaceId! },
    { enabled: !!assetId && !!spaceId },
  );

  return {
    asset,
    isLoading,
  };
}
