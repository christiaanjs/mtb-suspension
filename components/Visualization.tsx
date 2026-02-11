"use client";

import React from "react";
import {
  BikeGeometry,
  AnalysisResults,
  VisualizationBounds,
  getScreenConversions,
} from "@/lib/types";
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

  const rearAxleWorld = state.rearAxlePosition;
  const frontAxleWorld = state.frontAxlePosition;

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
        <Measurements {...drawProps} />
        <CentreOfMass {...drawProps} />
      </svg>
    </div>
  );
}

interface AnimationViewProps {
  geometry: BikeGeometry;
  analysisResults: AnalysisResults;
  initialTravelPercentage: number;
  isAnimating: boolean;
  animationSpeed: number;
}

export function AnimationView({
  geometry,
  analysisResults,
  initialTravelPercentage,
  isAnimating,
  animationSpeed,
}: AnimationViewProps) {
  const [animProgress, setAnimProgress] = React.useState(
    initialTravelPercentage,
  );

  React.useEffect(() => {
    if (!isAnimating) return;

    const interval = setInterval(() => {
      setAnimProgress((prev) => {
        const next = prev + 0.5 * animationSpeed;
        return next > 100 ? 0 : next;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isAnimating, animationSpeed]);

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
