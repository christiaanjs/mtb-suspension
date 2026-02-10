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
        x: state.rearAxlePosition.x,
        y: 0, // ground level
      };

      // Rotate both axles by pitch angle (rotation center is rear axle on ground)
      const rotatedRearAxle = applyPitchRotation(
        state.rearAxlePosition,
        rearContactGround,
        state.pitchAngleDegrees,
      );
      const rotatedFrontAxle = applyPitchRotation(
        state.frontAxlePosition,
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


