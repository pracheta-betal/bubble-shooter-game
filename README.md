# Bubble Shooter - Fullstack (Frontend + Backend)

This project is a simple Bubble Shooter game implemented with a vanilla JavaScript frontend (Canvas) and a small Node.js + Express backend that stores high scores in SQLite.

Features:
- Classic bubble shooter gameplay: aim, shoot, match 3+ to pop.
- Floating bubble detection (drops bubbles not connected to the top).
- Local score tracking and submission to a backend.
- REST API to fetch and submit high scores.

Getting started:
1. Install dependencies:
   npm install

2. Start the server:
   npm start
   or for development with auto-restart:
   npm run dev

3. Open your browser to:
   http://localhost:3000

APIs:
- GET /api/scores -> returns top scores (JSON)
- POST /api/scores -> submit a score: { name: string, score: number }

Project structure:
- server.js        -> Express server and API
- db.js            -> Simple SQLite wrapper
- scores.db        -> SQLite DB file (created automatically)
- public/          -> Frontend static files
  - index.html
  - style.css
  - game.js

You can modify colors, difficulty, or add authentication/more features as needed.