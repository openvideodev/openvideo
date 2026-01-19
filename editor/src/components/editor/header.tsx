import { useState } from 'react';
import { IconShare } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { useStudioStore } from '@/stores/studio-store';
import { Log, type IClip } from '@designcombo/video';
import { ExportModal } from './export-modal';
import { LogoIcons } from '../shared/logos';
import Link from 'next/link';
import { Icons } from '../shared/icons';
import { Keyboard } from 'lucide-react';
import { ShortcutsModal } from './shortcuts-modal';
import { useEffect } from 'react';

export default function Header() {
  const { studio } = useStudioStore();
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  useEffect(() => {
    if (!studio) return;

    setCanUndo(studio.history.canUndo());
    setCanRedo(studio.history.canRedo());

    const handleHistoryChange = ({
      canUndo,
      canRedo,
    }: {
      canUndo: boolean;
      canRedo: boolean;
    }) => {
      setCanUndo(canUndo);
      setCanRedo(canRedo);
    };

    studio.on('history:changed', handleHistoryChange);

    return () => {
      studio.off('history:changed', handleHistoryChange);
    };
  }, [studio]);

  const handleNew = () => {
    if (!studio) return;
    const confirmed = window.confirm(
      'Are you sure you want to start a new project? Unsaved changes will be lost.'
    );
    if (confirmed) {
      studio.clear();
    }
  };

  const handleExportJSON = () => {
    if (!studio) return;

    try {
      // Get all clips from studio
      const clips = (studio as any).clips as IClip[];
      if (clips.length === 0) {
        alert('No clips to export');
        return;
      }

      // Export to JSON
      const json = studio.exportToJSON();
      const jsonString = JSON.stringify(json, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      // Download the JSON file
      const aEl = document.createElement('a');
      document.body.appendChild(aEl);
      aEl.href = url;
      aEl.download = `combo-project-${Date.now()}.json`;
      aEl.click();

      // Cleanup
      setTimeout(() => {
        if (document.body.contains(aEl)) {
          document.body.removeChild(aEl);
        }
        URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      Log.error('Export to JSON error:', error);
      alert('Failed to export to JSON: ' + (error as Error).message);
    }
  };

  const handleImportJSON = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.style.display = 'none';

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const json = JSON.parse(text);

        if (!json.clips || !Array.isArray(json.clips)) {
          throw new Error('Invalid JSON format: missing clips array');
        }

        if (!studio) {
          throw new Error('Studio not initialized');
        }

        // Filter out clips with empty sources (except Text, Caption, and Effect)
        const validClips = json.clips.filter((clipJSON: any) => {
          if (
            clipJSON.type === 'Text' ||
            clipJSON.type === 'Caption' ||
            clipJSON.type === 'Effect' ||
            clipJSON.type === 'Transition'
          ) {
            return true;
          }
          return clipJSON.src && clipJSON.src.trim() !== '';
        });

        if (validClips.length === 0) {
          throw new Error(
            'No valid clips found in JSON. All clips have empty source URLs.'
          );
        }

        const validJson = { ...json, clips: validClips };
        await studio.loadFromJSON(validJson);
      } catch (error) {
        Log.error('Load from JSON error:', error);
        alert('Failed to load from JSON: ' + (error as Error).message);
      } finally {
        document.body.removeChild(input);
      }
    };

    document.body.appendChild(input);
    input.click();
  };

  return (
    <header className="relative flex h-[52px] w-full shrink-0 items-center justify-between px-4">
      {/* Left Section */}
      <div className="flex items-center gap-2">
        <div className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-md text-zinc-200">
          <LogoIcons.scenify width={20} />
        </div>

        <div className=" pointer-events-auto flex h-10 items-center px-1.5">
          <Button
            onClick={() => studio?.undo()}
            disabled={!canUndo}
            variant="ghost"
            size="icon"
          >
            <Icons.undo className="size-5" />
          </Button>
          <Button
            onClick={() => studio?.redo()}
            disabled={!canRedo}
            className="text-muted-foreground"
            variant="ghost"
            size="icon"
          >
            <Icons.redo className="size-5" />
          </Button>
        </div>
      </div>

      {/* Center Section */}
      <div className="absolute text-sm font-medium left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        Untitled video
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2">
        <div className="flex items-center mr-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => setIsShortcutsModalOpen(true)}
          >
            <Keyboard className="size-5" />
          </Button>
        </div>
        <Link href="https://discord.gg/SCfMrQx8kr" target="_blank">
          <Button className="h-7 rounded-lg" variant={'outline'}>
            <LogoIcons.discord className="w-6 h-6" />
            <span className="hidden md:block">Join Us</span>
          </Button>
        </Link>

        <ExportModal
          open={isExportModalOpen}
          onOpenChange={setIsExportModalOpen}
        />
        <ShortcutsModal
          open={isShortcutsModalOpen}
          onOpenChange={setIsShortcutsModalOpen}
        />

        <Button
          className="flex h-7 gap-1 border border-border"
          variant="outline"
          size={'sm'}
        >
          <IconShare width={18} />{' '}
          <span className="hidden md:block">Share</span>
        </Button>
        <Button
          size="sm"
          className="gap-2 rounded-full"
          onClick={() =>
            studio?.loadFromJSON({
              tracks: [
                {
                  id: 'track_captions_1768857266170',
                  name: 'Track 2',
                  type: 'Caption',
                  clipIds: [
                    'clip_1768857266171_erb5bz814',
                    'clip_1768857266185_bvd35f97f',
                    'clip_1768857266188_y0at7ot2g',
                    'clip_1768857266191_rojr0znyb',
                    'clip_1768857266193_m77iz8yky',
                    'clip_1768857266195_ke1ufu236',
                    'clip_1768857266197_5f8i526tc',
                    'clip_1768857266199_2acb988ix',
                    'clip_1768857266200_uqhz1f18b',
                    'clip_1768857266201_i61xskme4',
                    'clip_1768857266202_h0dskri4q',
                    'clip_1768857266203_gyqznekad',
                    'clip_1768857266204_rr0bwuote',
                    'clip_1768857266205_iq13hqip2',
                    'clip_1768857266206_a1yjdyx0u',
                    'clip_1768857266206_3co3gakln',
                    'clip_1768857266207_oem3z090v',
                    'clip_1768857266208_hdlzo68qz',
                    'clip_1768857266209_93y6w112r',
                    'clip_1768857266210_alqywl3ie',
                    'clip_1768857266211_5htxg0ipy',
                    'clip_1768857266211_us1h1y7sx',
                    'clip_1768857266212_l98mjsyn6',
                    'clip_1768857266214_i01sfk5nw',
                    'clip_1768857266216_quxd0lxl9',
                    'clip_1768857266217_5jqgdjxxj',
                    'clip_1768857266218_ixhts8e0f',
                    'clip_1768857266219_zlvitsk2p',
                    'clip_1768857266220_vmvhu7zzj',
                    'clip_1768857266221_fckv03lba',
                    'clip_1768857266222_2gmvgag8r',
                    'clip_1768857266223_3monjzdl1',
                    'clip_1768857266224_mlpq3k1xs',
                    'clip_1768857266225_kb2rmngou',
                    'clip_1768857266226_7f1lsjiqr',
                  ],
                },
                {
                  id: 'e30e40cc-c43b-4e2b-a6ae-d56ba36b36d1',
                  name: 'Video Track',
                  type: 'Video',
                  clipIds: ['clip_1768857260471_r0s11a5f7'],
                },
              ],
              clips: [
                {
                  type: 'Placeholder',
                  src: 'https://ik.imagekit.io/pablituuu/AI%20Tips,%20Tricks,%20and%20Shortcuts.mp4?updatedAt=1768806308265',
                  display: {
                    from: 30000,
                    to: 35030000,
                  },
                  playbackRate: 1,
                  duration: 35000000,
                  left: 0,
                  top: 0,
                  width: 1080,
                  height: 1920,
                  angle: 0,
                  zIndex: 10,
                  opacity: 1,
                  flip: null,
                  style: {},
                  trim: {
                    from: 0,
                    to: 35000000,
                  },
                },
                {
                  type: 'Caption',
                  src: '',
                  display: {
                    from: 240000,
                    to: 1040000,
                  },
                  playbackRate: 1,
                  duration: 800000,
                  left: 116.06001281738281,
                  top: 1754,
                  width: 847.8799743652344,
                  height: 136,
                  angle: 0,
                  zIndex: 20,
                  opacity: 1,
                  flip: null,
                  style: {
                    fontSize: 80,
                    fontFamily: 'Bangers-Regular',
                    fontWeight: '700',
                    fontStyle: 'normal',
                    color: '#ffffff',
                    align: 'center',
                    fontUrl:
                      'https://fonts.gstatic.com/s/poppins/v15/pxiByp8kv8JHgFVrLCz7V1tvFP-KUEg.ttf',
                    stroke: {
                      color: '#000000',
                      width: 4,
                    },
                    shadow: {
                      color: '#000000',
                      alpha: 0.5,
                      blur: 4,
                      distance: 0,
                      angle: 0,
                    },
                  },
                  trim: {
                    from: 0,
                    to: 0,
                  },
                  text: 'But what about the',
                  caption: {
                    words: [
                      {
                        text: 'But',
                        from: 0,
                        to: 240,
                        isKeyWord: true,
                        paragraphIndex: '',
                      },
                      {
                        text: 'what',
                        from: 240,
                        to: 479.9999700000001,
                        isKeyWord: false,
                        paragraphIndex: '',
                      },
                      {
                        text: 'about',
                        from: 479.9999700000001,
                        to: 640,
                        isKeyWord: false,
                        paragraphIndex: '',
                      },
                      {
                        text: 'the',
                        from: 640,
                        to: 800,
                        isKeyWord: true,
                        paragraphIndex: '',
                      },
                    ],
                    colors: {
                      appeared: '#ffffff',
                      active: '#ffffff',
                      activeFill: '#FF5700',
                      background: '',
                      keyword: '#ffffff',
                    },
                    preserveKeywordColor: true,
                    positioning: {
                      videoWidth: 1080,
                      videoHeight: 1920,
                    },
                  },
                  id: 'clip_1768857266171_erb5bz814',
                  effects: [],
                  mediaId: 'clip_1768857260471_r0s11a5f7',
                },
                {
                  type: 'Caption',
                  src: '',
                  display: {
                    from: 1040000,
                    to: 2080000,
                  },
                  playbackRate: 1,
                  duration: 1040000,
                  left: 159.04000854492188,
                  top: 1754,
                  width: 761.9199829101562,
                  height: 136,
                  angle: 0,
                  zIndex: 20,
                  opacity: 1,
                  flip: null,
                  style: {
                    fontSize: 80,
                    fontFamily: 'Bangers-Regular',
                    fontWeight: '700',
                    fontStyle: 'normal',
                    color: '#ffffff',
                    align: 'center',
                    fontUrl:
                      'https://fonts.gstatic.com/s/poppins/v15/pxiByp8kv8JHgFVrLCz7V1tvFP-KUEg.ttf',
                    stroke: {
                      color: '#000000',
                      width: 4,
                    },
                    shadow: {
                      color: '#000000',
                      alpha: 0.5,
                      blur: 4,
                      distance: 0,
                      angle: 0,
                    },
                  },
                  trim: {
                    from: 0,
                    to: 0,
                  },
                  text: 'AI space podcast',
                  caption: {
                    words: [
                      {
                        text: 'AI',
                        from: 0,
                        to: 320.00000000000006,
                        isKeyWord: true,
                        paragraphIndex: '',
                      },
                      {
                        text: 'space',
                        from: 320.00000000000006,
                        to: 559.9999,
                        isKeyWord: false,
                        paragraphIndex: '',
                      },
                      {
                        text: 'podcast',
                        from: 559.9999,
                        to: 1040,
                        isKeyWord: true,
                        paragraphIndex: '',
                      },
                    ],
                    colors: {
                      appeared: '#ffffff',
                      active: '#ffffff',
                      activeFill: '#FF5700',
                      background: '',
                      keyword: '#ffffff',
                    },
                    preserveKeywordColor: true,
                    positioning: {
                      videoWidth: 1080,
                      videoHeight: 1920,
                    },
                  },
                  id: 'clip_1768857266185_bvd35f97f',
                  effects: [],
                  mediaId: 'clip_1768857260471_r0s11a5f7',
                },
                {
                  type: 'Caption',
                  src: '',
                  display: {
                    from: 2080000,
                    to: 2960000,
                  },
                  playbackRate: 1,
                  duration: 880000,
                  left: 142.54000854492188,
                  top: 1754,
                  width: 794.9199829101562,
                  height: 136,
                  angle: 0,
                  zIndex: 20,
                  opacity: 1,
                  flip: null,
                  style: {
                    fontSize: 80,
                    fontFamily: 'Bangers-Regular',
                    fontWeight: '700',
                    fontStyle: 'normal',
                    color: '#ffffff',
                    align: 'center',
                    fontUrl:
                      'https://fonts.gstatic.com/s/poppins/v15/pxiByp8kv8JHgFVrLCz7V1tvFP-KUEg.ttf',
                    stroke: {
                      color: '#000000',
                      width: 4,
                    },
                    shadow: {
                      color: '#000000',
                      alpha: 0.5,
                      blur: 4,
                      distance: 0,
                      angle: 0,
                    },
                  },
                  trim: {
                    from: 0,
                    to: 0,
                  },
                  text: 'resonate with you',
                  caption: {
                    words: [
                      {
                        text: 'resonate',
                        from: 0,
                        to: 559.9998999999998,
                        isKeyWord: true,
                        paragraphIndex: '',
                      },
                      {
                        text: 'with',
                        from: 559.9998999999998,
                        to: 799.9999,
                        isKeyWord: false,
                        paragraphIndex: '',
                      },
                      {
                        text: 'you',
                        from: 799.9999,
                        to: 879.9999999999999,
                        isKeyWord: true,
                        paragraphIndex: '',
                      },
                    ],
                    colors: {
                      appeared: '#ffffff',
                      active: '#ffffff',
                      activeFill: '#FF5700',
                      background: '',
                      keyword: '#ffffff',
                    },
                    preserveKeywordColor: true,
                    positioning: {
                      videoWidth: 1080,
                      videoHeight: 1920,
                    },
                  },
                  id: 'clip_1768857266188_y0at7ot2g',
                  effects: [],
                  mediaId: 'clip_1768857260471_r0s11a5f7',
                },
                {
                  type: 'Caption',
                  src: '',
                  display: {
                    from: 2960000,
                    to: 4080000,
                  },
                  playbackRate: 1,
                  duration: 1120000,
                  left: 83.08001708984375,
                  top: 1754,
                  width: 913.8399658203125,
                  height: 136,
                  angle: 0,
                  zIndex: 20,
                  opacity: 1,
                  flip: null,
                  style: {
                    fontSize: 80,
                    fontFamily: 'Bangers-Regular',
                    fontWeight: '700',
                    fontStyle: 'normal',
                    color: '#ffffff',
                    align: 'center',
                    fontUrl:
                      'https://fonts.gstatic.com/s/poppins/v15/pxiByp8kv8JHgFVrLCz7V1tvFP-KUEg.ttf',
                    stroke: {
                      color: '#000000',
                      width: 4,
                    },
                    shadow: {
                      color: '#000000',
                      alpha: 0.5,
                      blur: 4,
                      distance: 0,
                      angle: 0,
                    },
                  },
                  trim: {
                    from: 0,
                    to: 0,
                  },
                  text: 'that made you say, I',
                  caption: {
                    words: [
                      {
                        text: 'that',
                        from: 0,
                        to: 239.9998000000001,
                        isKeyWord: true,
                        paragraphIndex: '',
                      },
                      {
                        text: 'made',
                        from: 239.9998000000001,
                        to: 399.9999999999999,
                        isKeyWord: false,
                        paragraphIndex: '',
                      },
                      {
                        text: 'you',
                        from: 399.9999999999999,
                        to: 560,
                        isKeyWord: false,
                        paragraphIndex: '',
                      },
                      {
                        text: 'say,',
                        from: 560,
                        to: 879.9999999999999,
                        isKeyWord: false,
                        paragraphIndex: '',
                      },
                      {
                        text: 'I',
                        from: 879.9999999999999,
                        to: 1120,
                        isKeyWord: true,
                        paragraphIndex: '',
                      },
                    ],
                    colors: {
                      appeared: '#ffffff',
                      active: '#ffffff',
                      activeFill: '#FF5700',
                      background: '',
                      keyword: '#ffffff',
                    },
                    preserveKeywordColor: true,
                    positioning: {
                      videoWidth: 1080,
                      videoHeight: 1920,
                    },
                  },
                  id: 'clip_1768857266191_rojr0znyb',
                  effects: [],
                  mediaId: 'clip_1768857260471_r0s11a5f7',
                },
                {
                  type: 'Caption',
                  src: '',
                  display: {
                    from: 4080000,
                    to: 4799999.7,
                  },
                  playbackRate: 1,
                  duration: 719999.7000000003,
                  left: 76.08001708984375,
                  top: 1754,
                  width: 927.8399658203125,
                  height: 136,
                  angle: 0,
                  zIndex: 20,
                  opacity: 1,
                  flip: null,
                  style: {
                    fontSize: 80,
                    fontFamily: 'Bangers-Regular',
                    fontWeight: '700',
                    fontStyle: 'normal',
                    color: '#ffffff',
                    align: 'center',
                    fontUrl:
                      'https://fonts.gstatic.com/s/poppins/v15/pxiByp8kv8JHgFVrLCz7V1tvFP-KUEg.ttf',
                    stroke: {
                      color: '#000000',
                      width: 4,
                    },
                    shadow: {
                      color: '#000000',
                      alpha: 0.5,
                      blur: 4,
                      distance: 0,
                      angle: 0,
                    },
                  },
                  trim: {
                    from: 0,
                    to: 0,
                  },
                  text: 'wanna be a guest on',
                  caption: {
                    words: [
                      {
                        text: 'wanna',
                        from: 0,
                        to: 160.00000000000014,
                        isKeyWord: true,
                        paragraphIndex: '',
                      },
                      {
                        text: 'be',
                        from: 160.00000000000014,
                        to: 320.0000000000003,
                        isKeyWord: false,
                        paragraphIndex: '',
                      },
                      {
                        text: 'a',
                        from: 320.0000000000003,
                        to: 400.00000000000034,
                        isKeyWord: false,
                        paragraphIndex: '',
                      },
                      {
                        text: 'guest',
                        from: 400.00000000000034,
                        to: 559.9999999999997,
                        isKeyWord: false,
                        paragraphIndex: '',
                      },
                      {
                        text: 'on',
                        from: 559.9999999999997,
                        to: 719.9996999999998,
                        isKeyWord: true,
                        paragraphIndex: '',
                      },
                    ],
                    colors: {
                      appeared: '#ffffff',
                      active: '#ffffff',
                      activeFill: '#FF5700',
                      background: '',
                      keyword: '#ffffff',
                    },
                    preserveKeywordColor: true,
                    positioning: {
                      videoWidth: 1080,
                      videoHeight: 1920,
                    },
                  },
                  id: 'clip_1768857266193_m77iz8yky',
                  effects: [],
                  mediaId: 'clip_1768857260471_r0s11a5f7',
                },
                {
                  type: 'Caption',
                  src: '',
                  display: {
                    from: 4799999.7,
                    to: 5759999.800000001,
                  },
                  playbackRate: 1,
                  duration: 960000.1000000002,
                  left: 99.06001281738281,
                  top: 1754,
                  width: 881.8799743652344,
                  height: 136,
                  angle: 0,
                  zIndex: 20,
                  opacity: 1,
                  flip: null,
                  style: {
                    fontSize: 80,
                    fontFamily: 'Bangers-Regular',
                    fontWeight: '700',
                    fontStyle: 'normal',
                    color: '#ffffff',
                    align: 'center',
                    fontUrl:
                      'https://fonts.gstatic.com/s/poppins/v15/pxiByp8kv8JHgFVrLCz7V1tvFP-KUEg.ttf',
                    stroke: {
                      color: '#000000',
                      width: 4,
                    },
                    shadow: {
                      color: '#000000',
                      alpha: 0.5,
                      blur: 4,
                      distance: 0,
                      angle: 0,
                    },
                  },
                  trim: {
                    from: 0,
                    to: 0,
                  },
                  text: 'the show? Well, first',
                  caption: {
                    words: [
                      {
                        text: 'the',
                        from: 0,
                        to: 80.00030000000002,
                        isKeyWord: true,
                        paragraphIndex: '',
                      },
                      {
                        text: 'show?',
                        from: 80.00030000000002,
                        to: 400.0003000000003,
                        isKeyWord: false,
                        paragraphIndex: '',
                      },
                      {
                        text: 'Well,',
                        from: 400.0003000000003,
                        to: 800.0002999999998,
                        isKeyWord: false,
                        paragraphIndex: '',
                      },
                      {
                        text: 'first',
                        from: 800.0002999999998,
                        to: 960.0001000000002,
                        isKeyWord: true,
                        paragraphIndex: '',
                      },
                    ],
                    colors: {
                      appeared: '#ffffff',
                      active: '#ffffff',
                      activeFill: '#FF5700',
                      background: '',
                      keyword: '#ffffff',
                    },
                    preserveKeywordColor: true,
                    positioning: {
                      videoWidth: 1080,
                      videoHeight: 1920,
                    },
                  },
                  id: 'clip_1768857266195_ke1ufu236',
                  effects: [],
                  mediaId: 'clip_1768857260471_r0s11a5f7',
                },
                {
                  type: 'Caption',
                  src: '',
                  display: {
                    from: 5759999.800000001,
                    to: 6720000,
                  },
                  playbackRate: 1,
                  duration: 960000.1999999995,
                  left: 116.06001281738281,
                  top: 1754,
                  width: 847.8799743652344,
                  height: 136,
                  angle: 0,
                  zIndex: 20,
                  opacity: 1,
                  flip: null,
                  style: {
                    fontSize: 80,
                    fontFamily: 'Bangers-Regular',
                    fontWeight: '700',
                    fontStyle: 'normal',
                    color: '#ffffff',
                    align: 'center',
                    fontUrl:
                      'https://fonts.gstatic.com/s/poppins/v15/pxiByp8kv8JHgFVrLCz7V1tvFP-KUEg.ttf',
                    stroke: {
                      color: '#000000',
                      width: 4,
                    },
                    shadow: {
                      color: '#000000',
                      alpha: 0.5,
                      blur: 4,
                      distance: 0,
                      angle: 0,
                    },
                  },
                  trim: {
                    from: 0,
                    to: 0,
                  },
                  text: 'of all, meeting you.',
                  caption: {
                    words: [
                      {
                        text: 'of',
                        from: 0,
                        to: 79.9998999999998,
                        isKeyWord: true,
                        paragraphIndex: '',
                      },
                      {
                        text: 'all,',
                        from: 79.9998999999998,
                        to: 240.0001999999999,
                        isKeyWord: false,
                        paragraphIndex: '',
                      },
                      {
                        text: 'meeting',
                        from: 240.0001999999999,
                        to: 559.9999000000003,
                        isKeyWord: false,
                        paragraphIndex: '',
                      },
                      {
                        text: 'you.',
                        from: 559.9999000000003,
                        to: 960.0001999999996,
                        isKeyWord: true,
                        paragraphIndex: '',
                      },
                    ],
                    colors: {
                      appeared: '#ffffff',
                      active: '#ffffff',
                      activeFill: '#FF5700',
                      background: '',
                      keyword: '#ffffff',
                    },
                    preserveKeywordColor: true,
                    positioning: {
                      videoWidth: 1080,
                      videoHeight: 1920,
                    },
                  },
                  id: 'clip_1768857266197_5f8i526tc',
                  effects: [],
                  mediaId: 'clip_1768857260471_r0s11a5f7',
                },
                {
                  type: 'Caption',
                  src: '',
                  display: {
                    from: 6720000,
                    to: 7919999.600000001,
                  },
                  playbackRate: 1,
                  duration: 1199999.6,
                  left: 94.08001708984375,
                  top: 1754,
                  width: 891.8399658203125,
                  height: 136,
                  angle: 0,
                  zIndex: 20,
                  opacity: 1,
                  flip: null,
                  style: {
                    fontSize: 80,
                    fontFamily: 'Bangers-Regular',
                    fontWeight: '700',
                    fontStyle: 'normal',
                    color: '#ffffff',
                    align: 'center',
                    fontUrl:
                      'https://fonts.gstatic.com/s/poppins/v15/pxiByp8kv8JHgFVrLCz7V1tvFP-KUEg.ttf',
                    stroke: {
                      color: '#000000',
                      width: 4,
                    },
                    shadow: {
                      color: '#000000',
                      alpha: 0.5,
                      blur: 4,
                      distance: 0,
                      angle: 0,
                    },
                  },
                  trim: {
                    from: 0,
                    to: 0,
                  },
                  text: "You're just a a great",
                  caption: {
                    words: [
                      {
                        text: "You're",
                        from: 0,
                        to: 320.0000000000003,
                        isKeyWord: true,
                        paragraphIndex: '',
                      },
                      {
                        text: 'just',
                        from: 320.0000000000003,
                        to: 559.9997000000005,
                        isKeyWord: false,
                        paragraphIndex: '',
                      },
                      {
                        text: 'a',
                        from: 559.9997000000005,
                        to: 720.0000000000007,
                        isKeyWord: false,
                        paragraphIndex: '',
                      },
                      {
                        text: 'a',
                        from: 720.0000000000007,
                        to: 960,
                        isKeyWord: false,
                        paragraphIndex: '',
                      },
                      {
                        text: 'great',
                        from: 960,
                        to: 1199.9995999999999,
                        isKeyWord: true,
                        paragraphIndex: '',
                      },
                    ],
                    colors: {
                      appeared: '#ffffff',
                      active: '#ffffff',
                      activeFill: '#FF5700',
                      background: '',
                      keyword: '#ffffff',
                    },
                    preserveKeywordColor: true,
                    positioning: {
                      videoWidth: 1080,
                      videoHeight: 1920,
                    },
                  },
                  id: 'clip_1768857266199_2acb988ix',
                  effects: [],
                  mediaId: 'clip_1768857260471_r0s11a5f7',
                },
                {
                  type: 'Caption',
                  src: '',
                  display: {
                    from: 7919999.600000001,
                    to: 8880000,
                  },
                  playbackRate: 1,
                  duration: 960000.3999999999,
                  left: 166.5600128173828,
                  top: 1754,
                  width: 746.8799743652344,
                  height: 136,
                  angle: 0,
                  zIndex: 20,
                  opacity: 1,
                  flip: null,
                  style: {
                    fontSize: 80,
                    fontFamily: 'Bangers-Regular',
                    fontWeight: '700',
                    fontStyle: 'normal',
                    color: '#ffffff',
                    align: 'center',
                    fontUrl:
                      'https://fonts.gstatic.com/s/poppins/v15/pxiByp8kv8JHgFVrLCz7V1tvFP-KUEg.ttf',
                    stroke: {
                      color: '#000000',
                      width: 4,
                    },
                    shadow: {
                      color: '#000000',
                      alpha: 0.5,
                      blur: 4,
                      distance: 0,
                      angle: 0,
                    },
                  },
                  trim: {
                    from: 0,
                    to: 0,
                  },
                  text: 'guy to know and',
                  caption: {
                    words: [
                      {
                        text: 'guy',
                        from: 0,
                        to: 240.00040000000044,
                        isKeyWord: true,
                        paragraphIndex: '',
                      },
                      {
                        text: 'to',
                        from: 240.00040000000044,
                        to: 400.0004000000006,
                        isKeyWord: false,
                        paragraphIndex: '',
                      },
                      {
                        text: 'know',
                        from: 400.0004000000006,
                        to: 639.9993999999998,
                        isKeyWord: false,
                        paragraphIndex: '',
                      },
                      {
                        text: 'and',
                        from: 639.9993999999998,
                        to: 960.000400000001,
                        isKeyWord: true,
                        paragraphIndex: '',
                      },
                    ],
                    colors: {
                      appeared: '#ffffff',
                      active: '#ffffff',
                      activeFill: '#FF5700',
                      background: '',
                      keyword: '#ffffff',
                    },
                    preserveKeywordColor: true,
                    positioning: {
                      videoWidth: 1080,
                      videoHeight: 1920,
                    },
                  },
                  id: 'clip_1768857266200_uqhz1f18b',
                  effects: [],
                  mediaId: 'clip_1768857260471_r0s11a5f7',
                },
                {
                  type: 'Caption',
                  src: '',
                  display: {
                    from: 8880000,
                    to: 9519999.500000002,
                  },
                  playbackRate: 1,
                  duration: 639999.5000000017,
                  left: 98.02000427246094,
                  top: 1754,
                  width: 883.9599914550781,
                  height: 136,
                  angle: 0,
                  zIndex: 20,
                  opacity: 1,
                  flip: null,
                  style: {
                    fontSize: 80,
                    fontFamily: 'Bangers-Regular',
                    fontWeight: '700',
                    fontStyle: 'normal',
                    color: '#ffffff',
                    align: 'center',
                    fontUrl:
                      'https://fonts.gstatic.com/s/poppins/v15/pxiByp8kv8JHgFVrLCz7V1tvFP-KUEg.ttf',
                    stroke: {
                      color: '#000000',
                      width: 4,
                    },
                    shadow: {
                      color: '#000000',
                      alpha: 0.5,
                      blur: 4,
                      distance: 0,
                      angle: 0,
                    },
                  },
                  trim: {
                    from: 0,
                    to: 0,
                  },
                  text: 'very knowledgeable',
                  caption: {
                    words: [
                      {
                        text: 'very',
                        from: 0,
                        to: 239.99999999999844,
                        isKeyWord: true,
                        paragraphIndex: '',
                      },
                      {
                        text: 'knowledgeable',
                        from: 239.99999999999844,
                        to: 639.9995,
                        isKeyWord: true,
                        paragraphIndex: '',
                      },
                    ],
                    colors: {
                      appeared: '#ffffff',
                      active: '#ffffff',
                      activeFill: '#FF5700',
                      background: '',
                      keyword: '#ffffff',
                    },
                    preserveKeywordColor: true,
                    positioning: {
                      videoWidth: 1080,
                      videoHeight: 1920,
                    },
                  },
                  id: 'clip_1768857266201_i61xskme4',
                  effects: [],
                  mediaId: 'clip_1768857260471_r0s11a5f7',
                },
                {
                  type: 'Caption',
                  src: '',
                  display: {
                    from: 9519999.500000002,
                    to: 10800000,
                  },
                  playbackRate: 1,
                  duration: 1280000.4999999984,
                  left: 149.5600128173828,
                  top: 1754,
                  width: 780.8799743652344,
                  height: 136,
                  angle: 0,
                  zIndex: 20,
                  opacity: 1,
                  flip: null,
                  style: {
                    fontSize: 80,
                    fontFamily: 'Bangers-Regular',
                    fontWeight: '700',
                    fontStyle: 'normal',
                    color: '#ffffff',
                    align: 'center',
                    fontUrl:
                      'https://fonts.gstatic.com/s/poppins/v15/pxiByp8kv8JHgFVrLCz7V1tvFP-KUEg.ttf',
                    stroke: {
                      color: '#000000',
                      width: 4,
                    },
                    shadow: {
                      color: '#000000',
                      alpha: 0.5,
                      blur: 4,
                      distance: 0,
                      angle: 0,
                    },
                  },
                  trim: {
                    from: 0,
                    to: 0,
                  },
                  text: 'and curious. I like',
                  caption: {
                    words: [
                      {
                        text: 'and',
                        from: 0,
                        to: 240.00049999999896,
                        isKeyWord: true,
                        paragraphIndex: '',
                      },
                      {
                        text: 'curious.',
                        from: 240.00049999999896,
                        to: 880.0004999999995,
                        isKeyWord: false,
                        paragraphIndex: '',
                      },
                      {
                        text: 'I',
                        from: 880.0004999999995,
                        to: 1039.9994999999985,
                        isKeyWord: false,
                        paragraphIndex: '',
                      },
                      {
                        text: 'like',
                        from: 1039.9994999999985,
                        to: 1280.0004999999999,
                        isKeyWord: true,
                        paragraphIndex: '',
                      },
                    ],
                    colors: {
                      appeared: '#ffffff',
                      active: '#ffffff',
                      activeFill: '#FF5700',
                      background: '',
                      keyword: '#ffffff',
                    },
                    preserveKeywordColor: true,
                    positioning: {
                      videoWidth: 1080,
                      videoHeight: 1920,
                    },
                  },
                  id: 'clip_1768857266202_h0dskri4q',
                  effects: [],
                  mediaId: 'clip_1768857260471_r0s11a5f7',
                },
                {
                  type: 'Caption',
                  src: '',
                  display: {
                    from: 10800000,
                    to: 12160000,
                  },
                  playbackRate: 1,
                  duration: 1360000,
                  left: 107.04000854492188,
                  top: 1754,
                  width: 865.9199829101562,
                  height: 136,
                  angle: 0,
                  zIndex: 20,
                  opacity: 1,
                  flip: null,
                  style: {
                    fontSize: 80,
                    fontFamily: 'Bangers-Regular',
                    fontWeight: '700',
                    fontStyle: 'normal',
                    color: '#ffffff',
                    align: 'center',
                    fontUrl:
                      'https://fonts.gstatic.com/s/poppins/v15/pxiByp8kv8JHgFVrLCz7V1tvFP-KUEg.ttf',
                    stroke: {
                      color: '#000000',
                      width: 4,
                    },
                    shadow: {
                      color: '#000000',
                      alpha: 0.5,
                      blur: 4,
                      distance: 0,
                      angle: 0,
                    },
                  },
                  trim: {
                    from: 0,
                    to: 0,
                  },
                  text: 'curious people, and',
                  caption: {
                    words: [
                      {
                        text: 'curious',
                        from: 0,
                        to: 479.99999999999864,
                        isKeyWord: true,
                        paragraphIndex: '',
                      },
                      {
                        text: 'people,',
                        from: 479.99999999999864,
                        to: 1119.999,
                        isKeyWord: false,
                        paragraphIndex: '',
                      },
                      {
                        text: 'and',
                        from: 1199.9999999999993,
                        to: 1359.9999999999995,
                        isKeyWord: true,
                        paragraphIndex: '',
                      },
                    ],
                    colors: {
                      appeared: '#ffffff',
                      active: '#ffffff',
                      activeFill: '#FF5700',
                      background: '',
                      keyword: '#ffffff',
                    },
                    preserveKeywordColor: true,
                    positioning: {
                      videoWidth: 1080,
                      videoHeight: 1920,
                    },
                  },
                  id: 'clip_1768857266203_gyqznekad',
                  effects: [],
                  mediaId: 'clip_1768857260471_r0s11a5f7',
                },
                {
                  type: 'Caption',
                  src: '',
                  display: {
                    from: 12160000,
                    to: 13360000,
                  },
                  playbackRate: 1,
                  duration: 1200000,
                  left: 74.58001708984375,
                  top: 1754,
                  width: 930.8399658203125,
                  height: 136,
                  angle: 0,
                  zIndex: 20,
                  opacity: 1,
                  flip: null,
                  style: {
                    fontSize: 80,
                    fontFamily: 'Bangers-Regular',
                    fontWeight: '700',
                    fontStyle: 'normal',
                    color: '#ffffff',
                    align: 'center',
                    fontUrl:
                      'https://fonts.gstatic.com/s/poppins/v15/pxiByp8kv8JHgFVrLCz7V1tvFP-KUEg.ttf',
                    stroke: {
                      color: '#000000',
                      width: 4,
                    },
                    shadow: {
                      color: '#000000',
                      alpha: 0.5,
                      blur: 4,
                      distance: 0,
                      angle: 0,
                    },
                  },
                  trim: {
                    from: 0,
                    to: 0,
                  },
                  text: 'it is a little surprising',
                  caption: {
                    words: [
                      {
                        text: 'it',
                        from: 0,
                        to: 160.00000000000014,
                        isKeyWord: true,
                        paragraphIndex: '',
                      },
                      {
                        text: 'is',
                        from: 160.00000000000014,
                        to: 399.99899999999934,
                        isKeyWord: false,
                        paragraphIndex: '',
                      },
                      {
                        text: 'a',
                        from: 399.99899999999934,
                        to: 559.9989999999995,
                        isKeyWord: false,
                        paragraphIndex: '',
                      },
                      {
                        text: 'little',
                        from: 559.9989999999995,
                        to: 720.0000000000007,
                        isKeyWord: false,
                        paragraphIndex: '',
                      },
                      {
                        text: 'surprising',
                        from: 720.0000000000007,
                        to: 1199.9999999999993,
                        isKeyWord: true,
                        paragraphIndex: '',
                      },
                    ],
                    colors: {
                      appeared: '#ffffff',
                      active: '#ffffff',
                      activeFill: '#FF5700',
                      background: '',
                      keyword: '#ffffff',
                    },
                    preserveKeywordColor: true,
                    positioning: {
                      videoWidth: 1080,
                      videoHeight: 1920,
                    },
                  },
                  id: 'clip_1768857266204_rr0bwuote',
                  effects: [],
                  mediaId: 'clip_1768857260471_r0s11a5f7',
                },
                {
                  type: 'Caption',
                  src: '',
                  display: {
                    from: 13360000,
                    to: 14160000,
                  },
                  playbackRate: 1,
                  duration: 800000,
                  left: 145.04000854492188,
                  top: 1754,
                  width: 789.9199829101562,
                  height: 136,
                  angle: 0,
                  zIndex: 20,
                  opacity: 1,
                  flip: null,
                  style: {
                    fontSize: 80,
                    fontFamily: 'Bangers-Regular',
                    fontWeight: '700',
                    fontStyle: 'normal',
                    color: '#ffffff',
                    align: 'center',
                    fontUrl:
                      'https://fonts.gstatic.com/s/poppins/v15/pxiByp8kv8JHgFVrLCz7V1tvFP-KUEg.ttf',
                    stroke: {
                      color: '#000000',
                      width: 4,
                    },
                    shadow: {
                      color: '#000000',
                      alpha: 0.5,
                      blur: 4,
                      distance: 0,
                      angle: 0,
                    },
                  },
                  trim: {
                    from: 0,
                    to: 0,
                  },
                  text: 'how many people',
                  caption: {
                    words: [
                      {
                        text: 'how',
                        from: 0,
                        to: 319.99900000000105,
                        isKeyWord: true,
                        paragraphIndex: '',
                      },
                      {
                        text: 'many',
                        from: 319.99900000000105,
                        to: 560.0000000000005,
                        isKeyWord: false,
                        paragraphIndex: '',
                      },
                      {
                        text: 'people',
                        from: 560.0000000000005,
                        to: 800.0000000000007,
                        isKeyWord: true,
                        paragraphIndex: '',
                      },
                    ],
                    colors: {
                      appeared: '#ffffff',
                      active: '#ffffff',
                      activeFill: '#FF5700',
                      background: '',
                      keyword: '#ffffff',
                    },
                    preserveKeywordColor: true,
                    positioning: {
                      videoWidth: 1080,
                      videoHeight: 1920,
                    },
                  },
                  id: 'clip_1768857266205_iq13hqip2',
                  effects: [],
                  mediaId: 'clip_1768857260471_r0s11a5f7',
                },
                {
                  type: 'Caption',
                  src: '',
                  display: {
                    from: 14160000,
                    to: 16074998.999999998,
                  },
                  playbackRate: 1,
                  duration: 1914998.999999998,
                  left: 166.54000854492188,
                  top: 1754,
                  width: 746.9199829101562,
                  height: 136,
                  angle: 0,
                  zIndex: 20,
                  opacity: 1,
                  flip: null,
                  style: {
                    fontSize: 80,
                    fontFamily: 'Bangers-Regular',
                    fontWeight: '700',
                    fontStyle: 'normal',
                    color: '#ffffff',
                    align: 'center',
                    fontUrl:
                      'https://fonts.gstatic.com/s/poppins/v15/pxiByp8kv8JHgFVrLCz7V1tvFP-KUEg.ttf',
                    stroke: {
                      color: '#000000',
                      width: 4,
                    },
                    shadow: {
                      color: '#000000',
                      alpha: 0.5,
                      blur: 4,
                      distance: 0,
                      angle: 0,
                    },
                  },
                  trim: {
                    from: 0,
                    to: 0,
                  },
                  text: 'are not naturally',
                  caption: {
                    words: [
                      {
                        text: 'are',
                        from: 0,
                        to: 479.9989999999994,
                        isKeyWord: true,
                        paragraphIndex: '',
                      },
                      {
                        text: 'not',
                        from: 479.9989999999994,
                        to: 2399.9999999999986,
                        isKeyWord: false,
                        paragraphIndex: '',
                      },
                      {
                        text: 'naturally',
                        from: 1274.9989999999993,
                        to: 1914.9989999999982,
                        isKeyWord: true,
                        paragraphIndex: '',
                      },
                    ],
                    colors: {
                      appeared: '#ffffff',
                      active: '#ffffff',
                      activeFill: '#FF5700',
                      background: '',
                      keyword: '#ffffff',
                    },
                    preserveKeywordColor: true,
                    positioning: {
                      videoWidth: 1080,
                      videoHeight: 1920,
                    },
                  },
                  id: 'clip_1768857266206_a1yjdyx0u',
                  effects: [],
                  mediaId: 'clip_1768857260471_r0s11a5f7',
                },
                {
                  type: 'Caption',
                  src: '',
                  display: {
                    from: 16074998.999999998,
                    to: 17195000,
                  },
                  playbackRate: 1,
                  duration: 1120001.000000002,
                  left: 225.52000427246094,
                  top: 1754,
                  width: 628.9599914550781,
                  height: 136,
                  angle: 0,
                  zIndex: 20,
                  opacity: 1,
                  flip: null,
                  style: {
                    fontSize: 80,
                    fontFamily: 'Bangers-Regular',
                    fontWeight: '700',
                    fontStyle: 'normal',
                    color: '#ffffff',
                    align: 'center',
                    fontUrl:
                      'https://fonts.gstatic.com/s/poppins/v15/pxiByp8kv8JHgFVrLCz7V1tvFP-KUEg.ttf',
                    stroke: {
                      color: '#000000',
                      width: 4,
                    },
                    shadow: {
                      color: '#000000',
                      alpha: 0.5,
                      blur: 4,
                      distance: 0,
                      angle: 0,
                    },
                  },
                  trim: {
                    from: 0,
                    to: 0,
                  },
                  text: 'curious. Some',
                  caption: {
                    words: [
                      {
                        text: 'curious.',
                        from: 0,
                        to: 800.0010000000018,
                        isKeyWord: true,
                        paragraphIndex: '',
                      },
                      {
                        text: 'Some',
                        from: 880.001,
                        to: 1120.001000000002,
                        isKeyWord: true,
                        paragraphIndex: '',
                      },
                    ],
                    colors: {
                      appeared: '#ffffff',
                      active: '#ffffff',
                      activeFill: '#FF5700',
                      background: '',
                      keyword: '#ffffff',
                    },
                    preserveKeywordColor: true,
                    positioning: {
                      videoWidth: 1080,
                      videoHeight: 1920,
                    },
                  },
                  id: 'clip_1768857266206_3co3gakln',
                  effects: [],
                  mediaId: 'clip_1768857260471_r0s11a5f7',
                },
                {
                  type: 'Caption',
                  src: '',
                  display: {
                    from: 17195000,
                    to: 17755000,
                  },
                  playbackRate: 1,
                  duration: 560000,
                  left: 117.06001281738281,
                  top: 1754,
                  width: 845.8799743652344,
                  height: 136,
                  angle: 0,
                  zIndex: 20,
                  opacity: 1,
                  flip: null,
                  style: {
                    fontSize: 80,
                    fontFamily: 'Bangers-Regular',
                    fontWeight: '700',
                    fontStyle: 'normal',
                    color: '#ffffff',
                    align: 'center',
                    fontUrl:
                      'https://fonts.gstatic.com/s/poppins/v15/pxiByp8kv8JHgFVrLCz7V1tvFP-KUEg.ttf',
                    stroke: {
                      color: '#000000',
                      width: 4,
                    },
                    shadow: {
                      color: '#000000',
                      alpha: 0.5,
                      blur: 4,
                      distance: 0,
                      angle: 0,
                    },
                  },
                  trim: {
                    from: 0,
                    to: 0,
                  },
                  text: 'people you have to',
                  caption: {
                    words: [
                      {
                        text: 'people',
                        from: 0,
                        to: 160.00000000000014,
                        isKeyWord: true,
                        paragraphIndex: '',
                      },
                      {
                        text: 'you',
                        from: 160.00000000000014,
                        to: 320.0000000000003,
                        isKeyWord: false,
                        paragraphIndex: '',
                      },
                      {
                        text: 'have',
                        from: 320.0000000000003,
                        to: 480.00000000000045,
                        isKeyWord: false,
                        paragraphIndex: '',
                      },
                      {
                        text: 'to',
                        from: 480.00000000000045,
                        to: 559.9999999999987,
                        isKeyWord: true,
                        paragraphIndex: '',
                      },
                    ],
                    colors: {
                      appeared: '#ffffff',
                      active: '#ffffff',
                      activeFill: '#FF5700',
                      background: '',
                      keyword: '#ffffff',
                    },
                    preserveKeywordColor: true,
                    positioning: {
                      videoWidth: 1080,
                      videoHeight: 1920,
                    },
                  },
                  id: 'clip_1768857266207_oem3z090v',
                  effects: [],
                  mediaId: 'clip_1768857260471_r0s11a5f7',
                },
                {
                  type: 'Caption',
                  src: '',
                  display: {
                    from: 17755000,
                    to: 18475000,
                  },
                  playbackRate: 1,
                  duration: 720000,
                  left: 151.5600128173828,
                  top: 1754,
                  width: 776.8799743652344,
                  height: 136,
                  angle: 0,
                  zIndex: 20,
                  opacity: 1,
                  flip: null,
                  style: {
                    fontSize: 80,
                    fontFamily: 'Bangers-Regular',
                    fontWeight: '700',
                    fontStyle: 'normal',
                    color: '#ffffff',
                    align: 'center',
                    fontUrl:
                      'https://fonts.gstatic.com/s/poppins/v15/pxiByp8kv8JHgFVrLCz7V1tvFP-KUEg.ttf',
                    stroke: {
                      color: '#000000',
                      width: 4,
                    },
                    shadow: {
                      color: '#000000',
                      alpha: 0.5,
                      blur: 4,
                      distance: 0,
                      angle: 0,
                    },
                  },
                  trim: {
                    from: 0,
                    to: 0,
                  },
                  text: 'sort of drag them',
                  caption: {
                    words: [
                      {
                        text: 'sort',
                        from: 0,
                        to: 159.99900000000267,
                        isKeyWord: true,
                        paragraphIndex: '',
                      },
                      {
                        text: 'of',
                        from: 159.99900000000267,
                        to: 239.99900000000096,
                        isKeyWord: false,
                        paragraphIndex: '',
                      },
                      {
                        text: 'drag',
                        from: 239.99900000000096,
                        to: 559.9990000000013,
                        isKeyWord: false,
                        paragraphIndex: '',
                      },
                      {
                        text: 'them',
                        from: 559.9990000000013,
                        to: 720.0000000000024,
                        isKeyWord: true,
                        paragraphIndex: '',
                      },
                    ],
                    colors: {
                      appeared: '#ffffff',
                      active: '#ffffff',
                      activeFill: '#FF5700',
                      background: '',
                      keyword: '#ffffff',
                    },
                    preserveKeywordColor: true,
                    positioning: {
                      videoWidth: 1080,
                      videoHeight: 1920,
                    },
                  },
                  id: 'clip_1768857266208_hdlzo68qz',
                  effects: [],
                  mediaId: 'clip_1768857260471_r0s11a5f7',
                },
                {
                  type: 'Caption',
                  src: '',
                  display: {
                    from: 18475000,
                    to: 19035000,
                  },
                  playbackRate: 1,
                  duration: 560000,
                  left: 276.52000427246094,
                  top: 1754,
                  width: 526.9599914550781,
                  height: 136,
                  angle: 0,
                  zIndex: 20,
                  opacity: 1,
                  flip: null,
                  style: {
                    fontSize: 80,
                    fontFamily: 'Bangers-Regular',
                    fontWeight: '700',
                    fontStyle: 'normal',
                    color: '#ffffff',
                    align: 'center',
                    fontUrl:
                      'https://fonts.gstatic.com/s/poppins/v15/pxiByp8kv8JHgFVrLCz7V1tvFP-KUEg.ttf',
                    stroke: {
                      color: '#000000',
                      width: 4,
                    },
                    shadow: {
                      color: '#000000',
                      alpha: 0.5,
                      blur: 4,
                      distance: 0,
                      angle: 0,
                    },
                  },
                  trim: {
                    from: 0,
                    to: 0,
                  },
                  text: 'kicking and',
                  caption: {
                    words: [
                      {
                        text: 'kicking',
                        from: 0,
                        to: 320.0000000000003,
                        isKeyWord: true,
                        paragraphIndex: '',
                      },
                      {
                        text: 'and',
                        from: 320.0000000000003,
                        to: 559.9999999999987,
                        isKeyWord: true,
                        paragraphIndex: '',
                      },
                    ],
                    colors: {
                      appeared: '#ffffff',
                      active: '#ffffff',
                      activeFill: '#FF5700',
                      background: '',
                      keyword: '#ffffff',
                    },
                    preserveKeywordColor: true,
                    positioning: {
                      videoWidth: 1080,
                      videoHeight: 1920,
                    },
                  },
                  id: 'clip_1768857266209_93y6w112r',
                  effects: [],
                  mediaId: 'clip_1768857260471_r0s11a5f7',
                },
                {
                  type: 'Caption',
                  src: '',
                  display: {
                    from: 19035000,
                    to: 20154999,
                  },
                  playbackRate: 1,
                  duration: 1119998.9999999998,
                  left: 178.04000854492188,
                  top: 1754,
                  width: 723.9199829101562,
                  height: 136,
                  angle: 0,
                  zIndex: 20,
                  opacity: 1,
                  flip: null,
                  style: {
                    fontSize: 80,
                    fontFamily: 'Bangers-Regular',
                    fontWeight: '700',
                    fontStyle: 'normal',
                    color: '#ffffff',
                    align: 'center',
                    fontUrl:
                      'https://fonts.gstatic.com/s/poppins/v15/pxiByp8kv8JHgFVrLCz7V1tvFP-KUEg.ttf',
                    stroke: {
                      color: '#000000',
                      width: 4,
                    },
                    shadow: {
                      color: '#000000',
                      alpha: 0.5,
                      blur: 4,
                      distance: 0,
                      angle: 0,
                    },
                  },
                  trim: {
                    from: 0,
                    to: 0,
                  },
                  text: 'screaming to be',
                  caption: {
                    words: [
                      {
                        text: 'screaming',
                        from: 0,
                        to: 480.00000000000045,
                        isKeyWord: true,
                        paragraphIndex: '',
                      },
                      {
                        text: 'to',
                        from: 480.00000000000045,
                        to: 879.9990000000015,
                        isKeyWord: false,
                        paragraphIndex: '',
                      },
                      {
                        text: 'be',
                        from: 879.9990000000015,
                        to: 1119.999,
                        isKeyWord: true,
                        paragraphIndex: '',
                      },
                    ],
                    colors: {
                      appeared: '#ffffff',
                      active: '#ffffff',
                      activeFill: '#FF5700',
                      background: '',
                      keyword: '#ffffff',
                    },
                    preserveKeywordColor: true,
                    positioning: {
                      videoWidth: 1080,
                      videoHeight: 1920,
                    },
                  },
                  id: 'clip_1768857266210_alqywl3ie',
                  effects: [],
                  mediaId: 'clip_1768857260471_r0s11a5f7',
                },
                {
                  type: 'Caption',
                  src: '',
                  display: {
                    from: 20154999,
                    to: 20715000,
                  },
                  playbackRate: 1,
                  duration: 560001.0000000002,
                  left: 258.52000427246094,
                  top: 1754,
                  width: 562.9599914550781,
                  height: 136,
                  angle: 0,
                  zIndex: 20,
                  opacity: 1,
                  flip: null,
                  style: {
                    fontSize: 80,
                    fontFamily: 'Bangers-Regular',
                    fontWeight: '700',
                    fontStyle: 'normal',
                    color: '#ffffff',
                    align: 'center',
                    fontUrl:
                      'https://fonts.gstatic.com/s/poppins/v15/pxiByp8kv8JHgFVrLCz7V1tvFP-KUEg.ttf',
                    stroke: {
                      color: '#000000',
                      width: 4,
                    },
                    shadow: {
                      color: '#000000',
                      alpha: 0.5,
                      blur: 4,
                      distance: 0,
                      angle: 0,
                    },
                  },
                  trim: {
                    from: 0,
                    to: 0,
                  },
                  text: 'interested in',
                  caption: {
                    words: [
                      {
                        text: 'interested',
                        from: 0,
                        to: 400.00099999999964,
                        isKeyWord: true,
                        paragraphIndex: '',
                      },
                      {
                        text: 'in',
                        from: 400.00099999999964,
                        to: 560.0009999999997,
                        isKeyWord: true,
                        paragraphIndex: '',
                      },
                    ],
                    colors: {
                      appeared: '#ffffff',
                      active: '#ffffff',
                      activeFill: '#FF5700',
                      background: '',
                      keyword: '#ffffff',
                    },
                    preserveKeywordColor: true,
                    positioning: {
                      videoWidth: 1080,
                      videoHeight: 1920,
                    },
                  },
                  id: 'clip_1768857266211_5htxg0ipy',
                  effects: [],
                  mediaId: 'clip_1768857260471_r0s11a5f7',
                },
                {
                  type: 'Caption',
                  src: '',
                  display: {
                    from: 20715000,
                    to: 21515000,
                  },
                  playbackRate: 1,
                  duration: 800000,
                  left: 103.54000854492188,
                  top: 1754,
                  width: 872.9199829101562,
                  height: 136,
                  angle: 0,
                  zIndex: 20,
                  opacity: 1,
                  flip: null,
                  style: {
                    fontSize: 80,
                    fontFamily: 'Bangers-Regular',
                    fontWeight: '700',
                    fontStyle: 'normal',
                    color: '#ffffff',
                    align: 'center',
                    fontUrl:
                      'https://fonts.gstatic.com/s/poppins/v15/pxiByp8kv8JHgFVrLCz7V1tvFP-KUEg.ttf',
                    stroke: {
                      color: '#000000',
                      width: 4,
                    },
                    shadow: {
                      color: '#000000',
                      alpha: 0.5,
                      blur: 4,
                      distance: 0,
                      angle: 0,
                    },
                  },
                  trim: {
                    from: 0,
                    to: 0,
                  },
                  text: 'something new, but',
                  caption: {
                    words: [
                      {
                        text: 'something',
                        from: 0,
                        to: 320.0000000000003,
                        isKeyWord: true,
                        paragraphIndex: '',
                      },
                      {
                        text: 'new,',
                        from: 320.0000000000003,
                        to: 640.0000000000006,
                        isKeyWord: false,
                        paragraphIndex: '',
                      },
                      {
                        text: 'but',
                        from: 640.0000000000006,
                        to: 800.0000000000007,
                        isKeyWord: true,
                        paragraphIndex: '',
                      },
                    ],
                    colors: {
                      appeared: '#ffffff',
                      active: '#ffffff',
                      activeFill: '#FF5700',
                      background: '',
                      keyword: '#ffffff',
                    },
                    preserveKeywordColor: true,
                    positioning: {
                      videoWidth: 1080,
                      videoHeight: 1920,
                    },
                  },
                  id: 'clip_1768857266211_us1h1y7sx',
                  effects: [],
                  mediaId: 'clip_1768857260471_r0s11a5f7',
                },
                {
                  type: 'Caption',
                  src: '',
                  display: {
                    from: 21515000,
                    to: 22955000,
                  },
                  playbackRate: 1,
                  duration: 1440000,
                  left: 102.54000854492188,
                  top: 1754,
                  width: 874.9199829101562,
                  height: 136,
                  angle: 0,
                  zIndex: 20,
                  opacity: 1,
                  flip: null,
                  style: {
                    fontSize: 80,
                    fontFamily: 'Bangers-Regular',
                    fontWeight: '700',
                    fontStyle: 'normal',
                    color: '#ffffff',
                    align: 'center',
                    fontUrl:
                      'https://fonts.gstatic.com/s/poppins/v15/pxiByp8kv8JHgFVrLCz7V1tvFP-KUEg.ttf',
                    stroke: {
                      color: '#000000',
                      width: 4,
                    },
                    shadow: {
                      color: '#000000',
                      alpha: 0.5,
                      blur: 4,
                      distance: 0,
                      angle: 0,
                    },
                  },
                  trim: {
                    from: 0,
                    to: 0,
                  },
                  text: 'you obviously were.',
                  caption: {
                    words: [
                      {
                        text: 'you',
                        from: 0,
                        to: 320.0000000000003,
                        isKeyWord: true,
                        paragraphIndex: '',
                      },
                      {
                        text: 'obviously',
                        from: 320.0000000000003,
                        to: 879.999999999999,
                        isKeyWord: false,
                        paragraphIndex: '',
                      },
                      {
                        text: 'were.',
                        from: 879.999999999999,
                        to: 1439.9999999999977,
                        isKeyWord: true,
                        paragraphIndex: '',
                      },
                    ],
                    colors: {
                      appeared: '#ffffff',
                      active: '#ffffff',
                      activeFill: '#FF5700',
                      background: '',
                      keyword: '#ffffff',
                    },
                    preserveKeywordColor: true,
                    positioning: {
                      videoWidth: 1080,
                      videoHeight: 1920,
                    },
                  },
                  id: 'clip_1768857266212_l98mjsyn6',
                  effects: [],
                  mediaId: 'clip_1768857260471_r0s11a5f7',
                },
                {
                  type: 'Caption',
                  src: '',
                  display: {
                    from: 22955000,
                    to: 23755000,
                  },
                  playbackRate: 1,
                  duration: 800000,
                  left: 113.58001708984375,
                  top: 1754,
                  width: 852.8399658203125,
                  height: 136,
                  angle: 0,
                  zIndex: 20,
                  opacity: 1,
                  flip: null,
                  style: {
                    fontSize: 80,
                    fontFamily: 'Bangers-Regular',
                    fontWeight: '700',
                    fontStyle: 'normal',
                    color: '#ffffff',
                    align: 'center',
                    fontUrl:
                      'https://fonts.gstatic.com/s/poppins/v15/pxiByp8kv8JHgFVrLCz7V1tvFP-KUEg.ttf',
                    stroke: {
                      color: '#000000',
                      width: 4,
                    },
                    shadow: {
                      color: '#000000',
                      alpha: 0.5,
                      blur: 4,
                      distance: 0,
                      angle: 0,
                    },
                  },
                  trim: {
                    from: 0,
                    to: 0,
                  },
                  text: 'So that was a huge',
                  caption: {
                    words: [
                      {
                        text: 'So',
                        from: 0,
                        to: 160.00000000000014,
                        isKeyWord: true,
                        paragraphIndex: '',
                      },
                      {
                        text: 'that',
                        from: 160.00000000000014,
                        to: 320.0000000000003,
                        isKeyWord: false,
                        paragraphIndex: '',
                      },
                      {
                        text: 'was',
                        from: 320.0000000000003,
                        to: 480.00000000000045,
                        isKeyWord: false,
                        paragraphIndex: '',
                      },
                      {
                        text: 'a',
                        from: 480.00000000000045,
                        to: 640.0000000000006,
                        isKeyWord: false,
                        paragraphIndex: '',
                      },
                      {
                        text: 'huge',
                        from: 640.0000000000006,
                        to: 800.0000000000007,
                        isKeyWord: true,
                        paragraphIndex: '',
                      },
                    ],
                    colors: {
                      appeared: '#ffffff',
                      active: '#ffffff',
                      activeFill: '#FF5700',
                      background: '',
                      keyword: '#ffffff',
                    },
                    preserveKeywordColor: true,
                    positioning: {
                      videoWidth: 1080,
                      videoHeight: 1920,
                    },
                  },
                  id: 'clip_1768857266214_i01sfk5nw',
                  effects: [],
                  mediaId: 'clip_1768857260471_r0s11a5f7',
                },
                {
                  type: 'Caption',
                  src: '',
                  display: {
                    from: 23755000,
                    to: 24955000,
                  },
                  playbackRate: 1,
                  duration: 1200000,
                  left: 132.0600128173828,
                  top: 1754,
                  width: 815.8799743652344,
                  height: 136,
                  angle: 0,
                  zIndex: 20,
                  opacity: 1,
                  flip: null,
                  style: {
                    fontSize: 80,
                    fontFamily: 'Bangers-Regular',
                    fontWeight: '700',
                    fontStyle: 'normal',
                    color: '#ffffff',
                    align: 'center',
                    fontUrl:
                      'https://fonts.gstatic.com/s/poppins/v15/pxiByp8kv8JHgFVrLCz7V1tvFP-KUEg.ttf',
                    stroke: {
                      color: '#000000',
                      width: 4,
                    },
                    shadow: {
                      color: '#000000',
                      alpha: 0.5,
                      blur: 4,
                      distance: 0,
                      angle: 0,
                    },
                  },
                  trim: {
                    from: 0,
                    to: 0,
                  },
                  text: 'appeal. Part of my',
                  caption: {
                    words: [
                      {
                        text: 'appeal.',
                        from: 0,
                        to: 559.9990000000013,
                        isKeyWord: true,
                        paragraphIndex: '',
                      },
                      {
                        text: 'Part',
                        from: 559.9990000000013,
                        to: 800.0000000000007,
                        isKeyWord: false,
                        paragraphIndex: '',
                      },
                      {
                        text: 'of',
                        from: 800.0000000000007,
                        to: 960.0000000000009,
                        isKeyWord: false,
                        paragraphIndex: '',
                      },
                      {
                        text: 'my',
                        from: 960.0000000000009,
                        to: 1199.9999999999993,
                        isKeyWord: true,
                        paragraphIndex: '',
                      },
                    ],
                    colors: {
                      appeared: '#ffffff',
                      active: '#ffffff',
                      activeFill: '#FF5700',
                      background: '',
                      keyword: '#ffffff',
                    },
                    preserveKeywordColor: true,
                    positioning: {
                      videoWidth: 1080,
                      videoHeight: 1920,
                    },
                  },
                  id: 'clip_1768857266216_quxd0lxl9',
                  effects: [],
                  mediaId: 'clip_1768857260471_r0s11a5f7',
                },
                {
                  type: 'Caption',
                  src: '',
                  display: {
                    from: 24955000,
                    to: 26235000,
                  },
                  playbackRate: 1,
                  duration: 1280000,
                  left: 100.04000854492188,
                  top: 1754,
                  width: 879.9199829101562,
                  height: 136,
                  angle: 0,
                  zIndex: 20,
                  opacity: 1,
                  flip: null,
                  style: {
                    fontSize: 80,
                    fontFamily: 'Bangers-Regular',
                    fontWeight: '700',
                    fontStyle: 'normal',
                    color: '#ffffff',
                    align: 'center',
                    fontUrl:
                      'https://fonts.gstatic.com/s/poppins/v15/pxiByp8kv8JHgFVrLCz7V1tvFP-KUEg.ttf',
                    stroke: {
                      color: '#000000',
                      width: 4,
                    },
                    shadow: {
                      color: '#000000',
                      alpha: 0.5,
                      blur: 4,
                      distance: 0,
                      angle: 0,
                    },
                  },
                  trim: {
                    from: 0,
                    to: 0,
                  },
                  text: 'wanting to educate,',
                  caption: {
                    words: [
                      {
                        text: 'wanting',
                        from: 0,
                        to: 480.00000000000045,
                        isKeyWord: true,
                        paragraphIndex: '',
                      },
                      {
                        text: 'to',
                        from: 480.00000000000045,
                        to: 640.0000000000006,
                        isKeyWord: false,
                        paragraphIndex: '',
                      },
                      {
                        text: 'educate,',
                        from: 640.0000000000006,
                        to: 1280.0000000000011,
                        isKeyWord: true,
                        paragraphIndex: '',
                      },
                    ],
                    colors: {
                      appeared: '#ffffff',
                      active: '#ffffff',
                      activeFill: '#FF5700',
                      background: '',
                      keyword: '#ffffff',
                    },
                    preserveKeywordColor: true,
                    positioning: {
                      videoWidth: 1080,
                      videoHeight: 1920,
                    },
                  },
                  id: 'clip_1768857266217_5jqgdjxxj',
                  effects: [],
                  mediaId: 'clip_1768857260471_r0s11a5f7',
                },
                {
                  type: 'Caption',
                  src: '',
                  display: {
                    from: 26235000,
                    to: 27035000,
                  },
                  playbackRate: 1,
                  duration: 800000,
                  left: 194.5600128173828,
                  top: 1754,
                  width: 690.8799743652344,
                  height: 136,
                  angle: 0,
                  zIndex: 20,
                  opacity: 1,
                  flip: null,
                  style: {
                    fontSize: 80,
                    fontFamily: 'Bangers-Regular',
                    fontWeight: '700',
                    fontStyle: 'normal',
                    color: '#ffffff',
                    align: 'center',
                    fontUrl:
                      'https://fonts.gstatic.com/s/poppins/v15/pxiByp8kv8JHgFVrLCz7V1tvFP-KUEg.ttf',
                    stroke: {
                      color: '#000000',
                      width: 4,
                    },
                    shadow: {
                      color: '#000000',
                      alpha: 0.5,
                      blur: 4,
                      distance: 0,
                      angle: 0,
                    },
                  },
                  trim: {
                    from: 0,
                    to: 0,
                  },
                  text: 'I like getting on',
                  caption: {
                    words: [
                      {
                        text: 'I',
                        from: 0,
                        to: 79.99900000000082,
                        isKeyWord: true,
                        paragraphIndex: '',
                      },
                      {
                        text: 'like',
                        from: 79.99900000000082,
                        to: 320.0000000000003,
                        isKeyWord: false,
                        paragraphIndex: '',
                      },
                      {
                        text: 'getting',
                        from: 320.0000000000003,
                        to: 640.0000000000006,
                        isKeyWord: false,
                        paragraphIndex: '',
                      },
                      {
                        text: 'on',
                        from: 640.0000000000006,
                        to: 800.0000000000007,
                        isKeyWord: true,
                        paragraphIndex: '',
                      },
                    ],
                    colors: {
                      appeared: '#ffffff',
                      active: '#ffffff',
                      activeFill: '#FF5700',
                      background: '',
                      keyword: '#ffffff',
                    },
                    preserveKeywordColor: true,
                    positioning: {
                      videoWidth: 1080,
                      videoHeight: 1920,
                    },
                  },
                  id: 'clip_1768857266218_ixhts8e0f',
                  effects: [],
                  mediaId: 'clip_1768857260471_r0s11a5f7',
                },
                {
                  type: 'Caption',
                  src: '',
                  display: {
                    from: 27035000,
                    to: 27990000,
                  },
                  playbackRate: 1,
                  duration: 955000,
                  left: 175.54000854492188,
                  top: 1754,
                  width: 728.9199829101562,
                  height: 136,
                  angle: 0,
                  zIndex: 20,
                  opacity: 1,
                  flip: null,
                  style: {
                    fontSize: 80,
                    fontFamily: 'Bangers-Regular',
                    fontWeight: '700',
                    fontStyle: 'normal',
                    color: '#ffffff',
                    align: 'center',
                    fontUrl:
                      'https://fonts.gstatic.com/s/poppins/v15/pxiByp8kv8JHgFVrLCz7V1tvFP-KUEg.ttf',
                    stroke: {
                      color: '#000000',
                      width: 4,
                    },
                    shadow: {
                      color: '#000000',
                      alpha: 0.5,
                      blur: 4,
                      distance: 0,
                      angle: 0,
                    },
                  },
                  trim: {
                    from: 0,
                    to: 0,
                  },
                  text: 'podcast like this',
                  caption: {
                    words: [
                      {
                        text: 'podcast',
                        from: 0,
                        to: 879.9990000000015,
                        isKeyWord: true,
                        paragraphIndex: '',
                      },
                      {
                        text: 'like',
                        from: 475.0000000000014,
                        to: 794.9999999999982,
                        isKeyWord: false,
                        paragraphIndex: '',
                      },
                      {
                        text: 'this',
                        from: 794.9999999999982,
                        to: 954.9999999999983,
                        isKeyWord: true,
                        paragraphIndex: '',
                      },
                    ],
                    colors: {
                      appeared: '#ffffff',
                      active: '#ffffff',
                      activeFill: '#FF5700',
                      background: '',
                      keyword: '#ffffff',
                    },
                    preserveKeywordColor: true,
                    positioning: {
                      videoWidth: 1080,
                      videoHeight: 1920,
                    },
                  },
                  id: 'clip_1768857266219_zlvitsk2p',
                  effects: [],
                  mediaId: 'clip_1768857260471_r0s11a5f7',
                },
                {
                  type: 'Caption',
                  src: '',
                  display: {
                    from: 27990000,
                    to: 28710000.999999996,
                  },
                  playbackRate: 1,
                  duration: 720000.9999999965,
                  left: 183.5600128173828,
                  top: 1754,
                  width: 712.8799743652344,
                  height: 136,
                  angle: 0,
                  zIndex: 20,
                  opacity: 1,
                  flip: null,
                  style: {
                    fontSize: 80,
                    fontFamily: 'Bangers-Regular',
                    fontWeight: '700',
                    fontStyle: 'normal',
                    color: '#ffffff',
                    align: 'center',
                    fontUrl:
                      'https://fonts.gstatic.com/s/poppins/v15/pxiByp8kv8JHgFVrLCz7V1tvFP-KUEg.ttf',
                    stroke: {
                      color: '#000000',
                      width: 4,
                    },
                    shadow: {
                      color: '#000000',
                      alpha: 0.5,
                      blur: 4,
                      distance: 0,
                      angle: 0,
                    },
                  },
                  trim: {
                    from: 0,
                    to: 0,
                  },
                  text: 'where I can talk',
                  caption: {
                    words: [
                      {
                        text: 'where',
                        from: 0,
                        to: 240.000000000002,
                        isKeyWord: true,
                        paragraphIndex: '',
                      },
                      {
                        text: 'I',
                        from: 240.000000000002,
                        to: 320.0000000000003,
                        isKeyWord: false,
                        paragraphIndex: '',
                      },
                      {
                        text: 'can',
                        from: 320.0000000000003,
                        to: 480.00000000000045,
                        isKeyWord: false,
                        paragraphIndex: '',
                      },
                      {
                        text: 'talk',
                        from: 480.00000000000045,
                        to: 720.0009999999999,
                        isKeyWord: true,
                        paragraphIndex: '',
                      },
                    ],
                    colors: {
                      appeared: '#ffffff',
                      active: '#ffffff',
                      activeFill: '#FF5700',
                      background: '',
                      keyword: '#ffffff',
                    },
                    preserveKeywordColor: true,
                    positioning: {
                      videoWidth: 1080,
                      videoHeight: 1920,
                    },
                  },
                  id: 'clip_1768857266220_vmvhu7zzj',
                  effects: [],
                  mediaId: 'clip_1768857260471_r0s11a5f7',
                },
                {
                  type: 'Caption',
                  src: '',
                  display: {
                    from: 28710000.999999996,
                    to: 29990000,
                  },
                  playbackRate: 1,
                  duration: 1279999.0000000035,
                  left: 110.56001281738281,
                  top: 1754,
                  width: 858.8799743652344,
                  height: 136,
                  angle: 0,
                  zIndex: 20,
                  opacity: 1,
                  flip: null,
                  style: {
                    fontSize: 80,
                    fontFamily: 'Bangers-Regular',
                    fontWeight: '700',
                    fontStyle: 'normal',
                    color: '#ffffff',
                    align: 'center',
                    fontUrl:
                      'https://fonts.gstatic.com/s/poppins/v15/pxiByp8kv8JHgFVrLCz7V1tvFP-KUEg.ttf',
                    stroke: {
                      color: '#000000',
                      width: 4,
                    },
                    shadow: {
                      color: '#000000',
                      alpha: 0.5,
                      blur: 4,
                      distance: 0,
                      angle: 0,
                    },
                  },
                  trim: {
                    from: 0,
                    to: 0,
                  },
                  text: 'about the tools, the',
                  caption: {
                    words: [
                      {
                        text: 'about',
                        from: 0,
                        to: 399.9990000000011,
                        isKeyWord: true,
                        paragraphIndex: '',
                      },
                      {
                        text: 'the',
                        from: 399.9990000000011,
                        to: 639.9990000000031,
                        isKeyWord: false,
                        paragraphIndex: '',
                      },
                      {
                        text: 'tools,',
                        from: 639.9990000000031,
                        to: 1119.999,
                        isKeyWord: false,
                        paragraphIndex: '',
                      },
                      {
                        text: 'the',
                        from: 1119.999,
                        to: 1279.999,
                        isKeyWord: true,
                        paragraphIndex: '',
                      },
                    ],
                    colors: {
                      appeared: '#ffffff',
                      active: '#ffffff',
                      activeFill: '#FF5700',
                      background: '',
                      keyword: '#ffffff',
                    },
                    preserveKeywordColor: true,
                    positioning: {
                      videoWidth: 1080,
                      videoHeight: 1920,
                    },
                  },
                  id: 'clip_1768857266221_fckv03lba',
                  effects: [],
                  mediaId: 'clip_1768857260471_r0s11a5f7',
                },
                {
                  type: 'Caption',
                  src: '',
                  display: {
                    from: 29990000,
                    to: 31510000,
                  },
                  playbackRate: 1,
                  duration: 1520000,
                  left: 90.54000854492188,
                  top: 1754,
                  width: 898.9199829101562,
                  height: 136,
                  angle: 0,
                  zIndex: 20,
                  opacity: 1,
                  flip: null,
                  style: {
                    fontSize: 80,
                    fontFamily: 'Bangers-Regular',
                    fontWeight: '700',
                    fontStyle: 'normal',
                    color: '#ffffff',
                    align: 'center',
                    fontUrl:
                      'https://fonts.gstatic.com/s/poppins/v15/pxiByp8kv8JHgFVrLCz7V1tvFP-KUEg.ttf',
                    stroke: {
                      color: '#000000',
                      width: 4,
                    },
                    shadow: {
                      color: '#000000',
                      alpha: 0.5,
                      blur: 4,
                      distance: 0,
                      angle: 0,
                    },
                  },
                  trim: {
                    from: 0,
                    to: 0,
                  },
                  text: 'tricks, the shortcuts,',
                  caption: {
                    words: [
                      {
                        text: 'tricks,',
                        from: 0,
                        to: 480.00100000000145,
                        isKeyWord: true,
                        paragraphIndex: '',
                      },
                      {
                        text: 'the',
                        from: 480.00100000000145,
                        to: 640.0010000000016,
                        isKeyWord: false,
                        paragraphIndex: '',
                      },
                      {
                        text: 'shortcuts,',
                        from: 640.0010000000016,
                        to: 1520.0000000000032,
                        isKeyWord: true,
                        paragraphIndex: '',
                      },
                    ],
                    colors: {
                      appeared: '#ffffff',
                      active: '#ffffff',
                      activeFill: '#FF5700',
                      background: '',
                      keyword: '#ffffff',
                    },
                    preserveKeywordColor: true,
                    positioning: {
                      videoWidth: 1080,
                      videoHeight: 1920,
                    },
                  },
                  id: 'clip_1768857266222_2gmvgag8r',
                  effects: [],
                  mediaId: 'clip_1768857260471_r0s11a5f7',
                },
                {
                  type: 'Caption',
                  src: '',
                  display: {
                    from: 31510000,
                    to: 32470000,
                  },
                  playbackRate: 1,
                  duration: 960000,
                  left: 84.54000854492188,
                  top: 1754,
                  width: 910.9199829101562,
                  height: 136,
                  angle: 0,
                  zIndex: 20,
                  opacity: 1,
                  flip: null,
                  style: {
                    fontSize: 80,
                    fontFamily: 'Bangers-Regular',
                    fontWeight: '700',
                    fontStyle: 'normal',
                    color: '#ffffff',
                    align: 'center',
                    fontUrl:
                      'https://fonts.gstatic.com/s/poppins/v15/pxiByp8kv8JHgFVrLCz7V1tvFP-KUEg.ttf',
                    stroke: {
                      color: '#000000',
                      width: 4,
                    },
                    shadow: {
                      color: '#000000',
                      alpha: 0.5,
                      blur: 4,
                      distance: 0,
                      angle: 0,
                    },
                  },
                  trim: {
                    from: 0,
                    to: 0,
                  },
                  text: "what's coming, what",
                  caption: {
                    words: [
                      {
                        text: "what's",
                        from: 0,
                        to: 319.9999999999967,
                        isKeyWord: true,
                        paragraphIndex: '',
                      },
                      {
                        text: 'coming,',
                        from: 319.9999999999967,
                        to: 800.0000000000007,
                        isKeyWord: false,
                        paragraphIndex: '',
                      },
                      {
                        text: 'what',
                        from: 800.0000000000007,
                        to: 959.9999999999973,
                        isKeyWord: true,
                        paragraphIndex: '',
                      },
                    ],
                    colors: {
                      appeared: '#ffffff',
                      active: '#ffffff',
                      activeFill: '#FF5700',
                      background: '',
                      keyword: '#ffffff',
                    },
                    preserveKeywordColor: true,
                    positioning: {
                      videoWidth: 1080,
                      videoHeight: 1920,
                    },
                  },
                  id: 'clip_1768857266223_3monjzdl1',
                  effects: [],
                  mediaId: 'clip_1768857260471_r0s11a5f7',
                },
                {
                  type: 'Caption',
                  src: '',
                  display: {
                    from: 32470000,
                    to: 33750000,
                  },
                  playbackRate: 1,
                  duration: 1280000,
                  left: 75.08001708984375,
                  top: 1754,
                  width: 929.8399658203125,
                  height: 136,
                  angle: 0,
                  zIndex: 20,
                  opacity: 1,
                  flip: null,
                  style: {
                    fontSize: 80,
                    fontFamily: 'Bangers-Regular',
                    fontWeight: '700',
                    fontStyle: 'normal',
                    color: '#ffffff',
                    align: 'center',
                    fontUrl:
                      'https://fonts.gstatic.com/s/poppins/v15/pxiByp8kv8JHgFVrLCz7V1tvFP-KUEg.ttf',
                    stroke: {
                      color: '#000000',
                      width: 4,
                    },
                    shadow: {
                      color: '#000000',
                      alpha: 0.5,
                      blur: 4,
                      distance: 0,
                      angle: 0,
                    },
                  },
                  trim: {
                    from: 0,
                    to: 0,
                  },
                  text: 'to focus on, what not',
                  caption: {
                    words: [
                      {
                        text: 'to',
                        from: 0,
                        to: 160.0000000000037,
                        isKeyWord: true,
                        paragraphIndex: '',
                      },
                      {
                        text: 'focus',
                        from: 160.0000000000037,
                        to: 480.000000000004,
                        isKeyWord: false,
                        paragraphIndex: '',
                      },
                      {
                        text: 'on,',
                        from: 480.000000000004,
                        to: 800.0000000000043,
                        isKeyWord: false,
                        paragraphIndex: '',
                      },
                      {
                        text: 'what',
                        from: 800.0000000000043,
                        to: 1040.0020000000013,
                        isKeyWord: false,
                        paragraphIndex: '',
                      },
                      {
                        text: 'not',
                        from: 1040.0020000000013,
                        to: 1280.0000000000011,
                        isKeyWord: true,
                        paragraphIndex: '',
                      },
                    ],
                    colors: {
                      appeared: '#ffffff',
                      active: '#ffffff',
                      activeFill: '#FF5700',
                      background: '',
                      keyword: '#ffffff',
                    },
                    preserveKeywordColor: true,
                    positioning: {
                      videoWidth: 1080,
                      videoHeight: 1920,
                    },
                  },
                  id: 'clip_1768857266224_mlpq3k1xs',
                  effects: [],
                  mediaId: 'clip_1768857260471_r0s11a5f7',
                },
                {
                  type: 'Caption',
                  src: '',
                  display: {
                    from: 33750000,
                    to: 35030000,
                  },
                  playbackRate: 1,
                  duration: 1280000,
                  left: 71.08001708984375,
                  top: 1754,
                  width: 937.8399658203125,
                  height: 136,
                  angle: 0,
                  zIndex: 20,
                  opacity: 1,
                  flip: null,
                  style: {
                    fontSize: 80,
                    fontFamily: 'Bangers-Regular',
                    fontWeight: '700',
                    fontStyle: 'normal',
                    color: '#ffffff',
                    align: 'center',
                    fontUrl:
                      'https://fonts.gstatic.com/s/poppins/v15/pxiByp8kv8JHgFVrLCz7V1tvFP-KUEg.ttf',
                    stroke: {
                      color: '#000000',
                      width: 4,
                    },
                    shadow: {
                      color: '#000000',
                      alpha: 0.5,
                      blur: 4,
                      distance: 0,
                      angle: 0,
                    },
                  },
                  trim: {
                    from: 0,
                    to: 0,
                  },
                  text: 'to focus on. That was',
                  caption: {
                    words: [
                      {
                        text: 'to',
                        from: 0,
                        to: 159.9999999999966,
                        isKeyWord: true,
                        paragraphIndex: '',
                      },
                      {
                        text: 'focus',
                        from: 159.9999999999966,
                        to: 479.9999999999969,
                        isKeyWord: false,
                        paragraphIndex: '',
                      },
                      {
                        text: 'on.',
                        from: 479.9999999999969,
                        to: 880.0000000000025,
                        isKeyWord: false,
                        paragraphIndex: '',
                      },
                      {
                        text: 'That',
                        from: 880.0000000000025,
                        to: 1119.9999999999975,
                        isKeyWord: false,
                        paragraphIndex: '',
                      },
                      {
                        text: 'was',
                        from: 1119.9999999999975,
                        to: 1280.0000000000011,
                        isKeyWord: true,
                        paragraphIndex: '',
                      },
                    ],
                    colors: {
                      appeared: '#ffffff',
                      active: '#ffffff',
                      activeFill: '#FF5700',
                      background: '',
                      keyword: '#ffffff',
                    },
                    preserveKeywordColor: true,
                    positioning: {
                      videoWidth: 1080,
                      videoHeight: 1920,
                    },
                  },
                  id: 'clip_1768857266225_kb2rmngou',
                  effects: [],
                  mediaId: 'clip_1768857260471_r0s11a5f7',
                },
                {
                  type: 'Caption',
                  src: '',
                  display: {
                    from: 35030000,
                    to: 35750000,
                  },
                  playbackRate: 1,
                  duration: 720000,
                  left: 83.54000854492188,
                  top: 1754,
                  width: 912.9199829101562,
                  height: 136,
                  angle: 0,
                  zIndex: 20,
                  opacity: 1,
                  flip: null,
                  style: {
                    fontSize: 80,
                    fontFamily: 'Bangers-Regular',
                    fontWeight: '700',
                    fontStyle: 'normal',
                    color: '#ffffff',
                    align: 'center',
                    fontUrl:
                      'https://fonts.gstatic.com/s/poppins/v15/pxiByp8kv8JHgFVrLCz7V1tvFP-KUEg.ttf',
                    stroke: {
                      color: '#000000',
                      width: 4,
                    },
                    shadow: {
                      color: '#000000',
                      alpha: 0.5,
                      blur: 4,
                      distance: 0,
                      angle: 0,
                    },
                  },
                  trim: {
                    from: 0,
                    to: 0,
                  },
                  text: 'what was appealing.',
                  caption: {
                    words: [
                      {
                        text: 'what',
                        from: 0,
                        to: 240.000000000002,
                        isKeyWord: true,
                        paragraphIndex: '',
                      },
                      {
                        text: 'was',
                        from: 240.000000000002,
                        to: 399.9999999999986,
                        isKeyWord: false,
                        paragraphIndex: '',
                      },
                      {
                        text: 'appealing.',
                        from: 399.9999999999986,
                        to: 719.9999999999989,
                        isKeyWord: true,
                        paragraphIndex: '',
                      },
                    ],
                    colors: {
                      appeared: '#ffffff',
                      active: '#ffffff',
                      activeFill: '#FF5700',
                      background: '',
                      keyword: '#ffffff',
                    },
                    preserveKeywordColor: true,
                    positioning: {
                      videoWidth: 1080,
                      videoHeight: 1920,
                    },
                  },
                  id: 'clip_1768857266226_7f1lsjiqr',
                  effects: [],
                  mediaId: 'clip_1768857260471_r0s11a5f7',
                },
              ],
              settings: {
                width: 1080,
                height: 1920,
                fps: 30,
                bgColor: '#1B1917',
              },
            })
          }
        >
          Download
        </Button>
      </div>
    </header>
  );
}
