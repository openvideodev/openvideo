import { resizeTrimmable } from "./trimmable";
import { changeWidth } from "./common";
import { resizeTransitionWidth } from "./transition";

export const resize = {
  trimmable: resizeTrimmable,
  common: changeWidth,
  transition: resizeTransitionWidth,
};
