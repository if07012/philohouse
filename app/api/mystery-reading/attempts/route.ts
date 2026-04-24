import { NextResponse } from "next/server";
import crypto from "crypto";
import { getMysterySession } from "@/app/mystery-reading/lib/apiAuth";
import { getMysterySpreadsheetId } from "@/app/mystery-reading/lib/mysteryEnv";
import {
  computeQuizXp,
  levelFromTotalXp,
  mergeBadges,
  nextStreakState,
  skillBreakdownFromResults,
  vocabProxyPercent,
} from "@/app/mystery-reading/lib/rewards";
import {
  appendAttemptRow,
  ensureMysterySheets,
  findAttemptByChildAndDate,
  findChildById,
  getQuizByDate,
  listAttemptsByChild,
  updateChildByChildId,
} from "@/app/mystery-reading/lib/sheetHelpers";
import type {
  MysteryQuizQuestion,
  PerQuestionResult,
} from "@/app/mystery-reading/lib/types";

export async function GET(request: Request) {
  const session = await getMysterySession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const childId = String(url.searchParams.get("childId") || "").trim();
    const storyDate = String(url.searchParams.get("storyDate") || "").trim();
    const includeReview =
      String(url.searchParams.get("includeReview") || "").trim() === "1";
    if (!childId || !storyDate) {
      return NextResponse.json(
        { error: "childId dan storyDate wajib" },
        { status: 400 }
      );
    }

    const spreadsheetId = getMysterySpreadsheetId();
    await ensureMysterySheets(spreadsheetId);

    const child = await findChildById(spreadsheetId, childId);
    if (!child || String(child.family_id).trim() !== session.familyId) {
      return NextResponse.json({ error: "Anak tidak ditemukan" }, { status: 403 });
    }

    const attempt = await findAttemptByChildAndDate(
      spreadsheetId,
      childId,
      storyDate
    );
    if (!attempt) {
      return NextResponse.json({ submitted: false });
    }

    if (!includeReview) {
      return NextResponse.json({
        submitted: true,
        attemptId: String(attempt.attempt_id || "").trim(),
        completedAt: String(attempt.completed_at || "").trim(),
        scorePercent: Number(attempt.score_percent) || 0,
      });
    }

    const quizRow = await getQuizByDate(spreadsheetId, storyDate);
    if (!quizRow?.questions_json) {
      return NextResponse.json(
        { error: "Kuis tidak tersedia" },
        { status: 404 }
      );
    }

    let questions: MysteryQuizQuestion[] = [];
    try {
      questions = JSON.parse(quizRow.questions_json) as MysteryQuizQuestion[];
    } catch {
      return NextResponse.json({ error: "Data kuis rusak" }, { status: 500 });
    }
    if (!Array.isArray(questions) || questions.length !== 10) {
      return NextResponse.json({ error: "Jumlah soal tidak valid" }, { status: 500 });
    }

    let answers: unknown = [];
    try {
      answers = JSON.parse(String(attempt.answers_json || "[]"));
    } catch {
      answers = [];
    }
    if (!Array.isArray(answers) || answers.length !== 10) {
      return NextResponse.json({ error: "Data jawaban rusak" }, { status: 500 });
    }

    const results: PerQuestionResult[] = [];
    for (let i = 0; i < 10; i++) {
      const q = questions[i];
      const a = Number(answers[i]);
      const correct =
        Number.isInteger(a) && a >= 0 && a <= 3 && a === q.correct_index;
      results.push({
        question_id: q.question_id,
        kind: q.kind,
        correct,
      });
    }

    const breakdown = skillBreakdownFromResults(results);
    const review = questions.map((q, i) => ({
      question_id: q.question_id,
      kind: q.kind,
      question: q.question,
      options: q.options,
      chosen: Number(answers[i]),
      correct_index: q.correct_index,
      explanation: q.explanation,
      correct: results[i]?.correct ?? false,
    }));

    return NextResponse.json({
      submitted: true,
      attemptId: String(attempt.attempt_id || "").trim(),
      completedAt: String(attempt.completed_at || "").trim(),
      scorePercent: Number(attempt.score_percent) || 0,
      xpAwarded: Number(attempt.xp_awarded) || 0,
      child: {
        childId: String(child.child_id || "").trim(),
        nickname: String(child.nickname || "").trim(),
        xp: Number(child.xp) || 0,
        level: Number(child.level) || 0,
        currentStreak: Number(child.current_streak) || 0,
        longestStreak: Number(child.longest_streak) || 0,
        badges: (() => {
          try {
            const b = JSON.parse(String(child.badges_json || "[]"));
            return Array.isArray(b) ? (b as string[]) : [];
          } catch {
            return [];
          }
        })(),
      },
      vocabProxyPct: vocabProxyPercent(breakdown),
      review,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("mystery attempts GET:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getMysterySession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const childId = String(body?.childId || "").trim();
    const storyDate = String(body?.storyDate || "").trim();
    const answers = body?.answers as unknown;
    if (!childId || !storyDate || !Array.isArray(answers) || answers.length !== 10) {
      return NextResponse.json(
        { error: "childId, storyDate (YYYY-MM-DD), dan answers[10] wajib" },
        { status: 400 }
      );
    }

    const spreadsheetId = getMysterySpreadsheetId();
    await ensureMysterySheets(spreadsheetId);

    const child = await findChildById(spreadsheetId, childId);
    if (!child || String(child.family_id).trim() !== session.familyId) {
      return NextResponse.json({ error: "Anak tidak ditemukan" }, { status: 403 });
    }

    const dup = await findAttemptByChildAndDate(spreadsheetId, childId, storyDate);
    if (dup) {
      return NextResponse.json(
        { error: "Kuis untuk tanggal ini sudah diselesaikan." },
        { status: 409 }
      );
    }

    const quizRow = await getQuizByDate(spreadsheetId, storyDate);
    if (!quizRow?.questions_json) {
      return NextResponse.json({ error: "Kuis tidak tersedia" }, { status: 404 });
    }

    let questions: MysteryQuizQuestion[] = [];
    try {
      questions = JSON.parse(quizRow.questions_json) as MysteryQuizQuestion[];
    } catch {
      return NextResponse.json({ error: "Data kuis rusak" }, { status: 500 });
    }
    if (!Array.isArray(questions) || questions.length !== 10) {
      return NextResponse.json({ error: "Jumlah soal tidak valid" }, { status: 500 });
    }

    const results: PerQuestionResult[] = [];
    for (let i = 0; i < 10; i++) {
      const q = questions[i];
      const a = Number(answers[i]);
      const correct =
        Number.isInteger(a) && a >= 0 && a <= 3 && a === q.correct_index;
      results.push({
        question_id: q.question_id,
        kind: q.kind,
        correct,
      });
    }

    const correctCount = results.filter((r) => r.correct).length;
    const scorePercent = Math.round((correctCount / 10) * 1000) / 10;

    const priorAttempts = await listAttemptsByChild(spreadsheetId, childId);
    const isFirstEver = priorAttempts.length === 0;

    const streak = nextStreakState({
      lastCompletedDate: String(child.last_completed_date || ""),
      currentStreak: Number(child.current_streak) || 0,
      longestStreak: Number(child.longest_streak) || 0,
      storyDate,
    });

    const xpAwarded = computeQuizXp({
      scorePercent,
      currentStreak: streak.current_streak,
    });

    const prevXp = Number(child.xp) || 0;
    const newXp = prevXp + xpAwarded;
    const newLevel = levelFromTotalXp(newXp);

    const badges = mergeBadges(String(child.badges_json || "[]"), {
      scorePercent,
      streak: streak.current_streak,
      level: newLevel,
      isFirstAttempt: isFirstEver,
    });

    const allScores = [...priorAttempts.map((r) => Number(r.score_percent) || 0), scorePercent];
    const rollingAvg =
      allScores.reduce((s, v) => s + v, 0) / Math.max(1, allScores.length);
    const rollingRounded = Math.round(rollingAvg * 10) / 10;

    const attemptId = crypto.randomUUID();
    const completedAt = new Date().toISOString();

    await appendAttemptRow(spreadsheetId, {
      attempt_id: attemptId,
      child_id: childId,
      story_date: storyDate,
      answers_json: JSON.stringify(answers),
      per_question_results_json: JSON.stringify(results),
      score_percent: String(scorePercent),
      xp_awarded: String(xpAwarded),
      completed_at: completedAt,
    });

    await updateChildByChildId(spreadsheetId, childId, {
      xp: String(newXp),
      level: String(newLevel),
      current_streak: String(streak.current_streak),
      longest_streak: String(streak.longest_streak),
      last_completed_date: streak.last_completed_date,
      badges_json: badges,
      rolling_avg_score: String(rollingRounded),
    });

    const breakdown = skillBreakdownFromResults(results);
    const explanations = questions.map((q, i) => ({
      question_id: q.question_id,
      kind: q.kind,
      question: q.question,
      options: q.options,
      chosen: answers[i],
      correct_index: q.correct_index,
      explanation: q.explanation,
      correct: results[i]?.correct ?? false,
    }));

    return NextResponse.json({
      ok: true,
      attemptId,
      scorePercent,
      xpAwarded,
      newXp,
      newLevel,
      streak: streak.current_streak,
      badges: JSON.parse(badges) as string[],
      skillBreakdown: breakdown,
      vocabProxyPct: vocabProxyPercent(breakdown),
      review: explanations,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("mystery attempts:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
