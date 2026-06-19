import { describe, it, expect } from "vitest";
import { runKinematicAnalysis, getIdlerPosition } from "./kinematics";
import { createDefaultGeometry, SuspensionType, IdlerType } from "./types";
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

  describe("swingarm-mounted idler", () => {
    const geometry = createDefaultGeometry({
      overrides: {
        suspensionType: SuspensionType.FourBar,
        idlerType: IdlerType.SwingarmMounted,
        idlerX: -120,
        idlerY: 120,
        idlerTeeth: 16,
      },
    });
    const results = runKinematicAnalysis(geometry);

    it("places an idler on every state", () => {
      for (const state of results.states) {
        expect(state.idler).not.toBeNull();
      }
    });

    it("at top-out the idler sits at the configured BB-relative position", () => {
      const top = results.states[0];
      expect(top.idler!.world.x).toBeCloseTo(top.bb.world.x + geometry.idlerX, 3);
      expect(top.idler!.world.y).toBeCloseTo(top.bb.world.y + geometry.idlerY, 3);
    });

    it("the idler stays rigidly attached to the seatstay", () => {
      const TOLERANCE = 0.05; // mm
      const ref = results.states[0];
      const dLower0 = distance(ref.idler!.world, ref.fourBar!.seatstayLower.world);
      const dUpper0 = distance(ref.idler!.world, ref.fourBar!.seatstayUpper.world);
      const dAxle0 = distance(ref.idler!.world, ref.rearAxle.world);
      for (const state of results.states) {
        expect(
          Math.abs(distance(state.idler!.world, state.fourBar!.seatstayLower.world) - dLower0),
        ).toBeLessThan(TOLERANCE);
        expect(
          Math.abs(distance(state.idler!.world, state.fourBar!.seatstayUpper.world) - dUpper0),
        ).toBeLessThan(TOLERANCE);
        expect(
          Math.abs(distance(state.idler!.world, state.rearAxle.world) - dAxle0),
        ).toBeLessThan(TOLERANCE);
      }
    });

    it("getIdlerPosition matches the state idler position", () => {
      for (const state of results.states) {
        const p = getIdlerPosition(state, geometry);
        expect(p).not.toBeNull();
        expect(p!.x).toBeCloseTo(state.idler!.world.x, 6);
        expect(p!.y).toBeCloseTo(state.idler!.world.y, 6);
      }
    });

    it("chain growth and pedal kickback are zero at top-out and finite throughout", () => {
      expect(results.states[0].chainGrowth).toBeCloseTo(0, 5);
      expect(results.states[0].pedalKickback).toBeCloseTo(0, 5);
      for (const state of results.states) {
        expect(Number.isFinite(state.chainGrowth)).toBe(true);
        expect(Number.isFinite(state.pedalKickback)).toBe(true);
        expect(Number.isFinite(state.antiSquat)).toBe(true);
      }
    });
  });

  describe("frame-mounted idler", () => {
    const geometry = createDefaultGeometry({
      overrides: {
        suspensionType: SuspensionType.FourBar,
        idlerType: IdlerType.FrameMounted,
        idlerX: -60,
        idlerY: 160,
        idlerTeeth: 16,
      },
    });
    const results = runKinematicAnalysis(geometry);

    it("idler stays at a fixed BB-relative offset", () => {
      for (const state of results.states) {
        expect(state.idler!.world.x).toBeCloseTo(state.bb.world.x + geometry.idlerX, 3);
        expect(state.idler!.world.y).toBeCloseTo(state.bb.world.y + geometry.idlerY, 3);
      }
    });

    it("chain growth is zero at top-out and finite throughout", () => {
      expect(results.states[0].chainGrowth).toBeCloseTo(0, 5);
      for (const state of results.states) {
        expect(Number.isFinite(state.chainGrowth)).toBe(true);
      }
    });
  });
});
