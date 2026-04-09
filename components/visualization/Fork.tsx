import { DrawComponentProps } from "./types";

export const Fork = ({
  state,
  conversion,
}: DrawComponentProps) => {
  const { toCanvasX, toCanvasY } = conversion;
  const htBottomRotated = state.headTubeBottom.wheelsOnGround;
  const forkBendRotated = state.forkBend.wheelsOnGround;
  const frontAxleRotated = state.frontAxle.wheelsOnGround;

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
