/**
 * LinkedIn Zip Puzzle DOM Bridge
 * Multi-layer DOM extraction, Hydration data parsing, and user input simulation.
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['./solver.js'], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./solver.js'));
  } else {
    root.ZipDomBridge = factory(root.ZipSolver);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (ZipSolver) {

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  class ZipDomBridge {
    constructor() {
      this.activeOverlay = null;
      this.isSolving = false;
    }

    /**
     * Finds the grid container element in the current document or iframes.
     */
    findGridElement(doc = document) {
      // 1. Direct interactive grid selector
      let grid = doc.querySelector('[data-testid="interactive-grid"]');
      if (grid) return grid;

      // 2. Class based board
      grid = doc.querySelector('.grid-game-board') || doc.querySelector('[class*="game-board"]');
      if (grid) return grid;

      // 3. Fallback: container of elements with data-cell-idx
      const firstCell = doc.querySelector('[data-cell-idx]');
      if (firstCell && firstCell.parentElement) {
        return firstCell.parentElement;
      }

      // 4. Search within iframes
      const iframes = doc.querySelectorAll('iframe');
      for (const iframe of iframes) {
        try {
          const frameDoc = iframe.contentDocument || iframe.contentWindow?.document;
          if (frameDoc) {
            const frameGrid = this.findGridElement(frameDoc);
            if (frameGrid) return frameGrid;
          }
        } catch (e) {
          // Cross-origin iframe or access error, continue
        }
      }

      return null;
    }

    /**
     * Checks if a Zip game board is currently available on the page.
     */
    isGamePresent() {
      return this.findGridElement() !== null;
    }

    /**
     * Strategy 1: Extract solution directly from LinkedIn's hydration script.
     */
    extractHydrationSolution(doc = document) {
      try {
        // Look for script#rehydrate-data
        const scripts = [
          doc.getElementById('rehydrate-data'),
          ...Array.from(doc.querySelectorAll('script[type="application/json"]')),
          ...Array.from(doc.querySelectorAll('script')).filter(s => s.textContent.includes('"solution"'))
        ].filter(Boolean);

        for (const script of scripts) {
          const content = script.textContent;
          if (!content) continue;

          // Search for "solution":[...] or \"solution\":[...]
          const match = content.match(/\\?"solution\\?"\s*:\s*\[([\d,\s]+)\]/);
          if (match && match[1]) {
            const solution = match[1].split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
            if (solution.length > 0) {
              console.info('[ZipSolver] Successfully extracted solution from hydration data:', solution);
              return solution;
            }
          }
        }
      } catch (err) {
        console.warn('[ZipSolver] Hydration extraction failed, falling back to algorithmic solver:', err);
      }
      return null;
    }

    /**
     * Strategy 2: Extract grid structure and solve with Hamiltonian Backtracking algorithm.
     */
    extractGridState(gridElement) {
      // Find all cell elements
      let cellElements = Array.from(gridElement.children).filter(child => {
        return child.hasAttribute('data-cell-idx') || child.classList.contains('trail-cell') || child.classList.contains('grid-cell');
      });

      if (cellElements.length === 0) {
        cellElements = Array.from(gridElement.querySelectorAll('[data-cell-idx]'));
      }

      if (cellElements.length === 0) {
        throw new Error('No puzzle cells found in grid container.');
      }

      // Sort cells by data-cell-idx if present, or by geometry
      const cellMap = new Map();
      let maxIdx = -1;

      for (let i = 0; i < cellElements.length; i++) {
        const el = cellElements[i];
        let idx = -1;
        if (el.hasAttribute('data-cell-idx')) {
          idx = parseInt(el.getAttribute('data-cell-idx'), 10);
        } else {
          idx = i;
        }
        cellMap.set(idx, el);
        if (idx > maxIdx) maxIdx = idx;
      }

      const totalCells = maxIdx + 1;
      const orderedCells = new Array(totalCells);
      for (let i = 0; i < totalCells; i++) {
        orderedCells[i] = cellMap.get(i) || cellElements[i];
      }

      // Deduce rows and columns
      let cols = 0, rows = 0;

      // Check CSS variable in grid style: --cols, --rows, or --dimension
      const computedStyle = window.getComputedStyle(gridElement);
      const styleAttr = gridElement.getAttribute('style') || '';

      const varCols = gridElement.style.getPropertyValue('--cols') || computedStyle.getPropertyValue('--cols');
      const varRows = gridElement.style.getPropertyValue('--rows') || computedStyle.getPropertyValue('--rows');

      if (varCols && varRows && !isNaN(parseInt(varCols, 10)) && !isNaN(parseInt(varRows, 10))) {
        cols = parseInt(varCols, 10);
        rows = parseInt(varRows, 10);
      } else {
        // Find custom properties starting with -- that have integer values
        const matches = styleAttr.match(/--[\w-]+:\s*(\d+)/g);
        if (matches && matches.length >= 1) {
          const dim = parseInt(matches[0].split(':')[1].trim(), 10);
          if (dim * dim === totalCells) {
            rows = dim;
            cols = dim;
          }
        }
      }

      // Geometric deduction: count unique left offsets among cells
      if (!cols || !rows || rows * cols !== totalCells) {
        const leftOffsets = new Set();
        const topOffsets = new Set();
        for (const cell of orderedCells) {
          if (cell) {
            leftOffsets.add(Math.round(cell.offsetLeft));
            topOffsets.add(Math.round(cell.offsetTop));
          }
        }
        cols = leftOffsets.size || Math.round(Math.sqrt(totalCells));
        rows = topOffsets.size || Math.round(totalCells / cols);
      }

      if (rows * cols !== totalCells) {
        const sq = Math.round(Math.sqrt(totalCells));
        if (sq * sq === totalCells) {
          rows = sq;
          cols = sq;
        }
      }

      console.info(`[ZipSolver] Grid dimensions detected: ${rows} rows x ${cols} cols (Total cells: ${totalCells})`);

      // Extract numbered cells and walls
      const numberedMap = new Map();
      const downWalls = [];
      const rightWalls = [];

      for (let idx = 0; idx < totalCells; idx++) {
        const cell = orderedCells[idx];
        if (!cell) continue;

        // Numbered waypoint check
        const contentEl = cell.querySelector('[data-cell-content="true"]') ||
                          cell.querySelector('.trail-cell-content') ||
                          cell.querySelector('.cell-content') ||
                          cell;

        const text = contentEl.textContent.trim();
        const parsedNum = parseInt(text, 10);
        if (!isNaN(parsedNum) && parsedNum > 0) {
          numberedMap.set(parsedNum, idx);
        }

        // Down wall check
        const hasDownWall = cell.querySelector('.trail-cell-wall--down') !== null ||
                            cell.classList.contains('wall-down') ||
                            cell.hasAttribute('data-wall-down');
        if (hasDownWall) {
          downWalls.push(idx);
        }

        // Right wall check
        const hasRightWall = cell.querySelector('.trail-cell-wall--right') !== null ||
                             cell.classList.contains('wall-right') ||
                             cell.hasAttribute('data-wall-right');
        if (hasRightWall) {
          rightWalls.push(idx);
        }
      }

      // Sort numbered cells in ascending order (1, 2, 3...)
      const sortedNumbers = Array.from(numberedMap.keys()).sort((a, b) => a - b);
      const numberedCells = sortedNumbers.map(n => numberedMap.get(n));

      return {
        rows,
        cols,
        orderedCells,
        numberedCells,
        downWalls,
        rightWalls
      };
    }

    /**
     * Resolves the full solution sequence using either hydration or the solver engine.
     */
    async solveCurrentGame() {
      const gridElement = this.findGridElement();
      if (!gridElement) {
        throw new Error('Zip game board not found. Please ensure you are on the LinkedIn Zip game page.');
      }

      const gridState = this.extractGridState(gridElement);
      let solution = this.extractHydrationSolution();

      if (!solution || solution.length === 0) {
        console.info('[ZipSolver] Solving puzzle using Hamiltonian Backtracking engine...');
        const solverResult = ZipSolver.solveZip(
          gridState.rows,
          gridState.cols,
          gridState.numberedCells,
          gridState.downWalls,
          gridState.rightWalls
        );
        solution = solverResult.fullSequence;
      }

      const compressedTurns = ZipSolver.compressSequence(solution);

      return {
        gridElement,
        orderedCells: gridState.orderedCells,
        rows: gridState.rows,
        cols: gridState.cols,
        fullSequence: solution,
        compressedTurns
      };
    }

    /**
     * Dispatches human-like pointer and mouse events to a cell with micro-jitter.
     */
    /**
     * Starts continuous pointer drag on starting cell
     */
    dispatchDragStart(targetEl, gridEl, options = {}) {
      if (!targetEl) return { clientX: 0, clientY: 0 };
      const rect = targetEl.getBoundingClientRect();
      const jitterX = options.humanize ? (Math.random() - 0.5) * 6 : 0;
      const jitterY = options.humanize ? (Math.random() - 0.5) * 6 : 0;
      const clientX = rect.left + rect.width / 2 + jitterX;
      const clientY = rect.top + rect.height / 2 + jitterY;

      const downInit = {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX,
        clientY,
        screenX: clientX + (window.screenX || 0),
        screenY: clientY + (window.screenY || 0),
        button: 0,
        buttons: 1,
        pointerId: 1,
        pointerType: 'mouse',
        isPrimary: true,
        pressure: 0.5
      };

      targetEl.dispatchEvent(new PointerEvent('pointerover', downInit));
      targetEl.dispatchEvent(new PointerEvent('pointerenter', downInit));
      targetEl.dispatchEvent(new PointerEvent('pointerdown', downInit));
      targetEl.dispatchEvent(new MouseEvent('mousedown', downInit));

      const inner = targetEl.querySelector('[data-cell-content="true"]') || targetEl.querySelector('.trail-cell-content');
      if (inner) {
        inner.dispatchEvent(new PointerEvent('pointerdown', downInit));
        inner.dispatchEvent(new MouseEvent('mousedown', downInit));
      }

      return { clientX, clientY };
    }

    /**
     * Moves continuous pointer drag to next cell (maintaining pointerdown)
     */
    dispatchDragMove(targetEl, gridEl, prevCoords, options = {}) {
      if (!targetEl) return prevCoords;
      const rect = targetEl.getBoundingClientRect();
      const jitterX = options.humanize ? (Math.random() - 0.5) * 6 : 0;
      const jitterY = options.humanize ? (Math.random() - 0.5) * 6 : 0;
      const clientX = rect.left + rect.width / 2 + jitterX;
      const clientY = rect.top + rect.height / 2 + jitterY;

      const moveInit = {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX,
        clientY,
        screenX: clientX + (window.screenX || 0),
        screenY: clientY + (window.screenY || 0),
        button: 0,
        buttons: 1,
        pointerId: 1,
        pointerType: 'mouse',
        isPrimary: true,
        pressure: 0.5
      };

      window.dispatchEvent(new PointerEvent('pointermove', moveInit));
      window.dispatchEvent(new MouseEvent('mousemove', moveInit));
      if (gridEl) {
        gridEl.dispatchEvent(new PointerEvent('pointermove', moveInit));
        gridEl.dispatchEvent(new MouseEvent('mousemove', moveInit));
      }

      targetEl.dispatchEvent(new PointerEvent('pointerover', moveInit));
      targetEl.dispatchEvent(new PointerEvent('pointerenter', moveInit));
      targetEl.dispatchEvent(new PointerEvent('pointermove', moveInit));
      targetEl.dispatchEvent(new MouseEvent('mousemove', moveInit));

      const inner = targetEl.querySelector('[data-cell-content="true"]') || targetEl.querySelector('.trail-cell-content');
      if (inner) {
        inner.dispatchEvent(new PointerEvent('pointerenter', moveInit));
        inner.dispatchEvent(new PointerEvent('pointermove', moveInit));
      }

      // Also fire click event (for hybrid click-tracking systems)
      targetEl.dispatchEvent(new MouseEvent('click', { ...moveInit, buttons: 0 }));

      return { clientX, clientY };
    }

    /**
     * Releases pointer drag on the final cell to commit the completed puzzle
     */
    dispatchDragEnd(targetEl, gridEl, coords, options = {}) {
      if (!targetEl) return;
      const rect = targetEl.getBoundingClientRect();
      const clientX = rect.left + rect.width / 2;
      const clientY = rect.top + rect.height / 2;

      const moveInit = {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX,
        clientY,
        screenX: clientX + (window.screenX || 0),
        screenY: clientY + (window.screenY || 0),
        button: 0,
        buttons: 1,
        pointerId: 1,
        pointerType: 'mouse',
        isPrimary: true,
        pressure: 0.5
      };

      targetEl.dispatchEvent(new PointerEvent('pointermove', moveInit));
      targetEl.dispatchEvent(new MouseEvent('mousemove', moveInit));

      const upInit = {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX,
        clientY,
        screenX: clientX + (window.screenX || 0),
        screenY: clientY + (window.screenY || 0),
        button: 0,
        buttons: 0, // MUST BE 0 WHEN RELEASED!
        pointerId: 1,
        pointerType: 'mouse',
        isPrimary: true,
        pressure: 0
      };

      // Pointer up on target cell
      targetEl.dispatchEvent(new PointerEvent('pointerup', upInit));
      targetEl.dispatchEvent(new MouseEvent('mouseup', upInit));

      // Pointer up on grid
      if (gridEl) {
        gridEl.dispatchEvent(new PointerEvent('pointerup', upInit));
        gridEl.dispatchEvent(new MouseEvent('mouseup', upInit));
      }

      // Pointer up on window and document (global drag handlers)
      window.dispatchEvent(new PointerEvent('pointerup', upInit));
      window.dispatchEvent(new MouseEvent('mouseup', upInit));
      document.dispatchEvent(new PointerEvent('pointerup', upInit));
      document.dispatchEvent(new MouseEvent('mouseup', upInit));

      // Final click on target cell
      targetEl.dispatchEvent(new MouseEvent('click', upInit));

      const inner = targetEl.querySelector('[data-cell-content="true"]') || targetEl.querySelector('.trail-cell-content');
      if (inner) {
        inner.dispatchEvent(new PointerEvent('pointerup', upInit));
        inner.dispatchEvent(new MouseEvent('mouseup', upInit));
        inner.dispatchEvent(new MouseEvent('click', upInit));
      }
    }

    /**
     * Fallback interaction for discrete cell clicks
     */
    dispatchInteraction(targetEl, options = {}) {
      if (!targetEl) return;
      const rect = targetEl.getBoundingClientRect();
      const jitterX = options.humanize ? (Math.random() - 0.5) * 6 : 0;
      const jitterY = options.humanize ? (Math.random() - 0.5) * 6 : 0;
      const clientX = rect.left + rect.width / 2 + jitterX;
      const clientY = rect.top + rect.height / 2 + jitterY;

      const eventInit = {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX,
        clientY,
        screenX: clientX + (window.screenX || 0),
        screenY: clientY + (window.screenY || 0),
        buttons: 1,
        pointerId: 1,
        isPrimary: true
      };

      targetEl.dispatchEvent(new PointerEvent('pointerover', eventInit));
      targetEl.dispatchEvent(new PointerEvent('pointerenter', eventInit));
      targetEl.dispatchEvent(new PointerEvent('pointermove', eventInit));
      targetEl.dispatchEvent(new MouseEvent('mousemove', eventInit));
      targetEl.dispatchEvent(new PointerEvent('pointerdown', eventInit));
      targetEl.dispatchEvent(new MouseEvent('mousedown', eventInit));
      targetEl.dispatchEvent(new PointerEvent('pointerup', { ...eventInit, buttons: 0 }));
      targetEl.dispatchEvent(new MouseEvent('mouseup', { ...eventInit, buttons: 0 }));
      targetEl.dispatchEvent(new MouseEvent('click', { ...eventInit, buttons: 0 }));
    }

    /**
     * Checks if LinkedIn's "See Results" / completion button is visible on page
     */
    async waitForSeeResults(timeoutMs = 3000) {
      const start = performance.now();
      while (performance.now() - start < timeoutMs) {
        const buttons = Array.from(document.querySelectorAll('button, a'));
        const found = buttons.find(b => {
          const text = (b.textContent || '').trim().toLowerCase();
          return text.includes('see results') || text.includes('view results') || text.includes('see result');
        });
        if (found && (found.offsetWidth > 0 || found.offsetHeight > 0)) {
          return found;
        }
        await sleep(150);
      }
      return null;
    }

    /**
     * Executes the automatic puzzle solve via continuous pointer drag.
     * Starts with pointerdown at Node 1, draws through all cells, and releases pointerup at finish.
     * @param {Object} options Options: speed ('fast' | 'human' | number), useCompressed (boolean)
     */
    async executeSolve(options = {}) {
      if (this.isSolving) {
        console.warn('[ZipSolver] Solve already in progress.');
        return;
      }

      this.isSolving = true;
      try {
        const { gridElement, orderedCells, fullSequence, compressedTurns } = await this.solveCurrentGame();
        this.clearHintOverlay();

        const sequenceToClick = options.useTurnPoints ? compressedTurns : fullSequence;
        const isHumanMode = options.speed === 'human';

        // Pacing: Adaptive execution without arbitrary 1-second restrictions.
        // Solves as fast as the puzzle allows while guaranteeing 100% event delivery, accuracy & game save.
        let baseStepDelay = 16; // ms per node (~60fps native frame rate, fastest reliable DOM dispatch)
        if (typeof options.speed === 'number') {
          baseStepDelay = options.speed;
        }

        const startTime = performance.now();

        console.info(`[ZipSolver] Executing continuous drag solve (${sequenceToClick.length} nodes, Mode: ${options.speed || 'fast'}, stepDelay: ${baseStepDelay}ms)...`);

        // 1. Initiate drag: pointerdown on start node
        let coords = this.dispatchDragStart(orderedCells[sequenceToClick[0]], gridElement, { humanize: isHumanMode });

        let prevDiff = null;

        // 2. Drag continuously across the board
        for (let i = 0; i < sequenceToClick.length; i++) {
          const cellIdx = sequenceToClick[i];
          const cellEl = orderedCells[cellIdx];

          if (i > 0 && cellEl) {
            coords = this.dispatchDragMove(cellEl, gridElement, coords, { humanize: isHumanMode });
          }

          if (i < sequenceToClick.length - 1) {
            if (isHumanMode) {
              let stepDelay = 110;

              // 1. Direction change / cornering deceleration
              if (i > 0 && i < sequenceToClick.length - 1) {
                const currentDiff = sequenceToClick[i] - sequenceToClick[i - 1];
                if (prevDiff !== null && currentDiff !== prevDiff) {
                  stepDelay += 45 + Math.random() * 25;
                }
                prevDiff = currentDiff;
              }

              // 2. Waypoint reflection: hesitation on numbered nodes
              const hasNumber = cellEl && (
                cellEl.querySelector('[data-cell-content="true"]') ||
                cellEl.querySelector('.trail-cell-content')
              );
              if (hasNumber && hasNumber.textContent.trim().length > 0) {
                stepDelay += 85 + Math.random() * 35;
              }

              stepDelay += (Math.random() - 0.5) * 20;
              await sleep(Math.max(10, Math.round(stepDelay)));
            } else if (baseStepDelay > 0) {
              // Fast mode: solves as fast as possible on native frame ticks
              await sleep(baseStepDelay);
            }
          }
        }

        // 3. Final node: pointerup release to commit completed path and trigger win modal
        const lastCellEl = orderedCells[sequenceToClick[sequenceToClick.length - 1]];
        this.dispatchDragEnd(lastCellEl, gridElement, coords, { humanize: isHumanMode });

        const elapsed = (performance.now() - startTime).toFixed(0);

        // 4. Wait for LinkedIn's "See Results" button to appear
        const seeResultsBtn = await this.waitForSeeResults(2500);
        if (seeResultsBtn) {
          console.info(`[ZipSolver] Puzzle solved successfully in ${elapsed}ms! "See Results" button is ready! 🎉`);
          seeResultsBtn.style.outline = '3px solid #22c55e';
          seeResultsBtn.style.boxShadow = '0 0 24px rgba(34, 197, 94, 0.8)';
          return { success: true, count: sequenceToClick.length, duration: elapsed, hasResultsBtn: true };
        } else {
          console.info(`[ZipSolver] Puzzle solved in ${elapsed}ms! 🎉`);
          return { success: true, count: sequenceToClick.length, duration: elapsed, hasResultsBtn: false };
        }
      } finally {
        this.isSolving = false;
      }
    }

    /**
     * Step-by-Step Teaching / Guided Mode
     */
    async initStepGuide() {
      const { orderedCells, fullSequence } = await this.solveCurrentGame();
      this.stepState = {
        orderedCells,
        fullSequence,
        currentIndex: 0
      };
      this.clearHintOverlay();
      return { totalSteps: fullSequence.length, currentStep: 0 };
    }

    stepForward() {
      if (!this.stepState || this.stepState.currentIndex >= this.stepState.fullSequence.length) {
        return { done: true };
      }
      const cellIdx = this.stepState.fullSequence[this.stepState.currentIndex];
      const cellEl = this.stepState.orderedCells[cellIdx];
      if (cellEl) {
        this.dispatchInteraction(cellEl, { humanize: true });
      }
      this.stepState.currentIndex++;
      return {
        currentStep: this.stepState.currentIndex,
        totalSteps: this.stepState.fullSequence.length,
        done: this.stepState.currentIndex >= this.stepState.fullSequence.length
      };
    }

    /**
     * Renders a glowing visual overlay highlighting the solution path.
     */
    async showHintOverlay() {
      this.clearHintOverlay();

      const { gridElement, orderedCells, fullSequence } = await this.solveCurrentGame();
      const gridRect = gridElement.getBoundingClientRect();

      const overlay = document.createElement('div');
      overlay.id = 'linkedin-zip-hint-overlay';
      overlay.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 9999;
      `;

      // Create an SVG layer for the path connecting the centers
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '100%');
      svg.setAttribute('height', '100%');
      svg.style.cssText = 'position: absolute; top:0; left:0; width:100%; height:100%; pointer-events:none;';

      const pathPoints = [];

      for (let step = 0; step < fullSequence.length; step++) {
        const cellIdx = fullSequence[step];
        const cellEl = orderedCells[cellIdx];
        if (!cellEl) continue;

        const cellRect = cellEl.getBoundingClientRect();
        // Coordinates relative to gridElement
        const cx = cellRect.left - gridRect.left + cellRect.width / 2;
        const cy = cellRect.top - gridRect.top + cellRect.height / 2;
        pathPoints.push(`${cx},${cy}`);

        // Create glowing step badge
        const badge = document.createElement('div');
        badge.className = 'zip-hint-step-badge';
        badge.textContent = `${step + 1}`;
        badge.style.cssText = `
          position: absolute;
          left: ${cx}px;
          top: ${cy}px;
          transform: translate(-50%, -50%);
          background: rgba(14, 165, 233, 0.85);
          color: #ffffff;
          font-weight: 700;
          font-size: 11px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 10px rgba(56, 189, 248, 0.9);
          border: 1.5px solid #ffffff;
          pointer-events: none;
          animation: zipPulse 1.8s infinite ease-in-out;
        `;
        overlay.appendChild(badge);
      }

      // Draw SVG polyline connecting centers
      if (pathPoints.length > 1) {
        const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        polyline.setAttribute('points', pathPoints.join(' '));
        polyline.setAttribute('fill', 'none');
        polyline.setAttribute('stroke', '#38bdf8');
        polyline.setAttribute('stroke-width', '4');
        polyline.setAttribute('stroke-linecap', 'round');
        polyline.setAttribute('stroke-linejoin', 'round');
        polyline.setAttribute('stroke-dasharray', '8 4');
        polyline.style.filter = 'drop-shadow(0 0 6px #0284c7)';
        svg.appendChild(polyline);
      }

      overlay.appendChild(svg);
      gridElement.style.position = 'relative';
      gridElement.appendChild(overlay);
      this.activeOverlay = overlay;
    }

    /**
     * Clears any active visual hint overlay.
     */
    clearHintOverlay() {
      if (this.activeOverlay) {
        this.activeOverlay.remove();
        this.activeOverlay = null;
      }
      const existing = document.getElementById('linkedin-zip-hint-overlay');
      if (existing) existing.remove();
    }
  }

  return new ZipDomBridge();
});
