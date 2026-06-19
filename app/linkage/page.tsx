"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useBikeViewModel } from "@/hooks/useBikeViewModel";
import {
  InputSection,
  InputField,
  FourBarLinkageInputs,
} from "@/components/InputPanel";
import { LinkageVisualization } from "@/components/LinkageVisualization";
import { GraphPanel } from "@/components/Graphs";
import { SuspensionType } from "@/lib/types";

export default function LinkagePage() {
  const viewModel = useBikeViewModel({
    geometryOverrides: { suspensionType: SuspensionType.FourBar },
  });

  const [shockPercent, setShockPercent] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const shockPercentRef = useRef(shockPercent);

  useEffect(() => {
    shockPercentRef.current = shockPercent;
  }, [shockPercent]);

  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      const next = shockPercentRef.current + 0.5;
      setShockPercent(next > 100 ? 0 : next);
    }, 50);
    return () => clearInterval(interval);
  }, [isAnimating]);

  return (
    <div className="flex flex-col min-h-screen lg:h-screen w-screen bg-gray-50 dark:bg-gray-950 lg:overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/90 dark:bg-gray-900/90 backdrop-blur border-b border-gray-200 dark:border-gray-800 px-3 py-2.5 lg:px-6 lg:py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-base lg:text-lg font-bold tracking-tight text-gray-900 dark:text-white truncate leading-tight">
              Four-Bar Linkage Inspector
            </h1>
            <p className="hidden sm:block text-[11px] text-gray-500 dark:text-gray-400 leading-tight truncate">
              Isolate and study the rear linkage kinematics
            </p>
          </div>
          <div className="flex items-center gap-1.5 lg:gap-2 flex-shrink-0">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              ← Full bike
            </Link>
            <button
              onClick={() => setIsAnimating(!isAnimating)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors ${
                isAnimating
                  ? "bg-red-500 hover:bg-red-600"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {isAnimating ? "Stop" : "Animate"}
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 lg:overflow-hidden flex-col lg:flex-row">
        {/* Sidebar: linkage inputs */}
        <div className="w-full lg:w-80 xl:w-96 lg:border-r lg:border-gray-200 lg:dark:border-gray-800 lg:overflow-y-auto bg-gray-50 dark:bg-gray-950">
          <div className="p-4 space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Linkage Geometry
            </h2>
            <InputSection title="Four-Bar Linkage">
              <FourBarLinkageInputs
                geometry={viewModel.geometry}
                onGeometryChange={viewModel.updateGeometry}
              />
            </InputSection>
            <InputSection title="Shock" defaultOpen={false}>
              <InputField
                label="Stroke"
                unit="mm"
                value={viewModel.geometry.shockStroke}
                onChange={(val) =>
                  viewModel.updateGeometry({ shockStroke: val as number })
                }
              />
              <InputField
                label="Spring Rate"
                unit="N/mm"
                value={viewModel.geometry.shockSpringRate}
                onChange={(val) =>
                  viewModel.updateGeometry({ shockSpringRate: val as number })
                }
              />
              <InputField
                label="Frame Mount X"
                unit="mm"
                value={viewModel.geometry.shockFrameMountX}
                onChange={(val) =>
                  viewModel.updateGeometry({ shockFrameMountX: val as number })
                }
              />
              <InputField
                label="Frame Mount Y"
                unit="mm"
                value={viewModel.geometry.shockFrameMountY}
                onChange={(val) =>
                  viewModel.updateGeometry({ shockFrameMountY: val as number })
                }
              />
            </InputSection>
          </div>
        </div>

        {/* Right panel: visualization + graphs */}
        <div className="flex-1 min-w-0 flex flex-col lg:overflow-hidden">
          <div className="lg:flex-[3] lg:min-h-0 flex flex-col h-[60vh] lg:h-auto">
            <div className="flex-1 min-h-0">
              <LinkageVisualization
                geometry={viewModel.geometry}
                analysisResults={viewModel.analysisResults}
                travelPercentage={shockPercent}
              />
            </div>
            <div className="px-4 py-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <span className="w-16 flex-shrink-0 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                  Shock
                </span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="0.5"
                  value={shockPercent}
                  onChange={(e) => setShockPercent(parseFloat(e.target.value))}
                  style={{ "--p": `${shockPercent}%` } as React.CSSProperties}
                  className="slider flex-1 cursor-pointer"
                />
                <span className="w-14 flex-shrink-0 text-right font-mono text-xs text-gray-600 dark:text-gray-300 tabular-nums">
                  {shockPercent.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          <div className="lg:flex-[2] lg:min-h-0 lg:overflow-hidden lg:border-t lg:border-gray-200 lg:dark:border-gray-800 flex flex-col h-[40vh] lg:h-auto">
            <GraphPanel
              results={viewModel.analysisResults}
              selectedGraph={viewModel.selectedGraph}
              onGraphChange={viewModel.setSelectedGraph}
              travelPercentage={shockPercent}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
