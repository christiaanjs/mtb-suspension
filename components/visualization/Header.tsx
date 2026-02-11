import { DrawComponentProps } from "./types";
import { KinematicState } from "@/lib/types";

type NumericKeys<T> = {
  [K in keyof T]: T[K] extends number ? K : never;
}[keyof T];

const metricLabelDpUnit: [
  NumericKeys<KinematicState>,
  string,
  number,
  string,
][] = [
  ["travelMM", "Travel", 1, " mm"],
  ["leverageRatio", "LR", 2, ""],
  //   ["antiSquat", "AS", 0, "%"],
  //   ["antiRise", "AR", 0, "%"],
];

export const Header = ({
  conversion: { padding },
  state,
}: DrawComponentProps) => (
  <>
    <text
      x={padding + 10}
      y={30}
      fontSize="14"
      fontWeight="bold"
      fill="#1f2937"
      className="dark:fill-white"
    >
      {metricLabelDpUnit
        .map(
          ([key, label, dp, unit]) =>
            `${label}: ${state[key].toFixed(dp)}${unit}`,
        )
        .join(" | ")}
    </text>
    {/* Pitch angle indicator */}
    <text
      x={padding + 10}
      y={50}
      fontSize="12"
      fill="#666"
      className="dark:fill-gray-400"
    >
      Pitch: {Math.abs(state.pitchAngleDegrees).toFixed(2)}°{" "}
      {state.pitchAngleDegrees > 0
        ? "↓ (nose down)"
        : state.pitchAngleDegrees < 0
          ? "↑ (nose up)"
          : "— (level)"}
    </text>{" "}
  </>
);
