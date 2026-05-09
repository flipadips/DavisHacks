import React, { useEffect, useState } from "react";
import ApiHealthCard from "./ApiHealthCard.jsx";

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function App() {
  const [command, setCommand] = useState("");
  const [commands, setCommands] = useState([]);
  const [status, setStatus] = useState("Loading commands...");
  const [question, setQuestion] = useState("");
  const [claudeAnswer, setClaudeAnswer] = useState("");
  const [claudeStatus, setClaudeStatus] = useState("Ready");
  const [claudeModel, setClaudeModel] = useState("");

  async function loadCommands() {
    const response = await fetch(`${apiUrl}/api/commands`);
    const data = await response.json();
    setCommands(data);
    setStatus("Connected");
  }

  async function sendCommand(event) {
    event.preventDefault();

    const trimmedCommand = command.trim();
    if (!trimmedCommand) return;

    setStatus("Sending command...");

    const response = await fetch(`${apiUrl}/api/commands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command: trimmedCommand })
    });

    if (!response.ok) {
      setStatus("Command failed");
      return;
    }

    setCommand("");
    await loadCommands();
  }

  async function askClaude(event) {
    event.preventDefault();

    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) return;

    setClaudeStatus("Asking Claude...");
    setClaudeAnswer("");
    setClaudeModel("");

    const response = await fetch(`${apiUrl}/api/claude`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: trimmedQuestion })
    });

    const data = await response.json();

    if (!response.ok) {
      setClaudeStatus(data.error || "Claude request failed");
      setClaudeAnswer(data.error || "Claude request failed");
      setClaudeModel("");
      return;
    }

    setClaudeAnswer(data.answer || "Claude returned no text response.");
    setClaudeStatus("Answered");
    setClaudeModel(data.model || "");
  }

  useEffect(() => {
    loadCommands().catch(() => setStatus("API or database is not running"));
  }, []);

  return (
    <main className="app-shell">
      <section className="panel">
        <div>
          <p className="eyebrow">Node + Express + React + PostgreSQL</p>
          <h1>NERP Command Center</h1>
        </div>

        <form className="command-form" onSubmit={sendCommand}>
          <input
            value={command}
            onChange={(event) => setCommand(event.target.value)}
            placeholder="Send a command to the server"
            aria-label="Command"
          />
          <button type="submit">Send</button>
        </form>

        <div className="status-row">
          <span>Status</span>
          <strong>{status}</strong>
        </div>
      </section>

      <ApiHealthCard />

      <section className="panel claude-panel">
        <div>
          <p className="eyebrow">Claude AI</p>
          <h2>Ask Claude</h2>
        </div>

        <form className="claude-form" onSubmit={askClaude}>
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask Claude a question"
            aria-label="Question for Claude"
          />
          <button type="submit">Ask</button>
        </form>

        <div className="status-row">
          <span>Claude Status</span>
          <strong>{claudeStatus}</strong>
        </div>

        <section className="claude-response-box" aria-label="Claude response">
          <div className="claude-response-header">
            <span>Claude Response</span>
            {claudeModel && <small>Model: {claudeModel}</small>}
          </div>
          <div className="claude-answer">
            {claudeAnswer || "Claude's response will appear here after you ask a question."}
          </div>
        </section>
      </section>

      <section className="command-list" aria-label="Recent commands">
        <h2>Recent Commands</h2>
        {commands.length === 0 ? (
          <p className="empty-state">No commands yet.</p>
        ) : (
          <ul>
            {commands.map((item) => (
              <li key={item.id}>
                <span>{item.command}</span>
                <small>{item.status}</small>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
