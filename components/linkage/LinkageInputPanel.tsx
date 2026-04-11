"use client";

import { LinkageGeometry } from "@/lib/types";
import { InputField, InputSection } from "@/components/InputPanel";

interface Props {
  geometry: LinkageGeometry;
  onGeometryChange: (updates: Partial<LinkageGeometry>) => void;
  isCalculating: boolean;
}

export function LinkageInputPanel({ geometry, onGeometryChange, isCalculating }: Props) {
  return (
    <div className="h-full overflow-y-auto bg-white dark:bg-black">
      <div className="p-4 space-y-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Linkage Geometry</h2>

        {isCalculating && (
          <div className="text-sm text-blue-600 dark:text-blue-400">Calculating...</div>
        )}

        <InputSection title="Frame Pivots (world frame, Y = height above ground)">
          <p className="text-xs text-gray-500 dark:text-gray-400">Pivot A (main):</p>
          <InputField label="  A X (mm)" value={geometry.pivotA.x}
            onChange={(v) => onGeometryChange({ pivotA: { ...geometry.pivotA, x: v as number } })}
            className="ml-2" />
          <InputField label="  A Y (mm)" value={geometry.pivotA.y}
            onChange={(v) => onGeometryChange({ pivotA: { ...geometry.pivotA, y: v as number } })}
            className="ml-2" />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Pivot B (Horst link):</p>
          <InputField label="  B X (mm)" value={geometry.pivotB.x}
            onChange={(v) => onGeometryChange({ pivotB: { ...geometry.pivotB, x: v as number } })}
            className="ml-2" />
          <InputField label="  B Y (mm)" value={geometry.pivotB.y}
            onChange={(v) => onGeometryChange({ pivotB: { ...geometry.pivotB, y: v as number } })}
            className="ml-2" />
        </InputSection>

        <InputSection title="Coupler Joints at Top-Out">
          <p className="text-xs text-gray-500 dark:text-gray-400">Joint C (connects to A):</p>
          <InputField label="  C X (mm)" value={geometry.jointC.x}
            onChange={(v) => onGeometryChange({ jointC: { ...geometry.jointC, x: v as number } })}
            className="ml-2" />
          <InputField label="  C Y (mm)" value={geometry.jointC.y}
            onChange={(v) => onGeometryChange({ jointC: { ...geometry.jointC, y: v as number } })}
            className="ml-2" />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Joint D (connects to B):</p>
          <InputField label="  D X (mm)" value={geometry.jointD.x}
            onChange={(v) => onGeometryChange({ jointD: { ...geometry.jointD, x: v as number } })}
            className="ml-2" />
          <InputField label="  D Y (mm)" value={geometry.jointD.y}
            onChange={(v) => onGeometryChange({ jointD: { ...geometry.jointD, y: v as number } })}
            className="ml-2" />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Rear Axle E at top-out:</p>
          <InputField label="  E X (mm)" value={geometry.axleE.x}
            onChange={(v) => onGeometryChange({ axleE: { ...geometry.axleE, x: v as number } })}
            className="ml-2" />
          <InputField label="  E Y (mm)" value={geometry.axleE.y}
            onChange={(v) => onGeometryChange({ axleE: { ...geometry.axleE, y: v as number } })}
            className="ml-2" />
        </InputSection>

        <InputSection title="Shock">
          <p className="text-xs text-gray-500 dark:text-gray-400">Frame mount F:</p>
          <InputField label="  F X (mm)" value={geometry.shockFrameMount.x}
            onChange={(v) => onGeometryChange({ shockFrameMount: { ...geometry.shockFrameMount, x: v as number } })}
            className="ml-2" />
          <InputField label="  F Y (mm)" value={geometry.shockFrameMount.y}
            onChange={(v) => onGeometryChange({ shockFrameMount: { ...geometry.shockFrameMount, y: v as number } })}
            className="ml-2" />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Coupler mount S at top-out:</p>
          <InputField label="  S X (mm)" value={geometry.shockCouplerMount.x}
            onChange={(v) => onGeometryChange({ shockCouplerMount: { ...geometry.shockCouplerMount, x: v as number } })}
            className="ml-2" />
          <InputField label="  S Y (mm)" value={geometry.shockCouplerMount.y}
            onChange={(v) => onGeometryChange({ shockCouplerMount: { ...geometry.shockCouplerMount, y: v as number } })}
            className="ml-2" />
          <InputField label="Eye-to-Eye (mm)" value={geometry.shockETE}
            onChange={(v) => onGeometryChange({ shockETE: v as number })} />
          <InputField label="Stroke (mm)" value={geometry.shockStroke}
            onChange={(v) => onGeometryChange({ shockStroke: v as number })} />
          <InputField label="Spring Rate (N/mm)" value={geometry.shockSpringRate}
            onChange={(v) => onGeometryChange({ shockSpringRate: v as number })} />
        </InputSection>

        <InputSection title="Wheel">
          <InputField label="Rear Wheel Radius (mm)" value={geometry.rearWheelRadius}
            onChange={(v) => onGeometryChange({ rearWheelRadius: v as number })} />
        </InputSection>
      </div>
    </div>
  );
}
