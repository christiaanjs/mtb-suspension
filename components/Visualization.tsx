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
  const scale = 0.275; // internal viewBox units per mm
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
    <div className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-gray-950 overflow-hidden p-3 lg:p-4">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm"
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
              stroke="#9ca3af"
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

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-2 text-[13px] text-gray-600 dark:text-gray-300 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only peer"
      />
      <span className="relative h-5 w-9 flex-shrink-0 rounded-full bg-gray-300 dark:bg-gray-700 transition-colors peer-checked:bg-blue-600 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500/60 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-4" />
      {label}
    </label>
  );
}

function SliderRow({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-11 flex-shrink-0 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
        {label}
      </span>
      <input
        type="range"
        min="0"
        max="100"
        step="0.5"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ "--p": `${value}%` } as React.CSSProperties}
        className="slider flex-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      />
      <span className="w-14 flex-shrink-0 text-right font-mono text-xs text-gray-600 dark:text-gray-300 tabular-nums">
        {value.toFixed(1)}%
      </span>
    </div>
  );
}

type AnimationViewProps = Omit<VisualizationProps, "travelPercentage" | "forkCompressionPercent"> & {
  isAnimating: boolean;
  animationSpeed: number;
  /** Controlled: current shock compression percentage (0-100) */
  shockPercent: number;
  /** Controlled: current fork compression percentage (0-100) */
  forkCompressionPercent: number;
  /** Controlled: whether fork and shock move together */
  coupled: boolean;
  onShockPercentChange: (percent: number) => void;
  onForkCompressionChange: (percent: number) => void;
  onCoupledChange: (coupled: boolean) => void;
};

export function AnimationView({
  isAnimating,
  animationSpeed,
  shockPercent,
  forkCompressionPercent,
  coupled,
  onShockPercentChange,
  onForkCompressionChange,
  onCoupledChange,
  showCalculations: initialShowCalculations = true,
  ...props
}: AnimationViewProps) {
  const axlePath = props.analysisResults.axlePath;
  const [showWorkingLines, setShowWorkingLines] = React.useState(initialShowCalculations);

  // Mirror the controlled value so the animation interval doesn't need to be
  // torn down and recreated on every tick.
  const shockPercentRef = React.useRef(shockPercent);
  React.useEffect(() => {
    shockPercentRef.current = shockPercent;
  }, [shockPercent]);

  React.useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      const next = shockPercentRef.current + 0.5 * animationSpeed;
      const value = next > 100 ? 0 : next;
      onShockPercentChange(value);
      if (coupled) onForkCompressionChange(value);
    }, 50);
    return () => clearInterval(interval);
  }, [
    isAnimating,
    animationSpeed,
    coupled,
    onShockPercentChange,
    onForkCompressionChange,
  ]);

  const handleShockChange = (value: number) => {
    onShockPercentChange(value);
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
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-950">
      <div className="flex-1 min-h-0">
        <BikeVisualization
          travelPercentage={shockPercent}
          forkCompressionPercent={effectiveForkPercent}
          {...props}
          axlePath={axlePath}
          showCalculations={showWorkingLines}
        />
      </div>
      <div className="px-4 py-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Compression
          </span>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <ToggleSwitch
              checked={showWorkingLines}
              onChange={setShowWorkingLines}
              label="Working lines"
            />
            <ToggleSwitch
              checked={coupled}
              onChange={handleCoupledChange}
              label="Couple fork & shock"
            />
          </div>
        </div>

        <SliderRow
          label="Shock"
          value={shockPercent}
          onChange={handleShockChange}
        />
        <SliderRow
          label="Fork"
          value={forkCompressionPercent}
          onChange={onForkCompressionChange}
          disabled={coupled}
        />
      </div>
    </div>
  );
}
