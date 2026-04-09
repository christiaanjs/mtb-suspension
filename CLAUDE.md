# CLAUDE.md

This file provides guidance for AI assistants working with the MTB Suspension Kinematics Analyzer codebase.

## Project Overview

A web-based tool for analyzing mountain bike (MTB) suspension geometry and kinematics in real time. Users input frame geometry parameters and the app computes suspension behavior metrics across the full compression stroke, displaying results as an animated SVG visualization and multiple analysis graphs.

**Key metrics calculated:** leverage ratio, anti-squat, anti-rise, pedal kickback, chain growth, wheel rate, trail, pitch angle, and rear axle path.

## Tech Stack

- **Framework:** Next.js (app router, fully client-side — no SSR)
- **Language:** TypeScript (strict mode)
- **UI:** React 19, Tailwind CSS 4
- **Bundler:** Turbopack (via Next.js dev server)
- **Testing:** Vitest
- **Linting:** ESLint 9 with Next.js TypeScript config

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server at http://localhost:3000
npm run build        # Production build
npm start            # Run production server
npm run lint         # ESLint + TypeScript checks
npm run test         # Run unit tests
npm run test:ui      # Visual test runner
npm run test:coverage # Coverage report (html/json/text)
```

## Project Structure

```
mtb-suspension/
├── app/                    # Next.js app router
│   ├── page.tsx            # Root page (Home component)
│   ├── layout.tsx          # Root layout + metadata
│   └── globals.css         # Global styles + Tailwind + dark mode
├── components/             # React UI components
│   ├── InputPanel.tsx      # Geometry parameter inputs
│   ├── Visualization.tsx   # SVG bike visualization container
│   ├── Graphs.tsx          # Analysis graphs display
│   ├── Attribution.tsx     # Credits component
│   └── visualization/      # SVG sub-components
│       ├── types.ts        # Visualization-specific types
│       ├── lib.ts          # SVG coordinate helpers
│       ├── FrontTriangle.tsx
│       ├── Swingarm.tsx
│       ├── Fork.tsx
│       ├── Wheels.tsx
│       ├── Shock.tsx
│       ├── Drivetrain.tsx
│       ├── Measurements.tsx
│       ├── AxlePath.tsx
│       ├── CentreOfMass.tsx
│       ├── GroundLine.tsx
│       └── Header.tsx
├── hooks/
│   └── useBikeViewModel.ts # Central state management hook
├── lib/                    # Core business logic (pure functions)
│   ├── types.ts            # Shared TypeScript interfaces
│   ├── geometry.ts         # Geometric utility functions
│   ├── kinematics.ts       # Kinematic analysis engine
│   ├── geometry.test.ts    # Geometry unit tests
│   └── kinematics.test.ts  # Kinematics unit tests
├── vitest.config.ts
├── next.config.ts
├── tsconfig.json
└── eslint.config.mjs
```

## Architecture & Key Conventions

### All Components Are Client-Side
Every component uses `"use client"`. There is no server-side rendering or server actions — the entire app runs in the browser.

### State Lives in One Hook
All application state is managed in `hooks/useBikeViewModel.ts`. Components receive state and callbacks as props. Do not introduce additional global state or context.

### Business Logic Is Separate from UI
- `lib/geometry.ts` — pure geometric math (distance, angle, line/circle intersections)
- `lib/kinematics.ts` — kinematic analysis engine; produces `AnalysisResults` from `BikeGeometry`
- Components and hooks consume these but never contain physics/math logic

### Data Flow
1. User changes an input → `InputPanel` calls `onChange`
2. `useBikeViewModel` updates geometry state
3. `useEffect` (100ms debounce) triggers `runKinematicAnalysis()`
4. Results flow down to `Visualization` and `Graphs` as props

### Key Types (`lib/types.ts`)
- `BikeGeometry` — ~30 geometry parameters (frame, fork, shock, drivetrain, CoM)
- `KinematicState` — complete bike state at one compression point
- `AnalysisResults` — full sweep of `KinematicState[]` + axle path traces
- `GraphType` — enum of 9 analysis metric types

### Kinematics Engine (`lib/kinematics.ts`)
Two main functions:
- `establishRigidTriangle()` — computes fixed geometric relationships at suspension top-out
- `calculateStateAtShockStroke()` — computes bike geometry at a given shock stroke value

Anti-squat/anti-rise use load path analysis. All math is plain TypeScript — no external math libraries.

### Visualization
SVG-based rendering with no charting libraries. Each bike part is its own component under `components/visualization/`. Coordinate conversion between bike geometry space and SVG canvas space is handled in `components/visualization/lib.ts`.

### Styling
Tailwind CSS utility classes throughout. Dark mode via `prefers-color-scheme` media query defined in `globals.css`. No external component libraries.

### Path Alias
`@/` maps to the project root (e.g., `import { BikeGeometry } from "@/lib/types"`).

## Testing

Tests cover `lib/geometry.ts` and `lib/kinematics.ts` only. Component tests do not exist — keep test coverage focused on the business logic layer.

- Test files: `lib/*.test.ts`
- Framework: Vitest with globals enabled (no need to import `describe`/`it`/`expect`)
- Coverage excludes `app/**` and `components/**` by config

When adding or modifying geometry/kinematics logic, update the corresponding test file.

## License

AGPL-3.0 — modifications must be shared under the same license.
