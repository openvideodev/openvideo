import * as React from "react";
import { IClip } from "@openvideo/engine-pixi";
import { SharedAudioProperties } from "./shared-audio-properties";

interface AudioPropertiesProps {
  clip: IClip;
}

export function AudioProperties({ clip }: AudioPropertiesProps) {
  return <SharedAudioProperties clip={clip} />;
}
