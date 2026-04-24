import crypto from "crypto";
import { getOpenAIModel } from "./mysteryEnv";
import type {
  CharacterBrief,
  MysteryQuizQuestion,
  QuizKind,
} from "./types";
import { ollamaChatJson } from "@/app/examination/lib/ollama";

const SYSTEM = `You are an expert Indonesian children's author and reading-comprehension designer.
Output ONLY valid JSON matching the user schema. No markdown, no code fences.
Rules:
- Audience: Indonesian children ages 10–12 (kelas 5–6). Warm, curious tone; short paragraphs.
- Language: Indonesian (Bahasa Indonesia) throughout.
- Genre: light mystery / puzzle story — no graphic violence, horror, or adult themes.
- Story must be solvable from the text; clues should be fair for the age group.
- Quiz questions MUST be answerable only from the story text (no outside knowledge).
- Multiple choice: exactly four options per question; exactly one correct answer (correct_index 0–3).
- Question kinds (exactly 2 each, 10 total): "fact", "inference", "logic", "sequence", "moral".`;

type RawCharacter = { name: string; role: string };
type RawQuestion = {
  kind: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
};

type GenerationResult = {
  title: string;
  summary: string;
  story_markdown: string;
  clues: string[];
  characters: RawCharacter[];
  image_prompt: string;
  questions: RawQuestion[];
};

const KINDS: QuizKind[] = [
  "fact",
  "inference",
  "logic",
  "sequence",
  "moral",
];

function buildUserPrompt(storyDate: string, difficultyBand: string): string {
  return `Buat paket cerita misteri harian + kuis untuk tanggal cerita: ${storyDate} (format YYYY-MM-DD).

Tingkat kesulitan banding: "${difficultyBand}" — sesuaikan panjang teks (perkiraan 450–900 kata untuk story_markdown) dan kedalaman inferensi; tetap ramah usia 10–12.

Return a JSON object with exactly these keys:
- "title": string (catchy Indonesian title)
- "summary": string (2–3 kalimat)
- "story_markdown": string (cerita lengkap; gunakan ## untuk subjudul bagian kecil bila perlu; **tebal** untuk penekanan jarang)
- "clues": string[] (4–6 petunjuk singkat yang memang muncul di cerita)
- "characters": array of { "name": string, "role": string } (3–6 tokoh)
- "image_prompt": string (English prompt for a wholesome children's book cover illustration, no text in image, describe scene only)
- "questions": array of length EXACTLY 10

Questions array MUST contain exactly two items for each kind in this list (order flexible):
["fact","inference","logic","sequence","moral"]

Each question object:
{ "kind": one of the five kinds, "question": string, "options": [string,string,string,string], "correct_index": 0|1|2|3, "explanation": string (Indonesian, 1–3 kalimat) }`;
}

function normalizeQuestions(raw: RawQuestion[]): MysteryQuizQuestion[] {
  if (!Array.isArray(raw) || raw.length !== 10) {
    throw new Error("Expected exactly 10 questions from model");
  }

  const kindCounts: Record<QuizKind, number> = {
    fact: 0,
    inference: 0,
    logic: 0,
    sequence: 0,
    moral: 0,
  };
  const out: MysteryQuizQuestion[] = [];
  for (let i = 0; i < raw.length; i++) {
    const q = raw[i];
    const kind = q.kind as QuizKind;
    if (!KINDS.includes(kind)) {
      throw new Error(`Invalid question kind: ${q.kind}`);
    }
    kindCounts[kind]++;

    if (!Array.isArray(q.options) || q.options.length !== 4) {
      throw new Error("Each question needs exactly 4 options");
    }

    const ci = Number(q.correct_index);
    if (!Number.isInteger(ci) || ci < 0 || ci > 3) {
      throw new Error("correct_index must be 0–3");
    }
    out.push({
      question_id: `q_${i + 1}_${crypto.randomBytes(4).toString("hex")}`,
      kind,
      question: String(q.question || "").trim(),
      options: q.options.map((o) => String(o || "").trim()) as [
        string,
        string,
        string,
        string,
      ],
      correct_index: ci as 0 | 1 | 2 | 3,
      explanation: String(q.explanation || "").trim(),
    });
  }
  for (const k of KINDS) {
    if (kindCounts[k] !== 2) {
      throw new Error(`Expected exactly 2 questions of kind "${k}", got ${kindCounts[k]}`);
    }
  }
  return out;
}

export type GeneratedDailyPackage = {
  title: string;
  summary: string;
  content_md: string;
  clues: string[];
  characters: CharacterBrief[];
  image_prompt: string;
  image_url: string;
  questions: MysteryQuizQuestion[];
  openai_model: string;
};

export async function generateDailyMysteryPackage(params: {
  storyDate: string;
  difficultyBand?: string;
}): Promise<GeneratedDailyPackage> {
  const difficultyBand = params.difficultyBand?.trim() || "menengah";
  const data = await ollamaChatJson<GenerationResult>({
    system: SYSTEM,
    user: buildUserPrompt(params.storyDate, difficultyBand),
    temperature: 0.75,
    maxTokens: 5000,
  });

  const title = String(data.title || "").trim();
  const summary = String(data.summary || "").trim();
  const content_md = String(data.story_markdown || "").trim();
  if (!title || !summary || !content_md) {
    throw new Error("Missing title, summary, or story_markdown from model");
  }
  const clues = Array.isArray(data.clues)
    ? data.clues.map((c) => String(c || "").trim()).filter(Boolean)
    : [];
  const characters = Array.isArray(data.characters)
    ? data.characters
        .map((c) => ({
          name: String(c?.name || "").trim(),
          role: String(c?.role || "").trim(),
        }))
        .filter((c) => c.name)
    : [];
  

  const questions = normalizeQuestions(data.questions || []);

  const image_url = `https://placehold.co/600x400/1e293b/94a3b8?text=${encodeURIComponent(title.slice(0, 40))}`;

  return {
    title,
    summary,
    content_md,
    clues,
    characters,
    image_prompt:"",
    image_url,
    questions,
    openai_model: getOpenAIModel(),
  };
}
