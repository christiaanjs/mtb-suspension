import { getApplyPitchRotation } from "@/lib/kinematics";
import {
  BikeGeometry,
  BoundsConversions,
  computedProperties,
  KinematicState,
} from "@/lib/types";

export const Fork = ({
  state,
  geometry,
  conversion,
}: {
  state: KinematicState;
  geometry: BikeGeometry;
  conversion: BoundsConversions;
}) => {
  const { toCanvasX, toCanvasY } = conversion;
  const applyPitchRotation = getApplyPitchRotation(
    state.rearAxle.world,
    state.pitchAngleDegrees,
  );
  const headTubeBottom = computedProperties.headTubeBottom(geometry, state.bb.world);
  const effectiveForkLength = geometry.forkLength - state.forkCompression;
  const htaRad = computedProperties.headTubeAngleRadians(geometry);
  const cosHT = Math.cos(htaRad);
  const sinHT = Math.sin(htaRad);

  const htBottomRotated = applyPitchRotation(headTubeBottom);
  const frontAxleRotated = state.frontAxle.wheelsOnGround;

  // Fork bend point (end of stanchions along steering axis)
  const forkBendRotated = applyPitchRotation({
    x: headTubeBottom.x + effectiveForkLength * cosHT,
    y: headTubeBottom.y - effectiveForkLength * sinHT,
  });

  return (
    <>
      {/* Fork stanchions */}
      <line
        x1={toCanvasX(htBottomRotated.x)}
        y1={toCanvasY(htBottomRotated.y)}
        x2={toCanvasX(forkBendRotated.x)}
        y2={toCanvasY(forkBendRotated.y)}
        stroke="#22c55e"
        strokeWidth="2.67"
      />

      {/* Fork lower legs */}
      <line
        x1={toCanvasX(forkBendRotated.x)}
        y1={toCanvasY(forkBendRotated.y)}
        x2={toCanvasX(frontAxleRotated.x)}
        y2={toCanvasY(frontAxleRotated.y)}
        stroke="#22c55e"
        strokeWidth="2.67"
      />
    </>
  );
};
