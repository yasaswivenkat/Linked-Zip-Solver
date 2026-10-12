/**
 * LinkedIn Zip Puzzle Solver - Algorithmic Hamiltonian Path Engine
 * Efficient backtracking with cell degree pruning and waypoint constraints.
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ZipSolver = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {

  /**
   * Compresses a full sequential cell path into only the turn-point cells
   * (the last cell in each continuous straight-line direction run).
   */
  function compressSequence(sequence) {
    if (!sequence || sequence.length === 0) return [];
    const result = [sequence[0]];
    let i = 1;
    while (i < sequence.length) {
      const runStart = i - 1;
      const diff = sequence[i] - sequence[runStart];
      while (i + 1 < sequence.length && sequence[i + 1] - sequence[i] === diff) {
        i++;
      }
      result.push(sequence[i]);
      i++;
    }
    return result;
  }

  /**
   * Main solver function.
   * @param {number} m Number of rows
   * @param {number} n Number of columns
   * @param {Array<number>} numberedCells Array of cell indices for [1, 2, 3, ...]
   * @param {Array<number>} downWalls Cell indices with bottom walls
   * @param {Array<number>} rightWalls Cell indices with right walls
   * @returns {{ fullSequence: Array<number>, compressedTurns: Array<number> }}
   */
  function solveZip(m, n, numberedCells, downWalls = [], rightWalls = []) {
    if (!m || !n || m <= 0 || n <= 0) {
      throw new Error(`Invalid grid dimensions: ${m}x${n}`);
    }
    if (!numberedCells || numberedCells.length === 0) {
      throw new Error("No numbered waypoint cells provided");
    }

    const grid = new ZipGrid(m, n, numberedCells, downWalls, rightWalls);
    const fullSequence = grid.solve();
    const compressedTurns = compressSequence(fullSequence);

    return {
      fullSequence,
      compressedTurns,
      rows: m,
      cols: n
    };
  }

  class ZipGrid {
    #m;
    #n;
    #size;
    #head;
    #foot;
    #current;
    #path;
    #visitedCells;
    #degreeModifications;
    #cellStatuses;

    constructor(m, n, numberedCells, downWalls = [], rightWalls = []) {
      this.#m = m;
      this.#n = n;
      this.#size = m * n;
      this.#head = numberedCells[0];
      this.#foot = numberedCells[numberedCells.length - 1];
      this.#current = 1;

      this.#path = new Array(this.#size).fill(-1);
      this.#path[0] = this.#head;
      this.#visitedCells = 1;
      this.#degreeModifications = Array.from({ length: this.#size - 1 }, () => []);

      this.#constructCellStatuses(m, n, this.#size, numberedCells, downWalls, rightWalls);
      this.#setVisited(this.#head, true);
    }

    #constructCellStatuses(m, n, size, numberedCells, downWalls, rightWalls) {
      this.#cellStatuses = new Array(size).fill(4 << 0x1);

      // Top and bottom borders: reduce degree by 1
      for (let i = 0; i < n; i++) {
        this.#decrementDegree(i);
        this.#decrementDegree(size - n + i);
      }

      // Left and right borders: reduce degree by 1 (corners reduced twice)
      for (let i = 0; i < m; i++) {
        this.#decrementDegree(n * i);
        this.#decrementDegree(n * i + n - 1);
      }

      // Down walls: wall blocks cell and (cell + n)
      for (const cell of downWalls) {
        if (cell >= 0 && cell < size) {
          this.#addDownWall(cell);
          this.#decrementDegree(cell);
          if (cell < size - n) {
            this.#decrementDegree(cell + n);
          }
        }
      }

      // Right walls: wall blocks cell and (cell + 1)
      for (const cell of rightWalls) {
        if (cell >= 0 && cell < size) {
          this.#addRightWall(cell);
          this.#decrementDegree(cell);
          if (cell % n !== n - 1) {
            this.#decrementDegree(cell + 1);
          }
        }
      }

      // Waypoint labels
      for (let i = 0; i < numberedCells.length; i++) {
        this.#label(numberedCells[i], i + 1);
      }
    }

    solve() {
      const callStack = [];
      let finalPath = null;

      this.#stackPushValidMoves(callStack, this.#head);

      while (callStack.length > 0) {
        const [from, to, doVisit] = callStack.pop();

        while (this.lastMove() !== from) {
          this.unvisit();
        }

        doVisit.call(this, to, from);

        if (this.#visitedCells === this.#size) {
          finalPath = [...this.#path];
          break;
        }

        this.#stackPushValidMoves(callStack, to);
      }

      // Cleanup internal state
      while (this.#visitedCells > 1) {
        this.unvisit();
      }

      if (!finalPath) {
        throw new Error("No valid Hamiltonian path solution found for this Zip puzzle");
      }

      return finalPath;
    }

    #stackPushValidMoves(stack, from) {
      // Push moves to stack in optimal order
      if (this.canVisitRight()) {
        stack.push([from, from + 1, this.#doVisitRight]);
      }
      if (this.canVisitLeft()) {
        stack.push([from, from - 1, this.#doVisitLeft]);
      }
      if (this.canVisitDown()) {
        stack.push([from, from + this.#n, this.#doVisitDown]);
      }
      if (this.canVisitUp()) {
        stack.push([from, from - this.#n, this.#doVisitUp]);
      }
    }

    canVisitUp() {
      return this.#canVisitDirection(
        s => s - this.#n,
        (d, s) => d >= 0,
        (ds, ss) => this.maskHasDownWall(ds),
        [this.#visitIsolatesDown, this.#visitIsolatesLeft, this.#visitIsolatesRight]
      );
    }

    canVisitDown() {
      return this.#canVisitDirection(
        s => s + this.#n,
        (d, s) => d < this.#size,
        (ds, ss) => this.maskHasDownWall(ss),
        [this.#visitIsolatesUp, this.#visitIsolatesLeft, this.#visitIsolatesRight]
      );
    }

    canVisitLeft() {
      return this.#canVisitDirection(
        s => s - 1,
        (d, s) => s % this.#n !== 0,
        (ds, ss) => this.maskHasRightWall(ds),
        [this.#visitIsolatesUp, this.#visitIsolatesDown, this.#visitIsolatesRight]
      );
    }

    canVisitRight() {
      return this.#canVisitDirection(
        s => s + 1,
        (d, s) => s % this.#n !== this.#n - 1,
        (ds, ss) => this.maskHasRightWall(ss),
        [this.#visitIsolatesUp, this.#visitIsolatesDown, this.#visitIsolatesLeft]
      );
    }

    #canVisitDirection(computeDst, checkBounds, checkWall, isolateChecks) {
      const src = this.lastMove();
      const dst = computeDst.call(this, src);
      if (!checkBounds.call(this, dst, src)) return false;

      const dstStatus = this.#cellStatuses[dst];
      const srcStatus = this.#cellStatuses[src];

      if (this.maskIsVisited(dstStatus)) return false;
      if (checkWall.call(this, dstStatus, srcStatus)) return false;

      const dstLabel = this.getMaskLabel(dstStatus);
      // Can't visit a numbered cell prematurely
      if (dstLabel > 0 && dstLabel !== this.#current + 1) return false;

      // Degree pruning checks
      for (const check of isolateChecks) {
        if (check.call(this, src)) return false;
      }

      return true;
    }

    #visitIsolatesUp(src) {
      return this.#visitIsolates(this.#visitImpactsUpDegree(src));
    }
    #visitIsolatesDown(src) {
      return this.#visitIsolates(this.#visitImpactsDownDegree(src));
    }
    #visitIsolatesLeft(src) {
      return this.#visitIsolates(this.#visitImpactsLeftDegree(src));
    }
    #visitIsolatesRight(src) {
      return this.#visitIsolates(this.#visitImpactsRightDegree(src));
    }

    #visitIsolates(cell) {
      if (cell < 0) return false;
      const deg = this.#getDegree(cell);
      return (cell === this.#foot && deg === 1) || (cell !== this.#foot && deg === 2);
    }

    #doVisitUp(dst, src) {
      this.#visitDirection(dst, src, [
        this.#visitImpactsDownDegree,
        this.#visitImpactsLeftDegree,
        this.#visitImpactsRightDegree
      ]);
    }

    #doVisitDown(dst, src) {
      this.#visitDirection(dst, src, [
        this.#visitImpactsUpDegree,
        this.#visitImpactsLeftDegree,
        this.#visitImpactsRightDegree
      ]);
    }

    #doVisitLeft(dst, src) {
      this.#visitDirection(dst, src, [
        this.#visitImpactsUpDegree,
        this.#visitImpactsDownDegree,
        this.#visitImpactsRightDegree
      ]);
    }

    #doVisitRight(dst, src) {
      this.#visitDirection(dst, src, [
        this.#visitImpactsUpDegree,
        this.#visitImpactsDownDegree,
        this.#visitImpactsLeftDegree
      ]);
    }

    #visitDirection(dst, src, impactFns) {
      this.#setVisited(dst, true);
      const label = this.#getLabel(dst);
      if (label > 0) {
        this.#current = label;
      }

      const mod = this.#degreeModifications[this.#visitedCells - 1];
      for (const fn of impactFns) {
        const cell = fn.call(this, src);
        if (cell >= 0) {
          this.#decrementDegree(cell);
          mod.push(cell);
        }
      }

      this.#path[this.#visitedCells++] = dst;
    }

    #visitImpactsUpDegree(src) {
      if (src >= this.#n) {
        const up = src - this.#n;
        const upStatus = this.#cellStatuses[up];
        if (!this.maskIsVisited(upStatus) && !this.maskHasDownWall(upStatus)) {
          return up;
        }
      }
      return -1;
    }

    #visitImpactsDownDegree(src) {
      if (src < this.#size - this.#n) {
        const down = src + this.#n;
        if (!this.#isVisited(down) && !this.#hasDownWall(src)) {
          return down;
        }
      }
      return -1;
    }

    #visitImpactsLeftDegree(src) {
      if (src % this.#n !== 0) {
        const left = src - 1;
        const leftStatus = this.#cellStatuses[left];
        if (!this.maskIsVisited(leftStatus) && !this.maskHasRightWall(leftStatus)) {
          return left;
        }
      }
      return -1;
    }

    #visitImpactsRightDegree(src) {
      if (src % this.#n !== this.#n - 1) {
        const right = src + 1;
        if (!this.#isVisited(right) && !this.#hasRightWall(src)) {
          return right;
        }
      }
      return -1;
    }

    unvisit() {
      if (this.#visitedCells <= 1) return false;
      const last = this.lastMove();
      this.#path[--this.#visitedCells] = -1;

      const mods = this.#degreeModifications[this.#visitedCells - 1];
      while (mods.length > 0) {
        this.#incrementDegree(mods.pop());
      }

      const label = this.#getLabel(last);
      if (label > 0) {
        this.#current = label - 1;
      }

      this.#setVisited(last, false);
      return true;
    }

    lastMove() {
      return this.#path[this.#visitedCells - 1];
    }

    // Bitmask helpers
    #isVisited(cell) {
      return this.maskIsVisited(this.#cellStatuses[cell]);
    }
    maskIsVisited(mask) {
      return (mask & 1) === 1;
    }
    #setVisited(cell, visited) {
      if (visited) this.#cellStatuses[cell] |= 0x1;
      else this.#cellStatuses[cell] &= ~0x1;
    }
    #getDegree(cell) {
      return this.getMaskDegree(this.#cellStatuses[cell]);
    }
    getMaskDegree(mask) {
      return (mask & 0xE) >>> 1;
    }
    #decrementDegree(cell) {
      this.#cellStatuses[cell] -= 0x2;
    }
    #incrementDegree(cell) {
      this.#cellStatuses[cell] += 0x2;
    }
    #hasDownWall(cell) {
      return this.maskHasDownWall(this.#cellStatuses[cell]);
    }
    maskHasDownWall(mask) {
      return (mask & 0x10) !== 0;
    }
    #addDownWall(cell) {
      this.#cellStatuses[cell] |= 0x10;
    }
    #hasRightWall(cell) {
      return this.maskHasRightWall(this.#cellStatuses[cell]);
    }
    maskHasRightWall(mask) {
      return (mask & 0x20) !== 0;
    }
    #addRightWall(cell) {
      this.#cellStatuses[cell] |= 0x20;
    }
    #getLabel(cell) {
      return this.getMaskLabel(this.#cellStatuses[cell]);
    }
    getMaskLabel(mask) {
      return mask >>> 6;
    }
    #label(cell, number) {
      this.#cellStatuses[cell] |= (number << 6);
    }
  }

  return {
    solveZip,
    compressSequence,
    ZipGrid
  };
});
