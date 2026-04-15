import React, { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { RotateCcw } from "lucide-react";
import useLayoutStore from "../../store/use-layout-store";
import { useStudioStore } from "@/stores/studio-store";

interface Point {
  x: number;
  y: number;
}

interface Curve {
  id: string;
  name: string;
  color: string;
  points: Point[];
}

interface CurvePreset {
  name: string;
  curves: Partial<Record<"rgb" | "red" | "green" | "blue", Point[]>>;
}

const CURVE_PRESETS: Record<string, CurvePreset> = {
  linear: {
    name: "Linear",
    curves: {
      rgb: [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ],
      red: [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ],
      green: [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ],
      blue: [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ],
    },
  },
  lighten: {
    name: "Lighten",
    curves: {
      rgb: [
        { x: 0, y: 0 },
        { x: 0.45, y: 0.7 },
        { x: 1, y: 1 },
      ],
      red: [
        { x: 0, y: 0 },
        { x: 0.5, y: 0.65 },
        { x: 1, y: 1 },
      ],
      green: [
        { x: 0, y: 0 },
        { x: 0.5, y: 0.72 },
        { x: 1, y: 1 },
      ],
      blue: [
        { x: 0, y: 0 },
        { x: 0.5, y: 0.75 },
        { x: 1, y: 1 },
      ],
    },
  },
  darken: {
    name: "Darken",
    curves: {
      rgb: [
        { x: 0, y: 0 },
        { x: 0.45, y: 0.3 },
        { x: 1, y: 1 },
      ],
      red: [
        { x: 0, y: 0 },
        { x: 0.5, y: 0.28 },
        { x: 1, y: 1 },
      ],
      green: [
        { x: 0, y: 0 },
        { x: 0.5, y: 0.33 },
        { x: 1, y: 1 },
      ],
      blue: [
        { x: 0, y: 0 },
        { x: 0.5, y: 0.25 },
        { x: 1, y: 1 },
      ],
    },
  },
  fade: {
    name: "Fade",
    curves: {
      rgb: [
        { x: 0, y: 0.2 },
        { x: 0.5, y: 0.5 },
        { x: 1, y: 0.8 },
      ],
      red: [
        { x: 0, y: 0.18 },
        { x: 0.5, y: 0.45 },
        { x: 1, y: 0.78 },
      ],
      green: [
        { x: 0, y: 0.22 },
        { x: 0.5, y: 0.52 },
        { x: 1, y: 0.82 },
      ],
      blue: [
        { x: 0, y: 0.24 },
        { x: 0.5, y: 0.55 },
        { x: 1, y: 0.85 },
      ],
    },
  },
  contrast: {
    name: "Contrast",
    curves: {
      rgb: [
        { x: 0, y: 0 },
        { x: 0.25, y: 0.1 },
        { x: 0.5, y: 0.55 },
        { x: 0.75, y: 0.9 },
        { x: 1, y: 1 },
      ],
      red: [
        { x: 0, y: 0 },
        { x: 0.3, y: 0.08 },
        { x: 0.55, y: 0.52 },
        { x: 0.8, y: 0.92 },
        { x: 1, y: 1 },
      ],
      green: [
        { x: 0, y: 0 },
        { x: 0.25, y: 0.12 },
        { x: 0.5, y: 0.55 },
        { x: 0.75, y: 0.88 },
        { x: 1, y: 1 },
      ],
      blue: [
        { x: 0, y: 0 },
        { x: 0.28, y: 0.1 },
        { x: 0.52, y: 0.54 },
        { x: 0.78, y: 0.9 },
        { x: 1, y: 1 },
      ],
    },
  },
  coolToWarm: {
    name: "Cool to Warm",
    curves: {
      rgb: [
        { x: 0, y: 0.3 },
        { x: 0.3, y: 0.4 },
        { x: 0.5, y: 0.5 },
        { x: 0.7, y: 0.6 },
        { x: 1, y: 0.7 },
      ],
      red: [
        { x: 0, y: 0.35 },
        { x: 0.5, y: 0.52 },
        { x: 1, y: 0.75 },
      ],
      green: [
        { x: 0, y: 0.28 },
        { x: 0.5, y: 0.5 },
        { x: 1, y: 0.68 },
      ],
      blue: [
        { x: 0, y: 0.25 },
        { x: 0.5, y: 0.48 },
        { x: 1, y: 0.7 },
      ],
    },
  },
  warmToCool: {
    name: "Warm to Cool",
    curves: {
      rgb: [
        { x: 0, y: 0.7 },
        { x: 0.3, y: 0.6 },
        { x: 0.5, y: 0.5 },
        { x: 0.7, y: 0.4 },
        { x: 1, y: 0.3 },
      ],
      red: [
        { x: 0, y: 0.75 },
        { x: 0.5, y: 0.55 },
        { x: 1, y: 0.35 },
      ],
      green: [
        { x: 0, y: 0.68 },
        { x: 0.5, y: 0.5 },
        { x: 1, y: 0.32 },
      ],
      blue: [
        { x: 0, y: 0.7 },
        { x: 0.5, y: 0.45 },
        { x: 1, y: 0.28 },
      ],
    },
  },
  vintage: {
    name: "Vintage",
    curves: {
      rgb: [
        { x: 0, y: 0.1 },
        { x: 0.2, y: 0.25 },
        { x: 0.5, y: 0.5 },
        { x: 0.8, y: 0.75 },
        { x: 1, y: 0.9 },
      ],
      red: [
        { x: 0, y: 0.08 },
        { x: 0.2, y: 0.22 },
        { x: 0.5, y: 0.5 },
        { x: 0.8, y: 0.72 },
        { x: 1, y: 0.88 },
      ],
      green: [
        { x: 0, y: 0.12 },
        { x: 0.2, y: 0.28 },
        { x: 0.5, y: 0.52 },
        { x: 0.8, y: 0.78 },
        { x: 1, y: 0.92 },
      ],
      blue: [
        { x: 0, y: 0.14 },
        { x: 0.2, y: 0.3 },
        { x: 0.5, y: 0.55 },
        { x: 0.8, y: 0.8 },
        { x: 1, y: 0.95 },
      ],
    },
  },
};

const AdjusmentCurves = () => {
  const { floatingControlData } = useLayoutStore();
  const { studio } = useStudioStore();
  const { clipId } = floatingControlData || {};
  const clip = studio?.getClipById(clipId) as any;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedCurve, setSelectedCurve] = useState<string>("rgb");
  const [draggingPoint, setDraggingPoint] = useState<{
    curveId: string;
    pointIndex: number;
  } | null>(null);

  const PADDING = 10;
  const CANVAS_SIZE = 200;
  const INNER_SIZE = CANVAS_SIZE - PADDING * 2;

  const [curves, setCurves] = useState<Curve[]>([
    {
      id: "rgb",
      name: "RGB",
      color: "#ffffff",
      points: [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ],
    },
    {
      id: "red",
      name: "Red",
      color: "#ef4444",
      points: [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ],
    },
    {
      id: "green",
      name: "Green",
      color: "#22c55e",
      points: [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ],
    },
    {
      id: "blue",
      name: "Blue",
      color: "#3b82f6",
      points: [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ],
    },
  ]);

  useEffect(() => {
    if (!clip?.colorAdjustment?.curves) return;
    setCurves((prev) =>
      prev.map((curve) => {
        const incoming =
          clip.colorAdjustment.curves[curve.id as "rgb" | "red" | "green" | "blue"] ??
          curve.points;
        if (JSON.stringify(incoming) === JSON.stringify(curve.points)) {
          return curve;
        }
        return {
          ...curve,
          points: incoming,
        };
      }),
    );
  }, [clip?.colorAdjustment?.curves]);

  useEffect(() => {
    if (!clip) return;
    const nextCurves = curves.reduce(
      (acc, curve) => {
        acc[curve.id as "rgb" | "red" | "green" | "blue"] = curve.points;
        return acc;
      },
      {} as Record<"rgb" | "red" | "green" | "blue", Point[]>,
    );
    if (JSON.stringify(nextCurves) === JSON.stringify(clip?.colorAdjustment?.curves)) return;
    clip.update({
      colorAdjustment: {
        enabled: true,
        type: "curves",
        basic: clip?.colorAdjustment?.basic,
        hsl: clip?.colorAdjustment?.hsl,
        curves: nextCurves,
      },
    });
  }, [clip, curves]);

  const toCanvasCoords = useCallback(
    (x: number, y: number) => {
      return {
        x: PADDING + x * INNER_SIZE,
        y: PADDING + (1 - y) * INNER_SIZE,
      };
    },
    [INNER_SIZE],
  );

  const toNormalizedCoords = useCallback(
    (canvasX: number, canvasY: number) => {
      const x = Math.min(1, Math.max(0, (canvasX - PADDING) / INNER_SIZE));
      const y = Math.min(1, Math.max(0, 1 - (canvasY - PADDING) / INNER_SIZE));
      return { x, y };
    },
    [INNER_SIZE],
  );

  const applyPreset = useCallback((presetKey: string) => {
    const preset = CURVE_PRESETS[presetKey];
    if (!preset) return;

    setCurves((prev) =>
      prev.map((curve) => {
        const presetPoints =
          preset.curves[curve.id as keyof typeof preset.curves];
        if (presetPoints) {
          return {
            ...curve,
            points: [...presetPoints],
          };
        }
        return curve;
      }),
    );
  }, []);

  const getCurvePoints = useCallback((points: Point[]) => {
    if (points.length < 2) return [];

    const sortedPoints = [...points].sort((a, b) => a.x - b.x);

    let finalPoints = [...sortedPoints];
    if (finalPoints[0].x > 0) finalPoints.unshift({ x: 0, y: 0 });
    if (finalPoints[finalPoints.length - 1].x < 1)
      finalPoints.push({ x: 1, y: 1 });

    return finalPoints;
  }, []);

  const interpolateCurve = useCallback((points: Point[], x: number) => {
    if (points.length < 2) return x;

    const sortedPoints = [...points].sort((a, b) => a.x - b.x);

    if (sortedPoints.length === 2) {
      const [p1, p2] = sortedPoints;
      if (p2.x === p1.x) return p1.y;
      const t = (x - p1.x) / (p2.x - p1.x);
      return p1.y + t * (p2.y - p1.y);
    }

    const extended = [...sortedPoints];
    if (extended[0].x > 0) extended.unshift({ x: 0, y: 0 });
    if (extended[extended.length - 1].x < 1) extended.push({ x: 1, y: 1 });

    for (let i = 0; i < extended.length - 1; i++) {
      const p0 = i === 0 ? extended[i] : extended[i - 1];
      const p1 = extended[i];
      const p2 = extended[i + 1];
      const p3 = i + 2 < extended.length ? extended[i + 2] : p2;

      if (x >= p1.x && x <= p2.x) {
        const t = (x - p1.x) / (p2.x - p1.x);
        const t2 = t * t;
        const t3 = t2 * t;

        const m1 = ((p2.y - p0.y) / (p2.x - p0.x || 1)) * 0.5;
        const m2 = ((p3.y - p1.y) / (p3.x - p1.x || 1)) * 0.5;

        const h00 = 2 * t3 - 3 * t2 + 1;
        const h10 = t3 - 2 * t2 + t;
        const h01 = -2 * t3 + 3 * t2;
        const h11 = t3 - t2;

        return (
          h00 * p1.y +
          h10 * m1 * (p2.x - p1.x) +
          h01 * p2.y +
          h11 * m2 * (p2.x - p1.x)
        );
      }
    }

    return x;
  }, []);

  const drawCurvePath = useCallback(
    (ctx: CanvasRenderingContext2D, points: Point[]) => {
      const finalPoints = getCurvePoints(points);
      if (finalPoints.length < 2) return;

      const firstCoords = toCanvasCoords(finalPoints[0].x, finalPoints[0].y);
      ctx.moveTo(firstCoords.x, firstCoords.y);

      if (finalPoints.length === 2) {
        const second = toCanvasCoords(finalPoints[1].x, finalPoints[1].y);
        ctx.lineTo(second.x, second.y);
        return;
      }

      for (let i = 0; i < finalPoints.length - 1; i++) {
        const p0 = i === 0 ? finalPoints[i] : finalPoints[i - 1];
        const p1 = finalPoints[i];
        const p2 = finalPoints[i + 1];
        const p3 = i + 2 < finalPoints.length ? finalPoints[i + 2] : p2;

        const cp1 = {
          x: p1.x + (p2.x - p0.x) / 6,
          y: p1.y + (p2.y - p0.y) / 6,
        };
        const cp2 = {
          x: p2.x - (p3.x - p1.x) / 6,
          y: p2.y - (p3.y - p1.y) / 6,
        };

        const cp1Coords = toCanvasCoords(cp1.x, cp1.y);
        const cp2Coords = toCanvasCoords(cp2.x, cp2.y);
        const p2Coords = toCanvasCoords(p2.x, p2.y);

        ctx.bezierCurveTo(
          cp1Coords.x,
          cp1Coords.y,
          cp2Coords.x,
          cp2Coords.y,
          p2Coords.x,
          p2Coords.y,
        );
      }
    },
    [getCurvePoints, toCanvasCoords],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "#111111";
    ctx.fillRect(PADDING, PADDING, INNER_SIZE, INNER_SIZE);

    ctx.strokeStyle = "#2a2a2a";
    ctx.lineWidth = 1;

    const gridSteps = 8;
    for (let i = 0; i <= gridSteps; i++) {
      const pos = PADDING + (i / gridSteps) * INNER_SIZE;

      ctx.beginPath();
      ctx.moveTo(pos, PADDING);
      ctx.lineTo(pos, PADDING + INNER_SIZE);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(PADDING, pos);
      ctx.lineTo(PADDING + INNER_SIZE, pos);
      ctx.stroke();
    }

    ctx.strokeStyle = "#555555";
    ctx.lineWidth = 2;
    ctx.strokeRect(PADDING, PADDING, INNER_SIZE, INNER_SIZE);

    ctx.beginPath();
    ctx.moveTo(PADDING, PADDING + INNER_SIZE);
    ctx.lineTo(PADDING + INNER_SIZE, PADDING);
    ctx.strokeStyle = "#333333";
    ctx.lineWidth = 1;
    ctx.stroke();

    curves.forEach((curve) => {
      const points = getCurvePoints(curve.points);
      if (points.length < 2) return;

      ctx.beginPath();
      ctx.strokeStyle = curve.color;
      ctx.lineWidth = curve.id === selectedCurve ? 3 : 1.5;

      drawCurvePath(ctx, curve.points);
      ctx.stroke();

      if (curve.id === selectedCurve) {
        points.forEach((point) => {
          const canvasCoords = toCanvasCoords(point.x, point.y);

          ctx.beginPath();
          ctx.fillStyle = curve.color;
          ctx.arc(canvasCoords.x, canvasCoords.y, 6, 0, 2 * Math.PI);
          ctx.fill();
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.beginPath();
          ctx.fillStyle = "#ffffff";
          ctx.arc(canvasCoords.x, canvasCoords.y, 2, 0, 2 * Math.PI);
          ctx.fill();
        });
      }
    });
  }, [
    curves,
    selectedCurve,
    getCurvePoints,
    interpolateCurve,
    toCanvasCoords,
    INNER_SIZE,
    PADDING,
  ]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      const mouseX = (e.clientX - rect.left) * scaleX;
      const mouseY = (e.clientY - rect.top) * scaleY;

      if (
        mouseX < PADDING ||
        mouseX > PADDING + INNER_SIZE ||
        mouseY < PADDING ||
        mouseY > PADDING + INNER_SIZE
      ) {
        return;
      }

      const currentCurve = curves.find((c) => c.id === selectedCurve);
      if (!currentCurve) return;

      const points = getCurvePoints(currentCurve.points);

      for (let i = 0; i < points.length; i++) {
        const point = points[i];
        const canvasCoords = toCanvasCoords(point.x, point.y);

        const distance = Math.hypot(
          mouseX - canvasCoords.x,
          mouseY - canvasCoords.y,
        );
        if (distance < 10) {
          setDraggingPoint({ curveId: selectedCurve, pointIndex: i });
          return;
        }
      }

      const { x, y } = toNormalizedCoords(mouseX, mouseY);

      if (x > 0.05 && x < 0.95 && y > 0.05 && y < 0.95) {
        const existsNear = currentCurve.points.some(
          (p) => Math.abs(p.x - x) < 0.03,
        );
        if (!existsNear) {
          setCurves((prev) =>
            prev.map((curve) => {
              if (curve.id === selectedCurve) {
                const newPoints = [...curve.points, { x, y }];
                newPoints.sort((a, b) => a.x - b.x);
                return { ...curve, points: newPoints };
              }
              return curve;
            }),
          );
        }
      }
    },
    [
      selectedCurve,
      curves,
      getCurvePoints,
      toCanvasCoords,
      toNormalizedCoords,
      INNER_SIZE,
      PADDING,
    ],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!draggingPoint) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      const mouseX = (e.clientX - rect.left) * scaleX;
      const mouseY = (e.clientY - rect.top) * scaleY;

      if (
        mouseX < PADDING ||
        mouseX > PADDING + INNER_SIZE ||
        mouseY < PADDING ||
        mouseY > PADDING + INNER_SIZE
      ) {
        return;
      }

      let { x, y } = toNormalizedCoords(mouseX, mouseY);

      x = Math.min(0.95, Math.max(0.05, x));
      y = Math.min(0.95, Math.max(0.05, y));

      setCurves((prev) =>
        prev.map((curve) => {
          if (curve.id === draggingPoint.curveId) {
            const newPoints = [...curve.points];
            const points = getCurvePoints(newPoints);

            let originalIndex = -1;
            for (let i = 0; i < newPoints.length; i++) {
              if (
                Math.abs(newPoints[i].x - points[draggingPoint.pointIndex].x) <
                  0.001 &&
                Math.abs(newPoints[i].y - points[draggingPoint.pointIndex].y) <
                  0.001
              ) {
                originalIndex = i;
                break;
              }
            }

            if (
              originalIndex !== -1 &&
              newPoints[originalIndex].x !== 0 &&
              newPoints[originalIndex].x !== 1
            ) {
              newPoints[originalIndex] = { x, y };
              newPoints.sort((a, b) => a.x - b.x);
              return { ...curve, points: newPoints };
            }
          }
          return curve;
        }),
      );
    },
    [draggingPoint, getCurvePoints, toNormalizedCoords, INNER_SIZE, PADDING],
  );

  const handleMouseUp = useCallback(() => {
    setDraggingPoint(null);
  }, []);

  const resetCurve = useCallback(() => {
    setCurves((prev) =>
      prev.map((curve) => {
        if (curve.id === selectedCurve) {
          return {
            ...curve,
            points: [
              { x: 0, y: 0 },
              { x: 1, y: 1 },
            ],
          };
        }
        return curve;
      }),
    );
  }, [selectedCurve]);

  const deleteSelectedPoint = useCallback(() => {
    const currentCurve = curves.find((c) => c.id === selectedCurve);
    if (!currentCurve) return;

    if (currentCurve.points.length <= 2) return;

    setCurves((prev) =>
      prev.map((curve) => {
        if (curve.id === selectedCurve) {
          let pointToDelete = -1;
          let maxDistanceFromExtremes = -1;

          curve.points.forEach((point, idx) => {
            const distFromExtremes = Math.min(point.x, 1 - point.x);
            if (
              distFromExtremes > maxDistanceFromExtremes &&
              point.x > 0.05 &&
              point.x < 0.95
            ) {
              maxDistanceFromExtremes = distFromExtremes;
              pointToDelete = idx;
            }
          });

          if (pointToDelete !== -1) {
            const newPoints = curve.points.filter(
              (_, idx) => idx !== pointToDelete,
            );
            return { ...curve, points: newPoints };
          }
        }
        return curve;
      }),
    );
  }, [selectedCurve, curves]);

  return (
    <ScrollArea className="max-h-[500px] w-full">
      <div className="p-4">
        {/* Presets Section */}
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Presets
            </label>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {Object.entries(CURVE_PRESETS).map(([key, preset]) => (
              <button
                key={key}
                onClick={() => applyPreset(key)}
                className="rounded-md bg-input/30 px-2 py-2 text-left text-[10px] text-muted-foreground transition-colors hover:bg-input/50 focus:bg-input/50 focus:border focus:border-primary data-[state=open]:bg-input/50"
              >
                <div className="font-semibold text-white">{preset.name}</div>
                <div className="mt-1 text-[9px] text-muted-foreground">
                  {Object.keys(preset.curves)
                    .map((id) => id.toUpperCase())
                    .join(" + ")}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Canvas para curvas */}
        <div className="flex justify-center">
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            className="cursor-crosshair rounded-lg border border-gray-800"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
        </div>

        {/* Selector de canales */}
        <div className="mt-4">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            RGB curves
          </label>
          <div className="mt-2 flex gap-2">
            {curves.map((curve) => (
              <button
                key={curve.id}
                onClick={() => setSelectedCurve(curve.id)}
                className={`px-3 py-1 text-xs rounded-md transition-all ${
                  selectedCurve === curve.id
                    ? "bg-input/50 text-white border border-primary"
                    : "bg-input/30 text-muted-foreground hover:bg-input/50"
                }`}
              >
                <span className="flex items-center gap-1 text-[10px]">
                  <span
                    className="h-2 w-2 rounded-full "
                    style={{ backgroundColor: curve.color }}
                  />
                  {curve.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Controles */}
        <Separator className="my-4" />

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={resetCurve}
            className="h-7 text-[10px] border-gray-700 bg-gray-900 hover:bg-gray-800"
          >
            <RotateCcw className="mr-1 h-3 w-3" />
            Reset
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const currentCurve = curves.find((c) => c.id === selectedCurve);
              if (currentCurve && currentCurve.points.length < 8) {
                setCurves((prev) =>
                  prev.map((curve) => {
                    if (curve.id === selectedCurve) {
                      // Añadir punto en el centro
                      const newPoints = [...curve.points, { x: 0.5, y: 0.5 }];
                      newPoints.sort((a, b) => a.x - b.x);
                      return { ...curve, points: newPoints };
                    }
                    return curve;
                  }),
                );
              }
            }}
            className="h-7 text-[10px] border-gray-700 bg-gray-900 hover:bg-gray-800"
          >
            Add point
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={deleteSelectedPoint}
            className="h-7 text-[10px] border-gray-700 bg-gray-900 hover:bg-gray-800"
          >
            Remove point
          </Button>
        </div>
      </div>
    </ScrollArea>
  );
};

export default AdjusmentCurves;
