"use client";

import type { PublicExamQuestion } from "../lib/types";

const LETTERS = ["A", "B", "C", "D"] as const;

export function questionTypeLabel(t: PublicExamQuestion["type"]): string {
  switch (t) {
    case "mcq_single":
      return "Multiple choice — pick one";
    case "mcq_multi":
      return "Multiple choice — pick all that are correct";
    case "fill_blank":
      return "Fill in the blank";
    case "essay":
      return "Short essay";
    default:
      return t;
  }
}

type Props = {
  q: PublicExamQuestion;
  answers: Record<string, string>;
  multiSelections: Record<string, Set<string>>;
  onSingle: (letter: string) => void;
  onToggleMulti: (letter: string) => void;
  onText: (value: string) => void;
  disabled?: boolean;
};

export function QuestionBody({
  q,
  answers,
  multiSelections,
  onSingle,
  onToggleMulti,
  onText,
  disabled,
}: Props) {
  return (
    <>
      <p className="text-xs font-medium uppercase tracking-wide text-black/45">
        Question {q.order_index} · {questionTypeLabel(q.type)}
      </p>
      <p className="mt-3 text-lg font-medium leading-relaxed">{q.question_text}</p>

      {q.type === "mcq_single" &&
        q.options.map((opt, i) => {
          const letter = LETTERS[i] ?? String(i + 1);
          return (
            <label
              key={`${q.question_id}-${letter}`}
              className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-black/10 bg-white/90 px-4 py-3 text-base"
            >
              <input
                type="radio"
                className="mt-1.5 h-4 w-4"
                name={q.question_id}
                checked={answers[q.question_id] === letter}
                onChange={() => onSingle(letter)}
                disabled={disabled}
              />
              <span>
                <span className="font-bold text-[var(--color-accent)]">{letter}.</span>{" "}
                {opt}
              </span>
            </label>
          );
        })}

      {q.type === "mcq_multi" &&
        q.options.map((opt, i) => {
          const letter = LETTERS[i] ?? String(i + 1);
          const checked = multiSelections[q.question_id]?.has(letter) ?? false;
          return (
            <label
              key={`${q.question_id}-${letter}`}
              className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-black/10 bg-white/90 px-4 py-3 text-base"
            >
              <input
                type="checkbox"
                className="mt-1.5 h-4 w-4"
                checked={checked}
                onChange={() => onToggleMulti(letter)}
                disabled={disabled}
              />
              <span>
                <span className="font-bold text-[var(--color-accent)]">{letter}.</span>{" "}
                {opt}
              </span>
            </label>
          );
        })}

      {(q.type === "fill_blank" || q.type === "essay") && (
        <textarea
          className="mt-4 w-full rounded-xl border-2 border-black/15 bg-white px-4 py-3 text-base outline-none focus:border-[var(--color-accent)]"
          rows={q.type === "essay" ? 6 : 2}
          placeholder={
            q.type === "essay"
              ? "Write a few clear sentences."
              : "Type your answer"
          }
          value={answers[q.question_id] ?? ""}
          onChange={(e) => onText(e.target.value)}
          disabled={disabled}
        />
      )}
    </>
  );
}
