"use client";

import { AnalysisResults, GraphType } from "@/lib/types";

interface GraphProps {
  results: AnalysisResults;
  selectedGraph: string;
  travelPercentage: number;
}

// Fixed internal coordinate system — SVG scales via viewBox
const SVG_WIDTH = 800;
const SVG_HEIGHT = 300;
const SVG_PADDING = 40;
const PLOT_WIDTH = SVG_WIDTH - SVG_PADDING * 2;
const PLOT_HEIGHT = SVG_HEIGHT - SVG_PADDING * 2;

const LINE_COLOR = "#3b82f6";
const MARKER_COLOR = "#ef4444";

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
    case GraphType.RearCenter:
      return {
        x: states.map((s) => s.travelMM),
        y: results.axlePath.map((p) => Math.abs(p.x)),
        label: "Rear Center",
        unit: "mm",
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

function currentIndexFor(travelPercentage: number, length: number) {
  return Math.max(
    0,
    Math.min(Math.round((travelPercentage / 100) * (length - 1)), length - 1),
  );
}

function GraphHeader({
  title,
  unit,
  currentValue,
}: {
  title: string;
  unit: string;
  currentValue?: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-800">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
        {title}
        {unit && unit !== "ratio" && (
          <span className="ml-1.5 font-normal text-gray-400 dark:text-gray-500">
            ({unit})
          </span>
        )}
      </h3>
      {currentValue !== undefined && Number.isFinite(currentValue) && (
        <span className="flex-shrink-0 rounded-md bg-blue-50 dark:bg-blue-950/60 px-2 py-1 font-mono text-xs font-medium text-blue-700 dark:text-blue-300 tabular-nums">
          {currentValue.toFixed(2)}
          {unit && unit !== "ratio" ? ` ${unit}` : ""}
        </span>
      )}
    </div>
  );
}

function GridAndAxes() {
  return (
    <>
      <defs>
        <pattern
          id="gridMinor"
          width={PLOT_WIDTH / 10}
          height={PLOT_HEIGHT / 5}
          patternUnits="userSpaceOnUse"
          x={SVG_PADDING}
          y={SVG_PADDING}
        >
          <path
            d={`M ${PLOT_WIDTH / 10} 0 L 0 0 0 ${PLOT_HEIGHT / 5}`}
            fill="none"
            stroke="#9ca3af"
            strokeWidth="0.5"
          />
        </pattern>
        <linearGradient id="graphArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={LINE_COLOR} stopOpacity="0.25" />
          <stop offset="100%" stopColor={LINE_COLOR} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <rect
        x={SVG_PADDING}
        y={SVG_PADDING}
        width={PLOT_WIDTH}
        height={PLOT_HEIGHT}
        fill="url(#gridMinor)"
        opacity="0.35"
      />
      <line
        x1={SVG_PADDING}
        y1={SVG_HEIGHT - SVG_PADDING}
        x2={SVG_WIDTH - SVG_PADDING}
        y2={SVG_HEIGHT - SVG_PADDING}
        stroke="#9ca3af"
        strokeWidth="1.5"
        className="dark:stroke-gray-600"
      />
      <line
        x1={SVG_PADDING}
        y1={SVG_PADDING}
        x2={SVG_PADDING}
        y2={SVG_HEIGHT - SVG_PADDING}
        stroke="#9ca3af"
        strokeWidth="1.5"
        className="dark:stroke-gray-600"
      />
    </>
  );
}

function AxisTickLabel({
  x,
  y,
  anchor,
  children,
}: {
  x: number;
  y: number;
  anchor: "middle" | "end";
  children: React.ReactNode;
}) {
  return (
    <text
      x={x}
      y={y}
      fontSize="12"
      textAnchor={anchor}
      fill="#6b7280"
      className="dark:fill-gray-400"
    >
      {children}
    </text>
  );
}

function AxlePathGraph({
  results,
  travelPercentage,
}: {
  results: AnalysisResults;
  travelPercentage: number;
}) {
  const axlePath = results.axlePath;
  if (axlePath.length === 0) return null;

  // X axis: distance behind BB (positive = rearward), negate axlePath.x since it is negative
  // Y axis: height of axle above BB (positive = upward)
  const xData = axlePath.map((p) => -p.x);
  const yData = axlePath.map((p) => p.y);

  const xMin = Math.min(...xData);
  const xMax = Math.max(...xData);
  const xRange = xMax - xMin || 1;
  const yMin = Math.min(...yData);
  const yMax = Math.max(...yData);
  const yRange = yMax - yMin || 1;

  const scaleX = (v: number) =>
    ((v - xMin) / xRange) * PLOT_WIDTH + SVG_PADDING;
  const scaleY = (v: number) =>
    SVG_HEIGHT - SVG_PADDING - ((v - yMin) / yRange) * PLOT_HEIGHT;

  const pathString = xData
    .map((x, i) => `${scaleX(x)},${scaleY(yData[i])}`)
    .join(" ");

  // Current position dot
  const currentIndex = currentIndexFor(travelPercentage, axlePath.length);
  const dotX = scaleX(xData[currentIndex]);
  const dotY = scaleY(yData[currentIndex]);

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-gray-950">
      <GraphHeader title="Wheel Path" unit="mm" />
      <div className="flex-1 overflow-hidden flex items-center justify-center p-3 lg:p-4">
        <svg
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          width="100%"
          className="max-h-full"
        >
          <GridAndAxes />

          {/* X axis tick labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
            const x = SVG_PADDING + PLOT_WIDTH * t;
            const val = xMin + xRange * t;
            return (
              <g key={`x-${i}`}>
                <line
                  x1={x}
                  y1={SVG_HEIGHT - SVG_PADDING}
                  x2={x}
                  y2={SVG_HEIGHT - SVG_PADDING + 5}
                  stroke="#9ca3af"
                  strokeWidth="1"
                  className="dark:stroke-gray-600"
                />
                <AxisTickLabel
                  x={x}
                  y={SVG_HEIGHT - SVG_PADDING + 20}
                  anchor="middle"
                >
                  {val.toFixed(0)}
                </AxisTickLabel>
              </g>
            );
          })}

          {/* Y axis tick labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
            const y = SVG_HEIGHT - SVG_PADDING - PLOT_HEIGHT * t;
            const val = yMin + yRange * t;
            return (
              <g key={`y-${i}`}>
                <line
                  x1={SVG_PADDING - 5}
                  y1={y}
                  x2={SVG_PADDING}
                  y2={y}
                  stroke="#9ca3af"
                  strokeWidth="1"
                  className="dark:stroke-gray-600"
                />
                <AxisTickLabel x={SVG_PADDING - 10} y={y + 4} anchor="end">
                  {val.toFixed(0)}
                </AxisTickLabel>
              </g>
            );
          })}

          {/* Path curve */}
          <polyline
            points={pathString}
            fill="none"
            stroke={LINE_COLOR}
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Current position dot */}
          <circle
            cx={dotX}
            cy={dotY}
            r={5}
            fill={MARKER_COLOR}
            stroke="#ffffff"
            strokeWidth="1.5"
            opacity="0.9"
          />

          {/* Axis labels */}
          <text
            x={SVG_WIDTH / 2}
            y={SVG_HEIGHT - 5}
            fontSize="13"
            fontWeight="600"
            textAnchor="middle"
            fill="#4b5563"
            className="dark:fill-gray-300"
          >
            Rearward from BB (mm)
          </text>
          <text
            x={12}
            y={SVG_HEIGHT / 2}
            fontSize="12"
            textAnchor="middle"
            fill="#4b5563"
            className="dark:fill-gray-300"
            transform={`rotate(-90, 12, ${SVG_HEIGHT / 2})`}
          >
            Upward from BB (mm)
          </text>
        </svg>
      </div>
    </div>
  );
}

export function Graph({
  results,
  selectedGraph,
  travelPercentage,
}: GraphProps) {
  if (results.states.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-white dark:bg-gray-950">
        <p className="text-gray-500 dark:text-gray-400">No data available</p>
      </div>
    );
  }

  if (selectedGraph === GraphType.AxlePath) {
    return (
      <AxlePathGraph results={results} travelPercentage={travelPercentage} />
    );
  }

  const graphData = getGraphData(results, selectedGraph);
  const { x: xData, y: yData, label, unit } = graphData;

  // Find min/max for scaling
  const yMin = Math.min(...yData);
  const yMax = Math.max(...yData);
  const yRange = yMax - yMin || 1;
  const xMax = Math.max(...xData) || 1;

  // Scale functions
  const scaleX = (val: number) => (val / xMax) * PLOT_WIDTH + SVG_PADDING;
  const scaleY = (val: number) =>
    SVG_HEIGHT - SVG_PADDING - ((val - yMin) / yRange) * PLOT_HEIGHT;

  // Find current position
  const currentTravel = (travelPercentage / 100) * xMax;
  const currentX = scaleX(currentTravel);
  const currentIndex = currentIndexFor(travelPercentage, yData.length);
  const currentValue = yData[currentIndex];

  // Build path
  const pathPoints = yData.map((y, i) => `${scaleX(xData[i])},${scaleY(y)}`);
  const pathString = pathPoints.join(" ");

  // Closed polygon for the gradient area fill under the curve
  const baseline = SVG_HEIGHT - SVG_PADDING;
  const areaString = `${pathString} ${scaleX(xData[xData.length - 1])},${baseline} ${scaleX(xData[0])},${baseline}`;

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-gray-950">
      <GraphHeader title={label} unit={unit} currentValue={currentValue} />
      <div className="flex-1 overflow-hidden flex items-center justify-center p-3 lg:p-4">
        <svg
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          width="100%"
          className="max-h-full"
        >
          <GridAndAxes />

          {/* X axis labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
            const x = SVG_PADDING + PLOT_WIDTH * t;
            const val = xMax * t;
            return (
              <g key={`x-${i}`}>
                <line
                  x1={x}
                  y1={SVG_HEIGHT - SVG_PADDING}
                  x2={x}
                  y2={SVG_HEIGHT - SVG_PADDING + 5}
                  stroke="#9ca3af"
                  strokeWidth="1"
                  className="dark:stroke-gray-600"
                />
                <AxisTickLabel
                  x={x}
                  y={SVG_HEIGHT - SVG_PADDING + 20}
                  anchor="middle"
                >
                  {val.toFixed(0)}
                </AxisTickLabel>
              </g>
            );
          })}

          {/* Y axis labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
            const y = SVG_HEIGHT - SVG_PADDING - PLOT_HEIGHT * t;
            const val = yMin + yRange * t;
            return (
              <g key={`y-${i}`}>
                <line
                  x1={SVG_PADDING - 5}
                  y1={y}
                  x2={SVG_PADDING}
                  y2={y}
                  stroke="#9ca3af"
                  strokeWidth="1"
                  className="dark:stroke-gray-600"
                />
                <AxisTickLabel x={SVG_PADDING - 10} y={y + 4} anchor="end">
                  {val.toFixed(1)}
                </AxisTickLabel>
              </g>
            );
          })}

          {/* Area fill under the curve */}
          <polygon points={areaString} fill="url(#graphArea)" />

          {/* Data line */}
          <polyline
            points={pathString}
            fill="none"
            stroke={LINE_COLOR}
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Current position indicator */}
          <line
            x1={currentX}
            y1={SVG_PADDING}
            x2={currentX}
            y2={SVG_HEIGHT - SVG_PADDING}
            stroke={MARKER_COLOR}
            strokeWidth="1.5"
            strokeDasharray="5,5"
            opacity="0.7"
          />
          <circle
            cx={scaleX(xData[currentIndex])}
            cy={scaleY(currentValue)}
            r={5}
            fill={MARKER_COLOR}
            stroke="#ffffff"
            strokeWidth="1.5"
            opacity="0.9"
          />

          {/* X axis label */}
          <text
            x={SVG_WIDTH / 2}
            y={SVG_HEIGHT - 5}
            fontSize="13"
            fontWeight="600"
            textAnchor="middle"
            fill="#4b5563"
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
    { value: GraphType.RearCenter, label: "Rear Center" },
    { value: GraphType.AxlePath, label: "Wheel Path" },
  ];

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-950">
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none px-3 py-2.5 lg:flex-wrap">
          {graphs.map((graph) => (
            <button
              key={graph.value}
              onClick={() => onGraphChange(graph.value)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                selectedGraph === graph.value
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {graph.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-auto">
        <Graph
          results={results}
          selectedGraph={selectedGraph}
          travelPercentage={travelPercentage}
        />
      </div>
    </div>
  );
}
