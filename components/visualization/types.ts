import { BikeGeometry, BoundsConversions, BikeState } from "@/lib/types";

export type DrawComponentProps = {
  geometry: BikeGeometry;
  state: BikeState;
  conversion: BoundsConversions;
};
