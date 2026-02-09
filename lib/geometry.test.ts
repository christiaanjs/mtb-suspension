import { describe, it, expect } from "vitest";
import {
  distance,
  angle,
  lineIntersection,
  rotate,
  calculateChainLength,
  sprocketRadius,
  circleCircleIntersection,
} from "./geometry";
import { Point2D } from "./types";

describe("distance", () => {
  it("should calculate distance between two points", () => {
    const p1: Point2D = { x: 0, y: 0 };
    const p2: Point2D = { x: 3, y: 4 };
    expect(distance(p1, p2)).toBe(5);
  });

  it("should return 0 for same point", () => {
    const p: Point2D = { x: 5, y: 5 };
    expect(distance(p, p)).toBe(0);
  });

  it("should handle negative coordinates", () => {
    const p1: Point2D = { x: -3, y: -4 };
    const p2: Point2D = { x: 0, y: 0 };
    expect(distance(p1, p2)).toBe(5);
  });

  it("should calculate horizontal distance", () => {
    const p1: Point2D = { x: 0, y: 5 };
    const p2: Point2D = { x: 10, y: 5 };
    expect(distance(p1, p2)).toBe(10);
  });

  it("should calculate vertical distance", () => {
    const p1: Point2D = { x: 5, y: 0 };
    const p2: Point2D = { x: 5, y: 10 };
    expect(distance(p1, p2)).toBe(10);
  });

  it("should handle large numbers", () => {
    const p1: Point2D = { x: 0, y: 0 };
    const p2: Point2D = { x: 1000, y: 1000 };
    expect(distance(p1, p2)).toBeCloseTo(1414.21, 1);
  });
});

describe("angle", () => {
  it("should calculate angle to point directly to the right", () => {
    const from: Point2D = { x: 0, y: 0 };
    const to: Point2D = { x: 1, y: 0 };
    expect(angle(from, to)).toBe(0);
  });

  it("should calculate angle to point directly up", () => {
    const from: Point2D = { x: 0, y: 0 };
    const to: Point2D = { x: 0, y: 1 };
    expect(angle(from, to)).toBeCloseTo(Math.PI / 2);
  });

  it("should calculate angle to point directly left", () => {
    const from: Point2D = { x: 0, y: 0 };
    const to: Point2D = { x: -1, y: 0 };
    expect(angle(from, to)).toBeCloseTo(Math.PI);
  });

  it("should calculate angle to point directly down", () => {
    const from: Point2D = { x: 0, y: 0 };
    const to: Point2D = { x: 0, y: -1 };
    expect(angle(from, to)).toBeCloseTo(-Math.PI / 2);
  });

  it("should calculate 45-degree angle", () => {
    const from: Point2D = { x: 0, y: 0 };
    const to: Point2D = { x: 1, y: 1 };
    expect(angle(from, to)).toBeCloseTo(Math.PI / 4);
  });

  it("should handle non-origin starting points", () => {
    const from: Point2D = { x: 10, y: 10 };
    const to: Point2D = { x: 11, y: 10 };
    expect(angle(from, to)).toBe(0);
  });

  it("should return 0 for same point", () => {
    const p: Point2D = { x: 5, y: 5 };
    expect(angle(p, p)).toBe(0);
  });
});

describe("lineIntersection", () => {
  it("should find intersection of perpendicular lines", () => {
    const line1p1: Point2D = { x: 0, y: 5 };
    const line1p2: Point2D = { x: 10, y: 5 };
    const line2p1: Point2D = { x: 5, y: 0 };
    const line2p2: Point2D = { x: 5, y: 10 };

    const result = lineIntersection(line1p1, line1p2, line2p1, line2p2);
    expect(result).not.toBeNull();
    expect(result?.x).toBeCloseTo(5);
    expect(result?.y).toBeCloseTo(5);
  });

  it("should return null for parallel lines", () => {
    const line1p1: Point2D = { x: 0, y: 0 };
    const line1p2: Point2D = { x: 10, y: 0 };
    const line2p1: Point2D = { x: 0, y: 5 };
    const line2p2: Point2D = { x: 10, y: 5 };

    const result = lineIntersection(line1p1, line1p2, line2p1, line2p2);
    expect(result).toBeNull();
  });

  it("should find intersection of diagonal lines", () => {
    const line1p1: Point2D = { x: 0, y: 0 };
    const line1p2: Point2D = { x: 10, y: 10 };
    const line2p1: Point2D = { x: 0, y: 10 };
    const line2p2: Point2D = { x: 10, y: 0 };

    const result = lineIntersection(line1p1, line1p2, line2p1, line2p2);
    expect(result).not.toBeNull();
    expect(result?.x).toBeCloseTo(5);
    expect(result?.y).toBeCloseTo(5);
  });

  it("should handle vertical line intersection", () => {
    const line1p1: Point2D = { x: 5, y: 0 };
    const line1p2: Point2D = { x: 5, y: 10 };
    const line2p1: Point2D = { x: 0, y: 3 };
    const line2p2: Point2D = { x: 10, y: 3 };

    const result = lineIntersection(line1p1, line1p2, line2p1, line2p2);
    expect(result).not.toBeNull();
    expect(result?.x).toBeCloseTo(5);
    expect(result?.y).toBeCloseTo(3);
  });

  it("should handle intersection outside line segments", () => {
    // Lines would intersect if extended
    const line1p1: Point2D = { x: 0, y: 0 };
    const line1p2: Point2D = { x: 2, y: 2 };
    const line2p1: Point2D = { x: 0, y: 4 };
    const line2p2: Point2D = { x: 2, y: 2 };

    const result = lineIntersection(line1p1, line1p2, line2p1, line2p2);
    expect(result).not.toBeNull();
    // Note: This returns the mathematical intersection, not segment intersection
  });
});

describe("rotate", () => {
  it("should rotate point 90 degrees around origin", () => {
    const point: Point2D = { x: 1, y: 0 };
    const pivot: Point2D = { x: 0, y: 0 };
    const result = rotate(point, pivot, Math.PI / 2);

    expect(result.x).toBeCloseTo(0, 10);
    expect(result.y).toBeCloseTo(1, 10);
  });

  it("should rotate point 180 degrees", () => {
    const point: Point2D = { x: 1, y: 0 };
    const pivot: Point2D = { x: 0, y: 0 };
    const result = rotate(point, pivot, Math.PI);

    expect(result.x).toBeCloseTo(-1, 10);
    expect(result.y).toBeCloseTo(0, 10);
  });

  it("should rotate point 270 degrees", () => {
    const point: Point2D = { x: 1, y: 0 };
    const pivot: Point2D = { x: 0, y: 0 };
    const result = rotate(point, pivot, (3 * Math.PI) / 2);

    expect(result.x).toBeCloseTo(0, 10);
    expect(result.y).toBeCloseTo(-1, 10);
  });

  it("should rotate around non-origin pivot", () => {
    const point: Point2D = { x: 11, y: 10 };
    const pivot: Point2D = { x: 10, y: 10 };
    const result = rotate(point, pivot, Math.PI / 2);

    expect(result.x).toBeCloseTo(10, 10);
    expect(result.y).toBeCloseTo(11, 10);
  });

  it("should not change point at pivot", () => {
    const point: Point2D = { x: 5, y: 5 };
    const pivot: Point2D = { x: 5, y: 5 };
    const result = rotate(point, pivot, Math.PI / 4);

    expect(result.x).toBeCloseTo(5);
    expect(result.y).toBeCloseTo(5);
  });

  it("should handle negative angles", () => {
    const point: Point2D = { x: 1, y: 0 };
    const pivot: Point2D = { x: 0, y: 0 };
    const result = rotate(point, pivot, -Math.PI / 2);

    expect(result.x).toBeCloseTo(0, 10);
    expect(result.y).toBeCloseTo(-1, 10);
  });

  it("should rotate 45 degrees correctly", () => {
    const point: Point2D = { x: 1, y: 0 };
    const pivot: Point2D = { x: 0, y: 0 };
    const result = rotate(point, pivot, Math.PI / 4);

    expect(result.x).toBeCloseTo(Math.sqrt(2) / 2, 10);
    expect(result.y).toBeCloseTo(Math.sqrt(2) / 2, 10);
  });
});

describe("sprocketRadius", () => {
  it("should calculate radius for 32-tooth chainring", () => {
    const radius = sprocketRadius(32);
    expect(radius).toBeCloseTo(64.68, 1);
  });

  it("should calculate radius for 28-tooth cog", () => {
    const radius = sprocketRadius(28);
    expect(radius).toBeCloseTo(56.6, 1);
  });

  it("should scale linearly with tooth count", () => {
    const radius1 = sprocketRadius(10);
    const radius2 = sprocketRadius(20);
    expect(radius2).toBeCloseTo(radius1 * 2, 5);
  });

  it("should handle single tooth (theoretical)", () => {
    const radius = sprocketRadius(1);
    expect(radius).toBeGreaterThan(0);
    expect(radius).toBeCloseTo(2.02, 1);
  });

  it("should handle large sprockets", () => {
    const radius = sprocketRadius(100);
    expect(radius).toBeCloseTo(202.13, 1);
  });
});

describe("calculateChainLength", () => {
  it("should calculate chain length for horizontal sprockets", () => {
    const chainring: Point2D = { x: 0, y: 0 };
    const distance = 400;
    const cog: Point2D = { x: distance, y: 0 };
    const radius = sprocketRadius(50);

    const length = calculateChainLength(chainring, cog, radius, radius);
    const expected = 2 * radius * Math.PI + 2 * distance; // Full wrap + straight sections

    expect(length).toBeGreaterThan(0);
    expect(length).toBeCloseTo(expected, 0);
  });

  it("should handle circles that are very close", () => {
    const chainring: Point2D = { x: 0, y: 0 };
    const cog: Point2D = { x: 10, y: 0 };
    const chainringRadius = 50;
    const cogRadius = 50;

    const length = calculateChainLength(
      chainring,
      cog,
      chainringRadius,
      cogRadius,
    );

    expect(length).toBeGreaterThan(0);
  });

  it("should handle different sized sprockets", () => {
    const chainring: Point2D = { x: 0, y: 0 };
    const cog: Point2D = { x: 500, y: 0 };
    const chainringRadius = 100;
    const cogRadius = 50;

    const length = calculateChainLength(
      chainring,
      cog,
      chainringRadius,
      cogRadius,
    );

    expect(length).toBeGreaterThan(500);
  });

  it("should calculate chain length even when circles overlap", () => {
    const chainring: Point2D = { x: 0, y: 0 };

    const radius = sprocketRadius(50);
    const distance = radius * 1.5;
    const cog: Point2D = { x: distance, y: 0 };

    const length = calculateChainLength(chainring, cog, radius, radius);
    const expected = 2 * radius * Math.PI + 2 * distance; // Full wrap + straight sections

    // Even with overlap, calculates full chain path
    expect(length).toBeGreaterThan(0);
    expect(length).toBeCloseTo(expected, 0);
  });

  it("should handle vertical alignment", () => {
    const chainring: Point2D = { x: 0, y: 0 };
    const cog: Point2D = { x: 0, y: 400 };
    const chainringRadius = 64.8;
    const cogRadius = 56.7;

    const length = calculateChainLength(
      chainring,
      cog,
      chainringRadius,
      cogRadius,
    );

    expect(length).toBeGreaterThan(0);
  });
});

describe("circleCircleIntersection", () => {
  it("should find two intersection points for overlapping circles", () => {
    const center1: Point2D = { x: 0, y: 0 };
    const center2: Point2D = { x: 3, y: 0 };
    const radius1 = 2;
    const radius2 = 2;

    const intersections = circleCircleIntersection(
      center1,
      radius1,
      center2,
      radius2,
    );

    expect(intersections).toHaveLength(2);
    expect(intersections[0].x).toBeCloseTo(1.5, 5);
    expect(intersections[1].x).toBeCloseTo(1.5, 5);
    expect(Math.abs(intersections[0].y)).toBeCloseTo(1.32, 1);
    expect(Math.abs(intersections[1].y)).toBeCloseTo(1.32, 1);
  });

  it("should return empty array for circles too far apart", () => {
    const center1: Point2D = { x: 0, y: 0 };
    const center2: Point2D = { x: 10, y: 0 };
    const radius1 = 2;
    const radius2 = 2;

    const intersections = circleCircleIntersection(
      center1,
      radius1,
      center2,
      radius2,
    );

    expect(intersections).toHaveLength(0);
  });

  it("should return empty array for one circle inside another", () => {
    const center1: Point2D = { x: 0, y: 0 };
    const center2: Point2D = { x: 1, y: 0 };
    const radius1 = 10;
    const radius2 = 2;

    const intersections = circleCircleIntersection(
      center1,
      radius1,
      center2,
      radius2,
    );

    expect(intersections).toHaveLength(0);
  });

  it("should return empty array for identical centers", () => {
    const center: Point2D = { x: 0, y: 0 };
    const radius1 = 5;
    const radius2 = 5;

    const intersections = circleCircleIntersection(
      center,
      radius1,
      center,
      radius2,
    );

    expect(intersections).toHaveLength(0);
  });

  it("should handle circles touching at exactly one point", () => {
    const center1: Point2D = { x: 0, y: 0 };
    const center2: Point2D = { x: 5, y: 0 };
    const radius1 = 2;
    const radius2 = 3;

    const intersections = circleCircleIntersection(
      center1,
      radius1,
      center2,
      radius2,
    );

    expect(intersections).toHaveLength(2);
    // When touching, both points should be at the same location
    expect(intersections[0].x).toBeCloseTo(intersections[1].x, 5);
    expect(intersections[0].y).toBeCloseTo(intersections[1].y, 5);
  });

  it("should handle different radius sizes", () => {
    const center1: Point2D = { x: 0, y: 0 };
    const center2: Point2D = { x: 100, y: 0 };
    const radius1 = 150;
    const radius2 = 80;

    const intersections = circleCircleIntersection(
      center1,
      radius1,
      center2,
      radius2,
    );

    expect(intersections).toHaveLength(2);
  });

  it("should handle vertical alignment", () => {
    const center1: Point2D = { x: 0, y: 0 };
    const center2: Point2D = { x: 0, y: 4 };
    const radius1 = 3;
    const radius2 = 3;

    const intersections = circleCircleIntersection(
      center1,
      radius1,
      center2,
      radius2,
    );

    expect(intersections).toHaveLength(2);
    expect(intersections[0].y).toBeCloseTo(2, 5);
    expect(intersections[1].y).toBeCloseTo(2, 5);
  });

  it("should handle non-origin centers", () => {
    const center1: Point2D = { x: 100, y: 100 };
    const center2: Point2D = { x: 103, y: 100 };
    const radius1 = 2;
    const radius2 = 2;

    const intersections = circleCircleIntersection(
      center1,
      radius1,
      center2,
      radius2,
    );

    expect(intersections).toHaveLength(2);
    expect(intersections[0].x).toBeCloseTo(101.5, 1);
    expect(intersections[1].x).toBeCloseTo(101.5, 1);
  });

  it("should maintain symmetry in intersection points", () => {
    const center1: Point2D = { x: 0, y: 0 };
    const center2: Point2D = { x: 5, y: 0 };
    const radius1 = 4;
    const radius2 = 4;

    const intersections = circleCircleIntersection(
      center1,
      radius1,
      center2,
      radius2,
    );

    expect(intersections).toHaveLength(2);
    // Points should be symmetric about the line connecting centers
    expect(intersections[0].y).toBeCloseTo(-intersections[1].y, 10);
  });
});
