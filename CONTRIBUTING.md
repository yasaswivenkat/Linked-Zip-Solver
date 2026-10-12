# Contributing to LinkedIn Zip Puzzle Auto-Solver

Thank you for your interest in contributing to the **LinkedIn Zip Puzzle Auto-Solver**! We welcome bug reports, algorithm optimizations, documentation improvements, and UI enhancements.

---

## 🛠️ Local Development Setup

1. **Clone your fork:**
   ```bash
   git clone https://github.com/<your-username>/linkedin-zip-puzzle-solver.git
   cd linkedin-zip-puzzle-solver
   ```

2. **Load into Google Chrome:**
   - Go to `chrome://extensions`.
   - Enable **Developer mode** in the top-right corner.
   - Click **Load unpacked** and select the repository directory.

3. **Run Unit Tests & Benchmarks:**
   The project has zero external dependencies! You can run tests using standard Node.js:
   ```bash
   npm test
   npm run benchmark
   ```

---

## 🌿 Branching & Commit Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) convention:

- `feat:` A new feature (e.g., `feat: add custom delay slider in HUD`)
- `fix:` A bug fix (e.g., `fix: resolve iframe selector detection`)
- `docs:` Documentation updates (e.g., `docs: update mathematical proof in README`)
- `perf:` Performance improvements (e.g., `perf: optimize bitmask degree calculation`)
- `test:` Adding or updating tests (e.g., `test: add 8x8 parity edge case test`)

---

## 🧪 Testing Checklist

Before submitting a Pull Request, please ensure:
1. `npm test` runs with **100% passing tests**.
2. No syntax errors or broken manifest declarations exist.
3. You have tested the changes manually either in `playground.html` or on LinkedIn.

Thank you for making this project even better! 🚀
