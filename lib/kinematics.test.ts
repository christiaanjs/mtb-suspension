import { describe, it, expect } from "vitest";
import {
  runKinematicAnalysis,
  getIdlerPosition,
  getApplyPitchRotation,
  getRotatedCentreOfMass,
} from "./kinematics";
import { createDefaultGeometry, IdlerType } from "./types";
import { distance, sprocketRadius } from "./geometry";

describe("Rigid Triangle Constraint", () => {
  it("swingarm triangle should maintain fixed side lengths throughout travel", () => {
    const geometry = createDefaultGeometry();
    const results = runKinematicAnalysis(geometry);

    // Get the first and last states
    const firstState = results.states[0];
    const lastState = results.states[results.states.length - 1];

    // Calculate triangle sides at first state (top-out)
    const firstPivotToEye = distance(
      firstState.pivot.world,
      firstState.swingarmEye.world,
    );
    const firstPivotToAxle = distance(
      firstState.pivot.world,
      firstState.rearAxle.world,
    );
    const firstEyeToAxle = distance(
      firstState.swingarmEye.world,
      firstState.rearAxle.world,
    );

    // Calculate triangle sides at last state (full compression)
    const lastPivotToEye = distance(
      lastState.pivot.world,
      lastState.swingarmEye.world,
    );
    const lastPivotToAxle = distance(
      lastState.pivot.world,
      lastState.rearAxle.world,
    );
    const lastEyeToAxle = distance(
      lastState.swingarmEye.world,
      lastState.rearAxle.world,
    );

    // The swingarm is rigid, so these distances should be constant throughout travel
    // Allow 0.1mm tolerance for floating point errors
    const TOLERANCE = 0.1;

    expect(Math.abs(firstPivotToAxle - lastPivotToAxle)).toBeLessThan(
      TOLERANCE,
    );
    expect(Math.abs(firstEyeToAxle - lastEyeToAxle)).toBeLessThan(TOLERANCE);
    expect(Math.abs(firstPivotToEye - lastPivotToEye)).toBeLessThan(TOLERANCE);
  });

  it("pivot-to-axle distance should equal swingarm length", () => {
    const geometry = createDefaultGeometry();
    const results = runKinematicAnalysis(geometry);

    const TOLERANCE = 0.1; // mm

    for (const state of results.states) {
      const pivotToAxle = distance(state.pivot.world, state.rearAxle.world);
      expect(Math.abs(pivotToAxle - geometry.swingarmLength)).toBeLessThan(
        TOLERANCE,
      );
    }
  });

  it("swingarm triangle shape should not change across all travel points", () => {
    const geometry = createDefaultGeometry();
    const results = runKinematicAnalysis(geometry);

    const TOLERANCE = 0.1;
    const firstState = results.states[0];

    // Reference triangle sides at top-out
    const referencePivotToEye = distance(
      firstState.pivot.world,
      firstState.swingarmEye.world,
    );
    const referencePivotToAxle = distance(
      firstState.pivot.world,
      firstState.rearAxle.world,
    );
    const referenceEyeToAxle = distance(
      firstState.swingarmEye.world,
      firstState.rearAxle.world,
    );

    // Check that all states maintain the same triangle geometry
    for (const state of results.states) {
      const pivotToEye = distance(
        state.pivot.world,
        state.swingarmEye.world,
      );
      const pivotToAxle = distance(state.pivot.world, state.rearAxle.world);
      const eyeToAxle = distance(
        state.swingarmEye.world,
        state.rearAxle.world,
      );

      expect(Math.abs(pivotToEye - referencePivotToEye)).toBeLessThan(
        TOLERANCE,
      );
      expect(Math.abs(pivotToAxle - referencePivotToAxle)).toBeLessThan(
        TOLERANCE,
      );
      expect(Math.abs(eyeToAxle - referenceEyeToAxle)).toBeLessThan(TOLERANCE);
    }
  });

  it("pitch angle should align wheel contact points when rotated", () => {
    const geometry = createDefaultGeometry();
    const results = runKinematicAnalysis(geometry);

    const TOLERANCE = 0.1; // mm

    // Helper function to apply pitch rotation
    const applyPitchRotation = (
      point: { x: number; y: number },
      rearAxlePos: { x: number; y: number },
      pitchAngleDegrees: number,
    ): { x: number; y: number } => {
      const pitchRad = (pitchAngleDegrees * Math.PI) / 180;
      const dx = point.x - rearAxlePos.x;
      const dy = point.y - rearAxlePos.y;
      const cosA = Math.cos(-pitchRad);
      const sinA = Math.sin(-pitchRad);
      return {
        x: rearAxlePos.x + dx * cosA - dy * sinA,
        y: rearAxlePos.y + dx * sinA + dy * cosA,
      };
    };

    // Check each state
    for (const state of results.states) {
      const rearWheelRadius = geometry.rearWheelDiameter / 2;
      const frontWheelRadius = geometry.frontWheelDiameter / 2;

      // Rear wheel contact point (always at ground level, x = rear axle x)
      const rearContactGround = {
        x: state.rearAxle.world.x,
        y: 0, // ground level
      };

      // Rotate both axles by pitch angle (rotation center is rear axle on ground)
      const rotatedRearAxle = applyPitchRotation(
        state.rearAxle.world,
        rearContactGround,
        state.pitchAngleDegrees,
      );
      const rotatedFrontAxle = applyPitchRotation(
        state.frontAxle.world,
        rearContactGround,
        state.pitchAngleDegrees,
      );

      // After rotation, the line connecting the rotated axle centers should be tangent to both wheels
      // This means:
      // 1. The perpendicular distance from rotated rear center to the line should equal rear radius
      // 2. The perpendicular distance from rotated front center to the line should equal front radius
      // 3. Most importantly: the contact points should both be at y=0 (ground)

      // The pitch angle should position things so that when we draw a line from rear contact to front contact,
      // it's tangent to both wheels. This is satisfied if the axle centers, when rotated, maintain the correct
      // geometry relative to the wheel radii.

      // Calculate the perpendicular distance from each axle center to the ground
      // After pitch rotation, these distances should correspond to the wheel radii at the contact point X positions

      // For the rear wheel: rotated axle Y minus radius should be close to 0 (ground)
      const rearAxleHeightAboveGround = rotatedRearAxle.y - rearWheelRadius;
      expect(Math.abs(rearAxleHeightAboveGround)).toBeLessThan(TOLERANCE);

      // For the front wheel: rotated axle Y minus radius should be close to 0 (ground)
      const frontAxleHeightAboveGround = rotatedFrontAxle.y - frontWheelRadius;
      expect(Math.abs(frontAxleHeightAboveGround)).toBeLessThan(TOLERANCE);
    }
  });

  it("pitch angle at 0% shock stroke should be zero with equal wheel sizes", () => {
    const geometry = createDefaultGeometry();
    const results = runKinematicAnalysis(geometry);

    // Get state at top-out (0% shock stroke, first state)
    const topOutState = results.states[0];

    // Determine whether we need this large tolerance because of numerical error or if there is an issue
    const TOLERANCE = 0.2; // degrees
    expect(Math.abs(topOutState.pitchAngleDegrees)).toBeLessThan(TOLERANCE);
  });
});

describe("Leverage Ratio and Wheel Rate", () => {
  it("leverage ratio should be positive throughout travel", () => {
    const results = runKinematicAnalysis(createDefaultGeometry());
    for (const state of results.states) {
      expect(state.leverageRatio).toBeGreaterThan(0);
    }
  });

  it("leverage ratio should be in a physically plausible range", () => {
    const results = runKinematicAnalysis(createDefaultGeometry());
    for (const state of results.states) {
      expect(state.leverageRatio).toBeGreaterThan(1);
      expect(state.leverageRatio).toBeLessThan(10);
    }
  });

  it("wheel rate satisfies springRate / leverageRatio^2", () => {
    const geometry = createDefaultGeometry();
    const results = runKinematicAnalysis(geometry);
    for (const state of results.states) {
      const expected =
        geometry.shockSpringRate / (state.leverageRatio * state.leverageRatio);
      expect(state.wheelRate).toBeCloseTo(expected, 5);
    }
  });

  it("wheel rate should be positive throughout travel", () => {
    const results = runKinematicAnalysis(createDefaultGeometry());
    for (const state of results.states) {
      expect(state.wheelRate).toBeGreaterThan(0);
    }
  });
});

describe("Anti-Squat and Anti-Rise", () => {
  it("anti-squat should be positive for default geometry", () => {
    const results = runKinematicAnalysis(createDefaultGeometry());
    for (const state of results.states) {
      expect(state.antiSquat).toBeGreaterThan(0);
    }
  });

  it("anti-squat should be in a physically plausible range (0-1000%)", () => {
    const results = runKinematicAnalysis(createDefaultGeometry());
    for (const state of results.states) {
      expect(state.antiSquat).toBeGreaterThan(0);
      expect(state.antiSquat).toBeLessThan(1000);
    }
  });

  it("anti-rise should be positive for default geometry", () => {
    const results = runKinematicAnalysis(createDefaultGeometry());
    for (const state of results.states) {
      expect(state.antiRise).toBeGreaterThan(0);
    }
  });

  it("anti-rise should be in a physically plausible range (0-200%)", () => {
    const results = runKinematicAnalysis(createDefaultGeometry());
    for (const state of results.states) {
      expect(state.antiRise).toBeGreaterThan(0);
      expect(state.antiRise).toBeLessThan(200);
    }
  });

  describe("with swingarm-mounted idler", () => {
    // Regression test: getFrontSprocketCircle used to return the idler for both
    // FrameMounted and SwingarmMounted, making the two circles identical.
    // tangentPoints(idler, idler) divides by dist=0 → NaN antiSquat.
    const geometry = createDefaultGeometry({
      overrides: {
        idlerType: IdlerType.SwingarmMounted,
        idlerX: -60,
        idlerY: 160,
        idlerTeeth: 16,
      },
    });

    it("anti-squat is finite (not NaN) for all travel states", () => {
      const results = runKinematicAnalysis(geometry);
      for (const state of results.states) {
        expect(isNaN(state.antiSquat)).toBe(false);
        expect(isFinite(state.antiSquat)).toBe(true);
      }
    });

    it("anti-squat is in a physically plausible range (0-1000%)", () => {
      const results = runKinematicAnalysis(geometry);
      for (const state of results.states) {
        expect(state.antiSquat).toBeGreaterThan(0);
        expect(state.antiSquat).toBeLessThan(1000);
      }
    });
  });
});

describe("Trail", () => {
  it("trail should be positive for default geometry", () => {
    const results = runKinematicAnalysis(createDefaultGeometry());
    for (const state of results.states) {
      expect(state.trail).toBeGreaterThan(0);
    }
  });

  it("trail should be in a physically plausible range (mm)", () => {
    const results = runKinematicAnalysis(createDefaultGeometry());
    for (const state of results.states) {
      expect(state.trail).toBeGreaterThan(50);
      expect(state.trail).toBeLessThan(300);
    }
  });

  it("trail changes monotonically across travel", () => {
    const results = runKinematicAnalysis(createDefaultGeometry());
    const trails = results.states.map((s) => s.trail);
    // Trail should change consistently in one direction throughout travel
    const allIncreasing = trails.every((t, i) => i === 0 || t >= trails[i - 1]);
    const allDecreasing = trails.every((t, i) => i === 0 || t <= trails[i - 1]);
    expect(allIncreasing || allDecreasing).toBe(true);
  });
});

describe("getIdlerPosition", () => {
  const baseState = runKinematicAnalysis(createDefaultGeometry()).states[0];

  it("returns null when idler type is None", () => {
    const geometry = createDefaultGeometry();
    expect(getIdlerPosition(baseState, geometry)).toBeNull();
  });

  it("returns BB-relative position for frame-mounted idler", () => {
    const geometry = createDefaultGeometry({
      overrides: { idlerType: IdlerType.FrameMounted, idlerX: -60, idlerY: 160 },
    });
    const result = getIdlerPosition(baseState, geometry);
    expect(result).not.toBeNull();
    expect(result?.x).toBeCloseTo(baseState.bb.world.x + (-60));
    expect(result?.y).toBeCloseTo(baseState.bb.world.y + 160);
  });

  it("returns a point for swingarm-mounted idler", () => {
    const geometry = createDefaultGeometry({
      overrides: { idlerType: IdlerType.SwingarmMounted },
    });
    const result = getIdlerPosition(baseState, geometry);
    expect(result).not.toBeNull();
    expect(typeof result?.x).toBe("number");
    expect(typeof result?.y).toBe("number");
  });
});

describe("getApplyPitchRotation", () => {
  it("zero pitch angle is an identity transform", () => {
    const rearAxle = { x: 100, y: 375 };
    const applyPitch = getApplyPitchRotation(rearAxle, 0);
    const point = { x: 200, y: 500 };
    const result = applyPitch(point);
    expect(result.x).toBeCloseTo(point.x);
    expect(result.y).toBeCloseTo(point.y);
  });

  it("pivot point is unchanged by rotation", () => {
    const rearAxle = { x: 100, y: 375 };
    const applyPitch = getApplyPitchRotation(rearAxle, 10);
    const result = applyPitch(rearAxle);
    expect(result.x).toBeCloseTo(rearAxle.x);
    expect(result.y).toBeCloseTo(rearAxle.y);
  });

  it("preserves distance from pivot after rotation", () => {
    const rearAxle = { x: 0, y: 0 };
    const point = { x: 100, y: 0 };
    const applyPitch = getApplyPitchRotation(rearAxle, 15);
    const result = applyPitch(point);
    const distBefore = Math.hypot(point.x - rearAxle.x, point.y - rearAxle.y);
    const distAfter = Math.hypot(result.x - rearAxle.x, result.y - rearAxle.y);
    expect(distAfter).toBeCloseTo(distBefore);
  });
});

describe("Pedal Kickback and Chain Growth", () => {
  describe("No idler (default geometry)", () => {
    const geometry = createDefaultGeometry();
    const results = runKinematicAnalysis(geometry);

    it("chainGrowth is 0 at top-out", () => {
      expect(results.states[0].chainGrowth).toBeCloseTo(0, 5);
    });

    it("pedalKickback is 0 at top-out", () => {
      expect(results.states[0].pedalKickback).toBeCloseTo(0, 5);
    });

    it("crankAngle is 0 at top-out", () => {
      expect(results.states[0].crankAngle).toBeCloseTo(0, 5);
    });

    it("pedalKickback equals chainGrowth / chainringRadius * (180/PI) at every state", () => {
      const cr = sprocketRadius(geometry.chainringTeeth);
      for (const state of results.states) {
        const expected = (state.chainGrowth / cr) * (180 / Math.PI);
        expect(state.pedalKickback).toBeCloseTo(expected, 5);
      }
    });

    it("crankAngle is the negation of pedalKickback at every state", () => {
      for (const state of results.states) {
        expect(state.crankAngle).toBeCloseTo(-state.pedalKickback, 5);
      }
    });

    it("totalChainGrowth equals chainGrowth at every state", () => {
      for (const state of results.states) {
        expect(state.totalChainGrowth).toBeCloseTo(state.chainGrowth, 5);
      }
    });

    it("chainGrowth is finite throughout travel", () => {
      for (const state of results.states) {
        expect(isFinite(state.chainGrowth)).toBe(true);
        expect(isNaN(state.chainGrowth)).toBe(false);
      }
    });

    it("pedalKickback is in a physically plausible range", () => {
      for (const state of results.states) {
        expect(state.pedalKickback).toBeGreaterThan(-5);
        expect(state.pedalKickback).toBeLessThan(90);
      }
    });
  });

  describe("Frame-mounted idler", () => {
    const geometry = createDefaultGeometry({
      overrides: { idlerType: IdlerType.FrameMounted, idlerX: -60, idlerY: 160, idlerTeeth: 16 },
    });
    const results = runKinematicAnalysis(geometry);

    it("chainGrowth is 0 at top-out", () => {
      expect(results.states[0].chainGrowth).toBeCloseTo(0, 5);
    });

    it("pedalKickback is 0 at top-out", () => {
      expect(results.states[0].pedalKickback).toBeCloseTo(0, 5);
    });

    it("chainGrowth is finite throughout travel", () => {
      for (const state of results.states) {
        expect(isFinite(state.chainGrowth)).toBe(true);
        expect(isNaN(state.chainGrowth)).toBe(false);
      }
    });

    it("pedalKickback equals chainGrowth / chainringRadius * (180/PI) at every state", () => {
      const cr = sprocketRadius(geometry.chainringTeeth);
      for (const state of results.states) {
        const expected = (state.chainGrowth / cr) * (180 / Math.PI);
        expect(state.pedalKickback).toBeCloseTo(expected, 5);
      }
    });
  });

  describe("Swingarm-mounted idler", () => {
    const geometry = createDefaultGeometry({
      overrides: { idlerType: IdlerType.SwingarmMounted, idlerX: -60, idlerY: 160, idlerTeeth: 16 },
    });
    const results = runKinematicAnalysis(geometry);

    it("chainGrowth is 0 at top-out", () => {
      expect(results.states[0].chainGrowth).toBeCloseTo(0, 5);
    });

    it("pedalKickback is 0 at top-out", () => {
      expect(results.states[0].pedalKickback).toBeCloseTo(0, 5);
    });

    it("chainGrowth is finite throughout travel", () => {
      for (const state of results.states) {
        expect(isFinite(state.chainGrowth)).toBe(true);
        expect(isNaN(state.chainGrowth)).toBe(false);
      }
    });

    it("pedalKickback equals chainGrowth / chainringRadius * (180/PI) at every state", () => {
      const cr = sprocketRadius(geometry.chainringTeeth);
      for (const state of results.states) {
        const expected = (state.chainGrowth / cr) * (180 / Math.PI);
        expect(state.pedalKickback).toBeCloseTo(expected, 5);
      }
    });
  });
});

describe("getRotatedCentreOfMass", () => {
  it("returns a point offset from BB by comX/comY then pitch-rotated", () => {
    const results = runKinematicAnalysis(createDefaultGeometry());
    const state = results.states[0];
    const geometry = createDefaultGeometry();
    const applyPitch = getApplyPitchRotation(
      state.rearAxle.world,
      state.pitchAngleDegrees,
    );
    const com = getRotatedCentreOfMass(state, geometry, applyPitch);
    expect(typeof com.x).toBe("number");
    expect(typeof com.y).toBe("number");
    // CoM should be above the ground
    expect(com.y).toBeGreaterThan(0);
  });

  it("CoM height is close to BB + comY offset at near-zero pitch", () => {
    const geometry = createDefaultGeometry();
    const results = runKinematicAnalysis(geometry);
    const state = results.states[0]; // top-out: pitch ≈ 0
    const applyPitch = getApplyPitchRotation(
      state.rearAxle.world,
      state.pitchAngleDegrees,
    );
    const com = getRotatedCentreOfMass(state, geometry, applyPitch);
    // At near-zero pitch the rotated CoM y is approximately bb.world.y + comY
    // Allow a few mm tolerance for the small but non-zero pitch angle
    expect(com.y).toBeCloseTo(state.bb.world.y + geometry.comY, -1);
  });
});

// ---- 4-bar / Horst link integration tests ----
// Uses the same parallelogram geometry as fourBarKinematics.test.ts so results
// are predictable: travelMM ≈ shock stroke (1:1 leverage ratio).
function makeFourBarGeometry() {
  return createDefaultGeometry({
    overrides: {
      suspensionType: "four-bar",
      bbToPivotX: 0,
      bbToPivotY: 210,
      swingarmLength: 275,
      bbToHorstFramePivotX: 0,
      bbToHorstFramePivotY: 150,
      horstArmLength: 100,
      horstCrankAngleDeg: -36.87,
      horstCouplerLength: 60,
      horstLinkLength: 100,
      horstShockMountForward: 0,
      horstShockMountPerp: 30,
      shockFrameMountX: 110,
      shockFrameMountY: 360,
      shockETE: 210,
      shockStroke: 65,
    },
  });
}

describe("4-bar kinematics via runKinematicAnalysis", () => {
  it("returns a non-empty result", () => {
    const geometry = makeFourBarGeometry();
    const results = runKinematicAnalysis(geometry);
    expect(results.states.length).toBeGreaterThan(0);
  });

  it("first state has travelMM ≈ 0", () => {
    const geometry = makeFourBarGeometry();
    const results = runKinematicAnalysis(geometry);
    expect(results.states[0].travelMM).toBeCloseTo(0, 1);
  });

  it("axle stays at rearWheelRadius throughout travel", () => {
    const geometry = makeFourBarGeometry();
    const results = runKinematicAnalysis(geometry);
    for (const state of results.states) {
      expect(state.rearAxle.world.y).toBeCloseTo(375, 1);
    }
  });

  it("horstJointC and horstJointD are populated", () => {
    const geometry = makeFourBarGeometry();
    const results = runKinematicAnalysis(geometry);
    const first = results.states[0];
    expect(first.horstJointC).toBeDefined();
    expect(first.horstJointD).toBeDefined();
    expect(first.horstLinkPivotB).toBeDefined();
  });

  it("|A-C| link length is constant through travel", () => {
    const geometry = makeFourBarGeometry();
    const results = runKinematicAnalysis(geometry);
    const refLenAC = distance(
      results.states[0].pivot.world,
      results.states[0].horstJointC!.world,
    );
    for (const state of results.states) {
      const lenAC = distance(state.pivot.world, state.horstJointC!.world);
      expect(lenAC).toBeCloseTo(refLenAC, 1);
    }
  });

  it("|B-D| link length is constant through travel", () => {
    const geometry = makeFourBarGeometry();
    const results = runKinematicAnalysis(geometry);
    const refLenBD = distance(
      results.states[0].horstLinkPivotB!.world,
      results.states[0].horstJointD!.world,
    );
    for (const state of results.states) {
      const lenBD = distance(state.horstLinkPivotB!.world, state.horstJointD!.world);
      expect(lenBD).toBeCloseTo(refLenBD, 1);
    }
  });
});

