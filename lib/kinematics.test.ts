import { describe, it, expect } from "vitest";
import { runKinematicAnalysis } from "./kinematics";
import { createDefaultGeometry } from "./types";
import { distance } from "./geometry";

describe("Rigid Triangle Constraint", () => {
  it("swingarm triangle should maintain fixed side lengths throughout travel", () => {
    const geometry = createDefaultGeometry();
    const results = runKinematicAnalysis(geometry);

    // Get the first and last states
    const firstState = results.states[0];
    const lastState = results.states[results.states.length - 1];

    // Calculate triangle sides at first state (top-out)
    const firstPivotToEye = distance(
      firstState.pivotPosition,
      firstState.swingarmEyePosition,
    );
    const firstPivotToAxle = distance(
      firstState.pivotPosition,
      firstState.rearAxlePosition,
    );
    const firstEyeToAxle = distance(
      firstState.swingarmEyePosition,
      firstState.rearAxlePosition,
    );

    // Calculate triangle sides at last state (full compression)
    const lastPivotToEye = distance(
      lastState.pivotPosition,
      lastState.swingarmEyePosition,
    );
    const lastPivotToAxle = distance(
      lastState.pivotPosition,
      lastState.rearAxlePosition,
    );
    const lastEyeToAxle = distance(
      lastState.swingarmEyePosition,
      lastState.rearAxlePosition,
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
      const pivotToAxle = distance(state.pivotPosition, state.rearAxlePosition);
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
      firstState.pivotPosition,
      firstState.swingarmEyePosition,
    );
    const referencePivotToAxle = distance(
      firstState.pivotPosition,
      firstState.rearAxlePosition,
    );
    const referenceEyeToAxle = distance(
      firstState.swingarmEyePosition,
      firstState.rearAxlePosition,
    );

    // Check that all states maintain the same triangle geometry
    for (const state of results.states) {
      const pivotToEye = distance(
        state.pivotPosition,
        state.swingarmEyePosition,
      );
      const pivotToAxle = distance(state.pivotPosition, state.rearAxlePosition);
      const eyeToAxle = distance(
        state.swingarmEyePosition,
        state.rearAxlePosition,
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
});
