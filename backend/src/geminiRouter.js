import { Router } from "express";
import {
  assertGeminiKey,
  clampText,
  generateGeminiJson,
  generateGeminiText
} from "./geminiClient.js";

const router = Router();

const paperPrismSchema = {
  type: "object",
  properties: {
    elevatorPitch: { type: "string", description: "One tight paragraph for a curious non-expert." },
    methodologyInFiveBullets: {
      type: "array",
      items: { type: "string" },
      description: "Exactly five bullets: what they did, with nouns preserved from the paper."
    },
    crossDomainBridge: {
      type: "string",
      description:
        "Explain the core idea via an analogy from a distant domain (e.g. jazz, urban planning, fermentation)."
    },
    skepticLens: {
      type: "string",
      description: "Most convincing weakness: missing control, confound, or scope limit."
    },
    methodAsPseudocode: {
      type: "string",
      description: "≤18 lines of pseudocode or numbered steps mirroring the method structure."
    },
    listeningScore: {
      type: "string",
      description:
        "One paragraph: imaginary soundtrack brief + tempo + two instruments that capture the paper's mood."
    }
  },
  required: [
    "elevatorPitch",
    "methodologyInFiveBullets",
    "crossDomainBridge",
    "skepticLens",
    "methodAsPseudocode",
    "listeningScore"
  ]
};

const forgeSchema = {
  type: "object",
  properties: {
    motif: {
      type: "string",
      description: "One-line recurring metaphor tying all creative outputs together."
    },
    pythonUtility: {
      type: "string",
      description: "Small Python snippet if requested; else empty string."
    },
    dialogueBeat: {
      type: "string",
      description: "4–8 lines of dialogue if requested; else empty string."
    },
    chordRoadmap: {
      type: "string",
      description: "Chord progression as text (Roman numerals + brief mood note) if requested; else empty."
    },
    asciiArtifact: {
      type: "string",
      description: "Small ASCII illustration if requested; else empty."
    },
    shellMicroscript: {
      type: "string",
      description: "Tiny POSIX shell snippet automating a metaphorical 'ritual' from the brief; else empty."
    }
  },
  required: ["motif", "pythonUtility", "dialogueBeat", "chordRoadmap", "asciiArtifact", "shellMicroscript"]
};

router.post("/atlas", async (req, res, next) => {
  try {
    if (!assertGeminiKey(res)) return;

    const displayName = String(req.body.displayName || "friend").trim() || "friend";
    const coreSignal = clampText("coreSignal", req.body.coreSignal, 4000);
    const message = clampText("message", req.body.message, 8000);
    const history = Array.isArray(req.body.history) ? req.body.history : [];

    if (!message.trim()) {
      return res.status(400).json({ error: "message is required." });
    }

    const systemInstruction = `You are Atlas Mentor — not a generic chatbot. You reason about subtext, stakes, and tone like a skilled human coach.
Rules:
- Address ${displayName} naturally; never output JSON.
- The user may share a short "signal" about values, constraints, or goals — weigh it heavily.
- Creative requirement: open with a **Semantic Weather** line (one sentence: forecast their situation as weather + terrain; be specific, never cliché).
- Then **Echo**: mirror their concern in ONE sentence using vocabulary overlap from their message (proves you listened).
- Then **Guidance**: 2 short paragraphs of personalized advice (no bullet points here).
- Then **Today**: one concrete micro-action (≤18 words) they can do before midnight.
- Stay warm, never clinical; avoid mentioning AI or policies.`;

    const contents = [];

    if (coreSignal.trim()) {
      contents.push({
        role: "user",
        parts: [
          {
            text: `[Signal about ${displayName} — values, constraints, goals]\n${coreSignal}`
          }
        ]
      });
      contents.push({
        role: "model",
        parts: [{ text: "Understood. I'll factor that into every reply." }]
      });
    }

    for (const turn of history.slice(-12)) {
      const role = turn.role === "model" ? "model" : "user";
      const text = String(turn.text || "").slice(0, 12000);
      if (!text.trim()) continue;
      contents.push({ role, parts: [{ text }] });
    }

    contents.push({
      role: "user",
      parts: [{ text: message }]
    });

    const answer = await generateGeminiText({
      systemInstruction,
      contents,
      temperature: 0.85
    });

    res.json({ answer: answer || "Atlas had nothing to add — try rephrasing." });
  } catch (error) {
    next(error);
  }
});

router.post("/paper-prism", async (req, res, next) => {
  try {
    if (!assertGeminiKey(res)) return;

    const paperText = clampText("paperText", req.body.paperText);
    const focus = clampText("focus", req.body.focusArea || "", 2000);

    if (!paperText.trim()) {
      return res.status(400).json({ error: "paperText is required." });
    }

    const systemInstruction = `You are Paper Prism — a research analyst that behaves like a careful reader AND a creative synthesizer.
Extract faithful content from the pasted paper. If the paste is partial, say so inside elevatorPitch only.
The crossDomainBridge must not merely restate the abstract; pick a distant domain.
listeningScore is text-only (no audio): a composer brief that captures epistemic mood (tentative vs thundering).
Keep skepticLens charitable but sharp.`;

    const userPrompt =
      (focus.trim()
        ? `Optional reader focus (prioritize this lens): ${focus}\n\n---\n\n`
        : "") + paperText;

    const prism = await generateGeminiJson({
      systemInstruction,
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      temperature: 0.35,
      responseSchema: paperPrismSchema
    });

    res.json(prism);
  } catch (error) {
    next(error);
  }
});

router.post("/forge", async (req, res, next) => {
  try {
    if (!assertGeminiKey(res)) return;

    const brief = clampText("brief", req.body.brief, 6000);
    const modalities = Array.isArray(req.body.modalities) ? req.body.modalities : [];

    if (!brief.trim()) {
      return res.status(400).json({ error: "brief is required." });
    }

    const allowed = new Set(["python", "dialogue", "chords", "ascii", "shell"]);
    const chosen = [...new Set(modalities.filter((m) => allowed.has(String(m))))];

    const systemInstruction = `You are Genesis Forge: one creative director that emits MULTIPLE linked artifacts from ONE brief.
Rules:
- Every non-empty field must explicitly reuse imagery from motif.
- Leave a field as an empty string if that modality was not requested.
- Python: ≤40 lines, runnable vibe, playful comments tied to motif.
- Dialogue: characters unnamed or A/B, stage-play formatting.
- Chords: Roman numerals for key-agnostic thinking + one sentence on groove.
- ASCII: max width 38 chars per line, ≤10 lines.
- Shell: ≤12 lines, bash-compatible where possible; whimsical but safe (no destructive rm -rf /).`;

    const modalityLine =
      chosen.length === 0
        ? "Modalities: none specified — still fill motif and pick TWO surprises from python|dialogue|chords|ascii|shell that fit the brief."
        : `Modalities to fill (others must be empty string): ${chosen.join(", ")}`;

    const forge = await generateGeminiJson({
      systemInstruction,
      contents: [
        {
          role: "user",
          parts: [{ text: `${modalityLine}\n\nCreative brief:\n${brief}` }]
        }
      ],
      temperature: 0.9,
      responseSchema: forgeSchema
    });

    res.json(forge);
  } catch (error) {
    next(error);
  }
});

export default router;
