"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  LinkageLengthParams,
  createDefaultLinkageLengthParams,
  lengthParamsToCoordinates,
} from "@/lib/types";
import { LinkageAnalysisResults, runLinkageAnalysis } from "@/lib/linkageAnalysis";

export function useLinkageViewModel() {
  const [params, setParams] = useState<LinkageLengthParams>(createDefaultLinkageLengthParams);

  const geometry = useMemo(() => lengthParamsToCoordinates(params), [params]);

  const [analysisResults, setAnalysisResults] = useState<LinkageAnalysisResults>(
    () => runLinkageAnalysis(lengthParamsToCoordinates(createDefaultLinkageLengthParams())),
  );
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsCalculating(true);
      setAnalysisResults(runLinkageAnalysis(geometry));
      setIsCalculating(false);
    }, 100);
    return () => clearTimeout(timer);
  }, [geometry]);

  const updateParams = useCallback((updates: Partial<LinkageLengthParams>) => {
    setParams((prev) => ({ ...prev, ...updates }));
  }, []);

  return { params, updateParams, geometry, analysisResults, isCalculating };
}
