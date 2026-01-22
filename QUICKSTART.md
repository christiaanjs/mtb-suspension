# Quick Start Guide

## 🚀 Get Started in 2 Minutes

### Prerequisites

- Node.js 18 or higher
- npm 9 or higher
- A modern web browser

### Installation

```bash
# Navigate to the web app directory
cd mtb-suspension-web

# Install dependencies (first time only)
npm install

# Start the development server
npm run dev
```

The app will be available at **http://localhost:3000**

---

## 📱 Using the App

### Layout Overview

```
┌─────────────────────────────────────────────────────┐
│  Header: Title | Design Name | Save | Load | Reset  │
├─────────────┬─────────────────────────────────────┤
│             │                                       │
│  Input      │    Bike Visualization + Slider        │
│  Controls   │                                       │
│             │    (adjust travel to see changes)     │
│             ├───────────────────────────────────────┤
│             │    Analysis Graphs                    │
│  (scroll)   │    (click tabs to switch graph type)  │
│             │                                       │
└─────────────┴─────────────────────────────────────┘
```

### Step-by-Step

#### 1. **Modify Geometry**

- Scroll down the left panel
- Change any parameter (BB height, reach, head angle, etc.)
- Numbers update in real-time (slight delay is normal)

#### 2. **See Real-Time Visualization**

- Watch the bike diagram update as you change values
- Top-right shows current metrics (LR, AS, AR)
- Bottom shows travel percentage

#### 3. **Compress the Suspension**

- Drag the travel slider left/right
- Or click "Animate" to watch it cycle
- Adjust animation speed with the slider

#### 4. **View Different Metrics**

- Click graph tabs at bottom: "Leverage Ratio", "Anti-Squat", etc.
- Red line shows current suspension position
- Graph shows behavior across full travel range

#### 5. **Save Your Design**

- Click "Save" button (downloads as JSON)
- File named: `[Design Name].json`
- Share with others or keep for later

#### 6. **Load a Saved Design**

- Click "Open" button
- Select a previously saved JSON file
- Design loads and calculations update

#### 7. **Reset to Defaults**

- Click "Reset" button
- Returns to default MTB geometry

---

## 🔧 Key Parameters Explained

### Frame

- **BB Height**: Height of bottom bracket from ground (mm)
- **Stack/Reach**: Vertical/horizontal distance from BB to headtube top
- **Head Angle**: Fork angle from horizontal (degrees, typical 63-65°)
- **Seat Angle**: Seat tube angle from horizontal

### Suspension

- **Swingarm Length**: Distance from pivot to rear axle (mm)
- **Pivot Position**: Where main pivot is relative to BB

### Shock

- **Stroke**: Distance shock compresses (mm)
- **Eye-to-Eye**: Shock length at top-out (mm)
- **Mount Points**: Where shock connects to frame and swingarm

### Drivetrain

- **Chainring/Cog Teeth**: Gear ratios
- **Idler**: Optional chain guide (frame or swingarm mounted)

---

## 📊 Understanding the Graphs

### Leverage Ratio

- **What**: Mechanical advantage of suspension
- **Higher = Softer** relative spring feel
- **Lower = Firmer** feel
- Typical range: 2.0 - 3.5

### Anti-Squat

- **What**: Resistance to compression under acceleration
- **Higher = More resistant** to compression while pedaling
- **Lower = Dives more** under pedal force
- Typical range: 30% - 100%

### Anti-Rise

- **What**: Resistance to extension during braking
- **Higher = More extension** (rises up)
- **Lower = Less extension** (stays planted)
- Typical range: 0% - 70%

### Chain Growth

- **What**: How much chain grows as suspension compresses
- **Higher = More chain growth** (affects drivetrain)
- Typical: 0 - 10mm

### Wheel Rate

- **What**: Effective spring rate at the wheel
- **Higher = Stiffer** suspension feel
- Calculated from shock spring rate × lever arm ratio

### Trail

- **What**: Horizontal distance from steering axis to wheel contact
- **Higher = More stable** but slower turning
- **Lower = Quicker turning** but less stability

### Pitch Angle

- **What**: Frame angle relative to horizontal
- **Positive = Nose down** as suspension compresses
- Shows how much bike pitches during travel

---

## ⌨️ Keyboard Shortcuts

| Shortcut      | Action                           |
| ------------- | -------------------------------- |
| Tab           | Jump between input fields        |
| Enter         | Apply value change               |
| Arrow Up/Down | Increment/decrement number input |
| Escape        | Close any dropdown               |

---

## 🎮 Animation Controls

**Play/Stop Button**: Start or stop suspension cycling
**Speed Slider**: Control animation speed (0.1x - 3x)
**Travel Slider**: Manually adjust suspension position during animation

---

## 💾 File Format

Saved designs are JSON files that look like:

```json
{
  "name": "My Enduro Bike",
  "geometry": {
    "bbHeight": 330,
    "stack": 625,
    "reach": 490,
    ...
  }
}
```

You can:

- **Share** with friends (copy the JSON)
- **Edit** in any text editor
- **Version control** in Git
- **Backup** to cloud storage

---

## 🐛 Troubleshooting

### App Not Loading?

```bash
# Restart the dev server
npm run dev

# Clear browser cache (Cmd+Shift+Delete on Mac, Ctrl+Shift+Delete on Windows)
```

### Calculations Not Updating?

- Wait 100ms (there's a debounce)
- Check browser console for errors (F12)
- Ensure values are valid (geometry must be physically possible)

### Numbers Look Wrong?

- Check units (all values in mm, degrees, or N/mm)
- Verify geometry constraints (swingarm can't be too short)
- Reset and try again

### Performance Slow?

- Close other browser tabs
- Check browser DevTools for memory leaks
- Try reloading page (F5)

### Save Not Working?

- Check browser download folder
- Ensure filename is valid (no special characters)
- Check browser pop-up blocker settings

### Load Not Working?

- Ensure file is valid JSON (no editing errors)
- File should end with `.json`
- Try opening in text editor to verify format

---

## 🌓 Dark Mode

App automatically uses your system's dark mode preference:

- **macOS**: System Preferences → General → Appearance
- **Windows**: Settings → Personalization → Colors
- **Linux**: Depends on your desktop environment

Browser DevTools can override this for testing.

---

## 📈 Example Workflow

### Design a New Bike

1. **Start fresh**: Click "Reset" for default geometry
2. **Name it**: Type "MTB Project 1" in name field
3. **Adjust geometry**:
   - Increase swingarm length for longer travel feel
   - Decrease head angle for slacker geometry
   - Move pivot for different anti-squat
4. **Check metrics**: Look at each graph type
5. **Save**: Click "Save" to preserve design
6. **Compare**: Modify one parameter and observe changes
7. **Iterate**: Adjust until happy with behavior

### Compare Two Designs

1. **Save first design**: "Design A"
2. **Modify geometry**: "Design B"
3. **Save second design**: "Design B"
4. **Load Design A**: Click Open, select first file
5. **Manually compare**: Note down metrics
6. **Load Design B**: Click Open, select second file
7. **Compare metrics**: Observe differences

---

## 🔗 Advanced Tips

### Geometry Tips

- Lower pivot = higher anti-squat but worse pedal kickback
- Longer swingarm = more leverage but needs more travel
- Slacker head angle = more stable but slower
- Steeper seat angle = more anti-squat, less anti-rise

### Save Organization

- Name designs clearly: "Enduro", "XC", "DH"
- Include specs: "29er-150mm-slack"
- Save variants: "V1", "V2", "Final"

### Analysis Tips

- Watch anti-squat across travel
- Check chain growth (matters for 1x drivetrains)
- Pitch angle shows propensity to endo
- Trail should be stable (25-35mm typical)

---

## 📚 Learn More

- Read **README_WEBAPP.md** for full feature documentation
- Check **MIGRATION_GUIDE.md** for technical details
- Review **FILE_INVENTORY.md** for file organization

---

## 🆘 Need Help?

1. **Check docs**: README_WEBAPP.md has complete feature list
2. **Browser console**: F12 → Console tab for error messages
3. **Try reset**: Fresh start often solves issues
4. **Clear cache**: Cmd/Ctrl + Shift + Delete

---

## ✅ What's Working

- ✅ All geometry inputs
- ✅ Real-time calculations
- ✅ SVG visualization
- ✅ All 8 graph types
- ✅ Animation controls
- ✅ Save/Load designs
- ✅ Dark mode
- ✅ Responsive layout

---

**Enjoy analyzing your suspension! 🚴‍♂️**
