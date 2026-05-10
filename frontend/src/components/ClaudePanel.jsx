import React from "react";

export default function ClaudePanel({
  question,
  answer,
  status,
  model,
  onQuestionChange,
  onSubmit
}) {
  return (
    <section className="panel claude-panel">
      <div>
        <p className="eyebrow">Claude AI</p>
        <h2>Ask Claude</h2>
      </div>

      <form className="claude-form" onSubmit={onSubmit}>
        <textarea
          value={question}
          onChange={(event) => onQuestionChange(event.target.value)}
          placeholder="Ask Claude a question"
          aria-label="Question for Claude"
        />
        <button type="submit">Ask</button>
      </form>

      <div className="status-row">
        <span>Claude Status</span>
        <strong>{status}</strong>
      </div>

      <section className="claude-response-box" aria-label="Claude response">
        <div className="claude-response-header">
          <span>Claude Response</span>
          {model && <small>Model: {model}</small>}
        </div>
        <div className="claude-answer">
          {answer || "Claude's response will appear here after you ask a question."}
        </div>
      </section>
    </section>
  );
}
