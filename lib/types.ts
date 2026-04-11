// MTB Suspension Analyzer Types
// Ported from Swift app

import { degreesToRadians, circleCircleIntersection } from "./geometry";

export interface Point2D {
  x: number;
  y: number;
}

export interface Circle {
  center: Point2D;
  radius: number;
}

export interface LineSegment {
  start: Point2D;
  end: Point2D;
}

export const Point2D = {
  zero: { x: 0, y: 0 } as Point2D,
  create: (x: number, y: number): Point2D => ({ x, y }),
  add: (a: Point2D, b: Point2D): Point2D => ({ x: a.x + b.x, y: a.y + b.y }),
  subtract: (a: Point2D, b: Point2D): Point2D => ({
    x: a.x - b.x,
    y: a.y - b.y,
  }),
  multiply: (p: Point2D, scalar: number): Point2D => ({
    x: p.x * scalar,
    y: p.y * scalar,
  }),
  distance: (a: Point2D, b: Point2D): number => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return Math.sqrt(dx * dx + dy * dy);
  },
  angle: (from: Point2D, to: Point2D): number => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    return Math.atan2(dy, dx);
  },
};

export enum IdlerType {
  None = "No Idler",
  FrameMounted = "Frame Mounted",
  SwingarmMounted = "Swingarm Mounted",
}

export type SuspensionType = "single-pivot" | "four-bar";

export interface BikeGeometry {
  // Frame - Primary Inputs
  bbHeight: number; // mm from ground
  stack: number; // mm
  reach: number; // mm
  headAngle: number; // degrees from horizontal
  headTubeLength: number; // mm
  seatAngle: number; // degrees from horizontal
  bbToPivotX: number; // mm (negative = behind BB)
  bbToPivotY: number; // mm (above BB)

  // Fork
  forkLength: number; // mm (axle to crown)
  forkOffset: number; // mm (rake)

  // Suspension
  totalTravel: number; // mm
  swingarmLength: number; // mm (pivot to rear axle)

  // Shock
  shockFrameMountX: number; // mm from BB
  shockFrameMountY: number; // mm from BB
  shockSwingarmMountDistance: number; // mm from pivot (radius)
  shockStroke: number; // mm
  shockETE: number; // mm (eye-to-eye at top-out)
  shockSpringRate: number; // N/mm

  // Drivetrain
  chainringTeeth: number;
  cogTeeth: number;
  chainringOffsetX: number; // mm from BB center
  chainringOffsetY: number; // mm from BB center

  // Idler
  idlerType: IdlerType;
  idlerX: number; // mm from BB
  idlerY: number; // mm from BB
  idlerTeeth: number;

  // Center of Mass
  comX: number; // mm from BB (forward)
  comY: number; // mm from BB (up)

  // Wheels
  frontWheelDiameter: number; // mm
  rearWheelDiameter: number; // mm
  forkTravel: number; // mm
  forkCompressionPercent: number; // 0-100%

  // Frame Details
  seatTubeLength: number; // mm (vertical height)

  // Suspension type (undefined = 'single-pivot' for backward compat)
  suspensionType?: SuspensionType;

  // 4-bar / Horst link parameters (used when suspensionType === 'four-bar')
  // All positions relative to BB at top-out (same convention as bbToPivotX/Y)
  bbToHorstFramePivotX?: number; // Frame pivot B (Horst link frame mount), X from BB
  bbToHorstFramePivotY?: number; // Frame pivot B, Y from BB
  horstCouplerPivotCX?: number;  // Coupler pivot C (connects to A) at top-out, X from BB
  horstCouplerPivotCY?: number;  // Coupler pivot C at top-out, Y from BB
  horstCouplerPivotDX?: number;  // Coupler pivot D (connects to B) at top-out, X from BB
  horstCouplerPivotDY?: number;  // Coupler pivot D at top-out, Y from BB
  horstShockCouplerMountX?: number; // Shock coupler mount S at top-out, X from BB
  horstShockCouplerMountY?: number; // Shock coupler mount S at top-out, Y from BB
}

export function createDefaultGeometry({
  overrides,
}: { overrides?: Partial<BikeGeometry> } = {}): BikeGeometry {
  return {
    bbHeight: 330.0,
    stack: 625.0,
    reach: 490.0,
    headAngle: 64.0,
    headTubeLength: 80.0,
    seatAngle: 76.0,
    bbToPivotX: -80.0,
    bbToPivotY: 210.0,
    forkLength: 590.0,
    forkOffset: 44.0,
    totalTravel: 150.0,
    swingarmLength: 440.0,
    shockFrameMountX: 30.0,
    shockFrameMountY: 70.0,
    shockSwingarmMountDistance: 190.0,
    shockStroke: 65.0,
    shockETE: 210.0,
    shockSpringRate: 60.0,
    chainringTeeth: 32,
    cogTeeth: 28,
    chainringOffsetX: 0.0,
    chainringOffsetY: 0.0,
    idlerType: IdlerType.None,
    idlerX: -60.0,
    idlerY: 160.0,
    idlerTeeth: 16,
    comX: 100.0,
    comY: 860.0,
    frontWheelDiameter: 750.0,
    rearWheelDiameter: 750.0,
    forkTravel: 170.0,
    forkCompressionPercent: 0.0,
    seatTubeLength: 320.0,
    suspensionType: "single-pivot",
    // 4-bar defaults: a plausible Horst-link geometry (ignored when single-pivot)
    bbToHorstFramePivotX: 20.0,
    bbToHorstFramePivotY: 150.0,
    horstCouplerPivotCX: -80.0,
    horstCouplerPivotCY: 210.0,
    horstCouplerPivotDX: 200.0,
    horstCouplerPivotDY: 40.0,
    horstShockCouplerMountX: 60.0,
    horstShockCouplerMountY: 170.0,
    ...overrides,
  };
}

// A position stored in both the kinematic ground frame and the pitch-rotated frame
export interface KinematicPoint {
  world: Point2D;          // Kinematic ground frame (Y=0 is ground, rear wheel at Y=rearWheelRadius)
  wheelsOnGround: Point2D; // Pitch-rotated around rear axle (both contact patches level)
}

export interface KinematicState {
  travelMM: number;
  shockLength: number;
  pitchAngleDegrees: number;
  forkCompression: number;

  // Key frame positions in both coordinate systems
  rearAxle: KinematicPoint;
  frontAxle: KinematicPoint;
  bb: KinematicPoint;
  pivot: KinematicPoint;
  swingarmEye: KinematicPoint;

  // 4-bar / Horst link positions (undefined for single-pivot)
  horstLinkPivotB?: KinematicPoint; // Secondary frame pivot B
  horstJointC?: KinematicPoint;     // Coupler pivot C (connects to A)
  horstJointD?: KinematicPoint;     // Coupler pivot D (connects to B)

  // Dynamics
  leverageRatio: number;
  wheelRate: number;
  antiSquat: number;
  antiRise: number;
  pedalKickback: number;    // degrees, cumulative backward crank rotation from top-out
  chainGrowth: number;      // mm, cumulative chain path growth from top-out (single strand)
  totalChainGrowth: number; // mm, same as chainGrowth
  trail: number;
  crankAngle: number;       // degrees, negated pedalKickback; CCW on screen (left-side view) = backward rotation
}

// Extends KinematicState with geometry-derived positions, computed once per state
export interface BikeState extends KinematicState {
  // Frame tube endpoints
  headTubeTop: KinematicPoint;
  headTubeBottom: KinematicPoint;
  seatTop: KinematicPoint;
  forkBend: KinematicPoint; // end of stanchions (before axle offset)

  // Component positions
  shockFrameMount: KinematicPoint;
  chainringCenter: KinematicPoint;
  idler: KinematicPoint | null;
  centreOfMass: KinematicPoint;
}

export interface AnalysisResults {
  states: BikeState[];
  axlePath: Point2D[];
  frontAxlePath: Point2D[];
}

export enum GraphType {
  LeverageRatio = "Leverage Ratio",
  AntiSquat = "Anti-Squat",
  AntiRise = "Anti-Rise",
  PedalKickback = "Pedal Kickback",
  AxlePath = "Wheel Path",
  ChainGrowth = "Chain Growth",
  WheelRate = "Wheel Rate",
  Trail = "Trail",
  PitchAngle = "Pitch Angle",
}

export interface BikeDesign {
  name: string;
  geometry: BikeGeometry;
}

// Standalone linkage geometry used by the /linkage page.
// All positions are in world frame (Y measured from ground; Y=0 is ground level).
export interface LinkageGeometry {
  pivotA: Point2D;          // Main frame pivot (connects to coupler at C)
  pivotB: Point2D;          // Horst link frame pivot (connects to coupler at D)
  jointC: Point2D;          // Coupler pivot C at top-out (connects to A)
  jointD: Point2D;          // Coupler pivot D at top-out (connects to B)
  axleE: Point2D;           // Rear axle position at top-out
  shockFrameMount: Point2D; // Shock frame-side mount
  shockCouplerMount: Point2D; // Shock coupler-side mount at top-out
  shockETE: number;         // Eye-to-eye at top-out (mm)
  shockStroke: number;      // Total shock stroke (mm)
  shockSpringRate: number;  // Spring rate (N/mm)
  rearWheelRadius: number;  // mm
}

export function createDefaultLinkageGeometry(): LinkageGeometry {
  // A plausible Horst-link layout in world frame (Y = height above ground)
  return {
    pivotA: { x: -80, y: 540 },        // Main pivot (near BB height)
    pivotB: { x: 20, y: 480 },         // Horst link frame mount (lower, slightly forward)
    jointC: { x: -80, y: 540 },        // C = A at top-out (for default: C coincides with A to start)
    jointD: { x: 200, y: 370 },        // D near axle (Horst link coupler end)
    axleE: { x: 360, y: 375 },         // Rear axle at top-out
    shockFrameMount: { x: 30, y: 400 },
    shockCouplerMount: { x: 60, y: 500 },
    shockETE: 210,
    shockStroke: 65,
    shockSpringRate: 60,
    rearWheelRadius: 375,
  };
}

// Length-based parameterisation for the /linkage page.
// Frame pivot positions (A, B, F) are still world-frame coordinates;
// everything else is expressed as lengths and angles so the geometry is
// always self-consistent.
export interface LinkageLengthParams {
  // Fixed frame positions (world frame, Y = height above ground)
  pivotA: Point2D;          // Main frame pivot A
  pivotB: Point2D;          // Horst link frame pivot B
  shockFrameMount: Point2D; // Shock frame mount F

  // Link lengths
  armLength: number;        // |A–C|  (main arm)
  crankAngleDeg: number;    // Angle of A→C at top-out, degrees from horizontal
  couplerLength: number;    // |C–D|  (coupler link)
  horstLength: number;      // |B–D|  (Horst link)

  // Rear axle position on the coupler body, in the C→D local frame:
  //   forward = along C→D direction; perp = 90° CCW from forward (typically negative = below)
  axleForward: number;
  axlePerp: number;

  // Shock coupler mount on the coupler body, same frame as axle
  shockMountForward: number;
  shockMountPerp: number;

  // Shock and wheel
  shockETE: number;
  shockStroke: number;
  shockSpringRate: number;
  rearWheelRadius: number;
}

// Default: parallelogram 4-bar (1:1 leverage ratio) that is guaranteed to produce
// valid, monotone analysis results.
// A=(0,540), B=(0,480), C0=(80,480), D0=(80,420), E=(240,375), S=(110,480), F=(110,690)
export function createDefaultLinkageLengthParams(): LinkageLengthParams {
  return {
    pivotA: { x: 0, y: 540 },
    pivotB: { x: 0, y: 480 },
    shockFrameMount: { x: 110, y: 690 },
    armLength: 100,
    crankAngleDeg: -36.87, // atan2(-60, 80) — arm points backward-downward at top-out
    couplerLength: 60,
    horstLength: 100,
    axleForward: 105,   // axle is 105 mm along the C→D direction from C
    axlePerp: 160,      // axle is 160 mm to the left of (CCW from) the C→D direction
    shockMountForward: 0,
    shockMountPerp: 30,
    shockETE: 210,
    shockStroke: 65,
    shockSpringRate: 60,
    rearWheelRadius: 375,
  };
}

// Convert length-based params to the coordinate-based LinkageGeometry expected
// by the analysis engine.  The conversion is purely geometric and always produces
// a valid (though possibly degenerate if link lengths violate the triangle
// inequality) coordinate set.
export function lengthParamsToCoordinates(p: LinkageLengthParams): LinkageGeometry {
  const alpha0 = degreesToRadians(p.crankAngleDeg);
  const A = p.pivotA;

  // C = A + armLength * (cos α, sin α)
  const C: Point2D = {
    x: A.x + p.armLength * Math.cos(alpha0),
    y: A.y + p.armLength * Math.sin(alpha0),
  };

  // D = one of the two intersections of circle(C, couplerLength) and circle(B, horstLength).
  // Convention: pick the candidate with the lower Y value (D is always below C in a
  // Horst-link design).  Falls back to a straight-down point when circles don't intersect.
  const dCandidates = circleCircleIntersection(C, p.couplerLength, p.pivotB, p.horstLength);
  let D: Point2D;
  if (dCandidates.length === 0) {
    D = { x: C.x, y: C.y - p.couplerLength };
  } else if (dCandidates.length === 1) {
    D = dCandidates[0];
  } else {
    D = dCandidates[0].y <= dCandidates[1].y ? dCandidates[0] : dCandidates[1];
  }

  // Coupler body frame at top-out: forward = C→D direction, perp = 90° CCW
  const couplerAngle = Math.atan2(D.y - C.y, D.x - C.x);
  const cosA = Math.cos(couplerAngle);
  const sinA = Math.sin(couplerAngle);
  const fwdX = cosA, fwdY = sinA;
  const perpX = -sinA, perpY = cosA;

  const E: Point2D = {
    x: C.x + p.axleForward * fwdX + p.axlePerp * perpX,
    y: C.y + p.axleForward * fwdY + p.axlePerp * perpY,
  };
  const S: Point2D = {
    x: C.x + p.shockMountForward * fwdX + p.shockMountPerp * perpX,
    y: C.y + p.shockMountForward * fwdY + p.shockMountPerp * perpY,
  };

  return {
    pivotA: A,
    pivotB: p.pivotB,
    jointC: C,
    jointD: D,
    axleE: E,
    shockFrameMount: p.shockFrameMount,
    shockCouplerMount: S,
    shockETE: p.shockETE,
    shockStroke: p.shockStroke,
    shockSpringRate: p.shockSpringRate,
    rearWheelRadius: p.rearWheelRadius,
  };
}

export const computedProperties = {
  frontWheelRadius: (geometry: BikeGeometry) => geometry.frontWheelDiameter / 2,
  rearWheelRadius: (geometry: BikeGeometry) => geometry.rearWheelDiameter / 2,
  headTubeTop: (
    geometry: BikeGeometry,
    bb: Point2D = { x: 0, y: 0 },
  ): Point2D => {
    return { x: bb.x + geometry.reach, y: bb.y + geometry.stack };
  },
  headTubeAngleRadians: (geometry: BikeGeometry): number => {
    return degreesToRadians(geometry.headAngle);
  },
  headTubeBottom: (
    geometry: BikeGeometry,
    bb: Point2D = { x: 0, y: 0 },
  ): Point2D => {
    const headTubeTop = computedProperties.headTubeTop(geometry, bb);
    const htaRad = computedProperties.headTubeAngleRadians(geometry);
    return {
      x: headTubeTop.x + geometry.headTubeLength * Math.cos(htaRad),
      y: headTubeTop.y - geometry.headTubeLength * Math.sin(htaRad),
    };
  },
  calculateFrontCenter: (geometry: BikeGeometry): number => {
    const htaRad = computedProperties.headTubeAngleRadians(geometry);
    const headTubeBottom = computedProperties.headTubeBottom(geometry);
    const axleX =
      headTubeBottom.x +
      geometry.forkLength * Math.cos(htaRad) +
      geometry.forkOffset * Math.sin(htaRad);
    return axleX;
  },
};

export interface VisualizationBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  padding: number;
  scale: number;
}

export interface BoundsConversions {
  scale: number;
  padding: number;
  width: number;
  height: number;
  toCanvas: (point: Point2D) => Point2D;
  toCanvasX: (x: number) => number;
  toCanvasY: (y: number) => number;
}

export const getScreenConversions = (
  bounds: VisualizationBounds,
): BoundsConversions => {
  const { minX, maxX, minY, maxY, padding, scale } = bounds;

  const width = (maxX - minX) * scale + padding * 2;
  const height = (maxY - minY) * scale + padding * 2;

  const toCanvasX = (x: number): number => {
    return (x - minX) * scale + padding;
  };

  const toCanvasY = (y: number): number => {
    return height - ((y - minY) * scale + padding);
  };

  return {
    padding,
    scale,
    width,
    height,
    toCanvas: (point: Point2D): Point2D => ({
      x: toCanvasX(point.x),
      y: toCanvasY(point.y),
    }),
    toCanvasX: toCanvasX,
    toCanvasY: toCanvasY,
  };
};