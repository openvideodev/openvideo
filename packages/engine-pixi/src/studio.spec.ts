import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Studio, Text, Image as ImageClip } from './index';

describe('studio-core-functionality', () => {
  let studio: Studio;
  let canvas: HTMLCanvasElement;

  beforeEach(async () => {
    canvas = document.createElement('canvas');
    document.body.appendChild(canvas);

    studio = new Studio({
      canvas,
      width: 1280,
      height: 720,
    });

    await studio.ready;
  });

  afterEach(() => {
    studio?.destroy();
    if (canvas && canvas.parentElement) {
      document.body.removeChild(canvas);
    }
  });

  describe('clip-management', () => {
    it('should-add-and-remove-a-text-clip', async () => {
      const text = new Text('Hello World');
      text.duration = 5e6;
      await studio.addClip(text);

      expect(studio.clips.length).toBe(1);
      expect(studio.clips[0].id).toBe(text.id);

      await studio.removeClip(text.id);
      expect(studio.clips.length).toBe(0);
    });

    it('should-add-multiple-clips-and-maintain-order', async () => {
      const text = new Text('Text Clip');
      text.duration = 5e6;
      const dataUrl =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
      const image = await ImageClip.fromUrl(dataUrl, dataUrl);
      image.duration = 5e6;

      await studio.addClip(text);
      await studio.addClip(image);

      expect(studio.clips.length).toBe(2);
      expect(studio.clips[0].id).toBe(text.id);
      expect(studio.clips[1].id).toBe(image.id);
    });

    it('should-update-clip-properties-using-updateclip', async () => {
      const text = new Text('Update Test');
      text.duration = 5e6;
      await studio.addClip(text);

      await studio.updateClip(text.id, { left: 100, top: 200, opacity: 0.5 });

      const updatedClip = studio.clips[0];
      expect(updatedClip.left).toBe(100);
      expect(updatedClip.top).toBe(200);
      expect(updatedClip.opacity).toBe(0.5);
    });

    it('should-batch-update-clips-using-updateclips', async () => {
      const text1 = new Text('Text 1');
      const text2 = new Text('Text 2');
      text1.duration = 5e6;
      text2.duration = 5e6;
      await studio.addClip(text1);
      await studio.addClip(text2);

      await studio.updateClips([
        { id: text1.id, updates: { left: 50 } },
        { id: text2.id, updates: { left: 150 } },
      ]);

      expect(studio.clips.find((c) => c.id === text1.id)?.left).toBe(50);
      expect(studio.clips.find((c) => c.id === text2.id)?.left).toBe(150);
    });
  });

  describe('selection-operations', () => {
    it('should-delete-selected-clips', async () => {
      const text = new Text('To Delete');
      text.duration = 5e6;
      await studio.addClip(text);

      // Simulate selection
      studio.selection.selectClip(text);
      expect(studio.selectedClips.size).toBe(1);

      await studio.deleteSelected();
      expect(studio.clips.length).toBe(0);
    });

    it('should-duplicate-selected-clips', async () => {
      const text = new Text('Original');
      text.duration = 5e6;
      text.left = 100;
      await studio.addClip(text);

      studio.selection.selectClip(text);
      await studio.duplicateSelected();

      expect(studio.clips.length).toBe(2);
      const duplicate = studio.clips.find((c) => c.id !== text.id);
      expect(duplicate).toBeDefined();
      expect(duplicate?.left).toBe(text.left);
      expect((duplicate as any).text).toBe('Original');
    });

    it('should-split-selected-clip-at-current-time', async () => {
      const text = new Text('Split Me');
      text.display.from = 0;
      text.display.to = 10e6; // 10 seconds
      text.duration = 10e6;
      await studio.addClip(text);

      await studio.seek(5e6); // Seek to 5 seconds
      studio.selection.selectClip(text);

      await studio.splitSelected();

      expect(studio.clips.length).toBe(2);

      const firstPart = studio.clips.find((c) => c.display.from === 0);
      const secondPart = studio.clips.find((c) => c.display.from === 5e6);

      expect(firstPart).toBeDefined();
      expect(secondPart).toBeDefined();
      expect(firstPart?.display.to).toBe(5e6);
      expect(secondPart?.display.to).toBe(10e6);
    });
  });

  describe('timeline-control', () => {
    it('should-seek-to-specific-time', async () => {
      const text = new Text('Seek Test');
      text.duration = 10e6;
      await studio.addClip(text); // Ensures maxDuration > 0

      await studio.seek(2e6); // 2 seconds
      expect(studio.currentTime).toBe(2e6);
    });

    it('should-change-frame-using-framenext-frameprev', async () => {
      const text = new Text('Frame Test');
      text.duration = 10e6;
      await studio.addClip(text);

      const initialTime = studio.currentTime;
      const fps = studio.opts.fps || 30;
      const frameDuration = 1000000 / fps;

      await studio.frameNext();
      expect(studio.currentTime).toBeCloseTo(initialTime + frameDuration, 1);

      await studio.framePrev();
      expect(studio.currentTime).toBeCloseTo(initialTime, 1);
    });
  });

  describe('serialization-data-parity', () => {
    it('should-persist-complex-state-after-export-and-reload', async () => {
      const text = new Text('Serial Test', { fontSize: 80, fill: '#ff0000' });
      text.left = 50;
      text.opacity = 0.7;
      text.duration = 5e6;
      await studio.addClip(text);

      const dataUrl =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
      const image = await ImageClip.fromUrl(dataUrl, dataUrl);
      image.top = 100;
      image.opacity = 0.4;
      image.duration = 5e6;
      await studio.addClip(image);

      const json = studio.exportToJSON();
      await studio.clear();
      expect(studio.clips.length).toBe(0);

      await studio.loadFromJSON(json);

      expect(studio.clips.length).toBe(2);

      const reloadedText = studio.clips.find((c) => c.type === 'Text') as Text;
      const reloadedImage = studio.clips.find(
        (c) => c.type === 'Image'
      ) as ImageClip;

      expect(reloadedText).toBeDefined();
      expect(reloadedImage).toBeDefined();
      expect(reloadedText.text).toBe('Serial Test');
      expect(reloadedText.opacity).toBe(0.7);
      expect(reloadedText.left).toBe(50);
      expect(reloadedText.style.fontSize).toBe(80);

      expect(reloadedImage.opacity).toBe(0.4);
      expect(reloadedImage.top).toBe(100);
    });
  });
});
