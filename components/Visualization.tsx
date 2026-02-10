"use client";

import React from "react";
import {
  BikeGeometry,
  AnalysisResults,
  computedProperties,
  IdlerType,
  Point2D,
} from "@/lib/types";
import { sprocketRadius, tangentPoints } from "@/lib/geometry";

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
  const scale = 0.3; // pixels per mm
  const minX = rearAxleWorld.x - geometry.rearWheelDiameter;
  const maxX = frontAxleWorld.x + geometry.frontWheelDiameter;
  const minY = 0;
  const maxY = 1200;

  const width = (maxX - minX) * scale + padding * 2;
  const height = (maxY - minY) * scale + padding * 2;

  const toCanvasX = (x: number) => (x - minX) * scale + padding;
  const toCanvasY = (y: number) => height - ((y - minY) * scale + padding);

  // Pitch rotation helper - apply rotation around rear axle
  const pitchRad = state.pitchAngleDegrees * (Math.PI / 180);

  const applyPitchRotation = (point: { x: number; y: number }) => {
    const dx = point.x - rearAxleWorld.x;
    const dy = point.y - rearAxleWorld.y;
    const cosA = Math.cos(-pitchRad);
    const sinA = Math.sin(-pitchRad);
    return {
      x: rearAxleWorld.x + dx * cosA - dy * sinA,
      y: rearAxleWorld.y + dx * sinA + dy * cosA,
    };
  };

  // Get current positions (world coordinates)
  const bbPos = state.bbPosition;
  const rearAxlePos = state.rearAxlePosition;
  const pivotPos = state.pivotPosition;
  const shockEyePos = state.swingarmEyePosition;

  const rearWheelRadius = computedProperties.rearWheelRadius(geometry);
  const frontWheelRadius = computedProperties.frontWheelRadius(geometry);

  // Head tube geometry - calculate with fork compression adjustment
  const htaRad = geometry.headAngle * (Math.PI / 180);
  const htTopWorldX = bbPos.x + geometry.reach;
  const htTopWorldY = bbPos.y + geometry.stack;
  const cosHT = Math.cos(htaRad);
  const sinHT = Math.sin(htaRad);
  const htBottomWorldX = htTopWorldX + geometry.headTubeLength * cosHT;
  const htBottomWorldY = htTopWorldY - geometry.headTubeLength * sinHT;

  // Fork length reduced by compression
  const effectiveForkLength = geometry.forkLength - state.forkCompression;
  const frontAxleCalculatedX =
    htBottomWorldX + effectiveForkLength * cosHT + geometry.forkOffset * sinHT;
  const frontAxleCalculatedY =
    htBottomWorldY - effectiveForkLength * sinHT + geometry.forkOffset * cosHT;

  // Apply pitch rotation to all coordinates
  const bbPosRotated = applyPitchRotation(bbPos);
  const rearAxlePosRotated = rearAxlePos; // No rotation needed - it's the pivot point
  const frontAxleRotated = applyPitchRotation({
    x: frontAxleCalculatedX,
    y: frontAxleCalculatedY,
  });
  const htTopRotated = applyPitchRotation({ x: htTopWorldX, y: htTopWorldY });
  const htBottomRotated = applyPitchRotation({
    x: htBottomWorldX,
    y: htBottomWorldY,
  });
  const pivotPosRotated = applyPitchRotation(pivotPos);
  const shockEyePosRotated = applyPitchRotation(shockEyePos);
  const comRotated = applyPitchRotation({
    x: bbPos.x + geometry.comX,
    y: bbPos.y + geometry.comY,
  });

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

        {/* Calculate frame tube endpoints */}
        {(() => {
          const seatAngleRad = geometry.seatAngle * (Math.PI / 180);
          const seatTopWorldX =
            bbPos.x - geometry.seatTubeLength * Math.cos(seatAngleRad);
          const seatTopWorldY =
            bbPos.y + geometry.seatTubeLength * Math.sin(seatAngleRad);
          const seatTopRotated = applyPitchRotation({
            x: seatTopWorldX,
            y: seatTopWorldY,
          });

          // Downtube junction (20mm above head tube bottom in world coords)
          const downtubeJunctionY = htBottomWorldY + 20;
          const downtubeJunctionWorldX = htBottomWorldX;
          const downtubeJunctionRotated = applyPitchRotation({
            x: downtubeJunctionWorldX,
            y: downtubeJunctionY,
          });

          return (
            <>
              {/* Downtube - BB to head tube junction */}
              <line
                x1={toCanvasX(bbPosRotated.x)}
                y1={toCanvasY(bbPosRotated.y)}
                x2={toCanvasX(downtubeJunctionRotated.x)}
                y2={toCanvasY(downtubeJunctionRotated.y)}
                stroke="#2563eb"
                strokeWidth="2.67"
              />

              {/* Head tube */}
              <line
                x1={toCanvasX(htBottomRotated.x)}
                y1={toCanvasY(htBottomRotated.y)}
                x2={toCanvasX(htTopRotated.x)}
                y2={toCanvasY(htTopRotated.y)}
                stroke="#2563eb"
                strokeWidth="2.67"
              />

              {/* Seat tube - BB to seat top */}
              <line
                x1={toCanvasX(bbPosRotated.x)}
                y1={toCanvasY(bbPosRotated.y)}
                x2={toCanvasX(seatTopRotated.x)}
                y2={toCanvasY(seatTopRotated.y)}
                stroke="#2563eb"
                strokeWidth="2.67"
              />

              {/* Top tube - head tube top to seat top */}
              <line
                x1={toCanvasX(htTopRotated.x)}
                y1={toCanvasY(htTopRotated.y)}
                x2={toCanvasX(seatTopRotated.x)}
                y2={toCanvasY(seatTopRotated.y)}
                stroke="#2563eb"
                strokeWidth="1.33"
              />
            </>
          );
        })()}

        {/* Fork stanchions and lower legs */}
        {(() => {
          // Fork bend point (end of stanchions along steering axis)
          const forkBendWorldX = htBottomWorldX + effectiveForkLength * cosHT;
          const forkBendWorldY = htBottomWorldY - effectiveForkLength * sinHT;
          const forkBendRotated = applyPitchRotation({
            x: forkBendWorldX,
            y: forkBendWorldY,
          });

          return (
            <>
              {/* Fork stanchions */}
              <line
                x1={toCanvasX(htBottomRotated.x)}
                y1={toCanvasY(htBottomRotated.y)}
                x2={toCanvasX(forkBendRotated.x)}
                y2={toCanvasY(forkBendRotated.y)}
                stroke="#22c55e"
                strokeWidth="2.67"
              />

              {/* Fork lower legs */}
              <line
                x1={toCanvasX(forkBendRotated.x)}
                y1={toCanvasY(forkBendRotated.y)}
                x2={toCanvasX(frontAxleRotated.x)}
                y2={toCanvasY(frontAxleRotated.y)}
                stroke="#22c55e"
                strokeWidth="2.67"
              />
            </>
          );
        })()}

        {/* Swingarm triangle - pivot, eye, axle (orange) */}
        {(() => {
          const frameMountRotated = applyPitchRotation({
            x: bbPos.x + geometry.shockFrameMountX,
            y: bbPos.y + geometry.shockFrameMountY,
          });

          return (
            <>
              {/* Swingarm outline - pivot to eye to axle */}
              <polyline
                points={`${toCanvasX(pivotPosRotated.x)},${toCanvasY(pivotPosRotated.y)} ${toCanvasX(shockEyePosRotated.x)},${toCanvasY(shockEyePosRotated.y)} ${toCanvasX(rearAxlePosRotated.x)},${toCanvasY(rearAxlePosRotated.y)} ${toCanvasX(pivotPosRotated.x)},${toCanvasY(pivotPosRotated.y)}`}
                fill="none"
                stroke="#f97316"
                strokeWidth="1.33"
              />

              {/* Shock linkage - frame mount to eye */}
              <line
                x1={toCanvasX(frameMountRotated.x)}
                y1={toCanvasY(frameMountRotated.y)}
                x2={toCanvasX(shockEyePosRotated.x)}
                y2={toCanvasY(shockEyePosRotated.y)}
                stroke="#ef4444"
                strokeWidth="1.33"
              />

              {/* Shock mount points - eyes */}
              <circle
                cx={toCanvasX(frameMountRotated.x)}
                cy={toCanvasY(frameMountRotated.y)}
                r={5}
                fill="#ef4444"
              />
              <circle
                cx={toCanvasX(shockEyePosRotated.x)}
                cy={toCanvasY(shockEyePosRotated.y)}
                r={5}
                fill="#ef4444"
              />

              {/* Pivot point - hollow yellow circle */}
              <circle
                cx={toCanvasX(pivotPosRotated.x)}
                cy={toCanvasY(pivotPosRotated.y)}
                r={6}
                fill="none"
                stroke="#eab308"
                strokeWidth="1.33"
              />
            </>
          );
        })()}

        {/* Front wheel */}
        <circle
          cx={toCanvasX(frontAxleRotated.x)}
          cy={toCanvasY(frontAxleRotated.y)}
          r={frontWheelRadius * scale}
          fill="none"
          stroke="#1f2937"
          strokeWidth="2"
        />

        {/* Rear wheel */}
        <circle
          cx={toCanvasX(rearAxlePosRotated.x)}
          cy={toCanvasY(rearAxlePosRotated.y)}
          r={rearWheelRadius * scale}
          fill="none"
          stroke="#1f2937"
          strokeWidth="2"
        />

        {/* Drivetrain - Chainring, Cog, and Chain */}
        {(() => {
          const chainringPos = {
            x: bbPos.x + geometry.chainringOffsetX,
            y: bbPos.y + geometry.chainringOffsetY,
          };
          const chainringRotated = applyPitchRotation(chainringPos);
          const cogRotated = rearAxlePosRotated;
          const chainringRadius = sprocketRadius(geometry.chainringTeeth);
          const cogRadius = sprocketRadius(geometry.cogTeeth);

          const chainringRadiusScreen = chainringRadius * scale;
          const cogRadiusScreen = cogRadius * scale;

          const chainSegments: { start: Point2D; end: Point2D }[] = [];

          let idlerRotated: Point2D | null = null;
          let idlerRadiusScreen = 0;

          if (geometry.idlerType === IdlerType.None) {
            // Chainring to cog
            const tangents = tangentPoints(
              chainringRotated,
              chainringRadius,
              cogRotated,
              cogRadius,
            );
            chainSegments.push(tangents)
          } else {
            if (geometry.idlerType === IdlerType.FrameMounted) {
            // Idler to cog
            const idlerPos = {
              x: bbPos.x + geometry.idlerX,
              y: bbPos.y + geometry.idlerY,
            };
            idlerRotated = applyPitchRotation(idlerPos);
          } else {
            // Swingarm-mounted idler: chainring to idler
            const topOutIdlerX = geometry.idlerX - geometry.bbToPivotX;
            const topOutIdlerY =
              geometry.bbHeight +
              geometry.idlerY -
              (geometry.bbHeight + geometry.bbToPivotY);
            const topOutPivot = {
              x: geometry.bbToPivotX,
              y: geometry.bbHeight + geometry.bbToPivotY,
            };
            const topOutVertDist =
              geometry.rearWheelDiameter / 2 - topOutPivot.y;
            const topOutHorizDist = Math.sqrt(
              geometry.swingarmLength * geometry.swingarmLength -
                topOutVertDist * topOutVertDist,
            );
            const topOutSwingarmAngle = Math.atan2(
              0 - topOutPivot.y,
              topOutPivot.x - topOutHorizDist - topOutPivot.x,
            );
            const currentSwingarmAngle = Math.atan2(
              pivotPos.y - state.rearAxlePosition.y,
              pivotPos.x - state.rearAxlePosition.x,
            );
            const rotationAngle = currentSwingarmAngle - topOutSwingarmAngle;
            const rotatedOffsetX =
              topOutIdlerX * Math.cos(rotationAngle) -
              topOutIdlerY * Math.sin(rotationAngle);
            const rotatedOffsetY =
              topOutIdlerX * Math.sin(rotationAngle) +
              topOutIdlerY * Math.cos(rotationAngle);
            const idlerPos = {
              x: pivotPos.x + rotatedOffsetX,
              y: pivotPos.y + rotatedOffsetY,
            };
            idlerRotated = applyPitchRotation(idlerPos);
          }

            const idlerRadius = sprocketRadius(geometry.idlerTeeth);
            idlerRadiusScreen = idlerRadius * scale;

            const cogToIdler = tangentPoints(
              idlerRotated,
              idlerRadius,
              cogRotated,
              cogRadius,
            );
            chainSegments.push(cogToIdler)

            const chainringToIdler = tangentPoints(
              chainringRotated,
              chainringRadius,
              idlerRotated,
              idlerRadius,
            );
            chainSegments.push(chainringToIdler)
          }

          return (
            <>
              {/* Chainring */}
              <circle
                cx={toCanvasX(chainringRotated.x)}
                cy={toCanvasY(chainringRotated.y)}
                r={chainringRadiusScreen}
                fill="none"
                stroke="#eab308"
                strokeWidth="1.33"
              />
              {/* Cog */}
              <circle
                cx={toCanvasX(cogRotated.x)}
                cy={toCanvasY(cogRotated.y)}
                r={cogRadiusScreen}
                fill="none"
                stroke="#eab308"
                strokeWidth="1.33"
              />
              {/* Idler pulley (if present) */}
              {idlerRotated && (
                <circle
                  cx={toCanvasX(idlerRotated.x)}
                  cy={toCanvasY(idlerRotated.y)}
                  r={idlerRadiusScreen}
                  fill="none"
                  stroke="#f97316"
                  strokeWidth="1.33"
                />
              )}
              {/* Chainline */}
              {chainSegments.map((segment, index) => <line
                x1={toCanvasX(segment.start.x)}
                y1={toCanvasY(segment.start.y)}
                x2={toCanvasX(segment.end.x)}
                y2={toCanvasY(segment.end.y)}
                stroke="#eab308"
                strokeWidth="2"
                opacity="0.9"
                key={index}
              />)}
              
              {/* Crank arm and pedal */}
              {(() => {
                const crankLength = 165.0; // 165mm standard crank
                const crankAngleRad = state.crankAngle * (Math.PI / 180);
                const crankEndWorld = {
                  x: chainringPos.x + crankLength * Math.cos(crankAngleRad),
                  y: chainringPos.y - crankLength * Math.sin(crankAngleRad),
                };
                const crankEndRotated = applyPitchRotation(crankEndWorld);
                return (
                  <>
                    {/* Crank arm */}
                    <line
                      x1={toCanvasX(chainringRotated.x)}
                      y1={toCanvasY(chainringRotated.y)}
                      x2={toCanvasX(crankEndRotated.x)}
                      y2={toCanvasY(crankEndRotated.y)}
                      stroke="#6b7280"
                      strokeWidth="2.67"
                    />

                    {/* Pedal */}
                    <circle
                      cx={toCanvasX(crankEndRotated.x)}
                      cy={toCanvasY(crankEndRotated.y)}
                      r={5}
                      fill="#f5f5f5"
                    />
                  </>
                );
              })()}
            </>
          )
        })()}

        {/* BB (bottom bracket) */}
        <circle
          cx={toCanvasX(bbPosRotated.x)}
          cy={toCanvasY(bbPosRotated.y)}
          r={4}
          fill="#06b6d4"
        />

        {/* Technical Measurements Overlay */}
        {(() => {
          const groundY = toCanvasY(rearWheelRadius);
          const bbScreenX = toCanvasX(bbPosRotated.x);
          const bbScreenY = toCanvasY(bbPosRotated.y);
          const rearAxleScreenX = toCanvasX(rearAxlePosRotated.x);
          const frontAxleScreenX = toCanvasX(frontAxleRotated.x);

          const bbHeight = state.bbPosition.y;
          const rearCenter = Math.abs(
            state.frontAxlePosition.x - state.rearAxlePosition.x,
          );
          const frontCenter =
            Math.abs(frontAxleRotated.x - bbPosRotated.x) / scale;

          const measurementColor = "#999";
          const measurementLineWidth = "0.67";
          const lineStyle = "3,3";

          return (
            <>
              {/* BB Height measurement */}
              <line
                x1={bbScreenX}
                y1={bbScreenY}
                x2={bbScreenX}
                y2={groundY}
                stroke={measurementColor}
                strokeWidth={measurementLineWidth}
                strokeDasharray={lineStyle}
                opacity="0.5"
              />
              <text
                x={bbScreenX + 15}
                y={(bbScreenY + groundY) / 2}
                fontSize="10"
                fill={measurementColor}
                opacity="0.7"
              >
                BB: {Math.round(bbHeight)}mm
              </text>

              {/* Rear Center measurement */}
              <line
                x1={bbScreenX}
                y1={groundY + 30}
                x2={bbScreenX}
                y2={groundY + 20}
                stroke={measurementColor}
                strokeWidth={measurementLineWidth}
                opacity="0.5"
              />
              <line
                x1={bbScreenX}
                y1={groundY + 30}
                x2={rearAxleScreenX}
                y2={groundY + 30}
                stroke={measurementColor}
                strokeWidth={measurementLineWidth}
                opacity="0.5"
              />
              <line
                x1={rearAxleScreenX}
                y1={groundY + 30}
                x2={rearAxleScreenX}
                y2={groundY + 20}
                stroke={measurementColor}
                strokeWidth={measurementLineWidth}
                opacity="0.5"
              />
              <text
                x={(bbScreenX + rearAxleScreenX) / 2}
                y={groundY + 40}
                fontSize="10"
                fill={measurementColor}
                opacity="0.7"
                textAnchor="middle"
              >
                RC: {Math.round(rearCenter)}mm
              </text>

              {/* Front Center measurement */}
              <line
                x1={bbScreenX}
                y1={groundY + 50}
                x2={bbScreenX}
                y2={groundY + 45}
                stroke={measurementColor}
                strokeWidth={measurementLineWidth}
                opacity="0.5"
              />
              <line
                x1={bbScreenX}
                y1={groundY + 50}
                x2={frontAxleScreenX}
                y2={groundY + 50}
                stroke={measurementColor}
                strokeWidth={measurementLineWidth}
                opacity="0.5"
              />
              <line
                x1={frontAxleScreenX}
                y1={groundY + 50}
                x2={frontAxleScreenX}
                y2={groundY + 45}
                stroke={measurementColor}
                strokeWidth={measurementLineWidth}
                opacity="0.5"
              />
              <text
                x={(bbScreenX + frontAxleScreenX) / 2}
                y={groundY + 60}
                fontSize="10"
                fill={measurementColor}
                opacity="0.7"
                textAnchor="middle"
              >
                FC: {Math.round(frontCenter)}mm
              </text>

              {/* Trail measurement */}
              <text
                x={padding + 10}
                y={height - 40}
                fontSize="10"
                fill={measurementColor}
                opacity="0.7"
              >
                Trail: {state.trail.toFixed(1)}mm
              </text>

              {/* F/R Balance */}
              {(() => {
                const wheelbase =
                  state.frontAxlePosition.x - state.rearAxlePosition.x;
                const comX = state.bbPosition.x + geometry.comX;
                const distanceFromRear = comX - state.rearAxlePosition.x;
                const frontPercentage = (distanceFromRear / wheelbase) * 100;
                const rearPercentage = 100 - frontPercentage;

                return (
                  <text
                    x={padding + 10}
                    y={height - 20}
                    fontSize="10"
                    fill={measurementColor}
                    opacity="0.7"
                  >
                    F/R Balance: {Math.round(frontPercentage)}/
                    {Math.round(rearPercentage)}
                  </text>
                );
              })()}
            </>
          );
        })()}

        {/* Main pivot */}
        <circle
          cx={toCanvasX(pivotPosRotated.x)}
          cy={toCanvasY(pivotPosRotated.y)}
          r={5}
          fill="none"
          stroke="#eab308"
          strokeWidth="1.33"
        />

        {/* Shock eye */}
        <circle
          cx={toCanvasX(shockEyePosRotated.x)}
          cy={toCanvasY(shockEyePosRotated.y)}
          r={5}
          fill="#ef4444"
        />

        {/* Center of Mass */}
        <circle
          cx={toCanvasX(comRotated.x)}
          cy={toCanvasY(comRotated.y)}
          r={3}
          fill="#f59e0b"
          opacity="0.7"
        />

        {/* Axle path (trace) */}
        {analysisResults.axlePath.length > 1 && (
          <polyline
            points={analysisResults.axlePath
              .map((p) => {
                const rotatedPath = applyPitchRotation({
                  x: bbPos.x + p.x,
                  y: bbPos.y + p.y,
                });
                return `${toCanvasX(rotatedPath.x)},${toCanvasY(rotatedPath.y)}`;
              })
              .join(" ")}
            fill="none"
            stroke="#60a5fa"
            strokeWidth="1"
            opacity="0.3"
          />
        )}

        {/* Labels and pitch indicator */}
        <text
          x={padding + 10}
          y={30}
          fontSize="14"
          fontWeight="bold"
          fill="#1f2937"
          className="dark:fill-white"
        >
          Travel: {state.travelMM.toFixed(1)} mm | LR:{" "}
          {state.leverageRatio.toFixed(2)} | AS: {state.antiSquat.toFixed(0)}% |
          AR: {state.antiRise.toFixed(0)}%
        </text>

        {/* Pitch angle indicator */}
        <text
          x={padding + 10}
          y={50}
          fontSize="12"
          fill="#666"
          className="dark:fill-gray-400"
        >
          Pitch: {Math.abs(state.pitchAngleDegrees).toFixed(2)}°{" "}
          {state.pitchAngleDegrees > 0
            ? "↓ (nose down)"
            : state.pitchAngleDegrees < 0
              ? "↑ (nose up)"
              : "— (level)"}
        </text>
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
