/**
 * LinkedIn Zip Puzzle Solver - Content Script
 * Injected on LinkedIn games and practice sites. Handles user commands & in-page HUD.
 */

(function () {
  // Prevent duplicate execution
  if (window.__linkedinZipContentInjected) return;
  window.__linkedinZipContentInjected = true;

  console.info('[ZipSolver] Content script active on page:', window.location.href);

  let currentSpeed = 'fast'; // 'fast' | 'human'
  let autoSolveEnabled = false;
  let hudVisible = true;
  let isPanelExpanded = false;
  let autoSolveTriggered = false;

  // Retrieve user preferences from storage
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['zip_speed', 'zip_auto_solve', 'zip_hud_visible'], (res) => {
      if (res.zip_speed) currentSpeed = res.zip_speed === 'instant' ? 'fast' : res.zip_speed;
      if (typeof res.zip_auto_solve === 'boolean') autoSolveEnabled = res.zip_auto_solve;
      if (typeof res.zip_hud_visible === 'boolean') hudVisible = res.zip_hud_visible;
      renderHud();
      checkAndAutoSolve();
    });
  } else {
    renderHud();
  }

  // Initialize UI HUD container
  function createHudContainer() {
    let container = document.getElementById('linkedin-zip-hud');
    if (!container) {
      container = document.createElement('div');
      container.id = 'linkedin-zip-hud';
      document.body.appendChild(container);
    }
    return container;
  }

  // Render the in-page Floating HUD
  function renderHud() {
    if (!hudVisible) {
      const existing = document.getElementById('linkedin-zip-hud');
      if (existing) existing.remove();
      return;
    }

    const container = createHudContainer();
    const gamePresent = window.ZipDomBridge && window.ZipDomBridge.isGamePresent();

    if (!isPanelExpanded) {
      // Collapsed state: circular floating action button
      container.innerHTML = `
        <button class="zip-hud-launch-btn" title="LinkedIn Zip Puzzle Auto-Solver">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
          </svg>
        </button>
      `;

      container.querySelector('.zip-hud-launch-btn').addEventListener('click', () => {
        isPanelExpanded = true;
        renderHud();
      });
    } else {
      // Expanded state: rich control panel
      container.innerHTML = `
        <div class="zip-hud-panel">
          <div class="zip-hud-header">
            <div class="zip-hud-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
              </svg>
              <span>Zip Solver</span>
              <span class="badge">V1.0</span>
            </div>
            <button class="zip-hud-close-btn" title="Minimize">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div class="zip-hud-status">
            <div class="zip-hud-status-dot ${gamePresent ? '' : 'searching'}"></div>
            <span id="zip-hud-status-text">
              ${gamePresent ? 'Zip Board Ready' : 'Looking for Zip puzzle...'}
            </span>
          </div>

          <div class="zip-hud-actions">
            <button class="zip-hud-btn zip-hud-btn-primary" id="zip-hud-solve-btn" ${!gamePresent ? 'disabled' : ''}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
              Auto-Solve Puzzle
            </button>

            <div class="zip-hud-secondary-row">
              <button class="zip-hud-btn zip-hud-btn-secondary" id="zip-hud-hint-btn" ${!gamePresent ? 'disabled' : ''}>
                👁️ Hints
              </button>
              <button class="zip-hud-btn zip-hud-btn-secondary" id="zip-hud-step-btn" ${!gamePresent ? 'disabled' : ''}>
                🎓 Step Mode
              </button>
              <button class="zip-hud-btn zip-hud-btn-secondary" id="zip-hud-clear-btn">
                ✕ Clear
              </button>
            </div>

            <div id="zip-hud-step-controls" style="display: none; flex-direction: column; gap: 6px; background: rgba(30, 41, 59, 0.7); padding: 8px 10px; border-radius: 10px; border: 1px dashed rgba(56, 189, 248, 0.4);">
              <div style="display: flex; justify-content: space-between; font-size: 11.5px; font-weight: 600;">
                <span style="color: #94a3b8;">Step Guide:</span>
                <span id="zip-step-counter" style="color: #38bdf8;">0 / --</span>
              </div>
              <div style="display: flex; gap: 6px;">
                <button class="zip-hud-btn zip-hud-btn-primary" id="zip-hud-next-step-btn" style="padding: 6px 10px; font-size: 11.5px;">Next Move ➔</button>
                <button class="zip-hud-btn zip-hud-btn-secondary" id="zip-hud-finish-step-btn" style="padding: 6px 10px; font-size: 11.5px;">Finish ⚡</button>
              </div>
            </div>
          </div>

          <div class="zip-hud-options-row">
            <span class="zip-hud-options-label">Pacing:</span>
            <div class="zip-hud-speed-group">
              <button class="zip-hud-speed-btn ${currentSpeed === 'fast' ? 'active' : ''}" data-speed="fast" title="Fast 2-second solve (LinkedIn save verified)">⚡ Fast (2s)</button>
              <button class="zip-hud-speed-btn ${currentSpeed === 'human' ? 'active' : ''}" data-speed="human" title="Human Stealth: Realistic cornering deceleration & waypoint pauses">☕ Human</button>
            </div>
          </div>

          ${currentSpeed === 'human' ? `
            <div style="font-size: 10.5px; color: #38bdf8; background: rgba(56, 189, 248, 0.1); padding: 5px 8px; border-radius: 6px; display: flex; align-items: center; gap: 6px;">
              <span>🛡️</span>
              <span>Human Stealth: Corner deceleration & waypoint pauses active</span>
            </div>
          ` : ''}
        </div>
      `;

      // Event listeners
      container.querySelector('.zip-hud-close-btn').addEventListener('click', () => {
        isPanelExpanded = false;
        renderHud();
      });

      const solveBtn = container.querySelector('#zip-hud-solve-btn');
      if (solveBtn) {
        solveBtn.addEventListener('click', async () => {
          solveBtn.disabled = true;
          solveBtn.textContent = 'Solving...';
          try {
            await window.ZipDomBridge.executeSolve({ speed: currentSpeed });
            solveBtn.textContent = 'Solved! 🎉';
            setTimeout(() => {
              solveBtn.textContent = 'Auto-Solve Puzzle';
              solveBtn.disabled = false;
            }, 2000);
          } catch (err) {
            console.error('[ZipSolver] Solve error:', err);
            solveBtn.textContent = 'Error: ' + err.message;
            setTimeout(() => {
              solveBtn.textContent = 'Auto-Solve Puzzle';
              solveBtn.disabled = false;
            }, 3000);
          }
        });
      }

      const hintBtn = container.querySelector('#zip-hud-hint-btn');
      if (hintBtn) {
        hintBtn.addEventListener('click', async () => {
          try {
            await window.ZipDomBridge.showHintOverlay();
          } catch (e) {
            alert('Could not render hints: ' + e.message);
          }
        });
      }

      // Step Guide Mode toggle
      const stepBtn = container.querySelector('#zip-hud-step-btn');
      const stepControls = container.querySelector('#zip-hud-step-controls');
      const stepCounter = container.querySelector('#zip-step-counter');
      const nextStepBtn = container.querySelector('#zip-hud-next-step-btn');
      const finishStepBtn = container.querySelector('#zip-hud-finish-step-btn');

      if (stepBtn && stepControls) {
        stepBtn.addEventListener('click', async () => {
          try {
            const state = await window.ZipDomBridge.initStepGuide();
            stepControls.style.display = 'flex';
            stepCounter.textContent = `0 / ${state.totalSteps}`;
          } catch (e) {
            alert('Step Guide error: ' + e.message);
          }
        });

        if (nextStepBtn) {
          nextStepBtn.addEventListener('click', () => {
            const res = window.ZipDomBridge.stepForward();
            if (res.done) {
              stepCounter.textContent = 'Complete! 🎉';
              nextStepBtn.disabled = true;
            } else {
              stepCounter.textContent = `${res.currentStep} / ${res.totalSteps}`;
            }
          });
        }

        if (finishStepBtn) {
          finishStepBtn.addEventListener('click', async () => {
            stepControls.style.display = 'none';
            await window.ZipDomBridge.executeSolve({ speed: currentSpeed });
          });
        }
      }

      const clearBtn = container.querySelector('#zip-hud-clear-btn');
      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          window.ZipDomBridge.clearHintOverlay();
          if (stepControls) stepControls.style.display = 'none';
        });
      }

      // Speed selection
      container.querySelectorAll('.zip-hud-speed-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          currentSpeed = btn.dataset.speed;
          if (chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({ zip_speed: currentSpeed });
          }
          renderHud();
        });
      });
    }
  }

  // Check if puzzle is ready and trigger auto-solve if configured
  function checkAndAutoSolve() {
    if (!autoSolveEnabled || autoSolveTriggered) return;
    if (window.ZipDomBridge && window.ZipDomBridge.isGamePresent()) {
      autoSolveTriggered = true;
      console.info('[ZipSolver] Auto-solve on load triggered in 1.2s...');
      setTimeout(() => {
        window.ZipDomBridge.executeSolve({ speed: currentSpeed }).catch(err => {
          console.error('[ZipSolver] Auto-solve error:', err);
        });
      }, 1200);
    }
  }

  // Periodic and Mutation-based observer for dynamic LinkedIn game boards
  let lastPresent = false;
  function updateGameState() {
    const present = window.ZipDomBridge && window.ZipDomBridge.isGamePresent();
    if (present !== lastPresent) {
      lastPresent = present;
      renderHud();
      if (present) {
        checkAndAutoSolve();
      }
    }
  }

  const observer = new MutationObserver(() => {
    updateGameState();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  setInterval(updateGameState, 2000);

  // Chrome Runtime Message Listener for Extension Popup communication
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'GET_STATUS') {
      const isPresent = window.ZipDomBridge && window.ZipDomBridge.isGamePresent();
      let details = null;
      if (isPresent) {
        try {
          const gridEl = window.ZipDomBridge.findGridElement();
          const state = window.ZipDomBridge.extractGridState(gridEl);
          details = { rows: state.rows, cols: state.cols, waypoints: state.numberedCells.length };
        } catch (e) {
          // Grid loading in progress
        }
      }
      sendResponse({
        isGamePresent: isPresent,
        isSolving: window.ZipDomBridge?.isSolving || false,
        details,
        speed: currentSpeed,
        autoSolve: autoSolveEnabled,
        hudVisible
      });
      return true;
    }

    if (request.action === 'SOLVE_ZIP') {
      const speed = request.speed || currentSpeed;
      window.ZipDomBridge.executeSolve({ speed, useTurnPoints: request.useTurnPoints })
        .then(res => sendResponse({ success: true, result: res }))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true; // async response
    }

    if (request.action === 'SHOW_HINT') {
      window.ZipDomBridge.showHintOverlay()
        .then(() => sendResponse({ success: true }))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;
    }

    if (request.action === 'CLEAR_HINT') {
      window.ZipDomBridge.clearHintOverlay();
      sendResponse({ success: true });
      return true;
    }

    if (request.action === 'SET_SETTINGS') {
      if (request.speed) currentSpeed = request.speed;
      if (typeof request.autoSolve === 'boolean') autoSolveEnabled = request.autoSolve;
      if (typeof request.hudVisible === 'boolean') {
        hudVisible = request.hudVisible;
        renderHud();
      }
      sendResponse({ success: true });
      return true;
    }
  });

  // Hotkey Listeners: Alt+Shift+Z for Auto-Solve, Space for Step Forward
  window.addEventListener('keydown', (e) => {
    if (e.altKey && e.shiftKey && (e.key === 'Z' || e.key === 'z')) {
      e.preventDefault();
      console.info('[ZipSolver] Alt+Shift+Z hotkey detected. Triggering solve...');
      window.ZipDomBridge.executeSolve({ speed: currentSpeed });
    }
    if (e.code === 'Space') {
      const stepControls = document.getElementById('zip-hud-step-controls');
      if (stepControls && stepControls.style.display !== 'none') {
        e.preventDefault();
        const nextBtn = document.getElementById('zip-hud-next-step-btn');
        if (nextBtn && !nextBtn.disabled) nextBtn.click();
      }
    }
  });

})();
