import { Resizable, ResizableProps } from "@openvideo/timeline";
import {
  TIMELINE_SELECTED_BORDER_COLOR,
  TIMELINE_UNSELECTED_BORDER_COLOR,
  TIMELINE_BORDER_WIDTH,
} from "../../constants/constants";

interface HillAudioBarsProps extends ResizableProps {
  src: string;
}

class HillAudioBars extends Resizable {
  static type = "HillAudioBars";
  declare src: string;
  public backgroundColorDiv: string = "#808080";

  public hasSrc = true;
  constructor(props: HillAudioBarsProps) {
    super(props);
    this.id = props.id;
    this.display = props.display;
    this.tScale = props.tScale;
  }

  public _render(ctx: CanvasRenderingContext2D) {
    super._render(ctx);
    this.updateSelected(ctx);
  }

  public updateSelected(ctx: CanvasRenderingContext2D) {
    const borderColor = this.isSelected
      ? TIMELINE_SELECTED_BORDER_COLOR
      : TIMELINE_UNSELECTED_BORDER_COLOR;
    const borderWidth = TIMELINE_BORDER_WIDTH;
    const innerRadius = 4;

    ctx.save();
    ctx.fillStyle = borderColor;

    // Create a path for the outer rectangle (no radius)
    ctx.beginPath();
    ctx.rect(-this.width / 2, -this.height / 2, this.width, this.height);

    // Create a path for the inner rectangle with rounded corners (the hole)
    ctx.roundRect(
      -this.width / 2 + borderWidth,
      -this.height / 2 + borderWidth,
      this.width - borderWidth * 2,
      this.height - borderWidth * 2,
      innerRadius,
    );

    // Use even-odd fill rule to create the border effect
    ctx.fill("evenodd");
    ctx.restore();
  }
}

export default HillAudioBars;
