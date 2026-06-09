"use client";

import * as React from "react";
import { IClip } from "@openvideo/engine-pixi";
import { useStore } from "zustand";
import { projectStore, core } from "@/lib/project";
import { useEphemeralClip } from "@/hooks/use-ephemeral-clip";
import { Separator } from "@/components/ui/separator";
import useLayoutStore from "../store/use-layout-store";
import { PropertyKey, getPropertiesForType } from "./property-registry";
import * as Properties from "./properties";
import { EffectProperties } from "./effect-properties";
import { getFontByPostScriptName, getGroupedFonts } from "@/utils/font-utils";

const GROUPED_FONTS = getGroupedFonts();

interface UnifiedPropertiesPanelProps {
  clip: IClip;
}

export function UnifiedPropertiesPanel({ clip }: UnifiedPropertiesPanelProps) {
  const coreClipBase = useStore(projectStore, (s) => s.clips[clip.id]);
  const coreClip = useEphemeralClip(clip.id, coreClipBase ?? clip) as any;
  const { setFloatingControl } = useLayoutStore();

  if (!coreClip) return null;

  const style = coreClip.style || {};
  const transform = coreClip.transform || {};

  // Helper getters
  const getX = () => coreClip.left ?? transform.x ?? 0;
  const getY = () => coreClip.top ?? transform.y ?? 0;
  const getWidth = () => coreClip.width ?? transform.width ?? 0;
  const getHeight = () => coreClip.height ?? transform.height ?? 0;
  const getAngle = () => coreClip.angle ?? transform.angle ?? 0;
  const getOpacity = () => coreClip.opacity ?? transform.opacity ?? 1;
  const getFlip = () => coreClip.flip ?? transform.flip ?? { x: false, y: false };
  const getVolume = () => coreClip.volume ?? 1;

  const handleUpdate = (updates: any) => {
    core.clip.update(clip.id, updates);
  };

  const handleTransformUpdate = (updates: any) => {
    handleUpdate({ transform: { ...transform, ...updates } });
  };

  const handleStyleUpdate = (updates: any) => {
    const currentClip = projectStore.getState().clips[clip.id] as any;
    const currentStyle = currentClip?.style || {};
    handleUpdate({ style: { ...currentStyle, ...updates } });
  };

  const handleAnimationRemove = (animationId: string) => {
    const animations = coreClip.animations || [];
    handleUpdate({
      animations: animations.filter((a: any) => a.id !== animationId),
    });
  };

  // Get properties for this clip type
  const propertyKeys = getPropertiesForType(clip.type);

  // Render a single property
  const renderProperty = (key: PropertyKey) => {
    switch (key) {
      case "transform":
        return (
          <Properties.TransformProperty
            key={key}
            x={getX()}
            y={getY()}
            width={getWidth()}
            height={getHeight()}
            onXChange={(val) => handleTransformUpdate({ x: val })}
            onYChange={(val) => handleTransformUpdate({ y: val })}
            onWidthChange={(val) => handleTransformUpdate({ width: val })}
            onHeightChange={(val) => handleTransformUpdate({ height: val })}
          />
        );

      case "rotation":
        return (
          <Properties.RotationProperty
            key={key}
            value={getAngle()}
            onChange={(val) => handleTransformUpdate({ angle: val })}
          />
        );

      case "flip":
        return (
          <Properties.FlipProperty
            key={key}
            value={getFlip()}
            onChange={(flip: { x: boolean; y: boolean }) => handleTransformUpdate({ flip })}
          />
        );

      case "opacity":
        return (
          <Properties.OpacityProperty
            key={key}
            value={getOpacity()}
            onChange={(val: number) => handleTransformUpdate({ opacity: val })}
          />
        );

      case "fill":
        return (
          <Properties.FillProperty
            key={key}
            color={style.fill || "#3b82f6"}
            onColorChange={(val: string) => handleStyleUpdate({ fill: val })}
          />
        );

      case "stroke": {
        const hasStroke = style.stroke != null;
        return (
          <Properties.StrokeProperty
            key={key}
            open={hasStroke}
            onAdd={() => handleStyleUpdate({ stroke: { color: "#000000", width: 0 } })}
            onRemove={() => handleStyleUpdate({ stroke: null })}
            color={style.stroke?.color || "#000000"}
            width={style.stroke?.width || 0}
            onColorChange={(color: string) =>
              handleStyleUpdate({ stroke: { ...style.stroke, color } })
            }
            onWidthChange={(width: number) =>
              handleStyleUpdate({ stroke: { ...style.stroke, width } })
            }
          />
        );
      }

      case "shadow": {
        const hasShadow = style.shadow != null;
        return (
          <Properties.ShadowProperty
            key={key}
            open={hasShadow}
            onAdd={() =>
              handleStyleUpdate({ shadow: { offsetX: 0, offsetY: 0, blur: 0, color: "#000000" } })
            }
            onRemove={() => handleStyleUpdate({ shadow: null })}
            offsetX={style.shadow?.offsetX || 0}
            offsetY={style.shadow?.offsetY || 0}
            blur={style.shadow?.blur || 0}
            color={style.shadow?.color || "#000000"}
            onOffsetXChange={(val: number) =>
              handleStyleUpdate({ shadow: { ...style.shadow, offsetX: val } })
            }
            onOffsetYChange={(val: number) =>
              handleStyleUpdate({ shadow: { ...style.shadow, offsetY: val } })
            }
            onBlurChange={(val: number) =>
              handleStyleUpdate({ shadow: { ...style.shadow, blur: val } })
            }
            onColorChange={(val: string) =>
              handleStyleUpdate({ shadow: { ...style.shadow, color: val } })
            }
          />
        );
      }

      case "cornerRadius":
        return (
          <Properties.CornerRadiusProperty
            key={key}
            value={style.borderRadius || 0}
            onChange={(val: number) => handleStyleUpdate({ borderRadius: val })}
          />
        );

      case "chromaKey":
        return (
          <Properties.ChromaKeyProperty
            key={key}
            enabled={coreClip.chromaKey?.enabled ?? false}
            color={coreClip.chromaKey?.color || "#00FF00"}
            similarity={coreClip.chromaKey?.similarity ?? 0.1}
            spill={coreClip.chromaKey?.spill ?? 0.05}
            onEnabledChange={(enabled: boolean) =>
              handleUpdate({ chromaKey: { ...coreClip.chromaKey, enabled } })
            }
            onColorChange={(color: string) =>
              handleUpdate({ chromaKey: { ...coreClip.chromaKey, color } })
            }
            onSimilarityChange={(val: number) =>
              handleUpdate({ chromaKey: { ...coreClip.chromaKey, similarity: val } })
            }
            onSpillChange={(val: number) =>
              handleUpdate({ chromaKey: { ...coreClip.chromaKey, spill: val } })
            }
          />
        );

      case "animations": {
        const animations = coreClip.animations || [];
        return (
          <Properties.AnimationsProperty
            key={key}
            animations={animations}
            onAdd={() =>
              setFloatingControl("animation-properties-picker", {
                clipId: coreClip.id,
                mode: "add",
              })
            }
            onRemove={() => handleUpdate({ animations: [] })}
            onEdit={(animationId) =>
              setFloatingControl("animation-properties-picker", {
                clipId: coreClip.id,
                animationId,
                mode: "edit",
              })
            }
            onDelete={handleAnimationRemove}
          />
        );
      }

      case "volume":
        return (
          <Properties.VolumeProperty
            key={key}
            value={getVolume()}
            onChange={(val: number) => handleUpdate({ volume: val })}
          />
        );

      case "fade": {
        const timing = coreClip.timing || {};
        const fadeIn = timing.fadeIn || { duration: 0, curve: "linear" };
        const fadeOut = timing.fadeOut || { duration: 0, curve: "linear" };
        return (
          <Properties.FadeGroupProperty
            key={key}
            fadeInDuration={fadeIn.duration}
            fadeOutDuration={fadeOut.duration}
            onFadeInChange={(val: number) => {
              const newFadeIn = val > 0 ? { duration: val, curve: "linear" } : undefined;
              handleUpdate({ timing: { ...timing, fadeIn: newFadeIn } });
            }}
            onFadeOutChange={(val: number) => {
              const newFadeOut = val > 0 ? { duration: val, curve: "linear" } : undefined;
              handleUpdate({ timing: { ...timing, fadeOut: newFadeOut } });
            }}
          />
        );
      }

      case "aiTools": {
        const metadata = coreClip.metadata || {};
        return (
          <Properties.AiToolsProperty
            key={key}
            noiseReduction={!!metadata.noiseReduction}
            enhanceVoice={!!metadata.enhanceVoice}
            beatsDetection={!!metadata.beatsDetection}
            onNoiseReductionChange={(val: boolean) =>
              handleUpdate({ metadata: { ...metadata, noiseReduction: val } })
            }
            onEnhanceVoiceChange={(val: boolean) =>
              handleUpdate({ metadata: { ...metadata, enhanceVoice: val } })
            }
            onBeatsDetectionChange={(val: boolean) =>
              handleUpdate({ metadata: { ...metadata, beatsDetection: val } })
            }
          />
        );
      }

      // Text properties
      case "font": {
        const fontFamily = style.fontFamily || "Inter";
        return (
          <Properties.FontProperty
            key={key}
            currentFamily={fontFamily}
            onChange={async (postScriptName) => {
              const { getFontByPostScriptName } = await import("@/utils/font-utils");
              const { fontManager } = await import("@openvideo/engine-pixi");
              const font = getFontByPostScriptName(postScriptName);
              if (font) {
                await fontManager.addFont({ name: font.postScriptName, url: font.url });
                handleStyleUpdate({
                  fontFamily: font.postScriptName,
                  fontUrl: font.url,
                });
              }
            }}
          />
        );
      }

      case "textStyle":
        return (
          <Properties.TextStyleProperty
            key={key}
            size={style.fontSize || 24}
            color={style.fill || "#FFFFFF"}
            backgroundColor={style.backgroundColor}
            underline={style.underline || false}
            overline={style.overline || false}
            linethrough={style.linethrough || false}
            onSizeChange={(val: number) => handleStyleUpdate({ fontSize: val })}
            onColorChange={(val: string) => handleStyleUpdate({ fill: val })}
            onBackgroundColorChange={
              style.backgroundColor !== undefined
                ? (val: string) => handleStyleUpdate({ backgroundColor: val })
                : undefined
            }
            onUnderlineChange={(val: boolean) => handleStyleUpdate({ underline: val })}
            onOverlineChange={(val: boolean) => handleStyleUpdate({ overline: val })}
            onLinethroughChange={(val: boolean) => handleStyleUpdate({ linethrough: val })}
          />
        );

      case "textAlignment":
        return (
          <Properties.AlignmentProperty
            key={key}
            value={(style.textAlign as "left" | "center" | "right") || "left"}
            onChange={(val: "left" | "center" | "right") => handleStyleUpdate({ textAlign: val })}
          />
        );

      case "textSpacing":
        return (
          <Properties.SpacingProperty
            key={key}
            lineHeight={style.lineHeight || 1.2}
            letterSpacing={style.letterSpacing}
            onLineHeightChange={(val: number) => handleStyleUpdate({ lineHeight: val })}
            onLetterSpacingChange={
              style.letterSpacing !== undefined
                ? (val: number) => handleStyleUpdate({ letterSpacing: val })
                : undefined
            }
          />
        );

      case "textBlur":
        return (
          <Properties.BlurProperty
            key={key}
            value={style.shadow?.blur || 0}
            onChange={(val: number) =>
              handleStyleUpdate({
                shadow: {
                  ...(style.shadow || { color: "#000000", offsetX: 0, offsetY: 0 }),
                  blur: val,
                },
              })
            }
          />
        );

      case "textGroup": {
        const fontFamily = style.fontFamily || "Inter";
        const font = getFontByPostScriptName(fontFamily);
        const currentFamily = font?.family || "Inter";
        const familyData = GROUPED_FONTS.find(
          (f: { family: string }) => f.family === currentFamily,
        );
        const fontStyles = familyData?.styles || [];
        const currentFont = fontStyles.find(
          (s: { postScriptName: string }) => s.postScriptName === fontFamily,
        ) ||
          fontStyles[0] || { postScriptName: fontFamily, fullName: currentFamily };

        return (
          <Properties.TextGroupProperty
            key={key}
            currentFamily={currentFamily}
            currentFont={currentFont}
            fontStyles={fontStyles}
            fontSize={style.fontSize || 40}
            onFontChange={async (postScriptName) => {
              const { fontManager } = await import("@openvideo/engine-pixi");
              const newFont = getFontByPostScriptName(postScriptName);
              if (newFont) {
                await fontManager.addFont({ name: newFont.postScriptName, url: newFont.url });
                handleStyleUpdate({
                  fontFamily: newFont.postScriptName,
                  fontUrl: newFont.url,
                });
              }
            }}
            onFontStyleChange={(postScriptName) => {
              const newFont = getFontByPostScriptName(postScriptName);
              if (newFont) {
                handleStyleUpdate({
                  fontFamily: newFont.postScriptName,
                  fontUrl: newFont.url,
                });
              }
            }}
            onFontSizeChange={(val) => handleStyleUpdate({ fontSize: val })}
            textAlign={(style.textAlign as "left" | "center" | "right") || "left"}
            onTextAlignChange={(val) => handleStyleUpdate({ textAlign: val })}
            underline={style.underline || false}
            overline={style.overline || false}
            linethrough={style.linethrough || false}
            onUnderlineChange={(val) => handleStyleUpdate({ underline: val })}
            onOverlineChange={(val) => handleStyleUpdate({ overline: val })}
            onLinethroughChange={(val) => handleStyleUpdate({ linethrough: val })}
            textCase={(style.textCase as "none" | "uppercase" | "lowercase") || "none"}
            onTextCaseChange={(val) => handleStyleUpdate({ textCase: val })}
            fill={(style.fill as string) || "#000000"}
            onFillChange={(val) => handleStyleUpdate({ fill: val })}
          />
        );
      }

      // Caption properties
      case "captionStyle": {
        const opts = coreClip.style || {};
        return (
          <Properties.CaptionStyleProperty
            key={key}
            fontSize={opts.fontSize || 24}
            fontWeight={opts.fontWeight || "normal"}
            fontStyle={opts.fontStyle || "normal"}
            textTransform={opts.textTransform || "none"}
            lineHeight={opts.lineHeight || 1.4}
            onFontSizeChange={(val: number) => handleStyleUpdate({ fontSize: val })}
            onFontWeightChange={(val: "normal" | "bold") => handleStyleUpdate({ fontWeight: val })}
            onFontStyleChange={(val: "normal" | "italic") => handleStyleUpdate({ fontStyle: val })}
            onTextTransformChange={(val: "none" | "uppercase" | "lowercase") =>
              handleStyleUpdate({ textTransform: val })
            }
            onLineHeightChange={(val: number) => handleStyleUpdate({ lineHeight: val })}
          />
        );
      }

      case "captionColors": {
        const caption = coreClip.caption || {};
        return (
          <Properties.CaptionColorsProperty
            key={key}
            captionColors={caption.colors || {}}
            setColors={(colors) =>
              handleUpdate({ caption: { ...caption, colors: { ...caption.colors, ...colors } } })
            }
          />
        );
      }

      case "captionPosition": {
        const opts = coreClip.style || {};
        return (
          <Properties.CaptionPositionProperty
            key={key}
            value={(opts.verticalAlign as "top" | "center" | "bottom") || "bottom"}
            onChange={(val: "top" | "center" | "bottom") =>
              handleStyleUpdate({ verticalAlign: val })
            }
          />
        );
      }

      case "captionWordsPerLine": {
        const opts = coreClip.style || {};
        return (
          <Properties.CaptionWordsPerLineProperty
            key={key}
            value={opts.wordsPerLine || "multiple"}
            onChange={(val: "single" | "multiple") => handleStyleUpdate({ wordsPerLine: val })}
          />
        );
      }

      case "captionLayout": {
        const opts = coreClip.style || {};
        return (
          <Properties.CaptionLayoutProperty
            key={key}
            textAlign={(opts.textAlign as "left" | "center" | "right") || "center"}
            verticalPosition={(opts.verticalPosition as "top" | "center" | "bottom") || "bottom"}
            wordsPerLine={opts.wordsPerLine || 4}
            maxLines={opts.maxLines || 2}
            onTextAlignChange={(val: "left" | "center" | "right") =>
              handleStyleUpdate({ textAlign: val })
            }
            onVerticalPositionChange={(val: "top" | "center" | "bottom") =>
              handleStyleUpdate({ verticalPosition: val })
            }
            onWordsPerLineChange={(val: number) => handleStyleUpdate({ wordsPerLine: val })}
            onMaxLinesChange={(val: number) => handleStyleUpdate({ maxLines: val })}
          />
        );
      }

      // case "captionGroup": {
      //   const opts = coreClip.style || {};
      //   const fontFamily = opts.fontFamily || "Inter";
      //   const font = getFontByPostScriptName(fontFamily);
      //   const currentFamily = font?.family || "Inter";
      //   const familyData = GROUPED_FONTS.find((f: { family: string }) => f.family === currentFamily);
      //   const fontStyles = familyData?.styles || [];
      //   const currentFont = fontStyles.find((s: { postScriptName: string }) => s.postScriptName === fontFamily) || fontStyles[0] || { postScriptName: fontFamily, fullName: currentFamily };

      //   return (
      //     <Properties.CaptionGroupProperty
      //       key={key}
      //       // Font
      //       currentFamily={currentFamily}
      //       currentFont={currentFont}
      //       fontStyles={fontStyles}
      //       onFontChange={async (postScriptName) => {
      //         const { fontManager } = await import("@openvideo/engine-pixi");
      //         const newFont = getFontByPostScriptName(postScriptName);
      //         if (newFont) {
      //           await fontManager.addFont({ name: newFont.postScriptName, url: newFont.url });
      //           handleStyleUpdate({
      //             fontFamily: newFont.postScriptName,
      //             fontUrl: newFont.url,
      //           });
      //         }
      //       }}
      //       onFontVariantChange={(postScriptName) => {
      //         const newFont = getFontByPostScriptName(postScriptName);
      //         if (newFont) {
      //           handleStyleUpdate({
      //             fontFamily: newFont.postScriptName,
      //             fontUrl: newFont.url,
      //           });
      //         }
      //       }}
      //       // Style
      //       fontSize={opts.fontSize || 24}
      //       fontWeight={opts.fontWeight || "normal"}
      //       fontStyle={opts.fontStyle || "normal"}
      //       textTransform={opts.textTransform || "none"}
      //       lineHeight={opts.lineHeight || 1.4}
      //       onFontSizeChange={(val: number) => handleStyleUpdate({ fontSize: val })}
      //       onFontWeightChange={(val: "normal" | "bold") => handleStyleUpdate({ fontWeight: val })}
      //       onFontStyleChange={(val: "normal" | "italic") => handleStyleUpdate({ fontStyle: val })}
      //       onTextTransformChange={(val: "none" | "uppercase" | "lowercase") =>
      //         handleStyleUpdate({ textTransform: val })
      //       }
      //       onLineHeightChange={(val: number) => handleStyleUpdate({ lineHeight: val })}
      //       // Caption Colors - all 5 options
      //       appearedColor={opts.captionColors?.appeared || "#FFFFFF"}
      //       activeColor={opts.captionColors?.active || "#FFFFFF"}
      //       activeFillColor={opts.captionColors?.activeFill || "#FF5700"}
      //       backgroundColor={opts.captionColors?.background || "#00000000"}
      //       keywordColor={opts.captionColors?.keyword || "#FFFFFF"}
      //       onAppearedColorChange={(val: string) => handleStyleUpdate({ captionColors: { ...opts.captionColors, appeared: val } })}
      //       onActiveColorChange={(val: string) => handleStyleUpdate({ captionColors: { ...opts.captionColors, active: val } })}
      //       onActiveFillColorChange={(val: string) => handleStyleUpdate({ captionColors: { ...opts.captionColors, activeFill: val } })}
      //       onBackgroundColorChange={(val: string) => handleStyleUpdate({ captionColors: { ...opts.captionColors, background: val } })}
      //       onKeywordColorChange={(val: string) => handleStyleUpdate({ captionColors: { ...opts.captionColors, keyword: val } })}
      //       // Layout
      //       textAlign={(opts.textAlign as "left" | "center" | "right") || "center"}
      //       verticalPosition={(opts.verticalPosition as "top" | "center" | "bottom") || "bottom"}
      //       wordsPerLine={opts.wordsPerLine || 4}
      //       maxLines={opts.maxLines || 2}
      //       onTextAlignChange={(val: "left" | "center" | "right") => handleStyleUpdate({ textAlign: val })}
      //       onVerticalPositionChange={(val: "top" | "center" | "bottom") =>
      //         handleStyleUpdate({ verticalPosition: val })
      //       }
      //       onWordsPerLineChange={(val: number) => handleStyleUpdate({ wordsPerLine: val })}
      //       onMaxLinesChange={(val: number) => handleStyleUpdate({ maxLines: val })}
      //     />
      //   );
      // }

      // Effect properties - uses the dedicated EffectProperties component
      case "effectConfig":
        return <EffectProperties key={key} clip={clip} />;

      // Transition properties
      case "transitionDuration": {
        const duration = coreClip.duration || 0;
        // Calculate min/max based on connected clips
        const fromClipId = coreClip.fromClipId;
        const toClipId = coreClip.toClipId;
        let maxDurationMicro = 10_000_000; // 10s default
        if (fromClipId && toClipId) {
          const state = projectStore.getState();
          const fromClip = state.clips[fromClipId];
          const toClip = state.clips[toClipId];
          if (fromClip && toClip) {
            const minDuration = Math.min(fromClip.duration || 0, toClip.duration || 0);
            maxDurationMicro = minDuration * 0.25;
          }
        }
        const minDurationMicro = 100_000; // 0.1s

        return (
          <Properties.TransitionDurationProperty
            key={key}
            value={duration}
            min={minDurationMicro}
            max={maxDurationMicro}
            onChange={(val: number) => {
              // Update transition duration and adjust connected clips
              const clipUpdates: any = {
                duration: val,
                display: { from: 0, to: val },
              };
              handleUpdate(clipUpdates);
            }}
          />
        );
      }

      case "transitionSelector": {
        const currentKey = coreClip.transitionEffect?.key || "fade";
        return (
          <Properties.TransitionSelectorProperty
            key={key}
            currentKey={currentKey}
            onSelect={(key: string) => {
              handleUpdate({
                transitionEffect: {
                  ...coreClip.transitionEffect,
                  key,
                  name: key,
                },
              });
            }}
          />
        );
      }

      default:
        return null;
    }
  };

  // Auto-insert separators between logical property groups
  const needsSeparator = (key: PropertyKey, index: number) => {
    if (index === 0) return false;
    // Insert separator before transform (after textGroup) and before stroke/effects
    return true;
  };

  return (
    <div className="flex flex-col">
      {propertyKeys.map((key, index) => (
        <React.Fragment key={key}>
          {needsSeparator(key, index) && <Separator className="bg-white/10" />}
          {renderProperty(key)}
        </React.Fragment>
      ))}
    </div>
  );
}
