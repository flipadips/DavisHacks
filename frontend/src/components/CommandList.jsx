import React from "react";

export default function CommandList({ commands }) {
  return (
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
  );
}
