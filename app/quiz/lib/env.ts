export function getQuizSpreadsheetId(): string {
  const id =
    process.env.QUIZ_SPREADSHEET_ID?.trim() ||
    process.env.QUIZ_MANAGEMENT_SPREADSHEET_ID?.trim() ||
    "";
  if (!id) {
    throw new Error(
      "Missing QUIZ_SPREADSHEET_ID (or QUIZ_MANAGEMENT_SPREADSHEET_ID) environment variable"
    );
  }
  return id;
}

export function getQuizSessionSecret(): string {
  return (
    process.env.QUIZ_SESSION_SECRET?.trim() ||
    process.env.QUIZ_ADMIN_PASSWORD?.trim() ||
    "quiz-dev-secret-change-me"
  );
}

export function getQuizAdminUsername(): string {
  return process.env.QUIZ_ADMIN_USERNAME?.trim() || "admin";
}

export function getQuizAdminPassword(): string {
  return process.env.QUIZ_ADMIN_PASSWORD?.trim() || "pass@w0rd1";
}

export function getPointsPerCorrect(): number {
  const n = Number(process.env.QUIZ_POINTS_PER_CORRECT ?? "5");
  return Number.isFinite(n) && n > 0 ? n : 5;
}
