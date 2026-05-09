/**
 * Minimal Gemini REST client (generateContent). Keys stay server-side only.
 */

const DEFAULT_MODEL = "gemini-2.0-flash";
const MAX_INLINE_CHARS = 120_000;

function extractText(data) {
  const parts = data.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts.map((p) => p.text ?? "").join("");
}

function geminiErrorMessage(data, fallback) {
  const msg = data?.error?.message;
  if (typeof msg === "string" && msg.trim()) return msg.trim();
  return fallback;
}

export function getGeminiConfig() {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  return { apiKey, model };
}

export function assertGeminiKey(res) {
  const { apiKey } = getGeminiConfig();
  if (!apiKey) {
    res.status(500).json({
      error: "Missing GEMINI_API_KEY. Add your Gemini API key to backend/.env."
    });
    return false;
  }
  return true;
}

export function clampText(label, text, maxChars = MAX_INLINE_CHARS) {
  const s = String(text ?? "");
  if (s.length <= maxChars) return s;
  const err = new Error(`${label} is too long (max ${maxChars} characters).`);
  err.status = 400;
  throw err;
}

export async function generateGeminiText({
  systemInstruction,
  contents,
  temperature = 0.7,
  responseMimeType,
  responseSchema
}) {
  const { apiKey, model } = getGeminiConfig();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const generationConfig = {
    temperature,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192
  };

  if (responseMimeType) {
    generationConfig.responseMimeType = responseMimeType;
  }
  if (responseSchema) {
    generationConfig.responseSchema = responseSchema;
  }

  const body = {
    contents,
    generationConfig
  };

  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const data = await response.json();

  if (!response.ok) {
    const err = new Error(geminiErrorMessage(data, "Gemini request failed."));
    err.status = response.status;
    throw err;
  }

  if (!data.candidates?.length) {
    const err = new Error(
      geminiErrorMessage(data, "Gemini returned no candidates — try rephrasing or shortening input.")
    );
    err.status = 502;
    throw err;
  }

  const finish = data.candidates[0]?.finishReason;
  if (finish && finish !== "STOP") {
    const err = new Error(`Gemini finished with ${finish}. Try a shorter or clearer prompt.`);
    err.status = 400;
    throw err;
  }

  return extractText(data);
}

export async function generateGeminiJson({
  systemInstruction,
  contents,
  temperature = 0.4,
  responseSchema
}) {
  const text = await generateGeminiText({
    systemInstruction,
    contents,
    temperature,
    responseMimeType: "application/json",
    responseSchema
  });

  try {
    return JSON.parse(text);
  } catch {
    const err = new Error("Gemini returned invalid JSON. Retry with a smaller excerpt.");
    err.status = 502;
    throw err;
  }
}
