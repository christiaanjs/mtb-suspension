import { DrawComponentProps } from "./types";

export const GroundLine = ({ conversion }: DrawComponentProps) => {
  const y = conversion.toCanvasY(0);
  return (
    <line
      x1={0}
      y1={y}
      x2={conversion.width}
      y2={y}
      stroke="#999"
      strokeWidth="1"
      strokeDasharray="5,5"
      opacity="0.5"
    />
  );
};
