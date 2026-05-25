import { FabricObject } from "fabric";

export interface IDropInfo {
  isSecondaryOverlapped: boolean;
  primaryPositions: {
    trackIndex?: number;
    trackId: string;
    positions: Record<string, { top: number; left: number }>;
  };
  secondaryTracks: Record<
    string,
    {
      objects: FabricObject[];
      index: number;
    }
  >;
  primaryTracks: Record<
    string,
    {
      objects: FabricObject[];
      index: number;
    }
  >;
}
