# MTB Suspension Kinematics - Web app

Based on [work by Pat Crowe-Rishworth](https://github.com/patcroris/MTB-suspension-App)

## Features

### Core Functionality

- **Bike Geometry Input** - Configure comprehensive MTB suspension geometry parameters
- **Real-time Kinematic Analysis** - Instant calculation of suspension behavior during compression
- **Multiple Analysis Views**:
  - Interactive 2D bike visualization with SVG rendering
  - Leverage ratio analysis
  - Anti-squat and anti-rise calculations
  - Pedal kickback, chain growth, wheel rate, trail, and pitch angle graphs
  - Rear axle path tracing

### Visualization & Animation

- **Interactive Suspension Compression** - Drag the travel slider to see real-time geometry changes
- **Automatic Animation** - Watch the suspension cycle through compression and rebound
- **SVG Visualization** - Accurately rendered bike geometry showing:
  - Frame rails
  - Head tube and fork
  - Swingarm and rear shock
  - Wheels and pivot points
  - Center of mass and chain path

### Data Management

- **Save/Load Designs** - Export and import bike designs as JSON files
- **Default Presets** - Quick reset to default geometry
- **Design Naming** - Name and organize your custom configurations

## Technology Stack

- **Framework**: Next.js 16.1.4
- **UI Library**: React 19.2.3
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **Build Tool**: Turbopack (Next.js built-in)

## Project Structure

```
mtb-suspension-web/
├── lib/
│   ├── types.ts           # TypeScript interfaces and data models
│   ├── geometry.ts        # Geometric utility functions
│   └── kinematics.ts      # Kinematic analysis engine
├── components/
│   ├── InputPanel.tsx     # Geometry parameter inputs
│   ├── Visualization.tsx  # SVG bike visualization and animation
│   └── Graphs.tsx         # Analysis graphs and charts
├── hooks/
│   └── useBikeViewModel.ts  # React hook for state management
├── app/
│   ├── page.tsx           # Main application layout
│   ├── layout.tsx         # Root layout with metadata
│   └── globals.css        # Global styles
├── package.json
└── tsconfig.json
```

## Installation & Setup

### Prerequisites

- Node.js 18+ and npm 9+
- A modern web browser

### Installation

1. Navigate to the web app directory:

```bash
cd mtb-suspension-web
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Production Build

To create an optimized production build:

```bash
npm run build
npm start
```

## Usage

### Input Parameters

The left sidebar contains all geometry parameters organized by category:

- **Frame**: BB height, stack, reach, head angle, head tube length, seat angle, seat tube length
- **Fork**: Fork length, fork offset, fork travel, front wheel diameter
- **Suspension**: Swingarm length, pivot position (X, Y), rear wheel diameter
- **Shock**: Stroke, eye-to-eye (ETE), spring rate, frame mount point, swingarm mount distance
- **Drivetrain**: Chainring teeth, cog teeth, idler type and position
- **Center of Mass**: COM X and Y offsets from BB

### Analyzing Suspension

1. **Adjust Parameters**: Modify any geometry parameter and see real-time calculations
2. **Compress Suspension**: Use the travel slider or animation to compress the suspension through its full stroke
3. **View Metrics**: Check kinematic values displayed in the visualization
4. **Switch Graphs**: Click graph tabs to view different analysis metrics
5. **Save Designs**: Click Save to export your configuration as a JSON file

### Graph Types

- **Leverage Ratio**: The mechanical advantage of the suspension system
- **Anti-Squat**: How much the suspension resists compression under acceleration
- **Anti-Rise**: How much the suspension resists extension under braking
- **Pedal Kickback**: Crank rotation caused by suspension compression
- **Chain Growth**: Change in effective chain length through suspension stroke
- **Wheel Rate**: Spring rate as experienced at the wheel
- **Trail**: Mechanical trail (distance from steering axis to wheel contact)
- **Pitch Angle**: Frame angle relative to ground

## Key Components

### Kinematics Engine (`lib/kinematics.ts`)

The core of the application, providing:

- **Rigid Triangle Establishment**: Calculates fixed geometric relationships at top-out
- **Shock Stroke Analysis**: Computes bike geometry at each compression point
- **Anti-Squat/Anti-Rise Calculation**: Determines suspension behavior under load
- **Wheel Rate Computation**: Calculates effective spring rate at the wheel

### Visualization (`components/Visualization.tsx`)

- Renders bike geometry as SVG with proper scaling
- Shows all key points: BB, pivot, shock mount, wheels
- Includes axle path tracing
- Real-time updates as suspension compresses

### Graph Components (`components/Graphs.tsx`)

- Interactive graph selector with button interface
- Plots multiple analysis metrics against suspension travel
- Shows current position indicator on each graph
- Responsive to travel percentage changes

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Any modern browser supporting ES2020+

## Development

### Running Tests

```bash
npm run build  # Verify build succeeds
npm run lint   # Check TypeScript and ESLint
```

### Code Style

- TypeScript with strict mode enabled
- ESLint configuration via Next.js
- Tailwind CSS for all styling

## License

AGPL-3.0 - See LICENSE file for details