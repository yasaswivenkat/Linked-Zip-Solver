/**
 * LinkedIn Zip Puzzle - Playground Simulator Logic
 * Interactive puzzle board, manual dragging, algorithm telemetry, and animated solver.
 */

document.addEventListener('DOMContentLoaded', () => {
  const PRESETS = {
    '4x4': {
      rows: 4,
      cols: 4,
      numbered: [0, 5, 14],
      downWalls: [],
      rightWalls: [0]
    },
    '5x5': {
      rows: 5,
      cols: 5,
      numbered: [0, 12, 24],
      downWalls: [1],
      rightWalls: [6]
    },
    '6x6': {
      rows: 6,
      cols: 6,
      numbered: [0, 11, 23, 30],
      downWalls: [24],
      rightWalls: [0]
    },
    '7x7': {
      rows: 7,
      cols: 7,
      numbered: [0, 13, 27, 48],
      downWalls: [8, 22],
      rightWalls: [2, 15]
    }
  };

  let currentPresetKey = '4x4';
  let currentPreset = PRESETS['4x4'];
  let currentSpeed = 'fast'; // 'fast' (adaptive) or number (ms per step)
  let playerPath = [];
  let isMouseDown = false;
  let isSolvingAnimation = false;
  let hintsVisible = false;

  const boardEl = document.getElementById('puzzle-board');
  const svgEl = document.getElementById('path-svg');
  const badgeSize = document.getElementById('badge-size');
  const badgeWaypoints = document.getElementById('badge-waypoints');
  const badgeStatus = document.getElementById('badge-status');

  const statTime = document.getElementById('stat-time');
  const statLength = document.getElementById('stat-length');
  const statTurns = document.getElementById('stat-turns');

  const btnRunSolver = document.getElementById('btn-run-solver');
  const btnShowHints = document.getElementById('btn-show-hints');
  const btnResetBoard = document.getElementById('btn-reset-board');

  // Preset button listeners
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentPresetKey = btn.dataset.preset;
      currentPreset = PRESETS[currentPresetKey];
      loadPreset(currentPreset);
    });
  });

  // Speed pill listeners
  document.querySelectorAll('.speed-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.speed-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const val = btn.dataset.speed;
      currentSpeed = val === 'fast' ? 'fast' : parseInt(val, 10);
    });
  });

  function loadPreset(preset) {
    playerPath = [preset.numbered[0]];
    hintsVisible = false;
    isSolvingAnimation = false;

    badgeSize.textContent = `Grid: ${preset.rows}×${preset.cols}`;
    badgeWaypoints.textContent = `Waypoints: 1 → ${preset.numbered.length}`;
    badgeStatus.textContent = 'Ready to Play';
    badgeStatus.style.color = '#38bdf8';

    statTime.textContent = '-- ms';
    statLength.textContent = '-- cells';
    statTurns.textContent = '-- turns';

    renderBoard(preset);
    updatePathGraphics();
  }

  function renderBoard(preset) {
    boardEl.innerHTML = '';
    const cellSize = Math.min(68, Math.floor(480 / Math.max(preset.rows, preset.cols)));

    boardEl.style.gridTemplateColumns = `repeat(${preset.cols}, ${cellSize}px)`;
    boardEl.style.gridTemplateRows = `repeat(${preset.rows}, ${cellSize}px)`;

    const totalCells = preset.rows * preset.cols;
    const waypointIndexMap = new Map();
    preset.numbered.forEach((idx, i) => waypointIndexMap.set(idx, i + 1));

    for (let idx = 0; idx < totalCells; idx++) {
      const cell = document.createElement('div');
      cell.className = 'puzzle-cell';
      cell.dataset.idx = idx;
      cell.style.width = `${cellSize}px`;
      cell.style.height = `${cellSize}px`;

      // Wall indicators
      if (preset.downWalls.includes(idx)) {
        cell.classList.add('wall-down');
      }
      if (preset.rightWalls.includes(idx)) {
        cell.classList.add('wall-right');
      }

      // Checkpoint circle
      if (waypointIndexMap.has(idx)) {
        const num = waypointIndexMap.get(idx);
        const node = document.createElement('div');
        node.className = 'cell-node';
        if (num === 1) node.classList.add('start');
        if (num === preset.numbered.length) node.classList.add('end');
        node.textContent = num;
        cell.appendChild(node);
      }

      // Mouse drag handlers
      cell.addEventListener('mousedown', (e) => {
        e.preventDefault();
        if (isSolvingAnimation) return;
        isMouseDown = true;
        handleCellInput(idx);
      });

      cell.addEventListener('mouseenter', () => {
        if (isMouseDown && !isSolvingAnimation) {
          handleCellInput(idx);
        }
      });

      boardEl.appendChild(cell);
    }

    // Window mouseup listener
    window.addEventListener('mouseup', () => {
      isMouseDown = false;
    });
  }

  function handleCellInput(cellIdx) {
    if (playerPath.length === 0) {
      if (cellIdx === currentPreset.numbered[0]) {
        playerPath = [cellIdx];
        updatePathGraphics();
      }
      return;
    }

    const last = playerPath[playerPath.length - 1];
    if (last === cellIdx) return;

    // Check if user is backtracking to previous cell
    if (playerPath.length > 1 && playerPath[playerPath.length - 2] === cellIdx) {
      playerPath.pop();
      updatePathGraphics();
      return;
    }

    // Already visited elsewhere
    if (playerPath.includes(cellIdx)) return;

    // Must be adjacent and not blocked by wall
    if (isMoveValid(last, cellIdx, currentPreset)) {
      playerPath.push(cellIdx);
      updatePathGraphics();
      checkPlayerWin();
    }
  }

  function isMoveValid(from, to, preset) {
    const { rows, cols, downWalls, rightWalls } = preset;
    const r1 = Math.floor(from / cols), c1 = from % cols;
    const r2 = Math.floor(to / cols), c2 = to % cols;

    // Up
    if (r2 === r1 - 1 && c2 === c1) {
      return !downWalls.includes(to);
    }
    // Down
    if (r2 === r1 + 1 && c2 === c1) {
      return !downWalls.includes(from);
    }
    // Left
    if (r2 === r1 && c2 === c1 - 1) {
      return !rightWalls.includes(to);
    }
    // Right
    if (r2 === r1 && c2 === c1 + 1) {
      return !rightWalls.includes(from);
    }
    return false;
  }

  function updatePathGraphics() {
    // Highlight cells
    const cells = boardEl.querySelectorAll('.puzzle-cell');
    cells.forEach((cell, idx) => {
      cell.classList.toggle('visited', playerPath.includes(idx));
    });

    // Draw SVG polyline
    svgEl.innerHTML = '';
    if (playerPath.length < 2) return;

    const boardRect = boardEl.getBoundingClientRect();
    const points = [];

    playerPath.forEach(idx => {
      const cell = boardEl.querySelector(`[data-idx="${idx}"]`);
      if (cell) {
        const rect = cell.getBoundingClientRect();
        const cx = rect.left - boardRect.left + rect.width / 2;
        const cy = rect.top - boardRect.top + rect.height / 2;
        points.push(`${cx},${cy}`);
      }
    });

    const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    polyline.setAttribute('points', points.join(' '));
    polyline.setAttribute('fill', 'none');
    polyline.setAttribute('stroke', '#38bdf8');
    polyline.setAttribute('stroke-width', '6');
    polyline.setAttribute('stroke-linecap', 'round');
    polyline.setAttribute('stroke-linejoin', 'round');
    polyline.style.filter = 'drop-shadow(0 0 8px #0284c7)';

    svgEl.appendChild(polyline);
  }

  function checkPlayerWin() {
    const total = currentPreset.rows * currentPreset.cols;
    if (playerPath.length === total) {
      // Check waypoints sequence
      let currentWaypointIdx = 0;
      for (const cell of playerPath) {
        if (cell === currentPreset.numbered[currentWaypointIdx]) {
          currentWaypointIdx++;
        }
      }
      if (currentWaypointIdx === currentPreset.numbered.length) {
        badgeStatus.textContent = '🎉 PUZZLE SOLVED!';
        badgeStatus.style.color = '#22c55e';
      }
    }
  }

  // Auto-Solver Action
  btnRunSolver.addEventListener('click', async () => {
    if (isSolvingAnimation) return;
    isSolvingAnimation = true;
    btnRunSolver.disabled = true;

    badgeStatus.textContent = 'Solving with Hamiltonian Engine...';
    badgeStatus.style.color = '#f59e0b';

    const t0 = performance.now();
    try {
      const result = window.ZipSolver.solveZip(
        currentPreset.rows,
        currentPreset.cols,
        currentPreset.numbered,
        currentPreset.downWalls,
        currentPreset.rightWalls
      );
      const t1 = performance.now();
      const elapsed = (t1 - t0).toFixed(2);

      statTime.textContent = `${elapsed} ms`;
      statLength.textContent = `${result.fullSequence.length} cells`;
      statTurns.textContent = `${result.compressedTurns.length} turns`;

      // Animate path sequentially as fast as the puzzle allows
      playerPath = [];
      const stepDelay = currentSpeed === 'fast' ? 16 : (typeof currentSpeed === 'number' ? currentSpeed : 120);

      for (let i = 0; i < result.fullSequence.length; i++) {
        playerPath.push(result.fullSequence[i]);
        updatePathGraphics();
        if (i < result.fullSequence.length - 1 && stepDelay > 0) {
          await new Promise(r => setTimeout(r, stepDelay));
        }
      }

      badgeStatus.textContent = `Solved in ${elapsed}ms! 🎉`;
      badgeStatus.style.color = '#22c55e';
    } catch (err) {
      console.error(err);
      badgeStatus.textContent = 'Solver error: ' + err.message;
      badgeStatus.style.color = '#ef4444';
    } finally {
      isSolvingAnimation = false;
      btnRunSolver.disabled = false;
    }
  });

  // Toggle Hints Action
  btnShowHints.addEventListener('click', () => {
    hintsVisible = !hintsVisible;
    if (!hintsVisible) {
      const hintLayer = document.getElementById('hint-path-svg');
      if (hintLayer) hintLayer.remove();
      btnShowHints.innerHTML = '<span class="icon">👁️</span><span>Show Visual Hint Path</span>';
      return;
    }

    try {
      const result = window.ZipSolver.solveZip(
        currentPreset.rows,
        currentPreset.cols,
        currentPreset.numbered,
        currentPreset.downWalls,
        currentPreset.rightWalls
      );

      btnShowHints.innerHTML = '<span class="icon">✕</span><span>Hide Visual Hint Path</span>';

      let hintLayer = document.getElementById('hint-path-svg');
      if (!hintLayer) {
        hintLayer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        hintLayer.id = 'hint-path-svg';
        hintLayer.classList.add('path-svg');
        hintLayer.style.zIndex = '4';
        boardEl.parentElement.appendChild(hintLayer);
      }
      hintLayer.innerHTML = '';

      const boardRect = boardEl.getBoundingClientRect();
      const points = [];

      result.fullSequence.forEach(idx => {
        const cell = boardEl.querySelector(`[data-idx="${idx}"]`);
        if (cell) {
          const rect = cell.getBoundingClientRect();
          const cx = rect.left - boardRect.left + rect.width / 2;
          const cy = rect.top - boardRect.top + rect.height / 2;
          points.push(`${cx},${cy}`);
        }
      });

      const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      polyline.setAttribute('points', points.join(' '));
      polyline.setAttribute('fill', 'none');
      polyline.setAttribute('stroke', '#a855f7');
      polyline.setAttribute('stroke-width', '4');
      polyline.setAttribute('stroke-dasharray', '8 6');
      polyline.setAttribute('stroke-linecap', 'round');
      hintLayer.appendChild(polyline);
    } catch (err) {
      alert('Could not generate hint: ' + err.message);
    }
  });

  // Reset Board Action
  btnResetBoard.addEventListener('click', () => {
    playerPath = [currentPreset.numbered[0]];
    updatePathGraphics();
    badgeStatus.textContent = 'Board Reset';
    badgeStatus.style.color = '#38bdf8';
  });

  // Initial load
  loadPreset(currentPreset);
});
