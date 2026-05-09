import React, { useEffect, useState } from "react";
import ApiHealthCard from "./ApiHealthCard.jsx";
import GlobeIntro from "./GlobeIntro.jsx";
import GeminiNexus from "./GeminiNexus.jsx";

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
const careTypes = [
  "Gender-affirming hormone therapy (HRT)",
  "Gender-affirming surgery referrals",
  "PrEP / HIV prevention & treatment",
  "STI screening & sexual health",
  "Mental health & counseling",
  "Family planning / fertility preservation",
  "Legal name & gender marker support",
  "Youth & adolescent care",
  "General primary care (LGBTQ+-affirming)"
];

function getSavedIntake() {
  try {
    return JSON.parse(localStorage.getItem("careIntake") || "null");
  } catch {
    return null;
  }
}

const savedIntake = getSavedIntake();

export default function App() {
  const [command, setCommand] = useState("");
  const [commands, setCommands] = useState([]);
  const [status, setStatus] = useState("Loading commands...");
  const [question, setQuestion] = useState("");
  const [claudeAnswer, setClaudeAnswer] = useState("");
  const [claudeStatus, setClaudeStatus] = useState("Ready");
  const [claudeModel, setClaudeModel] = useState("");
  const [zipCode, setZipCode] = useState(savedIntake?.zipCode || "");
  const [careType, setCareType] = useState(savedIntake?.careType || careTypes[0]);
  const [intakeInfo, setIntakeInfo] = useState(savedIntake);
  const [zipError, setZipError] = useState("");

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

    const questionWithContext = intakeInfo
      ? `User intake context:\nZIP code: ${intakeInfo.zipCode}\nCare type needed: ${intakeInfo.careType}\n\nUser question:\n${trimmedQuestion}`
      : trimmedQuestion;

    setClaudeStatus("Asking Claude...");
    setClaudeAnswer("");
    setClaudeModel("");

    const response = await fetch(`${apiUrl}/api/claude`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: questionWithContext })
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

  function saveIntake(event) {
    event.preventDefault();

    const normalizedZip = zipCode.trim();

    if (!/^\d{5}(-\d{4})?$/.test(normalizedZip)) {
      setZipError("Enter a valid 5-digit ZIP code, or ZIP+4.");
      setIntakeInfo(null);
      return;
    }

    const nextIntakeInfo = {
      zipCode: normalizedZip,
      careType
    };

    localStorage.setItem("careIntake", JSON.stringify(nextIntakeInfo));
    setIntakeInfo(nextIntakeInfo);
    setZipError("");
  }

  useEffect(() => {
    loadCommands().catch(() => setStatus("API or database is not running"));
  }, []);

  return (
    <main className="app-shell">
      <GlobeIntro />

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

      <section className="panel intake-panel">
        <div>
          <p className="eyebrow">Care Intake</p>
          <h2>Location and Care Type</h2>
        </div>

        <form className="intake-form" onSubmit={saveIntake}>
          <label>
            ZIP Code
            <input
              value={zipCode}
              onChange={(event) => setZipCode(event.target.value)}
              placeholder="95616"
              aria-describedby={zipError ? "zip-error" : undefined}
            />
          </label>

          <label>
            Care Type
            <select value={careType} onChange={(event) => setCareType(event.target.value)}>
              {careTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          {zipError && (
            <p className="form-error" id="zip-error">
              {zipError}
            </p>
          )}

          <button type="submit">Save Intake</button>
        </form>

        <div className="intake-summary">
          <span>Saved for Claude</span>
          {intakeInfo ? (
            <strong>
              ZIP {intakeInfo.zipCode} - {intakeInfo.careType}
            </strong>
          ) : (
            <strong>No intake saved yet</strong>
          )}
        </div>
      </section>

      <GeminiNexus />

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
