import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ResourceManager, ResourceStatus } from './resource-manager';
import { AssetManager } from '../utils/asset-manager';

vi.mock('../utils/asset-manager', () => ({
  AssetManager: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

describe('ResourceManager', () => {
  let resourceManager: ResourceManager;

  beforeEach(() => {
    resourceManager = new ResourceManager();
    vi.clearAllMocks();
  });

  it('should-preload-multiple-urls-in-parallel', async () => {
    const urls = [
      'https://cdn.scenify.io/test-video-1.mp4',
      'https://cdn.scenify.io/test-video-2.mp4',
    ];

    // Mock AssetManager.get to return null (not in cache)
    (AssetManager.get as any).mockResolvedValue(null);

    // Mock global fetch
    const mockResponse = {
      ok: true,
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array([1, 2, 3]));
          controller.close();
        },
      }),
    };
    const fetchMock = vi.fn().mockResolvedValue(mockResponse);
    vi.stubGlobal('fetch', fetchMock);
    (AssetManager.put as any).mockResolvedValue({ kind: 'file' });

    await resourceManager.preload(urls);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(AssetManager.put).toHaveBeenCalledTimes(2);

    const statusA = resourceManager.getStatus(urls[0]);
    const statusB = resourceManager.getStatus(urls[1]);

    expect(statusA?.status).toBe(ResourceStatus.COMPLETED);
    expect(statusB?.status).toBe(ResourceStatus.COMPLETED);
  });

  it('should-reuse-cached-assets-from-opfs', async () => {
    const url = 'https://cdn.scenify.io/test-video-1.mp4';
    const mockFile = { kind: 'file' };

    // Mock AssetManager.get to return the file (in cache)
    (AssetManager.get as any).mockResolvedValue(mockFile);

    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await resourceManager.resolve(url);

    expect(AssetManager.get).toHaveBeenCalledWith(url);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result).toBe(mockFile);
  });

  it('should-handle-failed-downloads-gracefully', async () => {
    const url = 'http://example.com/fail.mp4';

    (AssetManager.get as any).mockResolvedValue(null);
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    vi.stubGlobal('fetch', fetchMock);

    await resourceManager.loadResource(url);

    const status = resourceManager.getStatus(url);
    expect(status?.status).toBe(ResourceStatus.FAILED);
    expect(status?.error).toBeDefined();
  });
});
