"use client";

import React, { useState } from "react";
import { BikeGeometry, IdlerType } from "@/lib/types";
import { Attribution } from "./Attribution";

interface InputFieldProps {
  label: string;
  value: number | string;
  onChange: (value: number | string) => void;
  type?: "number" | "text" | "select";
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: Array<{ value: string; label: string }>;
  className?: string;
}

export function InputField({
  label,
  value,
  onChange,
  type = "number",
  unit,
  min,
  max,
  step = 0.1,
  options,
  className = "",
}: InputFieldProps) {
  const baseInputClass =
    "rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500 transition-shadow";

  return (
    <div className={`flex items-center justify-between gap-3 ${className}`}>
      <label className="text-[13px] text-gray-600 dark:text-gray-300 flex-1 min-w-0">
        {label}
      </label>
      {type === "number" && (
        <div className="relative flex-shrink-0">
          <input
            type="number"
            inputMode="decimal"
            value={value}
            onChange={(e) => onChange(e.target.valueAsNumber)}
            min={min}
            max={max}
            step={step}
            className={`${baseInputClass} w-28 text-right tabular-nums ${
              unit ? "pl-2 pr-10" : "px-2"
            }`}
          />
          {unit && (
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-gray-500">
              {unit}
            </span>
          )}
        </div>
      )}
      {type === "text" && (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${baseInputClass} w-32 px-2`}
        />
      )}
      {type === "select" && (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${baseInputClass} w-40 px-2 cursor-pointer`}
        >
          {options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

function InputGroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
      {children}
    </p>
  );
}

interface InputSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function InputSection({
  title,
  children,
  defaultOpen = true,
}: InputSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
      >
        <span className="text-sm font-semibold text-gray-900 dark:text-white">
          {title}
        </span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`w-4 h-4 text-gray-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        >
          <path d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {open && <div className="px-4 pb-4 space-y-2.5">{children}</div>}
    </section>
  );
}

interface InputPanelProps {
  geometry: BikeGeometry;
  onGeometryChange: (updates: Partial<BikeGeometry>) => void;
  isCalculating: boolean;
  bikeName: string;
  onBikeNameChange: (name: string) => void;
}

export function InputPanel({
  geometry,
  onGeometryChange,
  isCalculating,
  bikeName,
  onBikeNameChange,
}: InputPanelProps) {
  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-950 lg:bg-white lg:dark:bg-gray-950">
      <div className="p-4 space-y-3 max-w-xl mx-auto lg:max-w-none">
        <div className="flex items-center justify-between min-h-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Bike Geometry
          </h2>
          {isCalculating && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Calculating
            </span>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm px-4 py-3">
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1.5">
            Design Name
          </label>
          <input
            type="text"
            value={bikeName}
            onChange={(e) => onBikeNameChange(e.target.value)}
            placeholder="Custom Build"
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500 transition-shadow"
          />
        </div>

        {/* Frame */}
        <InputSection title="Frame">
          <InputField
            label="BB Height"
            unit="mm"
            value={geometry.bbHeight}
            onChange={(val) => onGeometryChange({ bbHeight: val as number })}
          />
          <InputField
            label="Stack"
            unit="mm"
            value={geometry.stack}
            onChange={(val) => onGeometryChange({ stack: val as number })}
          />
          <InputField
            label="Reach"
            unit="mm"
            value={geometry.reach}
            onChange={(val) => onGeometryChange({ reach: val as number })}
          />
          <InputField
            label="Head Angle"
            unit="°"
            value={geometry.headAngle}
            onChange={(val) => onGeometryChange({ headAngle: val as number })}
            min={50}
            max={75}
          />
          <InputField
            label="Head Tube Length"
            unit="mm"
            value={geometry.headTubeLength}
            onChange={(val) =>
              onGeometryChange({ headTubeLength: val as number })
            }
          />
          <InputField
            label="Seat Angle"
            unit="°"
            value={geometry.seatAngle}
            onChange={(val) => onGeometryChange({ seatAngle: val as number })}
          />
          <InputField
            label="Seat Tube Length"
            unit="mm"
            value={geometry.seatTubeLength}
            onChange={(val) =>
              onGeometryChange({ seatTubeLength: val as number })
            }
          />
        </InputSection>

        {/* Fork */}
        <InputSection title="Fork">
          <InputField
            label="Fork Length"
            unit="mm"
            value={geometry.forkLength}
            onChange={(val) => onGeometryChange({ forkLength: val as number })}
          />
          <InputField
            label="Fork Offset"
            unit="mm"
            value={geometry.forkOffset}
            onChange={(val) => onGeometryChange({ forkOffset: val as number })}
          />
          <InputField
            label="Fork Travel"
            unit="mm"
            value={geometry.forkTravel}
            onChange={(val) => onGeometryChange({ forkTravel: val as number })}
          />
          <InputField
            label="Front Wheel Diameter"
            unit="mm"
            value={geometry.frontWheelDiameter}
            onChange={(val) =>
              onGeometryChange({ frontWheelDiameter: val as number })
            }
          />
        </InputSection>

        {/* Suspension */}
        <InputSection title="Suspension">
          <InputField
            label="Swingarm Length"
            unit="mm"
            value={geometry.swingarmLength}
            onChange={(val) =>
              onGeometryChange({ swingarmLength: val as number })
            }
          />
          <InputField
            label="Pivot X"
            unit="mm"
            value={geometry.bbToPivotX}
            onChange={(val) => onGeometryChange({ bbToPivotX: val as number })}
          />
          <InputField
            label="Pivot Y"
            unit="mm"
            value={geometry.bbToPivotY}
            onChange={(val) => onGeometryChange({ bbToPivotY: val as number })}
          />
          <InputField
            label="Rear Wheel Diameter"
            unit="mm"
            value={geometry.rearWheelDiameter}
            onChange={(val) =>
              onGeometryChange({ rearWheelDiameter: val as number })
            }
          />
        </InputSection>

        {/* Shock */}
        <InputSection title="Shock">
          <InputField
            label="Stroke"
            unit="mm"
            value={geometry.shockStroke}
            onChange={(val) => onGeometryChange({ shockStroke: val as number })}
          />
          <InputField
            label="Eye-to-Eye"
            unit="mm"
            value={geometry.shockETE}
            onChange={(val) => onGeometryChange({ shockETE: val as number })}
          />
          <InputField
            label="Spring Rate"
            unit="N/mm"
            value={geometry.shockSpringRate}
            onChange={(val) =>
              onGeometryChange({ shockSpringRate: val as number })
            }
          />
          <InputGroupLabel>Frame Mount (from BB)</InputGroupLabel>
          <InputField
            label="X"
            unit="mm"
            value={geometry.shockFrameMountX}
            onChange={(val) =>
              onGeometryChange({ shockFrameMountX: val as number })
            }
            className="pl-2"
          />
          <InputField
            label="Y"
            unit="mm"
            value={geometry.shockFrameMountY}
            onChange={(val) =>
              onGeometryChange({ shockFrameMountY: val as number })
            }
            className="pl-2"
          />
          <InputGroupLabel>Swingarm Mount</InputGroupLabel>
          <InputField
            label="Distance from pivot"
            unit="mm"
            value={geometry.shockSwingarmMountDistance}
            onChange={(val) =>
              onGeometryChange({ shockSwingarmMountDistance: val as number })
            }
            className="pl-2"
          />
        </InputSection>

        {/* Drivetrain */}
        <InputSection title="Drivetrain">
          <InputField
            label="Chainring Teeth"
            value={geometry.chainringTeeth}
            onChange={(val) =>
              onGeometryChange({ chainringTeeth: val as number })
            }
            type="number"
            step={1}
          />
          <InputField
            label="Cog Teeth"
            value={geometry.cogTeeth}
            onChange={(val) => onGeometryChange({ cogTeeth: val as number })}
            type="number"
            step={1}
          />
          <InputField
            label="Idler Type"
            value={geometry.idlerType}
            onChange={(val) =>
              onGeometryChange({ idlerType: val as IdlerType })
            }
            type="select"
            options={[
              { value: IdlerType.None, label: "No Idler" },
              { value: IdlerType.FrameMounted, label: "Frame Mounted" },
              { value: IdlerType.SwingarmMounted, label: "Swingarm Mounted" },
            ]}
          />
          {geometry.idlerType !== IdlerType.None && (
            <>
              <InputGroupLabel>Idler</InputGroupLabel>
              <InputField
                label="X"
                unit="mm"
                value={geometry.idlerX}
                onChange={(val) => onGeometryChange({ idlerX: val as number })}
                className="pl-2"
              />
              <InputField
                label="Y"
                unit="mm"
                value={geometry.idlerY}
                onChange={(val) => onGeometryChange({ idlerY: val as number })}
                className="pl-2"
              />
              <InputField
                label="Teeth"
                value={geometry.idlerTeeth}
                onChange={(val) =>
                  onGeometryChange({ idlerTeeth: val as number })
                }
                className="pl-2"
                type="number"
                step={1}
              />
            </>
          )}
        </InputSection>

        {/* Center of Mass */}
        <InputSection title="Center of Mass">
          <InputField
            label="COM X (from BB)"
            unit="mm"
            value={geometry.comX}
            onChange={(val) => onGeometryChange({ comX: val as number })}
          />
          <InputField
            label="COM Y (from BB)"
            unit="mm"
            value={geometry.comY}
            onChange={(val) => onGeometryChange({ comY: val as number })}
          />
        </InputSection>

        <div className="pt-1 pb-2 flex justify-center">
          <Attribution />
        </div>
      </div>
    </div>
  );
}
