import { file, write } from 'opfs-tools';

export class AssetManager {
  private static async getCacheKey(url: string): Promise<string> {
    // Basic hash for URL to use as filename
    const encoder = new TextEncoder();
    const data = encoder.encode(url);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  private static getPath(key: string): string {
    return `assets/${key}`;
  }

  static async get(url: string) {
    const key = await this.getCacheKey(url);
    const path = this.getPath(key);
    const f = file(path);
    if (await f.exists()) {
      return f;
    }
    return null;
  }

  static async put(url: string, stream: ReadableStream<Uint8Array>) {
    const key = await this.getCacheKey(url);
    const path = this.getPath(key);
    const f = file(path);
    await write(f, stream as any);
    return f;
  }
}
