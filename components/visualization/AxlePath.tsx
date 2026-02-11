import { Point2D } from "@/lib/types";
import { DrawComponentProps } from "./types";
import { getApplyPitchRotation } from "@/lib/kinematics";
import { pointsToPolylineString } from "./lib";

export const AxlePath = ({
  axlePath,
  conversion,
  state,
}: DrawComponentProps & { axlePath: Point2D[] }) => {
  if (axlePath.length <= 1) return null;

  const { toCanvas } = conversion;
  const applyPitchRotation = getApplyPitchRotation(
    state.rearAxlePosition,
    state.pitchAngleDegrees,
  );
  const points = axlePath
    .map((p) => Point2D.add(state.bbPosition, p))
    .map(applyPitchRotation)
    .map(toCanvas);
  return (
    <polyline
      points={pointsToPolylineString(points)}
      fill="none"
      stroke="#60a5fa"
      strokeWidth="1"
      opacity="0.3"
    />
  );
};
