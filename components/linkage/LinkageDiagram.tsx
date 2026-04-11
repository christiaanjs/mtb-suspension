"use client";

import { useMemo } from "react";
import { LinkageGeometry, Point2D, getScreenConversions } from "@/lib/types";
import { LinkageAnalysisResults, LinkageState } from "@/lib/linkageAnalysis";

interface Props {
  geometry: LinkageGeometry;
  results: LinkageAnalysisResults;
  travelPercent: number; // 0–100
}

function pointsStr(pts: Point2D[]): string {
  return pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
}

export function LinkageDiagram({ geometry, results, travelPercent }: Props) {
  // Pick the state closest to the requested travel percentage
  const state: LinkageState = useMemo(() => {
    const idx = Math.round((travelPercent / 100) * (results.states.length - 1));
    return results.states[Math.max(0, Math.min(idx, results.states.length - 1))];
  }, [results.states, travelPercent]);

  // Compute canvas bounds from the axle path + pivots
  const bounds = useMemo(() => {
    const xs: number[] = [];
    const ys: number[] = [];
    for (const s of results.states) {
      xs.push(s.axle.x, s.jointC.x, s.jointD.x, s.pivotA.x, s.pivotB.x);
      ys.push(s.axle.y, s.jointC.y, s.jointD.y, s.pivotA.y, s.pivotB.y);
    }
    xs.push(state.shockFrameMount.x);
    ys.push(state.shockFrameMount.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    return {
      minX,
      maxX,
      minY,
      maxY,
      padding: 40,
      scale: Math.min(400 / (maxX - minX + 1), 350 / (maxY - minY + 1)),
    };
  }, [results.states, state.shockFrameMount]);

  const conv = getScreenConversions(bounds);
  const tc = (p: Point2D) => conv.toCanvas(p);

  const A = tc(state.pivotA);
  const B = tc(state.pivotB);
  const C = tc(state.jointC);
  const D = tc(state.jointD);
  const E = tc(state.axle);
  const F = tc(state.shockFrameMount);
  const S = tc(state.shockCouplerMount);

  const axlePathStr = pointsStr(results.axlePath.map(tc));

  return (
    <svg
      width={conv.width}
      height={conv.height}
      className="max-w-full max-h-full"
      style={{ display: "block" }}
    >
      {/* Ground line */}
      <line
        x1={0}
        y1={conv.toCanvasY(geometry.rearWheelRadius)}
        x2={conv.width}
        y2={conv.toCanvasY(geometry.rearWheelRadius)}
        stroke="#6b7280"
        strokeWidth="1"
        strokeDasharray="4 4"
      />

      {/* Axle path */}
      <polyline
        points={axlePathStr}
        fill="none"
        stroke="#3b82f6"
        strokeWidth="1"
        strokeDasharray="3 3"
        opacity="0.6"
      />

      {/* Shock */}
      <line
        x1={F.x}
        y1={F.y}
        x2={S.x}
        y2={S.y}
        stroke="#8b5cf6"
        strokeWidth="2.5"
      />
      <circle cx={F.x} cy={F.y} r={5} fill="#8b5cf6" />

      {/* Coupler body: C–E–D triangle */}
      <polygon
        points={pointsStr([C, E, D])}
        fill="#f9731620"
        stroke="#f97316"
        strokeWidth="1.5"
      />

      {/* Main arm A–C */}
      <line x1={A.x} y1={A.y} x2={C.x} y2={C.y} stroke="#f97316" strokeWidth="2" />

      {/* Horst link B–D */}
      <line x1={B.x} y1={B.y} x2={D.x} y2={D.y} stroke="#f97316" strokeWidth="2" />

      {/* Instant center */}
      {state.instantCenter && (() => {
        const IC = tc(state.instantCenter);
        return (
          <circle cx={IC.x} cy={IC.y} r={4} fill="none" stroke="#10b981" strokeWidth="1.5" />
        );
      })()}

      {/* Pivot circles */}
      <circle cx={A.x} cy={A.y} r={7} fill="white" stroke="#eab308" strokeWidth="2" />
      <circle cx={B.x} cy={B.y} r={6} fill="white" stroke="#eab308" strokeWidth="2" />
      <circle cx={C.x} cy={C.y} r={5} fill="white" stroke="#eab308" strokeWidth="1.5" />
      <circle cx={D.x} cy={D.y} r={5} fill="white" stroke="#eab308" strokeWidth="1.5" />
      <circle cx={E.x} cy={E.y} r={8} fill="#6b7280" />

      {/* Labels */}
      <text x={A.x - 12} y={A.y - 10} fontSize="10" fill="#eab308">A</text>
      <text x={B.x - 12} y={B.y + 16} fontSize="10" fill="#eab308">B</text>
      <text x={C.x + 6} y={C.y - 8} fontSize="10" fill="#f97316">C</text>
      <text x={D.x + 6} y={D.y + 14} fontSize="10" fill="#f97316">D</text>
      <text x={E.x + 8} y={E.y + 4} fontSize="10" fill="#9ca3af">E</text>
    </svg>
  );
}
