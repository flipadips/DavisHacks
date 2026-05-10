import { Router } from "express";
import {
  assertGeminiKey,
  clampText,
  generateGeminiJson,
  generateGeminiText
} from "./geminiClient.js";

const router = Router();

const readingHelperSchema = {
  type: "object",
  properties: {
    plainSummary: {
      type: "string",
      description: "3–6 short sentences in plain language. No jargon unless explained."
    },
    keyTerms: {
      type: "array",
      description: "Up to 6 confusing words/phrases from the text with simple explanations.",
      items: {
        type: "object",
        properties: {
          term: { type: "string" },
          plainEnglish: { type: "string" }
        },
        required: ["term", "plainEnglish"]
      }
    },
    questionsForYourProvider: {
      type: "array",
      description: "Exactly 3 questions the patient can ask their clinic.",
      items: { type: "string" }
    }
  },
  required: ["plainSummary", "keyTerms", "questionsForYourProvider"]
};

const visitKitSchema = {
  type: "object",
  properties: {
    howToStartTheConversation: {
      type: "string",
      description: "One short paragraph: natural way to open the topic with a provider."
    },
    phrasesYouCanUse: {
      type: "array",
      description: "4–6 short lines the user can say verbatim or adapt.",
      items: { type: "string" }
    },
    prepChecklist: {
      type: "array",
      description: "4–7 practical items (IDs, meds list, notes, etc.).",
      items: { type: "string" }
    },
    reminder: {
      type: "string",
      description: "One grounding sentence before the visit (calm, non-judgmental)."
    }
  },
  required: ["howToStartTheConversation", "phrasesYouCanUse", "prepChecklist", "reminder"]
};

function intakeLines(intake) {
  if (!intake || typeof intake !== "object") return "";
  const zip = String(intake.zipCode || "").trim();
  const care = String(intake.careType || "").trim();
  if (!zip && !care) return "";
  const parts = [];
  if (zip) parts.push(`ZIP / area: ${zip}`);
  if (care) parts.push(`Care they are looking for: ${care}`);
  return parts.join("\n");
}

/** Supportive care navigation — not medical advice; warm and concrete. */
router.post("/care-chat", async (req, res, next) => {
  try {
    if (!assertGeminiKey(res)) return;

    const displayName = String(req.body.displayName || "").trim() || "there";
    const message = clampText("message", req.body.message, 8000);
    const history = Array.isArray(req.body.history) ? req.body.history : [];
    const intakeContext = intakeLines(req.body.intakeContext);

    if (!message.trim()) {
      return res.status(400).json({ error: "message is required." });
    }

    const systemInstruction = `You help people navigate LGBTQ+ affirming healthcare: finding care, preparing for visits, and understanding options.

You are NOT a doctor or therapist. Do not diagnose, prescribe, or give dosages. If someone reports danger or severe symptoms, tell them to contact emergency services or an urgent clinic.

Tone: respectful, plain language, short paragraphs. Address the user as "${displayName}" when natural.

When "About this person" context appears below, use it to tailor suggestions (local framing is approximate — never claim a facility exists without the user naming it).

Structure each reply:
1) **Listen-back** — one sentence showing you understood their concern.
2) **Ideas** — practical next steps (questions to ask, how to search, what to bring).
3) **One small step** — a single doable action today.

Never use corporate filler. Never mention being an AI unless asked.`;

    const contents = [];

    if (intakeContext) {
      contents.push({
        role: "user",
        parts: [{ text: `About this person (from their saved intake in the app):\n${intakeContext}` }]
      });
      contents.push({
        role: "model",
        parts: [{ text: "Thanks — I'll keep that context in mind for this conversation." }]
      });
    }

    for (const turn of history.slice(-10)) {
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
      temperature: 0.75
    });

    res.json({ answer: answer || "No response text returned — try again." });
  } catch (error) {
    next(error);
  }
});

/** Turn dense text (letters, abstracts, consent blurbs) into plain language + questions for the clinic. */
router.post("/reading-helper", async (req, res, next) => {
  try {
    if (!assertGeminiKey(res)) return;

    const pastedText = clampText("pastedText", req.body.pastedText);
    const worry = clampText("worry", req.body.worryNote || "", 1500);
    const intakeContext = intakeLines(req.body.intakeContext);

    if (!pastedText.trim()) {
      return res.status(400).json({ error: "pastedText is required." });
    }

    const systemInstruction = `You translate confusing healthcare and benefits language into everyday English for LGBTQ+ patients and allies.

Rules:
- Stay faithful to the pasted text; if something is unclear because text is cut off, say so in plainSummary only.
- keyTerms: only terms that actually appear or are clearly implied; max 6 entries.
- questionsForYourProvider: exactly 3 questions, specific and respectful.
- No diagnostic claims.`;

    let userBlock = "";
    if (intakeContext) {
      userBlock += `Reader context:\n${intakeContext}\n\n`;
    }
    if (worry.trim()) {
      userBlock += `What worries them most (prioritize this):\n${worry}\n\n`;
    }
    userBlock += `Text to simplify:\n${pastedText}`;

    const result = await generateGeminiJson({
      systemInstruction,
      contents: [{ role: "user", parts: [{ text: userBlock }] }],
      temperature: 0.35,
      responseSchema: readingHelperSchema
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/** Practical phrases + checklist for an upcoming appointment or call. */
router.post("/visit-kit", async (req, res, next) => {
  try {
    if (!assertGeminiKey(res)) return;

    const situation = clampText("situation", req.body.situation, 6000);
    const intakeContext = intakeLines(req.body.intakeContext);

    if (!situation.trim()) {
      return res.status(400).json({ error: "situation is required." });
    }

    const systemInstruction = `You help someone prepare for an affirming healthcare visit or phone call.

Output must be practical and kind. No clinical prescriptions. No diagnosing.

phrasesYouCanUse: short, sayable lines (not paragraphs). prepChecklist: concrete items only.`;

    let userBlock = "";
    if (intakeContext) {
      userBlock += `Context from their saved intake:\n${intakeContext}\n\n`;
    }
    userBlock += `Describe the visit or call they are preparing for:\n${situation}`;

    const kit = await generateGeminiJson({
      systemInstruction,
      contents: [{ role: "user", parts: [{ text: userBlock }] }],
      temperature: 0.65,
      responseSchema: visitKitSchema
    });

    res.json(kit);
  } catch (error) {
    next(error);
  }
});

export default router;
