import { DrawComponentProps } from "./types";

export const CentreOfMass = ({ state, conversion }: DrawComponentProps) => {
  const { toCanvas } = conversion;
  const comCanvas = toCanvas(state.centreOfMass.wheelsOnGround);

  return (
    <circle
      cx={comCanvas.x}
      cy={comCanvas.y}
      r={3}
      fill="#f59e0b"
      opacity="0.7"
    />
  );
};
