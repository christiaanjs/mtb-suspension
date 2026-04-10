"use client";

import React, { useState, useEffect } from "react";
import { useBikeViewModel } from "@/hooks/useBikeViewModel";
import { InputPanel } from "@/components/InputPanel";
import { AnimationView } from "@/components/Visualization";
import { GraphPanel } from "@/components/Graphs";
import { Attribution } from "@/components/Attribution";
import { runKinematicAnalysis } from "@/lib/kinematics";
import { AnalysisResults } from "@/lib/types";

type MobileTab = "inputs" | "bike" | "analysis";

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

  return (
    <div className="flex flex-col min-h-screen lg:h-screen w-screen bg-gray-50 dark:bg-black lg:overflow-hidden">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-3 py-3 lg:px-6 lg:py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 lg:gap-4 min-w-0">
            <h1 className="text-lg lg:text-2xl font-bold text-gray-900 dark:text-white truncate">
              MTB Suspension Analyzer
            </h1>
            <input
              type="text"
              value={viewModel.bikeName}
              onChange={(e) => viewModel.setBikeName(e.target.value)}
              className="hidden md:block px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="Design name"
            />
            <span className="hidden lg:block">
              <Attribution />
            </span>
          </div>
          <div className="flex items-center gap-1 lg:gap-2 flex-shrink-0">
            <label className="px-2 py-2 lg:px-4 bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer text-sm font-medium">
              <span className="hidden md:inline">Open</span>
              <span className="md:hidden">Opn</span>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            <button
              onClick={viewModel.saveToFile}
              className="px-2 py-2 lg:px-4 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium"
            >
              <span className="hidden md:inline">Save</span>
              <span className="md:hidden">Sv</span>
            </button>
            <button
              onClick={viewModel.resetToDefaults}
              className="px-2 py-2 lg:px-4 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm font-medium"
            >
              <span className="hidden md:inline">Reset</span>
              <span className="md:hidden">Rst</span>
            </button>
            <button
              onClick={() => setIsAnimating(!isAnimating)}
              className={`px-2 py-2 lg:px-4 rounded text-sm font-medium text-white ${
                isAnimating
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-purple-600 hover:bg-purple-700"
              }`}
            >
              <span className="hidden md:inline">
                {isAnimating ? "Stop" : "Animate"}
              </span>
              <span className="md:hidden">{isAnimating ? "Stop" : "Anim"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile tab bar — hidden on lg+ */}
      <nav className="lg:hidden flex border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        {(
          [
            { id: "inputs", label: "Inputs" },
            { id: "bike", label: "Bike" },
            { id: "analysis", label: "Analysis" },
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

      {/* Main content */}
      <div className="flex flex-1 lg:overflow-hidden">
        {/* Sidebar — full-width on mobile Inputs tab, fixed 320px on desktop */}
        <div
          className={`w-full lg:w-80 lg:border-r lg:border-gray-200 lg:dark:border-gray-800 lg:overflow-hidden lg:block ${
            mobileTab === "inputs" ? "block" : "hidden"
          }`}
        >
          <InputPanel
            geometry={viewModel.geometry}
            onGeometryChange={viewModel.updateGeometry}
            isCalculating={viewModel.isCalculating}
          />
        </div>

        {/* Right panel — hidden on mobile Inputs tab, always visible on desktop */}
        <div
          className={`flex-1 flex flex-col lg:overflow-hidden lg:flex ${
            mobileTab !== "inputs" ? "flex" : "hidden"
          }`}
        >
          {/* Visualization */}
          <div
            className={`lg:flex-1 lg:overflow-hidden lg:block ${
              mobileTab === "bike" ? "block" : "hidden"
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
            className={`lg:flex-1 lg:overflow-hidden lg:border-t lg:border-gray-200 lg:dark:border-gray-800 lg:block ${
              mobileTab === "analysis" ? "block" : "hidden"
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
    </div>
  );
}
