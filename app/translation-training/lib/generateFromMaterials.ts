import { groqChatJson } from "@/app/examination/lib/groq";
import { ollamaChatJson } from "@/app/examination/lib/ollama";
import { getTranslationLlmProvider } from "./env";

type GenerateJson = {
  questions: string[];
  statements: string[];
};

const SYSTEM = `You create English practice lines for Indonesian learners translating English → Indonesian.

Critical distinction (must always hold):
- "questions" = interrogative sentences only: they ask for information, opinion, reason, or confirmation (use who/what/when/where/why/how/do/does/is/are/can/could/should/would, etc.). Every question must end with "?".
- "statements" = declarative or imperative informative sentences only: they state facts, describe situations, give explanations, or give instructions. They must NOT be questions. They must NOT end with "?".
- A statement must NOT be the declarative rewrite of any question you output (same main idea / same keywords in the same order). Questions and statements must use different angles, different subtopics, or different situations when possible.
- All 10 lines must be pairwise different: no duplicate strings, no same sentence with only punctuation or casing changed.

Other rules:
- Audience: grade 4 level wording, but still natural English.
- Tie everything to the material themes/snippets provided.
- Minimum ~20 words and maximum ~50 words per question.
- Minimum ~30 words and maximum ~60 words per statement.
- No numbering prefixes. No markdown. No extra keys.

Return ONLY JSON:
{ "questions": [string, string, string, string, string], "statements": [string, string, string, string, string] }`;

function normCell(v: unknown): string {
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

export function extractMaterialTexts(rows: Record<string, unknown>[]): string[] {
  const out: string[] = [];
  for (const r of rows) {
    const text =
      normCell(r.Material) ||
      normCell(r.material) ||
      normCell(r.MATERIAL) ||
      normCell(r.content) ||
      normCell(r.Content) ||
      normCell(r.text) ||
      normCell(r.body) ||
      "";
    if (text) out.push(text);
  }
  return out;
}

function buildThemesPayload(materials: string[], maxChars: number): string {
  let used = 0;
  const parts: string[] = [];
  for (let i = 0; i < materials.length; i++) {
    const chunk = materials[i].slice(0, 2000);
    if (used + chunk.length > maxChars) break;
    parts.push(`--- Material ${i + 1} ---\n${chunk}`);
    used += chunk.length + 30;
  }
  return parts.join("\n\n") || "(no material text)";
}

function normalizeFive(arr: unknown): string[] {
  if (!Array.isArray(arr)) return [];
  return arr.map((s) => String(s || "").trim()).filter(Boolean).slice(0, 5);
}

function normalizeForCompare(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Strip trailing punctuation and collapse space for overlap checks. */
function coreText(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[?.!,;:]+$/g, "")
    .replace(/^['"]+|['"]+$/g, "")
    .trim();
}

function assertDistinctQuestionsAndStatements(questions: string[], statements: string[]): void {
  const badStmt = statements.find((s) => s.trim().endsWith("?"));
  if (badStmt) {
    throw new Error("Pernyataan tidak boleh berbentuk pertanyaan (mengandung ? di akhir).");
  }

  const cores = [...questions, ...statements].map(coreText);
  const seen = new Set<string>();
  for (const c of cores) {
    if (!c) throw new Error("Baris kosong tidak diizinkan.");
    if (seen.has(c)) {
      throw new Error("Ada kalimat duplikat; pertanyaan dan pernyataan harus semua berbeda.");
    }
    seen.add(c);
  }

  for (const q of questions) {
    const cq = coreText(q);
    for (const st of statements) {
      const cs = coreText(st);
      if (cq === cs) {
        throw new Error("Pertanyaan dan pernyataan tidak boleh sama setelah dinormalisasi.");
      }
    }
  }
}

async function callGenerateModel(user: string): Promise<GenerateJson> {
  const provider = getTranslationLlmProvider();
  return provider === "ollama"
    ? ollamaChatJson<GenerateJson>({
        system: SYSTEM,
        user,
        maxTokens: 2200,
        temperature: 0.72,
      })
    : groqChatJson<GenerateJson>({
        system: SYSTEM,
        user,
        maxTokens: 2200,
        temperature: 0.72,
      });
}

export async function generateQuestionsAndStatementsFromMaterials(params: {
  materialTexts: string[];
  recentEnglishLines?: string[];
}): Promise<{ questions: string[]; statements: string[] }> {
  const materials = params.materialTexts.filter(Boolean);
  if (materials.length === 0) {
    throw new Error("Tidak ada teks di kolom Material pada sheet List Material.");
  }

  const batchId = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const themes = buildThemesPayload(materials, 14_000);
  const recent = (params.recentEnglishLines || [])
    .map((s) => String(s || "").trim())
    .filter(Boolean)
    .slice(0, 50);

  // Force structural variety each run.
  const questionStyles = [
    "at least one cause-effect question (why/because)",
    "at least one sequencing/time-order question",
    "at least one decision/opinion question (would/should)",
    "at least one comparison/contrast question",
    "at least one prediction/hypothesis question",
  ];
  const statementStyles = [
    "include one factual observation statement",
    "include one process/how-it-works statement",
    "include one recommendation/advice statement",
    "include one consequence/result statement",
    "include one reflective/summary statement",
  ];
  const chosenQuestionStyle = questionStyles[(batchId.length + batchId.charCodeAt(2)) % questionStyles.length];
  const chosenStatementStyle = statementStyles[(batchId.length + batchId.charCodeAt(4)) % statementStyles.length];

  const userBase = `Use these materials as theme context:\n\n${themes}

Generation batch id (vary your wording vs other batches): ${batchId}

Variation constraints for this batch:
- Questions: ${chosenQuestionStyle}
- Statements: ${chosenStatementStyle}
- Try to vary sentence openings and grammar patterns across the 10 lines.
- Avoid repeatedly starting with "What", "How", "Why", "There is/are", "People should" across many lines.

Recent lines to avoid (do NOT reuse same sentence pattern, key phrase skeleton, or near-paraphrase):
${recent.length ? recent.map((s, i) => `${i + 1}. ${s}`).join("\n") : "(none)"}

Generate the JSON.`;

  let lastErr: Error | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const user =
      attempt === 0
        ? userBase
        : `${userBase}\n\nIMPORTANT: Your previous output failed validation (duplicate or question/statement too similar). Regenerate ALL 10 lines from scratch with clearly different content and roles: questions only ask; statements only inform.`;

    const parsed = await callGenerateModel(user);

    let questions = normalizeFive(parsed.questions);
    const statements = normalizeFive(parsed.statements);

    if (questions.length !== 5 || statements.length !== 5) {
      lastErr = new Error(
        `AI harus mengembalikan tepat 5 questions dan 5 statements; dapat questions=${questions.length}, statements=${statements.length}`
      );
      continue;
    }

    questions = questions.map((q) => (q.endsWith("?") ? q : `${q}?`));

    try {
      assertDistinctQuestionsAndStatements(questions, statements);
      const generatedNorm = new Set(
        [...questions, ...statements].map(normalizeForCompare)
      );
      const reused = recent.some((line) => generatedNorm.has(normalizeForCompare(line)));
      if (reused) {
        throw new Error("Output masih terlalu mirip dengan hasil generate sebelumnya.");
      }
      return { questions, statements };
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
    }
  }

  throw lastErr || new Error("Gagal generate pertanyaan dan pernyataan yang berbeda.");
}
