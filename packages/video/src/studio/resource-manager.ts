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
        // 1. Check OPFS cache
        const cachedFile = await AssetManager.get(url);
        if (cachedFile) {
          item.status = ResourceStatus.COMPLETED;
          item.localFile = cachedFile;
          return item;
        }

        // 2. Fetch from remote
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
        }

        // 3. Save to OPFS while streaming? 
        // AssetManager.put takes a stream.
        const stream = response.body;
        if (!stream) throw new Error('Response body is null');

        const localFile = await AssetManager.put(url, stream);
        
        item.status = ResourceStatus.COMPLETED;
        item.localFile = localFile;
        return item;
      } catch (err) {
        item.status = ResourceStatus.FAILED;
        item.error = err instanceof Error ? err : new Error(String(err));
        console.error(`ResourceManager: Failed to load ${url}`, err);
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
