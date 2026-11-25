import { z } from "zod";
import {
  BikeGeometry,
  IdlerType,
  SuspensionType,
  createDefaultGeometry,
} from "@/lib/types";

/**
 * Numeric geometry fields exposed to MCP clients: [key, description, min, max].
 * Ranges are sanity bounds (they also bound the work a request can trigger),
 * not engineering limits. Defaults come from createDefaultGeometry().
 */
type NumField = [keyof BikeGeometry, string, number, number];

const NUMERIC_FIELDS: NumField[] = [
  // Frame
  ["bbHeight", "Bottom bracket height above ground (mm)", 200, 450],
  ["stack", "Stack: BB to head tube top, vertical (mm)", 400, 800],
  ["reach", "Reach: BB to head tube top, horizontal (mm)", 300, 650],
  ["headAngle", "Head angle from horizontal (degrees)", 55, 80],
  ["headTubeLength", "Head tube length (mm)", 40, 200],
  ["seatAngle", "Effective seat angle from horizontal (degrees)", 60, 85],
  ["seatTubeLength", "Seat tube length, vertical (mm)", 200, 600],
  // Fork
  ["forkLength", "Fork axle-to-crown length (mm)", 400, 700],
  ["forkOffset", "Fork offset / rake (mm)", 20, 70],
  ["forkTravel", "Fork travel (mm)", 0, 250],
  // Wheels
  ["frontWheelDiameter", "Front wheel + tyre diameter (mm)", 500, 850],
  ["rearWheelDiameter", "Rear wheel + tyre diameter (mm)", 500, 850],
  // Single pivot
  ["bbToPivotX", "Single pivot: main pivot X from BB (mm, negative = behind BB)", -300, 300],
  ["bbToPivotY", "Single pivot: main pivot Y above BB (mm)", 0, 500],
  ["swingarmLength", "Single pivot: pivot to rear axle (mm)", 300, 600],
  // Four bar
  ["lowerLinkPivotX", "Four bar: chainstay pivot on frame, X from BB (mm)", -300, 300],
  ["lowerLinkPivotY", "Four bar: chainstay pivot on frame, Y from BB (mm)", -100, 500],
  ["rockerPivotX", "Four bar: rocker pivot on frame, X from BB (mm)", -300, 300],
  ["rockerPivotY", "Four bar: rocker pivot on frame, Y from BB (mm)", -100, 600],
  ["rockerShockMountX", "Four bar: shock eye on rocker, X from BB (mm)", -300, 300],
  ["rockerShockMountY", "Four bar: shock eye on rocker, Y from BB (mm)", -100, 600],
  ["rockerSeatstayX", "Four bar: seatstay/rocker junction, X from BB (mm)", -400, 300],
  ["rockerSeatstayY", "Four bar: seatstay/rocker junction, Y from BB (mm)", -100, 600],
  ["seatstayLowerX", "Four bar: chainstay/seatstay junction, X from BB (mm)", -600, 0],
  ["seatstayLowerY", "Four bar: chainstay/seatstay junction, Y from BB (mm)", -100, 300],
  ["fourBarAxleX", "Four bar: rear axle at top-out, X from BB (mm)", -600, 0],
  ["fourBarAxleY", "Four bar: rear axle at top-out, Y from BB (mm)", -100, 300],
  // Shock
  ["shockFrameMountX", "Shock frame mount X from BB (mm)", -300, 300],
  ["shockFrameMountY", "Shock frame mount Y from BB (mm)", -100, 600],
  ["shockSwingarmMountDistance", "Single pivot: shock mount distance from pivot along swingarm (mm)", 20, 400],
  ["shockStroke", "Shock stroke (mm)", 20, 100],
  ["shockETE", "Shock eye-to-eye length at top-out (mm)", 100, 350],
  ["shockSpringRate", "Shock spring rate (N/mm)", 1, 300],
  // Drivetrain
  ["chainringTeeth", "Chainring teeth", 20, 60],
  ["cogTeeth", "Rear cog teeth", 8, 60],
  ["chainringOffsetX", "Chainring centre offset X from BB (mm)", -50, 50],
  ["chainringOffsetY", "Chainring centre offset Y from BB (mm)", -50, 50],
  // Idler
  ["idlerX", "Idler X from BB (mm)", -300, 300],
  ["idlerY", "Idler Y from BB (mm)", -100, 500],
  ["idlerTeeth", "Idler teeth", 8, 30],
  // Centre of mass
  ["comX", "Rider + bike centre of mass X from BB (mm, forward positive)", -200, 400],
  ["comY", "Rider + bike centre of mass height above BB (mm)", 400, 1200],
];

const defaults = createDefaultGeometry();

const shape: Record<string, z.ZodTypeAny> = {
  suspensionType: z
    .nativeEnum(SuspensionType)
    .optional()
    .describe(
      `Suspension layout. "${SuspensionType.SinglePivot}" uses the single-pivot fields; "${SuspensionType.FourBar}" uses the four-bar fields. Default: ${defaults.suspensionType}`,
    ),
  idlerType: z
    .nativeEnum(IdlerType)
    .optional()
    .describe(`Idler pulley mounting. Default: ${defaults.idlerType}`),
};

for (const [key, desc, min, max] of NUMERIC_FIELDS) {
  shape[key] = z
    .number()
    .finite()
    .min(min)
    .max(max)
    .optional()
    .describe(`${desc}. Default: ${defaults[key] as number}`);
}

/** Zod raw shape for registerTool(); every field is optional (defaults apply). */
export const geometryInputShape = shape;

export const geometryInputSchema = z.object(shape);
export type GeometryInput = z.infer<typeof geometryInputSchema>;

export function resolveGeometry(input: GeometryInput): BikeGeometry {
  const overrides: Partial<BikeGeometry> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v !== undefined) (overrides as Record<string, unknown>)[k] = v;
  }
  return createDefaultGeometry({ overrides });
}
