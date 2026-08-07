/* ==========================================================================
   YEZZI JIGSAW PUZZLE ENGINE - BEZIER TABS, CANVAS RENDERER & INTERACTION
   ========================================================================== */

class JigsawEngine {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    this.image = null;
    this.rows = 5;
    this.cols = 7;
    this.pieces = [];
    this.groups = {};
    
    this.boardWidth = 0;
    this.boardHeight = 0;
    this.boardX = 0;
    this.boardY = 0;
    
    this.pieceWidth = 0;
    this.pieceHeight = 0;
    this.tabSize = 0;
    
    // Horizontal & Vertical edges tabs definitions
    // hTabs[row][col]: top edge tab for cell (row, col)
    // vTabs[row][col]: left edge tab for cell (row, col)
    this.hTabs = [];
    this.vTabs = [];
    
    // Workspace transform (Pan & Zoom)
    this.scale = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.isPanning = false;
    this.panStartX = 0;
    this.panStartY = 0;
    
    // Dragging state
    this.activeGroup = null;
    this.dragOffset = { x: 0, y: 0 };
    
    // Toggles & Settings
    this.showGhost = true;
    this.showEdgeOnly = false;
    this.snapThreshold = 25; // pixels
    
    // Callbacks
    this.onPiecePlaced = options.onPiecePlaced || (() => {});
    this.onPuzzleComplete = options.onPuzzleComplete || (() => {});
    this.onMoveCount = options.onMoveCount || (() => {});
    
    this.moves = 0;
    this.placedCount = 0;
    this.isComplete = false;
    
    this.initEvents();
  }

  // Set up the puzzle grid and pre-render pieces
  loadPuzzle(imageElement, rows, cols) {
    this.image = imageElement;
    this.rows = rows;
    this.cols = cols;
    this.pieces = [];
    this.groups = {};
    this.moves = 0;
    this.placedCount = 0;
    this.isComplete = false;
    this.scale = 1.0;
    
    this.resizeCanvas();
    this.calculateDimensions();
    this.generateTabStructure();
    this.createPieces();
    this.scatterUnplacedPieces();
    this.render();
  }

  resizeCanvas() {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    this.canvas.width = parent.clientWidth;
    this.canvas.height = parent.clientHeight;
  }

  calculateDimensions() {
    const margin = 80;
    const maxW = Math.max(300, this.canvas.width - margin * 2);
    const maxH = Math.max(200, this.canvas.height - margin * 2);
    
    const imgAspect = this.image.width / this.image.height;
    
    if (maxW / maxH > imgAspect) {
      this.boardHeight = maxH;
      this.boardWidth = maxH * imgAspect;
    } else {
      this.boardWidth = maxW;
      this.boardHeight = maxW / imgAspect;
    }
    
    // Center the target board on screen
    this.boardX = (this.canvas.width - this.boardWidth) / 2;
    this.boardY = (this.canvas.height - this.boardHeight) / 2;
    
    this.pieceWidth = this.boardWidth / this.cols;
    this.pieceHeight = this.boardHeight / this.rows;
    this.tabSize = Math.min(this.pieceWidth, this.pieceHeight) * 0.22;
  }

  generateTabStructure() {
    // Horizontal interior borders (rows - 1, cols)
    this.hTabs = Array.from({ length: this.rows + 1 }, () => []);
    for (let r = 0; r <= this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (r === 0 || r === this.rows) {
          this.hTabs[r][c] = 0; // Flat outer edge
        } else {
          this.hTabs[r][c] = Math.random() < 0.5 ? 1 : -1;
        }
      }
    }

    // Vertical interior borders (rows, cols - 1)
    this.vTabs = Array.from({ length: this.rows }, () => []);
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c <= this.cols; c++) {
        if (c === 0 || c === this.cols) {
          this.vTabs[r][c] = 0; // Flat outer edge
        } else {
          this.vTabs[r][c] = Math.random() < 0.5 ? 1 : -1;
        }
      }
    }
  }

  createPieces() {
    let idCounter = 0;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const id = idCounter++;
        const correctX = this.boardX + c * this.pieceWidth;
        const correctY = this.boardY + r * this.pieceHeight;
        
        const topTab = this.hTabs[r][c];
        const rightTab = this.vTabs[r][c + 1];
        const bottomTab = -this.hTabs[r + 1][c];
        const leftTab = -this.vTabs[r][c];
        
        const isEdge = (r === 0 || r === this.rows - 1 || c === 0 || c === this.cols - 1);
        
        // Pre-render piece texture canvas
        const pieceCanvas = this.renderPieceOffscreen(r, c, topTab, rightTab, bottomTab, leftTab);
        
        const piece = {
          id,
          row: r,
          col: c,
          x: correctX,
          y: correctY,
          correctX,
          correctY,
          width: this.pieceWidth,
          height: this.pieceHeight,
          topTab,
          rightTab,
          bottomTab,
          leftTab,
          isEdge,
          isPlaced: false,
          inTray: true, // Pieces start inside the Piece Box
          groupId: id,
          offscreen: pieceCanvas
        };
        
        this.pieces.push(piece);
        this.groups[id] = [piece];
      }
    }
  }

  // Render smooth interlocking tab path using Cubic Bezier curves
  drawPiecePath(ctx, w, h, topTab, rightTab, bottomTab, leftTab, pad) {
    const tabSize = this.tabSize;
    ctx.beginPath();
    
    // Top Edge (from top-left to top-right)
    ctx.moveTo(pad, pad);
    this.drawEdgeTab(ctx, pad, pad, pad + w, pad, topTab, tabSize, false);
    
    // Right Edge (from top-right to bottom-right)
    this.drawEdgeTab(ctx, pad + w, pad, pad + w, pad + h, rightTab, tabSize, false);
    
    // Bottom Edge (from bottom-right to bottom-left)
    this.drawEdgeTab(ctx, pad + w, pad + h, pad, pad + h, bottomTab, tabSize, false);
    
    // Left Edge (from bottom-left to top-left)
    this.drawEdgeTab(ctx, pad, pad + h, pad, pad, leftTab, tabSize, false);
    
    ctx.closePath();
  }

  drawEdgeTab(ctx, x1, y1, x2, y2, tabSign, tabSize) {
    if (tabSign === 0) {
      ctx.lineTo(x2, y2);
      return;
    }

    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    const ux = dx / len;
    const uy = dy / len;
    const nx = -uy * tabSign; // Normal vector pointing outward/inward based on tabSign
    const ny = ux * tabSign;

    // Bezier control points along segment
    const p = (frac, norm) => ({
      x: x1 + ux * len * frac + nx * tabSize * norm,
      y: y1 + uy * len * frac + ny * tabSize * norm
    });

    const cp1 = p(0.35, 0);
    const cp2 = p(0.38, 0.2);
    const cp3 = p(0.40, 0.95);
    const topCenter = p(0.50, 1.1);
    const cp4 = p(0.60, 0.95);
    const cp5 = p(0.62, 0.2);
    const cp6 = p(0.65, 0);
    const endP = p(1.0, 0);

    ctx.lineTo(cp1.x, cp1.y);
    ctx.bezierCurveTo(cp2.x, cp2.y, cp3.x, cp3.y, topCenter.x, topCenter.y);
    ctx.bezierCurveTo(cp4.x, cp4.y, cp5.x, cp5.y, cp6.x, cp6.y);
    ctx.lineTo(endP.x, endP.y);
  }

  renderPieceOffscreen(r, c, topTab, rightTab, bottomTab, leftTab) {
    const pad = this.tabSize * 1.5;
    const offWidth = this.pieceWidth + pad * 2;
    const offHeight = this.pieceHeight + pad * 2;
    
    const offCanvas = document.createElement('canvas');
    offCanvas.width = offWidth;
    offCanvas.height = offHeight;
    const octx = offCanvas.getContext('2d');

    // 1. Clip piece path
    octx.save();
    this.drawPiecePath(octx, this.pieceWidth, this.pieceHeight, topTab, rightTab, bottomTab, leftTab, pad);
    octx.clip();

    // 2. Draw source image portion
    const srcX = (c * this.image.width) / this.cols;
    const srcY = (r * this.image.height) / this.rows;
    const srcW = this.image.width / this.cols;
    const srcH = this.image.height / this.rows;
    
    const srcPadX = (srcW * pad) / this.pieceWidth;
    const srcPadY = (srcH * pad) / this.pieceHeight;

    octx.drawImage(
      this.image,
      srcX - srcPadX, srcY - srcPadY, srcW + srcPadX * 2, srcH + srcPadY * 2,
      0, 0, offWidth, offHeight
    );
    octx.restore();

    // 3. Draw tactile edge bevel and highlight
    octx.save();
    this.drawPiecePath(octx, this.pieceWidth, this.pieceHeight, topTab, rightTab, bottomTab, leftTab, pad);
    
    // Outer shadow outline
    octx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
    octx.lineWidth = 2.5;
    octx.stroke();

    // Top-left highlight
    octx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    octx.lineWidth = 1.2;
    octx.stroke();
    octx.restore();

    return offCanvas;
  }

  loadPuzzle(imageElement, rows, cols) {
    this.image = imageElement;
    this.rows = rows;
    this.cols = cols;
    this.pieces = [];
    this.groups = {};
    this.moves = 0;
    this.placedCount = 0;
    this.isComplete = false;
    this.scale = 1.0;
    
    this.resizeCanvas();
    this.calculateDimensions();
    this.generateTabStructure();
    this.createPieces();
    this.shuffleTray();
    this.render();
  }

  shuffleTray() {
    // Fisher-Yates shuffle piece tray order
    this.trayOrder = this.pieces.map(p => p.id);
    for (let i = this.trayOrder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.trayOrder[i], this.trayOrder[j]] = [this.trayOrder[j], this.trayOrder[i]];
    }
    this.populateTrayUI();
  }

  scatterUnplacedPieces() {
    // Legacy scatter - keeping all unplaced inside the Box by default
    this.pieces.forEach(p => {
      p.inTray = true;
      p.isPlaced = false;
    });
    this.shuffleTray();
  }

  // Populate Desktop and Mobile Piece Box UI elements
  populateTrayUI() {
    const desktopTray = document.getElementById('desktop-tray-scroll');
    const mobileTray = document.getElementById('mobile-tray-content');

    if (desktopTray) desktopTray.innerHTML = '';
    if (mobileTray) mobileTray.innerHTML = '';

    // Get unplaced pieces in the Box
    let trayPieces = this.pieces.filter(p => !p.isPlaced && p.inTray);
    
    // Sort according to shuffled trayOrder
    if (this.trayOrder) {
      trayPieces.sort((a, b) => this.trayOrder.indexOf(a.id) - this.trayOrder.indexOf(b.id));
    }
    
    if (trayPieces.length === 0) {
      const emptyMsg = '<p style="font-size: 0.85rem; color: var(--text-muted); text-align: center; width: 100%; padding: 1rem;">All pieces taken out!</p>';
      if (desktopTray) desktopTray.innerHTML = emptyMsg;
      if (mobileTray) mobileTray.innerHTML = emptyMsg;
      return;
    }

    trayPieces.forEach(p => {
      if (this.showEdgeOnly && !p.isEdge) return;

      // Create item container
      const item = document.createElement('div');
      item.className = 'tray-piece-item';
      item.dataset.id = p.id;
      item.style.cssText = 'width: 70px; height: 70px; position: relative; cursor: grab; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.04); border: 1px solid var(--border-glass); border-radius: 8px; flex-shrink: 0; padding: 4px; transition: transform 0.2s ease;';

      // Create scaled thumbnail canvas
      const thumbCanvas = document.createElement('canvas');
      thumbCanvas.width = 60;
      thumbCanvas.height = 60;
      const tctx = thumbCanvas.getContext('2d');

      const maxDim = Math.max(p.offscreen.width, p.offscreen.height);
      const scale = 54 / maxDim;
      const drawW = p.offscreen.width * scale;
      const drawH = p.offscreen.height * scale;

      tctx.drawImage(p.offscreen, (60 - drawW) / 2, (60 - drawH) / 2, drawW, drawH);
      item.appendChild(thumbCanvas);

      // Event listener to pick up piece ONLY when user drags it out of the Box
      let startX = 0;
      let startY = 0;
      let isPendingDrag = false;

      const handlePointerDown = (e) => {
        e.preventDefault();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        startX = clientX;
        startY = clientY;
        isPendingDrag = true;

        const handlePointerMove = (moveEvt) => {
          if (!isPendingDrag) return;
          const currX = moveEvt.touches ? moveEvt.touches[0].clientX : moveEvt.clientX;
          const currY = moveEvt.touches ? moveEvt.touches[0].clientY : moveEvt.clientY;
          const dist = Math.hypot(currX - startX, currY - startY);

          // Only take piece out of Box when user physically drags out by more than 8 pixels
          if (dist > 8) {
            isPendingDrag = false;
            p.inTray = false;

            const worldPos = this.screenToWorld(currX, currY);
            p.x = worldPos.x - p.width / 2;
            p.y = worldPos.y - p.height / 2;
            
            this.activeGroup = p.groupId;
            this.dragOffset = { x: p.width / 2, y: p.height / 2 };

            if (window.soundEngine) window.soundEngine.playPickup();
            
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
            
            this.populateTrayUI();
            this.render();
          }
        };

        const handlePointerUp = () => {
          isPendingDrag = false;
          window.removeEventListener('pointermove', handlePointerMove);
          window.removeEventListener('pointerup', handlePointerUp);
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
      };

      item.addEventListener('pointerdown', handlePointerDown);
      if (desktopTray) desktopTray.appendChild(item);
      if (mobileTray) mobileTray.appendChild(item.cloneNode(true));
    });

    // Re-bind drag events on cloned mobile items
    if (mobileTray) {
      const mobileItems = mobileTray.querySelectorAll('.tray-piece-item');
      mobileItems.forEach(item => {
        const pId = parseInt(item.dataset.id, 10);
        const p = this.pieces.find(pc => pc.id === pId);
        if (!p) return;

        let startX = 0;
        let startY = 0;
        let isPendingDrag = false;

        item.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          const clientX = e.touches ? e.touches[0].clientX : e.clientX;
          const clientY = e.touches ? e.touches[0].clientY : e.clientY;
          startX = clientX;
          startY = clientY;
          isPendingDrag = true;

          const handlePointerMove = (moveEvt) => {
            if (!isPendingDrag) return;
            const currX = moveEvt.touches ? moveEvt.touches[0].clientX : moveEvt.clientX;
            const currY = moveEvt.touches ? moveEvt.touches[0].clientY : moveEvt.clientY;
            const dist = Math.hypot(currX - startX, currY - startY);

            if (dist > 8) {
              isPendingDrag = false;
              p.inTray = false;

              const worldPos = this.screenToWorld(currX, currY);
              p.x = worldPos.x - p.width / 2;
              p.y = worldPos.y - p.height / 2;
              
              this.activeGroup = p.groupId;
              this.dragOffset = { x: p.width / 2, y: p.height / 2 };

              if (window.soundEngine) window.soundEngine.playPickup();
              
              window.removeEventListener('pointermove', handlePointerMove);
              window.removeEventListener('pointerup', handlePointerUp);
              
              this.populateTrayUI();
              this.render();
            }
          };

          const handlePointerUp = () => {
            isPendingDrag = false;
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
          };

          window.addEventListener('pointermove', handlePointerMove);
          window.addEventListener('pointerup', handlePointerUp);
        });
      });
    }
  }

  render() {
    this.ctx.save();
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Apply Workspace Pan & Zoom Transform
    this.ctx.translate(this.panX, this.panY);
    this.ctx.scale(this.scale, this.scale);

    // 1. Draw Target Board Frame
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(this.boardX, this.boardY, this.boardWidth, this.boardHeight);
    
    // Board Grid lines (subtle)
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    this.ctx.lineWidth = 1;
    for (let r = 1; r < this.rows; r++) {
      this.ctx.beginPath();
      this.ctx.moveTo(this.boardX, this.boardY + r * this.pieceHeight);
      this.ctx.lineTo(this.boardX + this.boardWidth, this.boardY + r * this.pieceHeight);
      this.ctx.stroke();
    }
    for (let c = 1; c < this.cols; c++) {
      this.ctx.beginPath();
      this.ctx.moveTo(this.boardX + c * this.pieceWidth, this.boardY);
      this.ctx.lineTo(this.boardX + c * this.pieceWidth, this.boardY + this.boardHeight);
      this.ctx.stroke();
    }

    // 2. Draw Ghost Reference Overlay
    if (this.showGhost) {
      this.ctx.globalAlpha = 0.18;
      this.ctx.drawImage(this.image, this.boardX, this.boardY, this.boardWidth, this.boardHeight);
      this.ctx.globalAlpha = 1.0;
    }

    // 3. Render Placed Pieces
    const pad = this.tabSize * 1.5;
    this.pieces.filter(p => p.isPlaced).forEach(p => {
      this.ctx.drawImage(p.offscreen, p.x - pad, p.y - pad);
    });

    // 4. Render Pieces on Canvas (Only those taken out of the Piece Box)
    const activeUnplaced = this.pieces.filter(p => !p.isPlaced && !p.inTray);
    
    activeUnplaced.forEach(p => {
      if (this.showEdgeOnly && !p.isEdge) return;
      if (this.activeGroup !== null && p.groupId === this.activeGroup) return; // Draw active group last
      
      // Piece drop shadow
      this.ctx.save();
      this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      this.ctx.shadowBlur = 12;
      this.ctx.shadowOffsetX = 4;
      this.ctx.shadowOffsetY = 6;
      this.ctx.drawImage(p.offscreen, p.x - pad, p.y - pad);
      this.ctx.restore();
    });

    // Draw Active Dragging Group
    if (this.activeGroup !== null && this.groups[this.activeGroup]) {
      this.groups[this.activeGroup].forEach(p => {
        this.ctx.save();
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        this.ctx.shadowBlur = 20;
        this.ctx.shadowOffsetX = 8;
        this.ctx.shadowOffsetY = 12;
        this.ctx.drawImage(p.offscreen, p.x - pad, p.y - pad);
        this.ctx.restore();
      });
    }

    this.ctx.restore();
  }

  // Convert Screen Coordinates (Mouse/Touch) to Canvas Workspace World Coordinates
  screenToWorld(screenX, screenY) {
    const rect = this.canvas.getBoundingClientRect();
    const x = (screenX - rect.left - this.panX) / this.scale;
    const y = (screenY - rect.top - this.panY) / this.scale;
    return { x, y };
  }

  // Pointer Event Listeners (Unified Mouse & Touch)
  initEvents() {
    const c = this.canvas;

    const getPos = (e) => {
      if (e.touches && e.touches.length > 0) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
      return { x: e.clientX, y: e.clientY };
    };

    c.addEventListener('pointerdown', (e) => {
      if (e.button === 1 || e.shiftKey) { // Middle click or Shift-click for Pan
        this.isPanning = true;
        this.panStartX = e.clientX - this.panX;
        this.panStartY = e.clientY - this.panY;
        return;
      }

      const { x, y } = this.screenToWorld(e.clientX, e.clientY);
      const pad = this.tabSize * 1.5;

      // Find top-most hit piece on the board (MUST NOT hit pieces that are still inside the Box!)
      const hitPiece = [...this.pieces].reverse().find(p => {
        if (p.isPlaced || p.inTray) return false; // Exclude placed pieces AND pieces in the Box
        if (this.showEdgeOnly && !p.isEdge) return false;
        return x >= p.x - pad && x <= p.x + p.width + pad &&
               y >= p.y - pad && y <= p.y + p.height + pad;
      });

      if (hitPiece) {
        this.activeGroup = hitPiece.groupId;
        this.dragOffset = { x: x - hitPiece.x, y: y - hitPiece.y };
        if (window.soundEngine) window.soundEngine.playPickup();
        this.render();
      } else {
        // Start background pan if clicked on empty canvas
        this.isPanning = true;
        this.panStartX = e.clientX - this.panX;
        this.panStartY = e.clientY - this.panY;
      }
    });

    c.addEventListener('pointermove', (e) => {
      if (this.isPanning) {
        this.panX = e.clientX - this.panStartX;
        this.panY = e.clientY - this.panStartY;
        this.render();
        return;
      }

      if (this.activeGroup !== null && this.groups[this.activeGroup]) {
        const { x, y } = this.screenToWorld(e.clientX, e.clientY);
        const primary = this.groups[this.activeGroup][0];
        const dx = (x - this.dragOffset.x) - primary.x;
        const dy = (y - this.dragOffset.y) - primary.y;

        // Move all pieces in group together
        this.groups[this.activeGroup].forEach(p => {
          p.x += dx;
          p.y += dy;
        });

        this.render();
      }
    });

    const handlePointerUp = () => {
      if (this.isPanning) {
        this.isPanning = false;
      }

      if (this.activeGroup !== null) {
        this.moves++;
        this.onMoveCount(this.moves);
        this.checkSnaps(this.activeGroup);
        this.activeGroup = null;
        if (window.soundEngine) window.soundEngine.playDrop();
        this.render();
      }
    };

    c.addEventListener('pointerup', handlePointerUp);
    c.addEventListener('pointercancel', handlePointerUp);

      // Double click to return loose canvas piece back into the Piece Box
      c.addEventListener('dblclick', (e) => {
        const { x, y } = this.screenToWorld(e.clientX, e.clientY);
        const pad = this.tabSize * 1.5;

        const hitPiece = [...this.pieces].reverse().find(p => {
          if (p.isPlaced || p.inTray) return false;
          return x >= p.x - pad && x <= p.x + p.width + pad &&
                 y >= p.y - pad && y <= p.y + p.height + pad;
        });

        if (hitPiece && this.groups[hitPiece.groupId]) {
          this.groups[hitPiece.groupId].forEach(p => {
            p.inTray = true;
          });
          if (window.soundEngine) window.soundEngine.playDrop();
          this.populateTrayUI();
          this.render();
        }
      });

    // Zoom on wheel
    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      const newScale = Math.min(Math.max(0.5, this.scale * zoomFactor), 2.5);
      
      const rect = c.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      this.panX = mouseX - (mouseX - this.panX) * (newScale / this.scale);
      this.panY = mouseY - (mouseY - this.panY) * (newScale / this.scale);
      this.scale = newScale;
      this.render();
    }, { passive: false });
  }

  checkSnaps(groupId) {
    const group = this.groups[groupId];
    if (!group || group.length === 0) return;

    const primary = group[0];

    // 1. Check Board Target Position Snap
    const distToTarget = Math.hypot(primary.x - primary.correctX, primary.y - primary.correctY);
    if (distToTarget < this.snapThreshold) {
      // Snap entire group into place on board!
      const dx = primary.correctX - primary.x;
      const dy = primary.correctY - primary.y;

      group.forEach(p => {
        p.x += dx;
        p.y += dy;
        p.isPlaced = true;
        p.inTray = false;
        this.placedCount++;
        this.onPiecePlaced(p);
      });

      if (window.soundEngine) window.soundEngine.playSnap();
      this.populateTrayUI();

      // Check for victory
      if (this.placedCount === this.pieces.length) {
        this.isComplete = true;
        if (window.soundEngine) window.soundEngine.playVictory();
        this.onPuzzleComplete();
      }
      return;
    }

    // 2. Check Piece-to-Piece Subassembly Snap with other unplaced groups
    for (const pA of group) {
      for (const pB of this.pieces) {
        if (pB.isPlaced || pB.groupId === groupId) continue;

        // Check if pA and pB are adjacent grid neighbors
        const isNeighbor = Math.abs(pA.row - pB.row) + Math.abs(pA.col - pB.col) === 1;
        if (isNeighbor) {
          const expectedDx = pA.correctX - pB.correctX;
          const expectedDy = pA.correctY - pB.correctY;
          const actualDx = pA.x - pB.x;
          const actualDy = pA.y - pB.y;

          const error = Math.hypot(actualDx - expectedDx, actualDy - expectedDy);
          if (error < this.snapThreshold) {
            // Snap group A to align with group B!
            const snapDx = (pB.x + expectedDx) - pA.x;
            const snapDy = (pB.y + expectedDy) - pA.y;

            group.forEach(p => {
              p.x += snapDx;
              p.y += snapDy;
            });

            // Merge group A into group B
            const targetGroupId = pB.groupId;
            group.forEach(p => {
              p.groupId = targetGroupId;
            });
            this.groups[targetGroupId].push(...group);
            delete this.groups[groupId];

            if (window.soundEngine) window.soundEngine.playSnap();
            return;
          }
        }
      }
    }
  }

  returnAllToTray() {
    this.pieces.forEach(p => {
      if (!p.isPlaced) {
        p.inTray = true;
      }
    });
    this.populateTrayUI();
    this.render();
  }

  // Hint feature: Highlights one unplaced piece from the Box and places it near target
  giveHint() {
    const unplaced = this.pieces.filter(p => !p.isPlaced);
    if (unplaced.length === 0) return;

    const p = unplaced[Math.floor(Math.random() * unplaced.length)];
    p.inTray = false;
    p.x = p.correctX + (Math.random() * 40 - 20);
    p.y = p.correctY + (Math.random() * 40 - 20);

    if (window.soundEngine) window.soundEngine.playHint();
    this.populateTrayUI();
    this.render();
  }
}

window.JigsawEngine = JigsawEngine;
