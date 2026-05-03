export interface IMediaMetadata {
  width?: number;
  height?: number;
  duration?: number;
}

export interface IMediaMetadataProvider {
  getImageMetadata(src: string): Promise<IMediaMetadata | null>;
  getVideoMetadata(src: string): Promise<IMediaMetadata | null>;
  getAudioMetadata(src: string): Promise<IMediaMetadata | null>;
}

export const CoreConfig = {
  metadataProvider: null as IMediaMetadataProvider | null,
  setMetadataProvider(provider: IMediaMetadataProvider) {
    this.metadataProvider = provider;
  }
};
