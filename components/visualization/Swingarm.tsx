import { DrawComponentProps } from "./types";
import { pointsToPolylineString } from "./lib";

export const Swingarm = ({ state, conversion }: DrawComponentProps) => {
  const { toCanvas } = conversion;
  const canvasPoints = [
    state.pivot.wheelsOnGround,
    state.swingarmEye.wheelsOnGround,
    state.rearAxle.wheelsOnGround,
    state.pivot.wheelsOnGround,
  ].map(toCanvas);
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
