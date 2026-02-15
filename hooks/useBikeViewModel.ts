"use client";

import { useState, useCallback, useEffect } from "react";
import {
  BikeGeometry,
  AnalysisResults,
  createDefaultGeometry,
  IdlerType,
} from "@/lib/types";
import { runKinematicAnalysis } from "@/lib/kinematics";

const getOverridesFromQuery = (idlerQuery: string | null) => {
  if (typeof idlerQuery === "string") {
    switch (idlerQuery.toLowerCase()) {
      case "frame":
        return { idlerType: IdlerType.FrameMounted, idlerX: -60, idlerY: 160 };
      case "swingarm":
        return {
          idlerType: IdlerType.SwingarmMounted,
          idlerX: -60,
          idlerY: 160,
        };
      default:
        return {};
    }
  } else {
    return {};
  }
};

type Options = {
  idlerQuery?: string | null;
};

export function useBikeViewModel({ idlerQuery = null }: Options = {}) {
  const overrides = getOverridesFromQuery(idlerQuery);
  const [geometry, setGeometry] = useState<BikeGeometry>(
    createDefaultGeometry({ overrides }),
  );

  const [bikeName, setBikeName] = useState("Custom Build");
  const [analysisResults, setAnalysisResults] = useState<AnalysisResults>({
    states: [],
    axlePath: [],
    frontAxlePath: [],
  });
  const [isCalculating, setIsCalculating] = useState(false);
  const [currentTravelMM, setCurrentTravelMM] = useState(0);
  const [currentForkStroke, setCurrentForkStroke] = useState(0);
  const [animationSpeed, setAnimationSpeed] = useState(1.0);
  const [selectedGraph, setSelectedGraph] = useState("leverageRatio");

  // Auto-calculate when geometry changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsCalculating(true);
      try {
        const results = runKinematicAnalysis(geometry);
        setAnalysisResults(results);
        setCurrentTravelMM(0);
        setCurrentForkStroke(0);
      } finally {
        setIsCalculating(false);
      }
    }, 100); // debounce

    return () => clearTimeout(timer);
  }, [geometry]);

  const updateGeometry = useCallback((updates: Partial<BikeGeometry>) => {
    setGeometry((prev) => ({ ...prev, ...updates }));
  }, []);

  const saveToFile = useCallback(() => {
    const design = { name: bikeName, geometry };
    const dataStr = JSON.stringify(design, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${bikeName}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [bikeName, geometry]);

  const loadFromFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const design = JSON.parse(content);
        setBikeName(design.name || "Loaded Design");
        setGeometry(design.geometry || createDefaultGeometry());
      } catch (error) {
        console.error("Failed to load file:", error);
      }
    };
    reader.readAsText(file);
  }, []);

  const resetToDefaults = useCallback(() => {
    setGeometry(createDefaultGeometry({ overrides }));
    setBikeName("Custom Build");
  }, [overrides]);

  return {
    geometry,
    bikeName,
    setBikeName,
    analysisResults,
    isCalculating,
    currentTravelMM,
    setCurrentTravelMM,
    currentForkStroke,
    setCurrentForkStroke,
    animationSpeed,
    setAnimationSpeed,
    selectedGraph,
    setSelectedGraph,
    updateGeometry,
    saveToFile,
    loadFromFile,
    resetToDefaults,
  };
}
