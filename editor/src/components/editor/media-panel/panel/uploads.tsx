'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useStudioStore } from '@/stores/studio-store';
import { Image, Video, Log } from '@designcombo/video';
import { Upload, Film } from 'lucide-react';
import { uploadFile } from '@/lib/upload-utils';

interface VisualAsset {
  id: string;
  type: 'image' | 'video';
  src: string;
  name: string;
  preview?: string;
  width?: number;
  height?: number;
  duration?: number;
  size?: number;
}

const STORAGE_KEY = 'designcombo_uploads';

export default function PanelUploads() {
  const { studio } = useStudioStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [uploads, setUploads] = useState<VisualAsset[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoaded, setIsLoaded] = useState(false);

  // Load uploads from local storage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setUploads(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load uploads', e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save uploads to local storage whenever they change
  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(uploads));
  }, [uploads, isLoaded]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const result = await uploadFile(file);
      const type = file.type.startsWith('image/') ? 'image' : 'video';

      const newAsset: VisualAsset = {
        id: crypto.randomUUID(),
        type,
        src: result.url,
        name: result.fileName,
        size: file.size,
      };

      setUploads((prev) => [newAsset, ...prev]);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const addItemToCanvas = async (asset: VisualAsset) => {
    if (!studio) return;

    try {
      if (asset.type === 'image') {
        const imageClip = await Image.fromUrl(asset.src + '?v=' + Date.now());
        imageClip.display = { from: 0, to: 5 * 1e6 };
        imageClip.duration = 5 * 1e6;

        // Scale to fit and center in scene (1080x1920)
        await imageClip.scaleToFit(1080, 1920);
        imageClip.centerInScene(1080, 1920);

        await studio.addClip(imageClip);
      } else {
        const videoClip = await Video.fromUrl(asset.src);
        // Scale to fit and center in scene (1080x1920)
        await videoClip.scaleToFit(1080, 1920);
        videoClip.centerInScene(1080, 1920);
        await studio.addClip(videoClip);
      }
    } catch (error) {
      Log.error(`Failed to add ${asset.type}:`, error);
    }
  };

  const filteredAssets = uploads.filter((asset) => {
    const matchesSearch = asset.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center w-full p-4">
        <Button
          className="w-full h-9"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          <Upload size={14} />
          <span className="text-xs font-medium">
            {isUploading ? 'Uploading...' : 'Upload'}
          </span>
        </Button>
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*,video/*"
          onChange={handleFileUpload}
        />
      </div>

      <ScrollArea className="flex-1 px-4">
        {filteredAssets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
            <Upload size={32} className="opacity-50" />
            <span className="text-sm">No uploads found</span>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-2">
            {filteredAssets.map((asset) => (
              <div
                key={asset.id}
                className="group relative aspect-square rounded-md overflow-hidden bg-secondary/50 cursor-pointer border border-transparent hover:border-primary/50 transition-all"
                onClick={() => addItemToCanvas(asset)}
              >
                {asset.type === 'image' ? (
                  <img
                    src={asset.src}
                    alt={asset.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-black/20">
                    <video
                      src={asset.src}
                      className="w-full h-full object-cover pointer-events-none"
                    />
                    <Film
                      className="absolute text-white/70 drop-shadow-md"
                      size={24}
                    />
                  </div>
                )}

                <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-[10px] text-white truncate font-medium">
                    {asset.name}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
