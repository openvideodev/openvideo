'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useStudioStore } from '@/stores/studio-store';
import { ImageClip, VideoClip, Log } from '@designcombo/video';
import {
  Upload,
  Search,
  Image as ImageIcon,
  Film,
  ChevronDown,
} from 'lucide-react';
import { uploadFile } from '@/lib/upload-utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { VisualsChatPanel } from '../visuals-chat-panel';

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

export function PanelVisuals() {
  const { studio } = useStudioStore();
  const [activeTab, setActiveTab] = useState<
    'all' | 'images' | 'videos' | 'uploads'
  >('all');
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
      // Ideally show a toast here
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
        const imageClip = await ImageClip.fromUrl(
          asset.src + '?v=' + Date.now()
        );
        imageClip.display = { from: 0, to: 5 * 1e6 };
        imageClip.duration = 5 * 1e6;

        // Scale to fit and center in scene (1280x720)
        await imageClip.scaleToFit(1080, 1920);
        imageClip.centerInScene(1080, 1920);

        await studio.addClip(imageClip);
      } else {
        const videoClip = await VideoClip.fromUrl(asset.src);
        // VideoClip defaults usually handle duration automatically or via metadata
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
    const matchesTab =
      activeTab === 'all' ||
      activeTab === 'uploads' || // Currently all items are uploads in this implementation
      (activeTab === 'images' && asset.type === 'image') ||
      (activeTab === 'videos' && asset.type === 'video');

    return matchesSearch && matchesTab;
  });

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header / Toolbar */}
      <div className="flex items-center bg-panel gap-2 p-4 border-b border-border/50">
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          size={'sm'}
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

        <div className="flex-1">
          <InputGroup className="h-8">
            <InputGroupAddon className="bg-secondary/30 pointer-events-none text-muted-foreground w-8 justify-center">
              <Search size={14} />
            </InputGroupAddon>

            <InputGroupInput
              placeholder="Search..."
              className="bg-secondary/30 border-0 h-full text-xs box-border pl-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </InputGroup>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size={'sm'}>
              {activeTab === 'all'
                ? 'All'
                : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
              <ChevronDown size={10} className="opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setActiveTab('all')}>
              All Assets
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setActiveTab('images')}>
              Images
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setActiveTab('videos')}>
              Videos
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setActiveTab('uploads')}>
              Uploads
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Grid Content */}
      <ScrollArea className="flex-1 p-4 h-full">
        {filteredAssets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
            <ImageIcon size={32} className="opacity-50" />
            <span className="text-sm">No assets found</span>
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

                {/* Overlay info */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-[10px] text-white truncate font-medium">
                    {asset.name}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
      <div className="h-2 bg-background"></div>
      <div className="h-48">
        <VisualsChatPanel />
      </div>
    </div>
  );
}
