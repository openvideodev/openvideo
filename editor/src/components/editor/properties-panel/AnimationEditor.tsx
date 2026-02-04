import * as React from 'react';
import { useState, useEffect } from 'react';
import { ANIMATABLE_PROPERTIES, AnimationProps, AnimationOptions, KeyframeData } from 'openvideo';
import { getPresetTemplate } from 'openvideo';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { NumberInput } from '@/components/ui/number-input';
import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
} from '@/components/ui/input-group';
import { IconPlus, IconTrash, IconX } from '@tabler/icons-react';
import { cn } from '@/lib/utils';

interface AnimationEditorProps {
    mode: 'add' | 'edit';
    animation?: {
        id: string;
        type: string;
        options: Required<AnimationOptions>;
        params?: any;
    };
    onSave: (type: string, opts: AnimationOptions, params: KeyframeData) => void;
    onCancel: () => void;
}

type PropertyKey = keyof typeof ANIMATABLE_PROPERTIES;

export function AnimationEditor({ mode, animation, onSave, onCancel }: AnimationEditorProps) {
    const [preset, setPreset] = useState<string>(animation?.type || 'custom');
    const [keyframes, setKeyframes] = useState<Record<string, Partial<AnimationProps>>>({});
    const [duration, setDuration] = useState<number>((animation?.options.duration || 1000000) / 1000);
    const [delay, setDelay] = useState<number>((animation?.options.delay || 0) / 1000);
    const [iterCount, setIterCount] = useState<number>(animation?.options.iterCount || 1);
    const [easing, setEasing] = useState<string>((animation?.options.easing as string) || 'easeOutQuad');

    // Initialize keyframes from preset or animation
    useEffect(() => {
        if (animation && animation.params) {
            setKeyframes(animation.params);
        } else if (preset !== 'custom') {
            const template = getPresetTemplate(preset, {});
            setKeyframes(template);
        } else {
            setKeyframes({
                '0%': {},
                '100%': {}
            });
        }
    }, [preset, animation]);

    const handlePresetChange = (value: string) => {
        setPreset(value);
        if (value !== 'custom') {
            const template = getPresetTemplate(value, {});
            setKeyframes(template);
        }
    };

    const handlePropertyChange = (keyframe: string, property: PropertyKey, value: number) => {
        setKeyframes(prev => ({
            ...prev,
            [keyframe]: {
                ...prev[keyframe],
                [property]: value
            }
        }));
    };

    const handlePropertyToggle = (keyframe: string, property: PropertyKey, enabled: boolean) => {
        setKeyframes(prev => {
            const newKeyframes = { ...prev };
            if (enabled) {
                newKeyframes[keyframe] = {
                    ...newKeyframes[keyframe],
                    [property]: ANIMATABLE_PROPERTIES[property].default
                };
            } else {
                const { [property]: _, ...rest } = newKeyframes[keyframe] || {};
                newKeyframes[keyframe] = rest;
            }
            return newKeyframes;
        });
    };

    const handleAddKeyframe = () => {
        const existingProgress = Object.keys(keyframes).map(k => {
            const match = k.match(/(\d+)%/);
            return match ? parseInt(match[1]) : 0;
        });
        const maxProgress = Math.max(...existingProgress);
        const newProgress = Math.min(maxProgress + 25, 100);
        setKeyframes(prev => ({
            ...prev,
            [`${newProgress}%`]: {}
        }));
    };

    const handleRemoveKeyframe = (keyframe: string) => {
        if (keyframe === '0%' || keyframe === '100%') return;
        setKeyframes(prev => {
            const { [keyframe]: _, ...rest } = prev;
            return rest;
        });
    };

    const handleSave = () => {
        const opts: AnimationOptions = {
            duration: duration * 1000,
            delay: delay * 1000,
            iterCount,
            easing,
        };
        onSave(preset === 'custom' ? 'keyframes' : preset, opts, keyframes);
    };

    const sortedKeyframes = Object.keys(keyframes).sort((a, b) => {
        const aNum = parseInt(a.replace('%', ''));
        const bNum = parseInt(b.replace('%', ''));
        return aNum - bNum;
    });

    return (
        <div className="flex flex-col gap-4 p-4 max-h-[600px] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">
                    {mode === 'add' ? 'Add Animation' : 'Edit Animation'}
                </h3>
                <button onClick={onCancel} className="text-muted-foreground hover:text-white">
                    <IconX className="size-4" />
                </button>
            </div>

            {/* Preset Selector */}
            <div className="flex flex-col gap-2">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Preset
                </label>
                <Select value={preset} onValueChange={handlePresetChange}>
                    <SelectTrigger className="w-full h-9">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="custom">Custom</SelectItem>
                        <SelectItem value="fadeIn">Fade In</SelectItem>
                        <SelectItem value="fadeOut">Fade Out</SelectItem>
                        <SelectItem value="slideIn">Slide In</SelectItem>
                        <SelectItem value="slideOut">Slide Out</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Keyframes */}
            <div className="flex flex-col gap-2">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Keyframes
                </label>

                {sortedKeyframes.map((keyframe) => (
                    <KeyframeItem
                        key={keyframe}
                        keyframe={keyframe}
                        properties={keyframes[keyframe] || {}}
                        onPropertyChange={(prop, val) => handlePropertyChange(keyframe, prop, val)}
                        onPropertyToggle={(prop, enabled) => handlePropertyToggle(keyframe, prop, enabled)}
                        onRemove={() => handleRemoveKeyframe(keyframe)}
                        canRemove={keyframe !== '0%' && keyframe !== '100%'}
                    />
                ))}

                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddKeyframe}
                    className="w-full"
                >
                    <IconPlus className="size-3.5 mr-1" />
                    Add Keyframe
                </Button>
            </div>

            {/* Timing */}
            <div className="flex flex-col gap-2">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Timing
                </label>
                <div className="grid grid-cols-2 gap-2">
                    <InputGroup>
                        <InputGroupAddon align="inline-start">
                            <span className="text-[10px] font-medium text-muted-foreground">Duration</span>
                        </InputGroupAddon>
                        <NumberInput
                            value={duration}
                            onChange={setDuration}
                            className="p-0"
                        />
                        <InputGroupAddon align="inline-end">
                            <span className="text-[10px] text-muted-foreground">ms</span>
                        </InputGroupAddon>
                    </InputGroup>

                    <InputGroup>
                        <InputGroupAddon align="inline-start">
                            <span className="text-[10px] font-medium text-muted-foreground">Delay</span>
                        </InputGroupAddon>
                        <NumberInput
                            value={delay}
                            onChange={setDelay}
                            className="p-0"
                        />
                        <InputGroupAddon align="inline-end">
                            <span className="text-[10px] text-muted-foreground">ms</span>
                        </InputGroupAddon>
                    </InputGroup>
                </div>

                <InputGroup>
                    <InputGroupAddon align="inline-start">
                        <span className="text-[10px] font-medium text-muted-foreground">Iterations</span>
                    </InputGroupAddon>
                    <NumberInput
                        value={iterCount}
                        onChange={setIterCount}
                        className="p-0"
                    />
                </InputGroup>
            </div>

            {/* Easing */}
            <div className="flex flex-col gap-2">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Easing
                </label>
                <Select value={easing} onValueChange={setEasing}>
                    <SelectTrigger className="w-full h-9">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="linear">Linear</SelectItem>
                        <SelectItem value="easeInQuad">Ease In Quad</SelectItem>
                        <SelectItem value="easeOutQuad">Ease Out Quad</SelectItem>
                        <SelectItem value="easeInOutQuad">Ease In Out Quad</SelectItem>
                        <SelectItem value="easeInCubic">Ease In Cubic</SelectItem>
                        <SelectItem value="easeOutCubic">Ease Out Cubic</SelectItem>
                        <SelectItem value="easeInOutCubic">Ease In Out Cubic</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t">
                <Button variant="outline" onClick={onCancel} className="flex-1">
                    Cancel
                </Button>
                <Button onClick={handleSave} className="flex-1">
                    {mode === 'add' ? 'Add' : 'Save'}
                </Button>
            </div>
        </div>
    );
}

interface KeyframeItemProps {
    keyframe: string;
    properties: Partial<AnimationProps>;
    onPropertyChange: (property: PropertyKey, value: number) => void;
    onPropertyToggle: (property: PropertyKey, enabled: boolean) => void;
    onRemove: () => void;
    canRemove: boolean;
}

function KeyframeItem({ keyframe, properties, onPropertyChange, onPropertyToggle, onRemove, canRemove }: KeyframeItemProps) {
    const [expanded, setExpanded] = useState(true);

    return (
        <div className="border rounded-md bg-secondary/20">
            <div className="flex items-center justify-between p-2 cursor-pointer" onClick={() => setExpanded(!expanded)}>
                <span className="text-xs font-medium">{keyframe}</span>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">
                        {Object.keys(properties).length} {Object.keys(properties).length === 1 ? 'property' : 'properties'}
                    </span>
                    {canRemove && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onRemove();
                            }}
                            className="text-muted-foreground hover:text-red-400"
                        >
                            <IconTrash className="size-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {expanded && (
                <div className="p-2 pt-0 flex flex-col gap-2">
                    {(Object.keys(ANIMATABLE_PROPERTIES) as PropertyKey[]).map((prop) => {
                        const isEnabled = prop in properties;
                        const config = ANIMATABLE_PROPERTIES[prop];

                        return (
                            <div key={prop} className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={isEnabled}
                                    onChange={(e) => onPropertyToggle(prop, e.target.checked)}
                                    className="size-3.5"
                                />
                                <span className="text-[10px] text-muted-foreground min-w-[60px]">
                                    {config.label}
                                </span>
                                {isEnabled && (
                                    <div className="flex-1 flex items-center gap-2">
                                        <Slider
                                            value={[properties[prop] ?? config.default]}
                                            onValueChange={([val]) => onPropertyChange(prop, val)}
                                            min={config.min}
                                            max={config.max}
                                            step={config.step}
                                            className="flex-1"
                                        />
                                        <NumberInput
                                            value={properties[prop] ?? config.default}
                                            onChange={(val) => onPropertyChange(prop, val)}
                                            className="w-16 h-7 text-xs p-1"
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
