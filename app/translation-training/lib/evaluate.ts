import { groqChatJson } from "@/app/examination/lib/groq";
import { ollamaChatJson } from "@/app/examination/lib/ollama";
import { getTranslationLlmProvider } from "./env";
import type { TranslationEvaluation } from "./types";

type EvalJson = TranslationEvaluation;

const SYSTEM = `You are a strict but helpful Indonesian translation coach.

Task: Evaluate a student's Indonesian translation of an English sentence.
this is for student to learn english to indonesian translation.
and student is grade 4 student.

Scoring rules:
- Score 0–100 based on meaning preservation first, then natural Indonesian, grammar, and vocabulary choice.
- Minor stylistic differences are OK if meaning is preserved.
- Penalize missing meaning, wrong tense/aspect, wrong subject/object, negation errors, numbers, named entities, and key verbs.

You MUST return ONLY valid JSON with exactly this shape:
{
  "score_percent": number,
  "overall_feedback": string,
  "issues": [
    {
      "source_phrase": string,
      "student_phrase": string,
      "suggestion": string,
      "reason": string,
      "severity": 1|2|3
    }
  ],
  "drill": [
    { "phrase": string, "why": string }
  ]
}

Guidelines:
- we can skip if the student put wrong character like . , : ; etc for scoring
- we can skip camel case for scoring
-Verify the student’s translation against the source text for meaning accuracy, completeness, grammar, and natural wording.
-Accept minor wording differences if the meaning is preserved.
-overall_feedback in Bahasa Indonesia, short, clear, and actionable.
-issues should focus on incorrect words/phrases, missing meaning, added meaning, grammar mistakes, and unnatural translations.
-For each issue, show:
--source_phrase
--student_phrase
--suggestion make sure suggestion is same meaning between source_phrase and student_phrase
-drill: include up to 8 important words/phrases the student should practice repeating or rewriting; prioritize mistakes that change meaning.
-If the translation is fully correct, return an empty issues array and positive feedback.
-Keep all strings concise (no long essays).
`;

function clampScore(n: unknown): number {
  const x = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(100, Math.round(x)));
}

export async function evaluateTranslation(params: {
  english: string;
  referenceIndonesian?: string;
  studentIndonesian: string;
}): Promise<TranslationEvaluation> {
  const english = params.english.trim();
  const student = params.studentIndonesian.trim();
  const reference = (params.referenceIndonesian || "").trim();

  const user = `English source:
${english}

Reference Indonesian (may be empty or imperfect):
${reference || "(none)"}

Student Indonesian:
${student}

Evaluate the student's translation.`;

  const provider = getTranslationLlmProvider();
  const raw =
    provider === "ollama"
      ? await ollamaChatJson<EvalJson>({ system: SYSTEM, user, maxTokens: 2500, temperature: 0.2 })
      : await groqChatJson<EvalJson>({ system: SYSTEM, user, maxTokens: 2500, temperature: 0.2 });

  const issues = Array.isArray(raw.issues) ? raw.issues : [];
  const drill = Array.isArray(raw.drill) ? raw.drill : [];

  return {
    score_percent: clampScore(raw.score_percent),
    overall_feedback: String(raw.overall_feedback || "").slice(0, 1200),
    issues: issues
      .map((i) => ({
        source_phrase: String(i?.source_phrase || "").slice(0, 200),
        student_phrase: String(i?.student_phrase || "").slice(0, 200),
        suggestion: String(i?.suggestion || "").slice(0, 240),
        reason: String(i?.reason || "").slice(0, 240),
        severity: (Number(i?.severity) === 1 || Number(i?.severity) === 2 ? Number(i?.severity) : 3) as
          | 1
          | 2
          | 3,
      }))
      .filter((i) => i.suggestion || i.reason || i.source_phrase || i.student_phrase),
    drill: drill
      .map((d) => ({
        phrase: String(d?.phrase || "").slice(0, 120),
        why: String(d?.why || "").slice(0, 180),
      }))
      .filter((d) => d.phrase),
  };
}

