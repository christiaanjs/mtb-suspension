import { describe, it, expect } from "vitest";
import { runKinematicAnalysis } from "./kinematics";
import { createDefaultGeometry, SuspensionType } from "./types";
import { distance, lineIntersection } from "./geometry";

const fourBarGeometry = () =>
  createDefaultGeometry({
    overrides: { suspensionType: SuspensionType.FourBar },
  });

describe("Four-bar linkage", () => {
  it("produces linkage points on every state", () => {
    const results = runKinematicAnalysis(fourBarGeometry());
    expect(results.states.length).toBeGreaterThan(0);
    for (const state of results.states) {
      expect(state.fourBar).not.toBeNull();
      expect(state.fourBar!.mainPivot).toBeDefined();
      expect(state.fourBar!.rockerPivot).toBeDefined();
      expect(state.fourBar!.seatstayLower).toBeDefined();
      expect(state.fourBar!.seatstayUpper).toBeDefined();
    }
  });

  it("single-pivot bikes have no four-bar points", () => {
    const results = runKinematicAnalysis(createDefaultGeometry());
    for (const state of results.states) {
      expect(state.fourBar).toBeNull();
    }
  });

  describe("rigid-body constraints", () => {
    const results = runKinematicAnalysis(fourBarGeometry());
    const TOLERANCE = 0.1; // mm

    const lengthIsConstant = (fn: (s: (typeof results.states)[number]) => number) => {
      const ref = fn(results.states[0]);
      for (const state of results.states) {
        expect(Math.abs(fn(state) - ref)).toBeLessThan(TOLERANCE);
      }
    };

    it("chainstay length (main pivot → lower junction) is constant", () => {
      lengthIsConstant((s) =>
        distance(s.fourBar!.mainPivot.world, s.fourBar!.seatstayLower.world),
      );
    });

    it("seatstay length (lower → upper junction) is constant", () => {
      lengthIsConstant((s) =>
        distance(s.fourBar!.seatstayLower.world, s.fourBar!.seatstayUpper.world),
      );
    });

    it("rocker length (rocker pivot → upper junction) is constant", () => {
      lengthIsConstant((s) =>
        distance(s.fourBar!.rockerPivot.world, s.fourBar!.seatstayUpper.world),
      );
    });

    it("rear axle stays rigidly attached to the seatstay", () => {
      lengthIsConstant((s) =>
        distance(s.fourBar!.seatstayLower.world, s.rearAxle.world),
      );
      lengthIsConstant((s) =>
        distance(s.fourBar!.seatstayUpper.world, s.rearAxle.world),
      );
    });

    it("the frame-fixed pivots stay a constant distance apart", () => {
      lengthIsConstant((s) =>
        distance(s.fourBar!.mainPivot.world, s.fourBar!.rockerPivot.world),
      );
    });
  });

  it("the stored pivot is the instant centre of the two links", () => {
    const results = runKinematicAnalysis(fourBarGeometry());
    // Sample a mid-travel state where the links are not parallel.
    const state = results.states[Math.floor(results.states.length / 2)];
    const ic = lineIntersection(
      state.fourBar!.mainPivot.world,
      state.fourBar!.seatstayLower.world,
      state.fourBar!.rockerPivot.world,
      state.fourBar!.seatstayUpper.world,
    );
    expect(ic).not.toBeNull();
    expect(state.pivot.world.x).toBeCloseTo(ic!.x, 3);
    expect(state.pivot.world.y).toBeCloseTo(ic!.y, 3);
  });

  it("reaches roughly the configured travel and is monotonic", () => {
    const results = runKinematicAnalysis(fourBarGeometry());
    const travels = results.states.map((s) => s.travelMM);
    const maxTravel = Math.max(...travels);
    expect(maxTravel).toBeGreaterThan(120);
    expect(maxTravel).toBeLessThan(180);
    expect(travels[0]).toBeCloseTo(0, 3);
    for (let i = 1; i < travels.length; i++) {
      expect(travels[i]).toBeGreaterThanOrEqual(travels[i - 1] - 1e-6);
    }
  });

  it("leverage ratio is positive and physically plausible", () => {
    const results = runKinematicAnalysis(fourBarGeometry());
    for (const state of results.states) {
      expect(state.leverageRatio).toBeGreaterThan(1);
      expect(state.leverageRatio).toBeLessThan(5);
    }
  });

  it("all dynamics metrics are finite throughout travel", () => {
    const results = runKinematicAnalysis(fourBarGeometry());
    for (const state of results.states) {
      for (const v of [
        state.leverageRatio,
        state.wheelRate,
        state.antiSquat,
        state.antiRise,
        state.pedalKickback,
        state.chainGrowth,
        state.trail,
        state.pitchAngleDegrees,
      ]) {
        expect(Number.isFinite(v)).toBe(true);
      }
    }
  });

  it("chain growth and pedal kickback are zero at top-out", () => {
    const results = runKinematicAnalysis(fourBarGeometry());
    expect(results.states[0].chainGrowth).toBeCloseTo(0, 5);
    expect(results.states[0].pedalKickback).toBeCloseTo(0, 5);
  });

  it("the rear axle rests on the ground at every state", () => {
    const geometry = fourBarGeometry();
    const rearWheelRadius = geometry.rearWheelDiameter / 2;
    const results = runKinematicAnalysis(geometry);
    for (const state of results.states) {
      expect(state.rearAxle.world.y).toBeCloseTo(rearWheelRadius, 3);
    }
  });
});
