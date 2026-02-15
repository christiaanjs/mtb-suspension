"use client";

import React, { useState } from "react";
import { useBikeViewModel } from "@/hooks/useBikeViewModel";
import { InputPanel } from "@/components/InputPanel";
import { AnimationView } from "@/components/Visualization";
import { GraphPanel } from "@/components/Graphs";
import { Attribution } from "@/components/Attribution";


export default function Home() {
  const viewModel = useBikeViewModel();
  const [isAnimating, setIsAnimating] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      viewModel.loadFromFile(file);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-gray-50 dark:bg-black overflow-hidden">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between max-w-full">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              MTB Suspension Analyzer
            </h1>
            <input
              type="text"
              value={viewModel.bikeName}
              onChange={(e) => viewModel.setBikeName(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="Design name"
            />
            <Attribution />
          </div>
          <div className="flex items-center gap-2">
            <label className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer text-sm font-medium">
              Open
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            <button
              onClick={viewModel.saveToFile}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium"
            >
              Save
            </button>
            <button
              onClick={viewModel.resetToDefaults}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm font-medium"
            >
              Reset
            </button>
            <button
              onClick={() => setIsAnimating(!isAnimating)}
              className={`px-4 py-2 rounded text-sm font-medium text-white ${
                isAnimating
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-purple-600 hover:bg-purple-700"
              }`}
            >
              {isAnimating ? "Stop" : "Animate"}
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 overflow-hidden">
          <InputPanel
            geometry={viewModel.geometry}
            onGeometryChange={viewModel.updateGeometry}
            isCalculating={viewModel.isCalculating}
          />
        </div>

        {/* Main area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Visualization */}
          <div className="flex-1 overflow-hidden">
            <AnimationView
              geometry={viewModel.geometry}
              analysisResults={viewModel.analysisResults}
              initialTravelPercentage={viewModel.currentTravelMM}
              isAnimating={isAnimating}
              animationSpeed={viewModel.animationSpeed}
            />
          </div>

          {/* Graphs */}
          <div className="flex-1 overflow-hidden border-t border-gray-200 dark:border-gray-800">
            <GraphPanel
              results={viewModel.analysisResults}
              selectedGraph={viewModel.selectedGraph}
              onGraphChange={viewModel.setSelectedGraph}
              travelPercentage={
                viewModel.analysisResults.states[
                  viewModel.analysisResults.states.length - 1
                ]?.travelMM
                  ? (viewModel.currentTravelMM /
                      viewModel.analysisResults.states[
                        viewModel.analysisResults.states.length - 1
                      ].travelMM) *
                    100
                  : 0
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
