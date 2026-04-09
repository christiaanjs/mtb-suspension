import { DrawComponentProps } from "./types";

export const FrontTriangle = ({
  state,
  conversion,
}: DrawComponentProps) => {
  const { toCanvasX, toCanvasY } = conversion;

  const bbCanvasX = toCanvasX(state.bb.wheelsOnGround.x);
  const bbCanvasY = toCanvasY(state.bb.wheelsOnGround.y);
  const htTopCanvasX = toCanvasX(state.headTubeTop.wheelsOnGround.x);
  const htTopCanvasY = toCanvasY(state.headTubeTop.wheelsOnGround.y);
  const htBottomCanvasX = toCanvasX(state.headTubeBottom.wheelsOnGround.x);
  const htBottomCanvasY = toCanvasY(state.headTubeBottom.wheelsOnGround.y);
  const seatTopCanvasX = toCanvasX(state.seatTop.wheelsOnGround.x);
  const seatTopCanvasY = toCanvasY(state.seatTop.wheelsOnGround.y);

  // Downtube junction: ~20mm above head tube bottom in screen space (small-angle approx)
  const downtubeJunctionX = htBottomCanvasX;
  const downtubeJunctionY = htBottomCanvasY - 20 * conversion.scale;

  return (
    <>
      {/* Downtube - BB to head tube junction */}
      <line
        x1={bbCanvasX}
        y1={bbCanvasY}
        x2={downtubeJunctionX}
        y2={downtubeJunctionY}
        stroke="#2563eb"
        strokeWidth="2.67"
      />

      {/* Head tube */}
      <line
        x1={htBottomCanvasX}
        y1={htBottomCanvasY}
        x2={htTopCanvasX}
        y2={htTopCanvasY}
        stroke="#2563eb"
        strokeWidth="2.67"
      />

      {/* Seat tube - BB to seat top */}
      <line
        x1={bbCanvasX}
        y1={bbCanvasY}
        x2={seatTopCanvasX}
        y2={seatTopCanvasY}
        stroke="#2563eb"
        strokeWidth="2.67"
      />

      {/* Top tube - head tube top to seat top */}
      <line
        x1={htTopCanvasX}
        y1={htTopCanvasY}
        x2={seatTopCanvasX}
        y2={seatTopCanvasY}
        stroke="#2563eb"
        strokeWidth="1.33"
      />

      {/* Bottom bracket */}
      <circle
        cx={bbCanvasX}
        cy={bbCanvasY}
        r={4}
        fill="#06b6d4"
      />
    </>
  );
};
