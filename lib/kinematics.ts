// Kinematic analysis engine
import {
  BikeGeometry,
  KinematicState,
  KinematicPoint,
  BikeState,
  AnalysisResults,
  Point2D,
  computedProperties,
  Circle,
  IdlerType,
  LineSegment,
} from "./types";
import {
  distance,
  angle,
  circleCircleIntersection,
  sprocketRadius,
  calculateChainLength,
  transformPointByReferenceLine,
  tangentPoints,
  lineIntersection,
  lineIntersectionWithVertical,
  degreesToRadians,
} from "./geometry";

interface RigidTriangle {
  pivotToEye: number;
  pivotToAxle: number;
  eyeToAxle: number;
  correctEyeIndex: number;
  axleAngleIsPositive: boolean;
}

// Internal first-pass state — not exported
interface FirstPassState {
  travelMM: number;
  rearAxlePosition: Point2D;
  bbPosition: Point2D;
  pivotPosition: Point2D;
  swingarmEyePosition: Point2D;
  shockLength: number;
  proportionalForkStroke: number;
}

export function runKinematicAnalysis(geometry: BikeGeometry): AnalysisResults {
  const rigidTriangle = establishRigidTriangle(geometry);

  const stepSize = 0.5; // mm - finer steps for smoother graphs
  const strokeSteps = Math.floor(geometry.shockStroke / stepSize) + 1;

  // First pass: calculate basic geometric state from shock stroke only
  const firstPassStates: FirstPassState[] = [];
  for (let step = 0; step < strokeSteps; step++) {
    const shockStroke = step * stepSize;
    const travelRatio = shockStroke / geometry.shockStroke;
    const proportionalForkStroke = travelRatio * geometry.forkTravel;
    const state = calculateStateAtShockStroke(shockStroke, geometry, rigidTriangle);
    firstPassStates.push({ ...state, proportionalForkStroke });
  }

  // Second pass: build full BikeState with no dummy initialisation
  const states: BikeState[] = [];
  const axlePath: Point2D[] = [];
  const frontAxlePath: Point2D[] = [];

  const referenceChainLength = calculateDrivetrainChainLength(
    firstPassStates[0].bbPosition,
    firstPassStates[0].pivotPosition,
    firstPassStates[0].rearAxlePosition,
    geometry,
  );
  const chainringRadius = sprocketRadius(geometry.chainringTeeth);

  for (let i = 0; i < firstPassStates.length; i++) {
    const fp = firstPassStates[i];

    // Front axle with proportional fork compression
    const htaRad = computedProperties.headTubeAngleRadians(geometry);
    const effectiveForkLength = geometry.forkLength - fp.proportionalForkStroke;
    const frontAxlePos: Point2D = {
      x:
        fp.bbPosition.x +
        geometry.reach +
        geometry.headTubeLength * Math.cos(htaRad) +
        effectiveForkLength * Math.cos(htaRad) +
        geometry.forkOffset * Math.sin(htaRad),
      y:
        fp.bbPosition.y +
        geometry.stack -
        geometry.headTubeLength * Math.sin(htaRad) -
        effectiveForkLength * Math.sin(htaRad) +
        geometry.forkOffset * Math.cos(htaRad),
    };

    // Pitch angle from actual front axle position
    const dx = frontAxlePos.x - fp.rearAxlePosition.x;
    const dy = frontAxlePos.y - fp.rearAxlePosition.y;
    const centerDist = Math.sqrt(dx * dx + dy * dy);
    const centerAngle = Math.atan2(dy, dx);
    const frontWheelRadius = computedProperties.frontWheelRadius(geometry);
    const rearWheelRadius = computedProperties.rearWheelRadius(geometry);
    const radiusDiff = frontWheelRadius - rearWheelRadius;
    const angleOffset = Math.asin(radiusDiff / centerDist);
    const pitchAngleDegrees = ((centerAngle - angleOffset) * 180.0) / Math.PI;

    // Build pitch rotation function once for this state
    const applyPitchRotation = getApplyPitchRotation(fp.rearAxlePosition, pitchAngleDegrees);
    const toKP = (p: Point2D): KinematicPoint => ({
      world: p,
      wheelsOnGround: applyPitchRotation(p),
    });

    // Leverage ratio (numerical derivative)
    let leverageRatio: number;
    if (i === 0) {
      if (firstPassStates.length > 1) {
        const dTravel = firstPassStates[i + 1].travelMM - firstPassStates[i].travelMM;
        leverageRatio = dTravel / stepSize;
      } else {
        leverageRatio = 1.0;
      }
    } else if (i === firstPassStates.length - 1) {
      const dTravel = firstPassStates[i].travelMM - firstPassStates[i - 1].travelMM;
      leverageRatio = dTravel / stepSize;
    } else {
      const dTravel = firstPassStates[i + 1].travelMM - firstPassStates[i - 1].travelMM;
      leverageRatio = dTravel / (2 * stepSize);
    }

    const wheelRate = geometry.shockSpringRate / (leverageRatio * leverageRatio);

    const antiSquat = calculateVisualAntiSquat(fp, frontAxlePos, geometry, applyPitchRotation);
    const antiRise = calculateVisualAntiRise(fp, frontAxlePos, geometry, applyPitchRotation);
    const trail = computeTrail(fp, frontAxlePos, geometry, applyPitchRotation);

    // Geometry-derived positions
    const headTubeTopWorld = computedProperties.headTubeTop(geometry, fp.bbPosition);
    const headTubeBottomWorld = computedProperties.headTubeBottom(geometry, fp.bbPosition);
    const seatAngleRad = degreesToRadians(geometry.seatAngle);
    const seatTopWorld: Point2D = {
      x: fp.bbPosition.x - geometry.seatTubeLength * Math.cos(seatAngleRad),
      y: fp.bbPosition.y + geometry.seatTubeLength * Math.sin(seatAngleRad),
    };
    const cosHT = Math.cos(htaRad);
    const sinHT = Math.sin(htaRad);
    const forkBendWorld: Point2D = {
      x: headTubeBottomWorld.x + effectiveForkLength * cosHT,
      y: headTubeBottomWorld.y - effectiveForkLength * sinHT,
    };
    const shockFrameMountWorld: Point2D = {
      x: fp.bbPosition.x + geometry.shockFrameMountX,
      y: fp.bbPosition.y + geometry.shockFrameMountY,
    };
    const chainringCenterWorld: Point2D = {
      x: fp.bbPosition.x + geometry.chainringOffsetX,
      y: fp.bbPosition.y + geometry.chainringOffsetY,
    };
    const idlerWorld = idlerPositionFromWorld(
      fp.bbPosition,
      fp.pivotPosition,
      fp.rearAxlePosition,
      geometry,
    );
    const centreOfMassWorld: Point2D = {
      x: fp.bbPosition.x + geometry.comX,
      y: fp.bbPosition.y + geometry.comY,
    };

    const currentChainLength = calculateDrivetrainChainLength(
      fp.bbPosition,
      fp.pivotPosition,
      fp.rearAxlePosition,
      geometry,
    );
    const chainGrowth = (currentChainLength - referenceChainLength) / 2;
    const totalChainGrowth = chainGrowth;
    const pedalKickback = (chainGrowth / chainringRadius) * (180 / Math.PI);
    const crankAngle = pedalKickback;

    const state: BikeState = {
      travelMM: fp.travelMM,
      shockLength: fp.shockLength,
      pitchAngleDegrees,
      forkCompression: fp.proportionalForkStroke,
      rearAxle: toKP(fp.rearAxlePosition),
      frontAxle: toKP(frontAxlePos),
      bb: toKP(fp.bbPosition),
      pivot: toKP(fp.pivotPosition),
      swingarmEye: toKP(fp.swingarmEyePosition),
      leverageRatio,
      wheelRate,
      antiSquat,
      antiRise,
      pedalKickback,
      chainGrowth,
      totalChainGrowth,
      trail,
      crankAngle,
      headTubeTop: toKP(headTubeTopWorld),
      headTubeBottom: toKP(headTubeBottomWorld),
      seatTop: toKP(seatTopWorld),
      forkBend: toKP(forkBendWorld),
      shockFrameMount: toKP(shockFrameMountWorld),
      chainringCenter: toKP(chainringCenterWorld),
      idler: idlerWorld ? toKP(idlerWorld) : null,
      centreOfMass: toKP(centreOfMassWorld),
    };

    states.push(state);
    axlePath.push(Point2D.subtract(fp.rearAxlePosition, fp.bbPosition));
    frontAxlePath.push(Point2D.subtract(frontAxlePos, fp.bbPosition));
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

  // Compute axle position first — needed for both eye selection and rigid triangle.
  const verticalDist = rearWheelRadius - pivot.y;
  const horizontalDistSquared =
    geometry.swingarmLength * geometry.swingarmLength - verticalDist * verticalDist;

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

  // Physics-based eye selection: the correct candidate is the one where
  // compressing the shock moves the axle upward (positive wheel travel).
  // Simulate 0.1 mm of compression and check which candidate produces
  // a nominal axle Y above ground level.
  const TEST_COMPRESSION = 0.1;
  const testEyeCandidates = circleCircleIntersection(
    pivot,
    geometry.shockSwingarmMountDistance,
    frameMount,
    geometry.shockETE - TEST_COMPRESSION,
  );

  let correctEyeIndex: number;
  if (testEyeCandidates.length === 2) {
    const pivotToAxleDist = distance(pivot, axle);
    const physicsIndex = eyeCandidates.findIndex((eye, i) => {
      const pivotToEyeDist = distance(pivot, eye);
      const eyeToAxleDist = distance(eye, axle);
      const cosA =
        (pivotToEyeDist * pivotToEyeDist +
          pivotToAxleDist * pivotToAxleDist -
          eyeToAxleDist * eyeToAxleDist) /
        (2 * pivotToEyeDist * pivotToAxleDist);
      if (cosA < -1 || cosA > 1) return false;
      const angleAtPivot = Math.acos(cosA);
      const pivotToEyeAngle = angle(pivot, eye);
      const testAxlePlus: Point2D = {
        x: pivot.x + pivotToAxleDist * Math.cos(pivotToEyeAngle + angleAtPivot),
        y: pivot.y + pivotToAxleDist * Math.sin(pivotToEyeAngle + angleAtPivot),
      };
      const testAxleMinus: Point2D = {
        x: pivot.x + pivotToAxleDist * Math.cos(pivotToEyeAngle - angleAtPivot),
        y: pivot.y + pivotToAxleDist * Math.sin(pivotToEyeAngle - angleAtPivot),
      };
      const axleAngleIsPositive = distance(testAxlePlus, axle) < distance(testAxleMinus, axle);
      // Compute where the axle ends up after the tiny compression using this candidate's params.
      // circleCircleIntersection returns points in consistent order (same perpendicular
      // direction to the pivot–frameMount axis), so index i is safe to use here.
      const testEye = testEyeCandidates[i];
      const pivotToTestEyeDist = distance(pivot, testEye);
      const cosTestA =
        (pivotToTestEyeDist * pivotToTestEyeDist +
          pivotToAxleDist * pivotToAxleDist -
          eyeToAxleDist * eyeToAxleDist) /
        (2 * pivotToTestEyeDist * pivotToAxleDist);
      if (cosTestA < -1 || cosTestA > 1) return false;
      const testAngleAtPivot = Math.acos(cosTestA);
      const testPivotToEyeAngle = angle(pivot, testEye);
      const testAxleAngle = axleAngleIsPositive
        ? testPivotToEyeAngle + testAngleAtPivot
        : testPivotToEyeAngle - testAngleAtPivot;
      const compressedNominalAxleY = pivot.y + pivotToAxleDist * Math.sin(testAxleAngle);
      return compressedNominalAxleY > rearWheelRadius;
    });
    correctEyeIndex =
      physicsIndex !== -1
        ? physicsIndex
        : eyeCandidates[0].x > eyeCandidates[1].x
          ? 0
          : 1;
  } else {
    // Fallback: compressed circles don't intersect, use X-coordinate heuristic.
    correctEyeIndex = eyeCandidates[0].x > eyeCandidates[1].x ? 0 : 1;
  }

  const chosenEye = eyeCandidates[correctEyeIndex];

  const pivotToEyeDist = distance(pivot, chosenEye);
  const pivotToAxleDist = distance(pivot, axle);
  const eyeToAxleDist = distance(chosenEye, axle);

  const cosAngle =
    (pivotToEyeDist * pivotToEyeDist +
      pivotToAxleDist * pivotToAxleDist -
      eyeToAxleDist * eyeToAxleDist) /
    (2 * pivotToEyeDist * pivotToAxleDist);
  const angleAtPivot = Math.acos(cosAngle);

  const pivotToEyeAngle = angle(pivot, chosenEye);

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
): Omit<FirstPassState, "proportionalForkStroke"> {
  const rearWheelRadius = computedProperties.rearWheelRadius(geometry);

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
    };
  }

  const chosenEye = eyeCandidates[rigidTriangle.correctEyeIndex];

  const pivotToEyeDist = distance(pivot, chosenEye);
  const pivotToAxleDist = rigidTriangle.pivotToAxle;

  const cosAngle =
    (pivotToEyeDist * pivotToEyeDist +
      pivotToAxleDist * pivotToAxleDist -
      eyeToAxleDistance * eyeToAxleDistance) /
    (2 * pivotToEyeDist * pivotToAxleDist);
  const angleAtPivot = Math.acos(cosAngle);

  const pivotToEyeAngle = angle(pivot, chosenEye);
  const axleAngle = rigidTriangle.axleAngleIsPositive
    ? pivotToEyeAngle + angleAtPivot
    : pivotToEyeAngle - angleAtPivot;

  const nominalAxle: Point2D = {
    x: pivot.x + pivotToAxleDist * Math.cos(axleAngle),
    y: pivot.y + pivotToAxleDist * Math.sin(axleAngle),
  };

  const groundOffset = nominalAxle.y - rearWheelRadius;
  const bbY = geometry.bbHeight - groundOffset;

  const rearAxlePos: Point2D = { x: nominalAxle.x, y: rearWheelRadius };
  const bbPos: Point2D = { x: 0, y: bbY };
  const pivotPos: Point2D = { x: geometry.bbToPivotX, y: pivot.y - groundOffset };
  const swingarmEyePos: Point2D = {
    x: chosenEye.x,
    y: chosenEye.y - groundOffset,
  };
  const finalFrameMount: Point2D = {
    x: geometry.shockFrameMountX,
    y: bbY + geometry.shockFrameMountY,
  };

  const shockLength = distance(finalFrameMount, swingarmEyePos);
  const wheelTravel = Math.abs(geometry.bbHeight - bbY);

  return {
    travelMM: wheelTravel,
    rearAxlePosition: rearAxlePos,
    bbPosition: bbPos,
    pivotPosition: pivotPos,
    swingarmEyePosition: swingarmEyePos,
    shockLength,
  };
}

// Internal helper: resolves idler position from raw world-frame points.
// Used both during KinematicState construction and via the public getIdlerPosition.
function idlerPositionFromWorld(
  bbPos: Point2D,
  pivotPos: Point2D,
  rearAxlePos: Point2D,
  geometry: BikeGeometry,
): Point2D | null {
  if (geometry.idlerType === IdlerType.None) {
    return null;
  } else if (geometry.idlerType === IdlerType.FrameMounted) {
    return Point2D.add(bbPos, { x: geometry.idlerX, y: geometry.idlerY });
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
      pivotPos,
      rearAxlePos,
    );
  }
}

export const getIdlerPosition = (
  state: KinematicState,
  geometry: BikeGeometry,
): Point2D | null => {
  return idlerPositionFromWorld(
    state.bb.world,
    state.pivot.world,
    state.rearAxle.world,
    geometry,
  );
};

function getFrontSprocketCircle(
  bbPos: Point2D,
  pivotPos: Point2D,
  rearAxlePos: Point2D,
  geometry: BikeGeometry,
): Circle {
  if (geometry.idlerType === IdlerType.None) {
    const center = Point2D.add(bbPos, {
      x: geometry.chainringOffsetX,
      y: geometry.chainringOffsetY,
    });
    return { center, radius: sprocketRadius(geometry.chainringTeeth) };
  } else {
    const radius = sprocketRadius(geometry.idlerTeeth);
    const center = idlerPositionFromWorld(bbPos, pivotPos, rearAxlePos, geometry)!;
    return { center, radius };
  }
}

function getRearSprocketCircle(
  bbPos: Point2D,
  pivotPos: Point2D,
  rearAxlePos: Point2D,
  geometry: BikeGeometry,
): Circle {
  if (
    geometry.idlerType === IdlerType.None ||
    geometry.idlerType === IdlerType.FrameMounted
  ) {
    return { center: rearAxlePos, radius: sprocketRadius(geometry.cogTeeth) };
  } else {
    const center = idlerPositionFromWorld(bbPos, pivotPos, rearAxlePos, geometry)!;
    return { center, radius: sprocketRadius(geometry.idlerTeeth) };
  }
}

// Returns the length of the chain segment that changes with suspension travel.
// For IdlerType.None: chainring-to-cog.
// For FrameMounted: idler-to-cog (chainring-to-idler is frame-fixed, constant).
// For SwingarmMounted: chainring-to-idler (idler-to-cog is swingarm-fixed, constant).
function calculateDrivetrainChainLength(
  bbPos: Point2D,
  pivotPos: Point2D,
  rearAxlePos: Point2D,
  geometry: BikeGeometry,
): number {
  const chainringCenter: Point2D = {
    x: bbPos.x + geometry.chainringOffsetX,
    y: bbPos.y + geometry.chainringOffsetY,
  };
  const chainringRadius = sprocketRadius(geometry.chainringTeeth);
  const cogRadius = sprocketRadius(geometry.cogTeeth);

  if (geometry.idlerType === IdlerType.None) {
    return calculateChainLength(chainringCenter, rearAxlePos, chainringRadius, cogRadius);
  }

  const idlerPos = idlerPositionFromWorld(bbPos, pivotPos, rearAxlePos, geometry)!;
  const idlerRadius = sprocketRadius(geometry.idlerTeeth);

  if (geometry.idlerType === IdlerType.FrameMounted) {
    return calculateChainLength(idlerPos, rearAxlePos, idlerRadius, cogRadius);
  } else {
    // SwingarmMounted
    return calculateChainLength(chainringCenter, idlerPos, chainringRadius, idlerRadius);
  }
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

export function getRotatedCentreOfMass(
  state: KinematicState,
  geometry: BikeGeometry,
  applyPitchRotation: (p: Point2D) => Point2D,
): Point2D {
  return applyPitchRotation(
    Point2D.add(state.bb.world, {
      x: geometry.comX,
      y: geometry.comY,
    }),
  );
}

// ---- Anti-squat types (exported for Calculations.tsx) ----
type AntiSquatStep1 = {
  chainForce: LineSegment;
  suspensionForce: LineSegment;
};
type AntiSquatStep2 = AntiSquatStep1 & {
  instantForceLine: LineSegment;
  frontContactPatch: Point2D;
};
type AntiSquatFinal = AntiSquatStep2 & {
  antiSquatIntersection: Point2D;
  centreOfMassHeight: number;
};
type AntiSquatCalculations = AntiSquatStep1 | AntiSquatStep2 | AntiSquatFinal;

// Internal: shared anti-squat computation using raw world-frame points + pre-built applyPitchRotation
function computeAntiSquatSteps(
  bbPos: Point2D,
  pivotPos: Point2D,
  rearAxlePos: Point2D,
  frontAxlePos: Point2D,
  applyPitchRotation: (p: Point2D) => Point2D,
  geometry: BikeGeometry,
  opts: { sprocketTangent?: boolean; warn?: boolean } = {},
): AntiSquatCalculations {
  const { sprocketTangent = true, warn = false } = opts;

  const frontSprocket = getFrontSprocketCircle(bbPos, pivotPos, rearAxlePos, geometry);
  const frontSprocketRotated = {
    center: applyPitchRotation(frontSprocket.center),
    radius: frontSprocket.radius,
  };
  const rearSprocket = getRearSprocketCircle(bbPos, pivotPos, rearAxlePos, geometry);
  const rearSprocketRotated = {
    center: applyPitchRotation(rearSprocket.center),
    radius: rearSprocket.radius,
  };

  const { start: chainlineStart, end: chainlineEnd } = sprocketTangent
    ? tangentPoints(
        frontSprocketRotated.center,
        frontSprocketRotated.radius,
        rearSprocketRotated.center,
        rearSprocketRotated.radius,
      )
    : { start: frontSprocketRotated.center, end: rearSprocketRotated.center };

  const instantCenter = applyPitchRotation(pivotPos);
  const rearAxleRotated = applyPitchRotation(rearAxlePos);
  const frontAxleRotated = applyPitchRotation(frontAxlePos);
  const instantForceCenter = lineIntersection(
    chainlineStart,
    chainlineEnd,
    instantCenter,
    rearAxleRotated,
  );

  const calculations: AntiSquatStep1 = {
    chainForce: { start: chainlineStart, end: chainlineEnd },
    suspensionForce: { start: instantCenter, end: rearAxleRotated },
  };

  if (!instantForceCenter) {
    if (warn)
      console.warn(
        "No instant force center intersection found for anti-squat calculation",
        calculations,
      );
    return calculations;
  }

  const rearContactPatch = { x: rearAxleRotated.x, y: 0 };
  const calculations2: AntiSquatStep2 = {
    ...calculations,
    instantForceLine: { start: instantForceCenter, end: rearContactPatch },
    frontContactPatch: { x: frontAxleRotated.x, y: 0 },
  };

  const antiSquatIntersection = lineIntersectionWithVertical(
    rearContactPatch,
    instantForceCenter,
    frontAxleRotated.x,
  );
  if (!antiSquatIntersection) {
    if (warn) console.warn("No anti-squat intersection found", calculations2);
    return calculations2;
  }

  const centreOfMassHeight = applyPitchRotation(
    Point2D.add(bbPos, { x: geometry.comX, y: geometry.comY }),
  ).y;

  return {
    ...calculations2,
    centreOfMassHeight,
    antiSquatIntersection,
  } satisfies AntiSquatFinal;
}

// Exported: used by Calculations.tsx to display anti-squat force lines
export const doAntiSquatCalculations = (
  state: KinematicState,
  geometry: BikeGeometry,
  opts: { sprocketTangent?: boolean; warn?: boolean } = {},
): AntiSquatCalculations => {
  const applyPitchRotation = getApplyPitchRotation(
    state.rearAxle.world,
    state.pitchAngleDegrees,
  );
  return computeAntiSquatSteps(
    state.bb.world,
    state.pivot.world,
    state.rearAxle.world,
    state.frontAxle.world,
    applyPitchRotation,
    geometry,
    opts,
  );
};

function calculateVisualAntiSquat(
  fp: FirstPassState,
  frontAxlePos: Point2D,
  geometry: BikeGeometry,
  applyPitchRotation: (p: Point2D) => Point2D,
  opts: { sprocketTangent?: boolean } = {},
): number {
  const calculations = computeAntiSquatSteps(
    fp.bbPosition,
    fp.pivotPosition,
    fp.rearAxlePosition,
    frontAxlePos,
    applyPitchRotation,
    geometry,
    opts,
  );
  if (!("antiSquatIntersection" in calculations)) return 0;
  const { antiSquatIntersection, centreOfMassHeight } = calculations;
  return (antiSquatIntersection.y / centreOfMassHeight) * 100;
}

function calculateVisualAntiRise(
  fp: FirstPassState,
  frontAxlePos: Point2D,
  geometry: BikeGeometry,
  applyPitchRotation: (p: Point2D) => Point2D,
): number {
  const instantCenter = applyPitchRotation(fp.pivotPosition);
  const rearAxleRotated = applyPitchRotation(fp.rearAxlePosition);
  const frontAxleRotated = applyPitchRotation(frontAxlePos);

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

  const centreOfMassHeight = applyPitchRotation(
    Point2D.add(fp.bbPosition, { x: geometry.comX, y: geometry.comY }),
  ).y;
  return (antiriseIntersection.y / centreOfMassHeight) * 100;
}

function computeTrail(
  fp: FirstPassState,
  frontAxlePos: Point2D,
  geometry: BikeGeometry,
  applyPitchRotation: (p: Point2D) => Point2D,
): number {
  const frontAxleRotated = applyPitchRotation(frontAxlePos);
  const contactPatch = { x: frontAxleRotated.x, y: 0 };
  const headtubeTop = computedProperties.headTubeTop(geometry, fp.bbPosition);
  const headtubeBottom = computedProperties.headTubeBottom(geometry, fp.bbPosition);
  const htTopRotated = applyPitchRotation(headtubeTop);
  const htBottomRotated = applyPitchRotation(headtubeBottom);

  const htVector = Point2D.subtract(htBottomRotated, htTopRotated);
  const numerator = Math.abs(
    htVector.y * (contactPatch.x - htTopRotated.x) -
      htVector.x * (contactPatch.y - htTopRotated.y),
  );
  const denominator = Math.sqrt(htVector.x * htVector.x + htVector.y * htVector.y);
  return numerator / denominator;
}
