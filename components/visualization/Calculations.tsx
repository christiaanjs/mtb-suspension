import {
  BoundsConversions,
  GraphType,
  LineSegment,
  Point2D,
} from "@/lib/types";
import { DrawComponentProps } from "./types";
import { doAntiSquatCalculations } from "@/lib/kinematics";

/**
 *
 * Liang-Barsky line clipping algorithm implementation to clip reference lines to the visualization bounds.
 * @see {https://en.wikipedia.org/wiki/Liang%E2%80%93Barsky_algorithm}
 *
 * @param line
 * @param bounds
 */
const getLineForBounds = (
  line: LineSegment,
  bounds: { width: number; height: number },
): LineSegment | null => {
  const {
    start: { x: x1, y: y1 },
    end: { x: x2, y: y2 },
  } = line;

  const xmin = 0;
  const ymin = 0;
  const { height: ymax, width: xmax } = bounds;

  const p1 = -(x2 - x1);
  const p2 = -p1;
  const p3 = -(y2 - y1);
  const p4 = -p3;

  const q1 = x1 - xmin;
  const q2 = xmax - x1;
  const q3 = y1 - ymin;
  const q4 = ymax - y1;

  const entry: number[] = [];
  const exit: number[] = [];

  // TODO: Should we use more careful floating point comparisons here?
  if (
    (p1 === 0 && q1 < 0) ||
    (p2 === 0 && q2 < 0) ||
    (p3 === 0 && q3 < 0) ||
    (p4 === 0 && q4 < 0)
  ) {
    console.warn("Line is parallel to window");
    return null;
  }
  if (p1 !== 0) {
    const r1 = q1 / p1;
    const r2 = q2 / p2;
    if (p1 < 0) {
      entry.push(r1);
      exit.push(r2);
    } else {
      entry.push(r2);
      exit.push(r1);
    }
  }
  if (p3 !== 0) {
    const r3 = q3 / p3;
    const r4 = q4 / p4;
    if (p3 < 0) {
      entry.push(r3);
      exit.push(r4);
    } else {
      entry.push(r4);
      exit.push(r3);
    }
  }

  if (entry.length === 0 || exit.length === 0) {
    console.warn("Degenerate line");
    return null;
  }

  const u1 = Math.max(...entry);
  const u2 = Math.min(...exit);

  if (u1 > u2) {
    console.warn("Line is outside of window");
    return null;
  }

  const slope = Point2D.subtract(line.end, line.start);

  return {
    start: {
      x: x1 + slope.x * u1,
      y: y1 + slope.y * u1,
    },
    end: {
      x: x1 + slope.x * u2,
      y: y1 + slope.y * u2,
    },
  };
};

const measurementColor = "#999";
const measurementLineWidth = "0.67";
const lineStyle = "3,3";
const opacity = "0.5";

const ReferenceLine = ({
  line: { start, end },
  conversion,
}: {
  line: LineSegment;
  conversion: BoundsConversions;
}) => {
  const { toCanvas } = conversion;
  const screenStart = toCanvas(start);
  const screenEnd = toCanvas(end);

  const screenLine = { start: screenStart, end: screenEnd };
  const fullScreenLine = getLineForBounds(screenLine, conversion);

  if (!fullScreenLine) {
    return null;
  }

  return (
    <line
      x1={fullScreenLine.start.x}
      x2={fullScreenLine.end.x}
      y1={fullScreenLine.start.y}
      y2={fullScreenLine.end.y}
      stroke={measurementColor}
      strokeWidth={measurementLineWidth}
      strokeDasharray={lineStyle}
      opacity={opacity}
    />
  );
};

const ReferenceHorizontalLine = ({
  y,
  conversion,
}: {
  y: number;
  conversion: BoundsConversions;
}) => {
  const { toCanvasY } = conversion;
  const screenY = toCanvasY(y);

  return (
    <line
      x1={0}
      x2={conversion.width}
      y1={screenY}
      y2={screenY}
      stroke={measurementColor}
      strokeWidth={measurementLineWidth}
      strokeDasharray={lineStyle}
      opacity={opacity}
    />
  );
};

const ReferenceVerticalLine = ({
  x,
  conversion,
}: {
  x: number;
  conversion: BoundsConversions;
}) => {
  const { toCanvasX } = conversion;
  const screenX = toCanvasX(x);

  return (
    <line
      x1={screenX}
      x2={screenX}
      y1={0}
      y2={conversion.height}
      stroke={measurementColor}
      strokeWidth={measurementLineWidth}
      strokeDasharray={lineStyle}
      opacity={opacity}
    />
  );
};

const ReferencePoint = ({
  point,
  conversion,
}: {
  point: Point2D;
  conversion: BoundsConversions;
}) => {
  const { toCanvas } = conversion;
  const screenPoint = toCanvas(point);

  return (
    <circle
      cx={screenPoint.x}
      cy={screenPoint.y}
      r={4}
      fill={measurementColor}
      opacity={opacity}
    />
  );
};

const AntiSquatCalculations = ({
  conversion,
  state,
  geometry,
}: DrawComponentProps) => {
  const calculations = doAntiSquatCalculations(state, geometry, {
    warn: true,
  });
  console.log("Drawing anti squat", calculations);
  return (
    <>
      <ReferenceLine line={calculations.chainForce} conversion={conversion} />
      <ReferenceLine
        line={calculations.suspensionForce}
        conversion={conversion}
      />
      {"instantForceLine" in calculations && (
        <>
          <ReferenceLine
            line={calculations.instantForceLine}
            conversion={conversion}
          />
          <ReferenceVerticalLine
            x={calculations.frontContactPatch.x}
            conversion={conversion}
          />
        </>
      )}
      {"antiSquatIntersection" in calculations && (
        <>
          <ReferencePoint
            point={calculations.antiSquatIntersection}
            conversion={conversion}
          />
          <ReferenceHorizontalLine
            y={calculations.centreOfMassHeight}
            conversion={conversion}
          />
        </>
      )}
    </>
  );
};

export const Calculations = ({
  selectedGraph,
  ...props
}: DrawComponentProps & { selectedGraph: string }) => {
  console.log("Drawing calculations for " + selectedGraph);
  switch (selectedGraph) {
    case GraphType.AntiSquat:
      return <AntiSquatCalculations {...props} />;
    default:
      return null;
  }
};

export default Calculations;
