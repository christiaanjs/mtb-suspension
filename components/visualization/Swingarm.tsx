import { getApplyPitchRotation } from "@/lib/kinematics";
import {
  BoundsConversions,
  KinematicStateFirstPass,
  Point2D,
} from "@/lib/types";

const pointsToPolylineString = (points: Point2D[]): string => {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
};

export const Swingarm = ({
  state,
  conversion,
}: {
  state: KinematicStateFirstPass;
  conversion: BoundsConversions;
}) => {
  const applyPitchRotation = getApplyPitchRotation(
    state.rearAxlePosition,
    state.pitchAngleDegrees,
  );
  const { toCanvas } = conversion;
  const statePoints = [
    state.pivotPosition,
    state.swingarmEyePosition,
    state.rearAxlePosition,
    state.pivotPosition,
  ];
  const canvasPoints = statePoints.map(applyPitchRotation).map(toCanvas);
  const polylineString = pointsToPolylineString(canvasPoints);
  return (
    <polyline
      points={polylineString}
      fill="none"
      stroke="#f97316"
      strokeWidth="1.33"
    />
  );
};
