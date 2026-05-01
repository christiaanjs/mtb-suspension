// Linkage analysis engine for the /linkage page.
// Thin wrapper around fourBarKinematics that maps LinkageGeometry → analysis results.

import { LinkageGeometry, Point2D } from "./types";
import {
  FourBarSetup,
  FourBarRawState,
  establishFourBarLinkageFromLinkage,
  calculateFourBarStateAtShockStroke,
} from "./fourBarKinematics";
import { distance } from "./geometry";

export interface LinkageState {
  travelMM: number;
  shockLength: number;
  leverageRatio: number; // dTravel / dStroke (numerical)
  // World-frame positions (Y = height above ground)
  pivotA: Point2D;          // Main frame pivot A
  pivotB: Point2D;          // Horst link frame pivot B
  jointC: Point2D;          // Coupler pivot C
  jointD: Point2D;          // Coupler pivot D
  axle: Point2D;            // Rear axle
  shockFrameMount: Point2D; // Shock frame mount (fixed, same every step)
  shockCouplerMount: Point2D; // Shock coupler mount S (moves with coupler)
  instantCenter: Point2D | null;
}

export interface LinkageAnalysisResults {
  setup: FourBarSetup;
  states: LinkageState[];
  axlePath: Point2D[]; // axle world-frame positions, one per state
}

export function runLinkageAnalysis(geom: LinkageGeometry): LinkageAnalysisResults {
  const setup = establishFourBarLinkageFromLinkage(geom);

  const stepSize = 0.5; // mm
  const strokeSteps = Math.floor(geom.shockStroke / stepSize) + 1;

  const rawStates: FourBarRawState[] = [];
  for (let step = 0; step < strokeSteps; step++) {
    const shockStroke = step * stepSize;
    const raw = calculateFourBarStateAtShockStroke(
      shockStroke,
      geom.shockETE,
      geom.rearWheelRadius, // bbHeight equivalent for linkage page
      setup,
    );
    rawStates.push(raw);
  }

  const F = setup.F;
  const states: LinkageState[] = rawStates.map((raw, i) => {
    // Numerical leverage ratio
    let leverageRatio: number;
    if (i === 0) {
      leverageRatio =
        rawStates.length > 1
          ? (rawStates[1].travelMM - rawStates[0].travelMM) / stepSize
          : 1;
    } else if (i === rawStates.length - 1) {
      leverageRatio = (rawStates[i].travelMM - rawStates[i - 1].travelMM) / stepSize;
    } else {
      leverageRatio = (rawStates[i + 1].travelMM - rawStates[i - 1].travelMM) / (2 * stepSize);
    }

    return {
      travelMM: raw.travelMM,
      shockLength: distance(F, raw.swingarmEyePosition),
      leverageRatio,
      pivotA: raw.pivotPosition,
      pivotB: raw.horstLinkPivotBPosition,
      jointC: raw.horstJointCPosition,
      jointD: raw.horstJointDPosition,
      axle: raw.rearAxlePosition,
      shockFrameMount: F,
      shockCouplerMount: raw.swingarmEyePosition,
      instantCenter: raw.instantCenter,
    };
  });

  return {
    setup,
    states,
    axlePath: states.map((s) => s.axle),
  };
}
