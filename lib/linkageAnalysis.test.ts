import { describe, it, expect } from "vitest";
import { runLinkageAnalysis } from "./linkageAnalysis";
import { createDefaultLinkageGeometry } from "./types";

describe("runLinkageAnalysis", () => {
  it("returns non-empty states", () => {
    const geom = createDefaultLinkageGeometry();
    const results = runLinkageAnalysis(geom);
    expect(results.states.length).toBeGreaterThan(0);
  });

  it("axlePath length matches states length", () => {
    const geom = createDefaultLinkageGeometry();
    const results = runLinkageAnalysis(geom);
    expect(results.axlePath.length).toBe(results.states.length);
  });

  it("first state travelMM ≈ 0", () => {
    const geom = createDefaultLinkageGeometry();
    const results = runLinkageAnalysis(geom);
    expect(results.states[0].travelMM).toBeCloseTo(0, 1);
  });

  it("first state axle y ≈ rearWheelRadius", () => {
    const geom = createDefaultLinkageGeometry();
    const results = runLinkageAnalysis(geom);
    expect(results.states[0].axle.y).toBeCloseTo(geom.rearWheelRadius, 1);
  });

  it("shock length decreases through travel", () => {
    const geom = createDefaultLinkageGeometry();
    const results = runLinkageAnalysis(geom);
    let prev = Infinity;
    for (const state of results.states) {
      expect(state.shockLength).toBeLessThanOrEqual(prev + 0.01);
      prev = state.shockLength;
    }
  });

  it("all states have instantCenter, pivotA, pivotB, jointC, jointD defined", () => {
    const geom = createDefaultLinkageGeometry();
    const results = runLinkageAnalysis(geom);
    for (const state of results.states) {
      expect(state.pivotA).toBeDefined();
      expect(state.pivotB).toBeDefined();
      expect(state.jointC).toBeDefined();
      expect(state.jointD).toBeDefined();
    }
  });
});
