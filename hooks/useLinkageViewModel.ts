"use client";

import { useState, useEffect, useCallback } from "react";
import { LinkageGeometry, createDefaultLinkageGeometry } from "@/lib/types";
import { LinkageAnalysisResults, runLinkageAnalysis } from "@/lib/linkageAnalysis";

export function useLinkageViewModel() {
  const [geometry, setGeometry] = useState<LinkageGeometry>(createDefaultLinkageGeometry);
  const [analysisResults, setAnalysisResults] = useState<LinkageAnalysisResults>(
    () => runLinkageAnalysis(createDefaultLinkageGeometry()),
  );
  const [isCalculating, setIsCalculating] = useState(false);

  // Debounced re-analysis on geometry change
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsCalculating(true);
      setAnalysisResults(runLinkageAnalysis(geometry));
      setIsCalculating(false);
    }, 100);
    return () => clearTimeout(timer);
  }, [geometry]);

  const updateGeometry = useCallback((updates: Partial<LinkageGeometry>) => {
    setGeometry((prev) => ({ ...prev, ...updates }));
  }, []);

  return { geometry, updateGeometry, analysisResults, isCalculating };
}
