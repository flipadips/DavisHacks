import React, { useState } from "react";

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";

const FORGE_OPTS = [
  { id: "python", label: "Python utility" },
  { id: "dialogue", label: "Micro-script / dialogue" },
  { id: "chords", label: "Chord roadmap (text)" },
  { id: "ascii", label: "ASCII artifact" },
  { id: "shell", label: "Shell micro-script" }
];

export default function GeminiNexus() {
  const [tab, setTab] = useState("atlas");

  const [displayName, setDisplayName] = useState("");
  const [coreSignal, setCoreSignal] = useState("");
  const [atlasMessage, setAtlasMessage] = useState("");
  const [atlasHistory, setAtlasHistory] = useState([]);
  const [atlasStatus, setAtlasStatus] = useState("Ready");

  const [paperText, setPaperText] = useState("");
  const [paperFocus, setPaperFocus] = useState("");
  const [prism, setPrism] = useState(null);
  const [paperStatus, setPaperStatus] = useState("Ready");

  const [forgeBrief, setForgeBrief] = useState("");
  const [forgeMods, setForgeMods] = useState(() => new Set(["python", "dialogue", "chords"]));
  const [forge, setForge] = useState(null);
  const [forgeStatus, setForgeStatus] = useState("Ready");

  function toggleForge(id) {
    setForgeMods((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submitAtlas(event) {
    event.preventDefault();
    const msg = atlasMessage.trim();
    if (!msg) return;

    setAtlasStatus("Atlas is thinking...");
    const payload = {
      displayName: displayName.trim() || "friend",
      coreSignal: coreSignal.trim(),
      message: msg,
      history: atlasHistory
    };

    const response = await fetch(`${apiUrl}/api/gemini/atlas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      setAtlasStatus(data.error || "Atlas request failed");
      return;
    }

    setAtlasHistory((h) => [
      ...h,
      { role: "user", text: msg },
      { role: "model", text: data.answer || "" }
    ]);
    setAtlasMessage("");
    setAtlasStatus("Ready");
  }

  async function submitPaper(event) {
    event.preventDefault();
    const text = paperText.trim();
    if (!text) return;

    setPaperStatus("Prism is refracting...");
    setPrism(null);

    const response = await fetch(`${apiUrl}/api/gemini/paper-prism`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paperText: text,
        focusArea: paperFocus.trim()
      })
    });

    const data = await response.json();

    if (!response.ok) {
      setPaperStatus(data.error || "Paper Prism failed");
      return;
    }

    setPrism(data);
    setPaperStatus("Ready");
  }

  async function submitForge(event) {
    event.preventDefault();
    const brief = forgeBrief.trim();
    if (!brief) return;

    setForgeStatus("Forge is casting...");
    setForge(null);

    const modalities = Array.from(forgeMods);

    const response = await fetch(`${apiUrl}/api/gemini/forge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        brief,
        modalities
      })
    });

    const data = await response.json();

    if (!response.ok) {
      setForgeStatus(data.error || "Forge failed");
      return;
    }

    setForge(data);
    setForgeStatus("Ready");
  }

  return (
    <section className="gemini-shell panel">
      <div>
        <p className="eyebrow gemini-eyebrow">Google Gemini · Nexus Lab</p>
        <h2>Gemini Nexus</h2>
        <p className="gemini-lede">
          Three uncommon flows: a mentor that speaks in <strong>semantic weather</strong>, a prism that
          splits papers into soundtrack briefs and distant-field analogies, and a forge that chains{" "}
          <strong>code + stage + chords</strong> from one motif.
        </p>
      </div>

      <div className="gemini-tabs" role="tablist" aria-label="Gemini modes">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "atlas"}
          className={tab === "atlas" ? "gemini-tab gemini-tab--active" : "gemini-tab"}
          onClick={() => setTab("atlas")}
        >
          Atlas Mentor
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "paper"}
          className={tab === "paper" ? "gemini-tab gemini-tab--active" : "gemini-tab"}
          onClick={() => setTab("paper")}
        >
          Paper Prism
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "forge"}
          className={tab === "forge" ? "gemini-tab gemini-tab--active" : "gemini-tab"}
          onClick={() => setTab("forge")}
        >
          Genesis Forge
        </button>
      </div>

      {tab === "atlas" && (
        <div className="gemini-panel" role="tabpanel">
          <form className="gemini-form" onSubmit={submitAtlas}>
            <label className="gemini-label">
              Name or nickname
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="How Atlas should address you"
              />
            </label>
            <label className="gemini-label">
              Core signal (values, constraints, goals)
              <textarea
                value={coreSignal}
                onChange={(e) => setCoreSignal(e.target.value)}
                placeholder="e.g. First-gen grad student, balancing caregiving, optimizing for sleep > hustle culture."
                rows={3}
              />
            </label>
            <label className="gemini-label">
              Message
              <textarea
                value={atlasMessage}
                onChange={(e) => setAtlasMessage(e.target.value)}
                placeholder="What's alive for you right now?"
                rows={4}
              />
            </label>
            <div className="gemini-actions">
              <button type="submit">Ask Atlas</button>
              <span className="gemini-status">{atlasStatus}</span>
            </div>
          </form>

          <div className="gemini-transcript" aria-label="Atlas transcript">
            {atlasHistory.length === 0 ? (
              <p className="empty-state">Your conversation with Atlas will collect here.</p>
            ) : (
              <ul>
                {atlasHistory.map((turn, idx) => (
                  <li key={`${idx}-${turn.role}`} className={`gemini-turn gemini-turn--${turn.role}`}>
                    <span className="gemini-turn__role">{turn.role === "user" ? "You" : "Atlas"}</span>
                    <div className="gemini-turn__text">{turn.text}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {tab === "paper" && (
        <div className="gemini-panel" role="tabpanel">
          <form className="gemini-form" onSubmit={submitPaper}>
            <label className="gemini-label">
              Paste paper (abstract + key sections work)
              <textarea
                value={paperText}
                onChange={(e) => setPaperText(e.target.value)}
                placeholder="Paste PDF text or the portions you care about — Prism keeps nouns faithful."
                rows={12}
              />
            </label>
            <label className="gemini-label">
              Optional focus lens
              <input
                value={paperFocus}
                onChange={(e) => setPaperFocus(e.target.value)}
                placeholder="e.g. Limitations of the dataset; ethics of the benchmark"
              />
            </label>
            <div className="gemini-actions">
              <button type="submit">Run Paper Prism</button>
              <span className="gemini-status">{paperStatus}</span>
            </div>
          </form>

          {prism && (
            <div className="prism-grid">
              <article className="prism-card prism-card--wide">
                <h3>Elevator pitch</h3>
                <p>{prism.elevatorPitch}</p>
              </article>
              <article className="prism-card">
                <h3>Methodology (×5)</h3>
                <ol>
                  {(prism.methodologyInFiveBullets || []).map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ol>
              </article>
              <article className="prism-card">
                <h3>Cross-domain bridge</h3>
                <p>{prism.crossDomainBridge}</p>
              </article>
              <article className="prism-card">
                <h3>Skeptic lens</h3>
                <p>{prism.skepticLens}</p>
              </article>
              <article className="prism-card prism-card--code">
                <h3>Method as pseudocode</h3>
                <pre>{prism.methodAsPseudocode}</pre>
              </article>
              <article className="prism-card prism-card--wide">
                <h3>Listening score (composer brief)</h3>
                <p>{prism.listeningScore}</p>
              </article>
            </div>
          )}
        </div>
      )}

      {tab === "forge" && (
        <div className="gemini-panel" role="tabpanel">
          <form className="gemini-form" onSubmit={submitForge}>
            <label className="gemini-label">
              Unified creative brief
              <textarea
                value={forgeBrief}
                onChange={(e) => setForgeBrief(e.target.value)}
                placeholder="e.g. A lunar ferry pilot learns their logs are being rewritten by an empathy engine..."
                rows={6}
              />
            </label>
            <fieldset className="forge-fieldset">
              <legend>Modalities to link</legend>
              <div className="forge-chips">
                {FORGE_OPTS.map((opt) => (
                  <label key={opt.id} className="forge-chip">
                    <input
                      type="checkbox"
                      checked={forgeMods.has(opt.id)}
                      onChange={() => toggleForge(opt.id)}
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
              <p className="forge-hint">
                Leave combinations sparse for tighter motifs — or select none and let Forge choose two aligned surprises.
              </p>
            </fieldset>
            <div className="gemini-actions">
              <button type="submit">Cast Genesis Forge</button>
              <span className="gemini-status">{forgeStatus}</span>
            </div>
          </form>

          {forge && (
            <div className="forge-bundle">
              <p className="forge-motif">
                <span>Motif</span> {forge.motif}
              </p>
              <div className="forge-columns">
                <ForgeBlock title="Python utility" body={forge.pythonUtility} />
                <ForgeBlock title="Dialogue beat" body={forge.dialogueBeat} />
                <ForgeBlock title="Chord roadmap" body={forge.chordRoadmap} />
                <ForgeBlock title="ASCII artifact" body={forge.asciiArtifact} mono />
                <ForgeBlock title="Shell micro-script" body={forge.shellMicroscript} mono />
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function ForgeBlock({ title, body, mono }) {
  if (!body || !String(body).trim()) return null;
  return (
    <article className="forge-block">
      <h3>{title}</h3>
      {mono ? <pre>{body}</pre> : <p className="forge-prose">{body}</p>}
    </article>
  );
}
