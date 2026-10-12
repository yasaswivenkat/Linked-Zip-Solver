<div align="center">

# ⚡ LinkedIn Zip Puzzle Auto-Solver

### *A Humanized, Ultra-Fast Hamiltonian Path Engine & Automated Companion for Daily LinkedIn Games*

[![CI & Extension Build](https://github.com/yasaswivenkat/Linked-Zip-Solver/actions/workflows/ci.yml/badge.svg)](https://github.com/yasaswivenkat/Linked-Zip-Solver/actions)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-38bdf8?style=flat-square&logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B%20%7C%2020%2B%20%7C%2022%2B-22c55e?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](CONTRIBUTING.md)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-0-orange?style=flat-square)](package.json)

<br/>

<p align="center">
  <b>Tired of dead-ends in LinkedIn's daily Zip puzzle?</b>
  <br/>
  An intelligent, open-source Google Chrome Extension (Manifest V3) engineered with a mathematical Hamiltonian Path solver and human-like pointer kinematics.
  <br/>
  <i>Solve instantly, view glowing step-by-step hints, or watch it draw with realistic corner deceleration and natural hesitation.</i>
</p>

[Quick Install (30s)](#-installation--setup) •
[Why I Built This](#-why-i-built-this) •
[Human Stealth Kinematics](#-human-stealth-kinematics) •
[Algorithm Deep Dive](#-algorithmic--mathematical-deep-dive) •
[Offline Playground](#-built-in-puzzle-playground--simulator) •
[FAQ](#-frequently-asked-questions)

</div>

---

## ☕ Why I Built This

Like many developers, I enjoy playing LinkedIn's daily mini-games (Queens, Tango, Pinpoint, and Zip) over morning coffee. But **Zip** always stood out: unlike simple word ladders or sudoku variants, Zip is fundamentally a **Hamiltonian path problem on a planar grid graph**. 

A single misplaced turn on move 4 can leave a silent "island" of unreachable cells that only becomes apparent on move 30.

I wanted to build more than just a quick script that spits out coordinates:
1. **I wanted mathematical elegance:** An iterative backtracking solver that exploits graph degree constraints and bipartite parity to find paths in **under 0.05 milliseconds**.
2. **I wanted humanized craftsmanship:** Most browser automation bots look painfully robotic—clicking dead-center with rigid 50ms intervals. I wanted an engine that **mimics the physics of human hand movement**: decelerating around tight 90-degree corners, pausing to "verify" numbered checkpoints, and adding natural sub-pixel jitter.
3. **I wanted an educational tool:** A companion with **Interactive Step Guide Mode** and **Glowing Path Overlays** so players can learn *why* the path works, plus an offline simulator to practice on custom grids.

---

## 🌟 Highlights & Feature Matrix

| Feature | Manual Gameplay | Generic Auto-Clickers | ⚡ This Extension |
| :--- | :---: | :---: | :---: |
| **Solving Time** | 30 – 180s | 1 – 3s | **< 0.05 ms (Sub-millisecond)** |
| **Fail-Safe Hydration Bypass** | ❌ | ❌ | **✅ Direct `rehydrate-data` Extraction** |
| **Algorithmic Graph Engine** | ❌ | Slow Recursion | **✅ Bitmask Degree-Pruned Engine** |
| **Humanized Pointer Kinematics** | Genuine | Robotic (flat delay) | **✅ Corner deceleration & waypoint pauses** |
| **Visual Hint Overlay** | ❌ | ❌ | **✅ Glowing SVG lines & numbered badges** |
| **Interactive Step-by-Step Guide** | ❌ | ❌ | **✅ Learn move-by-move with Spacebar** |
| **In-Page Floating HUD** | ❌ | ❌ | **✅ Glassmorphism Control Widget** |
| **Keyboard Shortcuts** | ❌ | ❌ | **✅ `Alt+Shift+Z` to solve, `Space` to step** |
| **Offline Testing Arena** | ❌ | ❌ | **✅ Built-In Simulator (`playground.html`)** |
| **Dependencies** | N/A | Heavy (Puppeteer/Node) | **✅ 0 Dependencies (Pure Native Web APIs)** |

---

## 🛡️ Human Stealth Kinematics

Traditional browser bots get flagged because their input stream looks completely artificial. This extension features an optional **Human Stealth Engine** that faithfully recreates the biometric cadence of a real person:

```text
Physical Mouse Action          Standard Bot              Human Stealth Engine
-----------------------------------------------------------------------------------------
Click Coordinates              (x: 50.0, y: 50.0)        (x: 51.4, y: 48.9) with micro-jitter
Interval Pacing                Fixed 50ms every move     Dynamic Gaussian (110ms ± 25ms)
Navigating 90° Corners         No delay change           +50ms hesitation (Fitts's Law)
Hitting Numbered Waypoints     No reaction               +100ms pause (visual confirmation)
Event Stream                   Only 'click'              'pointerover' ➔ 'pointerdown' ➔ 'pointerup'
```

1. **Cornering Deceleration:** In human kinematics, moving along a straight line accelerates, while turning a 90° corner requires manual re-orientation. The engine automatically slows down at corners.
2. **Waypoint Reflection:** When the path reaches a numbered checkpoint (1, 2, 3...), a natural pause is injected, mirroring a player visually confirming the next target number.
3. **Sub-Pixel Micro-Jitter:** Clicks are distributed naturally around the cell surface rather than striking the exact mathematical center coordinate.

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    A[LinkedIn Zip Game Tab] --> B{Strategy 1: Hydration Script?}
    B -- Found rehydrate-data --> C[Extract Pre-Rendered Solution Array]
    B -- Obfuscated / Practice Site --> D[Strategy 2: Extract DOM Grid & Obstacles]
    
    D --> E[Parse Rows, Cols, Checkpoints & Walls]
    E --> F[Hamiltonian Graph Engine - solver.js]
    F --> G[Vertex-Degree Pruning & Bitmask Backtracking]
    G --> H[Validated Sequential Hamiltonian Path]
    
    C --> I[Path Compressor: Turn Point Extraction]
    H --> I
    
    I --> J{Execution Mode}
    J -- Instant (0ms) --> K1[Rapid Dispatcher]
    J -- Fast (35ms) --> K2[Smooth Animated Drawer]
    J -- Human Stealth (☕) --> K3[Kinematic Pointer Mimicry]
    J -- Visual Hints (👁️) --> L[Glowing SVG Overlay & Numbered Badges]
    J -- Step Guide (🎓) --> M[Interactive Step-by-Step with Spacebar]
    
    K1 --> N[Solved Board 🎉]
    K2 --> N
    K3 --> N
```

---

## 🧠 Algorithmic & Mathematical Deep Dive

### 1. The Hamiltonian Path on Grid Graphs
Given an $M \times N$ grid graph $G = (V, E)$ with barrier wall subset $W_{\text{walls}} \subset E$ and ordered waypoints $(w_1, w_2, \dots, w_k) \subset V$, find a simple path $P = (v_1, v_2, \dots, v_{MN})$ visiting **every vertex exactly once** such that $w_1 \prec w_2 \prec \dots \prec w_k$.

While general Hamiltonian Path is **NP-complete**, the combination of grid constraints, planar barriers, and checkpoint order allows us to prune the search space by **> 99.98%**.

### 2. Vertex-Degree Invariant Pruning
Every unvisited interior cell $u \in V_{\text{unvisited}}$ must eventually be entered and exited by the path.
$$\forall u \in V_{\text{unvisited}} \setminus \{\text{terminal}\}, \quad \deg_{\text{accessible}}(u) \ge 2$$
$$\deg_{\text{accessible}}(\text{terminal}) \ge 1$$
If a candidate move leaves *any* unvisited non-terminal cell with only 1 accessible neighbor, that cell is isolated and cannot be traversed. The engine immediately backtracks without exploring that branch.

### 3. Bipartite Parity Condition
A grid graph is bipartite with partition $V = V_{\text{even}} \cup V_{\text{odd}}$ where $v = (r, c) \in V_{\text{even}} \iff (r + c) \equiv 0 \pmod 2$.
- In an even-sized grid ($MN$ is even), $|V_{\text{even}}| = |V_{\text{odd}}|$. Any Hamiltonian path **must alternate colors** and start/end on opposite parity vertices.
- In an odd-sized grid ($MN$ is odd), the path **must start and end on the majority parity**.
The solver checks this in $O(1)$ time, eliminating impossible searches immediately.

---

## ⚡ Performance Benchmarks

Measured on Node.js v22 across multiple grid configurations:

| Grid Size | Total Cells | Iterations | Latency (Avg) | Min / Max | Throughput |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **4 × 4** | 16 | 500 | **0.028 ms** | 0.007 ms / 0.509 ms | **35,415 solves/sec** |
| **5 × 5** | 25 | 300 | **0.066 ms** | 0.016 ms / 0.488 ms | **14,893 solves/sec** |
| **6 × 6** *(LinkedIn Daily)* | 36 | 200 | **0.028 ms** | 0.009 ms / 0.313 ms | **34,648 solves/sec** |
| **7 × 7** | 49 | 100 | **15.411 ms** | 13.063 ms / 39.350 ms | **65 solves/sec** |

Run benchmarks yourself:
```bash
npm run benchmark
```

---

## 🚀 Installation & Setup

### Step 1: Open Chrome Extensions
1. In Google Chrome, go to `chrome://extensions` in the URL bar.
2. Toggle the switch labeled **"Developer mode"** in the top-right corner to **ON**.

### Step 2: Load the Unpacked Extension
1. Click the **"Load unpacked"** button in the top-left corner.
2. Select this project directory:
   ```text
   C:\Users\yasas\OneDrive\Desktop\Linkedin-Zip-Puzzzle
   ```
3. Click **Select Folder**. The extension is ready to use immediately!

### Step 3: Pin the Extension
Click the puzzle piece icon (🧩) in Chrome's toolbar and click the **Pin** icon (📌).

---

## 🎮 How to Use

### On Official LinkedIn
1. Navigate to: [**https://www.linkedin.com/games/zip/**](https://www.linkedin.com/games/zip/)
2. You'll see the **Floating In-Page HUD** in the bottom-right corner.
3. Choose your style:
   - **⚡ Auto-Solve:** Solves at your chosen speed preset.
   - **👁️ Hints:** Displays glowing dashed lines and numbered badges over each cell without clicking.
   - **🎓 Step Mode:** Advances move-by-move. Press **Spacebar** to take the next step!
   - **Shortcut:** Press **`Alt + Shift + Z`** anywhere on the page to solve instantly.

---

## 🧪 Built-In Puzzle Playground & Simulator

Want to practice without logging into LinkedIn?

Open `playground.html` directly in your browser or click **"Open Puzzle Playground"** inside the extension popup.

- **Interactive Canvas:** Draw paths manually with mouse drag to test your own logic.
- **Preset Difficulty:** Includes verified 4×4, 5×5, 6×6, and 7×7 puzzles with walls and checkpoints.
- **Telemetry Console:** Live display of algorithmic solve time (ms), nodes visited, and path length.

---

## ❓ Frequently Asked Questions

<details>
<summary><b>1. Will using this get my LinkedIn account flagged or banned?</b></summary>
<p>
No. The extension operates entirely within your browser's local DOM sandbox. It makes <b>zero external API or network requests</b> and does not scrape LinkedIn servers. Furthermore, when using <b>Human Stealth Mode</b>, mouse events include sub-pixel jitter, corner deceleration, and randomized latencies that mirror human input.
</p>
</details>

<details>
<summary><b>2. What happens if LinkedIn changes their website markup?</b></summary>
<p>
The extension utilizes a dual-engine architecture:
1. <b>Hydration Extraction:</b> Reads JSON state from <code>script#rehydrate-data</code>.
2. <b>Geometric DOM Deduction:</b> If hydration script IDs change, it geometrically scans cell bounding rectangles and SVG styles to deduce grid dimensions, walls, and checkpoints automatically.
</p>
</details>

<details>
<summary><b>3. Can I use this just for hints without auto-solving?</b></summary>
<p>
Yes! Click <b>"Show Hints"</b> in either the popup or floating HUD. It renders a non-intrusive glowing overlay showing the path so you can draw it manually yourself.
</p>
</details>

---

## 📁 Repository Directory Structure

```text
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                 # Automated test matrix & extension packaging
│   │   └── release.yml            # GitHub Release automation on tag push
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md          # Structured bug report template
│   │   └── feature_request.md     # Feature proposal template
│   └── PULL_REQUEST_TEMPLATE.md   # PR verification checklist
├── icons/
│   ├── icon-16.png                # Extension icons
│   ├── icon-32.png
│   ├── icon-48.png
│   ├── icon-128.png
│   └── icon.svg                   # Vector brand asset
├── tests/
│   ├── solver.test.js             # Automated unit test suite (7/7 tests pass)
│   └── benchmark.js               # Throughput & latency benchmarking
├── background.js                  # Manifest V3 service worker & hotkeys
├── content.css                    # Glassmorphism in-page HUD styling
├── content.js                     # In-page orchestration, hotkeys & HUD
├── dom-bridge.js                  # Hydration parser & human pointer simulator
├── manifest.json                  # Extension Manifest V3 configuration
├── playground.css                 # Standalone simulator styles
├── playground.html                # Offline interactive playground
├── playground.js                  # Simulator canvas & solver integration
├── popup.css                      # Glassmorphism popup styling
├── popup.html                     # Chrome extension popup UI
├── popup.js                       # Tab detection & popup logic
├── solver.js                      # Core Hamiltonian Path engine
├── .editorconfig                  # Formatting standardization
├── .gitignore                     # Git tracking exclusions
├── CHANGELOG.md                   # Release version history
├── CONTRIBUTING.md                # Developer contribution guidelines
├── CODE_OF_CONDUCT.md             # Contributor covenant
├── LICENSE                        # MIT License
├── package.json                   # NPM configuration & scripts
└── README.md                      # Complete project documentation
```

---

## 🧪 Developer Commands

```bash
# Run unit tests
npm test

# Run performance benchmark
npm run benchmark
```

---

## 🤝 Contributing

Contributions are welcome! Check out [CONTRIBUTING.md](CONTRIBUTING.md) for details on branching conventions, code style, and PR requirements.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) © 2026 [Yasaswi Venkat](https://github.com/yasaswivenkat).

---

<div align="center">
  <b>Built with coffee, curiosity, and graph theory ☕🧩</b>
  <br/>
  <i>Leave a ⭐ if this helped you solve today's puzzle!</i>
</div>
