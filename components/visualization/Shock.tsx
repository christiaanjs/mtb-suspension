import { DrawComponentProps } from "./types";

export const Shock = ({ conversion, state }: DrawComponentProps) => {
  const { toCanvasX, toCanvasY } = conversion;
  const frameMountRotated = state.shockFrameMount.wheelsOnGround;
  const shockEyePosRotated = state.swingarmEye.wheelsOnGround;

  return (
    <>
      {/* Shock linkage - frame mount to eye */}
      <line
        x1={toCanvasX(frameMountRotated.x)}
        y1={toCanvasY(frameMountRotated.y)}
        x2={toCanvasX(shockEyePosRotated.x)}
        y2={toCanvasY(shockEyePosRotated.y)}
        stroke="#ef4444"
        strokeWidth="1.33"
      />

      {/* Shock mount points - eyes */}
      <circle
        cx={toCanvasX(frameMountRotated.x)}
        cy={toCanvasY(frameMountRotated.y)}
        r={5}
        fill="#ef4444"
      />
      <circle
        cx={toCanvasX(shockEyePosRotated.x)}
        cy={toCanvasY(shockEyePosRotated.y)}
        r={5}
        fill="#ef4444"
      />
    </>
  );
};
