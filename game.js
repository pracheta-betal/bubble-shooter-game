// Bubble Shooter - Vanilla JS Canvas
// Single-player, top-attached grid, local physics for popping clusters
(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const scoreEl = document.getElementById("score");
  const livesEl = document.getElementById("lives");
  const restartBtn = document.getElementById("restartBtn");
  const scoresList = document.getElementById("scoresList");
  const modal = document.getElementById("submitScoreModal");
  const playerNameInput = document.getElementById("playerName");
  const submitScoreBtn = document.getElementById("submitScoreBtn");
  const closeModalBtn = document.getElementById("closeModalBtn");

  const WIDTH = canvas.width;
  const HEIGHT = canvas.height;

  const COLORS = ["#f94144", "#f3722c", "#f9c74f", "#90be6d", "#577590", "#9b5de5"];
  const RADIUS = 18;
  const ROWS = 12; // rows in bubble grid
  const COLS = 11;
  const GRID_TOP = 40;
  const GRID_LEFT = (WIDTH - (COLS * RADIUS * 2 - RADIUS)) / 2;

  let grid = []; // 2D array rows x cols or null
  let shooter = null;
  let bubbles = []; // moving bubbles
  let nextBubble = null;
  let score = 0;
  let lives = 3;
  let mouseX = WIDTH / 2;
  let mouseY = HEIGHT - 100;
  let isGameOver = false;

  function cellToXY(row, col) {
    // offset grid (odd rows shifted right by radius)
    const offset = row % 2 ? RADIUS : 0;
    const x = GRID_LEFT + col * RADIUS * 2 + offset;
    const y = GRID_TOP + row * (RADIUS * Math.sqrt(3));
    return { x, y };
  }

  function xyToCell(x, y) {
    // very approximate mapping: find nearest cell by distance
    let best = null;
    let bestD = Infinity;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const { x: cx, y: cy } = cellToXY(r, c);
        const d = Math.hypot(cx - x, cy - y);
        if (d < bestD) {
          bestD = d;
          best = { r, c };
        }
      }
    }
    return best;
  }

  function initGrid() {
    grid = Array.from({ length: ROWS }, (_, r) =>
      Array.from({ length: COLS }, (_, c) => null)
    );
    // populate first few rows with random bubbles
    const initialRows = 6;
    for (let r = 0; r < initialRows; r++) {
      for (let c = 0; c < COLS; c++) {
        // For odd rows, last column may be invalid (optional)
        const color = COLORS[Math.floor(Math.random() * COLORS.length)];
        grid[r][c] = { color };
      }
    }
  }

  function resetGame() {
    initGrid();
    shooter = createShooter();
    bubbles = [];
    nextBubble = randomBubble();
    score = 0;
    lives = 3;
    isGameOver = false;
    updateUI();
    fetchTopScores();
  }

  function createShooter() {
    return {
      x: WIDTH / 2,
      y: HEIGHT - 40,
      angle: -Math.PI / 2,
      radius: RADIUS,
      canShoot: true
    };
  }

  function randomBubble() {
    return { color: COLORS[Math.floor(Math.random() * COLORS.length)] };
  }

  function drawBubble(x, y, color) {
    ctx.beginPath();
    ctx.arc(x, y, RADIUS - 1, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(x - RADIUS / 3, y - RADIUS / 3, 2, x, y, RADIUS);
    grad.addColorStop(0, lighten(color, 0.2));
    grad.addColorStop(1, color);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.stroke();
  }

  function lighten(hex, amt) {
    const col = hex.replace("#", "");
    const r = Math.min(255, parseInt(col.substring(0, 2), 16) + Math.floor(255 * amt));
    const g = Math.min(255, parseInt(col.substring(2, 4), 16) + Math.floor(255 * amt));
    const b = Math.min(255, parseInt(col.substring(4, 6), 16) + Math.floor(255 * amt));
    return `rgb(${r},${g},${b})`;
  }

  function drawGrid() {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = grid[r][c];
        if (cell) {
          const { x, y } = cellToXY(r, c);
          drawBubble(x, y, cell.color);
        }
      }
    }
  }

  function drawShooter() {
    // draw cannon base
    ctx.fillStyle = "#081220";
    ctx.fillRect(shooter.x - 28, shooter.y + 10, 56, 10);
    // draw barrel
    ctx.save();
    ctx.translate(shooter.x, shooter.y);
    ctx.rotate(shooter.angle);
    ctx.fillStyle = "#243b55";
    ctx.fillRect(-8, -8, 40, 16);
    ctx.restore();
    // current bubble
    drawBubble(shooter.x + Math.cos(shooter.angle) * 28, shooter.y + Math.sin(shooter.angle) * 28, nextBubble.color);
  }

  function updateUI() {
    scoreEl.textContent = score;
    livesEl.textContent = lives;
  }

  function shoot() {
    if (!shooter.canShoot || isGameOver) return;
    const speed = 8;
    const vx = Math.cos(shooter.angle) * speed;
    const vy = Math.sin(shooter.angle) * speed;
    const bubble = {
      x: shooter.x + Math.cos(shooter.angle) * 28,
      y: shooter.y + Math.sin(shooter.angle) * 28,
      vx,
      vy,
      color: nextBubble.color,
      radius: RADIUS
    };
    bubbles.push(bubble);
    nextBubble = randomBubble();
    shooter.canShoot = false;
    setTimeout(() => (shooter.canShoot = true), 120); // short cooldown
  }

  function simulate() {
    // move moving bubbles
    for (let b of bubbles) {
      b.x += b.vx;
      b.y += b.vy;
      // bounce off walls
      if (b.x - b.radius <= 0 && b.vx < 0) {
        b.vx *= -1;
        b.x = b.radius;
      } else if (b.x + b.radius >= WIDTH && b.vx > 0) {
        b.vx *= -1;
        b.x = WIDTH - b.radius;
      }
      // collision with top -> attach
      if (b.y - b.radius <= GRID_TOP) {
        attachBubbleToGrid(b);
        continue;
      }
      // collision with existing bubbles
      let collided = false;
      for (let r = 0; r < ROWS && !collided; r++) {
        for (let c = 0; c < COLS && !collided; c++) {
          const cell = grid[r][c];
          if (cell) {
            const { x: cx, y: cy } = cellToXY(r, c);
            const dist = Math.hypot(cx - b.x, cy - b.y);
            if (dist <= RADIUS * 2 - 2) {
              attachBubbleToGrid(b);
              collided = true;
            }
          }
        }
      }
    }
    // remove attached ones from moving list
    bubbles = bubbles.filter(b => b._attached !== true);
  }

  function attachBubbleToGrid(b) {
    // map x,y to nearest cell
    const { r, c } = xyToCell(b.x, b.y);
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) {
      // if out of bounds, clamp
      b._attached = true;
      return;
    }
    // find a free neighbor cell near the hit point (try nearby offsets)
    const candidates = [{ r, c }];
    const neigh = [
      [-1, 0], [-1, 1], [0, -1], [0, 1], [1, 0], [1, 1],
      [-1, -1], [1, -1]
    ];
    for (let [dr, dc] of neigh) candidates.push({ r: r + dr, c: c + dc });
    let placed = false;
    for (let cand of candidates) {
      if (cand.r >= 0 && cand.r < ROWS && cand.c >= 0 && cand.c < COLS && !grid[cand.r][cand.c]) {
        grid[cand.r][cand.c] = { color: b.color };
        placed = true;
        handlePostAttach(cand.r, cand.c);
        break;
      }
    }
    b._attached = true;
    if (!placed) {
      // couldn't place: lose a life
      lives--;
      if (lives <= 0) {
        endGame();
      }
      updateUI();
    }
  }

  function handlePostAttach(row, col) {
    // check cluster
    const targetColor = grid[row][col].color;
    const cluster = floodFill(row, col, targetColor);
    if (cluster.length >= 3) {
      // pop them
      for (let { r, c } of cluster) {
        grid[r][c] = null;
        score += 10;
      }
    }
    // check floating bubbles (not connected to top)
    const attachedMap = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
    const queue = [];
    // add all bubbles in top row to queue
    for (let c = 0; c < COLS; c++) {
      if (grid[0][c]) {
        attachedMap[0][c] = true;
        queue.push({ r: 0, c });
      }
    }
    while (queue.length) {
      const cur = queue.shift();
      for (let n of neighbors(cur.r, cur.c)) {
        if (n.r >= 0 && n.r < ROWS && n.c >= 0 && n.c < COLS) {
          if (!attachedMap[n.r][n.c] && grid[n.r][n.c]) {
            attachedMap[n.r][n.c] = true;
            queue.push(n);
          }
        }
      }
    }
    // any bubble not attached falls
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (grid[r][c] && !attachedMap[r][c]) {
          // drop it (just remove and award points)
          grid[r][c] = null;
          score += 5;
        }
      }
    }
    updateUI();
  }

  function floodFill(sr, sc, color) {
    const vis = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
    const res = [];
    const stack = [{ r: sr, c: sc }];
    while (stack.length) {
      const { r, c } = stack.pop();
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;
      if (vis[r][c]) continue;
      vis[r][c] = true;
      const cell = grid[r][c];
      if (!cell || cell.color !== color) continue;
      res.push({ r, c });
      for (let n of neighbors(r, c)) stack.push(n);
    }
    return res;
  }

  function neighbors(r, c) {
    // depends on row parity (pointy hex-ish)
    const even = r % 2 === 0;
    if (even) {
      return [
        { r: r, c: c - 1 },
        { r: r, c: c + 1 },
        { r: r - 1, c: c - 1 },
        { r: r - 1, c: c },
        { r: r + 1, c: c - 1 },
        { r: r + 1, c: c }
      ];
    } else {
      return [
        { r: r, c: c - 1 },
        { r: r, c: c + 1 },
        { r: r - 1, c: c },
        { r: r - 1, c: c + 1 },
        { r: r + 1, c: c },
        { r: r + 1, c: c + 1 }
      ];
    }
  }

  function render() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    drawGrid();
    // draw moving bubbles
    for (let b of bubbles) {
      drawBubble(b.x, b.y, b.color);
    }
    drawShooter();
    // HUD
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fillRect(0, 0, WIDTH, GRID_TOP - 4);
  }

  function loop() {
    if (!isGameOver) {
      // update aim
      shooter.angle = Math.atan2(mouseY - shooter.y, mouseX - shooter.x);
      // clamp angle to prevent shooting backward
      const min = -Math.PI + 0.3;
      const max = -0.3;
      shooter.angle = Math.max(min, Math.min(max, shooter.angle));
      simulate();
      render();
    } else {
      // show game over text
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = "#fff";
      ctx.font = "36px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Game Over", WIDTH / 2, HEIGHT / 2 - 20);
      ctx.font = "18px sans-serif";
      ctx.fillText(`Score: ${score}`, WIDTH / 2, HEIGHT / 2 + 12);
      ctx.restore();
    }
    requestAnimationFrame(loop);
  }

  function endGame() {
    isGameOver = true;
    // show modal to submit score
    setTimeout(() => {
      modal.classList.remove("hidden");
      playerNameInput.value = "";
    }, 300);
  }

  // input handlers
  canvas.addEventListener("mousemove", e => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
  });

  canvas.addEventListener("click", e => {
    shoot();
  });

  document.addEventListener("keydown", e => {
    if (e.code === "Space") shoot();
  });

  restartBtn.addEventListener("click", () => resetGame());

  submitScoreBtn.addEventListener("click", async () => {
    const name = (playerNameInput.value || "Anonymous").trim();
    await submitScore(name, score);
    modal.classList.add("hidden");
    fetchTopScores();
  });

  closeModalBtn.addEventListener("click", () => {
    modal.classList.add("hidden");
  });

  // Networking
  async function submitScore(name, sc) {
    try {
      await fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, score: sc })
      });
    } catch (err) {
      console.warn("failed to submit score", err);
    }
  }

  async function fetchTopScores() {
    try {
      const res = await fetch("/api/scores");
      const data = await res.json();
      if (data && data.scores) {
        scoresList.innerHTML = "";
        for (let s of data.scores) {
          const li = document.createElement("li");
          li.textContent = `${s.name} — ${s.score}`;
          scoresList.appendChild(li);
        }
      }
    } catch (err) {
      console.warn("failed to fetch scores", err);
    }
  }

  // start
  resetGame();
  loop();
})();