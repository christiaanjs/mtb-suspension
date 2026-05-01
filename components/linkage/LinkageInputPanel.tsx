"use client";

import { LinkageLengthParams } from "@/lib/types";
import { InputField, InputSection } from "@/components/InputPanel";

interface Props {
  params: LinkageLengthParams;
  onParamsChange: (updates: Partial<LinkageLengthParams>) => void;
  isCalculating: boolean;
}

export function LinkageInputPanel({ params, onParamsChange, isCalculating }: Props) {
  return (
    <div className="h-full overflow-y-auto bg-white dark:bg-black">
      <div className="p-4 space-y-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Linkage Geometry</h2>

        {isCalculating && (
          <div className="text-sm text-blue-600 dark:text-blue-400">Calculating...</div>
        )}

        <InputSection title="Frame Pivots (world frame, Y = height above ground)">
          <p className="text-xs text-gray-500 dark:text-gray-400">Pivot A (main arm):</p>
          <InputField label="  A X (mm)" value={params.pivotA.x}
            onChange={(v) => onParamsChange({ pivotA: { ...params.pivotA, x: v as number } })}
            className="ml-2" />
          <InputField label="  A Y (mm)" value={params.pivotA.y}
            onChange={(v) => onParamsChange({ pivotA: { ...params.pivotA, y: v as number } })}
            className="ml-2" />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Pivot B (Horst link):</p>
          <InputField label="  B X (mm)" value={params.pivotB.x}
            onChange={(v) => onParamsChange({ pivotB: { ...params.pivotB, x: v as number } })}
            className="ml-2" />
          <InputField label="  B Y (mm)" value={params.pivotB.y}
            onChange={(v) => onParamsChange({ pivotB: { ...params.pivotB, y: v as number } })}
            className="ml-2" />
        </InputSection>

        <InputSection title="Link Lengths">
          <InputField label="Main Arm A–C (mm)" value={params.armLength}
            onChange={(v) => onParamsChange({ armLength: v as number })}
            min={1} />
          <InputField label="Arm Angle at Top-out (°)" value={params.crankAngleDeg}
            onChange={(v) => onParamsChange({ crankAngleDeg: v as number })}
            step={0.5} />
          <InputField label="Coupler C–D (mm)" value={params.couplerLength}
            onChange={(v) => onParamsChange({ couplerLength: v as number })}
            min={1} />
          <InputField label="Horst Link B–D (mm)" value={params.horstLength}
            onChange={(v) => onParamsChange({ horstLength: v as number })}
            min={1} />
        </InputSection>

        <InputSection title="Rear Axle (on coupler body, C→D frame)">
          <InputField label="Along arm (mm)" value={params.axleForward}
            onChange={(v) => onParamsChange({ axleForward: v as number })} />
          <InputField label="Off arm (mm)" value={params.axlePerp}
            onChange={(v) => onParamsChange({ axlePerp: v as number })} />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Positive off-arm = CCW from C→D. Negative = below arm.
          </p>
        </InputSection>

        <InputSection title="Shock">
          <p className="text-xs text-gray-500 dark:text-gray-400">Frame mount F:</p>
          <InputField label="  F X (mm)" value={params.shockFrameMount.x}
            onChange={(v) => onParamsChange({ shockFrameMount: { ...params.shockFrameMount, x: v as number } })}
            className="ml-2" />
          <InputField label="  F Y (mm)" value={params.shockFrameMount.y}
            onChange={(v) => onParamsChange({ shockFrameMount: { ...params.shockFrameMount, y: v as number } })}
            className="ml-2" />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Coupler mount S (on coupler body):</p>
          <InputField label="  Along arm (mm)" value={params.shockMountForward}
            onChange={(v) => onParamsChange({ shockMountForward: v as number })}
            className="ml-2" />
          <InputField label="  Off arm (mm)" value={params.shockMountPerp}
            onChange={(v) => onParamsChange({ shockMountPerp: v as number })}
            className="ml-2" />
          <InputField label="Eye-to-Eye (mm)" value={params.shockETE}
            onChange={(v) => onParamsChange({ shockETE: v as number })} />
          <InputField label="Stroke (mm)" value={params.shockStroke}
            onChange={(v) => onParamsChange({ shockStroke: v as number })} />
          <InputField label="Spring Rate (N/mm)" value={params.shockSpringRate}
            onChange={(v) => onParamsChange({ shockSpringRate: v as number })} />
        </InputSection>

        <InputSection title="Wheel">
          <InputField label="Rear Wheel Radius (mm)" value={params.rearWheelRadius}
            onChange={(v) => onParamsChange({ rearWheelRadius: v as number })}
            min={1} />
        </InputSection>
      </div>
    </div>
  );
}
