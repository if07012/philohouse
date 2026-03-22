export function getGrade4ExamSpreadsheetId(): string {
  const id =
    process.env.GRADE4_EXAM_SPREADSHEET_ID ||
    process.env.EXAM_SPREADSHEET_ID ||
    "";
  if (!id) {
    throw new Error(
      "Missing GRADE4_EXAM_SPREADSHEET_ID (or EXAM_SPREADSHEET_ID) environment variable"
    );
  }
  return id;
}

export function getGroqApiKey(): string {
  const key = process.env.GROQ_API_KEY || "";
  if (!key) {
    throw new Error("Missing GROQ_API_KEY environment variable");
  }
  return key;
}

export function getGroqModel(): string {
  return process.env.GROQ_MODEL || "openai/gpt-oss-120b";
}
