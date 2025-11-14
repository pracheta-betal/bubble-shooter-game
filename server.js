const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const cors = require("cors");
const db = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// API: submit score
app.post("/api/scores", async (req, res) => {
  try {
    const { name = "Anonymous", score = 0 } = req.body;
    const inserted = await db.addScore(name, score);
    res.json({ success: true, id: inserted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to save score" });
  }
});

// API: get top scores
app.get("/api/scores", async (req, res) => {
  try {
    const top = await db.getTopScores(20);
    res.json({ success: true, scores: top });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to fetch scores" });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening at http://localhost:${PORT}`);
});