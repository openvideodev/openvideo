import * as React from 'react';
import {
  ColorPicker,
  ColorPickerHue,
  ColorPickerOutput,
  ColorPickerFormat,
  ColorPickerSelection,
  ColorPickerEyeDropper,
} from '@/components/ui/color-picker';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { IClip, AnimationOptions, KeyframeData } from '@openvideo/engine-pixi';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { jsonToClip } from '@openvideo/engine-pixi';
import { generateCaptionClips } from '@/lib/caption-generator';
import { regenerateCaptionClips, WordsPerLineMode } from '@/lib/caption-utils';
import {
  IconTextSize,
  IconRotate,
  IconPlus,
  IconTrash,
  IconCircle,
  IconMovie,
  IconEdit,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import color from 'color';

import { fontManager } from '@openvideo/engine-pixi';
import { getGroupedFonts, getFontByPostScriptName } from '@/utils/font-utils';

import useLayoutStore from '../store/use-layout-store';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import { NumberInput } from '@/components/ui/number-input';
import { useStore } from 'zustand';
import { useEphemeralClip } from '@/hooks/use-ephemeral-clip';
import { projectStore, core } from '@/lib/project';
import { nanoid } from 'nanoid';

const GROUPED_FONTS = getGroupedFonts();

interface CaptionPropertiesProps {
  clip: IClip;
}
type VerticalAlignMode = 'top' | 'center' | 'bottom';

export function CaptionProperties({ clip }: CaptionPropertiesProps) {
  const coreClipBase = useStore(projectStore, (s) => s.clips[clip.id]) as any;
  const coreClip = useEphemeralClip(clip.id, coreClipBase);
  const clips = useStore(projectStore, (s) => s.clips);

  const allCaptionIds = React.useMemo(
    () => Object.keys(clips).filter((id) => clips[id].type === 'Caption'),
    [clips]
  );

  if (!coreClip) return null;

  const opts = coreClip.originalOpts || {};
  const captionColors = opts.caption?.colors || {
    appeared: '#ffffff',
    active: '#ffffff',
    activeFill: '#FF5700',
    background: '',
    keyword: '#ffffff',
  };

  const { setFloatingControl } = useLayoutStore();

  const handleUpdate = (
    updates: any,
    option: 'single' | 'multiple' = 'single'
  ) => {
    if (option === 'multiple') {
      const commands = allCaptionIds.map((id) => ({
        id: nanoid(),
        type: 'clip.update',
        payload: { id, updates },
      }));
      core.batch(commands);
    } else {
      core.clip.update(clip.id, updates);
    }
  };

  const handleCaptionColorUpdate = (colorUpdates: any) => {
    const commands = allCaptionIds
      .map((id) => {
        const c = projectStore.getState().clips[id];
        if (!c) return null;

        const newOpts = {
          ...(c.originalOpts || {}),
          ...colorUpdates,
        };

        return {
          id: nanoid(),
          type: 'clip.update',
          payload: {
            id,
            updates: { originalOpts: newOpts },
          },
        };
      })
      .filter(Boolean) as any[];

    core.batch(commands);
  };

  const handleAnimationRemove = (id: string) => {
    const anim = (coreClip.animations || []).find((a: any) => a.id === id);
    const typeToRemove = anim?.type;

    if (typeToRemove) {
      const commands = allCaptionIds
        .map((cId) => {
          const c = projectStore.getState().clips[cId];
          if (c && c.animations) {
            const newAnims = c.animations.filter(
              (a: any) => a.type !== typeToRemove
            );
            return {
              id: nanoid(),
              type: 'clip.update',
              payload: { id: cId, updates: { animations: newAnims } },
            };
          }
          return null;
        })
        .filter(Boolean) as any[];

      core.batch(commands);
    } else {
      const newAnims = (coreClip.animations || []).filter(
        (a: any) => a.id !== id
      );
      core.clip.update(clip.id, { animations: newAnims });
    }
  };

  const animations = coreClip.animations || [];

  const handleFontChange = async (postScriptName: string) => {
    const font = getFontByPostScriptName(postScriptName);
    if (!font) return;

    await fontManager.addFont({
      name: font.postScriptName,
      url: font.url,
    });

    handleUpdate(
      {
        fontFamily: font.postScriptName,
        fontUrl: font.url,
      },
      'multiple'
    );
  };

  async function changeWordsPerLine(v: string, captionClip: any, opts: any) {
    const val = v as WordsPerLineMode;

    await regenerateCaptionClips({
      captionClip,
      mode: val,
      fontSize: opts.fontSize,
      fontFamily: opts.fontFamily,
      fontUrl: opts.fontUrl,
    });
  }

  function updateVerticalAlign(
    v: string,
    captionClip: any,
    handleUpdate: (updates: { top: number }) => void
  ) {
    const project = projectStore.getState();
    const videoHeight = project.settings.height || 1080;
    const mediaId = coreClip.mediaId;

    // Find siblings if part of a group
    let clipsToUpdate: any[] = [captionClip];

    if (mediaId) {
      const tracks = project.tracks;
      const siblingClips: any[] = [];
      tracks.forEach((track: any) => {
        track.clipIds.forEach((id: string) => {
          const c = project.clips[id];
          if (c && c.type === 'Caption' && (c as any).mediaId === mediaId) {
            siblingClips.push(c);
          }
        });
      });
      if (siblingClips.length > 0) {
        clipsToUpdate = siblingClips;
      }
    }

    // Apply updates
    clipsToUpdate.forEach((clip) => {
      const clipHeight = clip.height || 0;
      let newTop = clip.top;

      if (v === 'top') {
        newTop = 80;
      } else if (v === 'center') {
        newTop = (videoHeight - clipHeight) / 2;
      } else if (v === 'bottom') {
        newTop = videoHeight - clipHeight - 80;
      }

      if (clip.id === coreClip.id) {
        handleUpdate({ top: newTop });
      } else {
        core.clip.update(clip.id, { top: newTop });
      }

      // Metadata updates if needed
      // These will be handled by the engine.updateClip calls above
    });
  }

  const currentFont =
    getFontByPostScriptName(opts.fontFamily) || GROUPED_FONTS[0].mainFont;
  const currentFamily =
    GROUPED_FONTS.find((f) => f.family === currentFont.family) ||
    GROUPED_FONTS[0];

  return (
    <div className="flex flex-col gap-5">
      {/* Content */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Content
        </label>
        <Textarea
          value={coreClip.text || ''}
          onChange={(e) => handleUpdate({ text: e.target.value })}
          className="resize-none text-sm"
          placeholder="Enter caption text..."
        />
      </div>

      {/* Transform Section */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Transform
        </label>
        <div className="grid grid-cols-2 gap-2">
          <InputGroup>
            <InputGroupAddon align="inline-start">
              <span className="text-[10px] font-medium text-muted-foreground">
                X
              </span>
            </InputGroupAddon>
            <InputGroupInput
              type="number"
              value={Math.round(coreClip.left || 0)}
              onChange={(e) =>
                handleUpdate({ left: parseInt(e.target.value) || 0 })
              }
              className="text-sm p-0"
            />
          </InputGroup>
          <InputGroup>
            <InputGroupAddon align="inline-start">
              <span className="text-[10px] font-medium text-muted-foreground">
                Y
              </span>
            </InputGroupAddon>
            <InputGroupInput
              type="number"
              value={Math.round(coreClip.top || 0)}
              onChange={(e) =>
                handleUpdate({ top: parseInt(e.target.value) || 0 })
              }
              className="text-sm p-0"
            />
          </InputGroup>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <InputGroup>
            <InputGroupAddon align="inline-start">
              <span className="text-[10px] font-medium text-muted-foreground">
                W
              </span>
            </InputGroupAddon>
            <InputGroupInput
              type="number"
              value={Math.round(coreClip.width || 0)}
              onChange={(e) =>
                handleUpdate({ width: parseInt(e.target.value) || 0 })
              }
              className="text-sm p-0"
            />
          </InputGroup>
          <InputGroup>
            <InputGroupAddon align="inline-start">
              <span className="text-[10px] font-medium text-muted-foreground">
                H
              </span>
            </InputGroupAddon>
            <InputGroupInput
              type="number"
              value={Math.round(coreClip.height || 0)}
              onChange={(e) =>
                handleUpdate({ height: parseInt(e.target.value) || 0 })
              }
              className="text-sm p-0"
            />
          </InputGroup>
        </div>
      </div>

      {/* Position Section */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Position
        </label>
        <Select
          value={opts.verticalAlign || 'bottom'}
          onValueChange={(v) => updateVerticalAlign(v, coreClip, handleUpdate)}
        >
          <SelectTrigger className="w-full h-9">
            <SelectValue placeholder="Vertical Position" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="top">Top</SelectItem>
            <SelectItem value="center">Center</SelectItem>
            <SelectItem value="bottom">Bottom</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Words per line Section */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Words per line
        </label>
        <Select
          value={coreClip.wordsPerLine || 'multiple'}
          onValueChange={(v) => changeWordsPerLine(v, coreClip, opts)}
        >
          <SelectTrigger className="w-full h-9">
            <SelectValue placeholder="Words per line" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="single">Single</SelectItem>
            <SelectItem value="multiple">Multiple</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Rotation Section */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Rotation
        </label>
        <div className="flex items-center gap-4">
          <IconRotate className="size-4 text-muted-foreground" />
          <Slider
            value={[Math.round(coreClip.angle ?? 0)]}
            onValueChange={(v) => handleUpdate({ angle: v[0] })}
            max={360}
            step={1}
            className="flex-1"
          />
          <InputGroup className="w-20">
            <InputGroupInput
              type="number"
              value={Math.round(coreClip.angle ?? 0)}
              onChange={(e) =>
                handleUpdate({ angle: parseInt(e.target.value) || 0 })
              }
              className="text-sm p-0 text-center"
            />
            <InputGroupAddon align="inline-end" className="p-0 pr-2">
              <span className="text-[10px] text-muted-foreground">°</span>
            </InputGroupAddon>
          </InputGroup>
        </div>
      </div>

      {/* Font Section */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Font
        </label>

        <Select
          value={currentFamily.family}
          onValueChange={(v) => {
            const family = GROUPED_FONTS.find((f) => f.family === v);
            if (family) {
              handleFontChange(family.mainFont.postScriptName);
            }
          }}
        >
          <SelectTrigger className="w-full h-12">
            <SelectValue placeholder="Select font">
              <div className="flex items-center h-full">
                {currentFamily.family}
              </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            {GROUPED_FONTS.map((family) => (
              <SelectItem key={family.family} value={family.family}>
                <div className="flex items-center py-1">
                  <img
                    src={family.mainFont.preview}
                    alt={family.family}
                    className="h-6 invert object-contain"
                  />
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="grid grid-cols-2 gap-2">
          <Select
            value={currentFont.postScriptName}
            onValueChange={(v) => handleFontChange(v)}
          >
            <SelectTrigger className="bg-input border h-9 w-full overflow-hidden">
              <SelectValue placeholder="Style" />
            </SelectTrigger>
            <SelectContent>
              {currentFamily.styles.map((style) => (
                <SelectItem key={style.id} value={style.postScriptName}>
                  {style.fullName.replace(currentFamily.family, '').trim() ||
                    'Regular'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <InputGroup>
            <NumberInput
              value={opts.fontSize || 40}
              onChange={(e) => {
                const newSize = e || 0;
                handleUpdate({ fontSize: newSize }, 'multiple');
              }}
              className="text-sm"
            />
            <InputGroupAddon align="inline-end">
              <IconTextSize className="size-4" />
            </InputGroupAddon>
          </InputGroup>
        </div>
      </div>

      {/* Style Section */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Style
        </label>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex bg-secondary/30 rounded-md p-1 gap-1">
            {[
              { label: 'aA', value: 'none' },
              { label: 'AA', value: 'uppercase' },
              { label: 'aa', value: 'lowercase' },
            ].map((item) => (
              <button
                key={item.value}
                onClick={() =>
                  handleUpdate({ textCase: item.value }, 'multiple')
                }
                className={cn(
                  'flex-1 text-[10px] font-medium flex items-center justify-center rounded-sm py-1 transition-colors',
                  (coreClip.textCase || 'none') === item.value
                    ? 'bg-white/10 text-white'
                    : 'text-muted-foreground hover:bg-white/5'
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          <InputGroup className="flex-1">
            <InputGroupAddon align="inline-start" className="relative p-0">
              <Popover modal={true}>
                <PopoverTrigger asChild>
                  <InputGroupButton
                    variant="ghost"
                    size="icon-xs"
                    className="h-full w-8"
                  >
                    <div
                      className="h-4 w-4 border border-white/10 shadow-sm"
                      style={{
                        backgroundColor: (opts.fill as string) || '#ffffff',
                      }}
                    />
                  </InputGroupButton>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3" align="start">
                  <ColorPicker
                    onChange={(colorValue) => {
                      const hexColor = color.rgb(colorValue).hex();
                      handleUpdate({ fill: hexColor }, 'multiple');
                    }}
                    className="w-72 h-72 rounded-md border bg-background p-4 shadow-sm"
                  >
                    <ColorPickerSelection />
                    <div className="flex items-center gap-4">
                      <ColorPickerEyeDropper />
                      <div className="grid w-full gap-1">
                        <ColorPickerHue />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <ColorPickerOutput />
                      <ColorPickerFormat />
                    </div>
                  </ColorPicker>
                </PopoverContent>
              </Popover>
            </InputGroupAddon>
            <InputGroupInput
              value={opts.fill?.toUpperCase() || '#FFFFFF'}
              onChange={(e) =>
                handleUpdate({ fill: e.target.value }, 'multiple')
              }
              className="text-sm p-0 text-[10px] font-mono"
            />
          </InputGroup>
        </div>
      </div>

      {/* Opacity Section */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Opacity
        </label>
        <div className="flex items-center gap-4">
          <IconCircle className="size-4 text-muted-foreground" />
          <Slider
            value={[Math.round((coreClip.opacity ?? 1) * 100)]}
            onValueChange={(v) => handleUpdate({ opacity: v[0] / 100 })}
            max={100}
            step={1}
            className="flex-1"
          />
          <InputGroup className="w-20">
            <InputGroupInput
              type="number"
              value={Math.round((coreClip.opacity ?? 1) * 100)}
              onChange={(e) =>
                handleUpdate({ opacity: (parseInt(e.target.value) || 0) / 100 })
              }
              className="text-sm p-0 text-center"
            />
            <InputGroupAddon align="inline-end" className="p-0 pr-2">
              <span className="text-[10px] text-muted-foreground">%</span>
            </InputGroupAddon>
          </InputGroup>
        </div>
      </div>

      {/* Animations Section */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Animations
          </label>
          <button
            onClick={() => {
              setFloatingControl('animation-properties-picker', {
                clipId: coreClip.id,
                mode: 'add',
              });
            }}
            className="text-muted-foreground hover:text-white transition-colors"
          >
            <IconPlus className="size-3.5" />
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {animations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-4 border border-dashed rounded-md bg-white/5 opacity-50">
              <IconMovie className="size-6 mb-1" />
              <span className="text-[10px]">No animations applied</span>
            </div>
          ) : (
            animations.map((anim: any) => (
              <div
                key={anim.options?.id ?? anim.id}
                className="flex items-center justify-between p-2 bg-secondary/30 rounded-md group"
              >
                <div className="flex flex-col flex-1">
                  <span className="text-xs font-medium capitalize">
                    {anim.type}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {Math.round((anim.options?.duration ?? 0) / 1e6)}s duration
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setFloatingControl('animation-properties-picker', {
                        clipId: coreClip.id,
                        animationId: anim.id,
                        mode: 'edit',
                      });
                    }}
                    className="p-1 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-white transition-all"
                  >
                    <IconEdit className="size-3.5" />
                  </button>
                  <button
                    onClick={() => handleAnimationRemove(anim.id)}
                    className="p-1 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-all"
                  >
                    <IconTrash className="size-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Caption presets */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Presets
        </label>
        <div className="relative w-full">
          <Button
            className="flex w-full items-center justify-between text-sm border bg-input/30 h-9"
            variant="secondary"
            onClick={() => setFloatingControl('caption-preset-picker')}
          >
            <div className="w-full text-left">
              <p className="truncate">None</p>
            </div>
            <ChevronDown className="text-muted-foreground" size={14} />
          </Button>
        </div>
      </div>

      {/* Caption Colors Section */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Caption Colors
        </label>

        {/* Appeared Color */}
        <div className="flex flex-col gap-1">
          <span className="text-[9px] text-muted-foreground">Appeared</span>
          <InputGroup>
            <InputGroupAddon align="inline-start" className="relative p-0">
              <Popover modal={true}>
                <PopoverTrigger asChild>
                  <InputGroupButton
                    variant="ghost"
                    size="icon-xs"
                    className="h-full w-8"
                  >
                    <div
                      className="h-4 w-4 border border-white/10 shadow-sm"
                      style={{
                        backgroundColor: captionColors.appeared || '#ffffff',
                      }}
                    />
                  </InputGroupButton>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3" align="start">
                  <ColorPicker
                    onChange={(colorValue) => {
                      const hexColor = color.rgb(colorValue).hex();
                      handleCaptionColorUpdate({ appeared: hexColor });
                    }}
                    className="w-72 h-72 rounded-md border bg-background p-4 shadow-sm"
                  >
                    <ColorPickerSelection />
                    <div className="flex items-center gap-4">
                      <ColorPickerEyeDropper />
                      <div className="grid w-full gap-1">
                        <ColorPickerHue />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <ColorPickerOutput />
                      <ColorPickerFormat />
                    </div>
                  </ColorPicker>
                </PopoverContent>
              </Popover>
            </InputGroupAddon>
            <InputGroupInput
              value={captionColors.appeared?.toUpperCase() || '#FFFFFF'}
              onChange={(e) =>
                handleCaptionColorUpdate({ appeared: e.target.value })
              }
              className="text-sm p-0 text-[10px] font-mono"
            />
          </InputGroup>
        </div>

        {/* Active Color */}
        <div className="flex flex-col gap-1">
          <span className="text-[9px] text-muted-foreground">Active</span>
          <InputGroup>
            <InputGroupAddon align="inline-start" className="relative p-0">
              <Popover modal={true}>
                <PopoverTrigger asChild>
                  <InputGroupButton
                    variant="ghost"
                    size="icon-xs"
                    className="h-full w-8"
                  >
                    <div
                      className="h-4 w-4 border border-white/10 shadow-sm"
                      style={{
                        backgroundColor: captionColors.active || '#ffffff',
                      }}
                    />
                  </InputGroupButton>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3" align="start">
                  <ColorPicker
                    onChange={(colorValue) => {
                      const hexColor = color.rgb(colorValue).hex();
                      handleCaptionColorUpdate({ active: hexColor });
                    }}
                    className="w-72 h-72 rounded-md border bg-background p-4 shadow-sm"
                  >
                    <ColorPickerSelection />
                    <div className="flex items-center gap-4">
                      <ColorPickerEyeDropper />
                      <div className="grid w-full gap-1">
                        <ColorPickerHue />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <ColorPickerOutput />
                      <ColorPickerFormat />
                    </div>
                  </ColorPicker>
                </PopoverContent>
              </Popover>
            </InputGroupAddon>
            <InputGroupInput
              value={captionColors.active?.toUpperCase() || '#FFFFFF'}
              onChange={(e) =>
                handleCaptionColorUpdate({ active: e.target.value })
              }
              className="text-sm p-0 text-[10px] font-mono"
            />
          </InputGroup>
        </div>

        {/* Active Fill Color */}
        <div className="flex flex-col gap-1">
          <span className="text-[9px] text-muted-foreground">Active Fill</span>
          <InputGroup>
            <InputGroupAddon align="inline-start" className="relative p-0">
              <Popover modal={true}>
                <PopoverTrigger asChild>
                  <InputGroupButton
                    variant="ghost"
                    size="icon-xs"
                    className="h-full w-8"
                  >
                    <div
                      className="h-4 w-4 border border-white/10 shadow-sm"
                      style={{
                        backgroundColor: captionColors.activeFill || '#FF5700',
                      }}
                    />
                  </InputGroupButton>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3" align="start">
                  <ColorPicker
                    onChange={(colorValue) => {
                      const hexColor = color.rgb(colorValue).hex();
                      handleCaptionColorUpdate({ activeFill: hexColor });
                    }}
                    className="w-72 h-72 rounded-md border bg-background p-4 shadow-sm"
                  >
                    <ColorPickerSelection />
                    <div className="flex items-center gap-4">
                      <ColorPickerEyeDropper />
                      <div className="grid w-full gap-1">
                        <ColorPickerHue />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <ColorPickerOutput />
                      <ColorPickerFormat />
                    </div>
                  </ColorPicker>
                </PopoverContent>
              </Popover>
            </InputGroupAddon>
            <InputGroupInput
              value={captionColors.activeFill?.toUpperCase() || '#FF5700'}
              onChange={(e) =>
                handleCaptionColorUpdate({ activeFill: e.target.value })
              }
              className="text-sm p-0 text-[10px] font-mono"
            />
          </InputGroup>
        </div>

        {/* Background Color */}
        <div className="flex flex-col gap-1">
          <span className="text-[9px] text-muted-foreground">Background</span>
          <InputGroup>
            <InputGroupAddon align="inline-start" className="relative p-0">
              <Popover modal={true}>
                <PopoverTrigger asChild>
                  <InputGroupButton
                    variant="ghost"
                    size="icon-xs"
                    className="h-full w-8"
                  >
                    <div
                      className="h-4 w-4 border border-white/10 shadow-sm"
                      style={{
                        backgroundColor: captionColors.background || '#000000',
                      }}
                    />
                  </InputGroupButton>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3" align="start">
                  <ColorPicker
                    onChange={(colorValue) => {
                      const hexColor = color.rgb(colorValue).hex();
                      handleCaptionColorUpdate({ background: hexColor });
                    }}
                    className="w-72 h-72 rounded-md border bg-background p-4 shadow-sm"
                  >
                    <ColorPickerSelection />
                    <div className="flex items-center gap-4">
                      <ColorPickerEyeDropper />
                      <div className="grid w-full gap-1">
                        <ColorPickerHue />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <ColorPickerOutput />
                      <ColorPickerFormat />
                    </div>
                  </ColorPicker>
                </PopoverContent>
              </Popover>
            </InputGroupAddon>
            <InputGroupInput
              value={captionColors.background?.toUpperCase() || ''}
              onChange={(e) =>
                handleCaptionColorUpdate({ background: e.target.value })
              }
              className="text-sm p-0 text-[10px] font-mono"
              placeholder="Transparent"
            />
          </InputGroup>
        </div>

        {/* Keyword Color */}
        <div className="flex flex-col gap-1">
          <span className="text-[9px] text-muted-foreground">Keyword</span>
          <InputGroup>
            <InputGroupAddon align="inline-start" className="relative p-0">
              <Popover modal={true}>
                <PopoverTrigger asChild>
                  <InputGroupButton
                    variant="ghost"
                    size="icon-xs"
                    className="h-full w-8"
                  >
                    <div
                      className="h-4 w-4 border border-white/10 shadow-sm"
                      style={{
                        backgroundColor: captionColors.keyword || '#ffffff',
                      }}
                    />
                  </InputGroupButton>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3" align="start">
                  <ColorPicker
                    onChange={(colorValue) => {
                      const hexColor = color.rgb(colorValue).hex();
                      handleCaptionColorUpdate({ keyword: hexColor });
                    }}
                    className="w-72 h-72 rounded-md border bg-background p-4 shadow-sm"
                  >
                    <ColorPickerSelection />
                    <div className="flex items-center gap-4">
                      <ColorPickerEyeDropper />
                      <div className="grid w-full gap-1">
                        <ColorPickerHue />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <ColorPickerOutput />
                      <ColorPickerFormat />
                    </div>
                  </ColorPicker>
                </PopoverContent>
              </Popover>
            </InputGroupAddon>
            <InputGroupInput
              value={captionColors.keyword?.toUpperCase() || '#FFFFFF'}
              onChange={(e) =>
                handleCaptionColorUpdate({ keyword: e.target.value })
              }
              className="text-sm p-0 text-[10px] font-mono"
            />
          </InputGroup>
        </div>
      </div>
    </div>
  );
}
