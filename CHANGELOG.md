# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-10-12

### Initial Release
- **Dual-Engine Architecture:**
  - Automated hydration data extraction (`script#rehydrate-data`) for instant solve retrieval.
  - Bitmask-accelerated algorithmic Hamiltonian Path engine with vertex degree-based pruning.
- **Chrome Extension (Manifest V3):**
  - Modern popup with tab presence detection, speed configuration, and one-click solve triggers.
  - In-page floating HUD with glassmorphism design, minimizing capabilities, and quick solve actions.
  - Visual Solution Hint overlay with glowing SVG lines and numbered waypoint badges.
- **Simulation Playground (`playground.html`):**
  - Standalone offline puzzle player and algorithm debugging arena.
  - 4x4, 5x5, 6x6, and 7x7 presets with wall barriers and checkpoints.
  - Real-time engine performance telemetry and animated path playback.
- **Engineering & CI/CD:**
  - Zero-dependency automated test suite (`npm test`).
  - High-performance throughput benchmark (`npm run benchmark`).
  - GitHub Actions CI workflow for test matrix execution and automated ZIP distribution packaging.
