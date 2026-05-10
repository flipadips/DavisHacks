import React, { useState } from "react";

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";

function intakePayload(intakeInfo) {
  if (!intakeInfo?.zipCode || !intakeInfo?.careType) return undefined;
  return {
    zipCode: intakeInfo.zipCode,
    careType: intakeInfo.careType
  };
}

export default function GeminiNexus({ intakeInfo }) {
  const [tab, setTab] = useState("chat");

  const [name, setName] = useState("");
  const [chatMessage, setChatMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [chatStatus, setChatStatus] = useState("Ready");

  const [paste, setPaste] = useState("");
  const [worryNote, setWorryNote] = useState("");
  const [reading, setReading] = useState(null);
  const [readingStatus, setReadingStatus] = useState("Ready");

  const [visitSituation, setVisitSituation] = useState("");
  const [visitKit, setVisitKit] = useState(null);
  const [visitStatus, setVisitStatus] = useState("Ready");

  const hasIntake = Boolean(intakeInfo?.zipCode && intakeInfo?.careType);

  async function submitChat(event) {
    event.preventDefault();
    const msg = chatMessage.trim();
    if (!msg) return;

    setChatStatus("Sending...");
    const response = await fetch(`${apiUrl}/api/gemini/care-chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: name.trim(),
        message: msg,
        history: chatHistory,
        intakeContext: intakePayload(intakeInfo)
      })
    });

    const data = await response.json();
    if (!response.ok) {
      setChatStatus(data.error || "Something went wrong");
      return;
    }

    setChatHistory((h) => [...h, { role: "user", text: msg }, { role: "model", text: data.answer || "" }]);
    setChatMessage("");
    setChatStatus("Ready");
  }

  async function submitReading(event) {
    event.preventDefault();
    const text = paste.trim();
    if (!text) return;

    setReadingStatus("Working...");
    setReading(null);

    const response = await fetch(`${apiUrl}/api/gemini/reading-helper`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pastedText: text,
        worryNote: worryNote.trim(),
        intakeContext: intakePayload(intakeInfo)
      })
    });

    const data = await response.json();
    if (!response.ok) {
      setReadingStatus(data.error || "Something went wrong");
      return;
    }

    setReading(data);
    setReadingStatus("Ready");
  }

  async function submitVisit(event) {
    event.preventDefault();
    const situation = visitSituation.trim();
    if (!situation) return;

    setVisitStatus("Working...");
    setVisitKit(null);

    const response = await fetch(`${apiUrl}/api/gemini/visit-kit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        situation,
        intakeContext: intakePayload(intakeInfo)
      })
    });

    const data = await response.json();
    if (!response.ok) {
      setVisitStatus(data.error || "Something went wrong");
      return;
    }

    setVisitKit(data);
    setVisitStatus("Ready");
  }

  return (
    <section className="gemini-shell panel">
      <div>
        <p className="eyebrow gemini-eyebrow">Gemini</p>
        <h2>Help with affirming care</h2>
        <p className="gemini-lede">
          Three tools: talk through questions about finding or navigating care, turn confusing letters or articles into plain language, and get simple phrases plus a checklist before an appointment.
          This is not medical advice — use it to prepare and advocate for yourself.
        </p>
        <p className={`gemini-intake-hint ${hasIntake ? "gemini-intake-hint--ok" : ""}`}>
          {hasIntake ? (
            <>
              Using your saved ZIP and care type from above so answers fit what you said you need.
            </>
          ) : (
            <>
              Save your ZIP and care type in <strong>Care Intake</strong> above to personalize Gemini replies the same way as Claude.
            </>
          )}
        </p>
      </div>

      <div className="gemini-tabs" role="tablist" aria-label="Gemini tools">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "chat"}
          className={tab === "chat" ? "gemini-tab gemini-tab--active" : "gemini-tab"}
          onClick={() => setTab("chat")}
        >
          Talk it through
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "reading"}
          className={tab === "reading" ? "gemini-tab gemini-tab--active" : "gemini-tab"}
          onClick={() => setTab("reading")}
        >
          Make text readable
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "visit"}
          className={tab === "visit" ? "gemini-tab gemini-tab--active" : "gemini-tab"}
          onClick={() => setTab("visit")}
        >
          Prep for a visit
        </button>
      </div>

      {tab === "chat" && (
        <div className="gemini-panel" role="tabpanel">
          <form className="gemini-form" onSubmit={submitChat}>
            <label className="gemini-label">
              What should we call you? (optional)
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name or nickname"
              />
            </label>
            <label className="gemini-label">
              What do you want to talk through?
              <textarea
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="Examples: how to find an affirming provider near me, what to ask at a first visit, how to explain my needs."
                rows={5}
              />
            </label>
            <div className="gemini-actions">
              <button type="submit">Send</button>
              <span className="gemini-status">{chatStatus}</span>
            </div>
          </form>

          <div className="gemini-transcript" aria-label="Conversation">
            {chatHistory.length === 0 ? (
              <p className="empty-state">Your conversation will show up here.</p>
            ) : (
              <ul>
                {chatHistory.map((turn, idx) => (
                  <li key={`${idx}-${turn.role}`} className={`gemini-turn gemini-turn--${turn.role}`}>
                    <span className="gemini-turn__role">{turn.role === "user" ? "You" : "Gemini"}</span>
                    <div className="gemini-turn__text">{turn.text}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {tab === "reading" && (
        <div className="gemini-panel" role="tabpanel">
          <form className="gemini-form" onSubmit={submitReading}>
            <label className="gemini-label">
              Paste confusing text
              <textarea
                value={paste}
                onChange={(e) => setPaste(e.target.value)}
                placeholder="Insurance letter, clinic FAQ, part of a research abstract, consent form language — paste anything wordy."
                rows={10}
              />
            </label>
            <label className="gemini-label">
              What worries you most? (optional)
              <input
                value={worryNote}
                onChange={(e) => setWorryNote(e.target.value)}
                placeholder="e.g. I'm scared this means I'm not covered"
              />
            </label>
            <div className="gemini-actions">
              <button type="submit">Simplify</button>
              <span className="gemini-status">{readingStatus}</span>
            </div>
          </form>

          {reading && (
            <div className="reading-results">
              <article className="prism-card prism-card--wide">
                <h3>In plain language</h3>
                <p>{reading.plainSummary}</p>
              </article>

              {(reading.keyTerms || []).length > 0 && (
                <article className="prism-card prism-card--wide">
                  <h3>Words explained</h3>
                  <dl className="term-list">
                    {reading.keyTerms.map((row, i) => (
                      <div key={i} className="term-row">
                        <dt>{row.term}</dt>
                        <dd>{row.plainEnglish}</dd>
                      </div>
                    ))}
                  </dl>
                </article>
              )}

              <article className="prism-card prism-card--wide">
                <h3>Questions you could ask your provider</h3>
                <ol className="numbered-questions">
                  {(reading.questionsForYourProvider || []).map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ol>
              </article>
            </div>
          )}
        </div>
      )}

      {tab === "visit" && (
        <div className="gemini-panel" role="tabpanel">
          <form className="gemini-form" onSubmit={submitVisit}>
            <label className="gemini-label">
              What are you preparing for?
              <textarea
                value={visitSituation}
                onChange={(e) => setVisitSituation(e.target.value)}
                placeholder="Examples: first appointment for HRT, follow-up after labs, calling a new clinic to ask if they take my insurance."
                rows={6}
              />
            </label>
            <div className="gemini-actions">
              <button type="submit">Build visit kit</button>
              <span className="gemini-status">{visitStatus}</span>
            </div>
          </form>

          {visitKit && (
            <div className="visit-results">
              <article className="prism-card prism-card--wide">
                <h3>How to start</h3>
                <p>{visitKit.howToStartTheConversation}</p>
              </article>

              <article className="prism-card prism-card--wide">
                <h3>Phrases you can use</h3>
                <ul className="phrase-list">
                  {(visitKit.phrasesYouCanUse || []).map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </article>

              <article className="prism-card prism-card--wide">
                <h3>Bring / prep checklist</h3>
                <ul className="checklist">
                  {(visitKit.prepChecklist || []).map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </article>

              <p className="visit-reminder">{visitKit.reminder}</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
