import "dotenv/config";
import cors from "cors";
import express from "express";
import path from "path";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import { fileURLToPath } from "url";
import { initDb, pool } from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = process.env.PORT || 3000;
const openApiPath = path.join(__dirname, "..", "openapi.yaml");
const openApiDocument = YAML.load(openApiPath);

app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
app.use(express.json());
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));

app.get("/openapi.yaml", (_req, res) => {
  res.sendFile(openApiPath);
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "nerp-api" });
});

app.get("/api/commands", async (_req, res, next) => {
  try {
    const result = await pool.query(
      "SELECT id, command, status, created_at FROM commands ORDER BY created_at DESC LIMIT 25"
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

app.post("/api/claude", async (req, res, next) => {
  try {
    const question = String(req.body.question || "").trim();
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";

    if (!question) {
      return res.status(400).json({ error: "Question is required." });
    }

    if (!apiKey) {
      return res.status(500).json({
        error: "Missing ANTHROPIC_API_KEY. Add your Claude API key to backend/.env."
      });
    }

    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model,
        max_tokens: 512,
        system: "Answer the user's question directly in plain text. Do not include model metadata unless the user asks for it.",
        messages: [{ role: "user", content: question }]
      })
    });

    const data = await claudeResponse.json();

    if (!claudeResponse.ok) {
      return res.status(claudeResponse.status).json({
        error: data.error?.message || "Claude request failed."
      });
    }

    const answer = (data.content || [])
      .filter((item) => item.type === "text")
      .map((item) => item.text)
      .join("\n");

    res.json({
      answer: answer || "Claude returned no text response.",
      model: data.model
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/commands", async (req, res, next) => {
  try {
    const command = String(req.body.command || "").trim();

    if (!command) {
      return res.status(400).json({ error: "Command is required." });
    }

    const result = await pool.query(
      "INSERT INTO commands (command, status) VALUES ($1, $2) RETURNING id, command, status, created_at",
      [command, "sent"]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: "Something went wrong on the server." });
});

initDb()
  .then(() => {
    app.listen(port, () => {
      console.log(`NERP API running at http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize database", error);
    process.exit(1);
  });
