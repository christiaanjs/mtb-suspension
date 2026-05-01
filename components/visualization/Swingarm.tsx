import { DrawComponentProps } from "./types";
import { pointsToPolylineString } from "./lib";

export const Swingarm = ({ state, conversion }: DrawComponentProps) => {
  const { toCanvas } = conversion;

  // 4-bar / Horst link: render 4 links + extra pivot circles
  if (state.horstJointC && state.horstJointD && state.horstLinkPivotB) {
    const A = toCanvas(state.pivot.wheelsOnGround);
    const B = toCanvas(state.horstLinkPivotB.wheelsOnGround);
    const C = toCanvas(state.horstJointC.wheelsOnGround);
    const D = toCanvas(state.horstJointD.wheelsOnGround);
    const E = toCanvas(state.rearAxle.wheelsOnGround);

    return (
      <>
        {/* Coupler body: C–E–D–C triangle (the rigid swingarm) */}
        <polyline
          points={pointsToPolylineString([C, E, D, C])}
          fill="none"
          stroke="#f97316"
          strokeWidth="1.33"
        />
        {/* Main arm: A–C */}
        <line x1={A.x} y1={A.y} x2={C.x} y2={C.y} stroke="#f97316" strokeWidth="1.33" />
        {/* Horst link: B–D */}
        <line x1={B.x} y1={B.y} x2={D.x} y2={D.y} stroke="#f97316" strokeWidth="1.33" />
        {/* Pivot A — main pivot */}
        <circle cx={A.x} cy={A.y} r={6} fill="none" stroke="#eab308" strokeWidth="1.33" />
        {/* Pivot B — Horst link frame pivot */}
        <circle cx={B.x} cy={B.y} r={5} fill="none" stroke="#eab308" strokeWidth="1.33" />
        {/* Joint C */}
        <circle cx={C.x} cy={C.y} r={4} fill="none" stroke="#eab308" strokeWidth="1.33" />
        {/* Joint D */}
        <circle cx={D.x} cy={D.y} r={4} fill="none" stroke="#eab308" strokeWidth="1.33" />
      </>
    );
  }

  // Single-pivot rendering
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
