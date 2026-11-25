import { AnalysisResults, BikeGeometry, KinematicState } from "@/lib/types";
import { runKinematicAnalysis } from "@/lib/kinematics";

const METRICS = [
  "leverageRatio",
  "wheelRate",
  "antiSquat",
  "antiRise",
  "pedalKickback",
  "chainGrowth",
  "trail",
  "pitchAngleDegrees",
] as const;
type Metric = (typeof METRICS)[number];

const round = (n: number, dp = 2) => {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
};

function pick(s: KinematicState) {
  const out: Record<string, number> = { travelMM: round(s.travelMM, 1) };
  for (const m of METRICS) out[m] = round(s[m]);
  return out;
}

export interface AnalysisSummary {
  travelMM: number;
  sagPercent: number;
  atSag: Record<string, number>;
  atTopOut: Record<string, number>;
  atBottomOut: Record<string, number>;
  ranges: Record<Metric, { min: number; max: number }>;
  /** Evenly sampled curves, `samples` points from top-out to bottom-out. */
  curves: Record<string, number[]>;
}

export function summarise(
  results: AnalysisResults,
  samples = 21,
  sagPercent = 30,
): AnalysisSummary {
  const { states } = results;
  const last = states.length - 1;
  const at = (pct: number) => states[Math.round((pct / 100) * last)];

  const ranges = {} as AnalysisSummary["ranges"];
  for (const m of METRICS) {
    const vals = states.map((s) => s[m]);
    ranges[m] = { min: round(Math.min(...vals)), max: round(Math.max(...vals)) };
  }

  const curves: Record<string, number[]> = {
    travelMM: [],
  };
  for (const m of METRICS) curves[m] = [];
  for (let i = 0; i < samples; i++) {
    const s = at((i / (samples - 1)) * 100);
    curves.travelMM.push(round(s.travelMM, 1));
    for (const m of METRICS) curves[m].push(round(s[m]));
  }

  return {
    travelMM: round(states[last].travelMM, 1),
    sagPercent,
    atSag: pick(at(sagPercent)),
    atTopOut: pick(states[0]),
    atBottomOut: pick(states[last]),
    ranges,
    curves,
  };
}

export type AnalysisOutcome =
  | { ok: true; summary: AnalysisSummary }
  | { ok: false; error: string };

/** Run the sweep, converting throws and NaN/Infinity into a readable error. */
export function analyse(geometry: BikeGeometry): AnalysisOutcome {
  let results: AnalysisResults;
  try {
    results = runKinematicAnalysis(geometry);
  } catch (e) {
    return {
      ok: false,
      error: `Kinematic solve failed: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
  if (results.states.length === 0) {
    return { ok: false, error: "Geometry produced no valid suspension states." };
  }
  const summary = summarise(results);
  const bad = JSON.stringify(summary).includes("null");
  if (bad) {
    return {
      ok: false,
      error:
        "Geometry is not physically solvable (NaN in results). Check the shock length / stroke against the linkage dimensions.",
    };
  }
  return { ok: true, summary };
}

export function describe(s: AnalysisSummary, geometry: BikeGeometry): string {
  const { atSag: a, ranges: r } = s;
  return [
    `${geometry.suspensionType} bike, ${s.travelMM} mm rear travel.`,
    `At ${s.sagPercent}% sag (${a.travelMM} mm): leverage ratio ${a.leverageRatio}, anti-squat ${a.antiSquat}%, anti-rise ${a.antiRise}%, trail ${a.trail} mm, pitch ${a.pitchAngleDegrees}°.`,
    `Leverage ratio ${s.atTopOut.leverageRatio} → ${s.atBottomOut.leverageRatio} (range ${r.leverageRatio.min}–${r.leverageRatio.max}).`,
    `Anti-squat ${r.antiSquat.min}–${r.antiSquat.max}%, anti-rise ${r.antiRise.min}–${r.antiRise.max}%.`,
    `Pedal kickback up to ${r.pedalKickback.max}°, chain growth up to ${r.chainGrowth.max} mm.`,
    `Full curves are in structuredContent.curves.`,
  ].join("\n");
}
