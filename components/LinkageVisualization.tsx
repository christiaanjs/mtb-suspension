"use client";

import {
  BikeGeometry,
  AnalysisResults,
  VisualizationBounds,
  getScreenConversions,
  Point2D,
} from "@/lib/types";
import { Linkage } from "./visualization/Linkage";
import { Shock } from "./visualization/Shock";
import { AxlePath } from "./visualization/AxlePath";

type Props = {
  geometry: BikeGeometry;
  analysisResults: AnalysisResults;
  travelPercentage: number; // 0-100
};

// Collects the linkage-relevant points of a state in the displayed (pitched) frame.
function statePoints(state: AnalysisResults["states"][number]): Point2D[] {
  const pts: Point2D[] = [
    state.rearAxle.wheelsOnGround,
    state.swingarmEye.wheelsOnGround,
    state.shockFrameMount.wheelsOnGround,
    state.pivot.wheelsOnGround,
  ];
  if (state.fourBar) {
    pts.push(
      state.fourBar.mainPivot.wheelsOnGround,
      state.fourBar.rockerPivot.wheelsOnGround,
      state.fourBar.seatstayLower.wheelsOnGround,
      state.fourBar.seatstayUpper.wheelsOnGround,
    );
  }
  return pts;
}

export function LinkageVisualization({
  geometry,
  analysisResults,
  travelPercentage,
}: Props) {
  if (analysisResults.states.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <p className="text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  const stateIndex = Math.max(
    0,
    Math.min(
      Math.floor((travelPercentage / 100) * (analysisResults.states.length - 1)),
      analysisResults.states.length - 1,
    ),
  );
  const state = analysisResults.states[stateIndex];

  // Stable bounds across the whole sweep so the view doesn't jump while scrubbing.
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const s of analysisResults.states) {
    for (const p of statePoints(s)) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }
  }

  const padding = 50;
  const scale = 0.5; // larger than the full-bike view: we are zoomed on the linkage
  const bounds: VisualizationBounds = {
    minX,
    maxX,
    minY,
    maxY,
    padding,
    scale,
  };

  const conversion = getScreenConversions(bounds);
  const { width, height, toCanvasX, toCanvasY } = conversion;
  const drawProps = { geometry, state, conversion };

  const ic = state.pivot.wheelsOnGround;

  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-gray-950 overflow-hidden p-3 lg:p-4">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm"
      >
        <defs>
          <pattern
            id="linkage-grid"
            width={50 * scale}
            height={50 * scale}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${50 * scale} 0 L 0 0 0 ${50 * scale}`}
              fill="none"
              stroke="#9ca3af"
              strokeWidth="0.5"
              opacity="0.3"
            />
          </pattern>
        </defs>
        <rect width={width} height={height} fill="url(#linkage-grid)" />

        {/* Rear axle path trace */}
        <AxlePath axlePath={analysisResults.axlePath} {...drawProps} />

        <Linkage {...drawProps} />
        <Shock {...drawProps} />

        {/* Rear axle marker */}
        <circle
          cx={toCanvasX(state.rearAxle.wheelsOnGround.x)}
          cy={toCanvasY(state.rearAxle.wheelsOnGround.y)}
          r={5}
          fill="none"
          stroke="#2563eb"
          strokeWidth="1.5"
        />

        {/* Instant centre marker */}
        <circle
          cx={toCanvasX(ic.x)}
          cy={toCanvasY(ic.y)}
          r={4}
          fill="#16a34a"
        />
        <text
          x={toCanvasX(ic.x) + 8}
          y={toCanvasY(ic.y) - 6}
          fontSize="11"
          fill="#16a34a"
        >
          Instant centre
        </text>

        {/* Metric readout */}
        <text
          x={padding}
          y={26}
          fontSize="13"
          fontWeight="bold"
          fill="#1f2937"
          className="dark:fill-white"
        >
          Travel: {state.travelMM.toFixed(1)} mm | LR:{" "}
          {state.leverageRatio.toFixed(2)} | AS: {state.antiSquat.toFixed(0)}%
        </text>
      </svg>
    </div>
  );
}
