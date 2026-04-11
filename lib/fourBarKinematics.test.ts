import { describe, it, expect } from "vitest";
import {
  establishFourBarLinkage,
  calculateFourBarStateAtShockStroke,
  solveAtCrankAngle,
} from "./fourBarKinematics";
import { createDefaultGeometry } from "./types";

// A parallelogram 4-bar geometry with exact integer link lengths (3-4-5 triangle).
// Parallelogram property: coupler translates without rotating, so wheel travel
// and shock compression are always monotone with each other.
//
// World-frame positions (Y measured from ground), bbHeight=330, rearWheelRadius=375:
//   A = (0,  540) — main frame pivot      (bbToPivotX=0,   bbToPivotY=210)
//   B = (0,  480) — Horst link frame pivot (bbToHorstFramePivotX=0, bbToHorstFramePivotY=150)
//   C0= (80, 480) — coupler pivot C       (lenAC=100, parallelogram arm)
//   D0= (80, 420) — coupler pivot D       (lenBD=100, lenCD=60)
//   E0= (220,375) — rear axle at top-out  (swingarmLength=275 from A)
//   S0= (110,480) — shock coupler mount   (30mm right of C0 in coupler frame)
//   F = (110,690) — shock frame mount     (|F-S0| = 210mm = shockETE exactly)
function makeTestGeometry() {
  return createDefaultGeometry({
    overrides: {
      suspensionType: "four-bar",
      bbToPivotX: 0,
      bbToPivotY: 210,
      swingarmLength: 275,
      // 4-bar specific: all relative to BB (bbHeight=330)
      bbToHorstFramePivotX: 0,
      bbToHorstFramePivotY: 150,
      horstCouplerPivotCX: 80,
      horstCouplerPivotCY: 150,
      horstCouplerPivotDX: 80,
      horstCouplerPivotDY: 90,
      // S0 = (110, 480): 30mm right of C0 in coupler frame
      horstShockCouplerMountX: 110,
      horstShockCouplerMountY: 150,
      // F = (110, 690): directly above S0, |F-S0| = 690-480 = 210 = shockETE
      shockFrameMountX: 110,
      shockFrameMountY: 360,
      shockETE: 210,
      shockStroke: 65,
    },
  });
}

describe("establishFourBarLinkage", () => {
  it("computes link lengths from top-out positions", () => {
    const geom = makeTestGeometry();
    const setup = establishFourBarLinkage(geom);

    // A = (0, 540), C0 = (80, 480): lenAC = sqrt(80²+60²) = 100
    const expectedLenAC = Math.sqrt(80 * 80 + 60 * 60);
    expect(setup.lenAC).toBeCloseTo(expectedLenAC, 1);

    // C0 = (80, 480), D0 = (80, 420): lenCD = 60
    const expectedLenCD = 60;
    expect(setup.lenCD).toBeCloseTo(expectedLenCD, 1);

    // B = (0, 480), D0 = (80, 420): lenBD = sqrt(80²+60²) = 100
    const expectedLenBD = Math.sqrt(80 * 80 + 60 * 60);
    expect(setup.lenBD).toBeCloseTo(expectedLenBD, 1);
  });

  it("stores frame pivot positions", () => {
    const geom = makeTestGeometry();
    const setup = establishFourBarLinkage(geom);

    expect(setup.A.x).toBeCloseTo(0);
    expect(setup.A.y).toBeCloseTo(540); // bbHeight + bbToPivotY = 330 + 210 = 540
    expect(setup.B.x).toBeCloseTo(0);
    expect(setup.B.y).toBeCloseTo(480); // 330 + 150
  });

  it("returns alpha0 consistent with C0 relative to A", () => {
    const geom = makeTestGeometry();
    const setup = establishFourBarLinkage(geom);

    // A = (0, 540), C0 = (80, 480)
    const expectedAlpha0 = Math.atan2(480 - 540, 80 - 0);
    expect(setup.alpha0).toBeCloseTo(expectedAlpha0, 5);
  });

  it("alpha0 correctly reconstructs C0 via solveAtCrankAngle", () => {
    const geom = makeTestGeometry();
    const setup = establishFourBarLinkage(geom);
    const result = solveAtCrankAngle(setup.alpha0, setup);

    expect(result).not.toBeNull();
    // C should be at C0 = (80, 480)
    expect(result!.C.x).toBeCloseTo(80, 1);
    expect(result!.C.y).toBeCloseTo(480, 1);
    // D should be at D0 = (80, 420)
    expect(result!.D.x).toBeCloseTo(80, 1);
    expect(result!.D.y).toBeCloseTo(420, 1);
  });
});

describe("calculateFourBarStateAtShockStroke — at top-out (stroke=0)", () => {
  it("returns travelMM ≈ 0", () => {
    const geom = makeTestGeometry();
    const setup = establishFourBarLinkage(geom);
    const state = calculateFourBarStateAtShockStroke(0, geom.shockETE, geom.bbHeight, setup);

    expect(state.travelMM).toBeCloseTo(0, 1);
  });

  it("axle is at rearWheelRadius height", () => {
    const geom = makeTestGeometry();
    const setup = establishFourBarLinkage(geom);
    const state = calculateFourBarStateAtShockStroke(0, geom.shockETE, geom.bbHeight, setup);

    expect(state.rearAxlePosition.y).toBeCloseTo(375, 1); // rearWheelRadius = 750/2
  });

  it("BB is at bbHeight", () => {
    const geom = makeTestGeometry();
    const setup = establishFourBarLinkage(geom);
    const state = calculateFourBarStateAtShockStroke(0, geom.shockETE, geom.bbHeight, setup);

    expect(state.bbPosition.y).toBeCloseTo(geom.bbHeight, 1);
  });

  it("shock length at stroke=0 is approximately shockETE", () => {
    const geom = makeTestGeometry();
    const setup = establishFourBarLinkage(geom);
    const state = calculateFourBarStateAtShockStroke(0, geom.shockETE, geom.bbHeight, setup);

    expect(state.shockLength).toBeCloseTo(geom.shockETE, 0); // within 1mm
  });
});

describe("calculateFourBarStateAtShockStroke — link lengths remain constant", () => {
  it("main arm |A–C| is constant through travel", () => {
    const geom = makeTestGeometry();
    const setup = establishFourBarLinkage(geom);

    for (let stroke = 0; stroke <= geom.shockStroke; stroke += 10) {
      const state = calculateFourBarStateAtShockStroke(stroke, geom.shockETE, geom.bbHeight, setup);
      const lenAC = Math.sqrt(
        (state.pivotPosition.x - state.horstJointCPosition.x) ** 2 +
          (state.pivotPosition.y - state.horstJointCPosition.y) ** 2,
      );
      expect(lenAC).toBeCloseTo(setup.lenAC, 1);
    }
  });

  it("Horst link |B–D| is constant through travel", () => {
    const geom = makeTestGeometry();
    const setup = establishFourBarLinkage(geom);

    for (let stroke = 0; stroke <= geom.shockStroke; stroke += 10) {
      const state = calculateFourBarStateAtShockStroke(stroke, geom.shockETE, geom.bbHeight, setup);
      const lenBD = Math.sqrt(
        (state.horstLinkPivotBPosition.x - state.horstJointDPosition.x) ** 2 +
          (state.horstLinkPivotBPosition.y - state.horstJointDPosition.y) ** 2,
      );
      expect(lenBD).toBeCloseTo(setup.lenBD, 1);
    }
  });

  it("coupler |C–D| is constant through travel", () => {
    const geom = makeTestGeometry();
    const setup = establishFourBarLinkage(geom);

    for (let stroke = 0; stroke <= geom.shockStroke; stroke += 10) {
      const state = calculateFourBarStateAtShockStroke(stroke, geom.shockETE, geom.bbHeight, setup);
      const lenCD = Math.sqrt(
        (state.horstJointCPosition.x - state.horstJointDPosition.x) ** 2 +
          (state.horstJointCPosition.y - state.horstJointDPosition.y) ** 2,
      );
      expect(lenCD).toBeCloseTo(setup.lenCD, 1);
    }
  });
});

describe("calculateFourBarStateAtShockStroke — physical properties", () => {
  it("axle stays at rearWheelRadius through travel", () => {
    const geom = makeTestGeometry();
    const setup = establishFourBarLinkage(geom);

    for (let stroke = 0; stroke <= geom.shockStroke; stroke += 10) {
      const state = calculateFourBarStateAtShockStroke(stroke, geom.shockETE, geom.bbHeight, setup);
      expect(state.rearAxlePosition.y).toBeCloseTo(375, 1);
    }
  });

  it("travelMM increases monotonically with shock stroke", () => {
    const geom = makeTestGeometry();
    const setup = establishFourBarLinkage(geom);
    let prevTravel = -1;

    for (let stroke = 0; stroke <= geom.shockStroke; stroke += 5) {
      const state = calculateFourBarStateAtShockStroke(stroke, geom.shockETE, geom.bbHeight, setup);
      expect(state.travelMM).toBeGreaterThanOrEqual(prevTravel - 0.01); // allow tiny float noise
      prevTravel = state.travelMM;
    }
  });

  it("shock length decreases as stroke increases", () => {
    const geom = makeTestGeometry();
    const setup = establishFourBarLinkage(geom);
    let prevShockLength = Infinity;

    for (let stroke = 0; stroke <= geom.shockStroke; stroke += 10) {
      const state = calculateFourBarStateAtShockStroke(stroke, geom.shockETE, geom.bbHeight, setup);
      expect(state.shockLength).toBeLessThanOrEqual(prevShockLength + 0.01);
      prevShockLength = state.shockLength;
    }
  });

  it("shock length matches target (shockETE - stroke) within 0.5mm", () => {
    const geom = makeTestGeometry();
    const setup = establishFourBarLinkage(geom);

    for (let stroke = 0; stroke <= geom.shockStroke; stroke += 10) {
      const state = calculateFourBarStateAtShockStroke(stroke, geom.shockETE, geom.bbHeight, setup);
      expect(state.shockLength).toBeCloseTo(geom.shockETE - stroke, 0);
    }
  });
});
