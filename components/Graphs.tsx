"use client";

import React from "react";
import { AnalysisResults, GraphType } from "@/lib/types";

interface GraphProps {
  results: AnalysisResults;
  selectedGraph: string;
  travelPercentage: number;
}

function getGraphData(
  results: AnalysisResults,
  graphType: string,
): { x: number[]; y: number[]; label: string; unit: string } {
  const states = results.states;

  switch (graphType) {
    case GraphType.LeverageRatio:
      return {
        x: states.map((s) => s.travelMM),
        y: states.map((s) => s.leverageRatio),
        label: "Leverage Ratio",
        unit: "ratio",
      };
    case GraphType.AntiSquat:
      return {
        x: states.map((s) => s.travelMM),
        y: states.map((s) => s.antiSquat),
        label: "Anti-Squat",
        unit: "%",
      };
    case GraphType.AntiRise:
      return {
        x: states.map((s) => s.travelMM),
        y: states.map((s) => s.antiRise),
        label: "Anti-Rise",
        unit: "%",
      };
    case GraphType.PedalKickback:
      return {
        x: states.map((s) => s.travelMM),
        y: states.map((s) => s.pedalKickback),
        label: "Pedal Kickback",
        unit: "°",
      };
    case GraphType.ChainGrowth:
      return {
        x: states.map((s) => s.travelMM),
        y: states.map((s) => s.chainGrowth),
        label: "Chain Growth",
        unit: "mm",
      };
    case GraphType.WheelRate:
      return {
        x: states.map((s) => s.travelMM),
        y: states.map((s) => s.wheelRate),
        label: "Wheel Rate",
        unit: "N/mm",
      };
    case GraphType.Trail:
      return {
        x: states.map((s) => s.travelMM),
        y: states.map((s) => s.trail),
        label: "Trail",
        unit: "mm",
      };
    case GraphType.PitchAngle:
      return {
        x: states.map((s) => s.travelMM),
        y: states.map((s) => s.pitchAngleDegrees),
        label: "Pitch Angle",
        unit: "°",
      };
    default:
      return {
        x: states.map((s) => s.travelMM),
        y: states.map((s) => s.leverageRatio),
        label: "Leverage Ratio",
        unit: "ratio",
      };
  }
}

export function Graph({
  results,
  selectedGraph,
  travelPercentage,
}: GraphProps) {
  if (results.states.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <p className="text-gray-500 dark:text-gray-400">No data available</p>
      </div>
    );
  }

  const graphData = getGraphData(results, selectedGraph);
  const { x: xData, y: yData, label, unit } = graphData;

  // Find min/max for scaling
  const yMin = Math.min(...yData);
  const yMax = Math.max(...yData);
  const yRange = yMax - yMin || 1;
  const xMax = Math.max(...xData) || 1;

  // Canvas dimensions
  const width = 800;
  const height = 300;
  const padding = 40;
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;

  // Scale functions
  const scaleX = (val: number) => (val / xMax) * plotWidth + padding;
  const scaleY = (val: number) =>
    height - padding - ((val - yMin) / yRange) * plotHeight;

  // Find current position
  const currentTravel = (travelPercentage / 100) * xMax;
  const currentX = scaleX(currentTravel);

  // Build path
  const pathPoints = yData.map((y, i) => `${scaleX(xData[i])},${scaleY(y)}`);
  const pathString = pathPoints.join(" ");

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-gray-950">
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          {label} ({unit})
        </h3>
      </div>
      <div className="flex-1 overflow-auto flex items-center justify-center p-4">
        <svg
          width={width}
          height={height}
          className="border border-gray-300 dark:border-gray-700 rounded"
        >
          {/* Background grid */}
          <defs>
            <pattern
              id="gridMinor"
              width={plotWidth / 10}
              height={plotHeight / 5}
              patternUnits="userSpaceOnUse"
              x={padding}
              y={padding}
            >
              <path
                d={`M ${plotWidth / 10} 0 L 0 0 0 ${plotHeight / 5}`}
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect
            x={padding}
            y={padding}
            width={plotWidth}
            height={plotHeight}
            fill="url(#gridMinor)"
            opacity="0.3"
          />

          {/* Axes */}
          <line
            x1={padding}
            y1={height - padding}
            x2={width - padding}
            y2={height - padding}
            stroke="#333"
            strokeWidth="2"
          />
          <line
            x1={padding}
            y1={padding}
            x2={padding}
            y2={height - padding}
            stroke="#333"
            strokeWidth="2"
          />

          {/* X axis labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
            const x = padding + plotWidth * t;
            const val = xMax * t;
            return (
              <g key={`x-${i}`}>
                <line
                  x1={x}
                  y1={height - padding}
                  x2={x}
                  y2={height - padding + 5}
                  stroke="#333"
                  strokeWidth="1"
                />
                <text
                  x={x}
                  y={height - padding + 20}
                  fontSize="12"
                  textAnchor="middle"
                  fill="#666"
                  className="dark:fill-gray-400"
                >
                  {val.toFixed(0)}
                </text>
              </g>
            );
          })}

          {/* Y axis labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
            const y = height - padding - plotHeight * t;
            const val = yMin + yRange * t;
            return (
              <g key={`y-${i}`}>
                <line
                  x1={padding - 5}
                  y1={y}
                  x2={padding}
                  y2={y}
                  stroke="#333"
                  strokeWidth="1"
                />
                <text
                  x={padding - 10}
                  y={y + 4}
                  fontSize="12"
                  textAnchor="end"
                  fill="#666"
                  className="dark:fill-gray-400"
                >
                  {val.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* Data line */}
          <polyline
            points={pathString}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
          />

          {/* Current position indicator */}
          <line
            x1={currentX}
            y1={padding}
            x2={currentX}
            y2={height - padding}
            stroke="#ef4444"
            strokeWidth="2"
            strokeDasharray="5,5"
            opacity="0.7"
          />

          {/* X axis label */}
          <text
            x={width / 2}
            y={height - 5}
            fontSize="14"
            fontWeight="bold"
            textAnchor="middle"
            fill="#333"
            className="dark:fill-gray-300"
          >
            Travel (mm)
          </text>
        </svg>
      </div>
    </div>
  );
}

interface GraphPanelProps {
  results: AnalysisResults;
  selectedGraph: string;
  onGraphChange: (graph: string) => void;
  travelPercentage: number;
}

export function GraphPanel({
  results,
  selectedGraph,
  onGraphChange,
  travelPercentage,
}: GraphPanelProps) {
  const graphs = [
    { value: GraphType.LeverageRatio, label: "Leverage Ratio" },
    { value: GraphType.AntiSquat, label: "Anti-Squat" },
    { value: GraphType.AntiRise, label: "Anti-Rise" },
    { value: GraphType.PedalKickback, label: "Pedal Kickback" },
    { value: GraphType.ChainGrowth, label: "Chain Growth" },
    { value: GraphType.WheelRate, label: "Wheel Rate" },
    { value: GraphType.Trail, label: "Trail" },
    { value: GraphType.PitchAngle, label: "Pitch Angle" },
  ];

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-black">
      <div className="p-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex gap-2 flex-wrap">
        {graphs.map((graph) => (
          <button
            key={graph.value}
            onClick={() => onGraphChange(graph.value)}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              selectedGraph === graph.value
                ? "bg-blue-600 text-white"
                : "bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700"
            }`}
          >
            {graph.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-auto">
        <Graph
          results={results}
          selectedGraph={selectedGraph}
          travelPercentage={travelPercentage}
        />
      </div>
    </div>
  );
}
