import { file } from 'opfs-tools';
import { AssetManager } from '../utils/asset-manager';

export enum ResourceStatus {
  PENDING = 'pending',
  LOADING = 'loading',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface ResourceItem {
  url: string;
  status: ResourceStatus;
  localFile?: ReturnType<typeof file>;
  error?: Error;
}

/**
 * ResourceManager handles asset preloading and caching in OPFS.
 * It ensures that resources are downloaded only once and reused across sessions.
 */
export class ResourceManager {
  private resources = new Map<string, ResourceItem>();
  private loadingPromises = new Map<string, Promise<ResourceItem>>();

  /**
   * Preload a batch of URLs in parallel.
   * @param urls Array of URLs to preload
   */
  async preload(urls: string[]): Promise<void> {
    const uniqueUrls = [...new Set(urls)].filter((url) => {
      // Skip data URLs and blob URLs
      return url && !url.startsWith('data:') && !url.startsWith('blob:');
    });

    const promises = uniqueUrls.map((url) => this.loadResource(url));
    await Promise.allSettled(promises);
  }

  /**
   * Get a ReadableStream for the given URL, with transparent caching.
   * @param url URL to fetch
   */
  static async getReadableStream(
    url: string
  ): Promise<ReadableStream<Uint8Array>> {
    const cachedFile = await AssetManager.get(url);
    if (cachedFile) {
      const originFile = await cachedFile.getOriginFile();
      if (originFile) return originFile.stream();
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch: ${response.status} ${response.statusText}`
      );
    }

    const stream = response.body;
    if (!stream) throw new Error('Response body is null');

    // Skip caching for data/blob URLs
    if (url.startsWith('data:') || url.startsWith('blob:')) {
      return stream;
    }

    const [s1, s2] = stream.tee();

    // Background cache
    AssetManager.put(url, s2).catch((err) => {
      console.error(`ResourceManager: Failed to cache ${url}`, err);
    });

    return s1;
  }

  /**
   * Get an ImageBitmap for the given URL, with transparent caching.
   */
  static async getImageBitmap(url: string): Promise<ImageBitmap> {
    const cachedFile = await AssetManager.get(url);
    if (cachedFile) {
      const originFile = await cachedFile.getOriginFile();
      if (originFile) return await createImageBitmap(originFile);
    }

    if (url.startsWith('data:') || url.startsWith('blob:')) {
      const response = await fetch(url);
      const blob = await response.blob();
      return await createImageBitmap(blob);
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch: ${response.status} ${response.statusText}`
      );
    }

    const stream = response.body;
    if (!stream) throw new Error('Response body is null');

    const [s1, s2] = stream.tee();

    const bitmapPromise = (async () => {
      const resp = new Response(s1);
      const blob = await resp.blob();
      return await createImageBitmap(blob);
    })();

    // Background cache
    AssetManager.put(url, s2).catch((err) => {
      console.error(`ResourceManager: Failed to cache ${url}`, err);
    });

    return await bitmapPromise;
  }

  /**
   * Load a single resource, using cache if available.
   * @param url URL to load
   */
  async loadResource(url: string): Promise<ResourceItem> {
    // If already loading or loaded, return the existing promise or result
    const existingPromise = this.loadingPromises.get(url);
    if (existingPromise) return existingPromise;

    if (this.resources.has(url)) {
      const res = this.resources.get(url)!;
      if (res.status === ResourceStatus.COMPLETED) return res;
    }

    const loadPromise = (async (): Promise<ResourceItem> => {
      const item: ResourceItem = { url, status: ResourceStatus.LOADING };
      this.resources.set(url, item);

      try {
        const localFile = await AssetManager.get(url);
        if (localFile) {
          item.status = ResourceStatus.COMPLETED;
          item.localFile = localFile;
          return item;
        }

        // Fetch and cache in background
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);

        const stream = response.body;
        if (!stream) throw new Error('No body');

        // We can't easily tee here if we want to return a completed status immediately...
        // but loadResource is mostly for PRELOADING, so it's okay if it takes a bit.
        const file = await AssetManager.put(url, stream);

        item.status = ResourceStatus.COMPLETED;
        item.localFile = file;
        return item;
      } catch (err) {
        item.status = ResourceStatus.FAILED;
        item.error = err instanceof Error ? err : new Error(String(err));
        return item;
      } finally {
        this.loadingPromises.delete(url);
      }
    })();

    this.loadingPromises.set(url, loadPromise);
    return loadPromise;
  }

  /**
   * Resolve a URL to its local OPFS file if available.
   * @param url URL to resolve
   */
  async resolve(url: string): Promise<ReturnType<typeof file> | string> {
    // If it's not a remote URL, return as is
    if (!url || url.startsWith('data:') || url.startsWith('blob:')) {
      return url;
    }

    const item = await this.loadResource(url);
    if (item.status === ResourceStatus.COMPLETED && item.localFile) {
      return item.localFile;
    }

    return url;
  }

  /**
   * Get the status of a specific resource.
   */
  getStatus(url: string): ResourceItem | undefined {
    return this.resources.get(url);
  }

  /**
   * Clear instance state (not OPFS cache).
   */
  clear(): void {
    this.resources.clear();
    this.loadingPromises.clear();
  }
}
