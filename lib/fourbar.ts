// Four-bar linkage kinematics solver.
//
// The linkage is defined by the top-out (resting) positions of its joints.
// From those we derive the fixed lengths and rigid-body relationships, then
// solve the single remaining degree of freedom for each shock stroke value.
//
// Bodies (all in the "frame-fixed" coordinate frame where the front triangle
// is static and the BB sits at (0, bbHeight)):
//   - Frame:     main pivot P and rocker pivot R are fixed.
//   - Rocker:    rotates about R, carries the moving shock eye S and the upper
//                seatstay junction Ju.
//   - Seatstay:  rigid body carrying the lower junction Jl, upper junction Ju
//                and the rear axle A.
//   - Chainstay: rotates about P, carries the lower junction Jl.
//
// The shock connects the frame mount F to the rocker eye S and drives the
// linkage. The rear-wheel instant centre is the intersection of the chainstay
// line (through P and Jl) and the seatstay-via-rocker line (through R and Ju).

import { BikeGeometry, Point2D, computedProperties } from "./types";
import {
  distance,
  angle,
  rotate,
  circleCircleIntersection,
  lineIntersection,
  transformPointByReferenceLine,
} from "./geometry";

export interface FourBarSolution {
  // World-frame points after dropping the frame so the rear axle rests on the ground.
  bbPosition: Point2D;
  rearAxlePosition: Point2D;
  instantCenter: Point2D; // stored as the effective "pivot" for anti-squat/anti-rise
  shockEyePosition: Point2D; // moving shock mount on the rocker
  mainPivot: Point2D;
  rockerPivot: Point2D;
  seatstayLower: Point2D;
  seatstayUpper: Point2D;
  shockLength: number;
  travelMM: number;
}

interface FourBarRig {
  // Frame-fixed reference points at top-out
  mainPivot: Point2D; // P
  rockerPivot: Point2D; // R
  frameMount: Point2D; // F
  seatstayLower0: Point2D; // Jl at top-out
  seatstayUpper0: Point2D; // Ju at top-out
  shockEye0: Point2D; // S at top-out
  axle0: Point2D; // A at top-out
  // Fixed lengths
  chainstayLength: number; // |P - Jl|
  seatstayLength: number; // |Jl - Ju|
  rockerShockArm: number; // |R - S|
  topOutShockLength: number; // |F - S|
}

const toWorld = (geometry: BikeGeometry, rx: number, ry: number): Point2D => ({
  x: rx,
  y: geometry.bbHeight + ry,
});

export function establishFourBar(geometry: BikeGeometry): FourBarRig {
  const mainPivot = toWorld(geometry, geometry.lowerLinkPivotX, geometry.lowerLinkPivotY);
  const rockerPivot = toWorld(geometry, geometry.rockerPivotX, geometry.rockerPivotY);
  const frameMount = toWorld(geometry, geometry.shockFrameMountX, geometry.shockFrameMountY);
  const seatstayLower0 = toWorld(geometry, geometry.seatstayLowerX, geometry.seatstayLowerY);
  const seatstayUpper0 = toWorld(geometry, geometry.rockerSeatstayX, geometry.rockerSeatstayY);
  const shockEye0 = toWorld(geometry, geometry.rockerShockMountX, geometry.rockerShockMountY);
  const axle0 = toWorld(geometry, geometry.fourBarAxleX, geometry.fourBarAxleY);

  return {
    mainPivot,
    rockerPivot,
    frameMount,
    seatstayLower0,
    seatstayUpper0,
    shockEye0,
    axle0,
    chainstayLength: distance(mainPivot, seatstayLower0),
    seatstayLength: distance(seatstayLower0, seatstayUpper0),
    rockerShockArm: distance(rockerPivot, shockEye0),
    topOutShockLength: distance(frameMount, shockEye0),
  };
}

const nearest = (candidates: Point2D[], reference: Point2D): Point2D | null => {
  if (candidates.length === 0) return null;
  let best = candidates[0];
  let bestDist = distance(best, reference);
  for (let i = 1; i < candidates.length; i++) {
    const d = distance(candidates[i], reference);
    if (d < bestDist) {
      best = candidates[i];
      bestDist = d;
    }
  }
  return best;
};

// Tracks the previous step's solution so the smoothly-continued branch of each
// circle-circle intersection is chosen.
export interface FourBarTracker {
  shockEye: Point2D;
  seatstayLower: Point2D;
  seatstayUpper: Point2D;
  instantCenter: Point2D;
}

export function initialTracker(rig: FourBarRig): FourBarTracker {
  return {
    shockEye: rig.shockEye0,
    seatstayLower: rig.seatstayLower0,
    seatstayUpper: rig.seatstayUpper0,
    instantCenter: rig.mainPivot,
  };
}

/**
 * Solve the linkage at a given shock stroke. `tracker` carries the previous
 * step's positions so the continuous solution branch is selected; the returned
 * tracker should be fed into the next call.
 */
export function solveFourBarAtStroke(
  shockStroke: number,
  geometry: BikeGeometry,
  rig: FourBarRig,
  tracker: FourBarTracker,
): { solution: FourBarSolution; tracker: FourBarTracker } {
  const rearWheelRadius = computedProperties.rearWheelRadius(geometry);
  const currentShockLength = rig.topOutShockLength - shockStroke;

  // 1. Rocker: shock eye lies on circle(R, shockArm) ∩ circle(F, shockLength).
  const eyeCandidates = circleCircleIntersection(
    rig.rockerPivot,
    rig.rockerShockArm,
    rig.frameMount,
    currentShockLength,
  );
  const shockEye = nearest(eyeCandidates, tracker.shockEye);

  if (!shockEye) {
    // Linkage cannot reach this stroke — hold the previous position.
    return { solution: trackerToSolution(geometry, rig, tracker, currentShockLength), tracker };
  }

  // 2. Rotate the rocker by the angle the shock eye swept, moving the upper
  //    seatstay junction with it.
  const rockerRotation =
    angle(rig.rockerPivot, shockEye) - angle(rig.rockerPivot, rig.shockEye0);
  const seatstayUpper = rotate(rig.seatstayUpper0, rig.rockerPivot, rockerRotation);

  // 3. Seatstay: lower junction lies on circle(P, chainstayLen) ∩ circle(Ju, seatstayLen).
  const lowerCandidates = circleCircleIntersection(
    rig.mainPivot,
    rig.chainstayLength,
    seatstayUpper,
    rig.seatstayLength,
  );
  const seatstayLower = nearest(lowerCandidates, tracker.seatstayLower);

  if (!seatstayLower) {
    return { solution: trackerToSolution(geometry, rig, tracker, currentShockLength), tracker };
  }

  // 4. Rear axle is rigid with the seatstay (Jl, Ju, A).
  const axle = transformPointByReferenceLine(
    rig.seatstayLower0,
    rig.seatstayUpper0,
    rig.axle0,
    seatstayLower,
    seatstayUpper,
  );

  // 5. Instant centre: chainstay line ∩ rocker-seatstay line.
  const instantCenter =
    lineIntersection(rig.mainPivot, seatstayLower, rig.rockerPivot, seatstayUpper) ??
    tracker.instantCenter;

  // Drop the whole frame so the rear axle sits on the ground (matches the
  // single-pivot display convention).
  const groundOffset = axle.y - rearWheelRadius;
  const shift = (p: Point2D): Point2D => ({ x: p.x, y: p.y - groundOffset });

  const solution: FourBarSolution = {
    bbPosition: { x: 0, y: geometry.bbHeight - groundOffset },
    rearAxlePosition: { x: axle.x, y: rearWheelRadius },
    instantCenter: shift(instantCenter),
    shockEyePosition: shift(shockEye),
    mainPivot: shift(rig.mainPivot),
    rockerPivot: shift(rig.rockerPivot),
    seatstayLower: shift(seatstayLower),
    seatstayUpper: shift(seatstayUpper),
    shockLength: currentShockLength,
    travelMM: Math.abs(groundOffset),
  };

  return {
    solution,
    tracker: { shockEye, seatstayLower, seatstayUpper, instantCenter },
  };
}

function trackerToSolution(
  geometry: BikeGeometry,
  rig: FourBarRig,
  tracker: FourBarTracker,
  shockLength: number,
): FourBarSolution {
  const rearWheelRadius = computedProperties.rearWheelRadius(geometry);
  const axle = transformPointByReferenceLine(
    rig.seatstayLower0,
    rig.seatstayUpper0,
    rig.axle0,
    tracker.seatstayLower,
    tracker.seatstayUpper,
  );
  const groundOffset = axle.y - rearWheelRadius;
  const shift = (p: Point2D): Point2D => ({ x: p.x, y: p.y - groundOffset });
  return {
    bbPosition: { x: 0, y: geometry.bbHeight - groundOffset },
    rearAxlePosition: { x: axle.x, y: rearWheelRadius },
    instantCenter: shift(tracker.instantCenter),
    shockEyePosition: shift(tracker.shockEye),
    mainPivot: shift(rig.mainPivot),
    rockerPivot: shift(rig.rockerPivot),
    seatstayLower: shift(tracker.seatstayLower),
    seatstayUpper: shift(tracker.seatstayUpper),
    shockLength,
    travelMM: Math.abs(groundOffset),
  };
}
