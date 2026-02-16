// Kinematic analysis engine
import {
  BikeGeometry,
  KinematicState,
  KinematicStateFirstPass,
  AnalysisResults,
  Point2D,
  computedProperties,
  Circle,
  IdlerType,
} from "./types";
import {
  distance,
  angle,
  circleCircleIntersection,
  sprocketRadius,
  transformPointByReferenceLine,
  tangentPoints,
  lineIntersection,
  lineIntersectionWithVertical,
} from "./geometry";

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

    state.trail = computeTrail(state, geometry);

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

export const getIdlerPosition = (
  state: KinematicState,
  geometry: BikeGeometry,
): Point2D | null => {
  if (geometry.idlerType === IdlerType.None) {
    return null;
  } else if (geometry.idlerType === IdlerType.FrameMounted) {
    return Point2D.add(state.bbPosition, {
      x: geometry.idlerX,
      y: geometry.idlerY,
    });
  } else {
    // Swingarm-mounted idler
    const rearWheelRadius = computedProperties.rearWheelRadius(geometry);
    const topOutIdler = {
      x: geometry.idlerX,
      y: geometry.bbHeight + geometry.idlerY,
    };
    const topOutPivot = {
      x: geometry.bbToPivotX,
      y: geometry.bbHeight + geometry.bbToPivotY,
    };

    const topOutPivotToAxleVertDist = rearWheelRadius - topOutPivot.y;
    const topOutPivotToAxleHorizDist = Math.sqrt(
      geometry.swingarmLength * geometry.swingarmLength -
        topOutPivotToAxleVertDist * topOutPivotToAxleVertDist,
    );
    const topOutAxle = {
      x: topOutPivot.x - topOutPivotToAxleHorizDist,
      y: rearWheelRadius,
    };
    return transformPointByReferenceLine(
      topOutPivot,
      topOutAxle,
      topOutIdler,
      state.pivotPosition,
      state.rearAxlePosition,
    );
  }
};

const getFrontSprocketCircle = (
  state: KinematicState,
  geometry: BikeGeometry,
): Circle => {
  if (geometry.idlerType === IdlerType.None) {
    const center = Point2D.add(state.bbPosition, {
      x: geometry.chainringOffsetX,
      y: geometry.chainringOffsetY,
    });
    const radius = sprocketRadius(geometry.chainringTeeth);
    return { center, radius };
  } else {
    const radius = sprocketRadius(geometry.idlerTeeth);
    const center = getIdlerPosition(state, geometry)!;
    return { center, radius };
  }
};

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

export function getRotatedCentreOfMass(
  state: KinematicState,
  geometry: BikeGeometry,
  applyPitchRotation: (p: Point2D) => Point2D,
): Point2D {
  return applyPitchRotation(
    Point2D.add(state.bbPosition, {
      x: geometry.comX,
      y: geometry.comY,
    }),
  );
}

function calculateVisualAntiSquat(
  state: KinematicState,
  geometry: BikeGeometry,
  { sprocketTangent = true }: { sprocketTangent?: boolean } = {},
): number {
  const applyPitchRotation = getApplyPitchRotation(
    state.rearAxlePosition,
    state.pitchAngleDegrees,
  );
  const frontSprocket = getFrontSprocketCircle(state, geometry);
  const frontSprocketRotated = {
    center: applyPitchRotation(frontSprocket.center),
    radius: frontSprocket.radius,
  };
  const rearSprocketRotated = {
    center: applyPitchRotation(state.rearAxlePosition),
    radius: computedProperties.rearWheelRadius(geometry),
  };
  const { start: chainlineStart, end: chainlineEnd } = sprocketTangent
    ? tangentPoints(
        frontSprocketRotated.center,
        frontSprocketRotated.radius,
        rearSprocketRotated.center,
        rearSprocketRotated.radius,
      )
    : { start: frontSprocketRotated.center, end: rearSprocketRotated.center };

  const instantCenter = applyPitchRotation(state.pivotPosition);
  const rearAxleRotated = applyPitchRotation(state.rearAxlePosition);
  const frontAxleRotated = applyPitchRotation(state.frontAxlePosition);
  const instantForceCenter = lineIntersection(
    chainlineStart,
    chainlineEnd,
    instantCenter,
    rearAxleRotated,
  );
  if (!instantForceCenter) {
    console.warn(
      "No instant force center intersection found for anti-squat calculation",
    );
    return 0;
  }

  const rearContactPatch = { x: rearAxleRotated.x, y: 0 };
  const antiSquatIntersection = lineIntersectionWithVertical(
    rearContactPatch,
    instantForceCenter,
    frontAxleRotated.x,
  );
  if (!antiSquatIntersection) {
    console.warn(
      "No anti-squat intersection found for anti-squat calculation",
      {
        rearContactPatch,
        instantForceCenter,
        frontAxleRotated,
        rearAxleRotated,
        instantCenter,
        chainlineStart,
        chainlineEnd,
      },
    );
    return 0;
  }

  const centreOfMassHeight = getRotatedCentreOfMass(
    state,
    geometry,
    applyPitchRotation,
  ).y;
  return (antiSquatIntersection.y / centreOfMassHeight) * 100;
}

function calculateVisualAntiRise(
  state: KinematicState,
  geometry: BikeGeometry,
): number {
  
  const applyPitchRotation = getApplyPitchRotation(
    state.rearAxlePosition,
    state.pitchAngleDegrees,
  );

  const instantCenter = applyPitchRotation(state.pivotPosition);
  const rearAxleRotated = applyPitchRotation(state.rearAxlePosition);
  const frontAxleRotated = applyPitchRotation(state.frontAxlePosition);

  const antiriseIntersection = lineIntersectionWithVertical(
    rearAxleRotated,
    instantCenter,
    frontAxleRotated.x,
  );
  if (!antiriseIntersection) {
    console.warn("No anti-rise intersection found for anti-rise calculation", {
      instantCenter,
      rearAxleRotated,
      frontAxleRotated,
    });
    return 0;
  }
  const centreOfMassHeight = getRotatedCentreOfMass(
    state,
    geometry,
    applyPitchRotation,
  ).y;

  return (antiriseIntersection.y / centreOfMassHeight) * 100;
}

function computeTrail(state: KinematicState, geometry: BikeGeometry): number {
  // Calculate perpendicular distance from contact patch to head tube line (in screen/pitch-rotated space)
  const contactPatch = { x: state.frontAxlePosition.x, y: 0 };
  const applyPitchRotation = getApplyPitchRotation(
    state.rearAxlePosition,
    state.pitchAngleDegrees,
  );

  const headtubeTop = computedProperties.headTubeTop(
    geometry,
    state.bbPosition,
  );
  const headtubeBottom = computedProperties.headTubeBottom(
    geometry,
    state.bbPosition,
  );
  const htTopRotated = applyPitchRotation(headtubeTop);
  const htBottomRotated = applyPitchRotation(headtubeBottom);

  const htVector = Point2D.subtract(htBottomRotated, htTopRotated);
  const numerator = Math.abs(
    htVector.y * (contactPatch.x - htTopRotated.x) -
      htVector.x * (contactPatch.y - htTopRotated.y),
  );
  const denominator = Math.sqrt(
    htVector.x * htVector.x + htVector.y * htVector.y,
  );
  return numerator / denominator;
}

