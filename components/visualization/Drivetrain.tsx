import { sprocketRadius, tangentPoints } from "@/lib/geometry";
import { getApplyPitchRotation } from "@/lib/kinematics";
import { IdlerType, Point2D } from "@/lib/types";
import { DrawComponentProps } from "./types";

export const Drivetrain = ({
  geometry,
  state,
  conversion,
}: DrawComponentProps) => {
  const scale = conversion.scale;
  const { toCanvasX, toCanvasY } = conversion;

  const chainringRotated = state.chainringCenter.wheelsOnGround;
  const cogRotated = state.rearAxle.wheelsOnGround;
  const idlerRotated = state.idler?.wheelsOnGround ?? null;

  const chainringRadius = sprocketRadius(geometry.chainringTeeth);
  const cogRadius = sprocketRadius(geometry.cogTeeth);

  const chainringRadiusScreen = chainringRadius * scale;
  const cogRadiusScreen = cogRadius * scale;

  const chainSegments: { start: Point2D; end: Point2D }[] = [];
  let idlerRadiusScreen = 0;

  if (geometry.idlerType === IdlerType.None) {
    chainSegments.push(tangentPoints(chainringRotated, chainringRadius, cogRotated, cogRadius));
  } else if (idlerRotated) {
    const idlerRadius = sprocketRadius(geometry.idlerTeeth);
    idlerRadiusScreen = idlerRadius * scale;
    chainSegments.push(tangentPoints(idlerRotated, idlerRadius, cogRotated, cogRadius));
    chainSegments.push(tangentPoints(chainringRotated, chainringRadius, idlerRotated, idlerRadius));
  }

  // Crank arm: crankAngle is currently always 0 but kept for when kickback is implemented
  const crankLength = 165.0;
  const crankAngleRad = state.crankAngle * (Math.PI / 180);
  const crankEndWorld = {
    x: state.chainringCenter.world.x + crankLength * Math.cos(crankAngleRad),
    y: state.chainringCenter.world.y - crankLength * Math.sin(crankAngleRad),
  };
  const applyPitchRotation = getApplyPitchRotation(state.rearAxle.world, state.pitchAngleDegrees);
  const crankEndRotated = applyPitchRotation(crankEndWorld);

  return (
    <>
      {/* Chainring */}
      <circle
        cx={toCanvasX(chainringRotated.x)}
        cy={toCanvasY(chainringRotated.y)}
        r={chainringRadiusScreen}
        fill="none"
        stroke="#eab308"
        strokeWidth="1.33"
      />
      {/* Cog */}
      <circle
        cx={toCanvasX(cogRotated.x)}
        cy={toCanvasY(cogRotated.y)}
        r={cogRadiusScreen}
        fill="none"
        stroke="#eab308"
        strokeWidth="1.33"
      />
      {/* Idler pulley (if present) */}
      {idlerRotated && (
        <circle
          cx={toCanvasX(idlerRotated.x)}
          cy={toCanvasY(idlerRotated.y)}
          r={idlerRadiusScreen}
          fill="none"
          stroke="#f97316"
          strokeWidth="1.33"
        />
      )}
      {/* Chainline */}
      {chainSegments.map((segment, index) => (
        <line
          x1={toCanvasX(segment.start.x)}
          y1={toCanvasY(segment.start.y)}
          x2={toCanvasX(segment.end.x)}
          y2={toCanvasY(segment.end.y)}
          stroke="#eab308"
          strokeWidth="2"
          opacity="0.9"
          key={index}
        />
      ))}
      {/* Crank arm */}
      <line
        x1={toCanvasX(chainringRotated.x)}
        y1={toCanvasY(chainringRotated.y)}
        x2={toCanvasX(crankEndRotated.x)}
        y2={toCanvasY(crankEndRotated.y)}
        stroke="#6b7280"
        strokeWidth="2.67"
      />
      {/* Pedal */}
      <circle
        cx={toCanvasX(crankEndRotated.x)}
        cy={toCanvasY(crankEndRotated.y)}
        r={5}
        fill="#f5f5f5"
      />
    </>
  );
};
