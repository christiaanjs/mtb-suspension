"use client";

import React from "react";
import {
  BikeGeometry,
  AnalysisResults,
  computedProperties,
  Point2D,
} from "@/lib/types";

interface VisualizationProps {
  geometry: BikeGeometry;
  analysisResults: AnalysisResults;
  travelPercentage: number; // 0-100
}

export function BikeVisualization({
  geometry,
  analysisResults,
  travelPercentage,
}: VisualizationProps) {
  if (analysisResults.states.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <p className="text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  const stateIndex = Math.floor(
    (travelPercentage / 100) * (analysisResults.states.length - 1),
  );
  const state =
    analysisResults.states[
      Math.max(0, Math.min(stateIndex, analysisResults.states.length - 1))
    ];

  // Calculate canvas bounds
  const padding = 100;
  const scale = 0.3; // pixels per mm
  const minX = -100;
  const maxX = 2000;
  const minY = 0;
  const maxY = 1200;

  const width = (maxX - minX) * scale + padding * 2;
  const height = (maxY - minY) * scale + padding * 2;

  const toCanvasX = (x: number) => (x - minX) * scale + padding;
  const toCanvasY = (y: number) => height - ((y - minY) * scale + padding);

  // Get current positions
  const bbPos = state.bbPosition;
  const rearAxlePos = state.rearAxlePosition;
  const frontAxlePos = state.frontAxlePosition;
  const pivotPos = state.pivotPosition;
  const shockEyePos = state.swingarmEyePosition;

  const rearWheelRadius = computedProperties.rearWheelRadius(geometry);
  const frontWheelRadius = computedProperties.frontWheelRadius(geometry);

  // Head tube endpoints
  const htaRad = (geometry.headAngle * Math.PI) / 180.0;
  const htBottomX =
    bbPos.x + geometry.reach + geometry.headTubeLength * Math.cos(htaRad);
  const htBottomY =
    bbPos.y + geometry.stack - geometry.headTubeLength * Math.sin(htaRad);

  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-black overflow-auto">
      <svg
        width={width}
        height={height}
        className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 rounded"
      >
        {/* Grid */}
        <defs>
          <pattern
            id="grid"
            width={50 * scale}
            height={50 * scale}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${50 * scale} 0 L 0 0 0 ${50 * scale}`}
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="0.5"
              opacity="0.3"
            />
          </pattern>
        </defs>
        <rect width={width} height={height} fill="url(#grid)" />

        {/* Ground line */}
        <line
          x1={toCanvasX(minX)}
          y1={toCanvasY(rearWheelRadius)}
          x2={toCanvasX(maxX)}
          y2={toCanvasY(rearWheelRadius)}
          stroke="#999"
          strokeWidth="1"
          strokeDasharray="5,5"
          opacity="0.5"
        />

        {/* Frame rails */}
        <line
          x1={toCanvasX(bbPos.x)}
          y1={toCanvasY(bbPos.y)}
          x2={toCanvasX(bbPos.x + geometry.reach)}
          y2={toCanvasY(bbPos.y + geometry.stack)}
          stroke="#666"
          strokeWidth="3"
          opacity="0.3"
        />

        {/* Head tube */}
        <line
          x1={toCanvasX(bbPos.x + geometry.reach)}
          y1={toCanvasY(bbPos.y + geometry.stack)}
          x2={toCanvasX(htBottomX)}
          y2={toCanvasY(htBottomY)}
          stroke="#333"
          strokeWidth="4"
        />

        {/* Swingarm */}
        <line
          x1={toCanvasX(pivotPos.x)}
          y1={toCanvasY(pivotPos.y)}
          x2={toCanvasX(rearAxlePos.x)}
          y2={toCanvasY(rearAxlePos.y)}
          stroke="#2563eb"
          strokeWidth="4"
        />

        {/* Shock/spring */}
        <line
          x1={toCanvasX(geometry.shockFrameMountX)}
          y1={toCanvasY(bbPos.y + geometry.shockFrameMountY)}
          x2={toCanvasX(shockEyePos.x)}
          y2={toCanvasY(shockEyePos.y)}
          stroke="#dc2626"
          strokeWidth="3"
          opacity="0.8"
        />

        {/* Chain path (simplified) */}
        {geometry.chainringOffsetX !== undefined && (
          <>
            <circle
              cx={toCanvasX(bbPos.x + geometry.chainringOffsetX)}
              cy={toCanvasY(bbPos.y + geometry.chainringOffsetY)}
              r={3 * scale}
              fill="#ff6b6b"
              opacity="0.6"
            />
            <circle
              cx={toCanvasX(rearAxlePos.x)}
              cy={toCanvasY(rearAxlePos.y)}
              r={2 * scale}
              fill="#ff8787"
              opacity="0.6"
            />
          </>
        )}

        {/* Front wheel */}
        <circle
          cx={toCanvasX(frontAxlePos.x)}
          cy={toCanvasY(frontAxlePos.y)}
          r={frontWheelRadius * scale}
          fill="none"
          stroke="#1f2937"
          strokeWidth="2"
        />

        {/* Rear wheel */}
        <circle
          cx={toCanvasX(rearAxlePos.x)}
          cy={toCanvasY(rearAxlePos.y)}
          r={rearWheelRadius * scale}
          fill="none"
          stroke="#1f2937"
          strokeWidth="2"
        />

        {/* BB (bottom bracket) */}
        <circle
          cx={toCanvasX(bbPos.x)}
          cy={toCanvasY(bbPos.y)}
          r={5}
          fill="#10b981"
        />

        {/* Main pivot */}
        <circle
          cx={toCanvasX(pivotPos.x)}
          cy={toCanvasY(pivotPos.y)}
          r={5}
          fill="#3b82f6"
        />

        {/* Shock eye */}
        <circle
          cx={toCanvasX(shockEyePos.x)}
          cy={toCanvasY(shockEyePos.y)}
          r={4}
          fill="#ef4444"
        />

        {/* Head tube bottom */}
        <circle
          cx={toCanvasX(htBottomX)}
          cy={toCanvasY(htBottomY)}
          r={4}
          fill="#111"
        />

        {/* Center of Mass */}
        <circle
          cx={toCanvasX(bbPos.x + geometry.comX)}
          cy={toCanvasY(bbPos.y + geometry.comY)}
          r={3}
          fill="#f59e0b"
          opacity="0.7"
        />

        {/* Axle path (trace) */}
        {analysisResults.axlePath.length > 1 && (
          <polyline
            points={analysisResults.axlePath
              .map(
                (p) =>
                  `${toCanvasX(bbPos.x + p.x)},${toCanvasY(bbPos.y + p.y)}`,
              )
              .join(" ")}
            fill="none"
            stroke="#60a5fa"
            strokeWidth="1"
            opacity="0.3"
          />
        )}

        {/* Labels */}
        <text
          x={padding + 10}
          y={20}
          fontSize="14"
          fontWeight="bold"
          fill="#1f2937"
          className="dark:fill-white"
        >
          Travel: {state.travelMM.toFixed(1)} mm | LR:{" "}
          {state.leverageRatio.toFixed(2)} | AS: {state.antiSquat.toFixed(0)}% |
          AR: {state.antiRise.toFixed(0)}%
        </text>
      </svg>
    </div>
  );
}

interface AnimationViewProps {
  geometry: BikeGeometry;
  analysisResults: AnalysisResults;
  travelPercentage: number;
  onTravelChange: (percentage: number) => void;
  isAnimating: boolean;
  animationSpeed: number;
}

export function AnimationView({
  geometry,
  analysisResults,
  travelPercentage,
  onTravelChange,
  isAnimating,
  animationSpeed,
}: AnimationViewProps) {
  const [animProgress, setAnimProgress] = React.useState(0);

  React.useEffect(() => {
    if (!isAnimating) return;

    const interval = setInterval(() => {
      setAnimProgress((prev) => {
        const next = prev + 0.5 * animationSpeed;
        return next > 100 ? 0 : next;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isAnimating, animationSpeed, onTravelChange]);

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-black">
      <BikeVisualization
        geometry={geometry}
        analysisResults={analysisResults}
        travelPercentage={animProgress}
      />
      <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Travel
          </label>
          <input
            type="range"
            min="0"
            max="100"
            step="0.5"
            value={animProgress}
            onChange={(e) => setAnimProgress(parseFloat(e.target.value))}
            className="flex-1 h-2 bg-gray-300 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-sm font-mono text-gray-600 dark:text-gray-400 w-12">
            {animProgress.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}
