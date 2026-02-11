import { BikeGeometry, BoundsConversions } from "@/lib/types";

export const GroundLine = ({
  conversions,
}: {
  conversions: BoundsConversions;
  geometry: BikeGeometry;
}) => {
  const y = conversions.toCanvasY(0);
  return (
    <line
      x1={0}
      y1={y}
      x2={conversions.width}
      y2={y}
      stroke="#999"
      strokeWidth="1"
      strokeDasharray="5,5"
      opacity="0.5"
    />
  );
};
