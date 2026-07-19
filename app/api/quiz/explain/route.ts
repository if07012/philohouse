import { NextResponse } from "next/server";
import { groqChatText } from "@/app/examination/lib/groq";

const SYSTEM = `Kamu adalah guru yang sabar dan ramah untuk murid Sekolah Dasar (SD) di Indonesia.
Tugasmu menjelaskan cara menyelesaikan soal dengan langkah-langkah yang mudah dipahami.

Aturan:
- Gunakan Bahasa Indonesia yang sederhana, hangat, dan mudah dimengerti anak SD (kelas 1–6).
- Jelaskan langkah demi langkah, beri nomor (1, 2, 3, …).
- Hindari istilah sulit; jika perlu, jelaskan artinya dengan kata sederhana.
- Tunjukkan mengapa jawaban yang benar benar, dan (jika ada) mengapa jawaban murid salah.
- Jangan mengejek atau membuat murid merasa malu.
- Jangan ulangi seluruh teks soal; fokus pada penjelasan.
- Panjang jawaban: cukup jelas, sekitar 4–8 langkah singkat.`;

type ExplainBody = {
  question?: string;
  imageUrl?: string;
  answers?: { letter: string; text: string }[];
  userAnswer?: string;
  correctAnswer?: string;
};

function formatOptions(answers: { letter: string; text: string }[]): string {
  return answers
    .map((a) => `${a.letter}. ${a.text || "(gambar/pilihan)"}`)
    .join("\n");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ExplainBody;
    const question = String(body?.question ?? "").trim();
    const userAnswer = String(body?.userAnswer ?? "").trim();
    const correctAnswer = String(body?.correctAnswer ?? "").trim();
    const answers = Array.isArray(body?.answers) ? body.answers : [];

    if (!question) {
      return NextResponse.json({ error: "question is required" }, { status: 400 });
    }
    if (!correctAnswer) {
      return NextResponse.json({ error: "correctAnswer is required" }, { status: 400 });
    }

    const imageNote = body?.imageUrl?.trim()
      ? "\n(Catatan: soal ini juga memiliki gambar, tapi kamu hanya menerima teks.)"
      : "";

    const user = [
      "Soal:",
      question + imageNote,
      "",
      "Pilihan jawaban:",
      answers.length > 0 ? formatOptions(answers) : "(tidak ada daftar pilihan)",
      "",
      `Jawaban murid: ${userAnswer || "tidak dijawab"}`,
      `Jawaban benar: ${correctAnswer}`,
      "",
      "Jelaskan langkah demi langkah cara menyelesaikan soal ini agar murid SD bisa mengerti.",
    ].join("\n");

    const explanation = await groqChatText({
      system: SYSTEM,
      user,
      maxTokens: 1500,
      temperature: 0.3,
    });

    return NextResponse.json({ explanation });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
