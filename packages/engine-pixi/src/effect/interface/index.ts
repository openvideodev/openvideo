import {
  AdjustmentFilterOptions,
  AdvancedBloomFilterOptions,
  BloomFilterOptions,
  ColorOverlayFilterOptions,
  ConvolutionFilterOptions,
  DotFilterOptions,
  DropShadowFilterOptions,
  GlitchFilterOptions,
  GlowFilterOptions,
  GodrayFilterOptions,
  HslAdjustmentFilterOptions,
  KawaseBlurFilterOptions,
  MotionBlurFilterOptions,
  OldFilmFilterOptions,
  RadialBlurFilterOptions,
  ReflectionFilterOptions,
  RGBSplitFilterOptions,
  TiltShiftFilterOptions,
} from "pixi-filters";

export type FilterOptionsMap = {
  adjustmentFilter: AdjustmentFilterOptions;
  advancedBloomFilter: AdvancedBloomFilterOptions;
  backdropBlurFilter: any;
  bloomFilter: BloomFilterOptions;
  colorMapFilter: any;
  colorOverlayFilter: ColorOverlayFilterOptions;
  convolutionFilter: ConvolutionFilterOptions;
  dotFilter: DotFilterOptions;
  dropShadowFilter: DropShadowFilterOptions;
  glitchFilter: GlitchFilterOptions;
  glowFilter: GlowFilterOptions;
  godrayFilter: GodrayFilterOptions;
  grayscaleFilter: any;
  hslAdjustmentFilter: HslAdjustmentFilterOptions;
  kawaseBlurFilter: KawaseBlurFilterOptions;
  motionBlurFilter: MotionBlurFilterOptions;
  oldFilmFilter: OldFilmFilterOptions;
  pixelateFilter: any;
  radialBlurFilter: RadialBlurFilterOptions;
  reflectionFilter: ReflectionFilterOptions;
  rgbSplitFilter: RGBSplitFilterOptions;
  tiltShiftFilter: TiltShiftFilterOptions;
};
