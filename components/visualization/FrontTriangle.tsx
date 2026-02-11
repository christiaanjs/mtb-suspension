import { degreesToRadians } from "@/lib/geometry";
import { getApplyPitchRotation } from "@/lib/kinematics";
import {
  BikeGeometry,
  BoundsConversions,
  computedProperties,
  KinematicStateFirstPass,
} from "@/lib/types";

export const FrontTriangle = ({
  state,
  geometry,
  conversion,
}: {
  state: KinematicStateFirstPass;
  geometry: BikeGeometry;
  conversion: BoundsConversions;
}) => {
  const bbPos = state.bbPosition;
  const { toCanvasX, toCanvasY } = conversion;
  const seatAngleRad = degreesToRadians(geometry.seatAngle);
  const seatTopWorldX =
    bbPos.x - geometry.seatTubeLength * Math.cos(seatAngleRad);
  const seatTopWorldY =
    bbPos.y + geometry.seatTubeLength * Math.sin(seatAngleRad);
  const applyPitchRotation = getApplyPitchRotation(
    state.rearAxlePosition,
    state.pitchAngleDegrees,
  );
  const seatTopRotated = applyPitchRotation({
    x: seatTopWorldX,
    y: seatTopWorldY,
  });

  // Downtube junction (20mm above head tube bottom in world coords)
  const headTubeBottom = computedProperties.headTubeBottom(
    geometry,
    state.bbPosition,
  );
  const headTubeTop = computedProperties.headTubeTop(
    geometry,
    state.bbPosition,
  );
  const downtubeJunctionY = headTubeBottom.y + 20;
  const downtubeJunctionWorldX = headTubeBottom.x;
  const downtubeJunctionRotated = applyPitchRotation({
    x: downtubeJunctionWorldX,
    y: downtubeJunctionY,
  });
  const bbPosRotated = applyPitchRotation(bbPos);

  const htTopRotated = applyPitchRotation(headTubeTop);
  const htBottomRotated = applyPitchRotation(headTubeBottom);

  return (
    <>
      {/* Downtube - BB to head tube junction */}
      <line
        x1={toCanvasX(bbPosRotated.x)}
        y1={toCanvasY(bbPosRotated.y)}
        x2={toCanvasX(downtubeJunctionRotated.x)}
        y2={toCanvasY(downtubeJunctionRotated.y)}
        stroke="#2563eb"
        strokeWidth="2.67"
      />

      {/* Head tube */}
      <line
        x1={toCanvasX(htBottomRotated.x)}
        y1={toCanvasY(htBottomRotated.y)}
        x2={toCanvasX(htTopRotated.x)}
        y2={toCanvasY(htTopRotated.y)}
        stroke="#2563eb"
        strokeWidth="2.67"
      />

      {/* Seat tube - BB to seat top */}
      <line
        x1={toCanvasX(bbPosRotated.x)}
        y1={toCanvasY(bbPosRotated.y)}
        x2={toCanvasX(seatTopRotated.x)}
        y2={toCanvasY(seatTopRotated.y)}
        stroke="#2563eb"
        strokeWidth="2.67"
      />

      {/* Top tube - head tube top to seat top */}
      <line
        x1={toCanvasX(htTopRotated.x)}
        y1={toCanvasY(htTopRotated.y)}
        x2={toCanvasX(seatTopRotated.x)}
        y2={toCanvasY(seatTopRotated.y)}
        stroke="#2563eb"
        strokeWidth="1.33"
      />
    </>
  );
};
