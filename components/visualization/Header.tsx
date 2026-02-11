import { DrawComponentProps } from "./types";

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
      Travel: {state.travelMM.toFixed(1)} mm | LR:{" "}
      {state.leverageRatio.toFixed(2)} | AS: {state.antiSquat.toFixed(0)}% | AR:{" "}
      {state.antiRise.toFixed(0)}%
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
