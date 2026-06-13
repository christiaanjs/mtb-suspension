import { DrawComponentProps } from "./types";
import { pointsToPolylineString } from "./lib";

// Renders a four-bar linkage: chainstay (lower link), seatstay (coupler that
// carries the rear axle) and rocker (upper link driven by the shock).
// Falls back to nothing if the state has no four-bar data.
export const Linkage = ({ state, conversion }: DrawComponentProps) => {
  const fourBar = state.fourBar;
  if (!fourBar) return null;

  const { toCanvas, toCanvasX, toCanvasY } = conversion;

  const mainPivot = fourBar.mainPivot.wheelsOnGround;
  const rockerPivot = fourBar.rockerPivot.wheelsOnGround;
  const seatstayLower = fourBar.seatstayLower.wheelsOnGround;
  const seatstayUpper = fourBar.seatstayUpper.wheelsOnGround;
  const shockEye = state.swingarmEye.wheelsOnGround;
  const rearAxle = state.rearAxle.wheelsOnGround;

  // Chainstay: main pivot → lower seatstay junction → rear axle
  const chainstay = [mainPivot, seatstayLower, rearAxle].map(toCanvas);
  // Seatstay coupler: lower junction → upper junction (+ axle triangle)
  const seatstay = [seatstayLower, seatstayUpper, rearAxle].map(toCanvas);
  // Rocker: rocker pivot → upper seatstay junction, plus rocker pivot → shock eye
  const rocker = [seatstayUpper, rockerPivot, shockEye].map(toCanvas);

  return (
    <>
      {/* Chainstay (lower link) */}
      <polyline
        points={pointsToPolylineString(chainstay)}
        fill="none"
        stroke="#f97316"
        strokeWidth="1.6"
      />
      {/* Seatstay (coupler carrying the axle) */}
      <polyline
        points={pointsToPolylineString(seatstay)}
        fill="none"
        stroke="#f59e0b"
        strokeWidth="1.6"
      />
      {/* Rocker (upper link) */}
      <polyline
        points={pointsToPolylineString(rocker)}
        fill="none"
        stroke="#d97706"
        strokeWidth="1.6"
      />

      {/* Frame pivots — hollow yellow circles */}
      <circle
        cx={toCanvasX(mainPivot.x)}
        cy={toCanvasY(mainPivot.y)}
        r={6}
        fill="none"
        stroke="#eab308"
        strokeWidth="1.33"
      />
      <circle
        cx={toCanvasX(rockerPivot.x)}
        cy={toCanvasY(rockerPivot.y)}
        r={6}
        fill="none"
        stroke="#eab308"
        strokeWidth="1.33"
      />

      {/* Coupler joints — small solid orange dots */}
      <circle
        cx={toCanvasX(seatstayLower.x)}
        cy={toCanvasY(seatstayLower.y)}
        r={3.5}
        fill="#f97316"
      />
      <circle
        cx={toCanvasX(seatstayUpper.x)}
        cy={toCanvasY(seatstayUpper.y)}
        r={3.5}
        fill="#f97316"
      />
    </>
  );
};
