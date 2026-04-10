"use client";

import React from "react";
import {
  BikeGeometry,
  AnalysisResults,
  VisualizationBounds,
  getScreenConversions,
  Point2D,
} from "@/lib/types";
import { overrideForkCompression } from "@/lib/kinematics";
import { GroundLine } from "./visualization/GroundLine";
import { FrontTriangle } from "./visualization/FrontTriangle";
import { Swingarm } from "./visualization/Swingarm";
import { Fork } from "./visualization/Fork";
import { Wheels } from "./visualization/Wheels";
import { Drivetrain } from "./visualization/Drivetrain";
import { Shock } from "./visualization/Shock";
import { Measurements } from "./visualization/Measurements";
import { Header } from "./visualization/Header";
import { CentreOfMass } from "./visualization/CentreOfMass";
import Calculations from "./visualization/Calculations";
import { AxlePath } from "./visualization/AxlePath";

type VisualizationProps = {
  geometry: BikeGeometry;
  analysisResults: AnalysisResults;
  axlePath?: Point2D[];
  travelPercentage: number; // 0-100, controls rear shock
  forkCompressionPercent?: number; // 0-100, overrides fork independently
  selectedGraph?: string;
  showCalculations?: boolean;
};

export function BikeVisualization({
  geometry,
  analysisResults,
  travelPercentage,
  forkCompressionPercent,
  selectedGraph,
  axlePath,
  showCalculations = false,
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
  const rawState =
    analysisResults.states[
      Math.max(0, Math.min(stateIndex, analysisResults.states.length - 1))
    ];

  // Override fork positions when an independent fork compression is provided
  const state =
    forkCompressionPercent !== undefined
      ? overrideForkCompression(
          rawState,
          (forkCompressionPercent / 100) * geometry.forkTravel,
          geometry,
        )
      : rawState;

  const rearAxleWorld = state.rearAxle.world;
  const frontAxleWorld = state.frontAxle.world;

  // Calculate canvas bounds
  const padding = 50;
  const scale = 0.275; // pixels per mm
  const minX = rearAxleWorld.x - geometry.rearWheelDiameter;
  const maxX = frontAxleWorld.x + geometry.frontWheelDiameter;
  const minY = 0;

  // TODO: Do this properly by finding the min/max of all components across all states, not just the CoM in the current state
  const maxY = geometry.comY + geometry.bbHeight;

  const bounds: VisualizationBounds = {
    minX,
    maxX,
    minY,
    maxY,
    padding,
    scale,
  };

  const screenConversions = getScreenConversions(bounds);
  const { width, height } = screenConversions;

  const drawProps = {
    geometry,
    state,
    conversion: screenConversions,
  };

  return (
    <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-black overflow-auto">
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

        <Header {...drawProps} />

        <GroundLine {...drawProps} />
        <FrontTriangle {...drawProps} />
        <Swingarm {...drawProps} />
        <Fork {...drawProps} />
        <Wheels {...drawProps} />
        <Drivetrain {...drawProps} />
        <Shock {...drawProps} />
        {axlePath && <AxlePath axlePath={axlePath} {...drawProps} />}
        <Measurements {...drawProps} />
        <CentreOfMass {...drawProps} />
        {showCalculations && selectedGraph && (
          <Calculations {...drawProps} selectedGraph={selectedGraph} />
        )}
      </svg>
    </div>
  );
}

type AnimationViewProps = Omit<VisualizationProps, "travelPercentage" | "forkCompressionPercent"> & {
  initialTravelPercentage: number;
  isAnimating: boolean;
  animationSpeed: number;
  /** Controlled: current fork compression percentage (0-100) */
  forkCompressionPercent: number;
  /** Controlled: whether fork and shock move together */
  coupled: boolean;
  onForkCompressionChange: (percent: number) => void;
  onCoupledChange: (coupled: boolean) => void;
};

export function AnimationView({
  initialTravelPercentage,
  isAnimating,
  animationSpeed,
  forkCompressionPercent,
  coupled,
  onForkCompressionChange,
  onCoupledChange,
  ...props
}: AnimationViewProps) {
  const axlePath = props.analysisResults.axlePath;
  // Shock position is kept local — it drives animation independently of fork
  const [shockPercent, setShockPercent] = React.useState(initialTravelPercentage);

  React.useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setShockPercent((prev) => {
        const next = prev + 0.5 * animationSpeed;
        return next > 100 ? 0 : next;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [isAnimating, animationSpeed]);

  const handleShockChange = (value: number) => {
    setShockPercent(value);
    if (coupled) onForkCompressionChange(value);
  };

  const handleCoupledChange = (checked: boolean) => {
    onCoupledChange(checked);
    if (!checked) {
      // Initialise fork at current shock position when uncoupling
      onForkCompressionChange(shockPercent);
    }
  };

  // When coupled, the visual fork follows shock; when uncoupled it follows the
  // controlled forkCompressionPercent.
  const effectiveForkPercent = coupled ? shockPercent : forkCompressionPercent;

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-black">
      <BikeVisualization
        travelPercentage={shockPercent}
        forkCompressionPercent={effectiveForkPercent}
        {...props}
        axlePath={axlePath}
      />
      <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Compression
          </span>
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={coupled}
              onChange={(e) => handleCoupledChange(e.target.checked)}
              className="w-4 h-4"
            />
            Couple fork &amp; shock
          </label>
        </div>

        {/* Shock slider */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-10 text-right">
            Shock
          </span>
          <input
            type="range"
            min="0"
            max="100"
            step="0.5"
            value={shockPercent}
            onChange={(e) => handleShockChange(parseFloat(e.target.value))}
            className="flex-1 h-2 bg-gray-300 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-sm font-mono text-gray-600 dark:text-gray-400 w-12 text-right">
            {shockPercent.toFixed(1)}%
          </span>
        </div>

        {/* Fork slider */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-10 text-right">
            Fork
          </span>
          <input
            type="range"
            min="0"
            max="100"
            step="0.5"
            value={forkCompressionPercent}
            onChange={(e) => onForkCompressionChange(parseFloat(e.target.value))}
            disabled={coupled}
            className="flex-1 h-2 bg-gray-300 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          />
          <span className="text-sm font-mono text-gray-600 dark:text-gray-400 w-12 text-right">
            {forkCompressionPercent.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}
