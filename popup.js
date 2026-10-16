/**
 * LinkedIn Zip Puzzle Auto-Solver - Popup Script
 * Manages popup UI state, communication with content scripts & storage preferences.
 */

document.addEventListener('DOMContentLoaded', async () => {
  const statusTitle = document.getElementById('status-title');
  const statusSubtitle = document.getElementById('status-subtitle');
  const statusDot = document.getElementById('status-dot');
  const gameMeta = document.getElementById('game-meta');
  const metaGrid = document.getElementById('meta-grid');
  const metaWaypoints = document.getElementById('meta-waypoints');

  const btnSolve = document.getElementById('btn-solve');
  const btnSolveText = document.getElementById('btn-solve-text');
  const btnHint = document.getElementById('btn-hint');
  const btnClear = document.getElementById('btn-clear');

  const speedSelector = document.getElementById('speed-selector');
  const toggleAutosolve = document.getElementById('toggle-autosolve');
  const toggleHud = document.getElementById('toggle-hud');

  const linkPlayground = document.getElementById('link-playground');
  const linkOpenGame = document.getElementById('link-open-game');

  let activeTab = null;
  let currentSpeed = 'fast';

  // Load persistent user preferences
  chrome.storage.local.get(['zip_speed', 'zip_auto_solve', 'zip_hud_visible'], (res) => {
    if (res.zip_speed) {
      currentSpeed = res.zip_speed === 'instant' ? 'fast' : res.zip_speed;
      updateSpeedUI(currentSpeed);
    }
    if (typeof res.zip_auto_solve === 'boolean') {
      toggleAutosolve.checked = res.zip_auto_solve;
    }
    if (typeof res.zip_hud_visible === 'boolean') {
      toggleHud.checked = res.zip_hud_visible;
    }
  });

  // Query active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  activeTab = tab;

  if (!activeTab || !activeTab.url) {
    showInactiveState('No Active Tab', 'Unable to inspect current tab');
    return;
  }

  const url = activeTab.url.toLowerCase();
  const isZipSite = url.includes('linkedin.com/games/zip') ||
                    url.includes('zipgameunlimited.com') ||
                    url.includes('zipgameonline.com') ||
                    url.includes('awa.games/zip');

  const isLinkedInGeneral = url.includes('linkedin.com') && !isZipSite;

  if (isZipSite) {
    checkGameState(activeTab.id);
  } else if (isLinkedInGeneral) {
    showLinkedInNonZipState();
  } else {
    showExternalSiteState();
  }

  // Poll or check game state from content script
  async function checkGameState(tabId) {
    statusTitle.textContent = 'Detecting Zip Game...';
    statusSubtitle.textContent = 'Scanning game board and grid waypoints';
    statusDot.className = 'status-dot-pulse';

    try {
      const response = await sendMessageToTab(tabId, { action: 'GET_STATUS' });
      if (response && response.isGamePresent) {
        showActiveGameState(response.details);
      } else {
        // Retry injection if not responding
        await injectScripts(tabId);
        const retryRes = await sendMessageToTab(tabId, { action: 'GET_STATUS' });
        if (retryRes && retryRes.isGamePresent) {
          showActiveGameState(retryRes.details);
        } else {
          showWaitingForGameState();
        }
      }
    } catch (e) {
      // Try injecting then re-check
      try {
        await injectScripts(tabId);
        const retryRes = await sendMessageToTab(tabId, { action: 'GET_STATUS' });
        if (retryRes && retryRes.isGamePresent) {
          showActiveGameState(retryRes.details);
        } else {
          showWaitingForGameState();
        }
      } catch (err) {
        showWaitingForGameState();
      }
    }
  }

  function sendMessageToTab(tabId, message) {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });
  }

  async function injectScripts(tabId) {
    await chrome.scripting.insertCSS({ target: { tabId }, files: ['content.css'] });
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['solver.js', 'dom-bridge.js', 'content.js']
    });
  }

  function showActiveGameState(details) {
    statusTitle.textContent = 'LinkedIn Zip Board Ready';
    statusSubtitle.textContent = 'Grid and checkpoints detected & ready to solve';
    statusDot.className = 'status-dot-pulse active';

    if (details && details.rows && details.cols) {
      gameMeta.style.display = 'flex';
      metaGrid.textContent = `Grid: ${details.rows}x${details.cols}`;
      metaWaypoints.textContent = `Checkpoints: ${details.waypoints || 'Full'}`;
    }

    btnSolve.disabled = false;
    btnHint.disabled = false;
    btnClear.disabled = false;
  }

  function showWaitingForGameState() {
    statusTitle.textContent = 'Zip Game Loading...';
    statusSubtitle.textContent = 'Waiting for interactive grid to mount';
    statusDot.className = 'status-dot-pulse';
    gameMeta.style.display = 'none';

    btnSolve.disabled = true;
    btnHint.disabled = true;
    btnClear.disabled = true;
  }

  function showLinkedInNonZipState() {
    statusTitle.textContent = 'On LinkedIn (Not on Zip)';
    statusSubtitle.textContent = 'Click below to open the daily Zip puzzle';
    statusDot.className = 'status-dot-pulse';
    gameMeta.style.display = 'none';

    btnSolve.disabled = false;
    btnSolveText.textContent = 'Go to LinkedIn Zip ↗';
    btnSolve.onclick = () => {
      chrome.tabs.update(activeTab.id, { url: 'https://www.linkedin.com/games/zip/' });
      window.close();
    };

    btnHint.disabled = true;
    btnClear.disabled = true;
  }

  function showExternalSiteState() {
    statusTitle.textContent = 'Not on LinkedIn Zip';
    statusSubtitle.textContent = 'Navigate to LinkedIn or use the Practice Arena';
    statusDot.className = 'status-dot-pulse error';
    gameMeta.style.display = 'none';

    btnSolve.disabled = false;
    btnSolveText.textContent = 'Open LinkedIn Zip ↗';
    btnSolve.onclick = () => {
      chrome.tabs.create({ url: 'https://www.linkedin.com/games/zip/' });
      window.close();
    };

    btnHint.disabled = true;
    btnClear.disabled = true;
  }

  function showInactiveState(title, subtitle) {
    statusTitle.textContent = title;
    statusSubtitle.textContent = subtitle;
    statusDot.className = 'status-dot-pulse error';
    gameMeta.style.display = 'none';
  }

  // Solve button handler
  btnSolve.addEventListener('click', async () => {
    if (!activeTab) return;
    btnSolve.disabled = true;
    btnSolveText.textContent = 'Solving Puzzle...';

    try {
      const response = await sendMessageToTab(activeTab.id, {
        action: 'SOLVE_ZIP',
        speed: currentSpeed
      });

      if (response && response.success) {
        if (response.result && response.result.hasResultsBtn) {
          btnSolveText.textContent = 'See Results Ready! 🎉';
        } else {
          btnSolveText.textContent = 'Solved in 1s! 🎉';
        }
        setTimeout(() => {
          btnSolveText.textContent = 'Auto-Solve Puzzle';
          btnSolve.disabled = false;
        }, 3000);
      } else {
        throw new Error(response ? response.error : 'Unknown solve error');
      }
    } catch (err) {
      console.error('Solve failed:', err);
      btnSolveText.textContent = 'Error: ' + err.message;
      setTimeout(() => {
        btnSolveText.textContent = 'Auto-Solve Puzzle';
        btnSolve.disabled = false;
      }, 3000);
    }
  });

  // Hints button handler
  btnHint.addEventListener('click', async () => {
    if (!activeTab) return;
    try {
      await sendMessageToTab(activeTab.id, { action: 'SHOW_HINT' });
    } catch (e) {
      console.error(e);
    }
  });

  // Clear button handler
  btnClear.addEventListener('click', async () => {
    if (!activeTab) return;
    try {
      await sendMessageToTab(activeTab.id, { action: 'CLEAR_HINT' });
    } catch (e) {
      console.error(e);
    }
  });

  // Speed selection handler
  speedSelector.querySelectorAll('.speed-option').forEach(btn => {
    btn.addEventListener('click', () => {
      currentSpeed = btn.dataset.speed;
      updateSpeedUI(currentSpeed);
      chrome.storage.local.set({ zip_speed: currentSpeed });
      if (activeTab) {
        sendMessageToTab(activeTab.id, { action: 'SET_SETTINGS', speed: currentSpeed }).catch(() => {});
      }
    });
  });

  const speedDescription = document.getElementById('speed-description');
  const stealthPill = document.querySelector('.stealth-info-pill');

  function updateSpeedUI(speed) {
    speedSelector.querySelectorAll('.speed-option').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.speed === speed);
    });

    if (speedDescription) {
      if (speed === 'fast' || speed === 'instant') {
        speedDescription.textContent = 'Fast Pacing: 1.0s solve (LinkedIn safe)';
      } else {
        speedDescription.textContent = 'Human Stealth: Corner deceleration & reflection pauses';
      }
    }

    if (stealthPill) {
      stealthPill.style.display = speed === 'human' ? 'flex' : 'none';
    }
  }

  // Toggles handlers
  toggleAutosolve.addEventListener('change', () => {
    const val = toggleAutosolve.checked;
    chrome.storage.local.set({ zip_auto_solve: val });
    if (activeTab) {
      sendMessageToTab(activeTab.id, { action: 'SET_SETTINGS', autoSolve: val }).catch(() => {});
    }
  });

  toggleHud.addEventListener('change', () => {
    const val = toggleHud.checked;
    chrome.storage.local.set({ zip_hud_visible: val });
    if (activeTab) {
      sendMessageToTab(activeTab.id, { action: 'SET_SETTINGS', hudVisible: val }).catch(() => {});
    }
  });

  // Footer Navigation links
  linkPlayground.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('playground.html') });
  });

  linkOpenGame.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://www.linkedin.com/games/zip/' });
  });
});
