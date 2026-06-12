"use client";

import React, { useState, useEffect } from "react";
import { useBikeViewModel } from "@/hooks/useBikeViewModel";
import { InputPanel } from "@/components/InputPanel";
import { AnimationView } from "@/components/Visualization";
import { GraphPanel } from "@/components/Graphs";
import { runKinematicAnalysis } from "@/lib/kinematics";
import { AnalysisResults } from "@/lib/types";

type MobileTab = "inputs" | "bike" | "analysis";

const iconProps = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  viewBox: "0 0 24 24",
} as const;

const OpenIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg {...iconProps} className={className}>
    <path d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 0 0-1.883 2.542l.857 6a2.25 2.25 0 0 0 2.227 1.932h14.204a2.25 2.25 0 0 0 2.227-1.932l.857-6a2.25 2.25 0 0 0-1.883-2.542m-16.5 0V6A2.25 2.25 0 0 1 6 3.75h3.879a1.5 1.5 0 0 1 1.06.44l2.122 2.12a1.5 1.5 0 0 0 1.06.44H18A2.25 2.25 0 0 1 20.25 9v.776" />
  </svg>
);

const SaveIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg {...iconProps} className={className}>
    <path d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
);

const ResetIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg {...iconProps} className={className}>
    <path d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
);

const PlayIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg {...iconProps} className={className}>
    <path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
  </svg>
);

const StopIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg {...iconProps} className={className}>
    <path d="M5.25 7.5A2.25 2.25 0 0 1 7.5 5.25h9a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-9Z" />
  </svg>
);

const SlidersIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg {...iconProps} className={className}>
    <path d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
  </svg>
);

const BikeIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg {...iconProps} className={className}>
    <circle cx="5.5" cy="16.5" r="3.25" />
    <circle cx="18.5" cy="16.5" r="3.25" />
    <path d="M5.5 16.5 9 9.5h6M12 16.5 9 9.5m6 0 3.5 7M14 6.5h2.5" />
  </svg>
);

const ChartIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg {...iconProps} className={className}>
    <path d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
  </svg>
);

const MountainIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="m8.5 4 3.6 7.2L15 8l6 12.5H3L8.5 4Z" />
  </svg>
);

const secondaryButtonClass =
  "inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2.5 py-2 md:px-3 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer";

export default function Home() {
  const viewModel = useBikeViewModel();
  const [isAnimating, setIsAnimating] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>("bike");

  // Fork / shock coupling state (lifted so GraphPanel can receive fork-aware results)
  const [forkCompressionPercent, setForkCompressionPercent] = useState(0);
  const [coupled, setCoupled] = useState(true);
  // Only stores the uncoupled (fixed-fork) analysis; null means "not yet computed".
  const [forkAwareResults, setForkAwareResults] = useState<AnalysisResults | null>(null);

  // When uncoupled, re-run the analysis with the fixed fork compression so that
  // all metrics (trail, anti-squat, anti-rise, pitch angle, …) match the animation.
  useEffect(() => {
    if (coupled) return;
    const timer = setTimeout(() => {
      const fixedForkMM =
        (forkCompressionPercent / 100) * viewModel.geometry.forkTravel;
      setForkAwareResults(
        runKinematicAnalysis(viewModel.geometry, fixedForkMM),
      );
    }, 100);
    return () => clearTimeout(timer);
  }, [forkCompressionPercent, coupled, viewModel.analysisResults, viewModel.geometry]);

  // When coupled, use the proportional results directly; when uncoupled, use the
  // fork-aware results (falling back to proportional until the first debounce fires).
  const graphResults = coupled
    ? viewModel.analysisResults
    : (forkAwareResults ?? viewModel.analysisResults);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      viewModel.loadFromFile(file);
    }
  };

  const travelPercentage = viewModel.analysisResults.states[
    viewModel.analysisResults.states.length - 1
  ]?.travelMM
    ? (viewModel.currentTravelMM /
        viewModel.analysisResults.states[
          viewModel.analysisResults.states.length - 1
        ].travelMM) *
      100
    : 0;

  const mobileTabs = [
    { id: "inputs", label: "Inputs", icon: SlidersIcon },
    { id: "bike", label: "Bike", icon: BikeIcon },
    { id: "analysis", label: "Analysis", icon: ChartIcon },
  ] as const;

  return (
    <div className="flex flex-col min-h-screen lg:h-screen w-screen bg-gray-50 dark:bg-gray-950 lg:overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/90 dark:bg-gray-900/90 backdrop-blur border-b border-gray-200 dark:border-gray-800 px-3 py-2.5 lg:px-6 lg:py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm">
              <MountainIcon />
            </div>
            <div className="min-w-0">
              <h1 className="text-base lg:text-lg font-bold tracking-tight text-gray-900 dark:text-white truncate leading-tight">
                MTB Suspension Analyzer
              </h1>
              <p className="hidden sm:block text-[11px] text-gray-500 dark:text-gray-400 leading-tight truncate">
                Real-time kinematics &amp; geometry analysis
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 lg:gap-2 flex-shrink-0">
            <label className={secondaryButtonClass} title="Open design (.json)">
              <OpenIcon />
              <span className="hidden md:inline">Open</span>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            <button
              onClick={viewModel.saveToFile}
              className={secondaryButtonClass}
              title="Save design (.json)"
            >
              <SaveIcon />
              <span className="hidden md:inline">Save</span>
            </button>
            <button
              onClick={viewModel.resetToDefaults}
              className={secondaryButtonClass}
              title="Reset to defaults"
            >
              <ResetIcon />
              <span className="hidden md:inline">Reset</span>
            </button>
            <button
              onClick={() => setIsAnimating(!isAnimating)}
              title={isAnimating ? "Stop animation" : "Animate compression"}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 md:px-4 text-sm font-semibold text-white shadow-sm transition-colors ${
                isAnimating
                  ? "bg-red-500 hover:bg-red-600"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {isAnimating ? <StopIcon /> : <PlayIcon />}
              <span className="hidden md:inline">
                {isAnimating ? "Stop" : "Animate"}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Main content — bottom padding on mobile clears the fixed tab bar */}
      <div className="flex flex-1 lg:overflow-hidden pb-16 lg:pb-0">
        {/* Sidebar — full-width on mobile Inputs tab, fixed width on desktop */}
        <div
          className={`w-full lg:w-80 xl:w-96 lg:border-r lg:border-gray-200 lg:dark:border-gray-800 lg:overflow-hidden lg:block ${
            mobileTab === "inputs" ? "block" : "hidden"
          }`}
        >
          <InputPanel
            geometry={viewModel.geometry}
            onGeometryChange={viewModel.updateGeometry}
            isCalculating={viewModel.isCalculating}
            bikeName={viewModel.bikeName}
            onBikeNameChange={viewModel.setBikeName}
          />
        </div>

        {/* Right panel — hidden on mobile Inputs tab, always visible on desktop */}
        <div
          className={`flex-1 min-w-0 flex flex-col lg:overflow-hidden lg:flex ${
            mobileTab !== "inputs" ? "flex" : "hidden"
          }`}
        >
          {/* Visualization */}
          <div
            className={`lg:flex-[3] lg:min-h-0 lg:overflow-hidden lg:flex lg:flex-col ${
              mobileTab === "bike" ? "flex flex-col flex-1 min-h-0" : "hidden"
            }`}
          >
            <AnimationView
              geometry={viewModel.geometry}
              analysisResults={viewModel.analysisResults}
              initialTravelPercentage={viewModel.currentTravelMM}
              isAnimating={isAnimating}
              animationSpeed={viewModel.animationSpeed}
              selectedGraph={viewModel.selectedGraph}
              showCalculations={true}
              forkCompressionPercent={forkCompressionPercent}
              coupled={coupled}
              onForkCompressionChange={setForkCompressionPercent}
              onCoupledChange={setCoupled}
            />
          </div>

          {/* Graphs */}
          <div
            className={`lg:flex-[2] lg:min-h-0 lg:overflow-hidden lg:border-t lg:border-gray-200 lg:dark:border-gray-800 lg:flex lg:flex-col ${
              mobileTab === "analysis"
                ? "flex flex-col flex-1 min-h-0"
                : "hidden"
            }`}
          >
            <GraphPanel
              results={graphResults}
              selectedGraph={viewModel.selectedGraph}
              onGraphChange={viewModel.setSelectedGraph}
              travelPercentage={travelPercentage}
            />
          </div>
        </div>
      </div>

      {/* Mobile bottom navigation — hidden on lg+ */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
        <div className="flex">
          {mobileTabs.map((tab) => {
            const Icon = tab.icon;
            const active = mobileTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setMobileTab(tab.id)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
                  active
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? "" : "opacity-80"}`} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
