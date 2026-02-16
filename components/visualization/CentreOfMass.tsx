import { getApplyPitchRotation } from "@/lib/kinematics";
import { DrawComponentProps } from "./types";
import { Point2D } from "@/lib/types";

export const CentreOfMass = ({
  state,
  conversion,
  geometry,
}: DrawComponentProps) => {
  const { toCanvas } = conversion;
  const applyPitchRotation = getApplyPitchRotation(
    state.rearAxlePosition,
    state.pitchAngleDegrees,
  );
  // TODO: Do we need to add CoM before or after pitch rotation>
  const comRotated = applyPitchRotation(
    Point2D.add(state.bbPosition, {
      x: geometry.comX,
      y: geometry.comY,
    }),
  );

  const comCanvas = toCanvas(comRotated);

  return (
    <circle
      cx={comCanvas.x}
      cy={comCanvas.y}
      r={3}
      fill="#f59e0b"
      opacity="0.7"
    />
  );
};
