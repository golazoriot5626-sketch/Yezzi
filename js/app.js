/* ==========================================================================
   YEZZI JIGSAW PUZZLE GAME - MAIN APPLICATION CONTROLLER
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const screens = {
    intro: document.getElementById('screen-intro'),
    campaign: document.getElementById('screen-campaign'),
    custom: document.getElementById('screen-custom'),
    game: document.getElementById('screen-game')
  };

  const modals = {
    difficulty: document.getElementById('modal-difficulty'),
    victory: document.getElementById('modal-victory'),
    howToPlay: document.getElementById('modal-how-to-play')
  };

  // State Variables
  let selectedImageObj = null;
  let customImageSrc = null;
  let currentDifficulty = { name: 'Easy', rows: 5, cols: 7, count: 35 };
  let jigsawEngine = null;
  
  let gameTimer = null;
  let secondsElapsed = 0;
  let isPaused = false;

  // Initialize App
  initNavigation();
  initCampaignGallery();
  initCustomUpload();
  initDifficultyModal();
  initGameControls();
  initConfettiCanvas();

  // Screen Switching Function
  function showScreen(screenId) {
    Object.keys(screens).forEach(key => {
      if (key === screenId) {
        screens[key].classList.add('active');
      } else {
        screens[key].classList.remove('active');
      }
    });
  }

  function showModal(modalElement) {
    modalElement.classList.add('active');
  }

  function hideModal(modalElement) {
    modalElement.classList.remove('active');
  }

  // 1. Navigation & Intro Screen Handlers
  function initNavigation() {
    // Mode Card Clicks
    document.getElementById('btn-mode-campaign').addEventListener('click', () => {
      if (window.soundEngine) window.soundEngine.playClick();
      showScreen('campaign');
    });

    document.getElementById('btn-mode-custom').addEventListener('click', () => {
      if (window.soundEngine) window.soundEngine.playClick();
      showScreen('custom');
    });

    // Back Buttons
    document.querySelectorAll('.btn-back').forEach(btn => {
      btn.addEventListener('click', () => {
        if (window.soundEngine) window.soundEngine.playClick();
        stopTimer();
        showScreen('intro');
      });
    });

    // Sound Toggle Button
    const btnSound = document.getElementById('btn-toggle-sound');
    btnSound.addEventListener('click', () => {
      const isEnabled = window.soundEngine.toggleSound();
      btnSound.innerHTML = isEnabled ? '🔊 Sound On' : '🔇 Muted';
      btnSound.classList.toggle('active', isEnabled);
    });

    // How to Play Modal
    document.getElementById('btn-how-to-play').addEventListener('click', () => {
      showModal(modals.howToPlay);
    });
    document.getElementById('btn-close-how-to-play').addEventListener('click', () => {
      hideModal(modals.howToPlay);
    });
  }

  // 2. Campaign Gallery Generation
  function initCampaignGallery() {
    const galleryGrid = document.getElementById('campaign-gallery-grid');
    galleryGrid.innerHTML = '';

    CAMPAIGN_IMAGES.forEach(item => {
      const card = document.createElement('div');
      card.className = 'puzzle-card';
      
      const isCompleted = localStorage.getItem(`yezzi_completed_${item.id}`);

      card.innerHTML = `
        <div class="puzzle-thumb-box">
          <img src="${item.url}" alt="${item.title}" onerror="this.src='${generateFallbackCanvas(item.fallbackStyle, 400, 260)}'">
          ${isCompleted ? '<div class="badge badge-easy" style="position:absolute; top:10px; right:10px;">✓ COMPLETED</div>' : ''}
        </div>
        <div class="puzzle-card-info">
          <h4>${item.title}</h4>
          <div class="puzzle-card-meta">
            <span>Category: ${item.category}</span>
            <span class="badge">${item.fallbackStyle}</span>
          </div>
        </div>
      `;

      card.addEventListener('click', () => {
        if (window.soundEngine) window.soundEngine.playClick();
        selectedImageObj = item;
        customImageSrc = null;
        showModal(modals.difficulty);
      });

      galleryGrid.appendChild(card);
    });
  }

  // 3. Custom Upload Dropzone
  function initCustomUpload() {
    const dropzone = document.getElementById('custom-dropzone');
    const fileInput = document.getElementById('custom-file-input');
    const previewArea = document.getElementById('custom-preview-area');
    const previewImg = document.getElementById('custom-preview-img');
    const btnStartCustom = document.getElementById('btn-start-custom');

    dropzone.addEventListener('click', () => fileInput.click());

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileSelect(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleFileSelect(e.target.files[0]);
      }
    });

    function handleFileSelect(file) {
      if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file!');
        return;
      }

      const reader = new FileReader();
      reader.onload = (evt) => {
        customImageSrc = evt.target.result;
        selectedImageObj = { id: 'custom_' + Date.now(), title: 'Custom Puzzle', url: customImageSrc };
        previewImg.src = customImageSrc;
        dropzone.style.display = 'none';
        previewArea.style.display = 'flex';
      };
      reader.readAsDataURL(file);
    }

    btnStartCustom.addEventListener('click', () => {
      if (window.soundEngine) window.soundEngine.playClick();
      showModal(modals.difficulty);
    });
  }

  // 4. Difficulty Selector Modal
  function initDifficultyModal() {
    const diffOptions = document.querySelectorAll('.diff-option');
    const btnStartPuzzle = document.getElementById('btn-start-puzzle');

    diffOptions.forEach(opt => {
      opt.addEventListener('click', () => {
        diffOptions.forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');

        const level = opt.getAttribute('data-level');
        if (level === 'easy') {
          currentDifficulty = { name: 'Easy', rows: 5, cols: 5, count: 25 };
        } else if (level === 'medium') {
          currentDifficulty = { name: 'Medium', rows: 6, cols: 10, count: 60 };
        } else if (level === 'hard') {
          currentDifficulty = { name: 'Hard', rows: 10, cols: 12, count: 120 };
        }
      });
    });

    document.getElementById('btn-close-difficulty').addEventListener('click', () => {
      hideModal(modals.difficulty);
    });

    btnStartPuzzle.addEventListener('click', () => {
      if (window.soundEngine) window.soundEngine.playClick();
      hideModal(modals.difficulty);
      startPuzzleGame();
    });
  }

  // 5. Start Game & Load Puzzle Engine
  function startPuzzleGame() {
    showScreen('game');
    
    // Set Header Details
    document.getElementById('game-puzzle-title').textContent = selectedImageObj.title;
    document.getElementById('game-diff-badge').textContent = currentDifficulty.name;

    // Set Ref Preview Image
    const refImg = document.getElementById('ref-preview-img');
    refImg.src = selectedImageObj.url;

    // Load Image Element into Engine
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = selectedImageObj.url;

    img.onload = () => {
      setupEngine(img);
    };

    img.onerror = () => {
      // Fallback if image CORS fails
      const fallbackSrc = generateFallbackCanvas(selectedImageObj.fallbackStyle || 'abstract', 1200, 800);
      const fallbackImg = new Image();
      fallbackImg.src = fallbackSrc;
      fallbackImg.onload = () => setupEngine(fallbackImg);
    };
  }

  function setupEngine(imgElement) {
    const canvas = document.getElementById('puzzle-board-canvas');
    
    jigsawEngine = new JigsawEngine(canvas, {
      onPiecePlaced: (p) => {
        // Track piece placement internally
      },
      onPuzzleComplete: () => {
        stopTimer();
        if (selectedImageObj && selectedImageObj.id) {
          localStorage.setItem(`yezzi_completed_${selectedImageObj.id}`, 'true');
        }
        showVictoryModal();
      }
    });

    jigsawEngine.loadPuzzle(imgElement, currentDifficulty.rows, currentDifficulty.cols);
    startTimer();
    
    // Handle Window Resize
    window.addEventListener('resize', () => {
      if (jigsawEngine) {
        jigsawEngine.resizeCanvas();
        jigsawEngine.render();
      }
    });
  }

  // 6. Game Controls & Mobile Drawer
  function initGameControls() {
    // Ghost Overlay Toggle
    const btnGhost = document.getElementById('btn-toggle-ghost');
    btnGhost.addEventListener('click', () => {
      if (!jigsawEngine) return;
      jigsawEngine.showGhost = !jigsawEngine.showGhost;
      btnGhost.classList.toggle('active', jigsawEngine.showGhost);
      jigsawEngine.render();
    });

    // Shuffle Tray Button
    const btnShuffle = document.getElementById('btn-tray-shuffle');
    if (btnShuffle) {
      btnShuffle.addEventListener('click', () => {
        if (jigsawEngine) jigsawEngine.shuffleTray();
      });
    }

    // Edge Only Filter Toggle
    const btnEdge = document.getElementById('btn-toggle-edge');
    btnEdge.addEventListener('click', () => {
      if (!jigsawEngine) return;
      jigsawEngine.showEdgeOnly = !jigsawEngine.showEdgeOnly;
      btnEdge.classList.toggle('active', jigsawEngine.showEdgeOnly);
      jigsawEngine.populateTrayUI();
      jigsawEngine.render();
    });

    // Hint Button
    document.getElementById('btn-hint').addEventListener('click', () => {
      if (jigsawEngine) jigsawEngine.giveHint();
    });

    // Reference Image Popover Toggle
    const refPopover = document.getElementById('ref-preview-popover');
    document.getElementById('btn-toggle-ref').addEventListener('click', () => {
      refPopover.classList.toggle('active');
    });
    document.getElementById('btn-close-ref').addEventListener('click', () => {
      refPopover.classList.remove('active');
    });

    // Zoom Buttons
    document.getElementById('btn-zoom-in').addEventListener('click', () => {
      if (!jigsawEngine) return;
      jigsawEngine.scale = Math.min(2.5, jigsawEngine.scale * 1.15);
      jigsawEngine.render();
    });

    document.getElementById('btn-zoom-out').addEventListener('click', () => {
      if (!jigsawEngine) return;
      jigsawEngine.scale = Math.max(0.5, jigsawEngine.scale * 0.85);
      jigsawEngine.render();
    });

    document.getElementById('btn-zoom-reset').addEventListener('click', () => {
      if (!jigsawEngine) return;
      jigsawEngine.scale = 1.0;
      jigsawEngine.panX = 0;
      jigsawEngine.panY = 0;
      jigsawEngine.render();
    });

    // Mobile Drawer Tray Toggle
    const drawer = document.getElementById('mobile-tray-drawer');
    const handle = document.getElementById('mobile-drawer-handle');
    if (handle && drawer) {
      handle.addEventListener('click', () => {
        drawer.classList.toggle('expanded');
      });
    }
  }

  // 7. Timer Mechanics
  function startTimer() {
    stopTimer();
    secondsElapsed = 0;
    document.getElementById('stat-timer').textContent = '00:00';
    gameTimer = setInterval(() => {
      if (!isPaused) {
        secondsElapsed++;
        const mins = String(Math.floor(secondsElapsed / 60)).padStart(2, '0');
        const secs = String(secondsElapsed % 60).padStart(2, '0');
        document.getElementById('stat-timer').textContent = `${mins}:${secs}`;
      }
    }, 1000);
  }

  function stopTimer() {
    if (gameTimer) clearInterval(gameTimer);
  }

  // 8. Victory Celebration & Confetti Canvas
  let confettiCtx = null;
  let particles = [];

  function initConfettiCanvas() {
    const canvas = document.getElementById('confetti-canvas');
    if (canvas) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      confettiCtx = canvas.getContext('2d');
    }
  }

  function showVictoryModal() {
    document.getElementById('victory-final-time').textContent = document.getElementById('stat-timer').textContent;
    showModal(modals.victory);
    launchConfetti();
  }

  function launchConfetti() {
    particles = [];
    for (let i = 0; i < 120; i++) {
      particles.push({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
        vx: (Math.random() - 0.5) * 16,
        vy: (Math.random() - 0.8) * 16,
        color: ['#ffb703', '#7b2cbf', '#00f5d4', '#ef4444', '#3b82f6'][Math.floor(Math.random() * 5)],
        size: Math.random() * 8 + 4,
        rotation: Math.random() * 360,
        rSpeed: (Math.random() - 0.5) * 10
      });
    }
    animateConfetti();
  }

  function animateConfetti() {
    if (!confettiCtx) return;
    confettiCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    let alive = false;
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.3; // Gravity
      p.rotation += p.rSpeed;

      if (p.y < window.innerHeight) alive = true;

      confettiCtx.save();
      confettiCtx.translate(p.x, p.y);
      confettiCtx.rotate((p.rotation * Math.PI) / 180);
      confettiCtx.fillStyle = p.color;
      confettiCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      confettiCtx.restore();
    });

    if (alive) {
      requestAnimationFrame(animateConfetti);
    }
  }

  // Victory Modal Actions
  document.getElementById('btn-victory-replay').addEventListener('click', () => {
    hideModal(modals.victory);
    startPuzzleGame();
  });

  document.getElementById('btn-victory-next').addEventListener('click', () => {
    hideModal(modals.victory);
    initCampaignGallery(); // Refresh completed badges
    showScreen('campaign');
  });
});
