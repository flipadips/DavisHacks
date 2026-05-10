import { useEffect, useState } from "react";

export function useCommands(apiUrl) {
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

  return {
    command,
    commands,
    status,
    setCommand,
    sendCommand
  };
}
