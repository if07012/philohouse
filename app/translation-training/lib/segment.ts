import { groqChatJson } from "@/app/examination/lib/groq";
import { ollamaChatJson } from "@/app/examination/lib/ollama";
import { getTranslationLlmProvider } from "./env";

type SegmentJson = {
  units: string[];
};

const SYSTEM = `You are an English-to-Indonesian translation tutor.
Segment the given English sentence into translation units by meaning (not by whitespace tokenization).

Rules:
- Return units that are easiest for learners to translate correctly.
- Keep idioms, phrasal verbs, fixed expressions, and collocations in one unit.
- Examples that should stay combined: "look after", "in front of", "as soon as", "a lot of", "take care of".
- Do not over-fragment.
- Preserve original word order.
- Max 18 units.

Return ONLY JSON:
{ "units": ["..."] }`;

export async function segmentEnglishUnitsWithAi(english: string): Promise<string[]> {
  const text = english.trim();
  if (!text) return [];
  const provider = getTranslationLlmProvider();
  const user = `English sentence:\n${text}\n\nReturn segmentation units JSON.`;
  const parsed =
    provider === "ollama"
      ? await ollamaChatJson<SegmentJson>({ system: SYSTEM, user, maxTokens: 1000, temperature: 0.1 })
      : await groqChatJson<SegmentJson>({ system: SYSTEM, user, maxTokens: 1000, temperature: 0.1 });

  const raw = Array.isArray(parsed.units) ? parsed.units : [];
  const units = raw.map((u) => String(u || "").trim()).filter(Boolean).slice(0, 18);
  return units.length > 0 ? units : [text];
}

