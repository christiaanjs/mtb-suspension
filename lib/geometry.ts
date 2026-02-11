// Geometric utility functions
import { Point2D } from "./types";

export function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function distance(p1: Point2D, p2: Point2D): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function angle(from: Point2D, to: Point2D): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return Math.atan2(dy, dx);
}

export function lineIntersection(
  line1Point1: Point2D,
  line1Point2: Point2D,
  line2Point1: Point2D,
  line2Point2: Point2D,
): Point2D | null {
  const x1 = line1Point1.x,
    y1 = line1Point1.y;
  const x2 = line1Point2.x,
    y2 = line1Point2.y;
  const x3 = line2Point1.x,
    y3 = line2Point1.y;
  const x4 = line2Point2.x,
    y4 = line2Point2.y;

  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

  if (Math.abs(denom) < 0.0001) {
    return null; // Lines are parallel
  }

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;

  return {
    x: x1 + t * (x2 - x1),
    y: y1 + t * (y2 - y1),
  };
}

export function rotate(
  point: Point2D,
  pivot: Point2D,
  angleRad: number,
): Point2D {
  const dx = point.x - pivot.x;
  const dy = point.y - pivot.y;

  const rotatedX = dx * Math.cos(angleRad) - dy * Math.sin(angleRad);
  const rotatedY = dx * Math.sin(angleRad) + dy * Math.cos(angleRad);

  return {
    x: pivot.x + rotatedX,
    y: pivot.y + rotatedY,
  };
}

export function calculateChainLength(
  from: Point2D,
  to: Point2D,
  chainringRadius: number,
  cogRadius: number,
): number {
  const centerDist = distance(from, to);

  if (centerDist < Math.abs(chainringRadius - cogRadius)) {
    return centerDist;
  }

  const radiusDiff = chainringRadius - cogRadius;
  const tangentLength = Math.sqrt(
    centerDist * centerDist - radiusDiff * radiusDiff,
  );

  const alpha = Math.asin(radiusDiff / centerDist);
  const chainringWrap = Math.PI + alpha;
  const cogWrap = Math.PI - alpha;

  const chainringArc = chainringRadius * chainringWrap;
  const cogArc = cogRadius * cogWrap;

  return 2 * tangentLength + chainringArc + cogArc;
}

export function sprocketRadius(teeth: number): number {
  const pitch = 12.7; // mm (standard chain pitch)
  return (teeth * pitch) / (2 * Math.PI);
}

export function circleCircleIntersection(
  center1: Point2D,
  radius1: number,
  center2: Point2D,
  radius2: number,
): Point2D[] {
  const d = distance(center1, center2);

  // Check if circles don't intersect
  if (d > radius1 + radius2 || d < Math.abs(radius1 - radius2) || d === 0) {
    return [];
  }

  const a = (radius1 * radius1 - radius2 * radius2 + d * d) / (2 * d);
  const h = Math.sqrt(radius1 * radius1 - a * a);

  const px = center1.x + (a / d) * (center2.x - center1.x);
  const py = center1.y + (a / d) * (center2.y - center1.y);

  const offsetX = (h / d) * (center2.y - center1.y);
  const offsetY = (h / d) * (center1.x - center2.x);

  return [
    { x: px + offsetX, y: py + offsetY },
    { x: px - offsetX, y: py - offsetY },
  ];
}

// Returns the tangent points (upper tangent) between two circles for chainline drawing
export function tangentPoints(
  center1: Point2D,
  radius1: number,
  center2: Point2D,
  radius2: number,
): { start: { x: number; y: number }; end: { x: number; y: number } } {
  const dx = center2.x - center1.x;
  const dy = center2.y - center1.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);
  const radiusDiff = radius1 - radius2;
  const tangentAngle = Math.asin(Math.max(-1, Math.min(1, radiusDiff / dist)));
  const upperAngle = angle + tangentAngle;
  return {
    start: {
      x: center1.x + radius1 * Math.sin(upperAngle),
      y: center1.y - radius1 * Math.cos(upperAngle),
    },
    end: {
      x: center2.x + radius2 * Math.sin(upperAngle),
      y: center2.y - radius2 * Math.cos(upperAngle),
    },
  };
}

