import { Control, controlsUtils } from "fabric";
import { changeWidth } from "../resize/common";
import { drawVerticalLine } from "./draw";
import { resizeTrimmable } from "../resize/trimmable";
import { resizeTransitionWidth } from "../resize/transition";
import { resizeTemplate } from "../resize/template";

const { scaleSkewCursorStyleHandler } = controlsUtils;

export const createResizeControls = () => ({
  mr: new Control({
    x: 0.5,
    y: 0,
    actionHandler: changeWidth,
    cursorStyleHandler: scaleSkewCursorStyleHandler,
    actionName: "resizing",
    render: drawVerticalLine,
    controlOrientation: "right",
  }),
  ml: new Control({
    x: -0.5,
    y: 0,
    actionHandler: changeWidth,
    cursorStyleHandler: scaleSkewCursorStyleHandler,
    actionName: "resizing",
    render: drawVerticalLine,
    controlOrientation: "left",
  }),
});

export const createTemplateControls = () => ({
  mr: new Control({
    x: 0.5,
    y: 0,
    render: drawVerticalLine,
    actionHandler: resizeTemplate,
    cursorStyleHandler: scaleSkewCursorStyleHandler,
    actionName: "resizing",
    controlOrientation: "right",
  }),
  ml: new Control({
    x: -0.5,
    y: 0,
    render: drawVerticalLine,
    actionHandler: resizeTemplate,
    cursorStyleHandler: scaleSkewCursorStyleHandler,
    actionName: "resizing",
    controlOrientation: "left",
  }),
});

export const createAudioControls = () => ({
  mr: new Control({
    x: 0.5,
    y: 0,
    render: drawVerticalLine,
    actionHandler: resizeTrimmable,
    cursorStyleHandler: scaleSkewCursorStyleHandler,
    actionName: "resizing",
    controlOrientation: "right",
  }),
  ml: new Control({
    x: -0.5,
    y: 0,
    render: drawVerticalLine,
    actionHandler: resizeTrimmable,
    cursorStyleHandler: scaleSkewCursorStyleHandler,
    actionName: "resizing",
    controlOrientation: "left",
  }),
});

export const createMediaControls = () => ({
  mr: new Control({
    x: 0.5,
    y: 0,
    render: drawVerticalLine,
    actionHandler: resizeTrimmable,
    cursorStyleHandler: scaleSkewCursorStyleHandler,
    actionName: "resizing",
    controlOrientation: "right",
  }),
  ml: new Control({
    x: -0.5,
    y: 0,
    render: drawVerticalLine,
    actionHandler: resizeTrimmable,
    cursorStyleHandler: scaleSkewCursorStyleHandler,
    actionName: "resizing",
    controlOrientation: "left",
  }),
});

export const createTransitionControls = () => ({
  mr: new Control({
    x: 0.5,
    y: 0,
    actionHandler: resizeTransitionWidth,
    cursorStyleHandler: scaleSkewCursorStyleHandler,
    actionName: "resizing",
    render: drawVerticalLine,
    controlOrientation: "right",
  }),
  ml: new Control({
    x: -0.5,
    y: 0,
    actionHandler: resizeTransitionWidth,
    cursorStyleHandler: scaleSkewCursorStyleHandler,
    actionName: "resizing",
    render: drawVerticalLine,
    controlOrientation: "left",
  }),
});
