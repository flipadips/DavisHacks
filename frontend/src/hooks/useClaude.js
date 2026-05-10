import { useState } from "react";

export function useClaude(apiUrl, intakeInfo) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState("Ready");
  const [model, setModel] = useState("");

  async function askClaude(event) {
    event.preventDefault();

    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) return;

    setStatus("Asking Claude...");
    setAnswer("");
    setModel("");

    const response = await fetch(`${apiUrl}/api/claude`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: buildClaudeQuestion(trimmedQuestion, intakeInfo) })
    });

    const data = await response.json();

    if (!response.ok) {
      setStatus(data.error || "Claude request failed");
      setAnswer(data.error || "Claude request failed");
      setModel("");
      return;
    }

    setAnswer(data.answer || "Claude returned no text response.");
    setStatus("Answered");
    setModel(data.model || "");
  }

  return {
    question,
    answer,
    status,
    model,
    setQuestion,
    askClaude
  };
}

function buildClaudeQuestion(question, intakeInfo) {
  if (!intakeInfo) return question;

  return `User intake context:\nZIP code: ${intakeInfo.zipCode}\nCare type needed: ${intakeInfo.careType}\n\nUser question:\n${question}`;
}
