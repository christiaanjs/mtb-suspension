// 4-Bar / Horst Link kinematics solver
// Shared between the main bike simulation (kinematics.ts) and the linkage page (linkageAnalysis.ts)

import { BikeGeometry, LinkageGeometry, Point2D, computedProperties } from "./types";
import { circleCircleIntersection, distance, angle, resolveCouplerFromLengths } from "./geometry";

// Pre-computed setup for the 4-bar mechanism, analogous to RigidTriangle in single-pivot.
export interface FourBarSetup {
  A: Point2D;  // main frame pivot
  B: Point2D;  // Horst link frame pivot
  F: Point2D;  // shock frame mount
  lenAC: number; // main arm length |A–C0|
  lenCD: number; // coupler length |C0–D0|
  lenBD: number; // Horst link length |B–D0|
  alpha0: number; // crank angle at top-out (angle A→C0)
  correctDIsFirstCandidate: boolean; // which circleCircleIntersection root to use for D
  eLocalDist: number;  // |C0–E0|
  eLocalAngle: number; // angle(C0→E0) minus couplerAngle0
  sLocalDist: number;  // |C0–S0|
  sLocalAngle: number; // angle(C0→S0) minus couplerAngle0
  rearWheelRadius: number;
}

// Per-step output returned by calculateFourBarStateAtShockStroke.
// Mirrors the fields of FirstPassState in kinematics.ts plus 4-bar-specific positions.
export interface FourBarRawState {
  travelMM: number;
  rearAxlePosition: Point2D;
  bbPosition: Point2D;
  pivotPosition: Point2D;       // A adjusted for ground offset (= main frame pivot)
  swingarmEyePosition: Point2D; // shock coupler mount S, adjusted — reused by Shock.tsx
  shockLength: number;
  instantCenter: Point2D | null; // virtual pivot = intersection of lines A–C and B–D
  horstLinkPivotBPosition: Point2D; // B adjusted for ground offset
  horstJointCPosition: Point2D;     // C adjusted for ground offset
  horstJointDPosition: Point2D;     // D adjusted for ground offset
}

// Derive FourBarSetup from BikeGeometry (used by main simulation).
export function establishFourBarLinkage(geometry: BikeGeometry): FourBarSetup {
  const rearWheelRadius = computedProperties.rearWheelRadius(geometry);
  const bbY = geometry.bbHeight;

  const A: Point2D = { x: geometry.bbToPivotX, y: bbY + geometry.bbToPivotY };
  const B: Point2D = {
    x: geometry.bbToHorstFramePivotX!,
    y: bbY + geometry.bbToHorstFramePivotY!,
  };
  const { C: C0, D: D0, S: S0 } = resolveCouplerFromLengths(
    A,
    geometry.horstArmLength!,
    geometry.horstCrankAngleDeg!,
    B,
    geometry.horstCouplerLength!,
    geometry.horstLinkLength!,
    geometry.horstShockMountForward!,
    geometry.horstShockMountPerp!,
  );
  const F: Point2D = {
    x: geometry.shockFrameMountX,
    y: bbY + geometry.shockFrameMountY,
  };

  // Axle E0 at top-out: at rearWheelRadius height, swingarmLength from A (same as single-pivot).
  const vertDist = A.y - rearWheelRadius;
  const horizDist = Math.sqrt(Math.max(0, geometry.swingarmLength * geometry.swingarmLength - vertDist * vertDist));
  const E0: Point2D = { x: A.x + horizDist, y: rearWheelRadius };

  return buildSetup(A, B, C0, D0, E0, S0, F, rearWheelRadius);
}

// Derive FourBarSetup from LinkageGeometry (used by the linkage page).
export function establishFourBarLinkageFromLinkage(geom: LinkageGeometry): FourBarSetup {
  return buildSetup(
    geom.pivotA, geom.pivotB,
    geom.jointC, geom.jointD,
    geom.axleE, geom.shockCouplerMount, geom.shockFrameMount,
    geom.rearWheelRadius,
  );
}

function buildSetup(
  A: Point2D, B: Point2D,
  C0: Point2D, D0: Point2D, E0: Point2D,
  S0: Point2D, F: Point2D,
  rearWheelRadius: number,
): FourBarSetup {
  const lenAC = distance(A, C0);
  const lenCD = distance(C0, D0);
  const lenBD = distance(B, D0);
  const couplerAngle0 = angle(C0, D0);

  // Express E0 and S0 in the coupler body frame:
  // origin at C, x-axis toward D (couplerAngle0), stored as (dist, angle relative to coupler axis).
  const eLocalDist = distance(C0, E0);
  const eLocalAngle = angle(C0, E0) - couplerAngle0;
  const sLocalDist = distance(C0, S0);
  const sLocalAngle = angle(C0, S0) - couplerAngle0;

  const alpha0 = angle(A, C0);

  // Determine which circleCircleIntersection root corresponds to D0 at top-out.
  const dCandidates = circleCircleIntersection(C0, lenCD, B, lenBD);
  let correctDIsFirstCandidate = true;
  if (dCandidates.length >= 2) {
    correctDIsFirstCandidate = distance(dCandidates[0], D0) <= distance(dCandidates[1], D0);
  }

  return {
    A, B, F, lenAC, lenCD, lenBD, alpha0, correctDIsFirstCandidate,
    eLocalDist, eLocalAngle, sLocalDist, sLocalAngle, rearWheelRadius,
  };
}

// Solve the 4-bar configuration for a given crank angle alpha.
// Returns world-frame positions of C, D, E (axle), and S (shock coupler mount),
// or null if the geometry is degenerate at this angle.
// Exported so linkageAnalysis.ts can call it without duplicating the solver.
export function solveAtCrankAngle(
  alpha: number,
  setup: FourBarSetup,
): { C: Point2D; D: Point2D; E: Point2D; S: Point2D } | null {
  const { A, B, lenAC, lenCD, lenBD, correctDIsFirstCandidate } = setup;

  const C: Point2D = {
    x: A.x + lenAC * Math.cos(alpha),
    y: A.y + lenAC * Math.sin(alpha),
  };

  const dCandidates = circleCircleIntersection(C, lenCD, B, lenBD);
  if (dCandidates.length < 2) return null;

  const D = correctDIsFirstCandidate ? dCandidates[0] : dCandidates[1];
  const couplerAngle = angle(C, D);

  const E: Point2D = {
    x: C.x + setup.eLocalDist * Math.cos(couplerAngle + setup.eLocalAngle),
    y: C.y + setup.eLocalDist * Math.sin(couplerAngle + setup.eLocalAngle),
  };
  const S: Point2D = {
    x: C.x + setup.sLocalDist * Math.cos(couplerAngle + setup.sLocalAngle),
    y: C.y + setup.sLocalDist * Math.sin(couplerAngle + setup.sLocalAngle),
  };

  return { C, D, E, S };
}

// Compute the virtual pivot (instant center) of the 4-bar: intersection of lines A–C and B–D.
function computeInstantCenter(A: Point2D, C: Point2D, B: Point2D, D: Point2D): Point2D | null {
  const dx1 = C.x - A.x, dy1 = C.y - A.y;
  const dx2 = D.x - B.x, dy2 = D.y - B.y;
  const denom = dx1 * dy2 - dy1 * dx2;
  if (Math.abs(denom) < 1e-9) return null;
  const t = ((B.x - A.x) * dy2 - (B.y - A.y) * dx2) / denom;
  return { x: A.x + t * dx1, y: A.y + t * dy1 };
}

// Compute the 4-bar state for a given shock stroke.
// Uses binary search over crank angle alpha to satisfy the shock-length constraint.
export function calculateFourBarStateAtShockStroke(
  shockStroke: number,
  shockETE: number,
  bbHeight: number,
  setup: FourBarSetup,
): FourBarRawState {
  const { A, B, F, alpha0, rearWheelRadius } = setup;
  const targetShockLength = shockETE - shockStroke;

  // Evaluate top-out configuration (alpha0)
  const rBase = solveAtCrankAngle(alpha0, setup);
  if (!rBase) {
    return makeEmptyState(A, B, bbHeight, rearWheelRadius, shockETE);
  }

  // Determine compression direction: which perturbation of alpha shortens the shock?
  const eps = 0.01;
  const shockAtBase = distance(F, rBase.S);
  const rPlus = solveAtCrankAngle(alpha0 + eps, setup);
  const rMinus = solveAtCrankAngle(alpha0 - eps, setup);
  const shockPlus = rPlus ? distance(F, rPlus.S) : shockAtBase;
  const shockMinus = rMinus ? distance(F, rMinus.S) : shockAtBase;
  // compressionSign = -1: decreasing alpha compresses. +1: increasing alpha compresses.
  const compressionSign = shockMinus < shockPlus ? -1 : 1;

  // Scan in the compression direction to find a bracket for bisection.
  // aA = alpha0 (shock ≈ shockETE ≥ target), aB = first alpha where shock ≤ target.
  // Step size 0.01 rad (≈ 0.57°), up to 300 steps (3 radians ≈ 172°).
  const SCAN_STEP = 0.01;
  const MAX_SCAN_STEPS = 300;

  let foundAB: number | null = null;
  for (let step = 1; step <= MAX_SCAN_STEPS; step++) {
    const alpha = alpha0 + compressionSign * step * SCAN_STEP;
    const result = solveAtCrankAngle(alpha, setup);
    if (result && distance(F, result.S) <= targetShockLength) {
      foundAB = alpha;
      break;
    }
  }

  if (foundAB === null) {
    // Cannot reach target stroke with any valid crank angle — return top-out state.
    return assembleState(rBase.C, rBase.D, rBase.E, rBase.S, A, B, F, 0, shockETE, bbHeight, rearWheelRadius);
  }

  // Bisect over 60 iterations (precision < 0.001mm).
  let aA = alpha0; // shock > target on this side
  let aB = foundAB; // shock ≤ target on this side
  for (let iter = 0; iter < 60; iter++) {
    const aMid = (aA + aB) / 2;
    const result = solveAtCrankAngle(aMid, setup);
    if (!result) { aB = aMid; continue; }
    if (distance(F, result.S) > targetShockLength) {
      aA = aMid; // need more compression
    } else {
      aB = aMid; // at or past target
    }
  }

  const finalResult = solveAtCrankAngle((aA + aB) / 2, setup);
  if (!finalResult) {
    return assembleState(rBase.C, rBase.D, rBase.E, rBase.S, A, B, F, 0, shockETE, bbHeight, rearWheelRadius);
  }

  return assembleState(
    finalResult.C, finalResult.D, finalResult.E, finalResult.S,
    A, B, F,
    finalResult.E.y - rearWheelRadius,
    distance(F, finalResult.S),
    bbHeight, rearWheelRadius,
  );
}

function assembleState(
  C: Point2D, D: Point2D, E: Point2D, S: Point2D,
  A: Point2D, B: Point2D, F: Point2D,
  groundOffset: number,
  shockLength: number,
  bbHeight: number,
  rearWheelRadius: number,
): FourBarRawState {
  // All positions are adjusted by -groundOffset in Y (whole bike frame drops/rises).
  const adj = (p: Point2D): Point2D => ({ x: p.x, y: p.y - groundOffset });
  const A_adj = adj(A);
  const B_adj = adj(B);
  const C_adj = adj(C);
  const D_adj = adj(D);
  return {
    travelMM: Math.abs(groundOffset),
    rearAxlePosition: { x: E.x, y: rearWheelRadius },
    bbPosition: { x: 0, y: bbHeight - groundOffset },
    pivotPosition: A_adj,
    swingarmEyePosition: adj(S),
    shockLength,
    instantCenter: computeInstantCenter(A_adj, C_adj, B_adj, D_adj),
    horstLinkPivotBPosition: B_adj,
    horstJointCPosition: C_adj,
    horstJointDPosition: D_adj,
  };
}

function makeEmptyState(
  A: Point2D, B: Point2D,
  bbHeight: number, rearWheelRadius: number, shockETE: number,
): FourBarRawState {
  return {
    travelMM: 0,
    rearAxlePosition: { x: 0, y: rearWheelRadius },
    bbPosition: { x: 0, y: bbHeight },
    pivotPosition: A,
    swingarmEyePosition: A,
    shockLength: shockETE,
    instantCenter: null,
    horstLinkPivotBPosition: B,
    horstJointCPosition: A,
    horstJointDPosition: B,
  };
}
