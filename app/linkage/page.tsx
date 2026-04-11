"use client";

import { useState } from "react";
import { useLinkageViewModel } from "@/hooks/useLinkageViewModel";
import { LinkageInputPanel } from "@/components/linkage/LinkageInputPanel";
import { LinkageDiagram } from "@/components/linkage/LinkageDiagram";
import { Nav } from "@/components/Nav";

type MobileTab = "inputs" | "diagram";

export default function LinkagePage() {
  const { params, updateParams, geometry, analysisResults, isCalculating } = useLinkageViewModel();
  const [travelPercent, setTravelPercent] = useState(0);
  const [mobileTab, setMobileTab] = useState<MobileTab>("diagram");

  const lastState = analysisResults.states[analysisResults.states.length - 1];
  const leverageRatioAtIdx = Math.round(
    (travelPercent / 100) * (analysisResults.states.length - 1),
  );
  const currentState = analysisResults.states[
    Math.max(0, Math.min(leverageRatioAtIdx, analysisResults.states.length - 1))
  ];

  return (
    <div className="flex flex-col min-h-screen lg:h-screen w-screen bg-gray-50 dark:bg-black lg:overflow-hidden">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-3 py-3 lg:px-4 flex items-center gap-2 lg:gap-4 flex-shrink-0">
        <h1 className="text-lg lg:text-xl font-bold text-gray-900 dark:text-white">
          Linkage Explorer
        </h1>
        <Nav />
        {isCalculating && (
          <span className="text-sm text-blue-600 dark:text-blue-400">Calculating...</span>
        )}
      </header>

      {/* Mobile tab bar — hidden on lg+ */}
      <nav className="lg:hidden flex border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        {(
          [
            { id: "inputs", label: "Inputs" },
            { id: "diagram", label: "Diagram" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setMobileTab(tab.id)}
            className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${
              mobileTab === tab.id
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Body */}
      <div className="flex flex-1 lg:overflow-hidden">
        {/* Left: inputs */}
        <div
          className={`w-full lg:w-72 lg:border-r lg:border-gray-200 lg:dark:border-gray-800 lg:overflow-hidden lg:block ${
            mobileTab === "inputs" ? "block" : "hidden"
          }`}
        >
          <LinkageInputPanel
            params={params}
            onParamsChange={updateParams}
            isCalculating={isCalculating}
          />
        </div>

        {/* Right: diagram + stats */}
        <div
          className={`flex-1 flex flex-col lg:overflow-hidden p-4 gap-4 lg:flex ${
            mobileTab === "diagram" ? "flex" : "hidden"
          }`}
        >
          {/* Travel slider */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 w-20">
              Travel {Math.round(currentState?.travelMM ?? 0)} mm
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={travelPercent}
              onChange={(e) => setTravelPercent(Number(e.target.value))}
              className="flex-1"
            />
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap gap-4 lg:gap-6 text-sm flex-shrink-0">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Leverage Ratio: </span>
              <span className="font-mono font-medium text-gray-900 dark:text-white">
                {currentState?.leverageRatio.toFixed(3) ?? "—"}
              </span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Shock Length: </span>
              <span className="font-mono font-medium text-gray-900 dark:text-white">
                {currentState?.shockLength.toFixed(1) ?? "—"} mm
              </span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Total Travel: </span>
              <span className="font-mono font-medium text-gray-900 dark:text-white">
                {lastState?.travelMM.toFixed(1) ?? "—"} mm
              </span>
            </div>
          </div>

          {/* Leverage ratio graph */}
          <div className="flex-shrink-0">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Leverage Ratio vs Travel</p>
            <svg width="100%" height="80" className="bg-gray-100 dark:bg-gray-900 rounded">
              {analysisResults.states.length > 1 && (() => {
                const w = 600;
                const h = 70;
                const maxTravel = lastState?.travelMM ?? 1;
                const ratios = analysisResults.states.map((s) => s.leverageRatio);
                const minR = Math.min(...ratios);
                const maxR = Math.max(...ratios);
                const rRange = maxR - minR || 1;
                const pts = analysisResults.states
                  .map((s) => {
                    const x = (s.travelMM / maxTravel) * (w - 20) + 10;
                    const y = h - ((s.leverageRatio - minR) / rRange) * (h - 10) - 5;
                    return `${x.toFixed(1)},${y.toFixed(1)}`;
                  })
                  .join(" ");
                const curX = ((currentState?.travelMM ?? 0) / maxTravel) * (w - 20) + 10;
                return (
                  <g>
                    <polyline
                      points={pts}
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="1.5"
                      vectorEffect="non-scaling-stroke"
                    />
                    <line x1={`${(curX / w) * 100}%`} y1="0" x2={`${(curX / w) * 100}%`} y2={h}
                      stroke="#f97316" strokeWidth="1" />
                  </g>
                );
              })()}
            </svg>
          </div>

          {/* Diagram */}
          <div className="flex-1 min-h-64 lg:min-h-0 overflow-hidden flex items-center justify-center">
            <LinkageDiagram
              geometry={geometry}
              results={analysisResults}
              travelPercent={travelPercent}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
