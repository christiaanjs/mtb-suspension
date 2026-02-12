import { sprocketRadius, tangentPoints } from "@/lib/geometry";
import { getApplyPitchRotation, getIdlerPosition } from "@/lib/kinematics";
import { IdlerType, Point2D } from "@/lib/types";
import { DrawComponentProps } from "./types";

export const Drivetrain = ({
  geometry,
  state,
  conversion,
}: DrawComponentProps) => {
  const bbPos = state.bbPosition;
  const scale = conversion.scale;

  const { toCanvasX, toCanvasY } = conversion;

  const applyPitchRotation = getApplyPitchRotation(
    state.rearAxlePosition,
    state.pitchAngleDegrees,
  );

  const rearAxlePosRotated = applyPitchRotation(state.rearAxlePosition);

  const chainringPos = {
    x: bbPos.x + geometry.chainringOffsetX,
    y: bbPos.y + geometry.chainringOffsetY,
  };
  const chainringRotated = applyPitchRotation(chainringPos);
  const cogRotated = rearAxlePosRotated;
  const chainringRadius = sprocketRadius(geometry.chainringTeeth);
  const cogRadius = sprocketRadius(geometry.cogTeeth);

  const chainringRadiusScreen = chainringRadius * scale;
  const cogRadiusScreen = cogRadius * scale;

  const chainSegments: { start: Point2D; end: Point2D }[] = [];

  let idlerRotated: Point2D | null = null;
  let idlerRadiusScreen = 0;

  if (geometry.idlerType === IdlerType.None) {
    // Chainring to cog
    const tangents = tangentPoints(
      chainringRotated,
      chainringRadius,
      cogRotated,
      cogRadius,
    );
    chainSegments.push(tangents);
  } else {
    const idlerPos = getIdlerPosition(state, geometry)!;
    idlerRotated = applyPitchRotation(idlerPos);

    const idlerRadius = sprocketRadius(geometry.idlerTeeth);
    idlerRadiusScreen = idlerRadius * scale;

    const cogToIdler = tangentPoints(
      idlerRotated,
      idlerRadius,
      cogRotated,
      cogRadius,
    );
    chainSegments.push(cogToIdler);

    const chainringToIdler = tangentPoints(
      chainringRotated,
      chainringRadius,
      idlerRotated,
      idlerRadius,
    );
    chainSegments.push(chainringToIdler);
  }

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

      {/* Crank arm and pedal */}
      {(() => {
        const crankLength = 165.0; // 165mm standard crank
        const crankAngleRad = state.crankAngle * (Math.PI / 180);
        const crankEndWorld = {
          x: chainringPos.x + crankLength * Math.cos(crankAngleRad),
          y: chainringPos.y - crankLength * Math.sin(crankAngleRad),
        };
        const crankEndRotated = applyPitchRotation(crankEndWorld);
        return (
          <>
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
      })()}
    </>
  );
};
