# CLAUDE.md

This file provides guidance for AI assistants working with the MTB Suspension Kinematics Analyzer codebase.

## Project Overview

A web-based tool for analyzing mountain bike (MTB) suspension geometry and kinematics in real time. Users input frame geometry parameters and the app computes suspension behavior metrics across the full compression stroke, displaying results as an animated SVG visualization and multiple analysis graphs.

**Key metrics calculated:** leverage ratio, anti-squat, anti-rise, pedal kickback, chain growth, wheel rate, trail, pitch angle, and rear axle path.

## Tech Stack

- **Framework:** React 19 single-page app built with Vite (React Router, client-side only)
- **Language:** TypeScript (strict mode)
- **UI:** React 19, Tailwind CSS 4 (`@tailwindcss/vite`)
- **Bundler:** Vite 7
- **Testing:** Vitest
- **Linting:** ESLint 9 (flat config) with typescript-eslint and react-hooks
- **Hosting:** Cloudflare Pages (production + per-PR previews via GitHub Actions)

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server at http://localhost:3000
npm run build        # Production build (outputs dist/)
npm run preview      # Serve the production build locally
npm run lint         # ESLint + TypeScript checks
npm run test         # Run unit tests
npm run test:ui      # Visual test runner
npm run test:coverage # Coverage report (html/json/text)
```

## Project Structure

```
mtb-suspension/
├── index.html              # Vite entry (title, meta, favicon)
├── public/                 # Static assets (favicon)
├── src/                    # App shell
│   ├── main.tsx            # Entry: fonts, router, routes (/ and /linkage)
│   ├── pages/
│   │   ├── Home.tsx        # Main analyzer page
│   │   └── Linkage.tsx     # Four-bar linkage inspector page
│   └── globals.css         # Global styles + Tailwind + dark mode
├── mcp/                    # Separate package: MCP app server (Cloudflare Worker), see mcp/PLAN.md
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
├── vite.config.ts
├── vitest.config.ts
├── tsconfig.json
└── eslint.config.mjs
```

## Architecture & Key Conventions

### Everything Runs In The Browser
The app is a static single-page app: there is no server-side rendering, API, or server code. Routing is client-side (React Router); the host must serve `index.html` for unknown paths (Cloudflare Pages does this automatically when there is no `404.html`).

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
- Coverage excludes `src/**` and `components/**` by config

When adding or modifying geometry/kinematics logic, update the corresponding test file.

## CI

Four GitHub Actions workflows run on every pull request:

| Workflow | File | Command |
|---|---|---|
| Lint | `.github/workflows/lint.yml` | `npm run lint` |
| TypeScript | `.github/workflows/typecheck.yml` | `npx tsc --noEmit` |
| Test | `.github/workflows/test.yml` | `npm test -- --run` |
| Build | `.github/workflows/build.yml` | `npm run build` |

All four must pass before merging. Run them locally before pushing:

```bash
npm run lint          # Must pass lint workflow
npx tsc --noEmit      # Must pass typecheck workflow
npm test -- --run     # Must pass test workflow
npm run build         # Must pass build workflow
```

### Deployment (Cloudflare Pages)

- `preview.yml` deploys every same-repo pull request to a Pages preview and comments the URL on the PR.
- `deploy.yml` deploys `main` to production (also runnable manually).
- Both need repository secrets `CLOUDFLARE_API_TOKEN` (permission: Account → Cloudflare Pages → Edit) and `CLOUDFLARE_ACCOUNT_ID`. The Pages project name defaults to `mtb-suspension`; override with the repository variable `CLOUDFLARE_PAGES_PROJECT`.
- The MCP server (`mcp/`) has its own workflows (`mcp.yml`, `mcp-deploy.yml`); the same token can serve both if it also has Account → Workers Scripts → Edit.

## License

AGPL-3.0 — modifications must be shared under the same license.
