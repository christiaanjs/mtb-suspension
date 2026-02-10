// MTB Suspension Analyzer Types
// Ported from Swift app

export interface Point2D {
  x: number;
  y: number;
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

export function createDefaultGeometry(): BikeGeometry {
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
  };
}

// First pass: kinematic state calculated from shock stroke only
export interface KinematicStateFirstPass {
  travelMM: number;
  rearAxlePosition: Point2D;
  bbPosition: Point2D;
  pivotPosition: Point2D;
  swingarmEyePosition: Point2D;
  shockLength: number;
  pitchAngleDegrees: number;
}

// Complete kinematic state (first pass + second pass calculations)
export interface KinematicState extends KinematicStateFirstPass {
  // Geometry - calculated in second pass (front axle and pitch-dependent values)
  frontAxlePosition: Point2D;
  forkCompression: number;

  // Dynamics - calculated in second pass (derivatives and derived values)
  leverageRatio: number;
  wheelRate: number;
  antiSquat: number;
  antiRise: number;

  // Drivetrain - calculated in second pass
  pedalKickback: number;
  chainGrowth: number;
  totalChainGrowth: number;

  // Trail - calculated in second pass (depends on pitch rotation)
  trail: number;

  // Crank angle - calculated from pedal kickback
  crankAngle: number;
}

export interface AnalysisResults {
  states: KinematicState[];
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
  headTubeTop: (geometry: BikeGeometry): Point2D => {
    return { x: geometry.reach, y: geometry.stack };
  },
  headTubeAngleRadians: (geometry: BikeGeometry): number => {
    return (geometry.headAngle * Math.PI) / 180.0;
  },
  headTubeBottom: (geometry: BikeGeometry): Point2D => {
    const headTubeTop = computedProperties.headTubeTop(geometry);
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
