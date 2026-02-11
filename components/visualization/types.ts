import { BikeGeometry, BoundsConversions, KinematicState } from "@/lib/types";

export type DrawComponentProps = {
  geometry: BikeGeometry;
  state: KinematicState;
  conversion: BoundsConversions;
};
