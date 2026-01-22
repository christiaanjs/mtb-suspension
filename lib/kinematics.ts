// Kinematic analysis engine
import {
  BikeGeometry,
  KinematicState,
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
  const states: KinematicState[] = [];
  const axlePath: Point2D[] = [];
  const frontAxlePath: Point2D[] = [];

  const rigidTriangle = establishRigidTriangle(geometry);

  const stepSize = 0.5; // mm - finer steps for smoother graphs
  const strokeSteps = Math.floor(geometry.shockStroke / stepSize) + 1;

  for (let step = 0; step < strokeSteps; step++) {
    const shockStroke = step * stepSize; // mm of shock compression

    // Calculate proportional fork compression
    const travelRatio = shockStroke / geometry.shockStroke;
    const proportionalForkStroke = travelRatio * geometry.forkTravel;

    let state = calculateStateAtShockStroke(
      shockStroke,
      geometry,
      rigidTriangle,
    );

    // Update fork compression
    state.forkCompression = proportionalForkStroke;

    // Recalculate front axle position with proportional fork compression
    const htaRad = (geometry.headAngle * Math.PI) / 180.0;
    const effectiveForkLength = geometry.forkLength - proportionalForkStroke;

    const frontAxlePos: Point2D = {
      x:
        state.bbPosition.x +
        geometry.reach +
        geometry.headTubeLength * Math.cos(htaRad) +
        effectiveForkLength * Math.cos(htaRad) +
        geometry.forkOffset * Math.sin(htaRad),
      y:
        state.bbPosition.y +
        geometry.stack -
        geometry.headTubeLength * Math.sin(htaRad) -
        effectiveForkLength * Math.sin(htaRad) +
        geometry.forkOffset * Math.cos(htaRad),
    };

    state.frontAxlePosition = frontAxlePos;

    // Recalculate pitch with updated front axle
    const rearCenter = state.rearAxlePosition;
    const frontCenter = frontAxlePos;

    const dx = frontCenter.x - rearCenter.x;
    const dy = frontCenter.y - rearCenter.y;
    const centerDist = Math.sqrt(dx * dx + dy * dy);

    const centerAngle = Math.atan2(dy, dx);
    const frontRadius = computedProperties.frontWheelRadius(geometry);
    const rearRadius = computedProperties.rearWheelRadius(geometry);
    const radiusDiff = frontRadius - rearRadius;
    const angleOffset = Math.asin(radiusDiff / centerDist);
    const tangentAngle = centerAngle - angleOffset;

    state.pitchAngleDegrees = (tangentAngle * 180.0) / Math.PI;

    // Recalculate anti-squat and anti-rise
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
  const angleAtPivot = Math.acos(Math.max(-1, Math.min(1, cosAngle)));

  const pivotToEyeAngle = angle(pivot, chosenEye);
  const pivotToAxleAngle = angle(pivot, axle);

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
): KinematicState {
  const rearWheelRadius = computedProperties.rearWheelRadius(geometry);
  const frontWheelRadius = computedProperties.frontWheelRadius(geometry);

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
      travelMM: shockStroke,
      rearAxlePosition: { x: 0, y: rearWheelRadius },
      bbPosition: { x: 0, y: geometry.bbHeight },
      pivotPosition: pivot,
      swingarmEyePosition: { x: 0, y: 0 },
      frontAxlePosition: { x: 0, y: 0 },
      shockLength: currentShockLength,
      leverageRatio: 0,
      antiSquat: 0,
      antiRise: 0,
      pedalKickback: 0,
      chainGrowth: 0,
      totalChainGrowth: 0,
      wheelRate: 0,
      trail: 0,
      crankAngle: 0,
      forkCompression: 0,
      pitchAngleDegrees: 0,
    };
  }

  const chosenEye = eyeCandidates[rigidTriangle.correctEyeIndex];

  const verticalDist = rearWheelRadius - pivot.y;
  const horizontalDistSquared =
    rigidTriangle.pivotToAxle * rigidTriangle.pivotToAxle -
    verticalDist * verticalDist;

  if (horizontalDistSquared < 0) {
    return {
      travelMM: shockStroke,
      rearAxlePosition: { x: 0, y: rearWheelRadius },
      bbPosition: { x: 0, y: geometry.bbHeight },
      pivotPosition: pivot,
      swingarmEyePosition: chosenEye,
      frontAxlePosition: { x: 0, y: 0 },
      shockLength: currentShockLength,
      leverageRatio: 0,
      antiSquat: 0,
      antiRise: 0,
      pedalKickback: 0,
      chainGrowth: 0,
      totalChainGrowth: 0,
      wheelRate: 0,
      trail: 0,
      crankAngle: 0,
      forkCompression: 0,
      pitchAngleDegrees: 0,
    };
  }

  const horizontalDist = Math.sqrt(horizontalDistSquared);

  const axle1: Point2D = {
    x: pivot.x + horizontalDist,
    y: rearWheelRadius,
  };
  const axle2: Point2D = {
    x: pivot.x - horizontalDist,
    y: rearWheelRadius,
  };

  const axle = axle1.x < axle2.x ? axle1 : axle2;

  // Calculate lever arm for anti-squat (geometry based)
  const chainringRadius = (32 * 12.7) / (2 * Math.PI);
  const cogRadius = (geometry.cogTeeth * 12.7) / (2 * Math.PI);

  const swingarmAngle = angle(pivot, axle);
  const swingarmVector = {
    x: Math.cos(swingarmAngle),
    y: Math.sin(swingarmAngle),
  };

  // Drive line direction (simplified - from chainring to cog)
  const chainringPos: Point2D = {
    x: geometry.chainringOffsetX,
    y: geometry.chainringOffsetY,
  };
  const cogPos: Point2D = {
    x: axle.x + geometry.chainringOffsetX,
    y: axle.y + geometry.chainringOffsetY,
  };

  const driveLineAngle = angle(chainringPos, cogPos);
  const driveLineVector = {
    x: Math.cos(driveLineAngle),
    y: Math.sin(driveLineAngle),
  };

  // Anti-squat: component of drive line perpendicular to swingarm
  const perpDot =
    -driveLineVector.x * swingarmVector.y +
    driveLineVector.y * swingarmVector.x;
  const antiSquat = Math.max(0, Math.min(100, perpDot * 100));

  // Anti-rise: similar calculation for braking (opposite of drive line)
  const antiRise = Math.max(0, Math.min(100, -perpDot * 100));

  const leverageRatio = eyeToAxleDistance / distance(chosenEye, axle);

  const state: KinematicState = {
    travelMM: shockStroke,
    rearAxlePosition: axle,
    bbPosition: { x: 0, y: geometry.bbHeight },
    pivotPosition: pivot,
    swingarmEyePosition: chosenEye,
    frontAxlePosition: { x: 0, y: 0 },
    shockLength: currentShockLength,
    leverageRatio,
    antiSquat,
    antiRise,
    pedalKickback: 0,
    chainGrowth: 0,
    totalChainGrowth: 0,
    wheelRate: geometry.shockSpringRate * leverageRatio * leverageRatio,
    trail: 0,
    crankAngle: 0,
    forkCompression: 0,
    pitchAngleDegrees: 0,
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
