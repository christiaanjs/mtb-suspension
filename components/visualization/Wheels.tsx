import { computedProperties } from "@/lib/types";
import { DrawComponentProps } from "./types";

export const Wheels = ({ state, geometry, conversion }: DrawComponentProps) => {
  const { toCanvasX, toCanvasY } = conversion;
  const frontAxleRotated = state.frontAxle.wheelsOnGround;
  const rearAxleRotated = state.rearAxle.wheelsOnGround;
  return (
    <>
      {/* Front wheel */}
      <circle
        cx={toCanvasX(frontAxleRotated.x)}
        cy={toCanvasY(frontAxleRotated.y)}
        r={computedProperties.frontWheelRadius(geometry) * conversion.scale}
        fill="none"
        stroke="#1f2937"
        strokeWidth="2"
      />

      {/* Rear wheel */}
      <circle
        cx={toCanvasX(rearAxleRotated.x)}
        cy={toCanvasY(rearAxleRotated.y)}
        r={computedProperties.rearWheelRadius(geometry) * conversion.scale}
        fill="none"
        stroke="#1f2937"
        strokeWidth="2"
      />
    </>
  );
};
