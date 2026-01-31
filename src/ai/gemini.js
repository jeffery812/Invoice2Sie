import { buildExtractionPrompt } from "./prompt.js";

function extractJsonBlock(text) {
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error("Model output did not contain JSON.");
  }
  const jsonText = text.slice(firstBrace, lastBrace + 1);
  return JSON.parse(jsonText);
}

export async function extractFields({ rawText, apiKey, model = "gemini-1.5-flash", signal }) {
  if (!apiKey) {
    throw new Error("Missing Gemini API key.");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const body = {
    contents: [
      {
        role: "user",
        parts: [{ text: buildExtractionPrompt(rawText) }]
      }
    ],
    generationConfig: {
      temperature: 0.1
    }
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body),
    signal
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return extractJsonBlock(text);
}
