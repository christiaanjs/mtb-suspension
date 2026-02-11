import { getApplyPitchRotation } from "@/lib/kinematics";
import { DrawComponentProps } from "./types";
import { pointsToPolylineString } from "./lib";



export const Swingarm = ({ state, conversion }: DrawComponentProps) => {
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
    <>
      <polyline
        points={polylineString}
        fill="none"
        stroke="#f97316"
        strokeWidth="1.33"
      />
      {/* Pivot point - hollow yellow circle */}
      <circle
        cx={canvasPoints[0].x}
        cy={canvasPoints[0].y}
        r={6}
        fill="none"
        stroke="#eab308"
        strokeWidth="1.33"
      />
    </>
  );
};
