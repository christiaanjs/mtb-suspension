// Geometric utility functions
import { Point2D } from "./types";

export function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function radiansToDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

export function dot(p: Point2D, q: Point2D): number {
  return p.x * q.x + p.y * q.y;
}

export function cross(p: Point2D, q: Point2D): number {
  return p.x * q.y - p.y * q.x;
}

export function magnitude(p: Point2D): number {
  return Math.sqrt(dot(p, p));
}

export function distance(p1: Point2D, p2: Point2D): number {
  return magnitude(Point2D.subtract(p2, p1));
}

export function normalise(p: Point2D): Point2D {
  const mag = magnitude(p);
  return Point2D.multiply(p, 1 / mag);
}

// Angle between x-axis andf a vector from 'from' to 'to' in radians
export function angle(from: Point2D, to: Point2D): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return Math.atan2(dy, dx);
}

export function angleBetween(a: Point2D, b: Point2D): number {
  const magA = magnitude(a);
  const magB = magnitude(b);

  if (magA === 0 || magB === 0) {
    throw new Error("Cannot compute angle with zero-length vector");
  }

  const cosine = dot(a, b) / (magA * magB);

  // Clamp to avoid floating point precision issues
  // const clamped = Math.min(1, Math.max(-1, cosine));

  return Math.acos(cosine);
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

/**
 * @param P0 original reference line start  
 * @param A0 original reference line end
 * @param I0 point to be transformed
 * @param P1 transformed reference line start
 * @param A1 transformed reference line end
 * @returns transformed point
 */
export function transformPointByReferenceLine(
  P0: Point2D,
  A0: Point2D,
  I0: Point2D,
  P1: Point2D,
  A1: Point2D,
): Point2D {
  const d0 = normalise(Point2D.subtract(A0, P0));
  const d1 = normalise(Point2D.subtract(A1, P1));

  const c = dot(d0, d1);
  const s = cross(d0, d1);

  const local = Point2D.subtract(I0, P0);

  const rotated = {
    x: c * local.x - s * local.y,
    y: s * local.x + c * local.y,
  };

  return Point2D.add(P1, rotated);
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

