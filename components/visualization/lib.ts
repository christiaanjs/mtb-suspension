import { Point2D } from "@/lib/types";

export const pointsToPolylineString = (points: Point2D[]): string => {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
};
