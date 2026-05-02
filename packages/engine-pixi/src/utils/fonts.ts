export interface IFont {
  name: string;
  url: string;
}

export class FontManager {
  private static instance: FontManager;
  private fonts: Map<string, FontFace> = new Map();

  private constructor() {}

  public static getInstance(): FontManager {
    if (!FontManager.instance) {
      FontManager.instance = new FontManager();
    }
    return FontManager.instance;
  }

  public async addFont(font: IFont): Promise<void> {
    if (this.fonts.has(font.name)) {
      return;
    }

    try {
      const fontFace = new FontFace(font.name, `url(${font.url})`);
      const loadedFace = await fontFace.load();
      document.fonts.add(loadedFace);
      this.fonts.set(font.name, loadedFace);
    } catch (error) {
      console.error(`Failed to load font ${font.name}:`, error);
      // We don't throw here to allow other fonts to load if one fails in a batch
    }
  }

  public async loadFonts(fonts: IFont[]): Promise<void> {
    await Promise.all(fonts.map((font) => this.addFont(font)));
  }

  public removeFont(fontName: string): void {
    const fontFace = this.fonts.get(fontName);
    if (fontFace) {
      document.fonts.delete(fontFace);
      this.fonts.delete(fontName);
    }
  }

  public clear(): void {
    this.fonts.forEach((fontFace) => {
      document.fonts.delete(fontFace);
    });
    this.fonts.clear();
  }

  public getLoadedFonts(): string[] {
    return Array.from(this.fonts.keys());
  }
}

export const fontManager = FontManager.getInstance();
