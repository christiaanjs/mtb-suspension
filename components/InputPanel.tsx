"use client";

import React from "react";
import { BikeGeometry, IdlerType, SuspensionType } from "@/lib/types";

interface InputFieldProps {
  label: string;
  value: number | string;
  onChange: (value: number | string) => void;
  type?: "number" | "text" | "select";
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
  min,
  max,
  step = 0.1,
  options,
  className = "",
}: InputFieldProps) {
  return (
    <div className={`flex items-center justify-between gap-2 ${className}`}>
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex-1">
        {label}
      </label>
      {type === "number" && (
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.valueAsNumber)}
          min={min}
          max={max}
          step={step}
          className="w-24 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      )}
      {type === "text" && (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-32 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      )}
      {type === "select" && (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-40 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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

interface InputSectionProps {
  title: string;
  children: React.ReactNode;
}

export function InputSection({ title, children }: InputSectionProps) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4 bg-gray-50 dark:bg-gray-900">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

interface InputPanelProps {
  geometry: BikeGeometry;
  onGeometryChange: (updates: Partial<BikeGeometry>) => void;
  isCalculating: boolean;
}

export function InputPanel({
  geometry,
  onGeometryChange,
  isCalculating,
}: InputPanelProps) {
  return (
    <div className="h-full overflow-y-auto bg-white dark:bg-black">
      <div className="p-4 space-y-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          Bike Geometry
        </h2>

        {isCalculating && (
          <div className="text-sm text-blue-600 dark:text-blue-400">
            Calculating...
          </div>
        )}

        {/* Frame */}
        <InputSection title="Frame">
          <InputField
            label="BB Height (mm)"
            value={geometry.bbHeight}
            onChange={(val) => onGeometryChange({ bbHeight: val as number })}
          />
          <InputField
            label="Stack (mm)"
            value={geometry.stack}
            onChange={(val) => onGeometryChange({ stack: val as number })}
          />
          <InputField
            label="Reach (mm)"
            value={geometry.reach}
            onChange={(val) => onGeometryChange({ reach: val as number })}
          />
          <InputField
            label="Head Angle (°)"
            value={geometry.headAngle}
            onChange={(val) => onGeometryChange({ headAngle: val as number })}
            min={50}
            max={75}
          />
          <InputField
            label="Head Tube Length (mm)"
            value={geometry.headTubeLength}
            onChange={(val) =>
              onGeometryChange({ headTubeLength: val as number })
            }
          />
          <InputField
            label="Seat Angle (°)"
            value={geometry.seatAngle}
            onChange={(val) => onGeometryChange({ seatAngle: val as number })}
          />
          <InputField
            label="Seat Tube Length (mm)"
            value={geometry.seatTubeLength}
            onChange={(val) =>
              onGeometryChange({ seatTubeLength: val as number })
            }
          />
        </InputSection>

        {/* Fork */}
        <InputSection title="Fork">
          <InputField
            label="Fork Length (mm)"
            value={geometry.forkLength}
            onChange={(val) => onGeometryChange({ forkLength: val as number })}
          />
          <InputField
            label="Fork Offset (mm)"
            value={geometry.forkOffset}
            onChange={(val) => onGeometryChange({ forkOffset: val as number })}
          />
          <InputField
            label="Fork Travel (mm)"
            value={geometry.forkTravel}
            onChange={(val) => onGeometryChange({ forkTravel: val as number })}
          />
          <InputField
            label="Front Wheel Diameter (mm)"
            value={geometry.frontWheelDiameter}
            onChange={(val) =>
              onGeometryChange({ frontWheelDiameter: val as number })
            }
          />
        </InputSection>

        {/* Suspension */}
        <InputSection title="Suspension">
          <InputField
            label="Type"
            value={geometry.suspensionType ?? "single-pivot"}
            onChange={(val) =>
              onGeometryChange({ suspensionType: val as SuspensionType })
            }
            type="select"
            options={[
              { value: "single-pivot", label: "Single Pivot" },
              { value: "four-bar", label: "4-Bar / Horst Link" },
            ]}
          />
          <InputField
            label="Swingarm Length (mm)"
            value={geometry.swingarmLength}
            onChange={(val) =>
              onGeometryChange({ swingarmLength: val as number })
            }
          />
          <InputField
            label="Pivot X (mm)"
            value={geometry.bbToPivotX}
            onChange={(val) => onGeometryChange({ bbToPivotX: val as number })}
          />
          <InputField
            label="Pivot Y (mm)"
            value={geometry.bbToPivotY}
            onChange={(val) => onGeometryChange({ bbToPivotY: val as number })}
          />
          <InputField
            label="Rear Wheel Diameter (mm)"
            value={geometry.rearWheelDiameter}
            onChange={(val) =>
              onGeometryChange({ rearWheelDiameter: val as number })
            }
          />
          {geometry.suspensionType === "four-bar" && (
            <>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Horst Link Frame Pivot B (from BB):
              </p>
              <InputField
                label="  B X (mm)"
                value={geometry.bbToHorstFramePivotX ?? 0}
                onChange={(val) =>
                  onGeometryChange({ bbToHorstFramePivotX: val as number })
                }
                className="ml-2"
              />
              <InputField
                label="  B Y (mm)"
                value={geometry.bbToHorstFramePivotY ?? 0}
                onChange={(val) =>
                  onGeometryChange({ bbToHorstFramePivotY: val as number })
                }
                className="ml-2"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Link lengths:
              </p>
              <InputField
                label="  Main Arm A–C (mm)"
                value={geometry.horstArmLength ?? 100}
                onChange={(val) =>
                  onGeometryChange({ horstArmLength: val as number })
                }
                min={1}
                className="ml-2"
              />
              <InputField
                label="  Arm Angle at Top-out (°)"
                value={geometry.horstCrankAngleDeg ?? 0}
                onChange={(val) =>
                  onGeometryChange({ horstCrankAngleDeg: val as number })
                }
                step={0.5}
                className="ml-2"
              />
              <InputField
                label="  Coupler C–D (mm)"
                value={geometry.horstCouplerLength ?? 60}
                onChange={(val) =>
                  onGeometryChange({ horstCouplerLength: val as number })
                }
                min={1}
                className="ml-2"
              />
              <InputField
                label="  Horst Link B–D (mm)"
                value={geometry.horstLinkLength ?? 100}
                onChange={(val) =>
                  onGeometryChange({ horstLinkLength: val as number })
                }
                min={1}
                className="ml-2"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Shock coupler mount S (on coupler body, C→D frame):
              </p>
              <InputField
                label="  Along arm (mm)"
                value={geometry.horstShockMountForward ?? 0}
                onChange={(val) =>
                  onGeometryChange({ horstShockMountForward: val as number })
                }
                className="ml-2"
              />
              <InputField
                label="  Off arm (mm)"
                value={geometry.horstShockMountPerp ?? 30}
                onChange={(val) =>
                  onGeometryChange({ horstShockMountPerp: val as number })
                }
                className="ml-2"
              />
            </>
          )}
        </InputSection>

        {/* Shock */}
        <InputSection title="Shock">
          <InputField
            label="Stroke (mm)"
            value={geometry.shockStroke}
            onChange={(val) => onGeometryChange({ shockStroke: val as number })}
          />
          <InputField
            label="Eye-to-Eye (mm)"
            value={geometry.shockETE}
            onChange={(val) => onGeometryChange({ shockETE: val as number })}
          />
          <InputField
            label="Spring Rate (N/mm)"
            value={geometry.shockSpringRate}
            onChange={(val) =>
              onGeometryChange({ shockSpringRate: val as number })
            }
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Frame Mount (from BB):
          </p>
          <InputField
            label="  X (mm)"
            value={geometry.shockFrameMountX}
            onChange={(val) =>
              onGeometryChange({ shockFrameMountX: val as number })
            }
            className="ml-2"
          />
          <InputField
            label="  Y (mm)"
            value={geometry.shockFrameMountY}
            onChange={(val) =>
              onGeometryChange({ shockFrameMountY: val as number })
            }
            className="ml-2"
          />
          {geometry.suspensionType !== "four-bar" && (
            <>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Swingarm Mount:
              </p>
              <InputField
                label="  Distance from pivot (mm)"
                value={geometry.shockSwingarmMountDistance}
                onChange={(val) =>
                  onGeometryChange({ shockSwingarmMountDistance: val as number })
                }
                className="ml-2"
              />
            </>
          )}
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
          />
          <InputField
            label="Cog Teeth"
            value={geometry.cogTeeth}
            onChange={(val) => onGeometryChange({ cogTeeth: val as number })}
            type="number"
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
              <InputField
                label="  Idler X (mm)"
                value={geometry.idlerX}
                onChange={(val) => onGeometryChange({ idlerX: val as number })}
                className="ml-2"
              />
              <InputField
                label="  Idler Y (mm)"
                value={geometry.idlerY}
                onChange={(val) => onGeometryChange({ idlerY: val as number })}
                className="ml-2"
              />
              <InputField
                label="  Idler Teeth"
                value={geometry.idlerTeeth}
                onChange={(val) =>
                  onGeometryChange({ idlerTeeth: val as number })
                }
                className="ml-2"
                type="number"
              />
            </>
          )}
        </InputSection>

        {/* Center of Mass */}
        <InputSection title="Center of Mass">
          <InputField
            label="COM X (mm from BB)"
            value={geometry.comX}
            onChange={(val) => onGeometryChange({ comX: val as number })}
          />
          <InputField
            label="COM Y (mm from BB)"
            value={geometry.comY}
            onChange={(val) => onGeometryChange({ comY: val as number })}
          />
        </InputSection>
      </div>
    </div>
  );
}
