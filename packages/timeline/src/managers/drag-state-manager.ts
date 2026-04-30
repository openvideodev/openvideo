import { Canvas, FabricObject } from "fabric";
import { Helper, Placeholder, Track } from "../objects";

export interface MovingState {
  canvas: Canvas | null;
  enableGuideRedraw: boolean;
  isPointerOverHelperTrack: boolean;
  draggingOverTrack: Track | Helper | null | undefined;

  placeholderMovingObjects: Placeholder[];
  primaryMovingObjects: FabricObject[];
  secondaryMovingObjects: FabricObject[];

  objectInitialPositions: Record<string, { top: number; left: number }>;
  originTrack: Track | Record<string, any>;
  trackToItemsMap: Record<string, FabricObject[]>;
  activeTrackToItemsMap: Record<string, FabricObject[]>;
  trackTopToIdMap: Record<number, string>;
  trackTops: number[];
  activeObjects: FabricObject[];
  primaryTracks: Record<string, { objects: FabricObject[]; index: number }>;
  secondaryTracks: Record<string, { objects: FabricObject[]; index: number }>;

  isDragOver: boolean;
  initialTrackPoints: number[];

  updateItemsInTrack: string | null;
  orderNormalTrack: boolean;
}

const initialState: MovingState = {
  canvas: null,
  enableGuideRedraw: true,
  isPointerOverHelperTrack: false,
  draggingOverTrack: null,

  placeholderMovingObjects: [],
  primaryMovingObjects: [],
  secondaryMovingObjects: [],

  objectInitialPositions: {},
  originTrack: {},
  trackToItemsMap: {},
  activeTrackToItemsMap: {},
  trackTopToIdMap: {},
  trackTops: [],
  activeObjects: [],
  primaryTracks: {},
  secondaryTracks: {},

  isDragOver: false,
  initialTrackPoints: [],
  updateItemsInTrack: null,
  orderNormalTrack: false
};

class DragStateManager {
  private state: MovingState = { ...initialState };

  public getState(): MovingState {
    return this.state;
  }

  public setState(updates: Partial<MovingState>) {
    Object.assign(this.state, updates);
  }

  public reset() {
    this.state = { ...initialState };
  }
}

export default DragStateManager;
