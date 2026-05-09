import { useEffect, useState } from "react";

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function App() {
  const [command, setCommand] = useState("");
  const [commands, setCommands] = useState([]);
  const [status, setStatus] = useState("Loading commands...");

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
