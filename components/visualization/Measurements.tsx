import { computedProperties } from "@/lib/types";
import { DrawComponentProps } from "./types";
import { getApplyPitchRotation } from "@/lib/kinematics";

export const Measurements = ({
  conversion,
  state,
  geometry,
}: DrawComponentProps) => {
  const { toCanvasX, toCanvasY, scale, height, padding } = conversion;
  const applyPitchRotation = getApplyPitchRotation(
    state.rearAxlePosition,
    state.pitchAngleDegrees,
  );
  const bbPosRotated = applyPitchRotation(state.bbPosition);
  const rearAxlePosRotated = applyPitchRotation(state.rearAxlePosition);
  const frontAxleRotated = applyPitchRotation(state.frontAxlePosition);

  const groundY = toCanvasY(computedProperties.rearWheelRadius(geometry));
  const bbScreenX = toCanvasX(bbPosRotated.x);
  const bbScreenY = toCanvasY(bbPosRotated.y);
  const rearAxleScreenX = toCanvasX(rearAxlePosRotated.x);
  const frontAxleScreenX = toCanvasX(frontAxleRotated.x);

  const bbHeight = state.bbPosition.y;
  const rearCenter = Math.abs(rearAxlePosRotated.x - bbPosRotated.x);
  const frontCenter = Math.abs(frontAxleRotated.x - bbPosRotated.x) / scale;

  const measurementColor = "#999";
  const measurementLineWidth = "0.67";
  const lineStyle = "3,3";

  return (
    <>
      {/* BB Height measurement */}
      <line
        x1={bbScreenX}
        y1={bbScreenY}
        x2={bbScreenX}
        y2={groundY}
        stroke={measurementColor}
        strokeWidth={measurementLineWidth}
        strokeDasharray={lineStyle}
        opacity="0.5"
      />
      <text
        x={bbScreenX + 15}
        y={(bbScreenY + groundY) / 2}
        fontSize="10"
        fill={measurementColor}
        opacity="0.7"
      >
        BB: {Math.round(bbHeight)}mm
      </text>

      {/* Rear Center measurement */}
      <line
        x1={bbScreenX}
        y1={groundY + 30}
        x2={bbScreenX}
        y2={groundY + 20}
        stroke={measurementColor}
        strokeWidth={measurementLineWidth}
        opacity="0.5"
      />
      <line
        x1={bbScreenX}
        y1={groundY + 30}
        x2={rearAxleScreenX}
        y2={groundY + 30}
        stroke={measurementColor}
        strokeWidth={measurementLineWidth}
        opacity="0.5"
      />
      <line
        x1={rearAxleScreenX}
        y1={groundY + 30}
        x2={rearAxleScreenX}
        y2={groundY + 20}
        stroke={measurementColor}
        strokeWidth={measurementLineWidth}
        opacity="0.5"
      />
      <text
        x={(bbScreenX + rearAxleScreenX) / 2}
        y={groundY + 40}
        fontSize="10"
        fill={measurementColor}
        opacity="0.7"
        textAnchor="middle"
      >
        RC: {Math.round(rearCenter)}mm
      </text>

      {/* Front Center measurement */}
      <line
        x1={bbScreenX}
        y1={groundY + 50}
        x2={bbScreenX}
        y2={groundY + 45}
        stroke={measurementColor}
        strokeWidth={measurementLineWidth}
        opacity="0.5"
      />
      <line
        x1={bbScreenX}
        y1={groundY + 50}
        x2={frontAxleScreenX}
        y2={groundY + 50}
        stroke={measurementColor}
        strokeWidth={measurementLineWidth}
        opacity="0.5"
      />
      <line
        x1={frontAxleScreenX}
        y1={groundY + 50}
        x2={frontAxleScreenX}
        y2={groundY + 45}
        stroke={measurementColor}
        strokeWidth={measurementLineWidth}
        opacity="0.5"
      />
      <text
        x={(bbScreenX + frontAxleScreenX) / 2}
        y={groundY + 60}
        fontSize="10"
        fill={measurementColor}
        opacity="0.7"
        textAnchor="middle"
      >
        FC: {Math.round(frontCenter)}mm
      </text>

      {/* Trail measurement */}
      <text
        x={padding + 10}
        y={height - 40}
        fontSize="10"
        fill={measurementColor}
        opacity="0.7"
      >
        Trail: {state.trail.toFixed(1)}mm
      </text>

      {/* F/R Balance */}
      {(() => {
        const wheelbase = state.frontAxlePosition.x - state.rearAxlePosition.x;
        const comX = state.bbPosition.x + geometry.comX;
        const distanceFromRear = comX - state.rearAxlePosition.x;
        const frontPercentage = (distanceFromRear / wheelbase) * 100;
        const rearPercentage = 100 - frontPercentage;

        return (
          <text
            x={padding + 10}
            y={height - 20}
            fontSize="10"
            fill={measurementColor}
            opacity="0.7"
          >
            F/R Balance: {Math.round(frontPercentage)}/
            {Math.round(rearPercentage)}
          </text>
        );
      })()}
    </>
  );
};
