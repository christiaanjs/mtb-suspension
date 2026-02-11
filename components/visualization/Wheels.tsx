import { getApplyPitchRotation } from "@/lib/kinematics";
import { computedProperties } from "@/lib/types";
import { DrawComponentProps } from "./types";

export const Wheels = ({ state, geometry, conversion }: DrawComponentProps) => {
  const { toCanvasX, toCanvasY } = conversion;
  const applyPitchRotation = getApplyPitchRotation(
    state.rearAxlePosition,
    state.pitchAngleDegrees,
  );
  const headTubeBottom = computedProperties.headTubeBottom(
    geometry,
    state.bbPosition,
  );

  const effectiveForkLength = geometry.forkLength - state.forkCompression;
  const htaRad = computedProperties.headTubeAngleRadians(geometry);
  const cosHT = Math.cos(htaRad);
  const sinHT = Math.sin(htaRad);
  const frontAxle = {
    x:
      headTubeBottom.x +
      effectiveForkLength * cosHT +
      geometry.forkOffset * sinHT,
    y:
      headTubeBottom.y -
      effectiveForkLength * sinHT +
      geometry.forkOffset * cosHT,
  };
  const frontAxleRotated = applyPitchRotation(frontAxle);
  const rearAxleRotated = applyPitchRotation(state.rearAxlePosition);
  return (
    <>
      {/* Front wheel */}
      <circle
        cx={toCanvasX(frontAxleRotated.x)}
        cy={toCanvasY(frontAxleRotated.y)}
        r={computedProperties.frontWheelRadius(geometry) * conversion.scale}
        fill="none"
        stroke="#1f2937"
        strokeWidth="2"
      />

      {/* Rear wheel */}
      <circle
        cx={toCanvasX(rearAxleRotated.x)}
        cy={toCanvasY(rearAxleRotated.y)}
        r={computedProperties.rearWheelRadius(geometry) * conversion.scale}
        fill="none"
        stroke="#1f2937"
        strokeWidth="2"
      />
    </>
  );
};
