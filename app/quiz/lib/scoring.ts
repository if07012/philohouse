import type {
  AnswerRow,
  QuestionRow,
  ScoredAnswer,
  SubmitAnswerPayload,
  SubmitResult,
  AttemptStatus,
} from "./types";
import { getPointsPerCorrect } from "./env";

function resolveSelectedAnswer(
  qAnswers: AnswerRow[],
  userValue: string
): AnswerRow | undefined {
  const value = userValue.trim();
  if (!value) return undefined;

  const byId = qAnswers.find((a) => a.id === value);
  if (byId) return byId;

  return qAnswers.find((a) => a.letter.toUpperCase() === value.toUpperCase());
}

export function scoreQuizAttempt(params: {
  questions: QuestionRow[];
  answers: AnswerRow[];
  userAnswers: SubmitAnswerPayload;
  passingScore: number;
  status: AttemptStatus;
  attemptId: string;
  durationSec: number;
}): SubmitResult {
  const defaultPoints = getPointsPerCorrect();
  const answersByQuestion = new Map<string, AnswerRow[]>();
  for (const a of params.answers) {
    const list = answersByQuestion.get(a.questionId) ?? [];
    list.push(a);
    answersByQuestion.set(a.questionId, list);
  }

  const scored: ScoredAnswer[] = [];
  let correct = 0;
  let wrong = 0;
  let skipped = 0;
  let totalScore = 0;

  for (const q of params.questions) {
    const qAnswers = answersByQuestion.get(q.id) ?? [];
    const correctAnswer = qAnswers.find((a) => a.isCorrect);
    const userValue = (params.userAnswers[q.id] ?? "").trim();
    const selectedAnswer = resolveSelectedAnswer(qAnswers, userValue);
    const selectedLetter = selectedAnswer?.letter.toUpperCase() ?? "";
    const points = q.score > 0 ? q.score : defaultPoints;
    const isCorrect = Boolean(selectedAnswer?.isCorrect);

    if (!userValue) {
      skipped += 1;
    } else if (isCorrect) {
      correct += 1;
      totalScore += points;
    } else {
      wrong += 1;
    }

    scored.push({
      questionId: q.id,
      selectedLetter,
      selectedAnswerId: selectedAnswer?.id ?? "",
      correctAnswerId: correctAnswer?.id ?? "",
      correctLetter: correctAnswer?.letter ?? "",
      correct: isCorrect,
      points: isCorrect ? points : 0,
    });
  }

  return {
    attemptId: params.attemptId,
    score: totalScore,
    correct,
    wrong,
    skipped,
    passed: totalScore >= params.passingScore,
    passingScore: params.passingScore,
    status: params.status,
    durationSec: params.durationSec,
    answers: scored,
  };
}
