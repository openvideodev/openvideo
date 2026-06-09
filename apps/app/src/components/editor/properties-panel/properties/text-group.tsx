"use client";

import React, { useState, useMemo } from "react";
import {
  IconAlignLeft,
  IconAlignCenter,
  IconAlignRight,
  IconTextSize,
  IconUnderline,
  IconOverline,
  IconStrikethrough,
  IconChevronDown,
  IconCheck,
} from "@tabler/icons-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  ColorPicker,
  ColorPickerSelection,
  ColorPickerHue,
  ColorPickerEyeDropper,
  ColorPickerFormat,
  ColorPickerOutput,
} from "@/components/ui/color-picker";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupButton,
} from "@/components/ui/input-group";
import { NumberInput } from "@/components/ui/number-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import color from "color";
import { getGroupedFonts, getFontByPostScriptName } from "@/utils/font-utils";

const GROUPED_FONTS = getGroupedFonts();

const FontPicker = React.memo(
  ({
    currentFamily,
    handleFontChange,
  }: {
    currentFamily: { family: string };
    handleFontChange: (postScriptName: string) => void;
  }) => {
    const [isOpen, setIsOpen] = useState(false);

    const fontItems = useMemo(() => {
      return GROUPED_FONTS.map((family) => (
        <button
          key={family.family}
          className={cn(
            "flex w-full items-center px-2 py-2 text-sm rounded-md transition-colors hover:bg-accent hover:text-accent-foreground",
            currentFamily.family === family.family && "bg-accent/50 text-accent-foreground",
          )}
          onClick={() => {
            handleFontChange(family.mainFont.postScriptName);
            setIsOpen(false);
          }}
        >
          <span className="flex-1 text-left">{family.family}</span>
          {currentFamily.family === family.family && <IconCheck className="size-4 ml-2" />}
        </button>
      ));
    }, [currentFamily.family, handleFontChange]);

    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={isOpen}
            className="w-full h-9 justify-between px-3 border-input"
          >
            <span className="truncate">{currentFamily.family}</span>
            <IconChevronDown className="size-4 opacity-50 shrink-0 ml-2" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 gap-0" align="start">
          <ScrollArea className="h-72 w-full">
            <div className="flex flex-col p-1 gap-px">{fontItems}</div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    );
  },
);

interface TextGroupPropertyProps {
  // Font
  currentFamily: string;
  currentFont: {
    postScriptName: string;
    fullName: string;
  };
  fontStyles: Array<{ id: string; postScriptName: string; fullName: string }>;
  fontSize: number;
  onFontChange: (postScriptName: string) => void;
  onFontStyleChange: (postScriptName: string) => void;
  onFontSizeChange: (val: number) => void;

  // Alignment
  textAlign: "left" | "center" | "right";
  onTextAlignChange: (val: "left" | "center" | "right") => void;
  underline: boolean;
  overline: boolean;
  linethrough: boolean;
  onUnderlineChange: (val: boolean) => void;
  onOverlineChange: (val: boolean) => void;
  onLinethroughChange: (val: boolean) => void;

  // Case & Color
  textCase: "none" | "uppercase" | "lowercase";
  onTextCaseChange: (val: "none" | "uppercase" | "lowercase") => void;
  fill: string;
  onFillChange: (val: string) => void;
}

export function TextGroupProperty({
  currentFamily,
  currentFont,
  fontStyles,
  fontSize,
  onFontChange,
  onFontStyleChange,
  onFontSizeChange,
  textAlign,
  onTextAlignChange,
  underline,
  overline,
  linethrough,
  onUnderlineChange,
  onOverlineChange,
  onLinethroughChange,
  textCase,
  onTextCaseChange,
  fill,
  onFillChange,
}: TextGroupPropertyProps) {
  const [colorOpen, setColorOpen] = useState(false);

  return (
    <div className="flex flex-col gap-3 pb-4">
      {/* Font Section */}
      <div className="flex flex-col gap-2">
        <div className="h-12 flex items-center">
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Font
          </label>
        </div>

        <FontPicker currentFamily={{ family: currentFamily }} handleFontChange={onFontChange} />

        <div className="grid grid-cols-2 gap-2">
          <Select value={currentFont.postScriptName} onValueChange={onFontStyleChange}>
            <SelectTrigger className="border h-9 w-full overflow-hidden">
              <SelectValue placeholder="Style" />
            </SelectTrigger>
            <SelectContent>
              {fontStyles.map((style) => (
                <SelectItem key={style.id} value={style.postScriptName}>
                  {style.fullName.replace(currentFamily, "").trim() || "Regular"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <InputGroup>
            <NumberInput value={fontSize} onChange={onFontSizeChange} className="pl-2" />
            <InputGroupAddon align="inline-end">
              <IconTextSize className="size-4" />
            </InputGroupAddon>
          </InputGroup>
        </div>
      </div>

      {/* Alignment Section */}
      <div className="grid grid-cols-2 gap-2">
        {/* Text Align */}
        <div className="flex bg-input/30 rounded-md p-1 gap-1">
          {[
            { icon: IconAlignLeft, value: "left" },
            { icon: IconAlignCenter, value: "center" },
            { icon: IconAlignRight, value: "right" },
          ].map((item) => (
            <button
              key={item.value}
              onClick={() => onTextAlignChange(item.value as "left" | "center" | "right")}
              className={cn(
                "flex-1 flex items-center justify-center rounded-sm py-1 transition-colors",
                textAlign === item.value
                  ? "bg-white/10 text-white"
                  : "text-muted-foreground hover:bg-white/5",
              )}
            >
              <item.icon className="size-3.5" />
            </button>
          ))}
        </div>

        {/* Decorations */}
        <div className="flex bg-input/30 rounded-md p-1 gap-1">
          {[
            { icon: IconUnderline, value: "underline", active: underline },
            { icon: IconOverline, value: "overline", active: overline },
            { icon: IconStrikethrough, value: "strikethrough", active: linethrough },
          ].map((item) => (
            <button
              key={item.value}
              onClick={() => {
                if (item.value === "underline") onUnderlineChange(!underline);
                if (item.value === "overline") onOverlineChange(!overline);
                if (item.value === "strikethrough") onLinethroughChange(!linethrough);
              }}
              className={cn(
                "flex-1 flex items-center justify-center rounded-sm py-1 transition-colors",
                item.active ? "bg-white/10 text-white" : "text-muted-foreground hover:bg-white/5",
              )}
            >
              <item.icon className="size-3.5" />
            </button>
          ))}
        </div>
      </div>

      {/* Case & Color Section */}
      <div className="grid grid-cols-2 gap-2">
        {/* Text Case */}
        <div className="flex bg-secondary/30 rounded-md p-1 gap-1">
          {[
            { label: "aA", value: "none" },
            { label: "AA", value: "uppercase" },
            { label: "aa", value: "lowercase" },
          ].map((item) => (
            <button
              key={item.value}
              onClick={() => onTextCaseChange(item.value as "none" | "uppercase" | "lowercase")}
              className={cn(
                "flex-1 text-[10px] font-medium flex items-center justify-center rounded-sm py-1 transition-colors",
                textCase === item.value
                  ? "bg-white/10 text-white"
                  : "text-muted-foreground hover:bg-white/5",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Color Picker */}
        <InputGroup className="flex-1">
          <InputGroupAddon align="inline-start" className="relative p-0">
            <Popover modal={true} open={colorOpen} onOpenChange={setColorOpen}>
              <PopoverTrigger asChild>
                <InputGroupButton variant="ghost" size="icon-xs" className="h-full w-8">
                  <div
                    className="h-4 ml-2 w-4 border border-white/10 shadow-sm"
                    style={{
                      backgroundColor: fill || "#000000",
                    }}
                  />
                </InputGroupButton>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3" align="start">
                <ColorPicker
                  value={fill}
                  onChange={(colorValue) => {
                    const hexColor = color.rgb(colorValue as number[]).hex();
                    onFillChange(hexColor);
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
            value={(fill || "#000000").toUpperCase()}
            onChange={(e) => onFillChange(e.target.value)}
            className="text-sm p-0 text-[10px] font-mono"
          />
          <InputGroupAddon align="inline-end" className="border-l border-white/5 pl-2">
            <span className="text-[10px]">100%</span>
          </InputGroupAddon>
        </InputGroup>
      </div>
    </div>
  );
}
