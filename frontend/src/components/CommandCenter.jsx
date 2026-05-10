import React from "react";

export default function CommandCenter({ command, status, onCommandChange, onSubmit }) {
  return (
    <section className="panel">
      <div>
        <p className="eyebrow">Node + Express + React + PostgreSQL</p>
        <h1>NERP Command Center</h1>
      </div>

      <form className="command-form" onSubmit={onSubmit}>
        <input
          value={command}
          onChange={(event) => onCommandChange(event.target.value)}
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
  );
}
