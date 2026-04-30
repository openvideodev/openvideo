import { Control, FabricObject, util } from "fabric";
import Timeline from "../timeline";

export function drawVerticalLine(
  this: Control,
  ctx: CanvasRenderingContext2D,
  __: number,
  ___: number,
  _: {},
  fabricObject: FabricObject
) {
  const cSize = 12;
  const cSizeBy2 = cSize / 2;
  const canvas = fabricObject.canvas! as Timeline;
  if (!canvas) return;
  const vt = canvas.viewportTransform;
  ctx.save();
  if (this.controlOrientation === "left")
    ctx.translate(
      fabricObject.left + vt[4],
      fabricObject.top + vt[5] + fabricObject.height / 2
    );
  else
    ctx.translate(
      fabricObject.left + fabricObject.width + vt[4],
      fabricObject.top + vt[5] + fabricObject.height / 2
    );
  ctx.rotate(util.degreesToRadians(90 + fabricObject.angle));
  // Draw the yellow outline
  ctx.lineWidth = 6; // Total width for the outline (4 + 2)
  ctx.lineCap = "round";
  ctx.strokeStyle = "white"; // Yellow color for the outline
  ctx.beginPath();
  ctx.moveTo(-cSizeBy2, 0);
  ctx.lineTo(cSizeBy2, 0);
  ctx.stroke();

  // Draw the main line
  ctx.lineWidth = 4; // Width of the main line
  ctx.strokeStyle = "black"; // Color of the main line
  ctx.beginPath();
  ctx.moveTo(-cSizeBy2, 0);
  ctx.lineTo(cSizeBy2, 0);
  ctx.stroke();

  ctx.restore();
}
