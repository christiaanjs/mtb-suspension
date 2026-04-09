// MTB Suspension Analyzer Types
// Ported from Swift app

import { degreesToRadians } from "./geometry";

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

  // Dynamics
  leverageRatio: number;
  wheelRate: number;
  antiSquat: number;
  antiRise: number;
  pedalKickback: number;    // unimplemented, always 0
  chainGrowth: number;      // unimplemented, always 0
  totalChainGrowth: number; // unimplemented, always 0
  trail: number;
  crankAngle: number;       // unimplemented, always 0
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