// Kinematic analysis engine
import {
  BikeGeometry,
  KinematicState,
  KinematicStateFirstPass,
  AnalysisResults,
  Point2D,
  computedProperties,
} from "./types";
import { distance, angle, circleCircleIntersection } from "./geometry";

interface RigidTriangle {
  pivotToEye: number;
  pivotToAxle: number;
  eyeToAxle: number;
  correctEyeIndex: number;
  axleAngleIsPositive: boolean;
}

export function runKinematicAnalysis(geometry: BikeGeometry): AnalysisResults {
  const rigidTriangle = establishRigidTriangle(geometry);

  const stepSize = 0.5; // mm - finer steps for smoother graphs
  const strokeSteps = Math.floor(geometry.shockStroke / stepSize) + 1;

  // First pass: calculate basic geometric state from shock stroke only
  const firstPassStates: (KinematicStateFirstPass & {
    proportionalForkStroke: number;
  })[] = [];
  for (let step = 0; step < strokeSteps; step++) {
    const shockStroke = step * stepSize; // mm of shock compression

    // Calculate proportional fork compression
    const travelRatio = shockStroke / geometry.shockStroke;
    const proportionalForkStroke = travelRatio * geometry.forkTravel;

    const state = calculateStateAtShockStroke(
      shockStroke,
      geometry,
      rigidTriangle,
    );

    firstPassStates.push({
      ...state,
      proportionalForkStroke,
    });
  }

  // Second pass: extend first-pass states with derived values
  const states: KinematicState[] = [];
  const axlePath: Point2D[] = [];
  const frontAxlePath: Point2D[] = [];

  for (let i = 0; i < firstPassStates.length; i++) {
    const firstPassState = firstPassStates[i];

    // Calculate front axle position with proportional fork compression
    const htaRad = computedProperties.headTubeAngleRadians(geometry);
    const effectiveForkLength =
      geometry.forkLength - firstPassState.proportionalForkStroke;

    const frontAxlePos: Point2D = {
      x:
        firstPassState.bbPosition.x +
        geometry.reach +
        geometry.headTubeLength * Math.cos(htaRad) +
        effectiveForkLength * Math.cos(htaRad) +
        geometry.forkOffset * Math.sin(htaRad),
      y:
        firstPassState.bbPosition.y +
        geometry.stack -
        geometry.headTubeLength * Math.sin(htaRad) -
        effectiveForkLength * Math.sin(htaRad) +
        geometry.forkOffset * Math.cos(htaRad),
    };

    // Recalculate pitch angle with the actual front axle position
    const dx = frontAxlePos.x - firstPassState.rearAxlePosition.x;
    const dy = frontAxlePos.y - firstPassState.rearAxlePosition.y;
    const centerDist = Math.sqrt(dx * dx + dy * dy);

    const centerAngle = Math.atan2(dy, dx);
    const frontWheelRadius = computedProperties.frontWheelRadius(geometry);
    const rearWheelRadius = computedProperties.rearWheelRadius(geometry);
    const radiusDiff = frontWheelRadius - rearWheelRadius;
    const angleOffset = Math.asin(radiusDiff / centerDist);
    const tangentAngle = centerAngle - angleOffset;
    const pitchAngleDegrees = (tangentAngle * 180.0) / Math.PI;

    // Create the full kinematic state by extending the first-pass state
    const state: KinematicState = {
      travelMM: firstPassState.travelMM,
      rearAxlePosition: firstPassState.rearAxlePosition,
      bbPosition: firstPassState.bbPosition,
      pivotPosition: firstPassState.pivotPosition,
      swingarmEyePosition: firstPassState.swingarmEyePosition,
      shockLength: firstPassState.shockLength,
      pitchAngleDegrees,
      frontAxlePosition: frontAxlePos,
      forkCompression: firstPassState.proportionalForkStroke,
      leverageRatio: 0,
      wheelRate: 0,
      antiSquat: 0,
      antiRise: 0,
      pedalKickback: 0,
      chainGrowth: 0,
      totalChainGrowth: 0,
      trail: 0,
      crankAngle: 0,
    };

    // Calculate leverage ratio as dWheelTravel / dShockStroke (numerical derivative)
    if (i === 0) {
      // At first point: use forward difference
      if (firstPassStates.length > 1) {
        const wheelTravelDelta =
          firstPassStates[i + 1].travelMM - firstPassStates[i].travelMM;
        const shockStrokeDelta = stepSize;
        state.leverageRatio =
          shockStrokeDelta > 0 ? wheelTravelDelta / shockStrokeDelta : 1.0;
      } else {
        state.leverageRatio = 1.0;
      }
    } else if (i === firstPassStates.length - 1) {
      // At last point: use backward difference
      const wheelTravelDelta =
        firstPassStates[i].travelMM - firstPassStates[i - 1].travelMM;
      const shockStrokeDelta = stepSize;
      state.leverageRatio =
        shockStrokeDelta > 0 ? wheelTravelDelta / shockStrokeDelta : 1.0;
    } else {
      // In the middle: use central difference for better accuracy
      const wheelTravelDelta =
        firstPassStates[i + 1].travelMM - firstPassStates[i - 1].travelMM;
      const shockStrokeDelta = 2 * stepSize;
      state.leverageRatio =
        shockStrokeDelta > 0 ? wheelTravelDelta / shockStrokeDelta : 1.0;
    }

    // Calculate wheel rate using actual leverage ratio
    state.wheelRate =
      geometry.shockSpringRate / (state.leverageRatio * state.leverageRatio);

    // Calculate anti-squat and anti-rise from visual geometry
    state.antiSquat = calculateVisualAntiSquat(state, geometry);
    state.antiRise = calculateVisualAntiRise(state, geometry);

    states.push(state);

    // Store wheel positions relative to BB
    const rearRelativeToBB: Point2D = {
      x: state.rearAxlePosition.x - state.bbPosition.x,
      y: state.rearAxlePosition.y - state.bbPosition.y,
    };
    const frontRelativeToBB: Point2D = {
      x: state.frontAxlePosition.x - state.bbPosition.x,
      y: state.frontAxlePosition.y - state.bbPosition.y,
    };

    axlePath.push(rearRelativeToBB);
    frontAxlePath.push(frontRelativeToBB);
  }

  return { states, axlePath, frontAxlePath };
}

function establishRigidTriangle(geometry: BikeGeometry): RigidTriangle {
  const rearWheelRadius = computedProperties.rearWheelRadius(geometry);

  // At top-out: BB is at bbHeight, shock is at shockETE
  const pivot: Point2D = {
    x: geometry.bbToPivotX,
    y: geometry.bbHeight + geometry.bbToPivotY,
  };
  const frameMount: Point2D = {
    x: geometry.shockFrameMountX,
    y: geometry.bbHeight + geometry.shockFrameMountY,
  };

  const eyeCandidates = circleCircleIntersection(
    pivot,
    geometry.shockSwingarmMountDistance,
    frameMount,
    geometry.shockETE,
  );

  if (eyeCandidates.length !== 2) {
    return {
      pivotToEye: geometry.shockSwingarmMountDistance,
      pivotToAxle: geometry.swingarmLength,
      eyeToAxle: geometry.swingarmLength,
      correctEyeIndex: 0,
      axleAngleIsPositive: true,
    };
  }

  const correctEyeIndex = eyeCandidates[0].x > eyeCandidates[1].x ? 0 : 1;
  const chosenEye = eyeCandidates[correctEyeIndex];

  const verticalDist = rearWheelRadius - pivot.y;
  const horizontalDistSquared =
    geometry.swingarmLength * geometry.swingarmLength -
    verticalDist * verticalDist;

  if (horizontalDistSquared < 0) {
    return {
      pivotToEye: geometry.shockSwingarmMountDistance,
      pivotToAxle: geometry.swingarmLength,
      eyeToAxle: geometry.swingarmLength,
      correctEyeIndex: 0,
      axleAngleIsPositive: true,
    };
  }

  const horizontalDist = Math.sqrt(horizontalDistSquared);

  const axle1: Point2D = { x: pivot.x + horizontalDist, y: rearWheelRadius };
  const axle2: Point2D = { x: pivot.x - horizontalDist, y: rearWheelRadius };

  const axle = axle1.x < axle2.x ? axle1 : axle2;

  const pivotToEyeDist = distance(pivot, chosenEye);
  const pivotToAxleDist = distance(pivot, axle);
  const eyeToAxleDist = distance(chosenEye, axle);

  const cosAngle =
    (pivotToEyeDist * pivotToEyeDist +
      pivotToAxleDist * pivotToAxleDist -
      eyeToAxleDist * eyeToAxleDist) /
    (2 * pivotToEyeDist * pivotToAxleDist);
  // const angleAtPivot = Math.acos(Math.max(-1, Math.min(1, cosAngle)));
  const angleAtPivot = Math.acos(cosAngle);

  const pivotToEyeAngle = angle(pivot, chosenEye);
  // const pivotToAxleAngle = angle(pivot, axle);

  const testAnglePlus = pivotToEyeAngle + angleAtPivot;
  const testAngleMinus = pivotToEyeAngle - angleAtPivot;

  const testAxlePlus: Point2D = {
    x: pivot.x + pivotToAxleDist * Math.cos(testAnglePlus),
    y: pivot.y + pivotToAxleDist * Math.sin(testAnglePlus),
  };
  const testAxleMinus: Point2D = {
    x: pivot.x + pivotToAxleDist * Math.cos(testAngleMinus),
    y: pivot.y + pivotToAxleDist * Math.sin(testAngleMinus),
  };

  const distPlus = distance(testAxlePlus, axle);
  const distMinus = distance(testAxleMinus, axle);

  const axleAngleIsPositive = distPlus < distMinus;

  return {
    pivotToEye: pivotToEyeDist,
    pivotToAxle: pivotToAxleDist,
    eyeToAxle: eyeToAxleDist,
    correctEyeIndex,
    axleAngleIsPositive,
  };
}

function calculateStateAtShockStroke(
  shockStroke: number,
  geometry: BikeGeometry,
  rigidTriangle: RigidTriangle,
): KinematicStateFirstPass {
  const rearWheelRadius = computedProperties.rearWheelRadius(geometry);
  // const frontWheelRadius = computedProperties.frontWheelRadius(geometry);

  const eyeToAxleDistance = rigidTriangle.eyeToAxle;
  const currentShockLength = geometry.shockETE - shockStroke;

  const pivot: Point2D = {
    x: geometry.bbToPivotX,
    y: geometry.bbHeight + geometry.bbToPivotY,
  };
  const frameMount: Point2D = {
    x: geometry.shockFrameMountX,
    y: geometry.bbHeight + geometry.shockFrameMountY,
  };

  const eyeCandidates = circleCircleIntersection(
    pivot,
    geometry.shockSwingarmMountDistance,
    frameMount,
    currentShockLength,
  );

  if (eyeCandidates.length === 0) {
    return {
      travelMM: 0,
      rearAxlePosition: { x: 0, y: rearWheelRadius },
      bbPosition: { x: 0, y: geometry.bbHeight },
      pivotPosition: pivot,
      swingarmEyePosition: { x: 0, y: 0 },
      shockLength: currentShockLength,
      pitchAngleDegrees: 0,
    };
  }

  // CRITICAL: Always use the same eye candidate index determined at top-out
  // This locks in the triangle orientation and prevents flipping
  const chosenEye = eyeCandidates[rigidTriangle.correctEyeIndex];

  // Find axle using rigid triangle constraint
  // We know: pivot position, eye position, all three side lengths (fixed)
  const pivotToEyeDist = distance(pivot, chosenEye);
  const pivotToAxleDist = rigidTriangle.pivotToAxle;

  // Law of cosines: angle at pivot in the triangle
  const cosAngle =
    (pivotToEyeDist * pivotToEyeDist +
      pivotToAxleDist * pivotToAxleDist -
      eyeToAxleDistance * eyeToAxleDistance) /
    (2 * pivotToEyeDist * pivotToAxleDist);
  const angleAtPivot = Math.acos(cosAngle);

  const pivotToEyeAngle = angle(pivot, chosenEye);

  // Use the rigid triangle orientation to pick the correct axle
  // No tracking or selection needed - the orientation is fixed throughout travel!
  const axleAngle = rigidTriangle.axleAngleIsPositive
    ? pivotToEyeAngle + angleAtPivot // Positive: add angle
    : pivotToEyeAngle - angleAtPivot; // Negative: subtract angle

  const nominalAxle: Point2D = {
    x: pivot.x + pivotToAxleDist * Math.cos(axleAngle),
    y: pivot.y + pivotToAxleDist * Math.sin(axleAngle),
  };

  // Adjust entire frame DOWN so rear axle is on ground
  const groundOffset = nominalAxle.y - rearWheelRadius;
  const bbY = geometry.bbHeight - groundOffset;

  // Final positions (no pitch adjustment)
  const rearAxlePos: Point2D = {
    x: nominalAxle.x,
    y: rearWheelRadius,
  };
  const bbPos: Point2D = {
    x: 0,
    y: bbY,
  };
  const pivotPos: Point2D = {
    x: geometry.bbToPivotX,
    y: pivot.y - groundOffset,
  };
  const swingarmEyePos: Point2D = {
    x: chosenEye.x,
    y: chosenEye.y - groundOffset,
  };
  const finalFrameMount: Point2D = {
    x: geometry.shockFrameMountX,
    y: bbY + geometry.shockFrameMountY,
  };

  // Calculate front wheel position
  const htaRad = geometry.headAngle * (Math.PI / 180);
  const frontAxlePos: Point2D = {
    x:
      bbPos.x +
      geometry.reach +
      geometry.headTubeLength * Math.cos(htaRad) +
      geometry.forkLength * Math.cos(htaRad) +
      geometry.forkOffset * Math.sin(htaRad),
    y:
      bbPos.y +
      geometry.stack -
      geometry.headTubeLength * Math.sin(htaRad) -
      geometry.forkLength * Math.sin(htaRad) +
      geometry.forkOffset * Math.cos(htaRad),
  };

  // Calculate pitch angle
  const dx = frontAxlePos.x - rearAxlePos.x;
  const dy = frontAxlePos.y - rearAxlePos.y;
  const centerDist = Math.sqrt(dx * dx + dy * dy);

  const centerAngle = Math.atan2(dy, dx);
  const frontWheelRadius = computedProperties.frontWheelRadius(geometry);
  const radiusDiff = frontWheelRadius - rearWheelRadius;
  const angleOffset = Math.asin(radiusDiff / centerDist);
  const tangentAngle = centerAngle - angleOffset;

  const pitchAngleDegrees = (tangentAngle * 180.0) / Math.PI;

  // Calculate wheel travel
  const wheelTravel = Math.abs(geometry.bbHeight - bbY);

  // Calculate shock length with adjusted frame position
  const shockLength = distance(finalFrameMount, swingarmEyePos);

  const state: KinematicStateFirstPass = {
    travelMM: wheelTravel,
    rearAxlePosition: rearAxlePos,
    bbPosition: bbPos,
    pivotPosition: pivotPos,
    swingarmEyePosition: swingarmEyePos,
    shockLength,
    pitchAngleDegrees,
  };

  return state;
}

function calculateVisualAntiSquat(
  state: KinematicState,
  geometry: BikeGeometry,
): number {
  // Calculate from visual geometry - the angle between suspension line of action
  // and the chain line
  const pivotToAxle = state.rearAxlePosition;
  const pivotToEye = state.swingarmEyePosition;
  const frameMount: Point2D = {
    x: geometry.shockFrameMountX,
    y: geometry.bbHeight + geometry.shockFrameMountY,
  };

  // Swingarm angle
  const swingarmAngle = angle(state.pivotPosition, pivotToAxle);

  // Shock/spring line angle (from eye to frame mount)
  const shockAngle = angle(pivotToEye, frameMount);

  // Angle between shock and swingarm
  let angleDiff = shockAngle - swingarmAngle;

  // Normalize to -π to π
  while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
  while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

  // Chain line angle (simplified - assume roughly horizontal)
  const driveAngle = 0; // approximately horizontal for this app

  // Anti-squat is the sine of the angle between chain line and shock
  const antiSquat = Math.sin(angleDiff - driveAngle) * 100;

  return Math.max(0, Math.min(100, antiSquat));
}

function calculateVisualAntiRise(
  state: KinematicState,
  geometry: BikeGeometry,
): number {
  // Anti-rise is opposite to anti-squat
  return 100 - calculateVisualAntiSquat(state, geometry);
}

export const getApplyPitchRotation =
  (rearAxle: Point2D, pitchAngleDegrees: number) => (point: Point2D) => {
    const pitchRad = pitchAngleDegrees * (Math.PI / 180);
    const dx = point.x - rearAxle.x;
    const dy = point.y - rearAxle.y;
    const cosA = Math.cos(-pitchRad);
    const sinA = Math.sin(-pitchRad);
    return {
      x: rearAxle.x + dx * cosA - dy * sinA,
      y: rearAxle.y + dx * sinA + dy * cosA,
    };
  };